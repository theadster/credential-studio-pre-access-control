import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { ID } from 'node-appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { tablesDB } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesTableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID!;
    const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!;

    // Check if user has permission to manage attendees
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const hasPermission = permissions?.attendees?.update || permissions?.attendees?.print || permissions?.all;

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid attendee ID' });
    }

    // Check if attendee exists
    const existingAttendee = await tablesDB.getRow({
      databaseId: dbId,
      tableId: attendeesTableId,
      rowId: id
    });

    // Clear the credential URL and timestamp
    const updatedAttendee = await tablesDB.updateRow({
      databaseId: dbId,
      tableId: attendeesTableId,
      rowId: id,
      data: {
        credentialUrl: null,
        credentialGeneratedAt: null
      }
    });

    // Log the activity if enabled
    if (await shouldLog('credentialClear')) {
      try {
        const fullName = `${existingAttendee.firstName} ${existingAttendee.lastName}`;
        const description = existingAttendee.credentialUrl
          ? `Cleared credential for ${fullName}`
          : `Attempted to clear credential for ${fullName} (no credential existed)`;

        await tablesDB.createRow({
          databaseId: dbId,
          tableId: logsTableId,
          rowId: ID.unique(),
          data: {
            userId: user.$id,
            attendeeId: id,
            action: 'clear_credential',
            details: JSON.stringify({
              type: 'attendee',
              target: fullName,
              description,
              firstName: existingAttendee.firstName,
              lastName: existingAttendee.lastName,
              barcodeNumber: existingAttendee.barcodeNumber,
              ...(existingAttendee.credentialUrl && {
                previousCredentialUrl: existingAttendee.credentialUrl
              })
            })
          }
        });
      } catch (logError) {
        console.error('[clear-credential] Failed to create log entry, but continuing with request', {
          error: logError instanceof Error ? logError.message : 'Unknown error',
          errorType: (logError as any)?.type,
          userId: user.$id,
          attendeeId: id
        });
        // Do not re-throw - allow the request to succeed even if logging fails
      }
    }

    res.status(200).json({
      message: 'Credential cleared successfully',
      attendee: updatedAttendee
    });

  } catch (error: any) {
    console.error('Error clearing credential:', error);

    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.status(500).json({ error: 'Failed to clear credential' });
  }
});
