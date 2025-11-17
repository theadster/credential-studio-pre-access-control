import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { parseCustomFieldValues } from '@/util/customFields';
import { shouldLog } from '@/lib/logSettings';

/**
 * Attendee Update API Endpoint
 * 
 * This endpoint handles GET and PUT operations for individual attendee records.
 * 
 * ## Printable Field Logic
 * 
 * The endpoint implements intelligent credential status tracking based on "printable" custom fields.
 * This determines when a credential needs to be regenerated after attendee data changes.
 * 
 * ### How Printable Fields Work:
 * 
 * 1. **Custom Field Configuration**: Each custom field has a `printable` boolean flag that indicates
 *    whether the field appears on the printed credential.
 * 
 * 2. **Significant Change Detection**: When an attendee is updated, the endpoint checks which fields changed:
 *    - Default significant fields: firstName, lastName, barcodeNumber, photoUrl
 *    - Printable custom fields: Any custom field marked with printable=true
 *    - Non-significant fields: notes, non-printable custom fields
 * 
 * 3. **lastSignificantUpdate Timestamp**: This field tracks when data that appears on the credential
 *    was last modified:
 *    - Updated when: Any significant field changes (including printable custom fields)
 *    - NOT updated when: Only notes or non-printable custom fields change
 *    - Used to determine: If credential is OUTDATED (needs reprinting)
 * 
 * ### Credential Status Logic:
 * 
 * The credential status is determined by comparing two timestamps:
 * - `credentialGeneratedAt`: When the credential image was last generated
 * - `lastSignificantUpdate`: When printable data was last changed
 * 
 * Status calculation:
 * - CURRENT: credentialGeneratedAt >= lastSignificantUpdate (credential is up-to-date)
 * - OUTDATED: credentialGeneratedAt < lastSignificantUpdate (credential needs reprinting)
 * 
 * ### Implementation Details:
 * 
 * 1. **Fetch Custom Fields**: The endpoint fetches all custom field configurations to build
 *    a map of field ID → printable status.
 * 
 * 2. **Compare Values**: For each custom field being updated, check if:
 *    - The field is marked as printable
 *    - The value actually changed from the existing value
 * 
 * 3. **Update Timestamp**: If any printable field changed, update lastSignificantUpdate to
 *    the current time, marking the credential as outdated.
 * 
 * 4. **Fallback Behavior**: If custom fields configuration cannot be fetched, all custom field
 *    changes are treated as significant (safe fallback to avoid missing credential updates).
 * 
 * ### Example Scenarios:
 * 
 * ```
 * Scenario 1: Update email (non-printable field)
 * - Email field: printable=false
 * - Result: lastSignificantUpdate NOT updated, credential stays CURRENT
 * 
 * Scenario 2: Update company name (printable field)
 * - Company field: printable=true
 * - Result: lastSignificantUpdate updated, credential becomes OUTDATED
 * 
 * Scenario 3: Update notes field
 * - Notes: Always non-significant (hardcoded)
 * - Result: lastSignificantUpdate NOT updated, credential stays CURRENT
 * 
 * Scenario 4: Update firstName
 * - firstName: Always significant (default field)
 * - Result: lastSignificantUpdate updated, credential becomes OUTDATED
 * ```
 * 
 * ### Related Documentation:
 * - Design: .kiro/specs/printable-field-outdated-tracking/design.md
 * - Requirements: .kiro/specs/printable-field-outdated-tracking/requirements.md
 * - Notes Field Enhancement: docs/enhancements/NOTES_FIELD_CREDENTIAL_STATUS_ENHANCEMENT.md
 * 
 * @param req - Authenticated request with user and userProfile attached by middleware
 * @param res - Next.js API response object
 */
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

        const { firstName, lastName, barcodeNumber, notes, photoUrl, customFieldValues } = req.body;

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

            // Convert to object format for easier comparison
            if (Array.isArray(parsed)) {
              // Convert array format to object format
              currentCustomFieldValues = parsed.reduce((acc: Record<string, any>, item: any) => {
                if (item.customFieldId) {
                  acc[item.customFieldId] = item.value;
                }
                return acc;
              }, {});
            } else if (parsed && typeof parsed === 'object') {
              // Already in object format
              currentCustomFieldValues = parsed;
            }
          }
        } catch (error) {
          console.error('Failed to parse customFieldValues:', error);
          currentCustomFieldValues = {};
        }

        /**
         * Printable Field Configuration Fetch
         * 
         * Fetches custom field configurations to determine which fields are "printable"
         * (appear on the credential). This information is used to decide if changes
         * should mark the credential as OUTDATED.
         * 
         * The printableFieldsMap stores: fieldId → isPrintable (boolean)
         * - true: Field appears on credential, changes mark credential outdated
         * - false/undefined: Field doesn't appear on credential, changes don't affect status
         * 
         * Fallback: If fetch fails, the map will be empty, and all custom field changes
         * will be treated as significant (safe fallback to avoid missing updates).
         */
        let printableFieldsMap = new Map<string, boolean>();
        try {
          // Fetch all custom fields with pagination to avoid truncation
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

          // Create a map of field ID to printable status
          // Only fields with printable=true are marked as printable
          printableFieldsMap = new Map(
            allCustomFields.map((cf: any) => [cf.$id, cf.printable === true])
          );
        } catch (error) {
          console.error('Failed to fetch custom fields configuration:', error);
          // Fallback: If we can't fetch custom fields, treat all custom field changes as significant
          // This ensures we don't accidentally skip marking credentials as outdated
        }

        // Check if barcode is unique (excluding current attendee)
        if (barcodeNumber && barcodeNumber !== existingAttendee.barcodeNumber) {
          const duplicateBarcodeDocs = await databases.listDocuments(
            dbId,
            attendeesCollectionId,
            [Query.equal('barcodeNumber', barcodeNumber)]
          );

          if (duplicateBarcodeDocs.documents.length > 0) {
            const duplicateAttendee = duplicateBarcodeDocs.documents[0];
            return res.status(400).json({ 
              error: 'Barcode number already exists',
              existingAttendee: {
                firstName: duplicateAttendee.firstName,
                lastName: duplicateAttendee.lastName,
                barcodeNumber: duplicateAttendee.barcodeNumber
              }
            });
          }
        }

        /**
         * Printable Custom Field Change Detection
         * 
         * This section determines if any custom fields marked as "printable" have changed.
         * Only changes to printable fields will mark the credential as OUTDATED.
         * 
         * Process:
         * 1. Convert incoming custom field values to object format for comparison
         * 2. Compare each field's new value against its existing value
         * 3. Only count changes to fields marked as printable (printable=true)
         * 4. Check for removed printable field values
         * 
         * Fallback behavior:
         * - If printableFieldsMap is empty (fetch failed), treat ALL custom fields as printable
         * - This ensures we don't accidentally skip marking credentials as outdated
         * 
         * Non-printable field changes (printable=false or undefined) are ignored and won't
         * affect the credential status, allowing updates to internal data without triggering reprints.
         */
        let hasPrintableCustomFieldChanges = false;
        if (customFieldValues !== undefined && Array.isArray(customFieldValues)) {
          // Compare custom field values to see if they actually changed
          const newCustomFieldValues: Record<string, any> = {};
          customFieldValues.forEach((cfv: any) => {
            if (cfv.customFieldId) {
              newCustomFieldValues[cfv.customFieldId] = cfv.value;
            }
          });

          // Check if any PRINTABLE custom field value is different
          for (const [fieldId, newValue] of Object.entries(newCustomFieldValues)) {
            const oldValue = currentCustomFieldValues[fieldId];
            const isPrintable = printableFieldsMap.size === 0 || printableFieldsMap.get(fieldId) === true;

            // If we couldn't fetch custom fields (map is empty), treat all as printable (safe fallback)
            // Otherwise, only check fields that are marked as printable
            if (isPrintable && String(oldValue || '') !== String(newValue || '')) {
              hasPrintableCustomFieldChanges = true;
              break;
            }
          }

          // Also check if any existing PRINTABLE custom field was removed
          if (!hasPrintableCustomFieldChanges) {
            for (const fieldId of Object.keys(currentCustomFieldValues)) {
              const isPrintable = printableFieldsMap.size === 0 || printableFieldsMap.get(fieldId) === true;

              if (isPrintable && !(fieldId in newCustomFieldValues) && currentCustomFieldValues[fieldId]) {
                hasPrintableCustomFieldChanges = true;
                break;
              }
            }
          }
        }

        /**
         * Significant Change Detection
         * 
         * Determines if any "significant" fields have changed. Significant fields are those
         * that appear on the printed credential and require reprinting when modified.
         * 
         * Significant fields include:
         * - firstName: Always significant (default field on credential)
         * - lastName: Always significant (default field on credential)
         * - barcodeNumber: Always significant (default field on credential)
         * - photoUrl: Always significant (photo appears on credential)
         * - Printable custom fields: Any custom field with printable=true
         * 
         * Non-significant fields (changes don't affect credential status):
         * - notes: Internal notes field (hardcoded as non-significant)
         * - Non-printable custom fields: Custom fields with printable=false or undefined
         * 
         * If hasSignificantChanges is true, the lastSignificantUpdate timestamp will be
         * updated to the current time, marking the credential as OUTDATED.
         */
        const hasSignificantChanges =
          (firstName !== undefined && firstName !== existingAttendee.firstName) ||
          (lastName !== undefined && lastName !== existingAttendee.lastName) ||
          (barcodeNumber !== undefined && barcodeNumber !== existingAttendee.barcodeNumber) ||
          (photoUrl !== undefined && photoUrl !== existingAttendee.photoUrl) ||
          hasPrintableCustomFieldChanges;

        // Prepare update data
        const updateData: any = {
          firstName: firstName || existingAttendee.firstName,
          lastName: lastName || existingAttendee.lastName,
          barcodeNumber: barcodeNumber || existingAttendee.barcodeNumber,
          notes: notes !== undefined ? notes : existingAttendee.notes,
          photoUrl: photoUrl !== undefined ? photoUrl : existingAttendee.photoUrl,
        };

        // Handle photo upload count tracking with operators
        if (photoUrl !== undefined) {
          const hadPhoto = existingAttendee.photoUrl && existingAttendee.photoUrl !== '';
          const hasPhoto = photoUrl && photoUrl !== '';

          try {
            const { createIncrement, createDecrement, dateOperators } = await import('@/lib/operators');

            if (hasPhoto && !hadPhoto) {
              // Photo was added - increment count
              updateData.photoUploadCount = createIncrement(1);
              updateData.lastPhotoUploaded = dateOperators.setNow();
            } else if (!hasPhoto && hadPhoto) {
              // Photo was removed - decrement count (with min bound of 0)
              updateData.photoUploadCount = createDecrement(1, { min: 0 });
            }
            // If both had photo and still has photo (URL changed), don't modify count
          } catch (operatorError) {
            console.error('[Photo Count] Operator import failed, using fallback:', operatorError);
            // Fallback: manual count update
            if (hasPhoto && !hadPhoto) {
              updateData.photoUploadCount = (existingAttendee.photoUploadCount || 0) + 1;
              updateData.lastPhotoUploaded = new Date().toISOString();
            } else if (!hasPhoto && hadPhoto) {
              updateData.photoUploadCount = Math.max(0, (existingAttendee.photoUploadCount || 0) - 1);
            }
          }
        }

        /**
         * lastSignificantUpdate Timestamp Management
         * 
         * This timestamp tracks when data that appears on the credential was last modified.
         * It's used to determine if a credential is OUTDATED and needs reprinting.
         * 
         * Update logic:
         * 
         * 1. If significant changes detected:
         *    - Set lastSignificantUpdate to current time
         *    - This marks the credential as OUTDATED (if one exists)
         * 
         * 2. If no significant changes AND field doesn't exist:
         *    - Initialize with credentialGeneratedAt (if credential exists)
         *    - Or initialize with record creation time
         *    - This ensures backward compatibility with existing records
         * 
         * 3. If no significant changes AND field exists:
         *    - Leave unchanged (don't update)
         *    - This preserves the credential's CURRENT status
         * 
         * The credential status is calculated by comparing:
         * - credentialGeneratedAt (when credential was created)
         * - lastSignificantUpdate (when printable data last changed)
         * 
         * If credentialGeneratedAt >= lastSignificantUpdate: CURRENT
         * If credentialGeneratedAt < lastSignificantUpdate: OUTDATED
         */
        // Handle lastSignificantUpdate field
        if (hasSignificantChanges) {
          // If significant fields changed, update the lastSignificantUpdate timestamp
          updateData.lastSignificantUpdate = new Date().toISOString();
        } else if (!existingAttendee.lastSignificantUpdate) {
          // Only initialize if it doesn't exist AND we're not making significant changes
          // Use the credential generation time if available, otherwise use current time
          if (existingAttendee.credentialGeneratedAt) {
            // If a credential was generated, use that time as the baseline
            updateData.lastSignificantUpdate = existingAttendee.credentialGeneratedAt;
          } else {
            // Otherwise, use the record's creation time
            updateData.lastSignificantUpdate = existingAttendee.$createdAt || new Date().toISOString();
          }
        }
        // If no significant changes AND field exists: don't set it (leave unchanged)
        // If lastSignificantUpdate exists and no significant changes, don't update it (leave it as is)

        // Update custom field values if provided
        if (customFieldValues !== undefined) {
          console.log('Received customFieldValues:', customFieldValues);

          if (Array.isArray(customFieldValues)) {
            // Validate that all custom field IDs exist
            const customFieldIds = customFieldValues.map((cfv: any) => cfv.customFieldId).filter(Boolean);

            if (customFieldIds.length > 0) {
              // Fetch all custom fields to validate IDs with pagination
              const allCustomFieldsForValidation: any[] = [];
              let validationOffset = 0;
              const validationPageSize = 100;

              while (true) {
                const customFieldsDocs = await databases.listDocuments(
                  dbId,
                  customFieldsCollectionId,
                  [Query.limit(validationPageSize), Query.offset(validationOffset)]
                );

                allCustomFieldsForValidation.push(...customFieldsDocs.documents);

                if (customFieldsDocs.documents.length < validationPageSize) {
                  break;
                }

                validationOffset += validationPageSize;
              }

              const customFieldsDocs = { documents: allCustomFieldsForValidation };

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

            // Merge new custom field values with existing ones
            // This preserves hidden field values that weren't sent in the update
            const customFieldValuesObj: { [key: string]: string } = { ...currentCustomFieldValues };

            // Update only the fields that were sent
            customFieldValues.forEach((cfv: any) => {
              if (cfv.customFieldId) {
                customFieldValuesObj[cfv.customFieldId] = cfv.value !== null && cfv.value !== undefined ? String(cfv.value) : '';
              }
            });

            updateData.customFieldValues = JSON.stringify(customFieldValuesObj);
            console.log('Storing customFieldValues as:', updateData.customFieldValues);
          }
        }

        // Prepare change details for logging
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
        if (notes !== undefined && notes !== existingAttendee.notes) {
          const oldNotes = existingAttendee.notes || 'empty';
          const newNotes = notes || 'empty';
          changeDetails.push(`Notes: ${oldNotes} → ${newNotes}`);
        }
        if (photoUrl !== undefined && photoUrl !== existingAttendee.photoUrl) {
          const oldPhoto = existingAttendee.photoUrl ? 'has photo' : 'no photo';
          const newPhoto = photoUrl ? 'has photo' : 'no photo';
          changeDetails.push(`Photo: ${oldPhoto} → ${newPhoto}`);
        }

        // Check for custom field changes with detailed before/after values
        if (customFieldValues && Array.isArray(customFieldValues)) {
          // Get all custom fields to map IDs to names with pagination
          const allCustomFieldsForMapping: any[] = [];
          let mappingOffset = 0;
          const mappingPageSize = 100;

          while (true) {
            const customFieldsDocs = await databases.listDocuments(
              dbId,
              customFieldsCollectionId,
              [Query.limit(mappingPageSize), Query.offset(mappingOffset)]
            );

            allCustomFieldsForMapping.push(...customFieldsDocs.documents);

            if (customFieldsDocs.documents.length < mappingPageSize) {
              break;
            }

            mappingOffset += mappingPageSize;
          }

          const allCustomFieldsDocs = { documents: allCustomFieldsForMapping };

          const customFieldMap = new Map(
            allCustomFieldsDocs.documents.map(cf => [cf.$id, { name: cf.fieldName, type: cf.fieldType }])
          );

          // Helper function to format values based on field type
          const formatValue = (value: any, fieldType: string) => {
            if (value === null || value === undefined || value === '') {
              return 'empty';
            }
            if (fieldType === 'boolean') {
              // Handle various boolean representations
              if (typeof value === 'boolean') {
                return value ? 'Yes' : 'No';
              }
              if (typeof value === 'number') {
                return value === 1 ? 'Yes' : 'No';
              }
              if (typeof value === 'string') {
                const normalized = value.toString().trim().toLowerCase();
                const truthyValues = ['true', '1', 'yes', 'y', 'on'];
                const falsyValues = ['false', '0', 'no', 'n', 'off'];

                if (truthyValues.includes(normalized)) {
                  return 'Yes';
                } else if (falsyValues.includes(normalized)) {
                  return 'No';
                } else {
                  // Non-boolean string, wrap in quotes
                  return `"${value}"`;
                }
              }
              // Other types, wrap in quotes
              return `"${value}"`;
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

        let finalAttendee;

        // Use transaction-based approach
        console.log('[Attendee Update] Using transaction-based approach');

        try {
          const { tablesDB } = createSessionClient(req);
          const { executeTransactionWithRetry, handleTransactionError } = await import('@/lib/transactions');

          // Build transaction operations
          const operations: any[] = [
            {
              action: 'update',
              databaseId: dbId,
              tableId: attendeesCollectionId,
              rowId: id,
              data: updateData
            }
          ];

          // Add audit log if enabled
          if (await shouldLog('attendeeUpdate')) {
            const { createAttendeeLogDetails } = await import('@/lib/logFormatting');
            operations.push({
              action: 'create',
              databaseId: dbId,
              tableId: logsCollectionId,
              rowId: ID.unique(),
              data: {
                userId: user.$id,
                attendeeId: id,
                action: 'update',
                details: JSON.stringify({
                  ...createAttendeeLogDetails('update', {
                    firstName: updateData.firstName,
                    lastName: updateData.lastName,
                    barcodeNumber: updateData.barcodeNumber
                  }, {
                    changes: changeDetails
                  }),
                  timestamp: new Date().toISOString()
                })
              }
            });
          }

          // Execute transaction with retry logic
          await executeTransactionWithRetry(tablesDB, operations);

          // Fetch the updated attendee to return to client
          finalAttendee = await databases.getDocument(dbId, attendeesCollectionId, id);

          console.log('[Attendee Update] Transaction completed successfully');
        } catch (error: any) {
          console.error('[Attendee Update] Transaction failed:', error);
          const { handleTransactionError } = await import('@/lib/transactions');
          return handleTransactionError(error, res);
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

        // Check if attendee exists and get details BEFORE deletion
        let attendeeToDelete;
        try {
          attendeeToDelete = await databases.getDocument(dbId, attendeesCollectionId, id);
        } catch (error: any) {
          console.error('Error fetching attendee:', error);
          return res.status(404).json({ error: 'Attendee not found', details: error.message });
        }

        if (!attendeeToDelete) {
          return res.status(404).json({ error: 'Attendee not found' });
        }

        // Use transaction-based approach
        console.log('[Attendee Delete] Using transaction-based approach');

        try {
          const { tablesDB } = createSessionClient(req);
          const { executeTransactionWithRetry, handleTransactionError } = await import('@/lib/transactions');

          // Build transaction operations
          const deleteOperations: any[] = [
            {
              action: 'delete',
              databaseId: dbId,
              tableId: attendeesCollectionId,
              rowId: id
            }
          ];

          // Add audit log if enabled
          if (await shouldLog('attendeeDelete')) {
            const { createAttendeeLogDetails } = await import('@/lib/logFormatting');
            deleteOperations.push({
              action: 'create',
              databaseId: dbId,
              tableId: logsCollectionId,
              rowId: ID.unique(),
              data: {
                userId: user.$id,
                action: 'delete',
                details: JSON.stringify({
                  ...createAttendeeLogDetails('delete', {
                    firstName: attendeeToDelete.firstName,
                    lastName: attendeeToDelete.lastName,
                    barcodeNumber: attendeeToDelete.barcodeNumber
                  }),
                  timestamp: new Date().toISOString()
                })
              }
            });
          }

          // Execute transaction with retry logic
          await executeTransactionWithRetry(tablesDB, deleteOperations);

          console.log('[Attendee Delete] Transaction completed successfully');
        } catch (error: any) {
          console.error('[Attendee Delete] Transaction failed:', error);
          const { handleTransactionError } = await import('@/lib/transactions');
          return handleTransactionError(error, res);
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