/**
 * Access Control API Endpoint
 * 
 * This endpoint handles GET and PUT operations for access control records.
 * Access control records determine badge validity windows and enabled/disabled status.
 * 
 * GET /api/access-control/[attendeeId] - Get access control for an attendee
 * PUT /api/access-control/[attendeeId] - Update access control for an attendee
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 2.3, 2.4
 */

import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'node-appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';
import {
  AccessControl,
  accessControlUpdateSchema,
  toUtcDatetime,
  validateDateRange,
} from '@/types/accessControl';
import { parseForStorage, AccessControlTimeMode } from '@/lib/accessControlDates';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const accessControlCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ACCESS_CONTROL_COLLECTION_ID!;
  const { attendeeId } = req.query;

  if (!attendeeId || typeof attendeeId !== 'string') {
    return res.status(400).json({ error: 'Invalid attendee ID' });
  }

  // Validate environment variables
  if (!accessControlCollectionId) {
    console.error('[Access Control API] Missing ACCESS_CONTROL collection ID');
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'Access control collection not configured'
    });
  }

  try {
    const { userProfile } = req;
    const { databases } = createSessionClient(req);

    // Check permissions
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const hasReadPermission = permissions?.accessControl?.read === true || permissions?.all === true;
    const hasWritePermission = permissions?.accessControl?.write === true || permissions?.all === true;

    switch (req.method) {
      case 'GET': {
        if (!hasReadPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to view access control' });
        }

        // Find access control record for this attendee
        const accessControlDocs = await databases.listDocuments(
          dbId,
          accessControlCollectionId,
          [Query.equal('attendeeId', attendeeId)]
        );

        if (accessControlDocs.documents.length === 0) {
          // Return default access control if none exists
          // Requirements 1.4, 1.5: Empty validFrom/validUntil means always valid
          // Requirement 2.2: Default accessEnabled is true
          return res.status(200).json({
            attendeeId,
            accessEnabled: true,
            validFrom: null,
            validUntil: null,
            $id: null,
            $createdAt: null,
            $updatedAt: null,
          });
        }

        const accessControl = accessControlDocs.documents[0];
        return res.status(200).json({
          $id: accessControl.$id,
          attendeeId: accessControl.attendeeId,
          accessEnabled: accessControl.accessEnabled,
          validFrom: accessControl.validFrom || null,
          validUntil: accessControl.validUntil || null,
          $createdAt: accessControl.$createdAt,
          $updatedAt: accessControl.$updatedAt,
        } as AccessControl);
      }

      case 'PUT': {
        if (!hasWritePermission) {
          return res.status(403).json({ error: 'Insufficient permissions to update access control' });
        }

        // Validate request body
        const parseResult = accessControlUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            error: 'Validation error',
            details: parseResult.error.issues,
          });
        }

        const { accessEnabled, validFrom, validUntil } = parseResult.data;

        /**
         * FETCH EVENT SETTINGS FOR DATE INTERPRETATION
         * 
         * Requirements 4.3, 4.4, 4.5, 4.6: Apply date interpretation based on time mode
         * - date_only mode: validFrom = start of day (00:00:00), validUntil = end of day (23:59:59)
         * - date_time mode: exact timestamp is preserved
         */
        const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;
        let timeMode: AccessControlTimeMode = 'date_only';
        let eventTimezone = 'UTC';
        
        try {
          const eventSettingsDocs = await databases.listDocuments(dbId, eventSettingsCollectionId, [Query.limit(1)]);
          if (eventSettingsDocs.documents.length > 0) {
            const settings = eventSettingsDocs.documents[0];
            timeMode = (settings.accessControlTimeMode as AccessControlTimeMode) || 'date_only';
            eventTimezone = settings.timeZone || 'UTC';
          }
        } catch (error) {
          console.warn('[Access Control API] Failed to fetch event settings, using defaults:', error);
        }

        // Convert datetimes based on time mode (Requirements 4.3, 4.4, 4.5, 4.6)
        let utcValidFrom: string | null | undefined;
        let utcValidUntil: string | null | undefined;
        
        if (validFrom !== undefined) {
          utcValidFrom = parseForStorage(validFrom, timeMode, eventTimezone, false);
        }
        if (validUntil !== undefined) {
          utcValidUntil = parseForStorage(validUntil, timeMode, eventTimezone, true);
        }

        // Additional date range validation (Requirement 1.6)
        // This handles the case where only one date is being updated
        // We need to check against the existing record
        const existingDocs = await databases.listDocuments(
          dbId,
          accessControlCollectionId,
          [Query.equal('attendeeId', attendeeId)]
        );

        let existingValidFrom: string | null = null;
        let existingValidUntil: string | null = null;
        let existingDocId: string | null = null;

        if (existingDocs.documents.length > 0) {
          const existing = existingDocs.documents[0];
          existingValidFrom = existing.validFrom || null;
          existingValidUntil = existing.validUntil || null;
          existingDocId = existing.$id;
        }

        // Determine final values for validation
        const finalValidFrom = utcValidFrom !== undefined ? utcValidFrom : existingValidFrom;
        const finalValidUntil = utcValidUntil !== undefined ? utcValidUntil : existingValidUntil;

        // Validate date range (Requirement 1.6)
        if (!validateDateRange(finalValidFrom, finalValidUntil)) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'validFrom must be before validUntil',
          });
        }

        // Build update data
        const updateData: Record<string, any> = {};
        if (accessEnabled !== undefined) {
          updateData.accessEnabled = accessEnabled;
        }
        if (utcValidFrom !== undefined) {
          updateData.validFrom = utcValidFrom;
        }
        if (utcValidUntil !== undefined) {
          updateData.validUntil = utcValidUntil;
        }

        let result;
        const isCreate = !existingDocId;
        
        if (existingDocId) {
          // Update existing record
          result = await databases.updateDocument(
            dbId,
            accessControlCollectionId,
            existingDocId,
            updateData
          );
        } else {
          // Create new record
          result = await databases.createDocument(
            dbId,
            accessControlCollectionId,
            ID.unique(),
            {
              attendeeId,
              accessEnabled: accessEnabled ?? true,
              validFrom: utcValidFrom ?? null,
              validUntil: utcValidUntil ?? null,
            }
          );
        }

        // Log the access control update if enabled
        if (await shouldLog('accessControlUpdate')) {
          try {
            const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
            await databases.createDocument(
              dbId,
              logsCollectionId,
              ID.unique(),
              {
                userId: req.user?.$id || 'unknown',
                action: isCreate ? 'create' : 'update',
                details: JSON.stringify({
                  type: 'access_control_update',
                  attendeeId,
                  changes: {
                    accessEnabled: accessEnabled !== undefined ? accessEnabled : undefined,
                    validFrom: utcValidFrom !== undefined ? utcValidFrom : undefined,
                    validUntil: utcValidUntil !== undefined ? utcValidUntil : undefined,
                  },
                  previousValues: existingDocId ? {
                    accessEnabled: existingDocs.documents[0]?.accessEnabled,
                    validFrom: existingValidFrom,
                    validUntil: existingValidUntil,
                  } : null,
                }),
              }
            );
          } catch (logError) {
            console.error('[Access Control API] Error creating audit log:', logError);
            // Continue even if logging fails
          }
        }

        return res.status(200).json({
          $id: result.$id,
          attendeeId: result.attendeeId,
          accessEnabled: result.accessEnabled,
          validFrom: result.validFrom || null,
          validUntil: result.validUntil || null,
          $createdAt: result.$createdAt,
          $updatedAt: result.$updatedAt,
        } as AccessControl);
      }

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('[Access Control API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
    });
  }
});
