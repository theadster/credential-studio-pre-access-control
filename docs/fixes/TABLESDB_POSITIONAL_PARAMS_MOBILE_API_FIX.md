---
title: TablesDB Positional Parameters Fix - Mobile API Routes
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-25
review_interval_days: 90
related_code:
  - src/pages/api/mobile/debug/attendee/[barcode].ts
  - src/pages/api/mobile/sync/attendees.ts
  - src/pages/api/mobile/sync/profiles.ts
---

# TablesDB Positional Parameters Fix — Mobile API Routes

## Problem

Six `tablesDB.listRows` calls across three mobile API files were using positional parameters instead of the required named-parameter object syntax. This violates the project's zero-tolerance TablesDB API standard.

**Forbidden pattern (was in use):**
```typescript
await tablesDB.listRows(dbId, tableId, queries)
```

**Correct pattern:**
```typescript
await tablesDB.listRows({ databaseId: dbId, tableId, queries })
```

## Files Fixed

| File | Violations Fixed |
|------|-----------------|
| `src/pages/api/mobile/debug/attendee/[barcode].ts` | 3 (attendees, access control, custom fields queries) |
| `src/pages/api/mobile/sync/attendees.ts` | 2 (attendees, custom fields queries) |
| `src/pages/api/mobile/sync/profiles.ts` | 1 (profiles query) |

## Files Audited and Confirmed Clean

- `src/components/AccessControlForm.tsx` — uses `fetch`, no direct DB calls
- `src/pages/api/access-control/[attendeeId].ts` — fully compliant
- `src/pages/api/mobile/debug/attendee.ts` — fully compliant
- `src/pages/api/mobile/scan-logs.ts` — fully compliant
- `src/pages/api/mobile/custom-fields.ts` — fully compliant
- `src/pages/api/mobile/event-info.ts` — fully compliant
