---
title: Code Review Security and Test Fixes
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/components/ui/button.tsx
  - src/components/PdfGenerationToast.tsx
  - src/components/ExportsTab.tsx
  - src/lib/sweetalert-progress.ts
  - src/pages/api/attendees/pdf-job-status.ts
  - src/pages/api/pdf-jobs/list.ts
  - src/pages/api/pdf-jobs/delete.ts
  - src/lib/__tests__/sweetalert-config.test.ts
  - src/__tests__/functions/pdf-worker.test.ts
  - src/__tests__/functions/pdf-worker.property.test.ts
  - src/__tests__/lib/pdfTemplateBuilder.property.test.ts
  - functions/pdf-worker/src/lib/pdfTemplateBuilder.ts
  - src/__tests__/integration/async-pdf-generation.test.ts
  - scripts/setup-appwrite.ts
---

# Code Review Security and Test Fixes

Fixes applied from a code review pass covering security vulnerabilities, authorization gaps, and test correctness issues.

## Security Fixes

### 1. URL injection via window.open (ExportsTab.tsx)

`window.open(job.pdfUrl, ...)` passed the URL without validation. An attacker controlling `job.pdfUrl` could supply a `javascript:` or `data:` URL.

Fixed by validating the URL starts with `http://` or `https://` before opening, with normalization to handle case-insensitive and whitespace-padded URLs. The trimmed URL is used in the `window.open()` call to prevent bypass via whitespace padding:

```ts
const url = (job.pdfUrl ?? '').trim();
const normalized = url.toLowerCase();
if (!normalized.startsWith('https://') && !normalized.startsWith('http://')) return;
window.open(url, '_blank', 'noopener,noreferrer');
```

### 2. Missing authorization on pdf-job-status endpoint (pdf-job-status.ts)

Any authenticated user could query arbitrary job IDs and retrieve another user's status, `pdfUrl`, and error details.

Fixed by checking `job.requestedBy` against the session user:

```ts
if (job.requestedBy !== req.user.$id) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### 3. Missing authorization on pdf-jobs list endpoint (pdf-jobs/list.ts)

The list endpoint returned all jobs regardless of ownership.

Fixed by adding a `requestedBy` filter scoped to the requesting user:

```ts
Query.equal('requestedBy', req.user.$id),
```

### 4. Overly-permissive pdf_jobs table permissions (setup-appwrite.ts)

The `pdf_jobs` table granted `update` and `delete` to all authenticated users, allowing job manipulation or deletion by non-owners.

Fixed by removing user-level `update` and `delete` permissions — the worker uses an API key and does not require user-level write access.

### 5. DOM queries not scoped to SweetAlert popup (sweetalert-progress.ts)

`document.getElementById(...)` could match unrelated page elements with the same IDs, causing visual corruption or unintended DOM mutations.

Fixed by scoping all queries to `Swal.getPopup()`:

```ts
const popup = Swal.getPopup();
const progressBar = popup?.querySelector<HTMLElement>('#swal-progress-bar');
```

### 6. PII logged in pdfTemplateBuilder error handler (pdfTemplateBuilder.ts)

`console.error` included `email=${attendee.email}` in the fallback message for a failed `JSON.parse`, leaking PII to logs.

Fixed by removing the email field from the log message — the attendee `$id` is sufficient for debugging.

### 7. Button component defaults to type="submit" (button.tsx)

The shadcn `Button` component spread `...props` without a default `type`, so buttons inside forms would submit the form unintentionally.

Fixed by defaulting `type` to `'button'`:

```ts
function Button({ ..., type = 'button', ...props }) {
  return <Comp type={asChild ? undefined : type} ... />
}
```

### 8. Dismiss button in PdfGenerationToast defaults to type="submit" (PdfGenerationToast.tsx)

The dismiss `<button>` had no explicit `type` attribute.

Fixed by adding `type="button"`.

## Test Correctness Fixes

### 9. mockGetRow ignores rowId in worker tests

Both `pdf-worker.test.ts` and `pdf-worker.property.test.ts` had `mockGetRow` always returning the first attendee regardless of the requested `rowId`, masking per-attendee bugs.

Fixed by destructuring `rowId` in the mock and returning a record keyed to it:

```ts
mockGetRow.mockImplementation(({ tableId, rowId }) => {
  if (tableId === 'attendees') return Promise.resolve({ $id: rowId ?? 'att-1', ... });
});
```

### 10. HTTP URL property test missing equality assertion (pdfTemplateBuilder.property.test.ts)

The test verified `result` had a `url` property but did not assert it equalled the input, allowing silent mutations to pass.

Fixed by asserting `expect(result).toHaveProperty('url', httpUrl)`.

### 11. sweetalert-config test missing button class equality (sweetalert-config.test.ts)

The `should return consistent theme classes across modes` test checked `popup`, `title`, and `htmlContainer` equality between light and dark themes but omitted `confirmButton` and `cancelButton`.

Fixed by adding both assertions to the test.

### 12. find() destructuring type error in property tests (pdf-worker.property.test.ts)

`mockUpdateRow.mock.calls.find(([args]: [any]) => ...)` used a tuple destructuring pattern incompatible with `any[][]`, causing TypeScript errors.

Fixed by using a plain parameter: `find((call: any[]) => call[0]?.data?.status === 'failed')`.

## Round 2 Security Fixes

### 13. Missing ownership check on pdf-jobs delete endpoint (pdf-jobs/delete.ts)

Any authenticated user could delete arbitrary PDF job records by supplying a `jobId` they don't own.

Fixed by fetching the job before deletion and checking `job.requestedBy !== req.user.$id → 403`:

```ts
if (job.requestedBy !== req.user.$id) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### 14. Unvalidated pdfUrl in PdfGenerationToast anchor href (PdfGenerationToast.tsx)

