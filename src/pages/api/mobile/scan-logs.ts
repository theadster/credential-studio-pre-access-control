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
  const { databases } = createSessionClient(req);

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
  const scanLogsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_SCAN_LOGS_COLLECTION_ID!;

  try {
    // Validate request body
    const parseResult = scanLogBatchSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.errors.map(e => ({
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
     * PERFORMANCE: Uses batch fetching (100 localIds per query) instead of
     * individual queries to avoid N+1 query problem.
     * 
     * Checks for existing logs with the same localIds to prevent duplicates.
     */
    const localIds = logs.map(log => log.localId);
    const existingLocalIds = new Set<string>();
    
    // Fetch existing logs in batches (Appwrite limit for 'in' queries is 100)
    // This prevents N+1 query problem and dramatically improves performance
    const chunkSize = 100;
    for (let i = 0; i < localIds.length; i += chunkSize) {
      const chunk = localIds.slice(i, i + chunkSize);
      try {
        const existingLogs = await databases.listDocuments(
          dbId,
          scanLogsCollectionId,
          [Query.equal('localId', chunk), Query.limit(chunkSize)]
        );
        existingLogs.documents.forEach((doc: any) => {
          existingLocalIds.add(doc.localId);
        });
      } catch (error) {
        // If collection doesn't exist or query fails, continue without deduplication
        console.warn('[Scan Logs Upload] Deduplication check failed:', error);
      }
    }

    // Process logs
    const errors: Array<{ index: number; localId: string; message: string }> = [];
    let duplicates = 0;
    let received = 0;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      
      // Skip duplicates
      if (existingLocalIds.has(log.localId)) {
        duplicates++;
        continue;
      }

      try {
        await databases.createDocument(
          dbId,
          scanLogsCollectionId,
          ID.unique(),
          {
            localId: log.localId,
            attendeeId: log.attendeeId,
            barcodeScanned: log.barcodeScanned,
            result: log.result,
            denialReason: log.denialReason,
            profileId: log.profileId,
            profileVersion: log.profileVersion,
            deviceId: log.deviceId,
            operatorId: operatorId,
            scannedAt: log.scannedAt,
            uploadedAt: uploadedAt,
          }
        );
        received++;
        // Add to existing set to prevent duplicates within same batch
        existingLocalIds.add(log.localId);
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
