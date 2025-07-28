import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';
import { checkApiPermission } from '@/lib/permissions';

interface ExportRequest {
  scope: 'all' | 'filtered';
  fields: string[];
  filters?: {
    searchTerm?: string;
    photoFilter?: 'all' | 'with' | 'without';
    advancedFilters?: {
      firstName: string;
      lastName: string;
      barcode: string;
      photoFilter: 'all' | 'with' | 'without';
      customFields: { [key: string]: { value: string; searchEmpty: boolean } };
    };
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from Supabase
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check export permission for attendees
    const exportPermission = await checkApiPermission(user.id, 'attendees', 'export', prisma);
    if (!exportPermission.hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions to export attendees' });
    }

    const { scope, fields, filters }: ExportRequest = req.body;

    // Validate required fields
    if (!scope || !fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: 'Invalid export parameters' });
    }

    // Build the query based on scope and filters
    let whereClause: any = {};

    if (scope === 'filtered' && filters) {
      // Apply basic search filter
      if (filters.searchTerm) {
        whereClause.OR = [
          {
            firstName: {
              contains: filters.searchTerm,
              mode: 'insensitive'
            }
          },
          {
            lastName: {
              contains: filters.searchTerm,
              mode: 'insensitive'
            }
          },
          {
            barcodeNumber: {
              contains: filters.searchTerm,
              mode: 'insensitive'
            }
          },
          {
            customFieldValues: {
              some: {
                value: {
                  contains: filters.searchTerm,
                  mode: 'insensitive'
                }
              }
            }
          }
        ];
      }

      // Apply photo filter
      if (filters.photoFilter && filters.photoFilter !== 'all') {
        if (filters.photoFilter === 'with') {
          whereClause.photoUrl = { not: null };
        } else if (filters.photoFilter === 'without') {
          whereClause.photoUrl = null;
        }
      }

      // Apply advanced filters
      if (filters.advancedFilters) {
        const advFilters = filters.advancedFilters;
        
        if (advFilters.firstName) {
          whereClause.firstName = {
            contains: advFilters.firstName,
            mode: 'insensitive'
          };
        }

        if (advFilters.lastName) {
          whereClause.lastName = {
            contains: advFilters.lastName,
            mode: 'insensitive'
          };
        }

        if (advFilters.barcode) {
          whereClause.barcodeNumber = {
            contains: advFilters.barcode,
            mode: 'insensitive'
          };
        }

        // Override photo filter if specified in advanced filters
        if (advFilters.photoFilter && advFilters.photoFilter !== 'all') {
          if (advFilters.photoFilter === 'with') {
            whereClause.photoUrl = { not: null };
          } else if (advFilters.photoFilter === 'without') {
            whereClause.photoUrl = null;
          }
        }

        // Apply custom field filters
        if (advFilters.customFields) {
          const customFieldConditions = [];
          
          for (const [fieldId, filter] of Object.entries(advFilters.customFields)) {
            if (filter.searchEmpty) {
              // Search for records without this custom field value
              customFieldConditions.push({
                NOT: {
                  customFieldValues: {
                    some: {
                      customFieldId: fieldId,
                      value: { not: null }
                    }
                  }
                }
              });
            } else if (filter.value) {
              // Search for records with this custom field value
              customFieldConditions.push({
                customFieldValues: {
                  some: {
                    customFieldId: fieldId,
                    value: {
                      contains: filter.value,
                      mode: 'insensitive'
                    }
                  }
                }
              });
            }
          }

          if (customFieldConditions.length > 0) {
            whereClause.AND = customFieldConditions;
          }
        }
      }
    }

    // Fetch attendees with custom field values
    const attendees = await prisma.attendee.findMany({
      where: whereClause,
      include: {
        customFieldValues: {
          include: {
            customField: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get event settings to include custom field names
    const eventSettings = await prisma.eventSettings.findFirst({
      include: {
        customFields: true
      }
    });

    // Build CSV headers based on selected fields
    const headers: string[] = [];
    const fieldMap: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      barcodeNumber: 'Barcode',
      photoUrl: 'Photo URL',
      credentialUrl: 'Credential URL',
      createdAt: 'Created Date',
      updatedAt: 'Updated Date',
      credentialGeneratedAt: 'Credential Generated Date'
    };

    // Add basic and system field headers
    for (const field of fields) {
      if (fieldMap[field]) {
        headers.push(fieldMap[field]);
      }
    }

    // Add custom field headers
    const customFieldHeaders: { [key: string]: string } = {};
    if (eventSettings?.customFields) {
      for (const customField of eventSettings.customFields) {
        if (fields.includes(`custom_${customField.id}`)) {
          const headerName = customField.fieldName;
          headers.push(headerName);
          customFieldHeaders[customField.id] = headerName;
        }
      }
    }

    // Build CSV rows
    const csvRows: string[] = [headers.join(',')];

    for (const attendee of attendees) {
      const row: string[] = [];

      // Add basic and system field values
      for (const field of fields) {
        if (field.startsWith('custom_')) continue; // Handle custom fields separately

        let value = '';
        switch (field) {
          case 'firstName':
            value = attendee.firstName || '';
            break;
          case 'lastName':
            value = attendee.lastName || '';
            break;
          case 'barcodeNumber':
            value = attendee.barcodeNumber || '';
            break;
          case 'photoUrl':
            value = attendee.photoUrl || '';
            break;
          case 'credentialUrl':
            value = attendee.credentialUrl || '';
            break;
          case 'createdAt':
            value = attendee.createdAt ? new Date(attendee.createdAt).toISOString() : '';
            break;
          case 'updatedAt':
            value = attendee.updatedAt ? new Date(attendee.updatedAt).toISOString() : '';
            break;
          case 'credentialGeneratedAt':
            value = attendee.credentialGeneratedAt ? new Date(attendee.credentialGeneratedAt).toISOString() : '';
            break;
        }

        // Escape CSV value (handle commas, quotes, newlines)
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        row.push(value);
      }

      // Add custom field values
      if (eventSettings?.customFields) {
        for (const customField of eventSettings.customFields) {
          if (fields.includes(`custom_${customField.id}`)) {
            const customFieldValue = attendee.customFieldValues.find(
              cfv => cfv.customFieldId === customField.id
            );
            
            let value = customFieldValue?.value || '';
            
            // Format boolean values
            if (customField.fieldType === 'boolean') {
              value = value === 'yes' ? 'Yes' : 'No';
            }

            // Escape CSV value
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              value = `"${value.replace(/"/g, '""')}"`;
            }
            row.push(value);
          }
        }
      }

      csvRows.push(row.join(','));
    }

    // Join all rows with newlines
    const csvContent = csvRows.join('\n');

    // Log the export activity
    await prisma.log.create({
      data: {
        action: 'export',
        userId: user.id,
        details: {
          type: 'attendees',
          scope,
          recordCount: attendees.length,
          fields: fields.length,
          hasFilters: scope === 'filtered' && !!filters
        }
      }
    });

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendees-export-${new Date().toISOString().split('T')[0]}.csv"`);
    
    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Failed to export attendees' });
  }
}