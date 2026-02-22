import { NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { Query, ID } from 'node-appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user, userProfile } = req;
    const { tablesDB } = createSessionClient(req);

    const { attendeeIds, databaseId: requestedDatabaseId } = req.body;

    if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      return res.status(400).json({ error: 'Attendee IDs are required' });
    }

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

    // If caller passes a databaseId, validate it matches this site's database.
    // This allows a single shared PDF worker function to serve multiple sites
    // while preventing cross-site database access.
    if (requestedDatabaseId && requestedDatabaseId !== dbId) {
      return res.status(403).json({ error: 'Forbidden: databaseId does not match this site' });
    }
    const attendeesTableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID!;
    const eventSettingsTableId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID!;
    const pdfJobsTableId = process.env.NEXT_PUBLIC_APPWRITE_PDF_JOBS_TABLE_ID!;
    const functionId = process.env.NEXT_PUBLIC_APPWRITE_PDF_WORKER_FUNCTION_ID!;

    // Validate required environment variables
    const requiredEnvVars: Record<string, string | undefined> = {
      NEXT_PUBLIC_APPWRITE_DATABASE_ID: dbId,
      NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID: attendeesTableId,
      NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID: eventSettingsTableId,
      NEXT_PUBLIC_APPWRITE_PDF_JOBS_TABLE_ID: pdfJobsTableId,
      NEXT_PUBLIC_APPWRITE_PDF_WORKER_FUNCTION_ID: functionId,
    };
    const missing = Object.entries(requiredEnvVars)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length > 0) {
      console.error(`[bulk-export-pdf-start] Missing required environment variable(s): ${missing.join(', ')}`);
      return res.status(500).json({ error: `Server misconfiguration: missing environment variable(s): ${missing.join(', ')}` });
    }

    // Check permissions
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const hasBulkGeneratePDFsPermission =
      permissions?.attendees?.bulkGeneratePDFs === true || permissions?.all === true;

    if (!hasBulkGeneratePDFsPermission) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions for bulk PDF generation' });
    }

    // Get event settings
    const eventSettingsDocs = await tablesDB.listRows({
      databaseId: dbId,
      tableId: eventSettingsTableId,
      queries: [Query.limit(1)],
    });

    if (eventSettingsDocs.rows.length === 0) {
      return res.status(400).json({ error: 'Event settings not configured' });
    }

    const eventSettings = eventSettingsDocs.rows[0];
    const eventSettingsId = eventSettings.$id;

    // Get OneSimpleAPI integration
    const oneSimpleApiTableId = process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_TABLE_ID!;
    const oneSimpleApiDocs = await tablesDB.listRows({
      databaseId: dbId,
      tableId: oneSimpleApiTableId,
      queries: [
        Query.equal('eventSettingsId', eventSettingsId),
        Query.limit(1),
      ],
    });

    if (oneSimpleApiDocs.rows.length === 0 || !oneSimpleApiDocs.rows[0].enabled) {
      return res.status(400).json({ error: 'OneSimpleAPI integration is not enabled' });
    }

    const oneSimpleApi = oneSimpleApiDocs.rows[0];

    if (!oneSimpleApi.url || !oneSimpleApi.formDataKey || !oneSimpleApi.formDataValue) {
      return res.status(400).json({ error: 'OneSimpleAPI is not properly configured' });
    }

    // Fetch all attendees in parallel
    const fetchResults = await Promise.allSettled(
      attendeeIds.map((id: string) =>
        tablesDB.getRow({
          databaseId: dbId,
          tableId: attendeesTableId,
          rowId: id,
        })
      )
    );
    const allAttendees: any[] = [];
    fetchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        allAttendees.push(result.value);
      } else {
        console.warn(`Attendee ${attendeeIds[idx]} not found`);
      }
    });

    if (allAttendees.length === 0) {
      return res.status(404).json({ error: 'No attendees found for the given IDs' });
    }

    // Check for attendees without credentials
    const attendeesWithoutCredentials = allAttendees.filter((a) => !a.credentialUrl);
    if (attendeesWithoutCredentials.length > 0) {
      return res.status(400).json({
        error: 'Some attendees do not have generated credentials',
        errorType: 'missing_credentials',
        attendeesWithoutCredentials: attendeesWithoutCredentials.map(
          (a) => `${a.firstName} ${a.lastName}`
        ),
      });
    }

    // Check for outdated credentials (same logic as bulk-export-pdf.ts)
    const attendees = allAttendees.filter((a) => a.credentialUrl);
    const attendeesWithOutdatedCredentials = attendees.filter((attendee) => {
      if (!attendee.credentialGeneratedAt) return true;

      const credentialGeneratedAt = new Date(attendee.credentialGeneratedAt);
      const lastSignificantUpdate = attendee.lastSignificantUpdate;

      if (lastSignificantUpdate) {
        const significantUpdateDate = new Date(lastSignificantUpdate);
        const timeDifference =
          credentialGeneratedAt.getTime() - significantUpdateDate.getTime();
        const isCredentialFromSameUpdate = timeDifference >= -5000 && timeDifference <= 0;
        return !(isCredentialFromSameUpdate || credentialGeneratedAt >= significantUpdateDate);
      }

      const updatedAtField = attendee.$updatedAt || attendee.updatedAt;
      if (updatedAtField) {
        const recordUpdatedAt = new Date(updatedAtField);
        const timeDifference =
          credentialGeneratedAt.getTime() - recordUpdatedAt.getTime();
        const isCredentialFromSameUpdate = timeDifference >= -5000 && timeDifference <= 0;
        return !(isCredentialFromSameUpdate || credentialGeneratedAt >= recordUpdatedAt);
      }

      return false;
    });

    if (attendeesWithOutdatedCredentials.length > 0) {
      return res.status(400).json({
        error: 'Some attendees have outdated credentials that need to be regenerated',
        errorType: 'outdated_credentials',
        attendeesWithOutdatedCredentials: attendeesWithOutdatedCredentials.map(
          (a) => `${a.firstName} ${a.lastName}`
        ),
      });
    }

    // Check record template
    if (!oneSimpleApi.recordTemplate) {
      return res.status(400).json({ error: 'OneSimpleAPI record template is not configured' });
    }

    // Build attendee names list (up to 10, rest truncated)
    const attendeeNames = attendees
      .slice(0, 10)
      .map((a) => `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim())
      .filter(Boolean);

    // Use the final filtered attendee IDs (excludes missing/unfound attendees)
    const finalAttendeeIds = attendees.map((a) => a.$id);

    // Create the pdf_jobs row
    const jobId = ID.unique();
    await tablesDB.createRow({
      databaseId: dbId,
      tableId: pdfJobsTableId,
      rowId: jobId,
      data: {
        status: 'pending',
        attendeeIds: JSON.stringify(finalAttendeeIds),
        attendeeCount: finalAttendeeIds.length,
        attendeeNames: JSON.stringify(attendeeNames),
        requestedBy: user.$id,
        eventSettingsId,
      },
    });

    // Trigger the Appwrite Function asynchronously using admin client (requires API key permissions)
    try {
      const { functions: adminFunctions } = createAdminClient();
      await adminFunctions.createExecution({
        functionId,
        body: JSON.stringify({ jobId, eventSettingsId, databaseId: dbId }),
        async: true,
      });
    } catch (execError: any) {
      // Update job to failed and return 500
      await tablesDB.updateRow({
        databaseId: dbId,
        tableId: pdfJobsTableId,
        rowId: jobId,
        data: {
          status: 'failed',
          error: `Failed to trigger PDF worker: ${execError?.message || 'Unknown error'}`,
        },
      });
      return res.status(500).json({ error: 'Failed to start PDF generation' });
    }

    // Activity log: PDF export started
    try {
      const loggingEnabled = await shouldLog('pdfExportCreate');
      if (loggingEnabled) {
        const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!;
        const nameList = attendeeNames.slice(0, 3).join(', ');
        const remaining = attendees.length - Math.min(3, attendeeNames.length);
        const description = `Started PDF export for ${attendees.length} attendee${attendees.length !== 1 ? 's' : ''}` +
          (attendeeNames.length > 0 ? ` including ${nameList}${remaining > 0 ? ` and ${remaining} more` : ''}` : '');
        await tablesDB.createRow({
          databaseId: dbId,
          tableId: logsTableId,
          rowId: ID.unique(),
          data: {
            userId: user.$id,
            action: 'export',
            details: JSON.stringify({
              type: 'system',
              target: 'PDF Export',
              description,
              jobId,
              attendeeCount: attendees.length,
              eventSettingsId,
            }),
          },
        });
      }
    } catch (logError: any) {
      console.error('[bulk-export-pdf-start] Failed to write activity log:', logError.message);
    }

    return res.status(202).json({ jobId });
  } catch (error: any) {
    console.error('Error starting bulk PDF export:', error);

    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    return res.status(500).json({
      error: 'Failed to start PDF export',
      details: error.message,
    });
  }
});
