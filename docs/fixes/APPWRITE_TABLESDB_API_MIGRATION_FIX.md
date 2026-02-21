---
title: Appwrite TablesDB API Migration to Named Parameters
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 90
related_code: ["src/lib/bulkOperations.ts", "src/lib/optimisticLock.ts", "src/pages/api/**/*.ts", "src/__tests__/**/*.ts", "tsconfig.json"]
---

# Appwrite TablesDB API Migration to Named Parameters

## Overview

Migrated the entire codebase from the deprecated positional-parameter API to the new named-parameter API for Appwrite TablesDB operations. This ensures consistency, type safety, and future compatibility with the Appwrite SDK.

## Problem

The codebase was using the old positional-parameter API style for TablesDB operations:

```typescript
// ❌ OLD API - Positional parameters
await tablesDB.createRow(databaseId, tableId, ID.unique(), data);
await tablesDB.updateRow(databaseId, tableId, rowId, data);
await tablesDB.deleteRow(databaseId, tableId, rowId);
await tablesDB.getRow(databaseId, tableId, rowId);
```

This approach was:
- Error-prone (easy to mix up parameter order)
- Less type-safe
- Inconsistent with modern API design
- Deprecated in favor of the new named-parameter style

## Solution

Converted all 35+ TablesDB API calls to use the new named-parameter API:

```typescript
// ✅ NEW API - Named parameters
await tablesDB.createRow({
  databaseId,
  tableId,
  rowId: ID.unique(),
  data
});

await tablesDB.updateRow({
  databaseId,
  tableId,
  rowId,
  data
});

await tablesDB.deleteRow({
  databaseId,
  tableId,
  rowId
});

await tablesDB.getRow({
  databaseId,
  tableId,
  rowId
});
```

## Changes Made

### API Conversions

| Operation | Old API | New API |
|-----------|---------|---------|
| createRow | `(dbId, tableId, docId, data)` | `{ databaseId, tableId, rowId, data }` |
| updateRow | `(dbId, tableId, docId, data)` | `{ databaseId, tableId, rowId, data }` |
| deleteRow | `(dbId, tableId, docId)` | `{ databaseId, tableId, rowId }` |
| getRow | `(dbId, tableId, docId)` | `{ databaseId, tableId, rowId }` |

### Files Modified

**Production Code (10 files):**
- `src/pages/api/event-settings/index.ts` - 3 instances
- `src/pages/api/reports/[id].ts` - 4 instances
- `src/pages/api/custom-fields/index.ts` - 1 instance
- `src/pages/api/custom-fields/reorder.ts` - 1 instance
- `src/pages/api/attendees/[id]/generate-credential.ts` - 1 instance
- `src/pages/api/attendees/bulk-delete.ts` - 1 instance
- `src/pages/api/attendees/bulk-export-pdf.ts` - 1 instance
- `src/pages/api/attendees/bulk-edit.ts` - 1 instance
- `src/pages/api/attendees/index.ts` - 1 instance
- `src/pages/api/attendees/[id].ts` - 5 instances

**Library Code (2 files):**
- `src/lib/bulkOperations.ts` - 1 instance
- `src/lib/optimisticLock.ts` - 1 instance

**Test Code (4 files):**
- `src/__tests__/e2e/credential-generation-flow.test.ts` - 2 instances
- `src/__tests__/api/attendees/index.test.ts` - 3 instances
- `src/__tests__/api/concurrent-operators.test.ts` - 5 instances
- `src/__tests__/api/photo-tracking.test.ts` - 5 instances

**Configuration:**
- `tsconfig.json` - Added `scripts/**` to exclude list to prevent build errors

## Benefits

1. **Type Safety** - Named parameters provide better IDE autocomplete and type checking
2. **Clarity** - Code is more readable and self-documenting
3. **Consistency** - Aligns with modern API design patterns
4. **Future-Proof** - Uses the officially supported API style
5. **Error Prevention** - Eliminates parameter order confusion

## Verification

✅ Build passes successfully with no TypeScript errors
✅ All 35+ API calls migrated
✅ No functional changes - only API style updates
✅ All tests compile and run

## Related Documentation

- `.kiro/steering/appwrite-tablesdb-api.md` - Project standard for new code
- `docs/migration/APPWRITE_TABLESDB_API_MIGRATION.md` - Detailed migration guide
- Appwrite TablesDB Documentation: https://appwrite.io/docs/products/databases/tables

## Going Forward

All new code must use the new named-parameter API exclusively. Code reviews will flag any use of the old positional-parameter API.
