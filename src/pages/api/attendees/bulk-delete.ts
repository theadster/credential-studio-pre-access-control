import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    const { attendeeIds } = req.body;

    if (!attendeeIds || !Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      return res.status(400).json({ error: 'Invalid attendee IDs provided' });
    }

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;

    // Check permissions
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const hasBulkDeletePermission = permissions?.attendees?.bulkDelete === true || permissions?.all === true;

    if (!hasBulkDeletePermission) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions for bulk delete' });
    }

    // Get attendee details for logging before deletion
    const attendeesToDelete: any[] = [];
    for (const id of attendeeIds) {
      try {
        const attendee = await databases.getDocument(dbId, attendeesCollectionId, id);
        attendeesToDelete.push({
          id: attendee.$id,
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          barcodeNumber: attendee.barcodeNumber
        });
      } catch (error) {
        // Attendee might not exist, continue with others
        console.warn(`Attendee ${id} not found`);
      }
    }

    // Delete attendees - Appwrite doesn't support bulk delete, so we do it one by one
    const deleted: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of attendeeIds) {
      try {
        await databases.deleteDocument(dbId, attendeesCollectionId, id);
        deleted.push(id);
      } catch (error: any) {
        errors.push({ id, error: error.message || 'Failed to delete' });
      }
    }

    // Log the bulk delete action
    await databases.createDocument(
      dbId,
      logsCollectionId,
      ID.unique(),
      {
        action: 'delete',
        userId: user.$id,
        details: JSON.stringify({
          type: 'bulk_delete',
          count: deleted.length,
          attendees: attendeesToDelete
        })
      }
    );

    res.status(200).json({ 
      success: true, 
      deletedCount: deleted.length,
      deleted,
      errors,
      message: `Successfully deleted ${deleted.length} attendees`
    });

  } catch (error: any) {
    console.error('Bulk delete error:', error);
    
    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete attendees' });
  }
});