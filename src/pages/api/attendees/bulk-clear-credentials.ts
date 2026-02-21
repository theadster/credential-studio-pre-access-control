import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { ID } from 'node-appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';
import { generateOperationId, BulkOperationType } from '@/lib/bulkOperationBroadcast';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user, userProfile } = req;
    const { tablesDB } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesTableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID!;
    const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!;

    // Check if user has permission to manage attendees
    const permissions = userProfile?.role?.permissions ?? {};
    const hasPermission = permissions?.attendees?.update || permissions?.attendees?.print || permissions?.all;

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { attendeeIds } = req.body;

    if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      return res.status(400).json({ error: 'Invalid attendee IDs' });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ attendeeId: string; error: string }> = [];

    // Process each attendee
    for (const attendeeId of attendeeIds) {
      try {
        // Get the attendee first to check if it exists and has a credential
        const existingAttendee = await tablesDB.getRow({
          databaseId: dbId,
          tableId: attendeesTableId,
          rowId: attendeeId
        });

        const fullName = `${existingAttendee.firstName} ${existingAttendee.lastName}`;
        const hasCredential = existingAttendee.credentialUrl && existingAttendee.credentialUrl.trim() !== '';

        // Only update if there's actually a credential to clear
        if (hasCredential) {
          await tablesDB.updateRow({
            databaseId: dbId,
            tableId: attendeesTableId,
            rowId: attendeeId,
            data: {
              credentialUrl: null,
              credentialGeneratedAt: null
            }
          });
        }

        // Log the activity if enabled
        if (await shouldLog('credentialClear')) {
          try {
            const description = hasCredential
              ? `Cleared credential for ${fullName}`
              : `Attempted to clear credential for ${fullName} (no credential existed)`;

            await tablesDB.createRow({
              databaseId: dbId,
              tableId: logsTableId,
              rowId: ID.unique(),
              data: {
                userId: user.$id,
                attendeeId: attendeeId,
                action: 'clear_credential',
                details: JSON.stringify({
                  type: 'attendee',
                  target: fullName,
                  description,
                  firstName: existingAttendee.firstName,
                  lastName: existingAttendee.lastName,
                  barcodeNumber: existingAttendee.barcodeNumber,
                  ...(hasCredential && {
                    previousCredentialUrl: existingAttendee.credentialUrl
                  })
                })
              }
            });
          } catch (logError) {
            console.error('[bulk-clear-credentials] Failed to create log entry, but continuing', {
              error: logError instanceof Error ? logError.message : 'Unknown error',
              attendeeId
            });
          }
        }

        successCount++;
      } catch (error: any) {
        errorCount++;
        const errorMessage = error.message || 'Failed to clear credential';
        errors.push({ attendeeId, error: errorMessage });
        console.error(`Error clearing credential for attendee ${attendeeId}:`, error);
      }
    }

    // Generate operation ID for broadcast
    const operationId = generateOperationId();

    res.status(200).json({
      message: 'Bulk clear credentials completed',
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
      // Broadcast info for client-side notification (Requirement 5.5)
      broadcast: {
        operationId,
        operationType: 'bulk_clear_credentials' as BulkOperationType,
        affectedIds: attendeeIds.filter((id: string) => !errors.some(e => e.attendeeId === id)),
      }
    });

  } catch (error: any) {
    console.error('Error in bulk clear credentials:', error);

    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.status(500).json({ error: 'Failed to clear credentials' });
  }
});