An attacker-controlled `pdfUrl` could use `javascript:` or other harmful schemes in the anchor `href`.

Fixed by validating the scheme before rendering the link — only `http://` and `https://` URLs are rendered, with normalization to handle case-insensitive and whitespace-padded URLs:

```ts
const normalized = pdfUrl ? pdfUrl.trim().toLowerCase() : '';
const isSafeUrl = pdfUrl && (normalized.startsWith('https://') || normalized.startsWith('http://'));
return isSafeUrl ? <a href={pdfUrl} ...> : null;
```

## Round 2 Test Fixes

### 15. Undeclared `rowId` variable in pdf-worker.test.ts setupDefaultMocks (pdf-worker.test.ts)

`setupDefaultMocks` referenced `rowId` inside the `mockGetRow` implementation but never destructured it from the call arguments, causing a `ReferenceError` at runtime.

Fixed by adding `{ tableId, rowId }` destructuring to the `mockGetRow.mockImplementation` parameter.

### 16. NaN progress bar when options.total is missing or non-finite (sweetalert-progress.ts)

`isIndeterminate` only checked `options.total === 0`, so `NaN`, `undefined`, or negative values would produce `NaN%` in the progress bar.

Fixed by using `!Number.isFinite(options.total) || options.total <= 0` as the indeterminate condition.

### 17. Falsy custom field values lost in pdfTemplateBuilder (pdfTemplateBuilder.ts)

`String(fieldValue || '')` coerced `0` and `false` to `''`, silently dropping valid field values.

Fixed by using `fieldValue == null ? '' : String(fieldValue)` to only substitute empty string for `null`/`undefined`.

## Round 3 Security Fixes

### 18. eventDate inserted without HTML escaping (pdfTemplateBuilder.ts)

`buildRecordHtml` and `buildPdfHtml` both inserted `eventDate` via `toLocaleDateString()` without passing through `escapeHtml`. If `eventDate` contained HTML-special characters (e.g. from a locale format or tampered input), they would be injected unescaped into the PDF HTML.

Fixed by wrapping both occurrences with `escapeHtml(...)`:

```ts
'{{eventDate}}': eventSettings.eventDate
  ? escapeHtml(new Date(eventSettings.eventDate).toLocaleDateString())
  : '',
```

### 19. Raw internal error messages returned by status endpoint (pdf-job-status.ts)

`job.error` was returned verbatim to the client, leaking internal exception messages (e.g. `"Unexpected error: ..."`) that could reveal implementation details.

Fixed by returning a generic message when `job.error` is set:

```ts
error: job.error ? 'PDF generation failed. Please try again.' : null,
```

Integration tests updated to assert the sanitized message.

### 20. fetch mock missing json() method (pdf-worker.test.ts)

The global fetch mock only provided `text()`, leaving `json()` undefined. Any code path calling `response.json()` would throw a `TypeError`.

Fixed by adding `json: vi.fn().mockResolvedValue({ url: 'https://example.com/output.pdf' })` to the mock response.

### 21. deleteRow 404 not handled in delete endpoint (pdf-jobs/delete.ts)

If the job was deleted concurrently between the `getRow` ownership check and the `deleteRow` call, the endpoint would return 500 instead of 404.

Fixed by wrapping `deleteRow` in a try/catch that returns 404 on `error.code === 404`.

### 22. Progress percentage not clamped (sweetalert-progress.ts)

`percentage` could exceed 100 or go below 0 if `current > total` or `current < 0`.

Fixed by clamping: `Math.min(100, Math.max(0, Math.round(...)))`.

## Round 3 Documentation Fixes

### 23. PDF_WORKER_FUNCTION_EXECUTE_PERMISSION_FIX.md incorrectly stated NEXT_PUBLIC_ var is not browser-exposed

The doc said "Despite the `NEXT_PUBLIC_` prefix it is not exposed to the browser" — this is incorrect. `NEXT_PUBLIC_` vars are always bundled into the client.

