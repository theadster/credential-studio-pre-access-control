import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid custom field ID' });
    }

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;

    switch (req.method) {
      case 'GET':
        // Fetch custom field
        let customField;
        try {
          customField = await databases.getDocument(dbId, customFieldsCollectionId, id);
        } catch (error) {
          return res.status(404).json({ error: 'Custom field not found' });
        }

        // Note: In Appwrite with denormalized custom field values, we don't have a separate
        // attendeeCustomFieldValues table. The values are stored in the attendee documents.
        // We'll return the custom field without the count for now.
        // If needed, we could query all attendees and count how many have this field.

        return res.status(200).json(customField);

      case 'PUT':
        // Check permissions
        const updatePermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasUpdatePermission = updatePermissions?.all === true || updatePermissions?.customFields?.update === true;

        if (!hasUpdatePermission) {
          return res.status(403).json({ error: 'Insufficient permissions to update custom fields' });
        }

        const { fieldName, fieldType, fieldOptions, required, order } = req.body;

        if (!fieldName || !fieldType) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Serialize fieldOptions as JSON string if it's an object
        const fieldOptionsStr = fieldOptions ? 
          (typeof fieldOptions === 'string' ? fieldOptions : JSON.stringify(fieldOptions)) : 
          null;

        const updatedField = await databases.updateDocument(
          dbId,
          customFieldsCollectionId,
          id,
          {
            fieldName,
            fieldType,
            fieldOptions: fieldOptionsStr,
            required: required || false,
            order: order || 1
          }
        );

        // Log the update action
        await databases.createDocument(
          dbId,
          logsCollectionId,
          ID.unique(),
          {
            userId: user.$id,
            action: 'update',
            details: JSON.stringify({ 
              type: 'custom_field',
              fieldId: id,
              fieldName: updatedField.fieldName,
              fieldType: updatedField.fieldType
            })
          }
        );

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
          fieldToDelete = await databases.getDocument(dbId, customFieldsCollectionId, id);
        } catch (error) {
          return res.status(404).json({ error: 'Custom field not found' });
        }

        // Note: With denormalized custom field values in Appwrite, we don't automatically
        // cascade delete the values from attendee documents. The values will remain in the
        // attendee's customFieldValues JSON but won't be displayed since the field definition
        // is gone. This is acceptable for this use case.
        
        // Optionally, we could query all attendees and remove this field from their
        // customFieldValues JSON, but that would be expensive for large datasets.
        // For now, we'll just delete the custom field definition.

        // Delete the custom field
        await databases.deleteDocument(dbId, customFieldsCollectionId, id);

        // Log the delete action
        await databases.createDocument(
          dbId,
          logsCollectionId,
          ID.unique(),
          {
            userId: user.$id,
            action: 'delete',
            details: JSON.stringify({ 
              type: 'custom_field',
              fieldId: id,
              fieldName: fieldToDelete.fieldName,
              fieldType: fieldToDelete.fieldType
            })
          }
        );

        return res.status(200).json({ 
          success: true, 
          message: 'Custom field deleted successfully'
        });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
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