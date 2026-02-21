import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { ID } from 'node-appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { getAppwriteTableIds } from '@/lib/envValidation';
import { logger } from '@/lib/logger';
import { shouldLog } from '@/lib/logSettings';
import { executeTransactionWithRetry, handleTransactionError, type TransactionOperation } from '@/lib/transactions';
import { isArrayField } from '@/lib/customFieldArrayOperators';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { tablesDB } = createSessionClient(req);

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid custom field ID' });
    }

    // Validate required environment variables using centralized utility
    let dbId: string;
    let customFieldsTableId: string;
    let logsTableId: string;

    try {
      const collectionIds = getAppwriteTableIds();
      dbId = collectionIds.dbId;
      customFieldsTableId = collectionIds.customFieldsTableId;
      logsTableId = collectionIds.logsTableId;
    } catch (envError: unknown) {
      const errorMessage = envError instanceof Error ? envError.message : 'Server configuration error';
      console.error('Environment validation failed:', errorMessage);
      return res.status(500).json({ error: 'Server configuration error' });
    }

    switch (req.method) {
      case 'GET':
        // Check permissions
        const readPermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasReadPermission =
          readPermissions?.all === true ||
          readPermissions?.customFields?.read === true;

        if (!hasReadPermission) {
          return res
            .status(403)
            .json({ error: 'Insufficient permissions to read custom fields' });
        }

        // Fetch custom field
        let customField;
        try {
          customField = await tablesDB.getRow({
            databaseId: dbId,
            tableId: customFieldsTableId,
            rowId: id
          });
        } catch (error) {
          return res.status(404).json({ error: 'Custom field not found' });
        }

        // Note: In Appwrite with denormalized custom field values, we don't have a separate
        // attendeeCustomFieldValues table. The values are stored in the attendee documents.
        // We'll return the custom field without the count for now.
        // If needed, we could query all attendees and count how many have this field.

        return res.status(200).json(customField);

      case 'PUT':
        /**
         * UPDATE CUSTOM FIELD ENDPOINT (TRANSACTION-BASED)
         * 
         * Updates an existing custom field with new values using atomic transactions.
         * The update and audit log are created in a single transaction to ensure
         * data consistency and complete audit trail.
         * 
         * Request Body:
         * - fieldName: string (required) - Display name of the field
         * - fieldType: string (required) - Type of field (text, number, select, etc.)
         * - fieldOptions: object (optional) - Configuration options for the field
         * - required: boolean (optional) - Whether the field is required
         * - order: number (optional) - Display order
         * - version: number (required) - Current version for optimistic locking
         * - showOnMainPage: boolean (optional) - Visibility on main page
         * 
         * Visibility Control:
         * - showOnMainPage can be toggled to show/hide field on main attendees page
         * - When changed from true to false, field is hidden from main table but remains in forms
         * - When changed from false to true, field becomes visible in main table
         * - Defaults to true if not specified (maintains backward compatibility)
         * 
         * Optimistic Locking:
         * - Version number must match current document version
         * - Prevents concurrent update conflicts
         * - Returns 409 Conflict if version mismatch detected
         * 
         * Transaction Behavior:
         * - Update and audit log are atomic (both succeed or both fail)
         * - Automatic retry on conflicts (up to 3 times with exponential backoff)
         * - Automatic rollback on any failure
         * - No orphaned audit logs or partial updates
         */
        // Check permissions
        const updatePermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasUpdatePermission = updatePermissions?.all === true || updatePermissions?.customFields?.update === true;

        if (!hasUpdatePermission) {
          return res.status(403).json({ error: 'Insufficient permissions to update custom fields' });
        }

        const { fieldName, fieldType, fieldOptions, required, order, version, showOnMainPage, printable } = req.body;

        if (!fieldName || !fieldType) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate version is provided for optimistic locking
        if (typeof version !== 'number') {
          return res.status(400).json({
            error: 'Version field is required for update operations',
            details: 'Include the current version number from the document you are updating'
          });
        }

        // Validate showOnMainPage is boolean if provided
        // This ensures data integrity and prevents type coercion issues
        if (showOnMainPage !== undefined && typeof showOnMainPage !== 'boolean') {
          return res.status(400).json({
            error: 'Invalid showOnMainPage value',
            details: 'showOnMainPage must be a boolean value'
          });
        }

        // Validate printable is boolean if provided
        // This ensures data integrity and prevents type coercion issues
        if (printable !== undefined && typeof printable !== 'boolean') {
          return res.status(400).json({
            error: 'Invalid printable value',
            details: 'printable must be a boolean value'
          });
        }

        // Fetch current document to check version and soft-delete status
        let currentField;
        try {
          currentField = await tablesDB.getRow({
            databaseId: dbId,
            tableId: customFieldsTableId,
            rowId: id
          });
        } catch (error) {
          return res.status(404).json({ error: 'Custom field not found' });
        }

        // Check if field is soft-deleted
        if (currentField.deletedAt) {
          return res.status(410).json({
            error: 'Cannot update deleted custom field',
            deletedAt: currentField.deletedAt
          });
        }

        // Check for version mismatch (optimistic locking)
        const currentVersion = currentField.version || 0;
        if (currentVersion !== version) {
          return res.status(409).json({
            error: 'Conflict: Document has been modified by another user',
            details: {
              message: 'The document version you are trying to update is outdated',
              currentVersion,
              providedVersion: version
            }
          });
        }

        // Serialize fieldOptions as JSON string if it's an object
        const fieldOptionsStr = fieldOptions ?
          (typeof fieldOptions === 'string' ? fieldOptions : JSON.stringify(fieldOptions)) :
          null;

        // Prepare update data
        const updateData = {
          fieldName,
          fieldType,
          fieldOptions: fieldOptionsStr,
          required: required || false,
          order: order || 1,
          showOnMainPage: showOnMainPage !== undefined ? showOnMainPage : true, // Default to visible
          printable: printable !== undefined ? printable : false, // Default to non-printable for backward compatibility
          version: currentVersion + 1 // Increment version for optimistic locking
        };

        // Check if logging is enabled
        const loggingEnabled = await shouldLog('customFieldUpdate');

        // Build transaction operations
        const operations: TransactionOperation[] = [
          {
            action: 'update',
            databaseId: dbId,
            tableId: customFieldsTableId,
            rowId: id,
            data: updateData
          }
        ];

        // Add audit log if logging is enabled
        if (loggingEnabled) {
          operations.push({
            action: 'create',
            databaseId: dbId,
            tableId: logsTableId,
            rowId: ID.unique(),
            data: {
              userId: user.$id,
              action: 'update',
              details: JSON.stringify({
                type: 'custom_field',
                fieldId: id,
                fieldName: fieldName,
                fieldType: fieldType,
                changes: {
                  fieldName: currentField.fieldName !== fieldName ? { from: currentField.fieldName, to: fieldName } : undefined,
                  fieldType: currentField.fieldType !== fieldType ? { from: currentField.fieldType, to: fieldType } : undefined,
                  showOnMainPage: currentField.showOnMainPage !== (showOnMainPage !== undefined ? showOnMainPage : true) ? 
                    { from: currentField.showOnMainPage, to: showOnMainPage !== undefined ? showOnMainPage : true } : undefined
                },
                timestamp: new Date().toISOString()
              })
            }
          });
        }

        // Execute transaction with automatic retry
        try {
          await executeTransactionWithRetry(tablesDB, operations, {
            maxRetries: 3,
            retryDelay: 100
          });

          logger.info('[CUSTOM_FIELD_UPDATE] Transaction completed successfully', {
            fieldId: id,
            fieldName: fieldName,
            userId: user.$id,
            loggingEnabled,
            operationCount: operations.length
          });

          // Return updated field data
          // Note: In a real transaction, we'd fetch the updated document
          // For now, we return the expected state
          return res.status(200).json({
            $id: id,
            ...updateData,
            $createdAt: currentField.$createdAt,
            $updatedAt: new Date().toISOString(),
            eventSettingsId: currentField.eventSettingsId,
            internalFieldName: currentField.internalFieldName
          });

        } catch (error: any) {
          logger.error('[CUSTOM_FIELD_UPDATE] Transaction failed', {
            fieldId: id,
            fieldName: fieldName,
            userId: user.$id,
            error: error.message,
            code: error.code
          });

          // Use centralized error handler
          return handleTransactionError(error, res);
        }

      case 'DELETE':
        /**
         * DELETE CUSTOM FIELD ENDPOINT (TRANSACTION-BASED)
         * 
         * Soft-deletes a custom field using atomic transactions.
         * The soft delete and audit log are created in a single transaction to ensure
         * data consistency and complete audit trail.
         * 
         * Soft Delete Strategy:
         * - Sets deletedAt timestamp instead of hard delete
         * - Preserves data for recovery and audit purposes
         * - Orphaned values remain in attendee documents (filtered by UI)
         * - Instant operation with no risk of timeout
         * 
         * Transaction Behavior:
         * - Soft delete and audit log are atomic (both succeed or both fail)
         * - Automatic retry on conflicts (up to 3 times with exponential backoff)
         * - Automatic rollback on any failure
         * - No orphaned audit logs or partial deletes
         * 
         * Requirements: 7.3, 7.6
         */
        // Check permissions
        const deletePermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasDeletePermission = deletePermissions?.all === true || deletePermissions?.customFields?.delete === true;

        if (!hasDeletePermission) {
          return res.status(403).json({ error: 'Insufficient permissions to delete custom fields' });
        }

        // Check if field exists
        let fieldToDelete;
        try {
          fieldToDelete = await tablesDB.getRow({
            databaseId: dbId,
            tableId: customFieldsTableId,
            rowId: id
          });
        } catch (error) {
          return res.status(404).json({ error: 'Custom field not found' });
        }

        // Check if already soft-deleted
        if (fieldToDelete.deletedAt) {
          return res.status(410).json({
            error: 'Custom field already deleted',
            deletedAt: fieldToDelete.deletedAt
          });
        }

        /**
         * SOFT DELETE STRATEGY
         * 
         * We use soft delete (deletedAt timestamp) instead of hard delete for these reasons:
         * 
         * TRADEOFFS:
         * ✅ Pros:
         *   - Instant operation (no expensive batch processing during deletion)
         *   - Data recovery possible if deletion was accidental
         *   - Audit trail preserved (can see what was deleted and when)
         *   - No risk of timeout on large datasets
         *   - Orphaned customFieldValues in attendee documents remain queryable for reporting
         * 
         * ⚠️ Cons:
         *   - Orphaned data remains in attendee.customFieldValues JSON
         *   - Requires queries to filter out soft-deleted fields (Query.isNull('deletedAt'))
         *   - Storage not immediately reclaimed
         *   - Requires periodic cleanup job for permanent deletion (optional)
         * 
         * ORPHANED DATA HANDLING:
         * - Attendee documents will retain the field key in their customFieldValues JSON
         * - UI/queries must filter custom fields where deletedAt IS NULL
         * - Orphaned values don't cause errors (just ignored by UI)
         * - Optional: Schedule background job to clean up orphaned values after 30+ days
         * 
         * ALTERNATIVE APPROACHES CONSIDERED:
         * 1. Hard delete with immediate batch cleanup: Risk of timeout, not atomic
         * 2. Hard delete with background job: Complex retry logic, eventual consistency issues
         * 3. Soft delete (CHOSEN): Simple, safe, recoverable
         */

        const deletedAt = new Date().toISOString();

        logger.info('[CUSTOM_FIELD_DELETE] Starting soft delete with transaction', {
          fieldId: id,
          fieldName: fieldToDelete.fieldName,
          fieldType: fieldToDelete.fieldType,
          deletedBy: user.$id,
          deletedAt
        });

        // Check if logging is enabled
        const deleteLoggingEnabled = await shouldLog('customFieldDelete');

        // Build transaction operations
        const deleteOperations: TransactionOperation[] = [
          {
            action: 'update',
            databaseId: dbId,
            tableId: customFieldsTableId,
            rowId: id,
            data: {
              deletedAt,
              // Increment version for optimistic locking consistency
              version: (fieldToDelete.version || 0) + 1
            }
          }
        ];

        // Add audit log if logging is enabled
        if (deleteLoggingEnabled) {
          deleteOperations.push({
            action: 'create',
            databaseId: dbId,
            tableId: logsTableId,
            rowId: ID.unique(),
            data: {
              userId: user.$id,
              action: 'delete',
              details: JSON.stringify({
                type: 'custom_field',
                fieldId: id,
                fieldName: fieldToDelete.fieldName,
                fieldType: fieldToDelete.fieldType,
                internalFieldName: fieldToDelete.internalFieldName,
                deletedAt,
                deleteType: 'soft_delete',
                note: 'Field soft-deleted. Orphaned values remain in attendee documents.',
                timestamp: new Date().toISOString()
              })
            }
          });
        }

        // Execute transaction with automatic retry
        try {
          await executeTransactionWithRetry(tablesDB, deleteOperations, {
            maxRetries: 3,
            retryDelay: 100
          });

          logger.info('[CUSTOM_FIELD_DELETE] Transaction completed successfully', {
            fieldId: id,
            fieldName: fieldToDelete.fieldName,
            userId: user.$id,
            loggingEnabled: deleteLoggingEnabled,
            operationCount: deleteOperations.length,
            deletedAt
          });

          return res.status(200).json({
            success: true,
            message: 'Custom field deleted successfully',
            deletedAt,
            note: 'Field has been soft-deleted. Existing values in attendee records are preserved but will not be displayed.'
          });

        } catch (error: any) {
          logger.error('[CUSTOM_FIELD_DELETE] Transaction failed', {
            fieldId: id,
            fieldName: fieldToDelete.fieldName,
            userId: user.$id,
            error: error.message,
            code: error.code
          });

          // Use centralized error handler
          return handleTransactionError(error, res);
        }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: unknown) {
    const err = error as any;
    logger.error('API Error:', { error: err.message || String(error), code: err.code });

    // Handle Appwrite-specific errors
    if (err.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (err.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    } else if (err.code === 409) {
      return res.status(409).json({ error: 'Conflict - resource already exists' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
});