Fixed to accurately state the value is publicly exposed and should not be relied upon for security. Updated the note to explicitly clarify:
- The `NEXT_PUBLIC_` prefix means the value **is always exposed to the browser**
- The value is bundled into client-side code
- Real security comes from Appwrite's permission system, not from keeping the function ID secret

### 24. PDF_TEMPLATE_BUILDER_SECURITY_AND_ROBUSTNESS_FIXES.md showed old customFieldValues snippet

The doc snippet showed `JSON.parse(attendee.customFieldValues)` without the object-type guard, which would discard valid object data. Updated to show the current production code with the `typeof parsed === 'object'` guard and note the `else` branch that handles already-object values.

### 25. EXPORTS_TAB_SECURITY_AND_DATA_FIXES.md showed window.open without URL validation

The doc showed `window.open(job.pdfUrl, ...)` without scheme validation. Updated to show the URL check before opening.

### 26. ASYNC_PDF_GENERATION_GUIDE.md databaseId security note was misleading

The guide described the `NEXT_PUBLIC_APPWRITE_DATABASE_ID` check as a security boundary. Added a note clarifying it is defence-in-depth only — the value is publicly known, so the real security is Appwrite's API key permissions and ownership checks.

### 27. async-pdf-generation requirements.md missing worker attendee authorization requirement

Added Requirement 3.9: the PDF_Worker SHALL verify each fetched attendee belongs to the job's `eventSettingsId` and skip non-matching records.

### 28. async-pdf-generation tasks.md NEXT_PUBLIC_ note for function ID

Updated task 3.2 to note that `NEXT_PUBLIC_APPWRITE_PDF_WORKER_FUNCTION_ID` is publicly exposed in the browser bundle and should not be treated as a secret.

## Round 4 Robustness Fixes

### 29. Missing env var validation in PDF Worker entry point (functions/pdf-worker/src/main.ts)

The default export initialized `Client` with `?? ''` fallbacks for `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, and `APPWRITE_API_KEY`. Missing vars produced an incorrectly configured client that failed with obscure Appwrite SDK errors rather than a clear startup message.

Fixed by validating all three vars before constructing the client and returning early with a descriptive error if any are absent:

```ts
const missing = [
  !endpoint && 'APPWRITE_ENDPOINT',
  !projectId && 'APPWRITE_PROJECT_ID',
  !apiKey && 'APPWRITE_API_KEY',
].filter(Boolean);

if (missing.length > 0) {
  ctx.error(`PDF Worker misconfigured: missing required env vars: ${missing.join(', ')}`);
  return ctx.res.json({ ok: false, error: `Missing required env vars: ${missing.join(', ')}` }, 500);
}
```

### 30. Attendee fetch loop crashes worker on missing row (functions/pdf-worker/src/main.ts)

The loop fetching attendees via `tablesDB.getRow` had no error handling — a single deleted or inaccessible attendee would throw and crash the entire worker, marking the whole job failed.

Fixed by wrapping each `getRow` call in a try/catch: successfully fetched attendees are pushed to the array; missing ones are logged with their ID and collected in `missingAttendeeIds`. If at least one attendee is fetched the job continues (with a warning log). If zero attendees are fetched the job is marked failed with the list of missing IDs.

## Round 5 Fixes

### 31. PDF polling loop treats 403/404 as transient errors (dashboard.tsx)

The `setInterval` polling loop treated all non-OK HTTP responses as transient and kept retrying until the 10-minute timeout. A 403 (job owned by another user) or 404 (job deleted) would silently retry for 10 minutes before showing a timeout message.

Fixed by checking `statusResponse.status` before the generic non-OK path: 403 and 404 now call `stopPdfPolling()`, `setExportingPdfs(false)`, and `setPdfToast` with a descriptive error message immediately. All other non-OK statuses retain the existing retry-and-warn behavior.

## Round 6 Security Fixes

### 32. URL scheme validation missing normalization (pdfTemplateBuilder.ts, ExportsTab.tsx, PdfGenerationToast.tsx, bulk-export-pdf.ts)

URL scheme validation using `startsWith('http://')` and `startsWith('https://')` without normalization could be bypassed by:
- Case variations: `HTTP://`, `HTTPS://`, `HtTpS://`
- Whitespace padding: ` https://example.com`, `https://example.com `

Fixed by normalizing URLs before validation:

```ts
const normalized = url.trim().toLowerCase();
if (!normalized.startsWith('https://') && !normalized.startsWith('http://')) {
  // reject
}
```

Applied to:
- `absolutizeUrl()` in both `src/lib/pdfTemplateBuilder.ts` and `functions/pdf-worker/src/lib/pdfTemplateBuilder.ts`
- `parseOneSimpleApiResponse()` in both template builder files
- URL validation in `ExportsTab.tsx` (Download button)
- URL validation in `PdfGenerationToast.tsx` (PDF link)
- URL validation in `src/pages/api/attendees/bulk-export-pdf.ts` (API response)

The original URL is preserved for use; only the validation is normalized.
