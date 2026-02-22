---
title: Async PDF Worker — Appwrite Function Implementation
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-21
review_interval_days: 90
related_code:
  - functions/pdf-worker/src/main.ts
  - functions/pdf-worker/package.json
  - functions/pdf-worker/tsconfig.json
  - src/lib/pdfTemplateBuilder.ts
  - src/pages/api/attendees/bulk-export-pdf-start.ts
  - src/pages/api/attendees/pdf-job-status.ts
  - src/pages/dashboard.tsx
  - src/__tests__/functions/pdf-worker.test.ts
  - src/__tests__/functions/pdf-worker.property.test.ts
  - src/__tests__/components/dashboard-pdf-polling.test.tsx
  - src/__tests__/integration/async-pdf-generation.test.ts
---

# Async PDF Worker — Appwrite Function Implementation

## Overview

Replaces the synchronous bulk PDF export (which timed out at ~26s on Netlify) with an async job pattern. The dashboard starts a job, polls for status, and opens the PDF when ready. The Appwrite Function handles the long-running work with up to 15 minutes of execution time.

## Architecture

```
Dashboard         → POST /api/attendees/bulk-export-pdf-start
                    → receives { jobId }, shows progress modal
                    → polls /api/attendees/pdf-job-status?jobId=xxx every 3s
                    → on completed: opens pdfUrl in new tab
                    → on failed: shows error message

Start Endpoint    → validates permissions, attendees, OneSimpleAPI config
                  → creates pdf_jobs row (status: pending)
                  → triggers PDF Worker (async: true)
                  → returns 202 { jobId }

PDF Worker        → sets status: processing
                  → fetches attendees, event settings, OneSimpleAPI config, custom fields
                  → builds HTML via buildPdfHtml() from bundled pdfTemplateBuilder
                  → POSTs HTML to OneSimpleAPI
                  → sets status: completed (pdfUrl) or failed (error)

Status Endpoint   → GET /api/attendees/pdf-job-status?jobId=xxx
                  → returns { status, pdfUrl, error, attendeeCount }
```

## Key Files

| File | Purpose |
|------|---------|
| `functions/pdf-worker/src/main.ts` | Appwrite Function entry point; exports `runWorker(ctx, tablesDB)` for testability |
| `functions/pdf-worker/package.json` | `prebuild` copies `pdfTemplateBuilder.ts` into worker src; `build` runs `tsc` |
| `src/lib/pdfTemplateBuilder.ts` | Shared template logic: `buildPdfHtml()`, `parseOneSimpleApiResponse()`, helpers |
| `src/pages/api/attendees/bulk-export-pdf-start.ts` | Start Endpoint — validates, creates job, triggers function, returns 202 |
| `src/pages/api/attendees/pdf-job-status.ts` | Status Endpoint — reads job row, returns status fields |
| `src/pages/dashboard.tsx` | Dashboard polling logic via `pdfPollingIntervalRef` + `stopPdfPolling` |

## Dashboard Polling Pattern

`handleBulkExportPdf` in `dashboard.tsx`:
1. POST to start endpoint → get `jobId`
2. Show indeterminate progress modal
3. `setInterval` every 3s → GET status endpoint
4. `completed` → `window.open(pdfUrl)`, close modal
5. `failed` → show error, close modal
6. Modal close → `stopPdfPolling()` clears interval
7. 10-minute timeout → stop polling, show timeout message

Existing validation error dialogs (missing credentials, outdated credentials, permission denied) are preserved from the start endpoint response.

## Shared Template Builder Bundling

`functions/pdf-worker/package.json` has a `prebuild` script that copies `../../src/lib/pdfTemplateBuilder.ts` into `functions/pdf-worker/src/lib/` before `tsc` runs. The worker imports from `'./lib/pdfTemplateBuilder'` (local copy). This avoids any runtime path resolution issues in the Appwrite Function environment.

## Environment Variables (set in Appwrite Console)

| Variable | Description |
|----------|-------------|
| `APPWRITE_ENDPOINT` | Appwrite API endpoint |
| `APPWRITE_PROJECT_ID` | Appwrite project ID |
| `APPWRITE_API_KEY` | Server API key |
| `DATABASE_ID` | Database ID |
| `ATTENDEES_TABLE_ID` | Attendees table ID |
| `EVENT_SETTINGS_TABLE_ID` | Event settings table ID |
| `ONESIMPLEAPI_TABLE_ID` | OneSimpleAPI integrations table ID |
| `CUSTOM_FIELDS_TABLE_ID` | Custom fields table ID |
| `PDF_JOBS_TABLE_ID` | PDF jobs table ID |
| `SITE_URL` | Base URL for absolutizing relative credential/photo URLs |

Next.js env vars also required: `NEXT_PUBLIC_APPWRITE_PDF_JOBS_TABLE_ID`, `NEXT_PUBLIC_APPWRITE_PDF_WORKER_FUNCTION_ID`.

## Job Status Flow

`pending` → `processing` → `completed` (pdfUrl set)
                        → `failed` (error set)

Any unhandled exception in the worker is caught and marks the job `failed`.

## Tests

| File | Coverage |
|------|---------|
| `src/__tests__/functions/pdf-worker.test.ts` | 9 unit tests — all status transitions, error paths, 404 handling |
| `src/__tests__/functions/pdf-worker.property.test.ts` | 5 property-based tests (Properties 1–3, 10, 11) with 100+ iterations |
| `src/__tests__/components/dashboard-pdf-polling.test.tsx` | 10 unit tests — polling logic via `usePdfPollingLogic` hook harness, fake timers |
| `src/__tests__/integration/async-pdf-generation.test.ts` | 15 integration tests — full happy path, error path, trigger failure, TablesDB compliance |

The worker exports `runWorker(ctx, tablesDB)` with injected tablesDB to enable direct testing without `node-appwrite` module mocks. Integration tests mock both `@/lib/pdfTemplateBuilder` and `../../../functions/pdf-worker/src/lib/pdfTemplateBuilder` to intercept the worker's bundled copy.
