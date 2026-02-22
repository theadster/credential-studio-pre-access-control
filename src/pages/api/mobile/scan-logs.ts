/**
 * Mobile Scan Logs Upload API
 * 
 * POST /api/mobile/scan-logs
 * 
 * Uploads scan log records from mobile devices. Handles batch uploads
 * and implements deduplication using localId to prevent duplicate entries.
 * 
 * @see .kiro/specs/mobile-access-control/design.md - Mobile Integration Guide
 * @see Requirements 10.1, 10.2, 10.5
 */

import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { scanLogBatchSchema, ScanLogUploadResponse } from '@/types/scanLog';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} not allowed` }
    });
  }

  const { user, userProfile } = req;
  const { tablesDB } = createSessionClient(req);

  // Check permissions - scanner operators need scan log write permission
  const permissions = userProfile.role ? userProfile.role.permissions : {};
  const hasWritePermission = permissions?.scanLogs?.write === true || 
                             permissions?.attendees?.read === true || // Scanner operators with attendee read can upload logs
                             permissions?.all === true;

  if (!hasWritePermission) {
    return res.status(403).json({ 
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions to upload scan logs' }
    });
  }

  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const scanLogsTableId = process.env.NEXT_PUBLIC_APPWRITE_SCAN_LOGS_TABLE_ID!;

  try {
    // Validate request body
    const parseResult = scanLogBatchSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.issues.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        }
      });
    }

    const { logs } = parseResult.data;
    const uploadedAt = new Date().toISOString();
    const operatorId = user.$id;

    /**
     * DEDUPLICATION CHECK
     * 
     * Uses composite key (deviceId + localId) to prevent cross-device collisions.
     * Device A and Device B both have localId=1 in their local SQLite DBs, so
     * deduplicating on localId alone would incorrectly drop Device B's records.
     * 
     * PERFORMANCE: Batches queries (100 per request) to avoid N+1 problem.
     */
    const compositeKeys = new Set<string>();
    const makeCompositeKey = (deviceId: string, localId: string) => `${deviceId}::${localId}`;

    // Group logs by deviceId to query per-device in batches
    const logsByDevice = logs.reduce<Record<string, typeof logs>>((acc, log) => {
      if (!acc[log.deviceId]) acc[log.deviceId] = [];
      acc[log.deviceId].push(log);
      return acc;
    }, {});

    const chunkSize = 100;
    for (const [deviceId, deviceLogs] of Object.entries(logsByDevice)) {
      const localIds = deviceLogs.map(l => l.localId);
      for (let i = 0; i < localIds.length; i += chunkSize) {
        const chunk = localIds.slice(i, i + chunkSize);
        try {
          const existingLogs = await tablesDB.listRows({
            databaseId: dbId,
            tableId: scanLogsTableId,
            queries: [
              Query.equal('deviceId', deviceId),
              Query.equal('localId', chunk),
              Query.limit(chunkSize),
            ],
          });
          existingLogs.rows.forEach((row: any) => {
            compositeKeys.add(makeCompositeKey(row.deviceId, row.localId));
          });
        } catch (error) {
          console.warn('[Scan Logs Upload] Deduplication check failed:', error);
        }
      }
    }

    // Process logs
    const errors: Array<{ index: number; localId: string; message: string }> = [];
    let duplicates = 0;
    let received = 0;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const compositeKey = makeCompositeKey(log.deviceId, log.localId);

      // Skip duplicates (composite deviceId + localId)
      if (compositeKeys.has(compositeKey)) {
        duplicates++;
        continue;
      }

      try {
        await tablesDB.createRow({
          databaseId: dbId,
          tableId: scanLogsTableId,
          rowId: ID.unique(),
          data: {
            localId: log.localId,
            attendeeId: log.attendeeId ?? null,
            barcodeScanned: log.barcodeScanned,
            result: log.result,
            denialReason: log.denialReason ?? null,
            profileId: log.profileId ?? null,
            profileVersion: log.profileVersion ?? null,
            deviceId: log.deviceId,
            operatorId: operatorId,
            scannedAt: log.scannedAt,
            uploadedAt: uploadedAt,
            attendeeFirstName: log.attendeeFirstName ?? null,
            attendeeLastName: log.attendeeLastName ?? null,
            attendeePhotoUrl: log.attendeePhotoUrl ?? null,
          },
        });
        received++;
        // Track within-batch duplicates
        compositeKeys.add(compositeKey);
      } catch (error: any) {
        errors.push({
          index: i,
          localId: log.localId,
          message: error.message || 'Failed to create log entry'
        });
      }
    }

    const response: ScanLogUploadResponse = {
      success: true,
      data: {
        received,
        duplicates,
        errors
      }
    };

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('[Mobile Scan Logs Upload] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to upload scan logs',
        ...(process.env.NODE_ENV !== 'production' && { details: error.message })
      }
    });
  }
});
