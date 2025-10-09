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

    // PHASE 1: Validate all attendees exist and collect their details
    console.log(`[Bulk Delete] Phase 1: Validating ${attendeeIds.length} attendees`);
    const attendeesToDelete: any[] = [];
    const validationErrors: Array<{ id: string; error: string }> = [];

    for (const id of attendeeIds) {
      try {
        const attendee = await databases.getDocument(dbId, attendeesCollectionId, id);
        attendeesToDelete.push({
          id: attendee.$id,
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          barcodeNumber: attendee.barcodeNumber
        });
      } catch (error: any) {
        const errorMessage = error.message || 'Attendee not found or inaccessible';
        validationErrors.push({ id, error: errorMessage });
        console.warn(`[Bulk Delete] Validation failed for attendee ${id}: ${errorMessage}`);
      }
    }

    // If any validation errors, abort the entire operation
    if (validationErrors.length > 0) {
      console.error(`[Bulk Delete] Validation failed for ${validationErrors.length} attendees. Aborting operation.`);
      return res.status(400).json({
        error: 'Validation failed: Some attendees could not be found or accessed',
        validationErrors,
        message: `${validationErrors.length} of ${attendeeIds.length} attendees failed validation. No deletions performed.`
      });
    }

    console.log(`[Bulk Delete] Phase 1 complete: All ${attendeesToDelete.length} attendees validated successfully`);

    // PHASE 2: Perform deletions (all attendees validated)
    console.log(`[Bulk Delete] Phase 2: Deleting ${attendeesToDelete.length} attendees`);
    const deleted: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const attendee of attendeesToDelete) {
      try {
        await databases.deleteDocument(dbId, attendeesCollectionId, attendee.id);
        deleted.push(attendee.id);
        console.log(`[Bulk Delete] Successfully deleted attendee ${attendee.id}`);
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to delete';
        errors.push({ id: attendee.id, error: errorMessage });
        console.error(`[Bulk Delete] Failed to delete attendee ${attendee.id}: ${errorMessage}`);
      }
    }

    console.log(`[Bulk Delete] Phase 2 complete: ${deleted.length} deleted, ${errors.length} errors`);

    // Log the bulk delete action with detailed results
    await databases.createDocument(
      dbId,
      logsCollectionId,
      ID.unique(),
      {
        action: 'delete',
        userId: user.$id,
        details: JSON.stringify({
          type: 'bulk_delete',
          totalRequested: attendeeIds.length,
          successCount: deleted.length,
          errorCount: errors.length,
          deletedIds: deleted,
          errors: errors,
          attendees: attendeesToDelete
        })
      }
    );

    res.status(200).json({
      success: errors.length === 0,
      partial: errors.length > 0 && deleted.length > 0,
      deletedCount: deleted.length,
      deleted,
      errors,
      message: errors.length > 0
        ? `Deleted ${deleted.length} of ${attendeeIds.length} attendees. ${errors.length} failed.`
        : `Successfully deleted all ${deleted.length} attendees`
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