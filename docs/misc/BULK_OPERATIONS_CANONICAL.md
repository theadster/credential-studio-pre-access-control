# Bulk Operations - Canonical Implementation

## Overview

The canonical implementation for bulk operations in CredentialStudio is located at:

**`src/lib/bulkOperations.ts`**

This module uses TablesDB's atomic bulk operations directly, providing guaranteed atomicity for all bulk operations.

## Implementation Details

### Technology
- **Service**: TablesDB (from node-appwrite)
- **Atomic Operations**: Built-in TablesDB methods
- **Fallback**: Sequential operations if atomic operations fail

### Exported Functions

1. **`bulkEditWithFallback()`**
   - Uses `TablesDB.upsertRows()` for atomic updates
   - Merges existing document data with updates
   - Falls back to sequential `databases.updateDocument()` calls

2. **`bulkDeleteWithFallback()`**
   - Uses `TablesDB.deleteRows()` with Query filters
   - Falls back to sequential `databases.deleteDocument()` calls

3. **`bulkImportWithFallback()`**
   - Uses `TablesDB.createRows()` for atomic inserts
   - Falls back to sequential `databases.createDocument()` calls

## Usage

```typescript
import { bulkEditWithFallback, bulkDeleteWithFallback, bulkImportWithFallback } from '@/lib/bulkOperations';

// Example: Bulk edit
const result = await bulkEditWithFallback(tablesDB, databases, {
  databaseId: 'your-db-id',
  tableId: 'your-collection-id',
  updates: [
    { rowId: 'id1', data: { field: 'value' } },
    { rowId: 'id2', data: { field: 'value' } }
  ],
  auditLog: {
    tableId: 'logs-collection-id',
    userId: 'user-id',
    action: 'BULK_EDIT',
    details: { /* audit details */ }
  }
});

console.log(`Updated ${result.updatedCount} records`);
console.log(`Used atomic transactions: ${result.usedTransactions}`);
```

## API Endpoints Using This Module

- `src/pages/api/attendees/bulk-edit.ts`
- `src/pages/api/attendees/bulk-delete.ts`
- `src/pages/api/attendees/import.ts`

## Documentation

- **Implementation Details**: `docs/fixes/TABLESDB_BULK_OPERATIONS_WORKING.md`
- **Testing Results**: `docs/testing/TRANSACTIONS_TEST_PLAN.md`
- **API Audit**: `docs/fixes/TRANSACTIONS_API_COMPREHENSIVE_AUDIT.md`

## Historical Context

### Previous Implementations (Removed)

- `src/lib/bulkOperations-backup.ts` - Removed (used transactions wrapper)
- `src/lib/bulkOperations-v2.ts` - Removed (experimental)
- `src/lib/transactions-v2.ts` - Removed (experimental)

The current implementation is the result of extensive testing and refinement to use TablesDB's native atomic operations directly, which provides the best performance and reliability.

## Key Features

✅ **Atomic Operations**: All-or-nothing guarantee for bulk operations  
✅ **Automatic Fallback**: Gracefully handles failures with sequential operations  
✅ **Audit Logging**: Comprehensive logging of all bulk operations  
✅ **Error Handling**: Detailed error reporting and recovery  
✅ **Rate Limiting**: Built-in delays for fallback operations  

## Testing

Run the test suite to verify bulk operations:

```bash
npx vitest --run src/lib/__tests__/bulkOperations.unit.test.ts
```

Or test all transaction-related functionality:

```bash
npx tsx scripts/test-all-transactions.ts
```

## Support

For issues or questions about bulk operations:
1. Check `docs/fixes/TABLESDB_BULK_OPERATIONS_WORKING.md`
2. Review test files in `src/lib/__tests__/`
3. Examine API endpoint implementations

---

**Last Updated**: 2025-10-26  
**Status**: ✅ Production Ready
