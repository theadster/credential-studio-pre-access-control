import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const supabase = createClient(req, res);
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { scope, fields, filters, timezone = 'UTC' } = req.body;

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: 'Fields selection is required' });
    }

    // Build where clause based on scope and filters
    const where: any = {};

    if (scope === 'filtered' && filters) {
      // Apply current page filters
      if (filters.action && filters.action !== 'all') {
        where.action = filters.action;
      }
      if (filters.userId && filters.userId !== 'all') {
        where.userId = filters.userId;
      }
    } else if (scope === 'custom' && filters) {
      // Apply custom filters
      if (filters.action && filters.action !== 'all') {
        where.action = filters.action;
      }
      if (filters.userId && filters.userId !== 'all') {
        where.userId = filters.userId;
      }
      if (filters.targetType && filters.targetType !== 'all') {
        // Filter by target type based on details or attendee presence
        if (filters.targetType === 'attendee') {
          where.attendeeId = { not: null };
        } else if (filters.targetType === 'system') {
          where.AND = [
            { attendeeId: null },
            {
              OR: [
                { details: { path: ['type'], equals: 'system' } },
                { details: { path: ['type'], equals: 'settings' } }
              ]
            }
          ];
        } else {
          where.details = { path: ['type'], equals: filters.targetType };
        }
      }
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          // Add one day to include the entire end date
          const endDate = new Date(filters.dateTo);
          endDate.setDate(endDate.getDate() + 1);
          where.createdAt.lt = endDate;
        }
      }
    }

    // Fetch logs with all necessary relations
    const logs = await prisma.log.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        attendee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Log the export activity
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'export',
        details: {
          type: 'logs',
          scope,
          recordCount: logs.length,
          fields: fields.length,
          filters: filters || {}
        }
      }
    });

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