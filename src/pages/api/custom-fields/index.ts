import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { generateInternalFieldName } from '@/util/string';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

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
        const customFieldsResult = await databases.listDocuments(
          dbId,
          customFieldsCollectionId,
          [Query.orderAsc('order'), Query.limit(100)]
        );

        // Generate internal field names on-the-fly for display without persisting them
        const customFields = customFieldsResult.documents.map((field: any) => ({
          ...field,
          internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName as string)
        }));

        return res.status(200).json(customFields);

      case 'POST':
        // Check permissions
        const permissions = userProfile.role ? userProfile.role.permissions : {};
        const hasAdminPermission = permissions?.all === true || permissions?.customFields?.create === true;

        if (!hasAdminPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to create custom fields' });
        }

        const { eventSettingsId, fieldName, fieldType, fieldOptions, required, order } = req.body;

        if (!eventSettingsId || !fieldName || !fieldType) {
          return res.status(400).json({ error: 'Missing required fields' });
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
        const fieldOptionsStr = fieldOptions ? 
          (typeof fieldOptions === 'string' ? fieldOptions : JSON.stringify(fieldOptions)) : 
          null;

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
            order: fieldOrder
          }
        );

        // Log the create action
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