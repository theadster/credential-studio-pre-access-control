---
title: TablesDB Migration Stale References Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 90
related_code:
  - src/pages/dashboard.tsx
  - src/hooks/useRealtimeSubscription.ts
  - src/hooks/__tests__/useRealtimeSubscription.test.ts
  - src/hooks/__tests__/useRealtimeSubscription.realtime.test.ts
  - src/lib/optimisticLock.ts
  - src/lib/conflictResolver.ts
  - src/lib/fieldUpdate.ts
  - src/lib/appwriteTypeHelpers.ts
  - src/__tests__/integration/realtime-dashboard.test.tsx
  - src/test/mocks/appwrite.ts
  - scripts/inject-test-logs.ts
  - scripts/migrate-log-timestamps.ts
  - scripts/test-logs-timestamp-fix.ts
---

# TablesDB Migration Stale References Fix

## Problem

After the Appwrite TablesDB migration, several files retained references to the old Appwrite Database API terminology (`collections`, `documents`, `collectionId`). These stale references caused:

- Realtime subscriptions in `dashboard.tsx` using wrong channel format (`collections.*.documents` instead of `tables.*.rows`), meaning live updates would silently fail
- `buildChannels` helper in `useRealtimeSubscription.ts` generating incorrect channel strings
- Internal lib functions (`optimisticLock`, `conflictResolver`, `fieldUpdate`) using `collectionId` as parameter names instead of `tableId`
- Test files asserting against old channel formats, making them pass against wrong behavior
- Mock env vars in tests set to `*-collection` values instead of `*-table`
- Dead `mockDatabases` export in test mock file with old API methods
- Active utility scripts still using `Databases` + old data methods (`listDocuments`, `createDocument`, etc.)
- ~49 inactive one-off diagnostic/migration scripts left in `scripts/` root

## Files Fixed

### Production Code

| File | Change |
|------|--------|
| `src/pages/dashboard.tsx` | 6 realtime channel strings: `collections.*.documents` → `tables.*.rows` |
| `src/hooks/useRealtimeSubscription.ts` | `buildChannels` helper channel format + param names `collectionId` → `tableId`, JSDoc updated |
| `src/lib/optimisticLock.ts` | `collectionId` param renamed to `tableId` throughout |
| `src/lib/conflictResolver.ts` | `collectionId` param renamed to `tableId` throughout |
| `src/lib/fieldUpdate.ts` | `collectionId` param renamed to `tableId` throughout |
| `src/lib/appwriteTypeHelpers.ts` | JSDoc examples updated |

### Test Files

| File | Change |
|------|--------|
| `src/hooks/__tests__/useRealtimeSubscription.test.ts` | Channel strings, event strings, `buildChannels` assertions updated |
| `src/hooks/__tests__/useRealtimeSubscription.realtime.test.ts` | All channel/event strings updated |
| `src/__tests__/integration/realtime-dashboard.test.tsx` | 4 remaining old-format channel strings fixed |
| `src/__tests__/api/mobile/mobile-api.test.ts` | Mock env vars: `*-collection` → `*-table` |
| `src/__tests__/api/approval-profiles/*.test.ts` | Mock env vars updated |
| `src/__tests__/e2e/*.test.ts` | Mock table ID strings updated |
| `src/__tests__/lib/*.test.ts` | `testTableId` values updated |
| `src/__tests__/integration/session-lifecycle.test.ts` | Mock table ID updated |
| `src/test/mocks/appwrite.ts` | Removed dead `mockDatabases` export and its `resetAllMocks()` block |

### Scripts (Pass 3)

| File | Change |
|------|--------|
| `scripts/inject-test-logs.ts` | `Databases` → `TablesDB`, `listDocuments` → `listRows` (`.rows`), `createDocument` → `createRow` |
| `scripts/migrate-log-timestamps.ts` | `Databases` → `TablesDB`, `listDocuments` → `listRows` (`.rows`), `updateDocument` → `updateRow` |
| `scripts/test-logs-timestamp-fix.ts` | `Databases` → `TablesDB`, all data methods migrated to TablesDB equivalents |

### Scripts Archived

49 inactive one-off diagnostic/migration scripts moved to `scripts/archive/pre-tablesdb/`. These were last-touched 3–7 months ago, not wired in `package.json`, and used the old Databases API exclusively.

## Correct Channel Format

Appwrite TablesDB realtime channels use this format:

```
databases.{databaseId}.tables.{tableId}.rows           // subscribe to all rows
databases.{databaseId}.tables.{tableId}.rows.{rowId}   // subscribe to specific row
```

The old Database API format (now incorrect) was:
```
databases.{databaseId}.collections.{collectionId}.documents
```

## API Method Mapping

| Old (Databases) | New (TablesDB) | Response key |
|-----------------|----------------|--------------|
| `listDocuments(...)` | `listRows(...)` | `.rows` (was `.documents`) |
| `getDocument(dbId, colId, id)` | `getRow(dbId, tableId, id)` | — |
| `createDocument(dbId, colId, id, data)` | `createRow(dbId, tableId, id, data)` | — |
| `updateDocument(dbId, colId, id, data)` | `updateRow(dbId, tableId, id, data)` | — |
| `deleteDocument(dbId, colId, id)` | `deleteRow(dbId, tableId, id)` | — |

## Verification

The existing migration property test suite (`src/__tests__/properties/tablesdb-migration.test.ts`) validates no old API calls remain in source files. All 19 tests pass. All 53 realtime subscription tests pass.
