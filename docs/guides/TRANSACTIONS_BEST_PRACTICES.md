# Appwrite Transactions Best Practices

## Table of Contents

1. [General Principles](#general-principles)
2. [Transaction Design](#transaction-design)
3. [Error Handling](#error-handling)
4. [Performance Optimization](#performance-optimization)
5. [Testing](#testing)
6. [Monitoring](#monitoring)
7. [Security](#security)
8. [Common Pitfalls](#common-pitfalls)

---

## General Principles

### 1. Keep Transactions Small and Focused

**Why:** Smaller transactions are faster, less likely to conflict, and easier to debug.

```typescript
// ❌ Bad - Too many unrelated operations
const operations = [
  { action: 'create', tableId: 'attendees', ... },
  { action: 'update', tableId: 'event_settings', ... },
  { action: 'delete', tableId: 'old_data', ... },
  { action: 'create', tableId: 'notifications', ... }
];

// ✅ Good - Focused transaction
const operations = [
  { action: 'create', tableId: 'attendees', ... },
  { action: 'create', tableId: 'logs', ... }  // Related audit log
];
```

### 2. Always Include Audit Logs in Transactions

**Why:** Ensures audit trail consistency and prevents orphaned logs.

```typescript
// ❌ Bad - Audit log separate
await executeTransaction(tablesDB, dataOperations);
await databases.createDocument('logs', ...);  // Can fail independently

// ✅ Good - Audit log in transaction
const operations = [
  ...dataOperations,
  {
    action: 'create',
    tableId: 'logs',
    data: {
      userId: user.$id,
      action: 'CREATE_ATTENDEE',
      details: JSON.stringify({ ... }),
      timestamp: new Date().toISOString()
    }
  }
];
await executeTransactionWithRetry(tablesDB, operations);
```

### 3. Use Retry Logic in Production

**Why:** Handles transient conflicts and network issues automatically.

```typescript
// ❌ Bad - No retry logic
await executeTransaction(tablesDB, operations);

// ✅ Good - Automatic retry with exponential backoff
await executeTransactionWithRetry(tablesDB, operations, {
  maxRetries: 3,
  retryDelay: 100
});
```

### 4. Validate Before Executing Transactions

**Why:** Prevents wasted transaction attempts and provides better error messages.

```typescript
// ✅ Good - Validate first
const validationErrors = validateData(data);
if (validationErrors.length > 0) {
  return res.status(400).json({ errors: validationErrors });
}

// Then execute transaction
await executeTransactionWithRetry(tablesDB, operations);
```

---

## Transaction Design

### 1. Design for Atomicity

**Principle:** Group operations that must succeed or fail together.

```typescript
// ✅ Good - User profile and team membership are atomic
const operations = [
  {
    action: 'create',
    tableId: 'user_profiles',
    rowId: userProfileId,
    data: userData
  },
  {
    action: 'create',
    tableId: 'team_memberships',
    data: { userId: userProfileId, teamId }
  },
  {
    action: 'create',
    tableId: 'logs',
    data: auditData
  }
];
```

### 2. Order Operations Logically

**Principle:** Place dependent operations after their dependencies.

```typescript
// ✅ Good - Create parent before children
const operations = [
  // 1. Create parent record
  {
    action: 'create',
    tableId: 'events',
    rowId: eventId,
    data: eventData
  },
  // 2. Create child records that reference parent
  {
    action: 'create',
    tableId: 'event_settings',
    data: { eventId, ...settings }
  },
  // 3. Audit log last
  {
    action: 'create',
    tableId: 'logs',
    data: auditData
  }
];
```

### 3. Use Descriptive Operation Types

**Principle:** Operation types help with monitoring and debugging.

```typescript
// ❌ Bad - Generic operation type
await executeTransactionWithRetry(tablesDB, operations, {}, 'operation');

// ✅ Good - Descriptive operation type
await executeTransactionWithRetry(tablesDB, operations, {}, 'attendee_create');
await executeTransactionWithRetry(tablesDB, operations, {}, 'bulk_import_attendees');
await executeTransactionWithRetry(tablesDB, operations, {}, 'user_linking');
```

### 4. Avoid Long-Running Transactions

**Principle:** Keep transactions under 5 seconds to avoid timeouts.

```typescript
// ❌ Bad - Too many operations
const operations = Array(10000).fill(null).map(() => ({
  action: 'create',
  tableId: 'attendees',
  data: { ... }
}));

// ✅ Good - Use batching
await executeBatchedTransaction(tablesDB, operations, {
  batchSize: 1000
});
```

---

## Error Handling

### 1. Use Standardized Error Handling

**Principle:** Consistent error responses improve user experience.

```typescript
// ✅ Good - Standardized error handling
import { handleTransactionError } from '@/lib/transactions';

try {
  await executeTransactionWithRetry(tablesDB, operations);
  return res.status(200).json({ success: true });
} catch (error) {
  return handleTransactionError(error, res);
}
```

### 2. Provide Actionable Error Messages

**Principle:** Users should know what to do when errors occur.

```typescript
// ❌ Bad - Generic error
throw new Error('Transaction failed');

// ✅ Good - Actionable error (handled by handleTransactionError)
// Returns: "The data was modified by another user. Please refresh and try again."
```

### 3. Log Errors with Context

**Principle:** Include enough context to debug issues.

```typescript
try {
  await executeTransactionWithRetry(tablesDB, operations);
} catch (error: any) {
  console.error('[Transaction Error]', {
    operationType: 'attendee_create',
    operationCount: operations.length,
    userId: user.$id,
    error: error.message,
    code: error.code
  });
  throw error;
}
```

### 4. Handle Rollback Failures Critically

**Principle:** Rollback failures indicate data inconsistency.

```typescript
if (error.message?.includes('rollback')) {
  // Log critical error
  console.error('[CRITICAL] Rollback failed:', error);
  
  // Alert monitoring system
  await alertCriticalError('rollback_failed', error);
  
  // Return critical error to user
  return res.status(500).json({
    error: 'Critical error',
    message: 'Please contact support immediately',
    critical: true
  });
}
```

---

## Performance Optimization

### 1. Use Bulk Operations for Multiple Records

**Principle:** Bulk operations are 75-90% faster than sequential operations.

```typescript
// ❌ Bad - Sequential operations
for (const attendee of attendees) {
  await databases.createDocument('attendees', ID.unique(), attendee);
}

// ✅ Good - Bulk operation with transactions
await bulkImportWithFallback(tablesDB, databases, {
  databaseId: 'db123',
  tableId: 'attendees',
  items: attendees.map(data => ({ data })),
  auditLog: { ... }
});
```

### 2. Batch Large Operations

**Principle:** Respect plan limits to avoid errors.

```typescript
// ✅ Good - Automatic batching
await executeBatchedTransaction(tablesDB, operations, {
  batchSize: getTransactionLimit() - 1  // Leave room for audit log
});
```

### 3. Minimize Operation Count

**Principle:** Fewer operations = faster transactions.

```typescript
// ❌ Bad - Separate update for each field
operations.push(
  { action: 'update', rowId: 'id1', data: { field1: 'value1' } },
  { action: 'update', rowId: 'id1', data: { field2: 'value2' } },
  { action: 'update', rowId: 'id1', data: { field3: 'value3' } }
);

// ✅ Good - Single update with all fields
operations.push({
  action: 'update',
  rowId: 'id1',
  data: {
    field1: 'value1',
    field2: 'value2',
    field3: 'value3'
  }
});
```

### 4. Use Appropriate Retry Configuration

**Principle:** Balance between reliability and performance.

```typescript
// For high-concurrency operations
await executeTransactionWithRetry(tablesDB, operations, {
  maxRetries: 5,      // More retries
  retryDelay: 200     // Longer initial delay
});

// For low-concurrency operations
await executeTransactionWithRetry(tablesDB, operations, {
  maxRetries: 3,      // Fewer retries
  retryDelay: 100     // Shorter initial delay
});
```

---

## Testing

### 1. Test Rollback Behavior

**Principle:** Ensure transactions rollback correctly on failure.

```typescript
it('should rollback on failure', async () => {
  const operations = [
    { action: 'create', tableId: 'attendees', data: validData },
    { action: 'create', tableId: 'attendees', data: invalidData }  // Will fail
  ];
  
  await expect(
    executeTransactionWithRetry(tablesDB, operations)
  ).rejects.toThrow();
  
  // Verify no records were created
  const records = await databases.listDocuments('attendees');
  expect(records.total).toBe(0);
});
```

### 2. Test Conflict Handling

**Principle:** Verify retry logic works correctly.

```typescript
it('should retry on conflict', async () => {
  const mockTablesDB = {
    createTransaction: vi.fn()
      .mockRejectedValueOnce({ code: 409, message: 'conflict' })  // First attempt fails
      .mockResolvedValueOnce({ $id: 'tx123' }),                    // Second attempt succeeds
    createOperations: vi.fn().mockResolvedValue(undefined),
    updateTransaction: vi.fn().mockResolvedValue(undefined)
  };
  
  await executeTransactionWithRetry(mockTablesDB as any, operations);
  
  expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
});
```

### 3. Test Fallback Behavior

**Principle:** Ensure fallback works when transactions fail.

```typescript
it('should fallback to legacy API', async () => {
  const mockTablesDB = {
    createTransaction: vi.fn().mockRejectedValue(new Error('Transaction failed'))
  };
  
  const legacyFn = vi.fn().mockResolvedValue({ createdCount: 10 });
  
  const result = await bulkImportWithFallback(
    mockTablesDB as any,
    databases,
    config
  );
  
  expect(result.usedTransactions).toBe(false);
  expect(legacyFn).toHaveBeenCalled();
});
```

### 4. Test Plan Limits

**Principle:** Verify batching works correctly.

```typescript
it('should batch operations exceeding plan limit', async () => {
  const operations = Array(1500).fill(null).map(() => ({
    action: 'create',
    tableId: 'attendees',
    data: { name: 'Test' }
  }));
  
  const result = await executeBatchedTransaction(tablesDB, operations);
  
  expect(result.success).toBe(true);
  expect(result.batchCount).toBe(2);  // 1000 + 500
});
```

---

## Monitoring

### 1. Track Transaction Metrics

**Principle:** Monitor success rates, duration, and fallback usage.

```typescript
// Metrics are automatically tracked by transaction utilities
// Access them via the monitoring dashboard or logs

const metrics = await getTransactionMetrics();
console.log('Success rate:', metrics.successRate);
console.log('Average duration:', metrics.averageDuration);
console.log('Fallback usage:', metrics.fallbackRate);
```

### 2. Alert on High Failure Rates

**Principle:** Detect issues early.

```typescript
// Set up alerts for:
// - Success rate < 95%
// - Fallback usage > 5%
// - Conflict rate > 1%
// - Average duration > 3 seconds

if (metrics.successRate < 0.95) {
  await alertTeam('High transaction failure rate', metrics);
}
```

### 3. Log Important Events

**Principle:** Provide visibility into transaction execution.

```typescript
console.log(`[Transaction] Starting bulk import of ${items.length} items`);

const result = await bulkImportWithFallback(tablesDB, databases, config);

console.log(
  `[Transaction] Import complete: ${result.createdCount} created, ` +
  `used transactions: ${result.usedTransactions}, ` +
  `batches: ${result.batchCount || 1}`
);
```

### 4. Track Fallback Usage

**Principle:** Identify when and why fallback is used.

```typescript
if (!result.usedTransactions) {
  console.warn('[Monitoring] Fallback used', {
    operation: 'bulk_import',
    itemCount: items.length,
    reason: 'transaction_failed'
  });
  
  // Track metric
  await trackMetric('transaction_fallback', {
    operation: 'bulk_import',
    itemCount: items.length
  });
}
```

---

## Security

### 1. Validate Permissions Before Transactions

**Principle:** Check permissions before executing expensive operations.

```typescript
// ✅ Good - Check permissions first
if (!hasPermission(user.role, 'attendees', 'create')) {
  return res.status(403).json({ error: 'Permission denied' });
}

// Then execute transaction
await executeTransactionWithRetry(tablesDB, operations);
```

### 2. Sanitize Input Data

**Principle:** Prevent injection attacks and data corruption.

```typescript
// ✅ Good - Sanitize input
const sanitizedData = {
  name: sanitizeString(data.name),
  email: sanitizeEmail(data.email),
  phone: sanitizePhone(data.phone)
};

const operations = [{
  action: 'create',
  tableId: 'attendees',
  data: sanitizedData
}];
```

### 3. Don't Log Sensitive Data

**Principle:** Protect user privacy in logs.

```typescript
// ❌ Bad - Logs sensitive data
console.log('[Transaction] Creating user:', userData);

// ✅ Good - Logs only non-sensitive data
console.log('[Transaction] Creating user:', {
  userId: userData.id,
  role: userData.role
  // Don't log email, phone, etc.
});
```

### 4. Use Audit Logs for Compliance

**Principle:** Maintain complete audit trail.

```typescript
// ✅ Good - Comprehensive audit log
const auditLog = {
  userId: user.$id,
  action: 'CREATE_ATTENDEE',
  details: JSON.stringify({
    attendeeId,
    timestamp: new Date().toISOString(),
    ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
  })
};
```

---

## Common Pitfalls

### 1. Forgetting to Include Audit Logs

**Problem:** Audit logs created separately can fail independently.

**Solution:**
```typescript
// ✅ Always include audit log in transaction
const operations = [
  ...dataOperations,
  { action: 'create', tableId: 'logs', data: auditData }
];
```

### 2. Not Using Retry Logic

**Problem:** Transient conflicts cause unnecessary failures.

**Solution:**
```typescript
// ✅ Always use retry logic in production
await executeTransactionWithRetry(tablesDB, operations);
```

### 3. Exceeding Plan Limits

**Problem:** Large operations fail without batching.

**Solution:**
```typescript
// ✅ Use bulk operation wrappers (they handle batching)
await bulkImportWithFallback(tablesDB, databases, config);
```

### 4. Not Validating Before Transactions

**Problem:** Invalid data causes transaction failures.

**Solution:**
```typescript
// ✅ Validate first
const errors = validateData(data);
if (errors.length > 0) {
  return res.status(400).json({ errors });
}
await executeTransactionWithRetry(tablesDB, operations);
```

### 5. Creating Too Many Small Transactions

**Problem:** Multiple small transactions are slower and more likely to conflict.

**Solution:**
```typescript
// ❌ Bad - Multiple small transactions
for (const item of items) {
  await executeTransaction(tablesDB, [{ action: 'create', data: item }]);
}

// ✅ Good - Single bulk transaction
await bulkImportWithFallback(tablesDB, databases, {
  items: items.map(data => ({ data })),
  ...config
});
```

### 6. Not Handling Rollback Failures

**Problem:** Rollback failures can leave data in inconsistent state.

**Solution:**
```typescript
// ✅ Handle rollback failures critically
if (error.message?.includes('rollback')) {
  console.error('[CRITICAL] Rollback failed');
  await alertCriticalError('rollback_failed', error);
  return res.status(500).json({
    error: 'Critical error',
    message: 'Contact support immediately',
    critical: true
  });
}
```

### 7. Ignoring Fallback Usage

**Problem:** High fallback usage indicates transaction issues.

**Solution:**
```typescript
// ✅ Monitor and alert on fallback usage
if (!result.usedTransactions) {
  console.warn('[Monitoring] Fallback used');
  await trackMetric('transaction_fallback', { ... });
}
```

### 8. Not Testing Rollback Behavior

**Problem:** Rollback bugs can cause data corruption.

**Solution:**
```typescript
// ✅ Always test rollback behavior
it('should rollback on failure', async () => {
  await expect(executeTransaction(tablesDB, invalidOperations))
    .rejects.toThrow();
  
  // Verify no data was created
  const records = await databases.listDocuments('table');
  expect(records.total).toBe(0);
});
```

---

## Quick Reference Checklist

Before deploying transaction code, verify:

- [ ] Using `executeTransactionWithRetry()` in production
- [ ] Audit logs included in transactions
- [ ] Input validation before transactions
- [ ] Appropriate error handling with `handleTransactionError()`
- [ ] Descriptive operation types for monitoring
- [ ] Bulk operations use wrapper functions
- [ ] Tests cover rollback behavior
- [ ] Tests cover conflict handling
- [ ] Monitoring and logging in place
- [ ] Permissions checked before transactions
- [ ] Sensitive data not logged
- [ ] Plan limits respected (batching if needed)

---

## Additional Resources

- [Transaction Developer Guide](./TRANSACTIONS_DEVELOPER_GUIDE.md)
- [Transaction Monitoring Guide](./TRANSACTION_MONITORING_GUIDE.md)
- [Transaction Utilities Source Code](../../src/lib/transactions.ts)

---

**Last Updated:** January 2025  
**Version:** 1.0.0
