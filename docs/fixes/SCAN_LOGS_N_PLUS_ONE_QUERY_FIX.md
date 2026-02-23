---
title: Scan Logs N+1 Query Performance Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/components/ScanLogsViewer.tsx
  - src/pages/api/scan-logs/index.ts
  - src/types/scanLog.ts
---

# Scan Logs N+1 Query Performance Fix

## Problem

The Access Control logs page was slow to load due to an N+1 query pattern in `ScanLogsViewer`. After fetching a page of scan logs, the component fired a separate `GET /api/attendees/{id}` request for every unique attendee in the results — up to 50 extra HTTP calls per page load.

Additionally, `src/pages/api/scan-logs/index.ts` was using forbidden positional parameters on `tablesDB.listRows`.

## Root Cause

`ScanLogsViewer` maintained an `attendeeMap` state and a `loadAttendeeNames` function that batched individual attendee fetches after each log page load. With 50 logs per page, this could trigger dozens of sequential API calls before names appeared.

The `attendeeFirstName`, `attendeeLastName`, and `attendeePhotoUrl` snapshot columns existed in the database schema (added to support this exact optimization) but were not being used by the viewer or returned by the API.

## Fix

### `src/pages/api/scan-logs/index.ts`
- Fixed forbidden positional `tablesDB.listRows(dbId, tableId, queries)` → named parameters `tablesDB.listRows({ databaseId, tableId, queries })`
- Added `attendeeFirstName`, `attendeeLastName`, `attendeePhotoUrl` to the response mapping

### `src/components/ScanLogsViewer.tsx`
- Removed `attendeeMap` state
- Removed `loadAttendeeNames` callback (eliminated all N+1 attendee fetches)
- Added snapshot fields to `ScanLog` interface
- Updated table rendering to use `log.attendeeFirstName` / `log.attendeeLastName` directly

## Result

Page load now requires exactly 2 requests (profiles + users for filter dropdowns) plus 1 request for the log page itself — regardless of how many attendees appear in the results. Previously it could require 50+ requests.

## How Snapshot Fields Work

When the mobile app scans a badge, it captures the attendee's name and photo URL at that moment and stores them alongside the scan log record. This means the viewer never needs to look up attendee details separately — the data is already embedded in each log row.
