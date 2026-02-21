import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';

interface ExportRequest {
  scope: 'all' | 'filtered';
  fields: string[];
  dateFormat?: 'iso' | 'us' | 'compact';
  timeFormat?: '24h' | '12h';
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

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { tablesDB } = createSessionClient(req);

    // Validate required environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
      'NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID',
      'NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID',
      'NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID',
      'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`Missing environment variable: ${envVar}`);
        return res.status(500).json({ error: 'Server configuration error' });
      }
    }

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesTableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID!;
    const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!;
    const customFieldsTableId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID!;
    const eventSettingsTableId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID!;

    // Check export permission
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const hasExportPermission = permissions?.attendees?.export === true || permissions?.all === true;

    if (!hasExportPermission) {
      return res.status(403).json({ error: 'Insufficient permissions to export attendees' });
    }

    const { scope, fields, dateFormat = 'compact', timeFormat = '12h', filters }: ExportRequest = req.body;

    // Validate required fields
    if (!scope || !fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: 'Invalid export parameters' });
    }

    // Build queries based on scope and filters
    const queries: string[] = [];

    if (scope === 'filtered' && filters) {
      // Apply basic search filter
      if (filters.searchTerm) {
        queries.push(Query.search('firstName', filters.searchTerm));
      }

      // Apply photo filter
      if (filters.photoFilter && filters.photoFilter !== 'all') {
        if (filters.photoFilter === 'with') {
          queries.push(Query.isNotNull('photoUrl'));
        } else if (filters.photoFilter === 'without') {
          queries.push(Query.isNull('photoUrl'));
        }
      }

      // Apply advanced filters
      if (filters.advancedFilters) {
        const advFilters = filters.advancedFilters;

        if (advFilters.firstName) {
          queries.push(Query.search('firstName', advFilters.firstName));
        }

        if (advFilters.lastName) {
          queries.push(Query.search('lastName', advFilters.lastName));
        }

        if (advFilters.barcode) {
          queries.push(Query.search('barcodeNumber', advFilters.barcode));
        }

        // Override photo filter if specified in advanced filters
        if (advFilters.photoFilter && advFilters.photoFilter !== 'all') {
          if (advFilters.photoFilter === 'with') {
            queries.push(Query.isNotNull('photoUrl'));
          } else if (advFilters.photoFilter === 'without') {
            queries.push(Query.isNull('photoUrl'));
          }
        }
      }
    }

    // Add ordering
    queries.push(Query.orderDesc('$createdAt'));

    // Fetch all attendees with pagination
    let attendees: any[] = [];
    let offset = 0;
    const limit = 100; // Fetch in batches of 100
    let hasMore = true;

    while (hasMore) {
      const paginatedQueries = [
        ...queries,
        Query.limit(limit),
        Query.offset(offset)
      ];

      const attendeesResult = await tablesDB.listRows(
        dbId,
        attendeesTableId,
        paginatedQueries
      );

      attendees = attendees.concat(attendeesResult.rows);
      offset += limit;
      hasMore = attendeesResult.rows.length === limit;
    }



    // Apply custom field filters in memory if needed
    if (scope === 'filtered' && filters?.advancedFilters?.customFields) {
      const customFieldFilters = filters.advancedFilters.customFields;

      attendees = attendees.filter((attendee: any) => {
        let customFieldValues: Record<string, any> = {};
        if (attendee.customFieldValues) {
          if (typeof attendee.customFieldValues === 'string') {
            try {
              customFieldValues = JSON.parse(attendee.customFieldValues);
            } catch (error) {
              console.error(
                `Failed to parse customFieldValues for attendee ${attendee.$id}:`,
                error
              );
              // Skip this attendee or fall back to empty object
            }
          } else {
            customFieldValues = attendee.customFieldValues;
          }
        }

        return Object.entries(customFieldFilters).every(
          ([fieldId, filter]: [string, any]) => {
            const fieldValue = customFieldValues[fieldId];

            if (filter.searchEmpty) {
              return !fieldValue || fieldValue === '';
            }

            if (filter.value) {
              return (
                fieldValue &&
                String(fieldValue)
                  .toLowerCase()
                  .includes(String(filter.value).toLowerCase())
              );
            }

            return true;
          }
        );
      });
    }

    // Get event settings and custom fields
    const eventSettingsDocs = await tablesDB.listRows(dbId, eventSettingsTableId);
    const eventSettings = eventSettingsDocs.rows[0];

    /**
     * ACCESS CONTROL DATA FETCHING
     * 
     * PERFORMANCE: Uses batch fetching (100 attendees per query) instead of
     * individual queries to avoid N+1 query problem.
     * 
     * Note: validFrom and validUntil are stored as strings to preserve exact values
     * without Appwrite's automatic timezone conversion
     */
    const accessControlTableId = process.env.NEXT_PUBLIC_APPWRITE_ACCESS_CONTROL_TABLE_ID;
    const accessControlMap = new Map<string, { accessEnabled: boolean; validFrom: string | null; validUntil: string | null }>();
    
    if (accessControlTableId && eventSettings?.accessControlEnabled && attendees.length > 0) {
      try {
        const attendeeIds = attendees.map((doc: any) => doc.$id);
        
        // Fetch access control data in batches (Appwrite limit for 'in' queries is 100)
        // This prevents N+1 query problem and dramatically improves performance
        const chunkSize = 100;
        for (let i = 0; i < attendeeIds.length; i += chunkSize) {
          const chunk = attendeeIds.slice(i, i + chunkSize);
          try {
            const accessControlResult = await tablesDB.listRows(
              dbId,
              accessControlTableId,
              [Query.equal('attendeeId', chunk), Query.limit(chunkSize)]
            );
            
            // Map access control records by attendeeId
            accessControlResult.rows.forEach((ac: any) => {
              accessControlMap.set(ac.attendeeId, {
                accessEnabled: ac.accessEnabled ?? true,
                validFrom: ac.validFrom || null,
                validUntil: ac.validUntil || null
              });
            });
          } catch (error) {
            console.warn(`[Export API] Failed to fetch access control batch:`, error);
            // Continue with next batch if one fails
          }
        }
      } catch (error) {
        console.warn('[Export API] Failed to fetch access control data:', error);
      }
    }

    // Attach Access Control data to attendees
    attendees = attendees.map((attendee: any) => {
      const accessControl = accessControlMap.get(attendee.$id) || {
        accessEnabled: true,
        validFrom: null,
        validUntil: null
      };
      
      return {
        ...attendee,
        accessEnabled: accessControl.accessEnabled,
        validFrom: accessControl.validFrom,
        validUntil: accessControl.validUntil
      };
    });

    const customFieldsDocs = await tablesDB.listRows(
      dbId,
      customFieldsTableId,
      [Query.limit(100)]
    );
    const customFieldsData = customFieldsDocs.rows;

    // Helper function to format dates based on user preferences
    const formatDate = (dateStr: string | null | undefined, includeTime: boolean = false): string => {
      if (!dateStr) return '';
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      
      let formattedDate = '';
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      
      // Format date based on preference
      switch (dateFormat) {
        case 'compact':
          formattedDate = `${month}/${day}/${String(year).slice(-2)}`;
          break;
        case 'us':
          formattedDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
          break;
        case 'iso':
          formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          break;
      }
      
      // Add time if requested
      if (includeTime) {
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        if (timeFormat === '12h') {
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const hour12 = hours % 12 || 12;
          formattedDate += ` ${hour12}:${minutes} ${ampm}`;
        } else {
          formattedDate += ` ${String(hours).padStart(2, '0')}:${minutes}`;
        }
      }
      
      return formattedDate;
    };

    // Helper function to format Access Control dates based on time mode
    const formatAccessControlDate = (dateStr: string | null | undefined): string => {
      if (!dateStr) return '';
      
      // Check if it's a date-only string (YYYY-MM-DD)
      const dateOnlyMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        switch (dateFormat) {
          case 'compact':
            return `${parseInt(month)}/${parseInt(day)}/${year.slice(-2)}`;
          case 'us':
            return `${month}/${day}/${year}`;
          case 'iso':
            return dateStr;
        }
      }
      
      // Check if it's a datetime-local string (YYYY-MM-DDTHH:mm)
      const dateTimeMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (dateTimeMatch) {
        const [, year, month, day, hours, minutes] = dateTimeMatch;
        let formattedDate = '';
        
        switch (dateFormat) {
          case 'compact':
            formattedDate = `${parseInt(month)}/${parseInt(day)}/${year.slice(-2)}`;
            break;
          case 'us':
            formattedDate = `${month}/${day}/${year}`;
            break;
          case 'iso':
            formattedDate = `${year}-${month}-${day}`;
            break;
        }
        
        // Add time based on time mode
        if (eventSettings?.accessControlTimeMode === 'date_time') {
          const hour = parseInt(hours);
          if (timeFormat === '12h') {
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            formattedDate += ` ${hour12}:${minutes} ${ampm}`;
          } else {
            formattedDate += ` ${hours}:${minutes}`;
          }
        }
        
        return formattedDate;
      }
      
      // Fallback to regular date formatting
      return formatDate(dateStr, eventSettings?.accessControlTimeMode === 'date_time');
    };

    // Helper function to sanitize text for CSV (remove newlines, tabs, etc.)
    const sanitizeText = (text: string | null | undefined): string => {
      if (!text) return '';
      
      // Replace newlines, carriage returns, and tabs with spaces
      let sanitized = text
        .replace(/\r\n/g, ' ')  // Windows line endings
        .replace(/\n/g, ' ')     // Unix line endings
        .replace(/\r/g, ' ')     // Old Mac line endings
        .replace(/\t/g, ' ')     // Tabs
        .replace(/\s+/g, ' ')    // Multiple spaces to single space
        .trim();                 // Remove leading/trailing whitespace
      
      return sanitized;
    };

    // Build CSV headers based on selected fields
    const headers: string[] = [];
    const fieldMap: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      barcodeNumber: 'Barcode',
      photoUrl: 'Photo URL',
      credentialUrl: 'Credential URL',
      notes: 'Notes',
      createdAt: 'Created Date',
      updatedAt: 'Updated Date',
      credentialGeneratedAt: 'Credential Generated Date',
      accessEnabled: 'Access Status',
      validFrom: 'Valid From',
      validUntil: 'Valid Until'
    };

    // Add basic and system field headers
    for (const field of fields) {
      if (fieldMap[field]) {
        headers.push(fieldMap[field]);
      }
    }

    // Add custom field headers
    const customFieldHeaders: { [key: string]: string } = {};
    for (const customField of customFieldsData) {
      if (fields.includes(`custom_${customField.$id}`)) {
        const headerName = customField.fieldName;
        headers.push(headerName);
        customFieldHeaders[customField.$id] = headerName;
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
            value = sanitizeText(attendee.firstName);
            break;
          case 'lastName':
            value = sanitizeText(attendee.lastName);
            break;
          case 'barcodeNumber':
            value = sanitizeText(attendee.barcodeNumber);
            break;
          case 'photoUrl':
            value = attendee.photoUrl || '';
            break;
          case 'credentialUrl':
            value = attendee.credentialUrl || '';
            break;
          case 'notes':
            value = sanitizeText(attendee.notes);
            break;
          case 'createdAt':
            value = formatDate(attendee.$createdAt, true);
            break;
          case 'updatedAt':
            value = formatDate(attendee.$updatedAt, true);
            break;
          case 'credentialGeneratedAt':
            value = formatDate(attendee.credentialGeneratedAt, true);
            break;
          case 'accessEnabled':
            value = attendee.accessEnabled === true ? 'Active' : 'Inactive';
            break;
          case 'validFrom':
            value = formatAccessControlDate(attendee.validFrom);
            break;
          case 'validUntil':
            value = formatAccessControlDate(attendee.validUntil);
            break;
        }

        // Escape CSV value (handle commas, quotes, newlines)
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        row.push(value);
      }

      // Add custom field values
      let customFieldValues: Record<string, any> = {};
      
      if (attendee.customFieldValues) {
        try {
          let parsedValues: any;
          
          // First, parse if it's a string
          if (typeof attendee.customFieldValues === 'string') {
            parsedValues = JSON.parse(attendee.customFieldValues);
          } else {
            parsedValues = attendee.customFieldValues;
          }
          
          // Now check if the parsed/original value is an array and convert it
          if (Array.isArray(parsedValues)) {
            // Convert array format [{customFieldId: "id", value: "val"}] to object format
            customFieldValues = parsedValues.reduce((acc: Record<string, any>, item: any) => {
              if (item.customFieldId) {
                acc[item.customFieldId] = item.value;
              }
              return acc;
            }, {});
          } else if (typeof parsedValues === 'object') {
            customFieldValues = parsedValues;
          }
        } catch (error) {
          console.error(`[Export] Failed to parse customFieldValues for attendee ${attendee.$id} (${attendee.firstName} ${attendee.lastName}, Barcode: ${attendee.barcodeNumber}):`, error);
          console.error(`[Export] Raw customFieldValues type:`, typeof attendee.customFieldValues);
          console.error(`[Export] Raw customFieldValues:`, attendee.customFieldValues);
        }
      }

      for (const customField of customFieldsData) {
        if (fields.includes(`custom_${customField.$id}`)) {
          let value = customFieldValues[customField.$id];
          
          // Handle null, undefined, or missing values
          if (value === null || value === undefined) {
            value = '';
          } else {
            // CRITICAL: Boolean fields are stored as 'yes'/'no' in database
            // Format for CSV export as 'Yes'/'No' for readability
            // Note: Database stores 'yes'/'no' (lowercase), NOT 'true'/'false'
            if (customField.fieldType === 'boolean') {
              const truthyValues = ['yes', 'true', '1', true];
              value = truthyValues.includes(String(value).toLowerCase()) ? 'Yes' : 'No';
            } else {
              // Sanitize text fields to remove newlines
              value = sanitizeText(String(value));
            }
          }
          
          // Escape CSV value (handle commas, quotes, newlines)
          if (value && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          row.push(value);
        }
      }

      csvRows.push(row.join(','));
    }

    // Join all rows with newlines
    const csvContent = csvRows.join('\n');

    // Generate filename
    const filename = `attendees-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    // Log the export activity if enabled
    if (await shouldLog('attendeeExport')) {
      const { createExportLogDetails } = await import('@/lib/logFormatting');
      await tablesDB.createRow(
        dbId,
        logsTableId,
        ID.unique(),
        {
          action: 'export',
          userId: user.$id,
          details: JSON.stringify(createExportLogDetails('attendees', 'csv', attendees.length, {
            filename,
            scope,
            fields: fields.length,
            hasFilters: scope === 'filtered' && !!filters
          }))
        }
      );
    }

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(200).send(csvContent);

  } catch (error: any) {
    console.error('Export error:', error);

    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    return res.status(500).json({ error: 'Failed to export attendees' });
  }
});
