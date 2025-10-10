import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { generateInternalFieldName } from '@/util/string';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
    const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;

    switch (req.method) {
      case 'GET':
        // Fetch custom fields ordered by order field
        // Filter out soft-deleted fields (where deletedAt is not null)
        const customFieldsResult = await databases.listDocuments(
          dbId,
          customFieldsCollectionId,
          [
            Query.isNull('deletedAt'),  // Only return non-deleted fields
            Query.orderAsc('order'),
            Query.limit(100)
          ]
        );

        // Generate internal field names on-the-fly for display without persisting them
        const customFields = customFieldsResult.documents.map((field: any) => ({
          ...field,
          internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName as string)
        }));

        return res.status(200).json(customFields);

      case 'POST':
        /**
         * CREATE CUSTOM FIELD ENDPOINT
         * 
         * Creates a new custom field for the event.
         * 
         * Request Body:
         * - eventSettingsId: string (required) - ID of the event settings document
         * - fieldName: string (required) - Display name of the field
         * - fieldType: string (required) - Type of field (text, number, select, etc.)
         * - fieldOptions: object (optional) - Configuration options for the field
         * - required: boolean (optional) - Whether the field is required (default: false)
         * - order: number (optional) - Display order (auto-generated if not provided)
         * - showOnMainPage: boolean (optional) - Visibility on main page (default: true)
         * 
         * Visibility Control:
         * - showOnMainPage defaults to true (visible) for new fields
         * - When true, field appears as a column in the main attendees table
         * - When false, field is hidden from main page but visible in edit/create forms
         * - This allows admins to declutter the main page while keeping all fields accessible
         */
        // Check permissions
        const permissions = userProfile.role ? userProfile.role.permissions : {};
        const hasAdminPermission = permissions?.all === true || permissions?.customFields?.create === true;

        if (!hasAdminPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to create custom fields' });
        }

        const { eventSettingsId, fieldName, fieldType, fieldOptions, required, order, showOnMainPage } = req.body;

        if (!eventSettingsId || !fieldName || !fieldType) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate showOnMainPage is boolean if provided
        // This ensures data integrity and prevents type coercion issues
        if (showOnMainPage !== undefined && typeof showOnMainPage !== 'boolean') {
          return res.status(400).json({
            error: 'Invalid showOnMainPage value',
            details: 'showOnMainPage must be a boolean value'
          });
        }

        // Check if event settings exist
        try {
          await databases.getDocument(dbId, eventSettingsCollectionId, eventSettingsId);
        } catch (error) {
          return res.status(404).json({ error: 'Event settings not found' });
        }

        // Get the next order number if not provided
        let fieldOrder = order;
        if (!fieldOrder) {
          const lastFieldResult = await databases.listDocuments(
            dbId,
            customFieldsCollectionId,
            [
              Query.equal('eventSettingsId', eventSettingsId),
              Query.orderDesc('order'),
              Query.limit(1)
            ]
          );

          fieldOrder = lastFieldResult.documents.length > 0
            ? (lastFieldResult.documents[0].order as number) + 1
            : 1;
        }

        // Generate internal field name
        const internalFieldName = generateInternalFieldName(fieldName);

        // Serialize fieldOptions as JSON string if it's an object
        let fieldOptionsStr = null;
        if (fieldOptions) {
          if (typeof fieldOptions === 'string') {
            try {
              JSON.parse(fieldOptions); // Validate it's valid JSON
              fieldOptionsStr = fieldOptions;
            } catch {
              return res.status(400).json({ error: 'Invalid JSON in fieldOptions' });
            }
          } else {
            fieldOptionsStr = JSON.stringify(fieldOptions);
          }
        }

        // Create the custom field document
        // showOnMainPage defaults to true if not explicitly set to false
        // This ensures new fields are visible by default, maintaining backward compatibility
        const newCustomField = await databases.createDocument(
          dbId,
          customFieldsCollectionId,
          ID.unique(),
          {
            eventSettingsId,
            fieldName,
            internalFieldName,
            fieldType,
            fieldOptions: fieldOptionsStr,
            required: required || false,
            order: fieldOrder,
            showOnMainPage: showOnMainPage !== undefined ? showOnMainPage : true, // Default to visible
            version: 0
          }
        );

        // Log the create action
        // Log the create action if enabled
        if (await shouldLog('customFieldCreate')) {
          try {
            await databases.createDocument(
              dbId,
              logsCollectionId,
              ID.unique(),
              {
                userId: user.$id,
                action: 'create',
                details: JSON.stringify({
                  type: 'custom_field',
                  fieldName: newCustomField.fieldName,
                  fieldType: newCustomField.fieldType
                })
              }
            );
          } catch (logError) {
            console.error('[custom-fields] Failed to create log entry, but continuing with request', {
              error: logError instanceof Error ? logError.message : 'Unknown error',
              errorType: (logError as any)?.type,
              userId: user.$id,
              fieldName: newCustomField.fieldName
            });
            // Do not re-throw - allow the request to succeed even if logging fails
          }
        }

        return res.status(201).json(newCustomField);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('API Error:', error);

    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    } else if (error.code === 409) {
      return res.status(409).json({ error: 'Conflict - resource already exists' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
});