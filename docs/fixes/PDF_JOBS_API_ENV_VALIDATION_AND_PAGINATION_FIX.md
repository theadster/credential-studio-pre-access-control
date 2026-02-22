---
title: PDF Jobs API Env Validation and Pagination Sanitization Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/pages/api/attendees/pdf-job-status.ts
  - src/pages/api/pdf-jobs/delete.ts
  - src/pages/api/pdf-jobs/list.ts
  - functions/pdf-worker/src/lib/pdfTemplateBuilder.ts
---

# PDF Jobs API Env Validation and Pagination Sanitization Fix

## 1. Missing Environment Variable Validation (pdf-job-status.ts, delete.ts, list.ts)

All three handlers used non-null assertions on NEXT_PUBLIC_APPWRITE_DATABASE_ID
and NEXT_PUBLIC_APPWRITE_PDF_JOBS_TABLE_ID. If either env var is unset, the value
silently becomes undefined, which is passed to Appwrite and produces a cryptic error
rather than a clear misconfiguration message.

Fixed in all three files by replacing assertions with explicit checks that return
HTTP 500 with a descriptive message if either variable is missing.

## 2. Unsafe Pagination Inputs in list.ts

Query.limit and Query.offset were receiving Number(limit) and Number(offset) directly
from query string params. Number('abc') produces NaN, and negative values are not
rejected, both of which can cause Appwrite query errors or unexpected behaviour.

Fixed with parseInt + Number.isFinite guards and clamping:
- limit: defaults 50, minimum 1, maximum 100
- offset: defaults 0, minimum 0

## 3. JSON.parse of customFieldValues Can Produce null (pdfTemplateBuilder.ts)

JSON.parse('null') is valid and returns null. Object.entries(null) throws a TypeError.
The parsed value was assigned directly without checking it was a non-null plain object.

Fixed by validating the parsed result — must be a non-null, non-array object,
otherwise falls back to {}.
