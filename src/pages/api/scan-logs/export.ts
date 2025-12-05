/**
 * Scan Logs Export API
 * 
 * POST /api/scan-logs/export
 * 
 * Exports scan logs to CSV format with customizable fields and filters.
 * 
 * Request Body:
 * - fields: Array of field names to include in export
 * - filters: Optional filters (deviceId, operatorId, result, dateFrom, dateTo, etc.)
 * - timezone: Timezone for date formatting (default: UTC)
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 10.4
 */

import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';

// Configurable maximum records to prevent memory exhaustion
const MAX_RECORDS = parseInt(process.env.EXPORT_MAX_RECORDS || '5000', 10);

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

  // Check permissions - need scan logs export permission
  const permissions = userProfile.role ? userProfile.role.permissions : {};
  const hasExportPermission = permissions?.scanLogs?.export === true || 
                              permissions?.scanLogs?.read === true ||
                              permissions?.logs?.read === true ||
                              permissions?.all === true;

  if (!hasExportPermission) {
    return res.status(403).json({ 
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions to export scan logs' }
    });
  }

  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const scanLogsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_SCAN_LOGS_COLLECTION_ID!;
  const usersCollectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;
  const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
  const profilesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_APPROVAL_PROFILES_COLLECTION_ID!;

  try {
    const { fields, filters, timezone = 'UTC' } = req.body;

    // Validate fields
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Fields selection is required' }
      });
    }

    // Build queries based on filters
    const queries: string[] = [];

    if (filters) {
      if (filters.deviceId) {
        queries.push(Query.equal('deviceId', filters.deviceId));
      }
      if (filters.operatorId) {
        queries.push(Query.equal('operatorId', filters.operatorId));
      }
      if (filters.result && (filters.result === 'approved' || filters.result === 'denied')) {
        queries.push(Query.equal('result', filters.result));
      }
      if (filters.profileId) {
        queries.push(Query.equal('profileId', filters.profileId));
      }
      if (filters.attendeeId) {
        queries.push(Query.equal('attendeeId', filters.attendeeId));
      }
      if (filters.dateFrom) {
        try {
          const fromDate = new Date(filters.dateFrom);
          if (!isNaN(fromDate.getTime())) {
            queries.push(Query.greaterThanEqual('scannedAt', fromDate.toISOString()));
          }
        } catch (e) { /* skip invalid date */ }
      }
      if (filters.dateTo) {
        try {
          const toDate = new Date(filters.dateTo);
          if (!isNaN(toDate.getTime())) {
            toDate.setDate(toDate.getDate() + 1);
            queries.push(Query.lessThan('scannedAt', toDate.toISOString()));
          }
        } catch (e) { /* skip invalid date */ }
      }
    }

    // Add sorting
    queries.push(Query.orderDesc('scannedAt'));

    // Fetch all logs in batches with cap to prevent memory exhaustion
    let allLogs: any[] = [];
    let hasMore = true;
    let offset = 0;
    let totalFetched = 0;
    const batchSize = 100;
    let isCapped = false;

    while (hasMore && totalFetched < MAX_RECORDS) {
      const batchQueries = [...queries, Query.limit(batchSize), Query.offset(offset)];
      const logsResponse = await databases.listDocuments(
        dbId,
        scanLogsCollectionId,
        batchQueries
      );

      const remainingCapacity = MAX_RECORDS - totalFetched;
      const logsToAdd = logsResponse.documents.slice(0, remainingCapacity);
      
      allLogs = allLogs.concat(logsToAdd);
      totalFetched += logsToAdd.length;

      // Check if we've hit the cap
      if (logsToAdd.length < logsResponse.documents.length || totalFetched >= MAX_RECORDS) {
        hasMore = false;
        isCapped = totalFetched >= MAX_RECORDS && logsResponse.documents.length >= batchSize;
      } else if (logsResponse.documents.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }
    }

    // Collect unique IDs for related data lookup
    const operatorIds = [...new Set(allLogs.map(log => log.operatorId).filter(Boolean))];
    const attendeeIds = [...new Set(allLogs.map(log => log.attendeeId).filter(Boolean))];
    const profileIds = [...new Set(allLogs.map(log => log.profileId).filter(Boolean))];

    // Fetch related data
    const operatorMap = new Map<string, { name: string; email: string }>();
    const attendeeMap = new Map<string, { firstName: string; lastName: string }>();
    const profileMap = new Map<string, { name: string }>();

    // Fetch operators
    if (operatorIds.length > 0) {
      for (let i = 0; i < operatorIds.length; i += 100) {
        const chunk = operatorIds.slice(i, i + 100);
        try {
          const usersResult = await databases.listDocuments(
            dbId,
            usersCollectionId,
            [Query.equal('userId', chunk), Query.limit(100)]
          );
          usersResult.documents.forEach((doc: any) => {
            operatorMap.set(doc.userId, { name: doc.name, email: doc.email });
          });
        } catch (e) { /* skip if fetch fails */ }
      }
    }

    // Fetch attendees
    if (attendeeIds.length > 0) {
      for (let i = 0; i < attendeeIds.length; i += 100) {
        const chunk = attendeeIds.slice(i, i + 100);
        try {
          const attendeesResult = await databases.listDocuments(
            dbId,
            attendeesCollectionId,
            [Query.equal('$id', chunk), Query.limit(100)]
          );
          attendeesResult.documents.forEach((doc: any) => {
            attendeeMap.set(doc.$id, { firstName: doc.firstName, lastName: doc.lastName });
          });
        } catch (e) { /* skip if fetch fails */ }
      }
    }

    // Fetch profiles
    if (profileIds.length > 0) {
      for (let i = 0; i < profileIds.length; i += 100) {
        const chunk = profileIds.slice(i, i + 100);
        try {
          const profilesResult = await databases.listDocuments(
            dbId,
            profilesCollectionId,
            [Query.equal('$id', chunk), Query.limit(100)]
          );
          profilesResult.documents.forEach((doc: any) => {
            profileMap.set(doc.$id, { name: doc.name });
          });
        } catch (e) { /* skip if fetch fails */ }
      }
    }

    // Define field mappings
    const fieldMappings: Record<string, { header: string; extract: (log: any) => string }> = {
      scannedAt: {
        header: 'Scanned At',
        extract: (log) => {
          try {
            return new Date(log.scannedAt).toLocaleString('en-US', {
              timeZone: timezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
          } catch {
            return log.scannedAt || '';
          }
        }
      },
      barcodeScanned: {
        header: 'Barcode',
        extract: (log) => log.barcodeScanned || ''
      },
      result: {
        header: 'Result',
        extract: (log) => log.result || ''
      },
      denialReason: {
        header: 'Denial Reason',
        extract: (log) => log.denialReason || ''
      },
      attendeeName: {
        header: 'Attendee Name',
        extract: (log) => {
          const attendee = attendeeMap.get(log.attendeeId);
          return attendee ? `${attendee.firstName} ${attendee.lastName}` : '';
        }
      },
      attendeeId: {
        header: 'Attendee ID',
        extract: (log) => log.attendeeId || ''
      },
      profileName: {
        header: 'Profile Name',
        extract: (log) => {
          const profile = profileMap.get(log.profileId);
          return profile ? profile.name : '';
        }
      },
      profileId: {
        header: 'Profile ID',
        extract: (log) => log.profileId || ''
      },
      profileVersion: {
        header: 'Profile Version',
        extract: (log) => log.profileVersion?.toString() || ''
      },
      deviceId: {
        header: 'Device ID',
        extract: (log) => log.deviceId || ''
      },
      operatorName: {
        header: 'Operator Name',
        extract: (log) => {
          const operator = operatorMap.get(log.operatorId);
          return operator ? operator.name : '';
        }
      },
      operatorId: {
        header: 'Operator ID',
        extract: (log) => log.operatorId || ''
      },
    };

    // Generate CSV headers
    const headers = fields.map((field: string) => fieldMappings[field]?.header || field);

    // Generate CSV rows
    const rows = allLogs.map(log =>
      fields.map((field: string) => {
        const mapping = fieldMappings[field];
        if (mapping) {
          const value = mapping.extract(log);
          // Escape CSV values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }
        return '';
      })
    );

    // Log the export action
    if (await shouldLog('scanLogsExport')) {
      try {
        await databases.createDocument(
          dbId,
          process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
          ID.unique(),
          {
            userId: user.$id,
            attendeeId: null,
            action: 'export',
            details: JSON.stringify({
              type: 'scan_logs',
              recordCount: allLogs.length,
              fields: fields.length,
              filters: filters || {},
              capped: isCapped,
              maxRecords: MAX_RECORDS
            })
          }
        );
      } catch (e) { /* skip if logging fails */ }
    }

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map((row: string[]) => row.join(','))].join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="scan-logs-export.csv"');
    
    // Indicate if export is partial due to cap
    if (isCapped) {
      res.setHeader('X-Export-Capped', 'true');
      res.setHeader('X-Export-Max-Records', MAX_RECORDS.toString());
    }

    return res.status(200).send(csvContent);

  } catch (error: any) {
    console.error('[Scan Logs Export] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to export scan logs',
        ...(process.env.NODE_ENV !== 'production' && { details: error.message })
      }
    });
  }
});
