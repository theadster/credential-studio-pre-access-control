# TablesDB Bulk Operations Parameter Fix

## Issue
Bulk edit operations were failing with "Database not found" error when attempting to use TablesDB atomic operations.

## Root Cause
The TablesDB bulk operation methods (`upsertRows`, `createRows`, `deleteRows`) use **positional parameters**, not named object parameters.

### Incorrect Implementation
```typescript
// ❌ WRONG - Using object with named parameters
await tablesDB.upsertRows({
  databaseId: config.databaseId,
  tableId: config.tableId,
  rows: rows
});
```

### Correct Implementation
```typescript
// ✅ CORRECT - Using positional parameters
await tablesDB.upsertRows(
  config.databaseId,
  config.tableId,
  rows
);
```

## Official Documentation Reference

From Appwrite's official documentation:

### Upsert Rows
```javascript
const result = await tablesDB.upsertRows(
    '<DATABASE_ID>',
    '<TABLE_ID>',
    [
        { $id: sdk.ID.unique(), name: 'New Row 1' },
        { $id: 'row-id-2', name: 'New Row 2' }
    ]
);
```

### Create Rows
```javascript
const result = await tablesDB.createRows(
    '<DATABASE_ID>',
    '<TABLE_ID>',
    [
        { $id: sdk.ID.unique(), name: 'Row 1' },
        { $id: sdk.ID.unique(), name: 'Row 2' }
    ]
);
```

### Delete Rows
```javascript
const result = await tablesDB.deleteRows(
    '<DATABASE_ID>',
    '<TABLE_ID>',
    [sdk.Query.equal('status', 'archived')]
);
```

### Update Rows
```javascript
const result = await tablesDB.updateRows(
    '<DATABASE_ID>',
    '<TABLE_ID>',
    { status: 'published' },
    [sdk.Query.equal('status', 'draft')]
);
```

## Changes Made

### File: `src/lib/bulkOperations.ts`

1. **bulkEditWithFallback** - Fixed `upsertRows` call
2. **bulkDeleteWithFallback** - Fixed `deleteRows` call
3. **bulkImportWithFallback** - Fixed `createRows` call

All methods now use positional parameters instead of object parameters.

## Atomic Behavior

According to Appwrite documentation:

> Bulk operations in Appwrite are atomic, meaning they follow an all-or-nothing approach. Either all rows in your bulk request succeed, or all rows fail.

This ensures:
- **Data consistency**: Database remains consistent even if some operations would fail
- **Race condition prevention**: Multiple clients can safely perform bulk operations simultaneously
- **Simplified error handling**: Only need to handle complete success or complete failure

## Testing

After this fix, bulk operations should:
1. Successfully execute using TablesDB atomic operations
2. Log: `[bulkEditWithFallback] Starting atomic bulk edit of X items using TablesDB`
3. Log: `[bulkEditWithFallback] Atomic bulk update completed successfully`
4. Return `usedTransactions: true` in the response

If atomic operation fails, it will fall back to sequential updates with proper error handling.

## Related Files
- `src/lib/bulkOperations.ts` - Bulk operation implementations
- `src/pages/api/attendees/bulk-edit.ts` - Bulk edit API endpoint
- `src/pages/api/attendees/bulk-delete.ts` - Bulk delete API endpoint
- `src/pages/api/attendees/import.ts` - Bulk import API endpoint

## Date
2025-01-XX
