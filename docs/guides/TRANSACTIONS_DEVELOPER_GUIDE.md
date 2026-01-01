---
title: "Appwrite Transactions Developer Guide"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/lib/bulkOperations.ts"]
---

# Appwrite Transactions Developer Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [Transaction Utilities](#transaction-utilities)
5. [Bulk Operations](#bulk-operations)
6. [Error Handling](#error-handling)
7. [Fallback Strategy](#fallback-strategy)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

This guide provides comprehensive documentation for using Appwrite's TablesDB Transactions API in CredentialStudio. The transaction system ensures atomic operations, automatic rollback on failure, and seamless fallback to legacy APIs when needed.

### What are Transactions?

Transactions allow you to execute multiple database operations atomically - either all operations succeed, or all fail and rollback. This eliminates partial failure scenarios and ensures data consistency.

### Key Benefits

- ✅ **Atomic Operations**: All-or-nothing execution
- ✅ **Automatic Rollback**: Failed operations are automatically reverted
- ✅ **Performance**: 75-90% faster than sequential operations
- ✅ **Audit Trail**: Guaranteed audit log consistency
- ✅ **Conflict Handling**: Automatic retry with exponential backoff
- ✅ **Fallback Support**: Seamless degradation to legacy API

---

## Quick Start

### Basic Transaction Example

```typescript
import { createSessionClient } from '@/lib/appwrite';
import { executeTransactionWithRetry } from '@/lib/transactions';
import { ID } from 'appwrite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tablesDB } = createSessionClient(req);
  
  try {
    // Define operations
    const operations = [
      {
        action: 'create',
        databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        tableId: 'attendees',
        rowId: ID.unique(),
        data: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      },
      {
        action: 'create',
        databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        tableId: 'logs',
        data: {
          userId: 'user123',
          action: 'CREATE_ATTENDEE',
          details: JSON.stringify({ name: 'John Doe' })
        }
      }
    ];
    
    // Execute transaction
    await executeTransactionWithRetry(tablesDB, operations, {}, 'attendee_create');
    
    return res.status(200).json({ success: true });
  } catch (error) {
    return handleTransactionError(error, res);
  }
}
```

### Bulk Operation Example

```typescript
import { bulkImportWithFallback } from '@/lib/bulkOperations';

const result = await bulkImportWithFallback(tablesDB, databases, {
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  tableId: 'attendees',
  items: attendees.map(a => ({ data: a })),
  auditLog: {
    tableId: 'logs',
    userId: user.$id,
    action: 'BULK_IMPORT_ATTENDEES',
    details: { count: attendees.length }
  }
});

console.log(`Imported ${result.createdCount} attendees`);
console.log(`Used transactions: ${result.usedTransactions}`);
```

---

## Core Concepts

### Transaction Operations

A transaction operation defines a single database action:

```typescript
interface TransactionOperation {
  action: 'create' | 'update' | 'upsert' | 'delete' | 
          'increment' | 'decrement' | 
          'bulkCreate' | 'bulkUpdate' | 'bulkUpsert' | 'bulkDelete';
  databaseId: string;
  tableId: string;
  rowId?: string;  // Optional for create, required for update/delete
  data?: any;      // Data to create/update
}
```

### Plan Limits

Different Appwrite plans have different transaction limits:

```typescript
const TRANSACTION_LIMITS = {
  FREE: 100,    // 100 operations per transaction
  PRO: 1000,    // 1,000 operations per transaction
  SCALE: 2500   // 2,500 operations per transaction
};
```

Configure your plan in `.env.local`:

```bash
APPWRITE_PLAN=PRO
```

### Batching

When operations exceed plan limits, they're automatically batched:

```typescript
// 1,500 operations on PRO plan (limit: 1,000)
// Automatically batched into:
// - Batch 1: 999 operations + 1 audit log
// - Batch 2: 500 operations + 1 audit log
```

---

## Transaction Utilities

### executeTransaction()

Basic transaction execution with automatic rollback.

**Signature:**
```typescript
async function executeTransaction(
  tablesDB: TablesDB,
  operations: TransactionOperation[],
  operationType?: string
): Promise<void>
```

**Example:**
```typescript
await executeTransaction(tablesDB, [
  {
    action: 'create',
    databaseId: 'db123',
    tableId: 'attendees',
    rowId: ID.unique(),
    data: { name: 'John Doe' }
  }
], 'attendee_create');
```

**When to Use:**
- Simple operations without conflict concerns
- Operations that don't need retry logic
- Testing and development

**When NOT to Use:**
- High-concurrency scenarios (use `executeTransactionWithRetry` instead)
- Operations that might conflict with other users

---

### executeTransactionWithRetry()

Transaction execution with automatic conflict retry and exponential backoff.

**Signature:**
```typescript
async function executeTransactionWithRetry(
  tablesDB: TablesDB,
  operations: TransactionOperation[],
  options?: TransactionOptions,
  operationType?: string
): Promise<void>

interface TransactionOptions {
  maxRetries?: number;      // Default: 3
  retryDelay?: number;      // Default: 100ms
  timeout?: number;
}
```

**Example:**
```typescript
await executeTransactionWithRetry(
  tablesDB,
  operations,
  {
    maxRetries: 5,
    retryDelay: 200
  },
  'user_linking'
);
```

**Retry Behavior:**
- Attempt 1: Immediate
- Attempt 2: 100ms delay
- Attempt 3: 200ms delay
- Attempt 4: 400ms delay
- Attempt 5: 800ms delay

**When to Use:**
- Production operations
- Multi-user scenarios
- Operations that might conflict
- **Recommended for all production code**

**When NOT to Use:**
- Operations that should never retry (e.g., idempotency concerns)
- Testing scenarios where you want to see immediate failures

---

### executeBatchedTransaction()

Automatically batches operations to respect plan limits with fallback support.

**Signature:**
```typescript
async function executeBatchedTransaction(
  tablesDB: TablesDB,
  operations: TransactionOperation[],
  options?: {
    batchSize?: number;
    enableFallback?: boolean;
    fallbackFn?: () => Promise<any>;
  },
  operationType?: string
): Promise<{
  success: boolean;
  usedFallback: boolean;
  batchCount?: number;
  error?: Error;
}>
```

**Example:**
```typescript
const result = await executeBatchedTransaction(
  tablesDB,
  operations,
  {
    batchSize: 1000,
    enableFallback: true,
    fallbackFn: async () => {
      // Legacy API implementation
    }
  },
  'bulk_import'
);

if (result.usedFallback) {
  console.log('Fell back to legacy API');
} else {
  console.log(`Completed in ${result.batchCount} batches`);
}
```

**When to Use:**
- Bulk operations with unknown size
- Operations that might exceed plan limits
- When you want automatic fallback

**When NOT to Use:**
- Small operations (< 100 items)
- When you need precise control over batching

---

### executeBulkOperationWithFallback()

High-level wrapper that combines batching and fallback logic.

**Signature:**
```typescript
async function executeBulkOperationWithFallback<T>(
  tablesDB: TablesDB,
  databases: any,
  operations: TransactionOperation[],
  legacyFn: () => Promise<T>,
  options: {
    operationType: 'import' | 'delete' | 'edit';
    itemCount: number;
  }
): Promise<{
  result: T | null;
  usedTransactions: boolean;
  batchCount?: number;
}>
```

**Example:**
```typescript
const result = await executeBulkOperationWithFallback(
  tablesDB,
  databases,
  operations,
  async () => {
    // Legacy sequential implementation
    for (const item of items) {
      await databases.createDocument(...);
    }
  },
  {
    operationType: 'import',
    itemCount: items.length
  }
);
```

**When to Use:**
- Migrating existing bulk operations
- When you need guaranteed fallback
- Production bulk operations

---

## Bulk Operations

### bulkImportWithFallback()

Import multiple records atomically with automatic fallback.

**Signature:**
```typescript
async function bulkImportWithFallback(
  tablesDB: TablesDB,
  databases: any,
  config: {
    databaseId: string;
    tableId: string;
    items: Array<{ data: any }>;
    auditLog: {
      tableId: string;
      userId: string;
      action: string;
      details: any;
    };
  }
): Promise<{
  createdCount: number;
  usedTransactions: boolean;
  batchCount?: number;
}>
```

**Example:**
```typescript
const result = await bulkImportWithFallback(tablesDB, databases, {
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  tableId: 'attendees',
  items: [
    { data: { name: 'John Doe', email: 'john@example.com' } },
    { data: { name: 'Jane Smith', email: 'jane@example.com' } }
  ],
  auditLog: {
    tableId: 'logs',
    userId: user.$id,
    action: 'BULK_IMPORT_ATTENDEES',
    details: { count: 2, source: 'csv' }
  }
});

console.log(`Imported ${result.createdCount} records`);
if (result.usedTransactions) {
  console.log(`Completed in ${result.batchCount || 1} batch(es)`);
} else {
  console.log('Used legacy API fallback');
}
```

**Performance:**
- Transactions: ~2 seconds for 100 items (83% faster)
- Legacy API: ~12 seconds for 100 items

---

### bulkDeleteWithFallback()

Delete multiple records atomically with automatic fallback.

**Signature:**
```typescript
async function bulkDeleteWithFallback(
  tablesDB: TablesDB,
  databases: any,
  config: {
    databaseId: string;
    tableId: string;
    rowIds: string[];
    auditLog: {
      tableId: string;
      userId: string;
      action: string;
      details: any;
    };
  }
): Promise<{
  deletedCount: number;
  usedTransactions: boolean;
  batchCount?: number;
}>
```

**Example:**
```typescript
const result = await bulkDeleteWithFallback(tablesDB, databases, {
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  tableId: 'attendees',
  rowIds: ['id1', 'id2', 'id3'],
  auditLog: {
    tableId: 'logs',
    userId: user.$id,
    action: 'BULK_DELETE_ATTENDEES',
    details: { count: 3, reason: 'cleanup' }
  }
});

console.log(`Deleted ${result.deletedCount} records`);
```

**Performance:**
- Transactions: ~2 seconds for 50 items (80% faster)
- Legacy API: ~10 seconds for 50 items

---

### bulkEditWithFallback()

Update multiple records atomically with automatic fallback.

**Signature:**
```typescript
async function bulkEditWithFallback(
  tablesDB: TablesDB,
  databases: any,
  config: {
    databaseId: string;
    tableId: string;
    updates: Array<{ rowId: string; data: any }>;
    auditLog: {
      tableId: string;
      userId: string;
      action: string;
      details: any;
    };
  }
): Promise<{
  updatedCount: number;
  usedTransactions: boolean;
  batchCount?: number;
}>
```

**Example:**
```typescript
const result = await bulkEditWithFallback(tablesDB, databases, {
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  tableId: 'attendees',
  updates: [
    { rowId: 'id1', data: { status: 'checked-in' } },
    { rowId: 'id2', data: { status: 'checked-in' } }
  ],
  auditLog: {
    tableId: 'logs',
    userId: user.$id,
    action: 'BULK_EDIT_ATTENDEES',
    details: { count: 2, changes: { status: 'checked-in' } }
  }
});

console.log(`Updated ${result.updatedCount} records`);
```

**Performance:**
- Transactions: ~3 seconds for 50 items (75% faster)
- Legacy API: ~12 seconds for 50 items

---

## Error Handling

### Transaction Error Types

```typescript
enum TransactionErrorType {
  CONFLICT = 'CONFLICT',       // 409 - Retryable
  VALIDATION = 'VALIDATION',   // 400 - Not retryable
  PERMISSION = 'PERMISSION',   // 403 - Not retryable
  NOT_FOUND = 'NOT_FOUND',    // 404 - Not retryable
  PLAN_LIMIT = 'PLAN_LIMIT',  // 400 - Not retryable
  NETWORK = 'NETWORK',        // 500 - Retryable
  ROLLBACK = 'ROLLBACK',      // 500 - Critical
  UNKNOWN = 'UNKNOWN'         // 500 - Not retryable
}
```

### handleTransactionError()

Standardized error handling for API routes.

**Example:**
```typescript
import { handleTransactionError } from '@/lib/transactions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await executeTransactionWithRetry(tablesDB, operations);
    return res.status(200).json({ success: true });
  } catch (error) {
    // Automatically returns appropriate HTTP status and user-friendly message
    return handleTransactionError(error, res);
  }
}
```

**Error Response Format:**
```json
{
  "error": "Transaction conflict",
  "message": "The data was modified by another user. Please refresh and try again.",
  "retryable": true,
  "type": "CONFLICT",
  "details": {
    "suggestion": "Refresh the page to get the latest data, then retry your operation."
  }
}
```

### Custom Error Handling

```typescript
import { detectTransactionErrorType, TransactionErrorType } from '@/lib/transactions';

try {
  await executeTransactionWithRetry(tablesDB, operations);
} catch (error: any) {
  const errorType = detectTransactionErrorType(error);
  
  if (errorType === TransactionErrorType.CONFLICT) {
    // Handle conflict specifically
    return res.status(409).json({
      error: 'Conflict',
      message: 'Please refresh and try again'
    });
  }
  
  // Handle other errors
  return handleTransactionError(error, res);
}
```

---

## Fallback Strategy

### When Fallback is Triggered

The system automatically falls back to legacy API when:

1. **Transaction fails** after all retries
2. **Plan limits** are exceeded and batching fails
3. **Network errors** persist
4. **TablesDB API** is unavailable

### How Fallback Works

```typescript
// 1. Try transaction approach
try {
  await executeTransactionWithRetry(tablesDB, operations);
  // Success - used transactions
} catch (error) {
  // 2. Fallback to legacy API
  console.warn('Transaction failed, using fallback');
  await legacySequentialOperation();
  // Success - used fallback
}
```

### Monitoring Fallback Usage

```typescript
const result = await bulkImportWithFallback(tablesDB, databases, config);

if (!result.usedTransactions) {
  // Log fallback usage for monitoring
  console.warn('[Monitoring] Fallback used for bulk import');
  
  // Optionally alert or track metrics
  await trackMetric('transaction_fallback', {
    operation: 'bulk_import',
    itemCount: config.items.length
  });
}
```

### Disabling Fallback

For testing or when you want strict transaction-only behavior:

```typescript
const result = await executeBatchedTransaction(
  tablesDB,
  operations,
  {
    enableFallback: false  // Will throw error instead of falling back
  }
);
```

---

## Best Practices

### 1. Always Use Retry Logic in Production

```typescript
// ❌ Bad - No retry logic
await executeTransaction(tablesDB, operations);

// ✅ Good - Automatic retry
await executeTransactionWithRetry(tablesDB, operations);
```

### 2. Include Audit Logs in Transactions

```typescript
// ❌ Bad - Audit log separate (can fail independently)
await executeTransaction(tablesDB, dataOperations);
await databases.createDocument(...); // Audit log

// ✅ Good - Audit log in transaction (atomic)
const operations = [
  ...dataOperations,
  {
    action: 'create',
    databaseId: 'db123',
    tableId: 'logs',
    data: { /* audit log */ }
  }
];
await executeTransactionWithRetry(tablesDB, operations);
```

### 3. Use Bulk Operation Wrappers

```typescript
// ❌ Bad - Manual transaction setup
const operations = items.map(item => ({
  action: 'create',
  databaseId: 'db123',
  tableId: 'attendees',
  rowId: ID.unique(),
  data: item
}));
await executeBatchedTransaction(tablesDB, operations);

// ✅ Good - Use wrapper with fallback
await bulkImportWithFallback(tablesDB, databases, {
  databaseId: 'db123',
  tableId: 'attendees',
  items: items.map(data => ({ data })),
  auditLog: { /* ... */ }
});
```

### 4. Validate Before Transaction

```typescript
// ✅ Good - Validate first
const errors = validateAttendees(attendees);
if (errors.length > 0) {
  return res.status(400).json({ errors });
}

// Then execute transaction
await bulkImportWithFallback(tablesDB, databases, config);
```

### 5. Use Appropriate Operation Types

```typescript
// For monitoring and debugging
await executeTransactionWithRetry(
  tablesDB,
  operations,
  {},
  'attendee_create'  // ✅ Descriptive operation type
);
```

### 6. Handle Errors Gracefully

```typescript
try {
  await executeTransactionWithRetry(tablesDB, operations);
  return res.status(200).json({ success: true });
} catch (error) {
  // ✅ Use standardized error handling
  return handleTransactionError(error, res);
}
```

### 7. Log Important Events

```typescript
console.log(`[Transaction] Starting bulk import of ${items.length} items`);

const result = await bulkImportWithFallback(tablesDB, databases, config);

console.log(
  `[Transaction] Import complete: ${result.createdCount} created, ` +
  `used transactions: ${result.usedTransactions}`
);
```

---

## Common Patterns

### Pattern 1: Single Record with Audit Log

```typescript
async function createAttendeeWithAudit(
  tablesDB: TablesDB,
  attendeeData: any,
  userId: string
) {
  const attendeeId = ID.unique();
  
  const operations = [
    {
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'attendees',
      rowId: attendeeId,
      data: attendeeData
    },
    {
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'logs',
      data: {
        userId,
        action: 'CREATE_ATTENDEE',
        details: JSON.stringify({ attendeeId, name: attendeeData.name }),
        timestamp: new Date().toISOString()
      }
    }
  ];
  
  await executeTransactionWithRetry(tablesDB, operations, {}, 'attendee_create');
  
  return attendeeId;
}
```

### Pattern 2: Multi-Step Workflow

```typescript
async function linkUserWithTeam(
  tablesDB: TablesDB,
  userData: any,
  teamId: string,
  userId: string
) {
  const userProfileId = ID.unique();
  
  const operations = [
    // 1. Create user profile
    {
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'user_profiles',
      rowId: userProfileId,
      data: userData
    },
    // 2. Create team membership
    {
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'team_memberships',
      data: {
        userId: userProfileId,
        teamId,
        role: 'member'
      }
    },
    // 3. Audit log
    {
      action: 'create',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'logs',
      data: {
        userId,
        action: 'LINK_USER',
        details: JSON.stringify({ userProfileId, teamId }),
        timestamp: new Date().toISOString()
      }
    }
  ];
  
  await executeTransactionWithRetry(tablesDB, operations, {}, 'user_linking');
  
  return userProfileId;
}
```

### Pattern 3: Conditional Operations

```typescript
async function updateEventSettings(
  tablesDB: TablesDB,
  settingsId: string,
  updates: any,
  customFieldsToDelete: string[],
  userId: string
) {
  const operations = [
    // 1. Update core settings
    {
      action: 'update',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: 'event_settings',
      rowId: settingsId,
      data: updates
    }
  ];
  
  // 2. Conditionally add custom field deletions
  if (customFieldsToDelete.length > 0) {
    customFieldsToDelete.forEach(fieldId => {
      operations.push({
        action: 'delete',
        databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        tableId: 'custom_fields',
        rowId: fieldId
      });
    });
  }
  
  // 3. Audit log
  operations.push({
    action: 'create',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    tableId: 'logs',
    data: {
      userId,
      action: 'UPDATE_EVENT_SETTINGS',
      details: JSON.stringify({
        settingsId,
        deletedFields: customFieldsToDelete.length
      }),
      timestamp: new Date().toISOString()
    }
  });
  
  await executeTransactionWithRetry(tablesDB, operations, {}, 'event_settings_update');
}
```

### Pattern 4: Bulk Operation with Validation

```typescript
async function bulkImportAttendeesWithValidation(
  tablesDB: TablesDB,
  databases: any,
  attendees: any[],
  userId: string
) {
  // 1. Validate all attendees first
  const validationErrors = [];
  for (let i = 0; i < attendees.length; i++) {
    const errors = validateAttendee(attendees[i]);
    if (errors.length > 0) {
      validationErrors.push({ row: i + 1, errors });
    }
  }
  
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
  }
  
  // 2. Execute bulk import
  const result = await bulkImportWithFallback(tablesDB, databases, {
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    tableId: 'attendees',
    items: attendees.map(data => ({ data })),
    auditLog: {
      tableId: 'logs',
      userId,
      action: 'BULK_IMPORT_ATTENDEES',
      details: { count: attendees.length, source: 'csv' }
    }
  });
  
  return result;
}
```

---

## Troubleshooting

### Issue: Transaction Conflicts

**Symptoms:**
- 409 errors
- "Transaction conflict" messages
- Operations failing intermittently

**Solutions:**
1. Ensure you're using `executeTransactionWithRetry()`
2. Increase retry attempts:
   ```typescript
   await executeTransactionWithRetry(tablesDB, operations, {
     maxRetries: 5,
     retryDelay: 200
   });
   ```
3. Reduce concurrent operations on the same data
4. Implement optimistic locking if needed

---

### Issue: Plan Limit Exceeded

**Symptoms:**
- "Plan limit exceeded" errors
- Operations failing for large batches

**Solutions:**
1. Check your plan configuration:
   ```bash
   # .env.local
   APPWRITE_PLAN=PRO  # Ensure this matches your actual plan
   ```
2. Use bulk operation wrappers (they handle batching automatically)
3. Manually batch operations:
   ```typescript
   const batchSize = getTransactionLimit() - 1;
   for (let i = 0; i < operations.length; i += batchSize) {
     const batch = operations.slice(i, i + batchSize);
     await executeTransactionWithRetry(tablesDB, batch);
   }
   ```

---

### Issue: Fallback Always Used

**Symptoms:**
- `usedTransactions: false` in all results
- Slower performance than expected

**Solutions:**
1. Check TablesDB client initialization:
   ```typescript
   const { tablesDB } = createSessionClient(req);
   console.log('TablesDB available:', !!tablesDB);
   ```
2. Verify SDK version supports TablesDB:
   ```json
   {
     "node-appwrite": "^19.1.0"
   }
   ```
3. Check for transaction errors in logs
4. Verify environment configuration

---

### Issue: Rollback Failed

**Symptoms:**
- "Rollback failed" errors
- Data inconsistency warnings

**Solutions:**
1. **CRITICAL**: Contact support immediately
2. Do not retry the operation
3. Check database state manually
4. Review transaction logs
5. Implement data recovery if needed

---

### Issue: Slow Performance

**Symptoms:**
- Transactions taking longer than expected
- Timeouts

**Solutions:**
1. Reduce operation count per transaction
2. Use batching for large operations
3. Check network latency
4. Verify database performance
5. Consider using fallback for very large operations:
   ```typescript
   if (items.length > 5000) {
     // Use legacy API for very large operations
     await legacySequentialOperation();
   } else {
     await bulkImportWithFallback(tablesDB, databases, config);
   }
   ```

---

### Issue: Audit Logs Missing

**Symptoms:**
- Operations succeed but no audit logs
- Inconsistent audit trail

**Solutions:**
1. Ensure audit log is included in transaction:
   ```typescript
   // ✅ Correct - audit log in transaction
   const operations = [
     ...dataOperations,
     { action: 'create', tableId: 'logs', data: auditData }
   ];
   ```
2. Don't create audit logs separately:
   ```typescript
   // ❌ Wrong - audit log separate
   await executeTransaction(tablesDB, dataOperations);
   await databases.createDocument(...); // Can fail independently
   ```
3. Check audit log table permissions
4. Verify audit log data format

---

## Additional Resources

- [Appwrite Transactions API Documentation](https://appwrite.io/docs/products/databases/transactions)
- [Transaction Monitoring Guide](./TRANSACTION_MONITORING_GUIDE.md)
- [Migration Design Document](../../.kiro/specs/appwrite-transactions-migration/design.md)
- [Transaction Utilities Source Code](../../src/lib/transactions.ts)
- [Bulk Operations Source Code](../../src/lib/bulkOperations.ts)

---

## Support

For questions or issues:
1. Check this guide and troubleshooting section
2. Review transaction logs and monitoring dashboard
3. Check the design document for architectural details
4. Contact the development team

---

**Last Updated:** January 2025  
**Version:** 1.0.0
