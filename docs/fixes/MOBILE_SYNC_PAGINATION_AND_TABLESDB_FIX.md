---
title: Mobile Sync Pagination and TablesDB API Compliance Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-25
review_interval_days: 90
related_code: ["src/pages/api/mobile/sync/attendees.ts"]
---

# Mobile Sync Pagination and TablesDB API Compliance Fix

## Issues Fixed

### 1. Delta-Sync Pagination Bug

When fetching additional attendees with updated access control records during delta sync, the pagination metadata (`hasMore`) was calculated incorrectly. The endpoint would trim the response to the requested `limit`, but `hasMore` was based on the pre-trim count, causing clients to miss pagination boundaries.

**Impact:** Mobile clients couldn't reliably paginate through delta sync results when access control updates were present.

**Fix:** Renamed `combinedUniqueCount` to `totalUniqueAvailable` and moved the `hasMore` calculation to after trimming, ensuring it correctly reflects whether more attendees exist beyond the current page.

### 2. TablesDB API Violations

Two `tablesDB.listRows` calls were using positional parameters instead of named object parameters:
- Delta-sync access control fetch (line ~93)
- Additional attendees fetch (line ~180)

**Impact:** Non-compliant with project TablesDB API standard; potential for future API breakage.

**Fix:** Converted both calls to use named object parameters:
```typescript
// BEFORE
await tablesDB.listRows(dbId, accessControlTableId, [Query.greaterThan(...)])

// AFTER
await tablesDB.listRows({
  databaseId: dbId,
  tableId: accessControlTableId,
  queries: [Query.greaterThan(...)]
})
```

## Related Fixes

- `docs/fixes/MOBILE_SYNC_ACCESS_CONTROL_FAIL_SECURE_FIX.md` — Fail-secure access control fallback
