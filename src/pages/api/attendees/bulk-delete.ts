import { NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';
import { truncateLogDetails } from '@/lib/logTruncation';
import { bulkDeleteWithFallback } from '@/lib/bulkOperations';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;

    // Use session client for validation
    const { databases: sessionDatabases } = createSessionClient(req);

    // Use admin client for bulk deletions with transactions
    const { databases: adminDatabases, tablesDB } = createAdminClient();

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

    // Validate all attendees exist before attempting deletion
    console.log(`[Bulk Delete] Validating ${attendeeIds.length} attendees`);
    const attendeesToDelete: any[] = [];

    try {
      for (const id of attendeeIds) {
        const attendee = await sessionDatabases.getDocument(dbId, attendeesCollectionId, id);
        attendeesToDelete.push({
          id: attendee.$id,
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          barcodeNumber: attendee.barcodeNumber
        });
      }
      console.log(`[Bulk Delete] Validation complete: All ${attendeesToDelete.length} attendees validated successfully`);
    } catch (error: any) {
      // Validation failed - abort before transaction begins
      console.error(`[Bulk Delete] Validation failed:`, error.message);
      return res.status(400).json({
        error: 'Validation failed',
        message: 'One or more attendees could not be found or accessed. No deletions performed.',
        details: error.message
      });
    }

    // Prepare audit log details
    const shouldLogDelete = await shouldLog('attendeeBulkDelete');
    let auditLogDetails = null;

    if (shouldLogDelete) {
      const { createBulkAttendeeLogDetails } = await import('@/lib/logFormatting');
      const attendeeNames = attendeesToDelete.map(a => `${a.firstName} ${a.lastName}`);

      const logDetails = createBulkAttendeeLogDetails('bulk_delete', attendeesToDelete.length, {
        names: attendeeNames,
        totalRequested: attendeeIds.length,
        successCount: attendeesToDelete.length,
        errorCount: 0,
        deletedIds: attendeeIds,
        attendees: attendeesToDelete
      });

      // Truncate log details if needed
      const MAX_DETAILS_LENGTH = 9500;
      const { truncatedDetails } = truncateLogDetails(logDetails, MAX_DETAILS_LENGTH);
      auditLogDetails = truncatedDetails;
    }

    // Execute bulk delete with transactions and fallback
    console.log(`[Bulk Delete] Executing bulk delete with transactions`);
    const result = await bulkDeleteWithFallback(
      tablesDB,
      adminDatabases,
      {
        databaseId: dbId,
        tableId: attendeesCollectionId,
        rowIds: attendeeIds,
        auditLog: shouldLogDelete ? {
          tableId: logsCollectionId,
          userId: user.$id,
          action: 'bulk_delete',
          details: auditLogDetails
        } : {
          tableId: logsCollectionId,
          userId: user.$id,
          action: 'bulk_delete',
          details: JSON.stringify({
            type: 'bulk_delete',
            count: attendeeIds.length,
            timestamp: new Date().toISOString()
          })
        }
      }
    );

    console.log(
      `[Bulk Delete] Complete: ${result.deletedCount} deleted, ` +
      `used transactions: ${result.usedTransactions}` +
      (result.batchCount ? `, batches: ${result.batchCount}` : '')
    );

    // Return success response
    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      deleted: attendeeIds,
      usedTransactions: result.usedTransactions,
      batchCount: result.batchCount,
      message: `Successfully deleted all ${result.deletedCount} attendees` +
        (result.usedTransactions ? ' using transactions' : ' using legacy API') +
        (result.batchCount ? ` in ${result.batchCount} batch(es)` : '')
    });

  } catch (error: any) {
    console.error('[Bulk Delete] Error occurred:', error);

    // Get user info safely (may not be available if error occurred early)
    const userId = req.user?.$id || 'unknown';
    const requestedCount = req.body?.attendeeIds?.length || 0;

    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    } else if (error.code === 409 || error.message?.toLowerCase().includes('conflict')) {
      // Log conflict occurrence for monitoring
      console.warn(
        `[Bulk Delete] Transaction conflict detected for user ${userId}, ` +
        `attempting to delete ${requestedCount} attendees. ` +
        `Retries exhausted.`
      );
      
      return res.status(409).json({
        error: 'Transaction conflict',
        message: 'Data was modified by another user during the delete operation. Please refresh the page and try again.',
        retryable: true,
        type: 'CONFLICT',
        details: {
          attemptedCount: requestedCount,
          userId: userId
        }
      });
    }

    // Log unexpected errors
    console.error(
      `[Bulk Delete] Unexpected error for user ${userId}:`,
      error.message,
      error.stack
    );

    res.status(500).json({ 
      error: 'Failed to delete attendees', 
      message: error.message,
      retryable: false
    });
  }
});