import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { bulkEditWithFallback } from '@/lib/bulkOperations';
import { handleTransactionError } from '@/lib/transactions';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases, tablesDB } = createSessionClient(req);

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

    // Get custom fields
    const customFieldsDocs = await databases.listDocuments(
      dbId,
      customFieldsCollectionId,
      [Query.limit(100)]
    );
    const customFields = customFieldsDocs.documents;

    // Prepare updates array for transaction
    const updates: Array<{ rowId: string; data: any }> = [];

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
        // Create a map for easier lookup and updates
        const customFieldMap = new Map(
          currentCustomFieldValues.map(cfv => [cfv.customFieldId, cfv.value])
        );

        // Process changes
        for (const [fieldId, value] of Object.entries(changes)) {
          if (!value || value === 'no-change') {
            continue;
          }

          const customField = customFields.find(cf => cf.$id === fieldId);
          if (!customField) {
            continue;
          }

          let processedValue = value;
          if (customField.fieldType === 'uppercase' && typeof processedValue === 'string') {
            processedValue = processedValue.toUpperCase();
          }

          // Update the custom field value in the map
          const currentValue = customFieldMap.get(fieldId);
          if (currentValue !== String(processedValue)) {
            customFieldMap.set(fieldId, String(processedValue));
            hasChanges = true;
          }
        }

        // Add to updates array if there are changes
        if (hasChanges) {
          // Convert map back to array format
          const updatedCustomFieldValues = Array.from(customFieldMap.entries()).map(([customFieldId, value]) => ({
            customFieldId,
            value
          }));

          updates.push({
            rowId: attendeeId,
            data: {
              customFieldValues: JSON.stringify(updatedCustomFieldValues)
            }
          });
        }
      } catch (error: any) {
        console.error(`Failed to prepare update for attendee ${attendeeId}:`, error);
        // Validation errors should be caught before transaction
        res.status(400).json({
          error: 'Failed to prepare updates',
          details: error.message
        });
        return;
      }
    }

    // If no changes, return early
    if (updates.length === 0) {
      res.status(200).json({
        message: 'No changes to apply',
        updatedCount: 0,
        usedTransactions: false
      });
      return;
    }

    // Get field names for logging
    const changedFieldNames = Object.keys(changes)
      .filter(fieldId => changes[fieldId] && changes[fieldId] !== 'no-change')
      .map(fieldId => {
        const field = customFields.find(cf => cf.$id === fieldId);
        return field?.fieldName || fieldId;
      });

    // Execute bulk edit with transaction and fallback support
    const result = await bulkEditWithFallback(tablesDB, databases, {
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

    res.status(200).json({
      message: 'Attendees updated successfully',
      updatedCount: result.updatedCount,
      usedTransactions: result.usedTransactions,
      batchCount: result.batchCount
    });

  } catch (error: any) {
    console.error('Bulk edit API error:', error);

    // Use centralized transaction error handling
    handleTransactionError(error, res);
  }
});
