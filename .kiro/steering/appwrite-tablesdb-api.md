---
title: Appwrite TablesDB API Standard
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 90
related_code: ["src/lib/bulkOperations.ts", "src/pages/api/**/*.ts"]
---

# Appwrite TablesDB API Standard

## Overview

This project uses **Appwrite TablesDB** for all database operations. We must use the **new named-parameter API** exclusively. The old positional-parameter API is deprecated and must not be used in new code or existing code.

## API Standards

### ✅ CORRECT: New Named-Parameter API

Use object parameters with named properties:

```typescript
// createRow with named parameters
await tablesDB.createRow({
  databaseId: 'db123',
  tableId: 'table456',
  rowId: ID.unique(),
  data: { field1: 'value1', field2: 'value2' }
});

// updateRow with named parameters
await tablesDB.updateRow({
  databaseId: 'db123',
  tableId: 'table456',
  rowId: 'row789',
  data: { field1: 'updated' }
});

// deleteRow with named parameters
await tablesDB.deleteRow({
  databaseId: 'db123',
  tableId: 'table456',
  rowId: 'row789'
});

// listRows with named parameters
const result = await tablesDB.listRows({
  databaseId: 'db123',
  tableId: 'table456',
  queries: [Query.limit(10)]
});

// getRow with named parameters
const row = await tablesDB.getRow({
  databaseId: 'db123',
  tableId: 'table456',
  rowId: 'row789'
});
```

### ❌ WRONG: Old Positional-Parameter API

Do NOT use positional parameters:

```typescript
// ❌ WRONG - Old API style
await tablesDB.createRow(
  'db123',
  'table456',
  ID.unique(),
  { field1: 'value1' }
);

// ❌ WRONG - Old API style
await tablesDB.updateRow(
  'db123',
  'table456',
  'row789',
  { field1: 'updated' }
);

// ❌ WRONG - Old API style
await tablesDB.deleteRow('db123', 'table456', 'row789');
```

## Key Differences

| Operation | Old API | New API |
|-----------|---------|---------|
| createRow | `(databaseId, tableId, rowId, data)` | `{ databaseId, tableId, rowId, data }` |
| updateRow | `(databaseId, tableId, rowId, data)` | `{ databaseId, tableId, rowId, data }` |
| deleteRow | `(databaseId, tableId, rowId)` | `{ databaseId, tableId, rowId }` |
| getRow | `(databaseId, tableId, rowId)` | `{ databaseId, tableId, rowId }` |
| listRows | `(databaseId, tableId, queries)` | `{ databaseId, tableId, queries }` |

## Migration Checklist

When updating code to use the new API:

- [ ] Replace positional parameters with named object parameters
- [ ] Update parameter names: use `rowId` (not `documentId` or `docId`)
- [ ] Ensure all database operations use the new API
- [ ] Run TypeScript compiler to verify no type errors
- [ ] Test the updated code path
- [ ] Update any related tests

## Column Creation API

### ✅ CORRECT: Column Creation with `xdefault`

When creating columns with default values, use the `xdefault` property (not `default`):

```typescript
// ✅ CORRECT - Integer column with default value
await tablesDB.createIntegerColumn({
  databaseId: 'db123',
  tableId: 'table456',
  key: 'viewCount',
  required: false,
  xdefault: 0  // Use xdefault, NOT default
});

// ✅ CORRECT - String column with default value
await tablesDB.createVarcharColumn({
  databaseId: 'db123',
  tableId: 'table456',
  key: 'status',
  size: 255,
  required: false,
  xdefault: 'active'  // Use xdefault, NOT default
});

// ✅ CORRECT - Boolean column with default value
await tablesDB.createBooleanColumn({
  databaseId: 'db123',
  tableId: 'table456',
  key: 'isActive',
  required: false,
  xdefault: true  // Use xdefault, NOT default
});
```

### ❌ WRONG: Using `default` instead of `xdefault`

```typescript
// ❌ WRONG - This will cause TypeScript errors
await tablesDB.createIntegerColumn({
  databaseId: 'db123',
  tableId: 'table456',
  key: 'viewCount',
  required: false,
  default: 0  // WRONG - Use xdefault instead
});
```

### Why `xdefault`?

The `xdefault` property name is used in the Appwrite TablesDB API to avoid conflicts with JavaScript reserved keywords. This is the correct and only valid property name for setting default values on columns.

## Enforcement

- All new code must use the new named-parameter API
- Existing code using the old API must be updated during refactoring
- Code reviews will flag any use of the old positional-parameter API
- Build errors related to API mismatches should be fixed immediately
- **Column creation must use `xdefault` (not `default`) for default values**

## Related Documentation

- Appwrite TablesDB Documentation: https://appwrite.io/docs/products/databases/tables
- Project API Standards: See `tech.md` for technology stack details
