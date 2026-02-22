---
title: Async PDF Generation Guide
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-21
review_interval_days: 90
related_code:
  - src/pages/api/attendees/bulk-export-pdf-start.ts
  - src/pages/api/attendees/pdf-job-status.ts
  - src/pages/api/pdf-jobs/list.ts
  - src/pages/api/pdf-jobs/delete.ts
  - functions/pdf-worker/src/main.ts
  - src/lib/pdfTemplateBuilder.ts
  - src/lib/logSettings.ts
  - src/pages/dashboard.tsx
  - src/components/PdfGenerationToast.tsx
  - src/components/ExportsTab.tsx
---

# Async PDF Generation Guide

## Overview

Bulk PDF export runs asynchronously via an Appwrite Function to avoid hosting platform timeouts (e.g. Netlify's ~26s limit). For large exports, OneSimpleAPI can take 60-120+ seconds — the async pattern keeps the Next.js API routes fast and delegates the heavy work to a long-running function (up to 15 minutes).

## How It Works

### Flow Summary

```
User clicks "Export PDFs"
  -> POST /api/attendees/bulk-export-pdf-start
      -> Validates request (auth, permissions, credentials, config)
      -> Creates pdf_jobs row (status: pending)
      -> Triggers PDF Worker Appwrite Function (async)
      -> Returns 202 { jobId }
  -> Dashboard shows progress modal, polls every 3s
      -> GET /api/attendees/pdf-job-status?jobId=xxx
          -> Returns { status, pdfUrl, error, attendeeCount }
  -> On completed: opens PDF in new tab
  -> On failed: shows error from job record
  -> After 10 minutes: stops polling, shows timeout message
```

### Components

**Start Endpoint** — `src/pages/api/attendees/bulk-export-pdf-start.ts`

Thin POST route that validates and kicks off the job. Completes in under 10 seconds.

- Requires `bulkGeneratePDFs` permission
- Validates: non-empty attendeeIds, OneSimpleAPI enabled + configured, all attendees have current credentials, record template set
- Creates a `pdf_jobs` row with `status: pending`
- Calls `functions.createExecution({ async: true })` to trigger the worker
- If the function trigger fails, marks the job `failed` and returns 500
- Returns `202 { jobId }` on success

**Status Endpoint** — `src/pages/api/attendees/pdf-job-status.ts`

Simple GET route. Reads one row from `pdf_jobs`, verifies the requesting user owns the job (`requestedBy === req.user.$id`), and returns its state.

Returns: `{ status, pdfUrl, error, attendeeCount }`

**List Jobs Endpoint** — `src/pages/api/pdf-jobs/list.ts`

GET route that returns a paginated list of PDF jobs ordered newest-first. Powers the Exports tab.

Query params: `eventSettingsId` (optional filter), `limit` (default 50), `offset` (default 0)

Returns: `{ jobs: PdfJob[], total: number }`

**PDF Worker** — `functions/pdf-worker/src/main.ts`

Appwrite Function (Node.js runtime) that does the actual work:

1. Updates job to `processing`
2. Reads job record to get `attendeeIds`
3. Fetches attendees, event settings, OneSimpleAPI config, custom fields
4. Builds HTML using `buildPdfHtml()` from the shared template builder
5. POSTs HTML to OneSimpleAPI
6. Parses response (JSON `{ url }` or plain-text URL)
7. Updates job to `completed` with `pdfUrl`, or `failed` with error message
8. Any unhandled exception also marks the job `failed`

**PDF Template Builder** — `src/lib/pdfTemplateBuilder.ts`

Shared module used by both the old sync route and the worker. Exports:
- `buildPdfHtml(context: TemplateContext): string`
- `escapeHtml`, `absolutizeUrl`, `replacePlaceholders`, `buildRecordHtml`
- `parseOneSimpleApiResponse` — handles JSON `{ url }` or plain-text URL responses

**Dashboard Polling** — `src/pages/dashboard.tsx` (`handleBulkExportPdf`)

- Calls Start Endpoint, receives `jobId`
- Shows a non-blocking `PdfGenerationToast` (`src/components/PdfGenerationToast.tsx`) in the bottom-right corner — user can keep working while the PDF generates
- Polls Status Endpoint every 3 seconds
- On `completed`: opens PDF URL in new tab, toast updates to show an "Open PDF" link (stays visible until dismissed)

> **Note on popup blockers:** `window.open` called from a polling callback (not a direct user gesture) may be blocked by browsers. The `PdfGenerationToast` component always shows an "Open PDF" anchor link as a fallback, so users can open the PDF manually even if the automatic `window.open` is suppressed.
- On `failed`: toast updates to show the error message from the job record
- After 10 minutes: polling stops, toast updates to show a timeout message
- Toast is dismissed manually via the X button (only available once generation is no longer in progress)

**Exports Tab** — `src/components/ExportsTab.tsx`

Dashboard tab that gives users a full history of all PDF exports for the current event.

- Fetches jobs from the List Jobs Endpoint on mount, filtered by `eventSettingsId`
- Shows 4 stat cards: Total Exports, Completed, In Progress, Failed
- Lists each job with status badge, attendee count, timestamp, relative time, and error message if failed
- Shows up to 10 attendee name pills per job row, with "+N more" overflow label
- Completed jobs show a Download button that opens the PDF in a new tab
- Each job row has a Delete button (trash icon) with an `AlertDialog` confirmation — calls `DELETE /api/pdf-jobs/delete?jobId=xxx` and removes the row optimistically on success
- Auto-refreshes every 5 seconds while any job is `pending` or `processing`, then stops
- Accessible via the "Exports" sidebar nav item in the dashboard

## Activity Logging

PDF export actions are recorded in the activity log and respect the log settings toggles.

| Event | Log action | Setting key | Description |
|-------|-----------|-------------|-------------|
| PDF export started | `export` | `pdfExportCreate` | Logged after the job row is created and the worker is triggered successfully. Includes job ID, attendee count, and up to 3 sample names. |
| PDF export record deleted | `delete` | `pdfExportDelete` | Logged after the job row is removed from the Exports tab. Includes the job ID. |

Both settings default to `true`. They can be toggled in the log settings like any other activity log category.

### Job State Machine

```
pending -> processing -> completed
                      -> failed
pending -> failed  (if function trigger fails)
```

## Setup

### 1. Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_APPWRITE_DATABASE_ID=credentialstudio
NEXT_PUBLIC_APPWRITE_PDF_JOBS_TABLE_ID=pdf_jobs
NEXT_PUBLIC_APPWRITE_PDF_WORKER_FUNCTION_ID=<your_function_id>
```

### 2. Create the pdf_jobs Table

Run the Appwrite setup script to create the table:

```bash
npm run setup:appwrite
```

The `pdf_jobs` table has these columns:

| Column | Type | Notes |
|--------|------|-------|
| `status` | varchar(20) | `pending`, `processing`, `completed`, `failed` |
| `pdfUrl` | varchar(2048) | Set on completion |
| `error` | varchar(2048) | Set on failure |
| `attendeeIds` | varchar(65535) | JSON-serialized array of IDs |
| `attendeeCount` | integer | Number of attendees |
| `requestedBy` | varchar(255) | User ID |
| `eventSettingsId` | varchar(255) | Event settings row ID |

### 3. Deploy the Appwrite Function

The function lives in `functions/pdf-worker/`. Build and deploy it to Appwrite:

```bash
cd functions/pdf-worker
npm install
npm run build
```

Then deploy via the Appwrite Console or CLI.

### 4. Configure Function Environment Variables

In the Appwrite Console under your function's settings, set:

```
APPWRITE_ENDPOINT        = https://nyc.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID      = <your_project_id>
APPWRITE_API_KEY         = <server_api_key_with_db_read_write>
DATABASE_ID              = credentialstudio
ATTENDEES_TABLE_ID       = attendees
EVENT_SETTINGS_TABLE_ID  = event_settings
ONESIMPLEAPI_TABLE_ID    = onesimpleapi_integrations
CUSTOM_FIELDS_TABLE_ID   = custom_fields
PDF_JOBS_TABLE_ID        = pdf_jobs
SITE_URL                 = https://your-site.com
```

The API key needs read/write access to the database. Generate one in Appwrite Console > Settings > API Keys.

## Multi-Site Support

A single deployed PDF worker function can serve multiple sites and databases. No per-site function deployments are needed.

### How it works

The Start Endpoint passes `databaseId` in the function trigger body:

```json
{ "jobId": "...", "eventSettingsId": "...", "databaseId": "credentialstudio" }
```

The worker reads `databaseId` from the body and uses it for all database operations, falling back to the `DATABASE_ID` env var if not provided (backwards compatible).

### Security

The Start Endpoint validates any incoming `databaseId` against `NEXT_PUBLIC_APPWRITE_DATABASE_ID` before passing it to the function. A mismatched value returns `403 Forbidden`. This means:

- Clients cannot redirect the function to a foreign database
- The function env var `DATABASE_ID` acts as a fallback default only
- Each site's Next.js deployment enforces its own database boundary server-side

> **Note:** `NEXT_PUBLIC_APPWRITE_DATABASE_ID` is a publicly-exposed value (visible in the browser bundle). The `databaseId` check is a defence-in-depth measure to prevent accidental cross-database requests — it is not a security boundary against a determined attacker who can read the public env var. The primary security enforcement is Appwrite's own API key permissions and row-level ownership checks (`requestedBy`).

### Setup for multiple sites

1. Deploy the function once — no changes needed per site
2. Each site's `.env.local` sets its own `NEXT_PUBLIC_APPWRITE_DATABASE_ID`
3. The function's `DATABASE_ID` env var can be set to any valid database (used as fallback only)
4. The function's API key must have read/write access to all databases it will serve

## Testing

Run the integration tests:

```bash
npx vitest --run src/__tests__/integration/async-pdf-generation.test.ts
```

Run all related tests:

```bash
npx vitest --run --reporter=verbose src/__tests__/lib/pdfTemplateBuilder
npx vitest --run --reporter=verbose src/__tests__/api/attendees/bulk-export-pdf-start
npx vitest --run --reporter=verbose src/__tests__/api/attendees/pdf-job-status
npx vitest --run --reporter=verbose src/__tests__/functions/pdf-worker
```

## Error Reference

| Scenario | What Happens |
|----------|-------------|
| Missing credentials | Start Endpoint returns 400 with `errorType: missing_credentials` and list of names |
| Outdated credentials | Start Endpoint returns 400 with `errorType: outdated_credentials` and list of names |
| OneSimpleAPI not enabled | Start Endpoint returns 400 |
| Function trigger fails | Job marked `failed`, client gets 500 |
| Worker: OneSimpleAPI non-200 | Job marked `failed` with status code in error |
| Worker: invalid response | Job marked `failed` with "not a valid URL" message |
| Worker: unhandled exception | Job marked `failed` with exception message |
| Poll timeout (10 min) | Polling stops, user sees timeout message |
| User closes modal | Polling stops silently |
