# Implementation Plan: Async PDF Generation

## Overview

This plan migrates the synchronous bulk PDF export into an asynchronous job pattern. The work is split into: extracting shared template logic, creating the `pdf_jobs` table, building the Start and Status API endpoints, implementing the Appwrite Function PDF Worker, and updating the dashboard client to use a start-then-poll flow. All TablesDB operations use named object parameters exclusively.

## Tasks

- [x] 1. Extract shared PDF template builder module
  - [x] 1.1 Create `src/lib/pdfTemplateBuilder.ts` with extracted template logic
    - Extract `escapeHtml()`, `absolutizeUrl()`, `replacePlaceholders()`, `buildRecordHtml()`, and `buildPdfHtml()` from `src/pages/api/attendees/bulk-export-pdf.ts`
    - Define and export the `TemplateContext` interface
    - Export a `parseOneSimpleApiResponse()` helper that handles both JSON `{ url }` and plain-text URL responses
    - All functions must be pure and independently testable
    - _Requirements: 3.4, 3.6, 3.8_

  - [x] 1.2 Write unit tests for `pdfTemplateBuilder`
    - Create `src/__tests__/lib/pdfTemplateBuilder.test.ts`
    - Test `escapeHtml` with special characters (`& < > " '`), empty strings, and strings without special chars
    - Test `absolutizeUrl` with relative paths, already-absolute URLs, edge cases (double slashes, empty base)
    - Test `replacePlaceholders` with normal placeholders, HTML-escaped placeholder variants, missing placeholders
    - Test `buildRecordHtml` with a full attendee record including custom fields
    - Test `buildPdfHtml` composing multiple records into a main template
    - Test `parseOneSimpleApiResponse` with JSON `{ url }`, plain text URL, invalid JSON, missing URL field
    - _Requirements: 3.4, 3.6, 3.8_

  - [x] 1.3 Write property-based tests for `pdfTemplateBuilder`
    - Create `src/__tests__/lib/pdfTemplateBuilder.property.test.ts` using `fast-check`
    - **Property 6: HTML template placeholder replacement** — for arbitrary field values and templates with `{{placeholder}}` tokens, `buildRecordHtml` output contains no unreplaced tokens and all values appear (HTML-escaped)
    - **Validates: Requirement 3.4**
    - **Property 7: HTML escaping correctness** — for any string with HTML special chars, `escapeHtml` replaces all special chars with entities; escaped output contains no raw special chars
    - **Validates: Requirement 3.4**
    - **Property 8: URL absolutization** — relative URLs get base URL prepended; absolute URLs (`http://`, `https://`) pass through unchanged
    - **Validates: Requirement 3.4**
    - **Property 9: OneSimpleAPI response parsing** — valid JSON with `url` field extracts URL; plain text HTTP(S) URL returns as-is; invalid input indicates failure
    - **Validates: Requirements 3.6, 3.8**
    - **Property 12: attendeeIds JSON round-trip** — serializing an array of string IDs to JSON and deserializing produces the original array
    - **Validates: Requirements 1.1, 3.2**
    - Run minimum 100 iterations per property
    - _Requirements: 1.1, 3.2, 3.4, 3.6, 3.8_

- [x] 2. Checkpoint — Ensure all template builder tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Set up `pdf_jobs` table and environment variables
  - [x] 3.1 Update the Appwrite setup script to create the `pdf_jobs` table
    - Add table creation with columns: `status` (varchar 20, required, default `'pending'`), `pdfUrl` (varchar 2048, optional), `error` (varchar 2048, optional), `attendeeIds` (varchar 65535, required), `attendeeCount` (integer, required, default 0), `requestedBy` (varchar 255, required), `eventSettingsId` (varchar 255, required)
    - Use `tablesDB.createVarcharColumn` / `tablesDB.createIntegerColumn` with named object parameters and `xdefault` for defaults
    - _Requirements: 1.1_

  - [x] 3.2 Add new environment variables to `.env.example`
    - Add `NEXT_PUBLIC_APPWRITE_PDF_JOBS_TABLE_ID` (client-accessible, needed for polling UI) and `NEXT_PUBLIC_APPWRITE_PDF_WORKER_FUNCTION_ID` (also `NEXT_PUBLIC_` for consistency, but note this value is publicly exposed in the browser bundle — do not rely on its secrecy)
    - Document the Appwrite Function env vars in a comment block: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `DATABASE_ID`, `ATTENDEES_TABLE_ID`, `EVENT_SETTINGS_TABLE_ID`, `ONESIMPLEAPI_TABLE_ID`, `CUSTOM_FIELDS_TABLE_ID`, `PDF_JOBS_TABLE_ID`, `SITE_URL`
    - _Requirements: 1.1, 6.3_

