---
title: PDF Template Builder Security and Robustness Fixes
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - functions/pdf-worker/src/lib/pdfTemplateBuilder.ts
  - src/__tests__/api/attendees/bulk-export-pdf-start.test.ts
---

# PDF Template Builder Security and Robustness Fixes

Five bugs fixed across the PDF worker and its test suite.

## 1. Unsafe JSON.parse of customFieldValues (pdfTemplateBuilder.ts)

`JSON.parse(attendee.customFieldValues)` was called without a try/catch. A malformed
JSON string stored in the database would throw and crash the entire PDF generation job.

Fixed by wrapping the parse in try/catch, logging the error with attendee context (id only,
no PII), and falling back to `{}` so the job continues with remaining fields intact:

```ts
try {
  const parsed = JSON.parse(attendee.customFieldValues);
  customFieldValues = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
} catch (err) {
  console.error(
    `Failed to parse customFieldValues for attendee id=${attendee.id ?? attendee.$id}:`,
    err
  );
  customFieldValues = {};
}
```

Note: The error log intentionally omits `email` and other PII fields — the attendee `$id` is sufficient for debugging. The guard `parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)` ensures that if `customFieldValues` is already stored as an object (not a JSON string), it is used directly via the `else` branch in the surrounding `if (typeof attendee.customFieldValues === 'string')` check, preserving valid object data.

## 2. Missing HTML Escaping on Event-Level Placeholders (pdfTemplateBuilder.ts)

`buildPdfHtml` inserted `eventName`, `eventTime`, and `eventLocation` from `eventSettings`
directly into the main template without HTML escaping. This was inconsistent with
`buildRecordHtml`, which already applied `escapeHtml` to the same fields, and allowed
user-controlled event data to inject HTML into the generated PDF.

Fixed by passing all user-provided event values through `escapeHtml` before insertion.
The formatted date string (from `toLocaleDateString`) is not escaped as it is
system-generated. `recordsHtml` is left unescaped as it is already-rendered HTML.

## 3. Unescaped URLs in Record Template (pdfTemplateBuilder.ts)

`photoUrl` and `credentialUrl` were inserted into placeholders without HTML escaping.
While URLs are typically safe, special characters or maliciously crafted URLs could
break out of HTML attributes or inject code.

Fixed by wrapping both URLs with `escapeHtml()` before insertion:

```ts
const placeholders: Record<string, string> = {
  // ...
  '{{photoUrl}}': escapeHtml(photoUrl),
  '{{credentialUrl}}': escapeHtml(credentialUrl),
  // ...
};
```

## 4. Wrong Package Mocked in Test (bulk-export-pdf-start.test.ts)

The test mocked `'appwrite'` for `Query` and `ID`, but the handler imports them from
`'node-appwrite'`. The mock was never intercepting the actual imports, so any test
relying on `Query.limit`, `Query.equal`, or `ID.unique` behaviour was using the real
implementations.

Fixed by changing `vi.mock('appwrite', ...)` to `vi.mock('node-appwrite', ...)`.

## 5. Missing createAdminClient Mock (bulk-export-pdf-start.test.ts)

The handler calls `createAdminClient` to obtain a `functions` client for triggering the
PDF worker execution. Only `createSessionClient` was mocked, so the `createExecution`
call in the happy path and failure path tests was hitting an unmocked function.

Fixed by:
- Adding `createAdminClient: vi.fn()` to the `@/lib/appwrite` module mock factory
- Wiring it up in `beforeEach` with `{ functions: mockFunctions }` so `createExecution`
  is properly intercepted across all test cases
