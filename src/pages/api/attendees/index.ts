import { NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { search, equal, isNull, isNotNull, orderDesc } from '@/lib/appwriteQueries';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

const buildTextFilter = (filterString: string | string[] | undefined): string[] | null => {
  if (!filterString || typeof filterString !== 'string') return null;

  try {
    const filter = JSON.parse(filterString);
    const { value, operator } = filter;

    if (operator === 'isEmpty') {
      return [equal('', '')]; // Will be handled specially
    }
    if (operator === 'isNotEmpty') {
      return null; // Will be handled specially
    }
    if (!value) return null;

    // Appwrite doesn't support case-insensitive queries directly
    // We'll use search for contains, and exact match for others
    switch (operator) {
      case 'contains':
        return [search('', value)]; // Field will be set by caller
      case 'equals':
        return [equal('', value)]; // Field will be set by caller
      case 'startsWith':
        return [search('', value)]; // Appwrite search can handle prefix matching
      case 'endsWith':
        return [search('', value)]; // Appwrite search will do best effort
      default:
        return null;
    }
  } catch (e) {
    // Fallback for simple string filter - use search
    return [search('', filterString as string)];
  }
};

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

        // Fetch attendees
        const attendeesResult = await databases.listDocuments(
          dbId,
          attendeesCollectionId,
          queries
        );

        let attendees = attendeesResult.documents.map((attendee: any) => {
          // Parse customFieldValues from JSON string to object
          let parsedCustomFieldValues = [];
          if (attendee.customFieldValues) {
            const parsed = typeof attendee.customFieldValues === 'string' 
              ? JSON.parse(attendee.customFieldValues) 
              : attendee.customFieldValues;
            
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

        // Log the view action if enabled
        try {
          const logSettingsDocs = await databases.listDocuments(dbId, logSettingsCollectionId);
          const logSettings = logSettingsDocs.documents[0];
          
          if (logSettings && logSettings.systemViewAttendeeList !== false) {
            await databases.createDocument(
              dbId,
              logsCollectionId,
              ID.unique(),
              {
                userId: user.$id,
                action: 'view',
                details: JSON.stringify({ type: 'attendees_list', count: attendees.length })
              }
            );
          }
        } catch (logError) {
          console.error('Error logging view action:', logError);
          // Don't fail the request if logging fails
        }

        return res.status(200).json(attendees);

      case 'POST':
        // Check permissions using role from middleware
        const createPermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasCreatePermission = createPermissions?.attendees?.create === true || createPermissions?.all === true;

        if (!hasCreatePermission) {
          return res.status(403).json({ error: 'Insufficient permissions to create attendees' });
        }

        const { firstName, lastName, barcodeNumber, photoUrl, customFieldValues } = req.body;

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
        const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
        
        if (customFieldValues && Array.isArray(customFieldValues) && customFieldValues.length > 0) {
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
            photoUrl: photoUrl || null,
            customFieldValues: JSON.stringify(customFieldValuesObj)
          }
        );

        // Log the create action
        await databases.createDocument(
          dbId,
          logsCollectionId,
          ID.unique(),
          {
            userId: user.$id,
            attendeeId: newAttendee.$id,
            action: 'create',
            details: JSON.stringify({ 
              type: 'attendee',
              firstName: newAttendee.firstName,
              lastName: newAttendee.lastName,
              barcodeNumber: newAttendee.barcodeNumber
            })
          }
        );

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