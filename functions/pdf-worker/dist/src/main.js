"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWorker = runWorker;
const node_appwrite_1 = require("node-appwrite");
const pdfTemplateBuilder_1 = require("./lib/pdfTemplateBuilder");
// Exported for testing — accepts an injected tablesDB so tests can mock it directly
async function runWorker({ req, res, log, error }, tablesDB) {
    const databaseId = process.env.DATABASE_ID;
    const attendeesTableId = process.env.ATTENDEES_TABLE_ID;
    const eventSettingsTableId = process.env.EVENT_SETTINGS_TABLE_ID;
    const oneSimpleApiTableId = process.env.ONESIMPLEAPI_TABLE_ID;
    const customFieldsTableId = process.env.CUSTOM_FIELDS_TABLE_ID;
    const pdfJobsTableId = process.env.PDF_JOBS_TABLE_ID;
    async function markJobFailed(jobId, errorMsg) {
        await tablesDB.updateRow({
            databaseId,
            tableId: pdfJobsTableId,
            rowId: jobId,
            data: { status: 'failed', error: errorMsg },
        });
    }
    let jobId;
    try {
        // 1. Parse request body to get jobId and eventSettingsId
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        jobId = body?.jobId;
        const eventSettingsId = body?.eventSettingsId;
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
        const attendeeIds = JSON.parse(jobRow.attendeeIds);
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
            queries: [node_appwrite_1.Query.equal('eventSettingsId', eventSettingsId), node_appwrite_1.Query.limit(1)],
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
            queries: [node_appwrite_1.Query.equal('eventSettingsId', eventSettingsId), node_appwrite_1.Query.limit(100)],
        });
        // 7. Fetch all attendees by their IDs
        const attendees = [];
        for (const attendeeId of attendeeIds) {
            const attendee = await tablesDB.getRow({
                databaseId,
                tableId: attendeesTableId,
                rowId: attendeeId,
            });
            attendees.push(attendee);
        }
        // 8. Build customFieldsMap as Map<string, any> from custom fields rows
        const customFieldsMap = new Map();
        for (const field of customFieldsResult.rows ?? []) {
            customFieldsMap.set(field.$id, field);
        }
        // 9. Call buildPdfHtml() with TemplateContext
        const context = {
            attendees,
            eventSettings,
            customFieldsMap,
            recordTemplate: oneSimpleApi.recordTemplate,
            mainTemplate: oneSimpleApi.formDataValue,
            siteUrl: process.env.SITE_URL ?? '',
        };
        const finalHtml = (0, pdfTemplateBuilder_1.buildPdfHtml)(context);
        // 10. POST the generated HTML to OneSimpleAPI endpoint using FormData
        const formData = new FormData();
        formData.append(oneSimpleApi.formDataKey, finalHtml);
        const apiResponse = await fetch(oneSimpleApi.url, {
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
        const parsed = (0, pdfTemplateBuilder_1.parseOneSimpleApiResponse)(responseText);
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
    }
    catch (err) {
        // 15. Wrap entire execution in try/catch — any unhandled error updates job to failed
        const errMsg = `Unexpected error: ${err?.message ?? String(err)}`;
        error(`PDF Worker error: ${errMsg}`);
        if (jobId) {
            try {
                await markJobFailed(jobId, errMsg);
            }
            catch (updateErr) {
                error(`Failed to mark job as failed: ${updateErr?.message ?? String(updateErr)}`);
            }
        }
        return res.json({ ok: false, error: errMsg }, 500);
    }
}
// Appwrite Function runtime entry point — creates its own tablesDB from env vars
exports.default = async (ctx) => {
    const client = new node_appwrite_1.Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT ?? '')
        .setProject(process.env.APPWRITE_PROJECT_ID ?? '')
        .setKey(process.env.APPWRITE_API_KEY ?? '');
    const tablesDB = new node_appwrite_1.TablesDB(client);
    return runWorker(ctx, tablesDB);
};
