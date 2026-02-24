/**
 * Reports API - Single Report Endpoint
 *
 * GET: Get single report with validation result
 * PUT: Update report
 * DELETE: Delete report with permission check
 *
 * @see .kiro/specs/saved-reports/requirements.md
 * @see .kiro/specs/saved-reports/design.md
 *
 * Requirements: 2.2, 3.2, 3.4, 3.5, 5.4, 5.5
 */

import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query } from 'node-appwrite';
import { hasPermission } from '@/lib/permissions';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { validateReportConfiguration } from '@/lib/reportValidation';
import type {
  SavedReport,
  UpdateReportPayload,
  ReportErrorResponse,
  LoadReportResponse,
} from '@/types/reports';
import type { AdvancedSearchFilters } from '@/lib/filterUtils';
import type { EventSettings } from '@/components/EventSettingsForm/types';

/**
 * Validate report name
 */
function validateReportName(name: unknown): { valid: boolean; error?: string } {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Report name must be a string' };
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { valid: false, error: 'Report name is required and cannot be empty' };
  }

  if (trimmedName.length > 255) {
    return { valid: false, error: 'Report name cannot exceed 255 characters' };
  }

  return { valid: true };
}

/**
 * Validate filter configuration
 */
function validateFilterConfiguration(config: unknown): { valid: boolean; error?: string } {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Filter configuration must be a valid object' };
  }

  const filters = config as Partial<AdvancedSearchFilters>;

  const requiredProps = [
    'firstName',
    'lastName',
    'barcode',
    'notes',
    'photoFilter',
    'credentialFilter',
    'customFields',
    'accessControl',
    'matchMode',
  ];
  for (const prop of requiredProps) {
    if (!(prop in filters)) {
      return { valid: false, error: `Filter configuration missing required property: ${prop}` };
    }
  }

  return { valid: true };
}

/**
 * Check if user is admin (Super Administrator)
 */
function isAdminUser(role: { name: string } | null): boolean {
  return role?.name === 'Super Administrator';
}

/**
 * Check if user can read a specific report
 * Users can read their own reports, global reports, or any report if admin
 */
function canReadReport(
  userId: string,
  reportUserId: string,
  isGlobal: boolean,
  role: { name: string } | null
): boolean {
  if (isAdminUser(role)) return true;
  if (userId === reportUserId) return true;
  return isGlobal === true;
}

/**
 * Check if user can modify (edit/delete) a specific report
 * Only the creator or admin can modify a report
 */