- [x] 4. Fix positional parameters in existing `bulk-export-pdf.ts`
  - Migrate the `customFieldsDocs` call from positional parameters (`tablesDB.listRows(dbId, customFieldsTableId, [...])`) to named object parameters (`tablesDB.listRows({ databaseId, tableId, queries })`)
  - Verify no other positional parameter calls remain in the file
  - _Requirements: 8.1_

- [x] 5. Implement the Start Endpoint
  - [x] 5.1 Create `src/pages/api/attendees/bulk-export-pdf-start.ts`
    - Use `withAuth` middleware and `createSessionClient` for authentication
    - Check `bulkGeneratePDFs` permission from `userProfile.role.permissions`
    - Validate `attendeeIds` non-empty array
    - Fetch and validate event settings, OneSimpleAPI integration (enabled, configured, record template present)
    - Fetch all attendees, check for missing credentials and outdated credentials (same logic as existing `bulk-export-pdf.ts`)
    - On validation pass: create `pdf_jobs` row with `tablesDB.createRow({ databaseId, tableId, rowId: ID.unique(), data: { status: 'pending', ... } })`
    - Trigger Appwrite Function with `functions.createExecution({ functionId, body: JSON.stringify({ jobId, eventSettingsId }), async: true })`
    - If `createExecution` fails: update job to `failed` via `tablesDB.updateRow({ databaseId, tableId, rowId, data })` and return error
    - Return HTTP 202 with `{ jobId }`
    - All TablesDB operations use named object parameters
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.4, 7.1, 8.1_

  - [x] 5.2 Write unit tests for the Start Endpoint
    - Create `src/__tests__/api/attendees/bulk-export-pdf-start.test.ts`
    - Mock `createSessionClient` to return mocked `tablesDB` and `functions`
    - Test: unauthenticated request returns 401
    - Test: missing `bulkGeneratePDFs` permission returns 403
    - Test: empty `attendeeIds` returns 400
    - Test: event settings not configured returns 400
    - Test: OneSimpleAPI not enabled returns 400
    - Test: OneSimpleAPI not properly configured returns 400
    - Test: record template not configured returns 400
    - Test: attendees without credentials returns 400 with `errorType: 'missing_credentials'`
    - Test: attendees with outdated credentials returns 400 with `errorType: 'outdated_credentials'`
    - Test: happy path creates job, triggers function, returns 202 with `jobId`
    - Test: function trigger failure updates job to `failed` and returns 500
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1_

  - [x] 5.3 Write property-based tests for the Start Endpoint
    - Create `src/__tests__/api/attendees/bulk-export-pdf-start.property.test.ts` using `fast-check`
    - **Property 4: Invalid inputs produce errors without job creation** — for any invalid request (empty attendeeIds, missing permissions, disabled OneSimpleAPI, missing credentials, outdated credentials, missing record template), endpoint returns HTTP error and no `pdf_jobs` row is created
    - **Validates: Requirements 2.1, 2.4**
    - **Property 5: Valid inputs produce a pending job and HTTP 202** — for any valid request (authenticated, permitted, non-empty attendeeIds with current credentials, OneSimpleAPI enabled and configured), endpoint returns 202 with jobId and a `pdf_jobs` row exists with status `pending`
    - **Validates: Requirements 2.2, 2.3**
    - Run minimum 100 iterations per property
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Implement the Status Endpoint
  - [x] 6.1 Create `src/pages/api/attendees/pdf-job-status.ts`
    - Use `withAuth` middleware for authentication
    - Accept GET request with `jobId` query parameter
    - Validate `jobId` is present, return 400 if missing
    - Read job row with `tablesDB.getRow({ databaseId, tableId, rowId: jobId })`
    - Return 404 if job not found (catch Appwrite 404 error)
    - Verify `job.requestedBy === req.user.$id`; return 403 if not the owner
    - Return `{ status, pdfUrl, error, attendeeCount }` from the job record
    - All TablesDB operations use named object parameters
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.2, 6.4_

  - [x] 6.2 Write unit tests for the Status Endpoint
    - Create `src/__tests__/api/attendees/pdf-job-status.test.ts`
    - Test: unauthenticated request returns 401
    - Test: missing `jobId` query param returns 400
    - Test: non-existent job returns 404
    - Test: pending job returns correct fields
    - Test: processing job returns correct fields
    - Test: completed job returns `status`, `pdfUrl`, `attendeeCount`
    - Test: failed job returns `status`, `error`, `attendeeCount`
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Checkpoint — Ensure all API endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the PDF Worker Appwrite Function
  - [x] 8.1 Scaffold the Appwrite Function project in `functions/pdf-worker/`
    - Create `functions/pdf-worker/package.json` with `node-appwrite` dependency and a build script
    - Create `functions/pdf-worker/tsconfig.json` for TypeScript compilation
    - Create `functions/pdf-worker/src/main.ts` as the function entry point
    - The function initializes a `node-appwrite` `Client` and `TablesDB` using env vars (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`)
    - _Requirements: 6.3_

  - [x] 8.2 Implement the PDF Worker core logic in `functions/pdf-worker/src/main.ts`
    - Parse execution body to get `jobId` and `eventSettingsId`
    - Update job status to `processing` via `tablesDB.updateRow({ databaseId, tableId, rowId: jobId, data: { status: 'processing' } })`
    - Read job record to get `attendeeIds` (JSON parse), `eventSettingsId`
    - Fetch event settings, OneSimpleAPI config, custom fields, and all attendees using named object parameters
    - Import and use `buildPdfHtml()` and `parseOneSimpleApiResponse()` from the shared template builder (bundled at build time)
    - POST generated HTML to OneSimpleAPI endpoint
    - Parse response using `parseOneSimpleApiResponse()`
    - On success: update job to `completed` with `pdfUrl`
    - On any failure: update job to `failed` with descriptive `error` message
    - Wrap entire execution in try/catch — unhandled errors update job to `failed`
    - All TablesDB operations use named object parameters
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 7.2, 7.3, 8.2_

  - [x] 8.3 Write unit tests for the PDF Worker
    - Create `src/__tests__/functions/pdf-worker.test.ts`
    - Mock `node-appwrite` TablesDB client and global `fetch`
    - Test: worker updates job to `processing` on start
    - Test: worker fetches attendees, event settings, OneSimpleAPI config, custom fields
    - Test: worker calls OneSimpleAPI with generated HTML
    - Test: on valid OneSimpleAPI response, job updated to `completed` with `pdfUrl`
    - Test: on OneSimpleAPI network error, job updated to `failed`
    - Test: on OneSimpleAPI non-200 response, job updated to `failed`
    - Test: on invalid response (no URL), job updated to `failed`
    - Test: on unhandled exception, job updated to `failed`
    - Test: job record not found marks job as `failed`
    - _Requirements: 3.1, 3.5, 3.6, 3.7, 3.8, 7.2, 7.3_

  - [x] 8.4 Write property-based tests for the PDF Worker
    - Create `src/__tests__/functions/pdf-worker.property.test.ts` using `fast-check`
    - **Property 1: New job record integrity** — for any valid job inputs, a new job record has `status: 'pending'`, `attendeeCount` equals array length, `attendeeIds` round-trips, `pdfUrl` and `error` are null
    - **Validates: Requirements 1.1, 1.2**
    - **Property 2: Completed jobs have a PDF URL** — for any job that transitions to `completed`, `pdfUrl` is a non-empty string starting with `http://` or `https://`
    - **Validates: Requirement 1.4**
    - **Property 3: Failed jobs have an error message** — for any job that transitions to `failed`, `error` is a non-empty string
    - **Validates: Requirement 1.5**
    - **Property 10: Worker error handling — all failures mark job as failed** — for any error during worker execution (DB fetch failure, template error, network error, non-200 response, invalid response), job ends with `status: 'failed'` and non-empty `error`
    - **Validates: Requirements 3.7, 7.2, 7.3**
    - **Property 11: Status endpoint returns correct job fields** — for any job in any state, the status response contains `status`, `pdfUrl`, `error`, `attendeeCount` matching the DB record
    - **Validates: Requirement 4.1**
    - Run minimum 100 iterations per property
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 3.7, 4.1, 7.2, 7.3_

- [x] 9. Checkpoint — Ensure all worker tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Update the dashboard client to use start-then-poll pattern
  - [x] 10.1 Implement the async PDF export flow in `src/pages/dashboard.tsx`
    - Replace the current `handleBulkExportPdf` logic that calls `/api/attendees/bulk-export-pdf`
    - Step 1: POST to `/api/attendees/bulk-export-pdf-start` with `attendeeIds` → receive `{ jobId }`
    - Step 2: Trigger `PdfGenerationToast` showing in-progress state with "Generating PDF for N attendees..."
    - Step 3: Poll `/api/attendees/pdf-job-status?jobId=xxx` every 3 seconds
    - Step 4: On `completed` status with `pdfUrl` → update toast to show manual download link, user clicks to download
    - Step 5: On `failed` status → display error message from job record in toast
    - Step 6: On toast dismiss → stop polling (clear interval)
    - Step 7: After 10 minutes of polling → stop polling, close toast, show timeout message
    - Keep existing error dialog handling for validation errors (missing credentials, outdated credentials, permission denied) from the Start Endpoint response
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.4_

  - [x] 10.2 Write unit tests for the dashboard polling logic
    - Create `src/__tests__/components/dashboard-pdf-polling.test.tsx`
    - Use Vitest fake timers to control polling intervals
    - Mock `fetch` for Start Endpoint and Status Endpoint calls
    - Test: successful flow — start returns jobId, poll returns `completed` with `pdfUrl`, `window.open` called
    - Test: failed flow — poll returns `failed` with error message, error displayed
    - Test: timeout — after 10 minutes of polling, polling stops and timeout message shown
    - Test: validation error from Start Endpoint — missing credentials dialog shown
    - Test: validation error from Start Endpoint — outdated credentials dialog shown
    - Test: modal close stops polling
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 7.4_

- [x] 11. Wire everything together and final integration
  - [x] 11.1 Configure the Appwrite Function build to bundle the shared template builder
    - Update `functions/pdf-worker/package.json` build script to copy or bundle `src/lib/pdfTemplateBuilder.ts`
    - Ensure the function can import the template builder at runtime
    - Verify the function builds successfully
    - _Requirements: 3.4, 6.3_

  - [x] 11.2 Write integration tests for the full async flow
    - Create `src/__tests__/integration/async-pdf-generation.test.ts`
    - Mock Appwrite TablesDB and `fetch` (OneSimpleAPI)
    - Test full happy path: Start Endpoint creates job → Worker processes job → Status Endpoint returns completed with pdfUrl
    - Test full error path: Start Endpoint creates job → Worker encounters error → Status Endpoint returns failed with error
    - Test function trigger failure: Start Endpoint creates job → trigger fails → job marked failed → Status Endpoint returns failed
    - Verify all TablesDB calls use named object parameters
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 3.6, 3.7, 4.1, 7.1, 7.2_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks include tests as required sub-tasks — none are optional
- Every TablesDB operation must use named object parameters (never positional)
- Property-based tests use `fast-check` with minimum 100 iterations
- Test files live in `src/__tests__/` directory, never in `src/pages/`
- The Appwrite Function in `functions/pdf-worker/` uses `node-appwrite` server SDK
- Checkpoints are placed after each major component to catch issues early
