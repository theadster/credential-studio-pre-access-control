import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { bulkEditWithFallback } from '@/lib/bulkOperations';
import { handleTransactionError } from '@/lib/transactions';
import { CLEAR_SENTINEL } from '@/lib/constants';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    // TablesDB bulk operations require API key authentication (admin client)
    // Session-based JWT authentication doesn't have sufficient permissions
    const { createAdminClient } = await import('@/lib/appwrite');
    const { tablesDB: adminTablesDB } = createAdminClient();

    // Validate request body
    const { attendeeIds, changes } = req.body;

    if (!attendeeIds || !Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      res.status(400).json({ error: 'Invalid attendeeIds' });
      return;
    }

    if (!changes || typeof changes !== 'object') {
      res.status(400).json({ error: 'Invalid changes object' });
      return;
    }

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;

    // Check permissions
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    if (!permissions?.attendees?.bulkEdit) {
      res.status(403).json({ error: 'Insufficient permissions to bulk edit attendees' });
      return;
    }

    // Get all custom fields with pagination to avoid truncation
    const allCustomFields: any[] = [];
    let offset = 0;
    const pageSize = 100;

    while (true) {
      const customFieldsDocs = await databases.listDocuments(
        dbId,
        customFieldsCollectionId,
        [Query.limit(pageSize), Query.offset(offset)]
      );

      allCustomFields.push(...customFieldsDocs.documents);

      // If we got fewer than pageSize results, we've reached the end
      if (customFieldsDocs.documents.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    const customFields = allCustomFields;

    // Create a map of field ID to field properties for O(1) lookups (fetch once for entire bulk operation)
    // This avoids O(n*m) behavior from repeated find() calls in the bulk loop
    const customFieldsMap = new Map(
      customFields.map((cf: any) => [cf.$id, {
        fieldType: cf.fieldType,
        fieldName: cf.fieldName,
        printable: cf.printable === true
      }])
    );

    // Prepare updates array for transaction
    const updates: Array<{ rowId: string; data: any }> = [];

    // Track failed attendee updates
    const errors: Array<{ id: string; error: string }> = [];

    // Process each attendee to determine what needs to be updated
    for (const attendeeId of attendeeIds) {
      try {
        // Get current attendee
        const attendee = await databases.getDocument(dbId, attendeesCollectionId, attendeeId);

        // Parse current custom field values - handle both array and object formats
        let currentCustomFieldValues: Array<{ customFieldId: string, value: string }> = [];

        if (attendee.customFieldValues) {
          const parsed = typeof attendee.customFieldValues === 'string' ?
            JSON.parse(attendee.customFieldValues) : attendee.customFieldValues;

          // Convert to array format if it's an object
          if (Array.isArray(parsed)) {
            currentCustomFieldValues = parsed;
          } else if (typeof parsed === 'object') {
            // Convert object format to array format
            currentCustomFieldValues = Object.entries(parsed)
              .filter(([key]) => !key.match(/^\d+$/)) // Skip numeric keys (array indices)
              .map(([customFieldId, value]) => ({
                customFieldId,
                value: String(value)
              }));
          }
        }

        let hasChanges = false;
        let hasPrintableCustomFieldChanges = false;

        // Create a map for easier lookup and updates
        const customFieldMap = new Map(
          currentCustomFieldValues.map(cfv => [cfv.customFieldId, cfv.value])
        );

        // Process changes
        for (const [fieldId, value] of Object.entries(changes)) {
          if (!value || value === 'no-change') {
            continue;
          }

          const customField = customFieldsMap.get(fieldId);
          if (!customField) {
            continue;
          }

          // Handle special CLEAR_SENTINEL value to empty the field
          let processedValue = value;
          if (value === CLEAR_SENTINEL) {
            processedValue = '';
          } else if (customField.fieldType === 'uppercase' && typeof processedValue === 'string') {
            processedValue = processedValue.toUpperCase();
          }

          // Update the custom field value in the map
          const currentValue = customFieldMap.get(fieldId);
          if (currentValue !== String(processedValue)) {
            customFieldMap.set(fieldId, String(processedValue));
            hasChanges = true;

            // Check if this is a printable field
            if (customField.printable) {
              hasPrintableCustomFieldChanges = true;
            }
          }
        }

        // Add to updates array if there are changes
        if (hasChanges) {
          // Convert map back to array format
          const updatedCustomFieldValues = Array.from(customFieldMap.entries()).map(([customFieldId, value]) => ({
            customFieldId,
            value
          }));

          const updateData: any = {
            customFieldValues: JSON.stringify(updatedCustomFieldValues)
          };

          // Only update lastSignificantUpdate if printable fields actually changed
          // This ensures credentials are only marked as outdated when necessary
          if (hasPrintableCustomFieldChanges) {
            updateData.lastSignificantUpdate = new Date().toISOString();
          }
          // Do NOT initialize lastSignificantUpdate for non-printable changes
          // If the field doesn't exist, leave it undefined so credentialGeneratedAt remains authoritative

          updates.push({
            rowId: attendeeId,
            data: updateData
          });
        }
      } catch (error: any) {
        console.error(`Failed to prepare update for attendee ${attendeeId}:`, error);

        // Record the failed attendee with error details
        errors.push({
          id: attendeeId,
          error: error.message || 'Unknown error occurred during update preparation'
        });

        // Continue processing other attendees instead of failing entire batch
        // This allows partial success in bulk operations
        continue;
      }
    }

    // If no changes, return early
    if (updates.length === 0) {
      const hasFailures = errors.length > 0;
      res.status(hasFailures ? 207 : 200).json({
        message: hasFailures ? 'No successful updates, some attendees failed' : 'No changes to apply',
        updatedCount: 0,
        usedTransactions: false,
        errors,
        totalRequested: attendeeIds.length,
        successCount: 0,
        failureCount: errors.length
      });
      return;
    }

    // Get field names for logging
    const changedFieldNames = Object.keys(changes)
      .filter(fieldId => changes[fieldId] && changes[fieldId] !== 'no-change')
      .map(fieldId => {
        const field = customFieldsMap.get(fieldId);
        return field?.fieldName || fieldId;
      });

    // Execute bulk edit with transaction and fallback support
    // Use admin TablesDB client for bulk operations (requires API key)
    const result = await bulkEditWithFallback(adminTablesDB, databases, {
      databaseId: dbId,
      tableId: attendeesCollectionId,
      updates,
      auditLog: {
        tableId: logsCollectionId,
        userId: user.$id,
        action: 'bulk_update',
        details: {
          type: 'bulk_edit',
          target: 'Attendees',
          description: `Bulk edited ${updates.length} of ${attendeeIds.length} attendee${attendeeIds.length !== 1 ? 's' : ''}`,
          totalRequested: attendeeIds.length,
          updatedCount: updates.length,
          fieldsChanged: changedFieldNames,
          summary: `Updated fields: ${changedFieldNames.join(', ')}`
        }
      }
    });

    // Determine appropriate status code and message
    const hasFailures = errors.length > 0;
    const successCount = result.updatedCount;
    const totalRequested = attendeeIds.length;

    let statusCode = 200;
    let message = 'Attendees updated successfully';

    if (hasFailures && successCount > 0) {
      statusCode = 207; // Multi-Status (partial success)
      message = `Partially successful: ${successCount} updated, ${errors.length} failed`;
    } else if (hasFailures && successCount === 0) {
      statusCode = 207; // Multi-Status (all failed)
      message = 'All attendee updates failed';
    }

    res.status(statusCode).json({
      message,
      updatedCount: result.updatedCount,
      usedTransactions: result.usedTransactions,
      batchCount: result.batchCount,
      errors,
      totalRequested,
      successCount,
      failureCount: errors.length
    });

  } catch (error: any) {
    console.error('Bulk edit API error:', error);

    // Use centralized transaction error handling
    handleTransactionError(error, res);
    return;
  }
});
