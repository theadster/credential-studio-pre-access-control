---
title: Appwrite TablesDB API Standard
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 90
related_code: ["src/lib/bulkOperations.ts", "src/pages/api/**/*.ts", "src/lib/appwrite.ts"]
---

# Appwrite TablesDB API Standard

## ⚠️ ZERO TOLERANCE ENFORCEMENT — READ THIS FIRST

This is the **absolute law** for all database operations in this project. There are NO exceptions.

### YOU MUST NEVER:
- Use the old Appwrite Databases API (`databases.createDocument`, `databases.updateDocument`, etc.)
- Use positional parameters for any TablesDB method
- Use `collectionId` — this project uses `tableId`
- Use `documentId` — this project uses `rowId`
- Use `$collectionId` — this project uses `$tableId`
- Use `databases.` prefix — this project uses `tablesDB.`
- Revert `tableId` → `collectionId` or `rowId` → `documentId` under ANY circumstance
- Change TablesDB field names to old Databases API field names during code review, refactoring, or any other operation

### IF YOU TOUCH A FILE THAT CONTAINS OLD API PATTERNS:
You MUST migrate that file to the new TablesDB API before finishing your task. Do not leave old API code in place. Do not comment it out. Replace it entirely with the correct TablesDB named-parameter API shown below.

### FORBIDDEN PATTERNS — NEVER WRITE THESE:
```typescript
// ❌ FORBIDDEN - Old Appwrite Databases API
databases.createDocument(databaseId, collectionId, documentId, data)
databases.updateDocument(databaseId, collectionId, documentId, data)
databases.deleteDocument(databaseId, collectionId, documentId)
databases.getDocument(databaseId, collectionId, documentId)
databases.listDocuments(databaseId, collectionId, queries)

// ❌ FORBIDDEN - Positional parameters on TablesDB
tablesDB.createRow('db123', 'table456', ID.unique(), data)
tablesDB.updateRow('db123', 'table456', 'row789', data)
tablesDB.deleteRow('db123', 'table456', 'row789')
tablesDB.getRow('db123', 'table456', 'row789')
tablesDB.listRows('db123', 'table456', queries)

// ❌ FORBIDDEN - Wrong field names
{ collectionId: '...' }   // use tableId
{ documentId: '...' }     // use rowId
$collectionId             // use $tableId
$documentId               // use $id or rowId
```

---

## Overview

This project uses **Appwrite TablesDB** exclusively for all database operations. The TablesDB API uses named object parameters. This is the only correct API style for this project.

---

## Core CRUD Operations

### createRow
```typescript
import { TablesDB, ID } from 'appwrite'; // or 'node-appwrite' for server

const result = await tablesDB.createRow({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  rowId: ID.unique(),
  data: {
    field1: 'value1',
    field2: 'value2'
  },
  permissions: ['read("any")'] // optional
});
```

### updateRow
```typescript
const result = await tablesDB.updateRow({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  rowId: '<ROW_ID>',
  data: {
    field1: 'updated_value'
  }
});
```

### deleteRow
```typescript
await tablesDB.deleteRow({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  rowId: '<ROW_ID>'
});
```

### getRow
```typescript
const row = await tablesDB.getRow({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  rowId: '<ROW_ID>'
});
```

### listRows
```typescript
import { Query } from 'appwrite';

const result = await tablesDB.listRows({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  queries: [
    Query.limit(25),
    Query.offset(0),
    Query.equal('status', 'active'),
    Query.orderDesc('$createdAt')
  ]
});
// result.rows — array of rows
// result.total — total count
```

---

## Bulk Operations

### createRows (batch insert)
```typescript
const result = await tablesDB.createRows({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  rows: [
    { $id: ID.unique(), name: 'Row One', status: 'active' },
    { $id: ID.unique(), name: 'Row Two', status: 'active' }
  ]
});
```

---

## Transactions

Use `transactionId` to stage multiple operations and commit them atomically.

### Stage operations with transactionId
```typescript
// Stage a create inside a transaction
await tablesDB.createRow({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  rowId: ID.unique(),
  data: { title: 'Draft' },
  transactionId: '<TRANSACTION_ID>'
});

// Stage an update inside a transaction
await tablesDB.updateRow({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  rowId: '<ROW_ID>',
  data: { title: 'Published' },
  transactionId: '<TRANSACTION_ID>'
});

// Stage a delete inside a transaction
await tablesDB.deleteRow({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  rowId: '<ROW_ID>',
  transactionId: '<TRANSACTION_ID>'
});
```

