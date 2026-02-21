/**
 * Scan Logs Viewer API
 * 
 * GET /api/scan-logs
 * 
 * Lists scan logs with filtering and pagination support.
 * Separate from system logs for dedicated scanner activity viewing.
 * 
 * Query Parameters:
 * - deviceId: Filter by device ID
 * - operatorId: Filter by operator ID
 * - result: Filter by result (approved/denied)
 * - profileId: Filter by profile ID
 * - dateFrom: Filter by date range start (ISO 8601)
 * - dateTo: Filter by date range end (ISO 8601)
 * - attendeeId: Filter by attendee ID
 * - limit: Max records to return (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 10.3
 */

import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { ScanLogFilters } from '@/types/scanLog';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ 
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} not allowed` }
    });
  }

  const { userProfile } = req;
  const { tablesDB } = createSessionClient(req);

  // Check permissions - need scan logs read permission
  const permissions = userProfile.role ? userProfile.role.permissions : {};
  const hasReadPermission = permissions?.scanLogs?.read === true || 
                            permissions?.logs?.read === true ||
                            permissions?.all === true;

  if (!hasReadPermission) {
    return res.status(403).json({ 
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions to view scan logs' }
    });
  }

  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const scanLogsTableId = process.env.NEXT_PUBLIC_APPWRITE_SCAN_LOGS_TABLE_ID!;

  try {
    // Parse query parameters
    const {
      deviceId,
      operatorId,
      result,
      profileId,
      dateFrom,
      dateTo,
      attendeeId,
      limit: limitParam,
      offset: offsetParam,
    } = req.query as Record<string, string | undefined>;

    // Parse and validate pagination parameters
    const parsedLimit = parseInt(limitParam || '50');
    const parsedOffset = parseInt(offsetParam || '0');
    
    const limit = Math.max(1, Math.min(!isNaN(parsedLimit) ? parsedLimit : 50, 100));
    const offset = Math.max(0, !isNaN(parsedOffset) ? parsedOffset : 0);

    // Build queries
    const queries: string[] = [];

    // Apply filters
    if (deviceId) {
      queries.push(Query.equal('deviceId', deviceId));
    }
    if (operatorId) {
      queries.push(Query.equal('operatorId', operatorId));
    }
    if (result && (result === 'approved' || result === 'denied')) {
      queries.push(Query.equal('result', result));
    }
    if (profileId) {
      queries.push(Query.equal('profileId', profileId));
    }
    if (attendeeId) {
      queries.push(Query.equal('attendeeId', attendeeId));
    }
    if (dateFrom) {
      try {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          queries.push(Query.greaterThanEqual('scannedAt', fromDate.toISOString()));
        }
      } catch (e) {
        // Invalid date, skip filter
      }
    }
    if (dateTo) {
      try {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          // Add one day to include the entire end date
          toDate.setDate(toDate.getDate() + 1);
          queries.push(Query.lessThan('scannedAt', toDate.toISOString()));
        }
      } catch (e) {
        // Invalid date, skip filter
      }
    }

    // Add pagination and sorting
    queries.push(Query.limit(limit));
    queries.push(Query.offset(offset));
    queries.push(Query.orderDesc('scannedAt'));

    // Fetch scan logs
    const logsResult = await tablesDB.listRows(
      dbId,
      scanLogsTableId,
      queries
    );

    // Map logs to response format
    const logs = logsResult.rows.map((doc: any) => ({
      id: doc.$id,
      localId: doc.localId,
      attendeeId: doc.attendeeId,
      barcodeScanned: doc.barcodeScanned,
      result: doc.result,
      denialReason: doc.denialReason,
      profileId: doc.profileId,
      profileVersion: doc.profileVersion,
      deviceId: doc.deviceId,
      operatorId: doc.operatorId,
      scannedAt: doc.scannedAt,
      uploadedAt: doc.uploadedAt,
      createdAt: doc.$createdAt,
    }));

    // Calculate pagination metadata
    const hasMore = offset + logs.length < logsResult.total;

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total: logsResult.total,
          limit,
          offset,
          hasMore
        }
      }
    });

  } catch (error: any) {
    console.error('[Scan Logs List] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch scan logs',
        ...(process.env.NODE_ENV !== 'production' && { details: error.message })
      }
    });
  }
});