function canModifyReport(
  userId: string,
  reportUserId: string,
  role: { name: string } | null
): boolean {
  if (isAdminUser(role)) return true;
  return userId === reportUserId;
}

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { user, userProfile } = req;
  const { tablesDB } = createSessionClient(req);
  const role = userProfile.role;

  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const reportsTableId = process.env.NEXT_PUBLIC_APPWRITE_REPORTS_TABLE_ID;
  const eventSettingsTableId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID;

  // Validate environment variables
  if (!databaseId) {
    console.error('[Reports API] Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID');
    return res.status(500).json({
      code: 'DATABASE_ERROR',
      message: 'Server configuration error',
    } as ReportErrorResponse);
  }

  if (!reportsTableId) {
    console.error('[Reports API] Missing NEXT_PUBLIC_APPWRITE_REPORTS_TABLE_ID');
    return res.status(500).json({
      code: 'DATABASE_ERROR',
      message: 'Server configuration error',
    } as ReportErrorResponse);
  }

  if (!eventSettingsTableId) {
    console.error('[Reports API] Missing NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID');
    return res.status(500).json({
      code: 'DATABASE_ERROR',
      message: 'Server configuration error',
    } as ReportErrorResponse);
  }

  // Get report ID from query
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      code: 'INVALID_REQUEST',
      message: 'Report ID is required and must be a string',
    } as ReportErrorResponse);
  }

  switch (req.method) {
    case 'GET': {
      // Check read permission
      // Requirements: 5.3 - Verify reports.read permission
      if (!role || !hasPermission(role, 'reports', 'read')) {
        return res.status(403).json({
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to view reports',
        } as ReportErrorResponse);
      }

      try {
        // Fetch the report
        let reportDoc;
        try {
          reportDoc = await tablesDB.getRow({
            databaseId,
            tableId: reportsTableId,
            rowId: id
          });
        } catch (error: any) {
          if (error.code === 404) {
            return res.status(404).json({
              code: 'REPORT_NOT_FOUND',
              message: 'The requested report could not be found',
            } as ReportErrorResponse);
          }
          throw error;
        }

        // Check if user can read this report (own reports + global reports)
        if (!canReadReport(user.$id, reportDoc.userId, reportDoc.isGlobal ?? false, role)) {
          return res.status(403).json({
            code: 'PERMISSION_DENIED',
            message: 'You do not have permission to view this report',
          } as ReportErrorResponse);
        }

        // Parse filter configuration
        let filterConfiguration: AdvancedSearchFilters;
        try {
          filterConfiguration = JSON.parse(reportDoc.filterConfiguration);
        } catch {
          return res.status(500).json({
            code: 'DATABASE_ERROR',
            message: 'Failed to parse report configuration',
          } as ReportErrorResponse);
        }

        // Fetch event settings for validation
        // Requirements: 4.1 - Validate filter parameters against current system
        let eventSettings: EventSettings | null = null;
        const customFieldsTableId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID;

        // Validate customFieldsTableId before using it
        if (!customFieldsTableId) {
          console.error('[Reports API] Missing NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID');
          return res.status(500).json({
            code: 'DATABASE_ERROR',
            message: 'Server configuration error',
          } as ReportErrorResponse);
        }
        
        try {
          const eventSettingsResponse = await tablesDB.listRows({
            databaseId,
            tableId: eventSettingsTableId,
            queries: [Query.limit(1)]
          });
          if (eventSettingsResponse.rows.length > 0) {
            const doc = eventSettingsResponse.rows[0];
            
            // Fetch custom fields from the separate collection
            // Custom fields are stored in their own collection, not embedded in event settings
            let customFields: EventSettings['customFields'] = [];
            try {
              const customFieldsResponse = await tablesDB.listRows({
                databaseId,
                tableId: customFieldsTableId,
                queries: [
                  Query.equal('eventSettingsId', doc.$id),
                  Query.isNull('deletedAt'),
                  Query.orderAsc('order'),
                  Query.limit(100),
                ]
              });
                
                // Map $id to id for consistency with frontend expectations
                customFields = customFieldsResponse.rows.map((field: any) => {
                  // Parse fieldOptions if stored as JSON string
                  let fieldOptions = field.fieldOptions;
                  if (typeof fieldOptions === 'string') {
                    try {
                      fieldOptions = JSON.parse(fieldOptions);
                    } catch {
                      fieldOptions = undefined;
                    }
                  }
                  
                  return {
                    id: field.$id,  // Map Appwrite $id to id
                    fieldName: field.fieldName,
                    internalFieldName: field.internalFieldName,
                    fieldType: field.fieldType,
                    fieldOptions,
                    required: field.required ?? false,
                    order: field.order ?? 0,
                    showOnMainPage: field.showOnMainPage,
                    printable: field.printable,
                    defaultValue: field.defaultValue,
                  };
                });
              } catch (cfError) {
                console.warn('[Reports API] Failed to fetch custom fields:', cfError);
                // Continue with empty custom fields
              }
            
            // Build EventSettings object with required fields
            eventSettings = {
              id: doc.$id,
              eventName: doc.eventName || '',
              eventDate: doc.eventDate || '',
              eventLocation: doc.eventLocation || '',
              timeZone: doc.timeZone || '',
              barcodeType: doc.barcodeType || 'numerical',
              barcodeLength: doc.barcodeLength || 8,
              barcodeUnique: doc.barcodeUnique ?? true,
              customFields,
            };
          }
        } catch (error) {
          console.warn('[Reports API] Failed to fetch event settings for validation:', error);
          // Continue without event settings - validation will mark all custom fields as stale
        }

        // Validate the report configuration
        // Requirements: 4.1, 4.2 - Detect stale parameters
        const validation = validateReportConfiguration(filterConfiguration, eventSettings);

        // Update lastAccessedAt
        // Requirements: 2.4 - Record last accessed timestamp
        const now = new Date().toISOString();
        try {
          await tablesDB.updateRow({
            databaseId,
            tableId: reportsTableId,
            rowId: id,
            data: {
              lastAccessedAt: now,
            }
          });
        } catch (error) {
          console.warn('[Reports API] Failed to update lastAccessedAt:', error);
          // Continue even if update fails
        }

        const report: SavedReport = {
          $id: reportDoc.$id,
          name: reportDoc.name,
          description: reportDoc.description || undefined,
          userId: reportDoc.userId,
          filterConfiguration: reportDoc.filterConfiguration,
          isGlobal: reportDoc.isGlobal ?? false,
          createdAt: reportDoc.createdAt,
          updatedAt: reportDoc.updatedAt,
          lastAccessedAt: now,
        };

        const response: LoadReportResponse = {
          report,
          validation,
        };

        return res.status(200).json(response);
      } catch (error: any) {
        console.error('[Reports API] Error fetching report:', error);
        return res.status(500).json({
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve report',
        } as ReportErrorResponse);
      }
    }

    case 'PUT': {
      // Check update permission
      // Requirements: 5.4 - Verify reports.update permission
      if (!role || !hasPermission(role, 'reports', 'update')) {
        return res.status(403).json({
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to update reports',
        } as ReportErrorResponse);
      }

      try {
        // Fetch the existing report
        let reportDoc;
        try {
          reportDoc = await tablesDB.getRow({
            databaseId,
            tableId: reportsTableId,
            rowId: id
          });
        } catch (error: any) {
          if (error.code === 404) {
            return res.status(404).json({
              code: 'REPORT_NOT_FOUND',
              message: 'The requested report could not be found',
            } as ReportErrorResponse);
          }
          throw error;
        }

        // Check if user can modify this report (only creator or admin)
        if (!canModifyReport(user.$id, reportDoc.userId, role)) {
          return res.status(403).json({
            code: 'PERMISSION_DENIED',
            message: 'You do not have permission to update this report',
          } as ReportErrorResponse);
        }

        const body = req.body as UpdateReportPayload;
        const updateData: Record<string, any> = {};

        // Validate and prepare name update
        if (body.name !== undefined) {
          const nameValidation = validateReportName(body.name);
          if (!nameValidation.valid) {
            return res.status(400).json({
              code: 'INVALID_NAME',
              message: nameValidation.error!,
            } as ReportErrorResponse);
          }

          // Check for duplicate name (excluding current report)
          const existingReports = await tablesDB.listRows({
            databaseId,
            tableId: reportsTableId,
            queries: [
              Query.equal('userId', reportDoc.userId),
              Query.equal('name', body.name.trim()),
              Query.notEqual('$id', id),
            ]
          });

          if (existingReports.rows.length > 0) {
            return res.status(409).json({
              code: 'DUPLICATE_NAME',
              message: 'A report with this name already exists',
            } as ReportErrorResponse);
          }

          updateData.name = body.name.trim();
        }

        // Prepare description update
        if (body.description !== undefined) {
          updateData.description = body.description?.trim() || null;
        }

        // Validate and prepare filter configuration update
        // Requirements: 3.5 - Update stored filter configuration
        if (body.filterConfiguration !== undefined) {
          const configValidation = validateFilterConfiguration(body.filterConfiguration);
          if (!configValidation.valid) {
            return res.status(400).json({
              code: 'INVALID_CONFIGURATION',
              message: configValidation.error!,
            } as ReportErrorResponse);
          }
          updateData.filterConfiguration = JSON.stringify(body.filterConfiguration);
        }

        // Update isGlobal flag (only the owner can change this)
        if (body.isGlobal !== undefined) {
          if (reportDoc.userId !== user.$id && !isAdminUser(role)) {
            return res.status(403).json({
              code: 'PERMISSION_DENIED',
              message: 'Only the report creator can change its global visibility',
            } as ReportErrorResponse);
          }
          updateData.isGlobal = body.isGlobal === true;
        }

        // Update timestamp
        // Requirements: 3.5 - Update modification timestamp
        updateData.updatedAt = new Date().toISOString();

        // Perform update
        const updatedDoc = await tablesDB.updateRow({
          databaseId,
          tableId: reportsTableId,
          rowId: id,
          data: updateData
        });

        const updatedReport: SavedReport = {
          $id: updatedDoc.$id,
          name: updatedDoc.name,
          description: updatedDoc.description || undefined,
          userId: updatedDoc.userId,
          filterConfiguration: updatedDoc.filterConfiguration,
          isGlobal: updatedDoc.isGlobal ?? false,
          createdAt: updatedDoc.createdAt,
          updatedAt: updatedDoc.updatedAt,
          lastAccessedAt: updatedDoc.lastAccessedAt || undefined,
        };

        return res.status(200).json(updatedReport);
      } catch (error: any) {
        console.error('[Reports API] Error updating report:', error);
        return res.status(500).json({
          code: 'DATABASE_ERROR',
          message: 'Failed to update report',
        } as ReportErrorResponse);
      }
    }

    case 'DELETE': {
      // Check delete permission
      // Requirements: 5.5 - Verify reports.delete permission
      if (!role || !hasPermission(role, 'reports', 'delete')) {
        return res.status(403).json({
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to delete reports',
        } as ReportErrorResponse);
      }

      try {
        // Fetch the existing report
        let reportDoc;
        try {
          reportDoc = await tablesDB.getRow({
            databaseId,
            tableId: reportsTableId,
            rowId: id
          });
        } catch (error: any) {
          if (error.code === 404) {
            return res.status(404).json({
              code: 'REPORT_NOT_FOUND',
              message: 'The requested report could not be found',
            } as ReportErrorResponse);
          }
          throw error;
        }

        // Check if user can modify this report (only creator or admin)
        if (!canModifyReport(user.$id, reportDoc.userId, role)) {
          return res.status(403).json({
            code: 'PERMISSION_DENIED',
            message: 'You do not have permission to delete this report',
          } as ReportErrorResponse);
        }

        // Delete the report
        // Requirements: 3.4 - Remove report from database
        await tablesDB.deleteRow({
          databaseId,
          tableId: reportsTableId,
          rowId: id
        });

        return res.status(200).json({ message: 'Report deleted successfully' });
      } catch (error: any) {
        console.error('[Reports API] Error deleting report:', error);
        return res.status(500).json({
          code: 'DATABASE_ERROR',
          message: 'Failed to delete report',
        } as ReportErrorResponse);
      }
    }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed`,
      } as ReportErrorResponse);
  }
});
