import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { ID } from 'node-appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { getAppwriteCollectionIds } from '@/lib/envValidation';
import { logger } from '@/lib/logger';
import { shouldLog } from '@/lib/logSettings';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid custom field ID' });
    }

    // Validate required environment variables using centralized utility
    let dbId: string;
    let customFieldsCollectionId: string;
    let logsCollectionId: string;

    try {
      const collectionIds = getAppwriteCollectionIds();
      dbId = collectionIds.dbId;
      customFieldsCollectionId = collectionIds.customFieldsCollectionId;
      logsCollectionId = collectionIds.logsCollectionId;
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
          customField = await databases.getDocument({
            databaseId: dbId,
            collectionId: customFieldsCollectionId,
            documentId: id
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
         * UPDATE CUSTOM FIELD ENDPOINT
         * 
         * Updates an existing custom field with new values.
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
         */
        // Check permissions
        const updatePermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasUpdatePermission = updatePermissions?.all === true || updatePermissions?.customFields?.update === true;

        if (!hasUpdatePermission) {
          return res.status(403).json({ error: 'Insufficient permissions to update custom fields' });
        }

        const { fieldName, fieldType, fieldOptions, required, order, version, showOnMainPage } = req.body;

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

        // Fetch current document to check version
        let currentField;
        try {
          currentField = await databases.getDocument({
            databaseId: dbId,
            collectionId: customFieldsCollectionId,
            documentId: id
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

        // Update with incremented version for optimistic locking
        // showOnMainPage defaults to true if not explicitly set to false
        // This maintains backward compatibility with existing fields that don't have this attribute
        const updatedField = await databases.updateDocument({
          databaseId: dbId,
          collectionId: customFieldsCollectionId,
          documentId: id,
          data: {
            fieldName,
            fieldType,
            fieldOptions: fieldOptionsStr,
            required: required || false,
            order: order || 1,
            showOnMainPage: showOnMainPage !== undefined ? showOnMainPage : true, // Default to visible
            version: currentVersion + 1 // Increment version for optimistic locking
          }
        });

        // Log the update action if enabled
        if (await shouldLog('customFieldUpdate')) {
          try {
            await databases.createDocument({
              databaseId: dbId,
              collectionId: logsCollectionId,
              documentId: ID.unique(),
              data: {
                userId: user.$id,
                action: 'update',
                details: JSON.stringify({
                  type: 'custom_field',
                  fieldId: id,
                  fieldName: updatedField.fieldName,
                  fieldType: updatedField.fieldType
                })
              }
            });
          } catch (logError) {
            console.error('[custom-fields/[id]] Failed to create log entry, but continuing with request', {
              error: logError instanceof Error ? logError.message : 'Unknown error',
              errorType: (logError as any)?.type,
              userId: user.$id,
              fieldId: id,
              fieldName: updatedField.fieldName
            });
            // Do not re-throw - allow the request to succeed even if logging fails
          }
        }

        return res.status(200).json(updatedField);

      case 'DELETE':
        // Check permissions
        const deletePermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasDeletePermission = deletePermissions?.all === true || deletePermissions?.customFields?.delete === true;

        if (!hasDeletePermission) {
          return res.status(403).json({ error: 'Insufficient permissions to delete custom fields' });
        }

        // Check if field exists
        let fieldToDelete;
        try {
          fieldToDelete = await databases.getDocument({
            databaseId: dbId,
            collectionId: customFieldsCollectionId,
            documentId: id
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

        logger.info('[CUSTOM_FIELD_DELETE] Starting soft delete', {
          fieldId: id,
          fieldName: fieldToDelete.fieldName,
          fieldType: fieldToDelete.fieldType,
          deletedBy: user.$id,
          deletedAt
        });

        try {
          // Soft delete: Set deletedAt timestamp
          const softDeletedField = await databases.updateDocument({
            databaseId: dbId,
            collectionId: customFieldsCollectionId,
            documentId: id,
            data: {
              deletedAt,
              // Increment version for optimistic locking consistency
              version: (fieldToDelete.version || 0) + 1
            }
          });

          logger.info('[CUSTOM_FIELD_DELETE] Soft delete successful', {
            fieldId: id,
            fieldName: fieldToDelete.fieldName,
            newVersion: softDeletedField.version
          });

          // Log the delete action if enabled
          if (await shouldLog('customFieldDelete')) {
            try {
              await databases.createDocument({
                databaseId: dbId,
                collectionId: logsCollectionId,
                documentId: ID.unique(),
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
                    note: 'Field soft-deleted. Orphaned values remain in attendee documents.'
                  })
                }
              });
            } catch (logError) {
              logger.error('[CUSTOM_FIELD_DELETE] Failed to create log entry, but continuing with request', {
                error: logError instanceof Error ? logError.message : 'Unknown error',
                errorType: (logError as any)?.type,
                userId: user.$id,
                fieldId: id,
                fieldName: fieldToDelete.fieldName
              });
              // Do not re-throw - allow the request to succeed even if logging fails
            }
          }

          logger.debug('[CUSTOM_FIELD_DELETE] Delete logged successfully', {
            fieldId: id
          });

          return res.status(200).json({
            success: true,
            message: 'Custom field deleted successfully',
            deletedAt,
            note: 'Field has been soft-deleted. Existing values in attendee records are preserved but will not be displayed.'
          });

        } catch (deleteError: unknown) {
          const error = deleteError as any;
          logger.error('[CUSTOM_FIELD_DELETE] Soft delete failed', {
            fieldId: id,
            fieldName: fieldToDelete.fieldName,
            error: error.message,
            code: error.code
          });
          throw deleteError;
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