import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Create session client
    const { account, databases } = createSessionClient(req);

    // Verify authentication
    const user = await account.get();

    const { scope, fields, filters, timezone = 'UTC' } = req.body;

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: 'Fields selection is required' });
    }

    // Build queries array based on scope and filters
    const queries: string[] = [];

    if (scope === 'filtered' && filters) {
      // Apply current page filters
      if (filters.action && filters.action !== 'all') {
        queries.push(Query.equal('action', filters.action));
      }
      if (filters.userId && filters.userId !== 'all') {
        queries.push(Query.equal('userId', filters.userId));
      }
    } else if (scope === 'custom' && filters) {
      // Apply custom filters
      if (filters.action && filters.action !== 'all') {
        queries.push(Query.equal('action', filters.action));
      }
      if (filters.userId && filters.userId !== 'all') {
        queries.push(Query.equal('userId', filters.userId));
      }
      if (filters.targetType && filters.targetType !== 'all') {
        // Filter by target type based on attendee presence
        if (filters.targetType === 'attendee') {
          queries.push(Query.isNotNull('attendeeId'));
        } else if (filters.targetType === 'system') {
          queries.push(Query.isNull('attendeeId'));
        }
        // Note: For more complex filtering by details.type, we'll need to filter in memory
      }
      if (filters.dateFrom) {
        queries.push(Query.greaterThanEqual('$createdAt', new Date(filters.dateFrom).toISOString()));
      }
      if (filters.dateTo) {
        // Add one day to include the entire end date
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        queries.push(Query.lessThan('$createdAt', endDate.toISOString()));
      }
    }

    // Add sorting
    queries.push(Query.orderDesc('$createdAt'));

    // Fetch all logs in batches (Appwrite has a limit per query)
    let allLogs: any[] = [];
    let hasMore = true;
    let offset = 0;
    const batchSize = 100;

    while (hasMore) {
      const batchQueries = [...queries, Query.limit(batchSize), Query.offset(offset)];
      const logsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
        batchQueries
      );

      allLogs = allLogs.concat(logsResponse.documents);

      if (logsResponse.documents.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }
    }

    // Fetch related user and attendee data for each log
    const logsWithRelations = await Promise.all(
      allLogs.map(async (log) => {
        let userDoc = null;
        let attendeeDoc = null;

        // Fetch user if userId exists
        if (log.userId) {
          try {
            const userDocs = await databases.listDocuments(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
              [Query.equal('userId', log.userId)]
            );
            if (userDocs.documents.length > 0) {
              const user = userDocs.documents[0];
              userDoc = {
                id: user.userId,
                email: user.email,
                name: user.name
              };
            }
          } catch (error) {
            console.error('Error fetching user for log:', error);
          }
        }

        // Fetch attendee if attendeeId exists
        if (log.attendeeId) {
          try {
            attendeeDoc = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!,
              log.attendeeId
            );
            attendeeDoc = {
              id: attendeeDoc.$id,
              firstName: attendeeDoc.firstName,
              lastName: attendeeDoc.lastName
            };
          } catch (error) {
            console.error('Error fetching attendee for log:', error);
          }
        }

        // Parse details JSON
        let details = {};
        try {
          details = log.details ? JSON.parse(log.details) : {};
        } catch (error) {
          console.error('Error parsing log details:', error);
          details = {};
        }

        return {
          id: log.$id,
          userId: log.userId,
          attendeeId: log.attendeeId,
          action: log.action,
          details,
          createdAt: log.$createdAt,
          user: userDoc,
          attendee: attendeeDoc
        };
      })
    );

    // Apply additional filtering for targetType if needed (in-memory filtering)
    let logs = logsWithRelations;
    if (scope === 'custom' && filters?.targetType && filters.targetType !== 'all') {
      if (filters.targetType === 'system') {
        logs = logs.filter(log =>
          !log.attendeeId &&
          ((log.details as any)?.type === 'system' || (log.details as any)?.type === 'settings')
        );
      } else if (filters.targetType !== 'attendee') {
        logs = logs.filter(log => (log.details as any)?.type === filters.targetType);
      }
    }

    // Log the export activity
    await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
      ID.unique(),
      {
        userId: user.$id,
        attendeeId: null,
        action: 'export',
        details: JSON.stringify({
          type: 'logs',
          scope,
          recordCount: logs.length,
          fields: fields.length,
          filters: filters || {}
        })
      }
    );

    // Define field mappings for CSV headers and data extraction
    const fieldMappings: { [key: string]: { header: string; extract: (log: any) => string } } = {
      logId: {
        header: 'Log ID',
        extract: (log) => log.id
      },
      createdAt: {
        header: 'Date & Time',
        extract: (log) => {
          try {
            return new Date(log.createdAt).toLocaleString('en-US', {
              timeZone: timezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
          } catch (error) {
            // Fallback to UTC if timezone is invalid
            return new Date(log.createdAt).toLocaleString('en-US', {
              timeZone: 'UTC',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
          }
        }
      },
      action: {
        header: 'Action',
        extract: (log) => log.action
      },
      userName: {
        header: 'User Name',
        extract: (log) => log.user?.name || ''
      },
      userEmail: {
        header: 'User Email',
        extract: (log) => log.user?.email || ''
      },
      userId: {
        header: 'User ID',
        extract: (log) => log.userId || ''
      },
      targetName: {
        header: 'Target Name',
        extract: (log) => {
          if (log.attendee) {
            return `${log.attendee.firstName} ${log.attendee.lastName}`;
          }
          if (log.details?.firstName && log.details?.lastName) {
            return `${log.details.firstName} ${log.details.lastName}`;
          }
          if (log.details?.name) {
            return log.details.name;
          }
          return log.details?.type || 'System';
        }
      },
      targetType: {
        header: 'Target Type',
        extract: (log) => {
          if (log.attendee) return 'Attendee';
          if (log.details?.type) return log.details.type;
          return 'System';
        }
      },
      attendeeId: {
        header: 'Attendee ID',
        extract: (log) => log.attendeeId || ''
      },
      details: {
        header: 'Details',
        extract: (log) => {
          const details = log.details || {};
          const parts = [];

          // Handle the new detailed changes format
          if (details.changes) {
            if (Array.isArray(details.changes)) {
              // New format: array of detailed change descriptions
              parts.push(`Changed: ${details.changes.join('; ')}`);
            } else if (typeof details.changes === 'object') {
              // Legacy format: object with field names
              const changedFields = Object.entries(details.changes)
                .filter(([, changed]) => changed)
                .map(([field]) => field);
              if (changedFields.length > 0) {
                parts.push(`Changed: ${changedFields.join(', ')}`);
              }
            } else if (typeof details.changes === 'string') {
              // String format
              parts.push(`Changed: ${details.changes}`);
            }
          }

          if (details.count) {
            parts.push(`Count: ${details.count}`);
          }

          if (details.barcodeNumber) {
            parts.push(`Barcode: ${details.barcodeNumber}`);
          }

          if (details.credentialUrl) {
            parts.push('Credential generated');
          }

          if (details.error) {
            parts.push(`Error: ${details.error}`);
          }

          return parts.join('; ') || JSON.stringify(details);
        }
      },
      changes: {
        header: 'Changes Made',
        extract: (log) => {
          if (log.details?.changes) {
            if (Array.isArray(log.details.changes)) {
              // New format: array of detailed change descriptions
              return log.details.changes.join('; ');
            } else if (typeof log.details.changes === 'object') {
              // Legacy format: object with field names
              return Object.entries(log.details.changes)
                .filter(([, changed]) => changed)
                .map(([field]) => field)
                .join(', ');
            } else if (typeof log.details.changes === 'string') {
              // String format
              return log.details.changes;
            }
          }
          return '';
        }
      },
      ipAddress: {
        header: 'IP Address',
        extract: (log) => log.details?.ipAddress || ''
      },
      userAgent: {
        header: 'User Agent',
        extract: (log) => log.details?.userAgent || ''
      }
    };

    // Generate CSV headers
    const headers = fields.map(field => fieldMappings[field]?.header || field);

    // Generate CSV rows
    const rows = logs.map(log =>
      fields.map(field => {
        const mapping = fieldMappings[field];
        if (mapping) {
          const value = mapping.extract(log);
          // Escape CSV values that contain commas, quotes, or newlines
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }
        return '';
      })
    );

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="activity-logs-export.csv"');

    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}