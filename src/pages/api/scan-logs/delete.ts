/**
 * Scan Logs Delete API
 * 
 * DELETE /api/scan-logs/delete
 * 
 * Deletes scan logs based on filter criteria.
 * Supports filtering by date, result, profile, operator, and device.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 */

import { NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { hasPermission } from '@/lib/permissions';
import { shouldLog } from '@/lib/logSettings';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ 
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} not allowed` }
    });
  }

  const { user, userProfile } = req;

  // Check permissions - need scan logs delete permission
  const permissions = userProfile.role ? userProfile.role.permissions : {};
  const hasDeletePermission = permissions?.scanLogs?.delete === true || 
                              permissions?.logs?.delete === true ||
                              permissions?.all === true;

  if (!hasDeletePermission) {
    return res.status(403).json({ 
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions to delete scan logs' }
    });
  }

  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const scanLogsTableId = process.env.NEXT_PUBLIC_APPWRITE_SCAN_LOGS_TABLE_ID!;

  try {
    const { beforeDate, result, profileId, operatorId, deviceId } = req.body;

    // Build queries array based on provided filters
    const queries: string[] = [];

    if (beforeDate) {
      // Validate date input before using it
      const parsedDate = new Date(beforeDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_DATE', message: `Invalid date format for beforeDate: ${beforeDate}` }
        });
      }
      queries.push(Query.lessThan('scannedAt', parsedDate.toISOString()));
    }

    if (result && (result === 'approved' || result === 'denied')) {
      queries.push(Query.equal('result', result));
    }

    if (profileId) {
      queries.push(Query.equal('profileId', profileId));
    }

    if (operatorId) {
      queries.push(Query.equal('operatorId', operatorId));
    }

    if (deviceId) {
      queries.push(Query.equal('deviceId', deviceId));
    }

    // Create admin client for bulk deletions (no rate limits)
    const adminClient = createAdminClient();
    const adminTablesDB = adminClient.tablesDB;

    // First, get a count of logs to be deleted
    const countResponse = await adminTablesDB.listRows({
      databaseId: dbId,
      tableId: scanLogsTableId,
      queries: [...queries, Query.limit(1)]
    });
    const totalToDelete = countResponse.total;
    
    console.log(`[Delete Scan Logs] Found ${totalToDelete} scan logs matching criteria`);

    // Process and delete logs in batches
    let deletedCount = 0;
    let totalProcessed = 0;
    const errors: any[] = [];
    const batchSize = 25;
    const delayBetweenDeletions = 100;

    while (true) {
      const batchQueries = [...queries, Query.limit(batchSize)];
      const logsResponse = await adminTablesDB.listRows({
        databaseId: dbId,
        tableId: scanLogsTableId,
        queries: batchQueries
      });

      const currentBatch = logsResponse.rows;

      if (currentBatch.length === 0) {
        break;
      }

      totalProcessed += currentBatch.length;

      // Delete documents one at a time with delay
      for (const log of currentBatch) {
        let deleted = false;
        let lastError: any = null;
        let wasRateLimited = false;
        const maxRetries = 2;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            await adminTablesDB.deleteRow({
              databaseId: dbId,
              tableId: scanLogsTableId,
              rowId: log.$id
            });
            deletedCount++;
            deleted = true;
            break;
          } catch (error: any) {
            lastError = error;
            console.error(`Error deleting scan log ${log.$id} (attempt ${attempt + 1}/${maxRetries}):`, error);
            
            if (error.code === 429) {
              wasRateLimited = true;
              console.log('Rate limit detected, waiting 3 seconds before retry...');
              await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
              // Non-rate-limit errors should not be retried
              break;
            }
          }
        }

        // Only record error if all retries failed
        if (!deleted && lastError) {
          errors.push({
            id: log.$id,
            error: lastError.message,
            ...(wasRateLimited && { rateLimited: true })
          });
        }

        await new Promise(resolve => setTimeout(resolve, delayBetweenDeletions));
      }

      if (currentBatch.length < batchSize) {
        break;
      }

      console.log(`Processed batch. Total: ${totalProcessed}. Continuing...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Log this deletion activity
    try {
      if (await shouldLog('logsDelete')) {
        await adminTablesDB.createRow(
          dbId,
          process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!,
          ID.unique(),
          {
            action: 'delete_scan_logs',
            userId: user.$id,
            attendeeId: null,
            details: JSON.stringify({
              type: 'scan_logs_deletion',
              deletedCount,
              totalProcessed,
              filters: { beforeDate, result, profileId, operatorId, deviceId },
              errorCount: errors.length
            })
          }
        );
      }
    } catch (logError: any) {
      console.error('Failed to log scan logs deletion:', logError);
    }

    return res.status(200).json({
      success: true,
      deletedCount,
      totalProcessed,
      totalToDelete,
      message: `Successfully deleted ${deletedCount} of ${totalToDelete} scan log entries`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('[Delete Scan Logs] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete scan logs',
        ...(process.env.NODE_ENV !== 'production' && { details: error.message })
      }
    });
  }
});
