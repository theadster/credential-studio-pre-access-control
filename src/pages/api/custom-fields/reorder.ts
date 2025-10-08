import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    if (req.method !== 'PUT') {
      res.setHeader('Allow', ['PUT']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;

    // Check permissions
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const hasUpdatePermission = permissions?.all === true || permissions?.customFields?.update === true;

    if (!hasUpdatePermission) {
      return res.status(403).json({ error: 'Insufficient permissions to reorder custom fields' });
    }

    const { fieldOrders } = req.body;

    if (!fieldOrders || !Array.isArray(fieldOrders)) {
      return res.status(400).json({ error: 'Invalid field orders data' });
    }

    // Update each field's order
    // Note: Appwrite doesn't support transactions, so we'll update sequentially
    // and handle errors gracefully
    const errors: Array<{ id: string; error: string }> = [];
    const updated: string[] = [];

    for (const { id, order } of fieldOrders) {
      try {
        await databases.updateDocument(
          dbId,
          customFieldsCollectionId,
          id,
          { order }
        );
        updated.push(id);
      } catch (error: any) {
        console.error(`Error updating field ${id}:`, error);
        errors.push({ id, error: error.message || 'Update failed' });
      }
    }

    // Log the reorder action
    await databases.createDocument(
      dbId,
      logsCollectionId,
      ID.unique(),
      {
        userId: user.$id,
        action: 'update',
        details: JSON.stringify({ 
          type: 'custom_fields_reorder',
          fieldCount: fieldOrders.length,
          successCount: updated.length,
          errorCount: errors.length
        })
      }
    );

    // Return success if all updates succeeded, or partial success with errors
    if (errors.length === 0) {
      return res.status(200).json({ success: true });
    } else if (updated.length > 0) {
      return res.status(207).json({ 
        success: true, 
        partialSuccess: true,
        updated,
        errors 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update any fields',
        errors 
      });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
});