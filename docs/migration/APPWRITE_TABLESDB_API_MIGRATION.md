---
title: Appwrite TablesDB API Migration to Named Parameters
type: runbook
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 180
related_code: ["src/lib/bulkOperations.ts", "src/lib/optimisticLock.ts", "src/pages/api/**/*.ts", "src/__tests__/**/*.ts"]
---

# Appwrite TablesDB API Migration to Named Parameters

## Overview

This document tracks the migration from the old positional-parameter API to the new named-parameter API for Appwrite TablesDB operations.

## Migration Status

### ✅ COMPLETED - All Files Migrated

#### Production Code (src/pages/api/)

- [x] `src/pages/api/event-settings/index.ts` - createRow, updateRow, deleteRow (3 instances) ✅
- [x] `src/pages/api/reports/[id].ts` - updateRow, deleteRow, getRow (4 instances) ✅
- [x] `src/pages/api/custom-fields/index.ts` - getRow (1 instance) ✅
- [x] `src/pages/api/custom-fields/reorder.ts` - getRow (1 instance) ✅
- [x] `src/pages/api/attendees/[id]/generate-credential.ts` - getRow (1 instance) ✅
- [x] `src/pages/api/attendees/bulk-delete.ts` - getRow (1 instance) ✅
- [x] `src/pages/api/attendees/bulk-export-pdf.ts` - getRow (1 instance) ✅
- [x] `src/pages/api/attendees/bulk-edit.ts` - getRow (1 instance) ✅
- [x] `src/pages/api/attendees/index.ts` - getRow (1 instance) ✅
- [x] `src/pages/api/attendees/[id].ts` - getRow (5 instances) ✅

#### Library Code (src/lib/)

- [x] `src/lib/bulkOperations.ts` - getRow (1 instance) ✅
- [x] `src/lib/optimisticLock.ts` - getRow (1 instance) ✅

#### Test Code (src/__tests__/)

- [x] `src/__tests__/e2e/credential-generation-flow.test.ts` - createRow (2 instances) ✅
- [x] `src/__tests__/api/attendees/index.test.ts` - createRow, updateRow, deleteRow (3 instances) ✅
- [x] `src/__tests__/api/concurrent-operators.test.ts` - deleteRow, getRow (5 instances) ✅
- [x] `src/__tests__/api/photo-tracking.test.ts` - deleteRow, getRow (5 instances) ✅

**Total Instances Migrated: 35+ API calls**

## API Conversion Guide

### createRow

**Old API:**
```typescript
await tablesDB.createRow(databaseId, tableId, ID.unique(), data);
```

**New API:**
```typescript
await tablesDB.createRow({
  databaseId,
  tableId,
  rowId: ID.unique(),
  data
});
```

### updateRow

**Old API:**
```typescript
await tablesDB.updateRow(databaseId, tableId, rowId, data);
```

**New API:**
```typescript
await tablesDB.updateRow({
  databaseId,
  tableId,
  rowId,
  data
});
```

### deleteRow

**Old API:**
```typescript
await tablesDB.deleteRow(databaseId, tableId, rowId);
```

**New API:**
```typescript
await tablesDB.deleteRow({
  databaseId,
  tableId,
  rowId
});
```

### getRow

**Old API:**
```typescript
const row = await tablesDB.getRow(databaseId, tableId, rowId);
```

**New API:**
```typescript
const row = await tablesDB.getRow({
  databaseId,
  tableId,
  rowId
});
```

### listRows

**Old API:**
```typescript
const result = await tablesDB.listRows(databaseId, tableId, queries);
```

**New API:**
```typescript
const result = await tablesDB.listRows({
  databaseId,
  tableId,
  queries
});
```

## Migration Checklist

For each file being migrated:

- [ ] Identify all TablesDB method calls
- [ ] Convert to named-parameter API
- [ ] Verify TypeScript compilation passes
- [ ] Run related tests
- [ ] Update this document with completion status

## Completion Timeline

- **Phase 1:** Library code (bulkOperations.ts, optimisticLock.ts)
- **Phase 2:** Production API routes
- **Phase 3:** Test files
- **Phase 4:** Verification and cleanup

## Notes

- The new API is more explicit and type-safe
- All parameters are named, reducing confusion about parameter order
- The migration is backward-compatible during transition period
- After migration, the old API should never be used
