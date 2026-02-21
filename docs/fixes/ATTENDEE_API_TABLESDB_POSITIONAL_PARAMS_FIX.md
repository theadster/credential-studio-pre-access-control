---
title: Attendee API TablesDB Positional Parameters Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 90
related_code: ["src/pages/api/attendees/[id].ts"]
---

# Attendee API TablesDB Positional Parameters Fix

## Overview

Fixed 5 instances of deprecated positional-parameter API calls in `src/pages/api/attendees/[id].ts` to use the new named-parameter API format per Appwrite TablesDB standards.

## Issue

The file contained multiple `tablesDB.listRows()` calls using the old positional-parameter API style, which is deprecated and inconsistent with other API calls in the same file that use the correct named-parameter format.

## Locations Fixed

### 1. Access Control Fetch (Line 160-164)
**Before (Positional Parameters - WRONG):**
```typescript
const accessControlResult = await tablesDB.listRows(
  dbId,
  accessControlTableId,
  [Query.equal('attendeeId', id), Query.limit(1)]
);
```

**After (Named Parameters - CORRECT):**
```typescript
const accessControlResult = await tablesDB.listRows({
  databaseId: dbId,
  tableId: accessControlTableId,
  queries: [Query.equal('attendeeId', id), Query.limit(1)]
});
```

### 2. Barcode Uniqueness Check (Line 404-408)
**Before (Positional Parameters - WRONG):**
```typescript
const duplicateBarcodeDocs = await tablesDB.listRows(
  dbId,
  attendeesTableId,
  [Query.equal('barcodeNumber', barcodeNumber)]
);
```

**After (Named Parameters - CORRECT):**
```typescript
const duplicateBarcodeDocs = await tablesDB.listRows({
  databaseId: dbId,
  tableId: attendeesTableId,
  queries: [Query.equal('barcodeNumber', barcodeNumber)]
});
```

### 3. Custom Fields Fetch - Printable Fields Map (Line 375-379)
**Before (Positional Parameters - WRONG):**
```typescript
const customFieldsDocs = await tablesDB.listRows(
  dbId,
  customFieldsTableId,
  [Query.limit(pageSize), Query.offset(offset)]
);
```

**After (Named Parameters - CORRECT):**
```typescript
const customFieldsDocs = await tablesDB.listRows({
  databaseId: dbId,
  tableId: customFieldsTableId,
  queries: [Query.limit(pageSize), Query.offset(offset)]
});
```

### 4. Custom Fields Validation (Line 625-629)
**Before (Positional Parameters - WRONG):**
```typescript
const customFieldsDocs = await tablesDB.listRows(
  dbId,
  customFieldsTableId,
  [Query.limit(validationPageSize), Query.offset(validationOffset)]
);
```

**After (Named Parameters - CORRECT):**
```typescript
const customFieldsDocs = await tablesDB.listRows({
  databaseId: dbId,
  tableId: customFieldsTableId,
  queries: [Query.limit(validationPageSize), Query.offset(validationOffset)]
});
```

### 5. Access Control Change Detection (Line 680-684)
**Before (Positional Parameters - WRONG):**
```typescript
const accessControlResult = await tablesDB.listRows(
  dbId,
  accessControlTableId,
  [Query.equal('attendeeId', id), Query.limit(1)]
);
```

**After (Named Parameters - CORRECT):**
```typescript
const accessControlResult = await tablesDB.listRows({
  databaseId: dbId,
  tableId: accessControlTableId,
  queries: [Query.equal('attendeeId', id), Query.limit(1)]
});
```

## API Standard Reference

Per `appwrite-tablesdb-api.md`, all TablesDB operations must use the new named-parameter API:

| Operation | Old API (Deprecated) | New API (Required) |
|-----------|----------------------|-------------------|
| listRows | `(databaseId, tableId, queries)` | `{ databaseId, tableId, queries }` |

## Impact

- ✅ Ensures consistency with Appwrite TablesDB API standards
- ✅ Aligns with other API calls in the same file that already use named parameters
- ✅ Prevents potential API compatibility issues in future Appwrite versions
- ✅ Improves code readability with explicit parameter names

## Verification

- ✅ All 5 instances converted to named-parameter format
- ✅ TypeScript diagnostics pass with no errors
- ✅ No functional changes - only API call style updated
- ✅ All parameter values remain identical

## Related Standards

- **Appwrite TablesDB API**: See `appwrite-tablesdb-api.md` for complete API standards
- **File**: `src/pages/api/attendees/[id].ts` - Attendee GET/PUT endpoint
