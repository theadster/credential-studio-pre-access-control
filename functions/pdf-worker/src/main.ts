import { Client, TablesDB, Query } from 'node-appwrite';
import { buildPdfHtml, parseOneSimpleApiResponse, TemplateContext } from './lib/pdfTemplateBuilder';

// Exported for testing — accepts an injected tablesDB so tests can mock it directly
export async function runWorker(
  { req, res, log, error }: any,
  tablesDB: any
): Promise<any> {
  const attendeesTableId = process.env.ATTENDEES_TABLE_ID!;
  const eventSettingsTableId = process.env.EVENT_SETTINGS_TABLE_ID!;
  const oneSimpleApiTableId = process.env.ONESIMPLEAPI_TABLE_ID!;
  const customFieldsTableId = process.env.CUSTOM_FIELDS_TABLE_ID!;
  const pdfJobsTableId = process.env.PDF_JOBS_TABLE_ID!;
  // Default to env var; overridden per-request when databaseId is passed in the body
  let databaseId = process.env.DATABASE_ID!;

  async function markJobFailed(jobId: string, errorMsg: string): Promise<void> {
    await tablesDB.updateRow({
      databaseId,
      tableId: pdfJobsTableId,
      rowId: jobId,
      data: { status: 'failed', error: errorMsg },
    });
  }

  let jobId: string | undefined;

  try {
    // 1. Parse request body to get jobId, eventSettingsId, and optional databaseId
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    jobId = body?.jobId as string;
    const eventSettingsId = body?.eventSettingsId as string;
    // databaseId can be passed per-request to support a single function serving
    // multiple sites/databases. Falls back to the DATABASE_ID env var (set above).
    databaseId = (body?.databaseId as string | undefined) || process.env.DATABASE_ID!;

    if (!jobId || !eventSettingsId) {
      error('Missing jobId or eventSettingsId in request body');
      return res.json({ ok: false, error: 'Missing jobId or eventSettingsId' }, 400);
    }

    log(`PDF Worker started for job ${jobId}`);

    // 2. Update job status to processing
    await tablesDB.updateRow({
      databaseId,
      tableId: pdfJobsTableId,
      rowId: jobId,
      data: { status: 'processing' },
    });

    // 3. Read the job record to get attendeeIds
    const jobRow = await tablesDB.getRow({
      databaseId,
      tableId: pdfJobsTableId,
      rowId: jobId,
    });

    const attendeeIds: string[] = (() => {
      if (typeof jobRow.attendeeIds !== 'string') {
        throw new Error(`attendeeIds is not a string for job ${jobId}: ${JSON.stringify(jobRow.attendeeIds)}`);
      }
      try {
        return JSON.parse(jobRow.attendeeIds);
      } catch (parseErr: any) {
        throw new Error(`Failed to parse attendeeIds for job ${jobId} (raw: ${jobRow.attendeeIds}): ${parseErr?.message ?? String(parseErr)}`);
      }
    })();

    // 4. Fetch event settings row
    const eventSettings = await tablesDB.getRow({
      databaseId,
      tableId: eventSettingsTableId,
      rowId: eventSettingsId,
    });

    // 5. Fetch OneSimpleAPI config row (query by eventSettingsId, check enabled)
    const oneSimpleApiResult = await tablesDB.listRows({
      databaseId,
      tableId: oneSimpleApiTableId,
      queries: [Query.equal('eventSettingsId', eventSettingsId), Query.limit(1)],
    });

    if (!oneSimpleApiResult.rows || oneSimpleApiResult.rows.length === 0) {
      await markJobFailed(jobId, 'OneSimpleAPI integration not found or disabled');
      return res.json({ ok: false, error: 'OneSimpleAPI integration not found or disabled' });
    }

    const oneSimpleApi = oneSimpleApiResult.rows[0];

    if (!oneSimpleApi.enabled) {
      await markJobFailed(jobId, 'OneSimpleAPI integration not found or disabled');
      return res.json({ ok: false, error: 'OneSimpleAPI integration not found or disabled' });
    }

    // 6. Fetch custom fields (up to 100)
    const customFieldsResult = await tablesDB.listRows({
      databaseId,
      tableId: customFieldsTableId,
      queries: [Query.equal('eventSettingsId', eventSettingsId), Query.limit(100)],
    });

    // 7. Fetch all attendees by their IDs
    const attendees: any[] = [];
    const missingAttendeeIds: string[] = [];
    for (const attendeeId of attendeeIds) {
      try {
        const attendee = await tablesDB.getRow({
          databaseId,
          tableId: attendeesTableId,
          rowId: attendeeId,
        });
        attendees.push(attendee);
      } catch (fetchErr: any) {
        log(`Attendee ${attendeeId} could not be fetched (skipped): ${fetchErr?.message ?? String(fetchErr)}`);
        missingAttendeeIds.push(attendeeId);
      }
    }

    if (missingAttendeeIds.length > 0) {
      log(`Warning: ${missingAttendeeIds.length} attendee(s) skipped (not found or inaccessible): ${missingAttendeeIds.join(', ')}`);
    }

    if (attendees.length === 0) {
      await markJobFailed(jobId, `No attendees could be fetched. Missing IDs: ${missingAttendeeIds.join(', ')}`);
      return res.json({ ok: false, error: 'No attendees could be fetched' });
    }

    // 8. Build customFieldsMap as Map<string, any> from custom fields rows
    const customFieldsMap = new Map<string, any>();
    for (const field of customFieldsResult.rows ?? []) {
      customFieldsMap.set(field.$id, field);
    }

    // 9. Call buildPdfHtml() with TemplateContext
    const context: TemplateContext = {
      attendees,
      eventSettings,
      customFieldsMap,
      recordTemplate: oneSimpleApi.recordTemplate as string,
      mainTemplate: oneSimpleApi.formDataValue as string,
      siteUrl: process.env.SITE_URL ?? '',
    };

    const finalHtml = buildPdfHtml(context);

    // 10. POST the generated HTML to OneSimpleAPI endpoint using FormData
    const formData = new FormData();
    formData.append(oneSimpleApi.formDataKey as string, finalHtml);

    const apiResponse = await fetch(oneSimpleApi.url as string, {
      method: 'POST',
      body: formData,
    });

    // 11. Check response status — if not ok, mark job failed
    if (!apiResponse.ok) {
      const errMsg = `OneSimpleAPI returned error: ${apiResponse.status} ${apiResponse.statusText}`;
      await markJobFailed(jobId, errMsg);
      return res.json({ ok: false, error: errMsg });
    }

    // 12. Read response text and call parseOneSimpleApiResponse
    const responseText = await apiResponse.text();
    const parsed = parseOneSimpleApiResponse(responseText);

    // 13. If result has error, mark job failed
    if ('error' in parsed) {
      await markJobFailed(jobId, 'OneSimpleAPI response is not a valid URL');
      return res.json({ ok: false, error: 'OneSimpleAPI response is not a valid URL' });
    }

    // 14. If result has url, update job to completed with pdfUrl
    await tablesDB.updateRow({
      databaseId,
      tableId: pdfJobsTableId,
      rowId: jobId,
      data: { status: 'completed', pdfUrl: parsed.url },
    });

    log(`PDF Worker completed for job ${jobId}, pdfUrl: ${parsed.url}`);
    return res.json({ ok: true, pdfUrl: parsed.url });

  } catch (err: any) {
    // 15. Wrap entire execution in try/catch — any unhandled error updates job to failed
    const errMsg = `Unexpected error: ${err?.message ?? String(err)}`;
    error(`PDF Worker error: ${errMsg}`);

    if (jobId) {
      try {
        await markJobFailed(jobId, errMsg);
      } catch (updateErr: any) {
        error(`Failed to mark job as failed: ${updateErr?.message ?? String(updateErr)}`);
      }
    }

    return res.json({ ok: false, error: errMsg }, 500);
  }
}

// Appwrite Function runtime entry point — creates its own tablesDB from env vars
export default async (ctx: any) => {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;

  const missing = [
    !endpoint && 'APPWRITE_ENDPOINT',
    !projectId && 'APPWRITE_PROJECT_ID',
    !apiKey && 'APPWRITE_API_KEY',
  ].filter(Boolean);

  if (missing.length > 0) {
    ctx.error(`PDF Worker misconfigured: missing required env vars: ${missing.join(', ')}`);
    return ctx.res.json({ ok: false, error: `Missing required env vars: ${missing.join(', ')}` }, 500);
  }

  const client = new Client()
    .setEndpoint(endpoint!)
    .setProject(projectId!)
    .setKey(apiKey!);

  const tablesDB = new TablesDB(client);
  return runWorker(ctx, tablesDB);
};
