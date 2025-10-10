import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { parseCustomFieldValues } from '@/util/customFields';
import { shouldLog } from '@/lib/logSettings';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid attendee ID' });
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;

    switch (req.method) {
      case 'GET':
        // Check permissions
        const readPermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasReadPermission = readPermissions?.attendees?.read === true || readPermissions?.all === true;

        if (!hasReadPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to view attendee details' });
        }

        // Get attendee
        const attendee = await databases.getDocument(dbId, attendeesCollectionId, id);

        // …rest of your logic handling a successfully fetched attendee…

        if (!attendee) {
          return res.status(404).json({ error: 'Attendee not found' });
        }

        // TODO: Individual attendee view logging is currently inoperable
        // Keeping the code structure for future implementation
        // if (await shouldLog('attendeeView')) {
        //   // Log view action
        // }

        // Parse customFieldValues from JSON string to array format
        const parsedCustomFieldValues = parseCustomFieldValues(attendee.customFieldValues);

        const attendeeWithParsedFields = {
          ...attendee,
          id: attendee.$id, // Map $id to id for frontend compatibility
          customFieldValues: parsedCustomFieldValues
        };

        return res.status(200).json(attendeeWithParsedFields);

      case 'PUT':
        // Check permissions
        const updatePermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasUpdatePermission = updatePermissions?.attendees?.update === true || updatePermissions?.all === true;

        if (!hasUpdatePermission) {
          return res.status(403).json({ error: 'Insufficient permissions to update attendees' });
        }

        const { firstName, lastName, barcodeNumber, photoUrl, customFieldValues } = req.body;

        // Check if attendee exists and get current values BEFORE making changes
        let existingAttendee;
        try {
          existingAttendee = await databases.getDocument(dbId, attendeesCollectionId, id);
        } catch (error: any) {
          console.error('Error fetching attendee:', error);
          return res.status(404).json({ error: 'Attendee not found', details: error.message });
        }

        if (!existingAttendee) {
          return res.status(404).json({ error: 'Attendee not found' });
        }
        // Parse existing custom field values (stored as JSON array)
        let currentCustomFieldValues: Record<string, any> = {};
        try {
          if (existingAttendee.customFieldValues) {
            const parsed = typeof existingAttendee.customFieldValues === 'string'
              ? JSON.parse(existingAttendee.customFieldValues)
              : existingAttendee.customFieldValues;
            
            // Convert array format to object format for easier comparison
            if (Array.isArray(parsed)) {
              currentCustomFieldValues = parsed.reduce((acc: Record<string, any>, item: any) => {
                if (item.customFieldId) {
                  acc[item.customFieldId] = item.value;
                }
                return acc;
              }, {});
            }
          }
        } catch (error) {
          console.error('Failed to parse customFieldValues:', error);
          currentCustomFieldValues = {};
        }

        // Check if barcode is unique (excluding current attendee)
        if (barcodeNumber && barcodeNumber !== existingAttendee.barcodeNumber) {
          const duplicateBarcodeDocs = await databases.listDocuments(
            dbId,
            attendeesCollectionId,
            [Query.equal('barcodeNumber', barcodeNumber)]
          );

          if (duplicateBarcodeDocs.documents.length > 0) {
            return res.status(400).json({ error: 'Barcode number already exists' });
          }
        }

        // Prepare update data
        const updateData: any = {
          firstName: firstName || existingAttendee.firstName,
          lastName: lastName || existingAttendee.lastName,
          barcodeNumber: barcodeNumber || existingAttendee.barcodeNumber,
          photoUrl: photoUrl !== undefined ? photoUrl : existingAttendee.photoUrl,
        };

        // Update custom field values if provided
        if (customFieldValues !== undefined) {
          console.log('Received customFieldValues:', customFieldValues);

          if (Array.isArray(customFieldValues)) {
            // Validate that all custom field IDs exist
            const customFieldIds = customFieldValues.map((cfv: any) => cfv.customFieldId).filter(Boolean);

            if (customFieldIds.length > 0) {
              // Fetch custom fields to validate IDs
              const customFieldsDocs = await databases.listDocuments(
                dbId,
                customFieldsCollectionId,
                [Query.limit(100)]
              );

              const existingCustomFieldIds = customFieldsDocs.documents.map(cf => cf.$id);
              const invalidCustomFieldIds = customFieldIds.filter(id => !existingCustomFieldIds.includes(id));

              if (invalidCustomFieldIds.length > 0) {
                console.error('Invalid custom field IDs:', invalidCustomFieldIds);
                return res.status(400).json({
                  error: 'Some custom fields no longer exist. Please refresh the page and try again.',
                  invalidIds: invalidCustomFieldIds
                });
              }
            }

            // Convert custom field values array to JSON array format (not object)
            // Filter out entries without customFieldId but keep all values including empty ones
            const validCustomFieldValues = customFieldValues
              .filter((cfv: any) => cfv.customFieldId)
              .map((cfv: any) => ({
                customFieldId: cfv.customFieldId,
                value: cfv.value !== null && cfv.value !== undefined ? String(cfv.value) : ''
              }));

            updateData.customFieldValues = JSON.stringify(validCustomFieldValues);
            console.log('Storing customFieldValues as:', updateData.customFieldValues);
          }
        }

        // Update attendee
        const updatedAttendee = await databases.updateDocument(
          dbId,
          attendeesCollectionId,
          id,
          updateData
        );

        // Fetch the final updated attendee
        const finalAttendee = await databases.getDocument(dbId, attendeesCollectionId, id);

        // Log the update action with detailed before/after values
        const changeDetails: string[] = [];

        // Check for basic field changes with before/after values
        if (firstName && firstName !== existingAttendee.firstName) {
          changeDetails.push(`First Name: "${existingAttendee.firstName}" → "${firstName}"`);
        }
        if (lastName && lastName !== existingAttendee.lastName) {
          changeDetails.push(`Last Name: "${existingAttendee.lastName}" → "${lastName}"`);
        }
        if (barcodeNumber && barcodeNumber !== existingAttendee.barcodeNumber) {
          changeDetails.push(`Barcode Number: "${existingAttendee.barcodeNumber}" → "${barcodeNumber}"`);
        }
        if (photoUrl !== undefined && photoUrl !== existingAttendee.photoUrl) {
          const oldPhoto = existingAttendee.photoUrl ? 'has photo' : 'no photo';
          const newPhoto = photoUrl ? 'has photo' : 'no photo';
          changeDetails.push(`Photo: ${oldPhoto} → ${newPhoto}`);
        }

        // Check for custom field changes with detailed before/after values
        if (customFieldValues && Array.isArray(customFieldValues)) {
          // Get all custom fields to map IDs to names
          const allCustomFieldsDocs = await databases.listDocuments(
            dbId,
            customFieldsCollectionId,
            [Query.limit(100)]
          );

          const customFieldMap = new Map(
            allCustomFieldsDocs.documents.map(cf => [cf.$id, { name: cf.fieldName, type: cf.fieldType }])
          );

          // Helper function to format values based on field type
          const formatValue = (value: any, fieldType: string) => {
            if (value === null || value === undefined || value === '') {
              return 'empty';
            }
            if (fieldType === 'boolean') {
              // Handle both string and boolean values
              if (typeof value === 'string') {
                return value.toLowerCase() === 'yes' ? 'Yes' : 'No';
              }
              return value ? 'Yes' : 'No';
            }
            return `"${value}"`;
          };

          // Check each incoming custom field value against the stored current values
          for (const newValue of customFieldValues) {
            const currentValue = currentCustomFieldValues[newValue.customFieldId];
            const fieldInfo = customFieldMap.get(newValue.customFieldId);

            if (fieldInfo) {
              const oldVal = currentValue || null;
              const newVal = newValue.value;

              // Only log if there's actually a change
              if (String(oldVal || '') !== String(newVal || '')) {
                const formattedOldValue = formatValue(oldVal, fieldInfo.type);
                const formattedNewValue = formatValue(newVal, fieldInfo.type);
                changeDetails.push(`${fieldInfo.name}: ${formattedOldValue} → ${formattedNewValue}`);
              }
            }
          }

          // Check for removed custom field values (fields that existed before but are not in the new data)
          for (const [fieldId, currentValue] of Object.entries(currentCustomFieldValues)) {
            const newValue = customFieldValues.find(nv => nv.customFieldId === fieldId);
            const fieldInfo = customFieldMap.get(fieldId);

            if (fieldInfo && (!newValue || newValue.value === null || newValue.value === undefined || newValue.value === '')) {
              // Only log if the current value is not already empty
              if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
                const formattedOldValue = formatValue(currentValue, fieldInfo.type);
                const formattedNewValue = formatValue(null, fieldInfo.type);
                changeDetails.push(`${fieldInfo.name}: ${formattedOldValue} → ${formattedNewValue}`);
              }
            }
          }
        }

        // If no specific changes detected, fall back to generic message
        if (changeDetails.length === 0) {
          changeDetails.push('No changes detected');
        }

        if (await shouldLog('attendeeUpdate')) {
          const { createAttendeeLogDetails } = await import('@/lib/logFormatting');
          await databases.createDocument(
            dbId,
            logsCollectionId,
            ID.unique(),
            {
              userId: user.$id,
              attendeeId: updatedAttendee.$id,
              action: 'update',
              details: JSON.stringify(createAttendeeLogDetails('update', {
                firstName: updatedAttendee.firstName,
                lastName: updatedAttendee.lastName,
                barcodeNumber: updatedAttendee.barcodeNumber
              }, {
                changes: changeDetails
              }))
            }
          );
        }

        // Parse and return the updated attendee with proper structure
        const customFieldValuesArray = parseCustomFieldValues(finalAttendee.customFieldValues);

        const finalAttendeeWithParsedFields = {
          ...finalAttendee,
          id: finalAttendee.$id, // Map $id to id for frontend compatibility
          customFieldValues: customFieldValuesArray
        };

        return res.status(200).json(finalAttendeeWithParsedFields);

      case 'DELETE':
        // Check permissions
        const deletePermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasDeletePermission = deletePermissions?.attendees?.delete === true || deletePermissions?.all === true;

        if (!hasDeletePermission) {
          return res.status(403).json({ error: 'Insufficient permissions to delete attendees' });
        }

        // Check if attendee exists
        const attendeeToDelete = await databases.getDocument(dbId, attendeesCollectionId, id);

        if (!attendeeToDelete) {
          return res.status(404).json({ error: 'Attendee not found' });
        }

        // Delete attendee
        await databases.deleteDocument(dbId, attendeesCollectionId, id);

        // Log the delete action if enabled
        if (await shouldLog('attendeeDelete')) {
          const { createAttendeeLogDetails } = await import('@/lib/logFormatting');
          await databases.createDocument(
            dbId,
            logsCollectionId,
            ID.unique(),
            {
              userId: user.$id,
              action: 'delete',
              details: JSON.stringify(createAttendeeLogDetails('delete', {
                firstName: attendeeToDelete.firstName,
                lastName: attendeeToDelete.lastName,
                barcodeNumber: attendeeToDelete.barcodeNumber
              }))
            }
          );
        }

        return res.status(200).json({ message: 'Attendee deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('API Error:', error);

    const errorMessage = error.message || String(error);

    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized', message: errorMessage });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found', message: errorMessage });
    } else if (error.code === 409) {
      return res.status(409).json({ error: 'Conflict - resource already exists', message: errorMessage });
    }

    return res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});