### createOperations (batch mixed operations in one transaction)
```typescript
const result = await tablesDB.createOperations({
  transactionId: '<TRANSACTION_ID>',
  operations: [
    {
      action: 'create',
      databaseId: '<DATABASE_ID>',
      tableId: '<TABLE_ID>',
      rowId: ID.unique(),
      data: { name: 'New Row' }
    },
    {
      action: 'update',
      databaseId: '<DATABASE_ID>',
      tableId: '<TABLE_ID>',
      rowId: '<EXISTING_ROW_ID>',
      data: { name: 'Updated Row' }
    },
    {
      action: 'delete',
      databaseId: '<DATABASE_ID>',
      tableId: '<TABLE_ID>',
      rowId: '<ROW_TO_DELETE_ID>'
    }
  ]
});
```

---

## Column Creation API

Use `xdefault` (not `default`) for default values — `default` is a reserved JS keyword.

```typescript
// Integer column
await tablesDB.createIntegerColumn({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  key: 'viewCount',
  required: false,
  xdefault: 0
});

// String/Varchar column
await tablesDB.createVarcharColumn({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  key: 'status',
  size: 255,
  required: false,
  xdefault: 'active'
});

// Boolean column
await tablesDB.createBooleanColumn({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  key: 'isActive',
  required: false,
  xdefault: true
});

// Float column
await tablesDB.createFloatColumn({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  key: 'price',
  required: false,
  xdefault: 0.0
});

// DateTime column
await tablesDB.createDatetimeColumn({
  databaseId: '<DATABASE_ID>',
  tableId: '<TABLE_ID>',
  key: 'publishedAt',
  required: false
});
```

---

## API Quick Reference

| Operation | Named-Parameter API (CORRECT) |
|-----------|-------------------------------|
| createRow | `{ databaseId, tableId, rowId, data, permissions?, transactionId? }` |
| updateRow | `{ databaseId, tableId, rowId, data, transactionId? }` |
| deleteRow | `{ databaseId, tableId, rowId, transactionId? }` |
| getRow | `{ databaseId, tableId, rowId }` |
| listRows | `{ databaseId, tableId, queries? }` |
| createRows | `{ databaseId, tableId, rows, transactionId? }` |
| createOperations | `{ transactionId, operations[] }` |

## Field Name Reference

| Old Databases API (FORBIDDEN) | TablesDB API (CORRECT) |
|-------------------------------|------------------------|
| `collectionId` | `tableId` |
| `documentId` | `rowId` |
| `$collectionId` | `$tableId` |
| `databases.createDocument` | `tablesDB.createRow` |
| `databases.updateDocument` | `tablesDB.updateRow` |
| `databases.deleteDocument` | `tablesDB.deleteRow` |
| `databases.getDocument` | `tablesDB.getRow` |
| `databases.listDocuments` | `tablesDB.listRows` |

---

## Migration: When You Find Old API Code

If you open or touch any file that contains old Appwrite Databases API patterns, you MUST migrate it immediately:

1. Replace `databases.` calls with `tablesDB.` calls
2. Replace positional parameters with named object parameters
3. Replace `collectionId` with `tableId`
4. Replace `documentId` with `rowId`
5. Replace `$collectionId` with `$tableId`
6. Run TypeScript compiler to verify no type errors

```typescript
// BEFORE (old — must be migrated)
const doc = await databases.createDocument(
  process.env.DATABASE_ID,
  process.env.COLLECTION_ID,
  ID.unique(),
  { name: 'test' }
);

// AFTER (correct)
const row = await tablesDB.createRow({
  databaseId: process.env.DATABASE_ID!,
  tableId: process.env.TABLE_ID!,
  rowId: ID.unique(),
  data: { name: 'test' }
});
```

---

## Related Documentation

- Appwrite TablesDB Rows: https://appwrite.io/docs/products/databases/rows
- Appwrite TablesDB Bulk Operations: https://appwrite.io/docs/products/databases/bulk-operations
- Appwrite TablesDB Tables: https://appwrite.io/docs/products/databases/tables
- Appwrite TablesDB Relationships: https://appwrite.io/docs/products/databases/relationships
