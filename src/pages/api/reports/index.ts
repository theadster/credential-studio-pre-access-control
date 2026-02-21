/**
 * Reports API - List and Create Endpoints
 *
 * GET: List reports for current user (with admin override)
 * POST: Create new report with validation
 *
 * @see .kiro/specs/saved-reports/requirements.md
 * @see .kiro/specs/saved-reports/design.md
 *
 * Requirements: 2.1, 1.2, 5.2, 5.3, 5.7, 5.8
 */

import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'node-appwrite';
import { hasPermission } from '@/lib/permissions';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import type { SavedReport, CreateReportPayload, ReportErrorResponse } from '@/types/reports';
import type { AdvancedSearchFilters } from '@/lib/filterUtils';

/**
 * Validate report name
 * Requirements: 1.3 - Empty name validation
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
 * Requirements: 6.5 - Store complete filter state
 */
function validateFilterConfiguration(config: unknown): { valid: boolean; error?: string } {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Filter configuration must be a valid object' };
  }
  
  const filters = config as Partial<AdvancedSearchFilters>;
  
  // Check required top-level properties exist
  const requiredProps = ['firstName', 'lastName', 'barcode', 'notes', 'photoFilter', 'credentialFilter', 'customFields', 'accessControl', 'matchMode'];
  for (const prop of requiredProps) {
    if (!(prop in filters)) {
      return { valid: false, error: `Filter configuration missing required property: ${prop}` };
    }
  }
  
  return { valid: true };
}

/**
 * Check if user is admin (Super Administrator)
 * Requirements: 5.8 - Admin users see all reports
 */
function isAdminUser(role: { name: string } | null): boolean {
  return role?.name === 'Super Administrator';
}

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { user, userProfile } = req;
  const { tablesDB } = createSessionClient(req);
  const role = userProfile.role;

  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const reportsTableId = process.env.NEXT_PUBLIC_APPWRITE_REPORTS_TABLE_ID;

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
        // Build query based on user role
        // Requirements: 5.7 - Non-admin users only see their own reports
        // Requirements: 5.8 - Admin users see all reports
        const queries = [Query.orderDesc('createdAt')];
        
        if (!isAdminUser(role)) {
          // Non-admin: filter by userId
          queries.push(Query.equal('userId', user.$id));
        }

        const reportsResponse = await tablesDB.listRows({
          databaseId,
          tableId: reportsTableId,
          queries
        });

        // Transform documents to SavedReport format
        // Skip reports with malformed filterConfiguration to ensure type safety
        const reports: SavedReport[] = [];
        
        for (const doc of reportsResponse.rows) {
          // Normalize filterConfiguration: parse if it's a string, otherwise use as-is
          let filterConfig = doc.filterConfiguration;
          if (typeof filterConfig === 'string') {
            try {
              filterConfig = JSON.parse(filterConfig);
            } catch (err) {
              console.error(
                `[Reports API] Skipping report with malformed filterConfiguration - reportId: ${doc.$id}, error: ${err instanceof Error ? err.message : String(err)}`
              );
              // Skip this report due to malformed filterConfiguration
              continue;
            }
          }

          reports.push({
            $id: doc.$id,
            name: doc.name,
            description: doc.description || undefined,
            userId: doc.userId,
            filterConfiguration: filterConfig,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            lastAccessedAt: doc.lastAccessedAt || undefined,
          });
        }

        return res.status(200).json({
          reports,
          total: reportsResponse.total,
        });
      } catch (error: any) {
        console.error('[Reports API] Error listing reports:', error);
        return res.status(500).json({
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve reports',
        } as ReportErrorResponse);
      }
    }

    case 'POST': {
      // Check create permission
      // Requirements: 5.2 - Verify reports.create permission
      if (!role || !hasPermission(role, 'reports', 'create')) {
        return res.status(403).json({
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to create reports',
        } as ReportErrorResponse);
      }

      const body = req.body as CreateReportPayload;

      // Validate report name
      // Requirements: 1.3 - Empty name validation
      const nameValidation = validateReportName(body.name);
      if (!nameValidation.valid) {
        return res.status(400).json({
          code: 'INVALID_NAME',
          message: nameValidation.error!,
        } as ReportErrorResponse);
      }

      // Validate filter configuration
      const configValidation = validateFilterConfiguration(body.filterConfiguration);
      if (!configValidation.valid) {
        return res.status(400).json({
          code: 'INVALID_CONFIGURATION',
          message: configValidation.error!,
        } as ReportErrorResponse);
      }

      try {
        // Check for duplicate name for this user
        const existingReports = await tablesDB.listRows(
          databaseId,
          reportsTableId,
          [
            Query.equal('userId', user.$id),
            Query.equal('name', body.name.trim()),
          ]
        );

        if (existingReports.rows.length > 0) {
          return res.status(409).json({
            code: 'DUPLICATE_NAME',
            message: 'A report with this name already exists',
          } as ReportErrorResponse);
        }

        // Create the report
        // Requirements: 1.2 - Persist filter configuration
        // Requirements: 1.5 - Associate with user
        // Requirements: 1.6 - Record creation timestamp
        const now = new Date().toISOString();
        const reportId = ID.unique();

        const newReport = await tablesDB.createRow(
          databaseId,
          reportsTableId,
          reportId,
          {
            name: body.name.trim(),
            description: body.description?.trim() || null,
            userId: user.$id,
            filterConfiguration: JSON.stringify(body.filterConfiguration),
            createdAt: now,
            updatedAt: now,
          }
        );

        const savedReport: SavedReport = {
          $id: newReport.$id,
          name: newReport.name,
          description: newReport.description || undefined,
          userId: newReport.userId,
          filterConfiguration: newReport.filterConfiguration,
          createdAt: newReport.createdAt,
          updatedAt: newReport.updatedAt,
          lastAccessedAt: newReport.lastAccessedAt || undefined,
        };

        return res.status(201).json(savedReport);
      } catch (error: any) {
        console.error('[Reports API] Error creating report:', error);
        return res.status(500).json({
          code: 'DATABASE_ERROR',
          message: 'Failed to create report',
        } as ReportErrorResponse);
      }
    }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed`,
      } as ReportErrorResponse);
  }
});
