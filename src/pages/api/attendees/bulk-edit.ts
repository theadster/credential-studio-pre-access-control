import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    // Validate request body
    const { attendeeIds, changes } = req.body;

    if (!attendeeIds || !Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      return res.status(400).json({ error: 'Invalid attendeeIds' });
    }

    if (!changes || typeof changes !== 'object') {
      return res.status(400).json({ error: 'Invalid changes object' });
    }

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;

    // Check permissions
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    if (!permissions?.attendees?.bulkEdit) {
      return res.status(403).json({ error: 'Insufficient permissions to bulk edit attendees' });
    }

    // Get custom fields
    const customFieldsDocs = await databases.listDocuments(
      dbId,
      customFieldsCollectionId,
      [Query.limit(100)]
    );
    const customFields = customFieldsDocs.documents;

    // Process bulk updates
    let updatedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

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

        // Update attendee if there are changes
        if (hasChanges) {
          // Convert map back to array format
          const updatedCustomFieldValues = Array.from(customFieldMap.entries()).map(([customFieldId, value]) => ({
            customFieldId,
            value
          }));

          await databases.updateDocument(
            dbId,
            attendeesCollectionId,
            attendeeId,
            {
              customFieldValues: JSON.stringify(updatedCustomFieldValues)
            }
          );
          updatedCount++;
        }
      } catch (error: any) {
        errors.push({ id: attendeeId, error: error.message || 'Failed to update' });
      }
    }

    // Get field names for logging
    const changedFieldNames = Object.keys(changes)
      .filter(fieldId => changes[fieldId] && changes[fieldId] !== 'no-change')
      .map(fieldId => {
        const field = customFields.find(cf => cf.$id === fieldId);
        return field?.fieldName || fieldId;
      });

    // Log the action with detailed information
    await databases.createDocument(
      dbId,
      logsCollectionId,
      ID.unique(),
      {
        userId: user.$id,
        action: 'bulk_update',
        details: JSON.stringify({
          type: 'bulk_edit',
          target: 'Attendees',
          description: `Bulk edited ${updatedCount} of ${attendeeIds.length} attendee${attendeeIds.length !== 1 ? 's' : ''}`,
          totalRequested: attendeeIds.length,
          successCount: updatedCount,
          errorCount: errors.length,
          fieldsChanged: changedFieldNames,
          summary: `Updated fields: ${changedFieldNames.join(', ')}`
        })
      }
    );

    return res.status(200).json({
      message: 'Attendees updated successfully',
      updatedCount,
      errors
    });

  } catch (error: any) {
    console.error('Bulk edit API error:', error);

    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    return res.status(500).json({
      error: 'Internal server error',
      details: error.message || 'Unknown error'
    });
  }
});
