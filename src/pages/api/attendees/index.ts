import { NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { search, equal, isNull, isNotNull, orderDesc } from '@/lib/appwriteQueries';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';



export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // User and userProfile are already attached by middleware
  const { user, userProfile } = req;
  const { databases } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const usersCollectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const rolesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
    const logSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID!;

    switch (req.method) {
      case 'GET':
        // Check permissions using role from middleware
        const permissions = userProfile.role ? userProfile.role.permissions : {};
        const hasReadPermission = permissions?.attendees?.read === true || permissions?.all === true;

        if (!hasReadPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to view attendees' });
        }

        const {
          firstName: firstNameFilter,
          lastName: lastNameFilter,
          barcode: barcodeFilter,
          photoFilter,
          customFields: customFieldsJSON,
        } = req.query;

        const queries: string[] = [];

        // Build text filters
        if (firstNameFilter && typeof firstNameFilter === 'string') {
          try {
            const filter = JSON.parse(firstNameFilter);
            const { value, operator } = filter;
            
            if (operator === 'isEmpty') {
              queries.push(Query.equal('firstName', ''));
            } else if (operator === 'isNotEmpty') {
              queries.push(Query.notEqual('firstName', ''));
            } else if (value) {
              if (operator === 'contains' || operator === 'startsWith' || operator === 'endsWith') {
                queries.push(Query.search('firstName', value));
              } else if (operator === 'equals') {
                queries.push(Query.equal('firstName', value));
              }
            }
          } catch (e) {
            // Fallback for simple string filter
            queries.push(Query.search('firstName', firstNameFilter));
          }
        }

        if (lastNameFilter && typeof lastNameFilter === 'string') {
          try {
            const filter = JSON.parse(lastNameFilter);
            const { value, operator } = filter;
            
            if (operator === 'isEmpty') {
              queries.push(Query.equal('lastName', ''));
            } else if (operator === 'isNotEmpty') {
              queries.push(Query.notEqual('lastName', ''));
            } else if (value) {
              if (operator === 'contains' || operator === 'startsWith' || operator === 'endsWith') {
                queries.push(Query.search('lastName', value));
              } else if (operator === 'equals') {
                queries.push(Query.equal('lastName', value));
              }
            }
          } catch (e) {
            queries.push(Query.search('lastName', lastNameFilter));
          }
        }

        if (barcodeFilter && typeof barcodeFilter === 'string') {
          try {
            const filter = JSON.parse(barcodeFilter);
            const { value, operator } = filter;
            
            if (operator === 'isEmpty') {
              queries.push(Query.equal('barcodeNumber', ''));
            } else if (operator === 'isNotEmpty') {
              queries.push(Query.notEqual('barcodeNumber', ''));
            } else if (value) {
              if (operator === 'contains' || operator === 'startsWith' || operator === 'endsWith') {
                queries.push(Query.search('barcodeNumber', value));
              } else if (operator === 'equals') {
                queries.push(Query.equal('barcodeNumber', value));
              }
            }
          } catch (e) {
            queries.push(Query.search('barcodeNumber', barcodeFilter));
          }
        }

        if (photoFilter === 'with') {
          queries.push(Query.isNotNull('photoUrl'));
          queries.push(Query.notEqual('photoUrl', ''));
        }
        if (photoFilter === 'without') {
          // Appwrite doesn't support OR directly, so we'll filter in memory
          // For now, just check for null
          queries.push(Query.isNull('photoUrl'));
        }

        // Note: Custom field filtering is complex with denormalized JSON
        // We'll fetch all attendees and filter in memory for custom fields
        let needsCustomFieldFiltering = false;
        let customFieldFilters: any = {};
        
        if (typeof customFieldsJSON === 'string' && customFieldsJSON) {
          try {
            customFieldFilters = JSON.parse(customFieldsJSON);
            needsCustomFieldFiltering = Object.keys(customFieldFilters).length > 0;
          } catch (e) {
            console.error("Failed to parse customFields JSON:", e);
          }
        }

        // Add ordering
        queries.push(Query.orderDesc('$createdAt'));

        /**
         * VISIBILITY FILTERING LOGIC
         * 
         * This section implements the custom field visibility control feature.
         * 
         * How it works:
         * 1. Fetch all custom fields from the database
         * 2. Filter to only include fields where showOnMainPage !== false
         * 3. Create a Set of visible field IDs for efficient lookup
         * 4. When mapping attendees, filter customFieldValues to only include visible fields
         * 
         * Default Behavior:
         * - Fields with showOnMainPage = true are visible (explicit)
         * - Fields with showOnMainPage = undefined/null are visible (backward compatibility)
         * - Fields with showOnMainPage = false are hidden (explicit)
         * 
         * Why this matters:
         * - Keeps the main attendees table clean and focused
         * - Reduces visual clutter for fields that are rarely needed
         * - All fields remain accessible in edit/create forms
         * - Improves performance by reducing data transferred to client
         */
        // Fetch custom fields to determine visibility
        const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
        const customFieldsResult = await databases.listDocuments(
          dbId,
          customFieldsCollectionId,
          [Query.isNull('deletedAt'), Query.orderAsc('order'), Query.limit(100)]
        );

        // Create set of visible field IDs (for main page view)
        // Default to visible if showOnMainPage is missing (undefined or null)
        // This ensures backward compatibility with existing fields created before this feature
        const visibleFieldIds = new Set(
          customFieldsResult.documents
            .filter((field: any) => field.showOnMainPage !== false) // Only exclude if explicitly false
            .map((field: any) => field.$id)
        );

        // Fetch attendees
        const attendeesResult = await databases.listDocuments(
          dbId,
          attendeesCollectionId,
          queries
        );

        // Map attendees and filter custom field values based on visibility
        let attendees = attendeesResult.documents.map((attendee: any) => {
          /**
           * CUSTOM FIELD VALUE FILTERING
           * 
           * This filters the attendee's custom field values to only include visible fields.
           * 
           * Process:
           * 1. Parse customFieldValues from JSON string to object
           * 2. Filter entries to only include fields in visibleFieldIds Set
           * 3. Convert to array format for frontend consumption
           * 
           * Data Format:
           * - Database stores: { "fieldId1": "value1", "fieldId2": "value2" }
           * - Frontend expects: [{ customFieldId: "fieldId1", value: "value1" }, ...]
           * 
           * Visibility Impact:
           * - Hidden fields (showOnMainPage = false) are excluded from response
           * - This reduces payload size and keeps UI clean
           * - Hidden field values are NOT deleted, just not returned for main page view
           * - Edit/create forms will still fetch and display all fields
           */
          // Parse customFieldValues from JSON string to object
          let parsedCustomFieldValues = [];
          if (attendee.customFieldValues) {
            const parsed = typeof attendee.customFieldValues === 'string' 
              ? JSON.parse(attendee.customFieldValues) 
              : attendee.customFieldValues;
            
            // Convert object format {fieldId: value} to array format [{customFieldId, value}]
            // Filter to only include visible fields (showOnMainPage !== false)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              parsedCustomFieldValues = Object.entries(parsed)
                .filter(([customFieldId]) => visibleFieldIds.has(customFieldId)) // Only include visible fields
                .map(([customFieldId, value]) => ({
                  customFieldId,
                  value: String(value)
                }));
            } else if (Array.isArray(parsed)) {
              // Handle legacy array format (if any exists)
              parsedCustomFieldValues = parsed.filter((cfv: any) => 
                visibleFieldIds.has(cfv.customFieldId)
              );
            }
          }
          
          return {
            ...attendee,
            id: attendee.$id, // Map $id to id for frontend compatibility
            customFieldValues: parsedCustomFieldValues
          };
        });

        // Apply custom field filtering in memory if needed
        if (needsCustomFieldFiltering) {
          attendees = attendees.filter((attendee: any) => {
            const customFieldValues = Array.isArray(attendee.customFieldValues)
              ? attendee.customFieldValues.reduce((acc: any, cfv: any) => {
                  acc[cfv.customFieldId] = cfv.value;
                  return acc;
                }, {})
              : {};

            for (const fieldId in customFieldFilters) {
              const { value, operator } = customFieldFilters[fieldId];
              const fieldValue = customFieldValues[fieldId] || '';

              if (operator === 'isEmpty') {
                if (fieldValue !== '') return false;
              } else if (operator === 'isNotEmpty') {
                if (fieldValue === '') return false;
              } else if (value) {
                const lowerFieldValue = String(fieldValue).toLowerCase();
                const lowerValue = String(value).toLowerCase();

                switch (operator) {
                  case 'contains':
                    if (!lowerFieldValue.includes(lowerValue)) return false;
                    break;
                  case 'equals':
                    if (lowerFieldValue !== lowerValue) return false;
                    break;
                  case 'startsWith':
                    if (!lowerFieldValue.startsWith(lowerValue)) return false;
                    break;
                  case 'endsWith':
                    if (!lowerFieldValue.endsWith(lowerValue)) return false;
                    break;
                  default:
                    if (lowerFieldValue !== lowerValue) return false;
                }
              }
            }
            return true;
          });
        }

        // TODO: Attendee list view logging is currently inoperable
        // Keeping the code structure for future implementation
        // if (await shouldLog('systemViewAttendeeList')) {
        //   // Log view action with deduplication
        // }

        return res.status(200).json(attendees);

      case 'POST':
        // Check permissions using role from middleware
        const createPermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasCreatePermission = createPermissions?.attendees?.create === true || createPermissions?.all === true;

        if (!hasCreatePermission) {
          return res.status(403).json({ error: 'Insufficient permissions to create attendees' });
        }

        const { firstName, lastName, barcodeNumber, notes, photoUrl, customFieldValues } = req.body;

        if (!firstName || !lastName || !barcodeNumber) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if barcode is unique
        const existingAttendeeDocs = await databases.listDocuments(
          dbId,
          attendeesCollectionId,
          [Query.equal('barcodeNumber', barcodeNumber)]
        );

        if (existingAttendeeDocs.documents.length > 0) {
          return res.status(400).json({ error: 'Barcode number already exists' });
        }

        // Validate custom field IDs if provided
        if (customFieldValues && Array.isArray(customFieldValues) && customFieldValues.length > 0) {
          const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
          const customFieldIds = customFieldValues.map((cfv: any) => cfv.customFieldId);
          
          // Fetch custom fields to validate IDs
          const customFieldsDocs = await databases.listDocuments(
            dbId,
            customFieldsCollectionId,
            [Query.limit(100)] // Assuming not more than 100 custom fields
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

        // Filter out empty custom field values and convert to JSON object
        const validCustomFieldValues = customFieldValues?.filter((cfv: any) => 
          cfv.customFieldId && cfv.value !== null && cfv.value !== undefined && cfv.value !== ''
        ) || [];

        // Convert custom field values array to JSON object
        const customFieldValuesObj: { [key: string]: string } = {};
        validCustomFieldValues.forEach((cfv: any) => {
          customFieldValuesObj[cfv.customFieldId] = String(cfv.value);
        });

        // Create attendee document
        const newAttendee = await databases.createDocument(
          dbId,
          attendeesCollectionId,
          ID.unique(),
          {
            firstName,
            lastName,
            barcodeNumber,
            notes: notes || '',
            photoUrl: photoUrl || null,
            customFieldValues: JSON.stringify(customFieldValuesObj)
          }
        );

        // Log the create action if enabled
        if (await shouldLog('attendeeCreate')) {
          const { createAttendeeLogDetails } = await import('@/lib/logFormatting');
          await databases.createDocument(
            dbId,
            logsCollectionId,
            ID.unique(),
            {
              userId: user.$id,
              attendeeId: newAttendee.$id,
              action: 'create',
              details: JSON.stringify(createAttendeeLogDetails('create', {
                firstName: newAttendee.firstName,
                lastName: newAttendee.lastName,
                barcodeNumber: newAttendee.barcodeNumber
              }))
            }
          );
        }

        // Parse and return the new attendee with proper structure
        let parsedCustomFieldValues = [];
        if (newAttendee.customFieldValues) {
          const parsed = typeof newAttendee.customFieldValues === 'string' 
            ? JSON.parse(newAttendee.customFieldValues) 
            : newAttendee.customFieldValues;
          
          // Convert object format {fieldId: value} to array format [{customFieldId, value}]
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            parsedCustomFieldValues = Object.entries(parsed).map(([customFieldId, value]) => ({
              customFieldId,
              value: String(value)
            }));
          } else if (Array.isArray(parsed)) {
            parsedCustomFieldValues = parsed;
          }
        }
        
        const newAttendeeWithParsedFields = {
          ...newAttendee,
          id: newAttendee.$id, // Map $id to id for frontend compatibility
          customFieldValues: parsedCustomFieldValues
        };

        return res.status(201).json(newAttendeeWithParsedFields);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
});