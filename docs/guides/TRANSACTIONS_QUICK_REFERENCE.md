# Appwrite Transactions Quick Reference

## Quick Start

```typescript
import { executeTransactionWithRetry } from '@/lib/transactions';
import { bulkImportWithFallback } from '@/lib/bulkOperations';
import { ID } from 'appwrite';

// Single operation with audit log
const operations = [
  {
    action: 'create',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    tableId: 'attendees',
    rowId: ID.unique(),
    data: { name: 'John Doe' }
  },
  {
    action: 'create',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    tableId: 'logs',
    data: { userId: user.$id, action: 'CREATE_ATTENDEE', details: '...' }
  }
];

await executeTransactionWithRetry(tablesDB, operations, {}, 'attendee_create');

// Bulk operation
await bulkImportWithFallback(tablesDB, databases, {
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  tableId: 'attendees',
  items: attendees.map(data => ({ data })),
  auditLog: { tableId: 'logs', userId: user.$id, action: 'BULK_IMPORT', details: {} }
});
```

## Core Functions

| Function | Use Case | Retry | Batching | Fallback |
|----------|----------|-------|----------|----------|
| `executeTransaction()` | Simple operations | ❌ | ❌ | ❌ |
| `executeTransactionWithRetry()` | Production operations | ✅ | ❌ | ❌ |
| `executeBatchedTransaction()` | Large operations | ✅ | ✅ | ✅ |
| `bulkImportWithFallback()` | Bulk imports | ✅ | ✅ | ✅ |
| `bulkDeleteWithFallback()` | Bulk deletes | ✅ | ✅ | ✅ |
| `bulkEditWithFallback()` | Bulk updates | ✅ | ✅ | ✅ |

## Plan Limits

| Plan | Operations per Transaction |
|------|---------------------------|
| FREE | 100 |
| PRO | 1,000 |
| SCALE | 2,500 |

Configure in `.env.local`:
```bash
APPWRITE_PLAN=PRO
```

## Error Types

| Type | HTTP | Retryable | Description |
|------|------|-----------|-------------|
| CONFLICT | 409 | ✅ | Concurrent modification |
| VALIDATION | 400 | ❌ | Invalid data |
| PERMISSION | 403 | ❌ | Insufficient permissions |
| NOT_FOUND | 404 | ❌ | Resource not found |
| PLAN_LIMIT | 400 | ❌ | Exceeds plan limits |
| NETWORK | 500 | ✅ | Network/timeout error |
| ROLLBACK | 500 | ❌ | Rollback failed (critical) |
| UNKNOWN | 500 | ❌ | Unknown error |

## Error Handling

```typescript
import { handleTransactionError } from '@/lib/transactions';

try {
  await executeTransactionWithRetry(tablesDB, operations);
  return res.status(200).json({ success: true });
} catch (error) {
  return handleTransactionError(error, res);
}
```

## Retry Configuration

```typescript
await executeTransactionWithRetry(tablesDB, operations, {
  maxRetries: 3,      // Default: 3
  retryDelay: 100     // Default: 100ms (exponential backoff)
});
```

**Retry Schedule:**
- Attempt 1: Immediate
- Attempt 2: 100ms delay
- Attempt 3: 200ms delay
- Attempt 4: 400ms delay
- Attempt 5: 800ms delay

## Performance Metrics

| Operation | Items | Transaction Time | Legacy Time | Improvement |
|-----------|-------|-----------------|-------------|-------------|
| Import | 100 | ~2s | ~12s | 83% faster |
| Delete | 50 | ~2s | ~10s | 80% faster |
| Edit | 50 | ~3s | ~12s | 75% faster |

## Best Practices Checklist

- [ ] Use `executeTransactionWithRetry()` in production
- [ ] Include audit logs in transactions
- [ ] Validate data before transactions
- [ ] Use `handleTransactionError()` for errors
- [ ] Use descriptive operation types
- [ ] Use bulk operation wrappers for multiple records
- [ ] Test rollback behavior
- [ ] Monitor transaction metrics
- [ ] Check permissions before transactions
- [ ] Don't log sensitive data

## Common Patterns

### Single Record with Audit Log
```typescript
const operations = [
  { action: 'create', tableId: 'data', rowId: ID.unique(), data: {...} },
  { action: 'create', tableId: 'logs', data: {...} }
];
await executeTransactionWithRetry(tablesDB, operations);
```

### Bulk Import
```typescript
await bulkImportWithFallback(tablesDB, databases, {
  databaseId: 'db123',
  tableId: 'attendees',
  items: items.map(data => ({ data })),
  auditLog: { tableId: 'logs', userId: user.$id, action: 'IMPORT', details: {} }
});
```

### Multi-Step Workflow
```typescript
const operations = [
  { action: 'create', tableId: 'profiles', rowId: profileId, data: {...} },
  { action: 'create', tableId: 'memberships', data: { userId: profileId, ...} },
  { action: 'create', tableId: 'logs', data: {...} }
];
await executeTransactionWithRetry(tablesDB, operations);
```

## Troubleshooting

### Transaction Conflicts (409)
- ✅ Use `executeTransactionWithRetry()`
- ✅ Increase `maxRetries` to 5
- ✅ Reduce concurrent operations

### Plan Limit Exceeded
- ✅ Check `APPWRITE_PLAN` in `.env.local`
- ✅ Use bulk operation wrappers (auto-batch)
- ✅ Manually batch with `getTransactionLimit()`

### Fallback Always Used
- ✅ Check TablesDB client initialization
- ✅ Verify SDK version (node-appwrite ^19.1.0)
- ✅ Check transaction error logs

### Rollback Failed (Critical)
- ⚠️ Contact support immediately
- ⚠️ Do not retry operation
- ⚠️ Check database state manually

## Environment Configuration

```bash
# .env.local
APPWRITE_PLAN=PRO                    # FREE, PRO, or SCALE
ENABLE_TRANSACTIONS=true             # Enable transactions
ENABLE_TRANSACTION_FALLBACK=true     # Enable fallback to legacy API
TRANSACTIONS_ENDPOINTS=bulk-import,bulk-delete,bulk-edit  # Enabled endpoints
```

## Monitoring

```typescript
// Check if transactions were used
if (!result.usedTransactions) {
  console.warn('Fallback used');
  await trackMetric('transaction_fallback', { operation: 'import' });
}

// Check batch count
if (result.batchCount) {
  console.log(`Completed in ${result.batchCount} batches`);
}
```

## Additional Resources

- [Developer Guide](./TRANSACTIONS_DEVELOPER_GUIDE.md) - Comprehensive documentation
- [Best Practices](./TRANSACTIONS_BEST_PRACTICES.md) - Production guidelines
- [Code Examples](./TRANSACTIONS_CODE_EXAMPLES.md) - 15 real-world examples
- [Monitoring Guide](./TRANSACTION_MONITORING_GUIDE.md) - Metrics and alerts

---

**Version:** 1.0.0  
**Last Updated:** January 2025
