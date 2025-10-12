import { NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';
import { truncateLogDetails } from '@/lib/logTruncation';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;

    // Use session client for validation
    const { databases: sessionDatabases } = createSessionClient(req);

    // Use admin client for bulk deletions to avoid rate limiting
    const { databases: adminDatabases } = createAdminClient();

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
    // Use session client for validation to ensure user has access
    console.log(`[Bulk Delete] Phase 1: Validating ${attendeeIds.length} attendees`);
    const attendeesToDelete: any[] = [];
    const validationErrors: Array<{ id: string; error: string }> = [];

    for (const id of attendeeIds) {
      try {
        const attendee = await sessionDatabases.getDocument(dbId, attendeesCollectionId, id);
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
    // Use admin client for deletions to avoid rate limiting
    console.log(`[Bulk Delete] Phase 2: Deleting ${attendeesToDelete.length} attendees using admin client`);
    const deleted: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];
    const delayBetweenDeletions = 50; // 50ms delay between deletions (20 per second)

    for (const attendee of attendeesToDelete) {
      try {
        await adminDatabases.deleteDocument(dbId, attendeesCollectionId, attendee.id);
        deleted.push(attendee.id);
        console.log(`[Bulk Delete] Successfully deleted attendee ${attendee.id}`);

        // Small delay to avoid overwhelming the API
        if (deleted.length < attendeesToDelete.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenDeletions));
        }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to delete';
        errors.push({ id: attendee.id, error: errorMessage });
        console.error(`[Bulk Delete] Failed to delete attendee ${attendee.id}: ${errorMessage}`);

        // If rate limited, wait longer before continuing
        if (error.code === 429) {
          console.log('[Bulk Delete] Rate limit detected, waiting 2 seconds before continuing...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    console.log(`[Bulk Delete] Phase 2 complete: ${deleted.length} deleted, ${errors.length} errors`);

    // Log the bulk delete action with detailed results if enabled
    // Use admin client for logging to avoid rate limiting
    if (await shouldLog('attendeeBulkDelete')) {
      try {
        const { createBulkAttendeeLogDetails } = await import('@/lib/logFormatting');
        const attendeeNames = attendeesToDelete.map(a => `${a.firstName} ${a.lastName}`);

        // Create log details with all information
        const logDetails = createBulkAttendeeLogDetails('bulk_delete', deleted.length, {
          names: attendeeNames,
          totalRequested: attendeeIds.length,
          successCount: deleted.length,
          errorCount: errors.length,
          deletedIds: deleted,
          ...(errors.length > 0 && { errors }),
          attendees: attendeesToDelete
        });

        // Truncate log details if needed to fit within Appwrite's 10,000 character limit
        const MAX_DETAILS_LENGTH = 9500; // Leave some buffer
        const { truncatedDetails } = truncateLogDetails(logDetails, MAX_DETAILS_LENGTH);

        await adminDatabases.createDocument(
          dbId,
          logsCollectionId,
          ID.unique(),
          {
            action: 'bulk_delete',
            userId: user.$id,
            details: truncatedDetails
          }
        );
      } catch (logError) {
        console.error('[Bulk Delete] Failed to write audit log:', logError);
      }
    }

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