# Design Document: Appwrite Transactions API Migration

## Overview

This design document outlines the architecture and implementation approach for migrating CredentialStudio from Appwrite's Documents API to the TablesDB API with Transactions support. The migration will be implemented in phases, starting with high-impact bulk operations and progressing to single operations with audit logs.

The design prioritizes:
1. **Data consistency** - Eliminate partial failure scenarios
2. **Performance** - Reduce operation times by 75-90%
3. **Backward compatibility** - Allow incremental migration with rollback capability
4. **Maintainability** - Create reusable utilities and clear patterns
5. **Observability** - Comprehensive logging and monitoring

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Next.js)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Attendees │  │   Users    │  │   Roles    │  ...       │
│  │    API     │  │    API     │  │    API     │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        │                │                │                    │
│        └────────────────┴────────────────┘                    │
│                         │                                     │
│                         ▼                                     │
│              ┌──────────────────────┐                        │
│              │ Transaction Utilities │                        │
│              │  - executeTransaction │                        │
│              │  - retry logic        │                        │
│              │  - batching           │                        │
│              └──────────┬───────────┘                        │
│                         │                                     │
│        ┌────────────────┴────────────────┐                   │
│        │                                  │                   │
│        ▼                                  ▼                   │
│  ┌──────────┐                      ┌──────────┐             │
│  │ TablesDB │                      │Databases │             │
│  │   API    │ (New)                │   API    │ (Legacy)    │
│  └────┬─────┘                      └────┬─────┘             │
└───────┼──────────────────────────────────┼──────────────────┘
        │                                  │
        └──────────────┬───────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │    Appwrite    │
              │    Database    │
              └────────────────┘
```

### Component Breakdown

#### 1. Appwrite Client Layer (`src/lib/appwrite.ts`)

**Purpose**: Provide unified access to both TablesDB and Databases APIs

**Components**:
- `createBrowserClient()` - Client-side operations (no TablesDB needed)
- `createSessionClient(req)` - API routes with user session (includes TablesDB)
- `createAdminClient()` - Admin operations (includes TablesDB)

**Design Decision**: Keep both APIs available during migration for backward compatibility

#### 2. Transaction Utilities (`src/lib/transactions.ts`)

**Purpose**: Provide reusable transaction patterns and error handling

**Components**:
- `executeTransaction()` - Basic transaction execution with automatic rollback
- `executeTransactionWithRetry()` - Transaction with conflict retry logic
- `createBulkDeleteOperations()` - Helper for bulk delete with audit log
- `createBulkUpdateOperations()` - Helper for bulk update with audit log
- `createBulkCreateOperations()` - Helper for bulk create with audit log

**Design Decision**: Centralize transaction logic to ensure consistent error handling and retry behavior

#### 3. Migration Strategy

**Approach**: Gradual migration with feature flags

**Phases**:
1. Infrastructure setup (Week 1)
2. Bulk operations (Week 2-3)
3. Multi-step workflows (Week 4)
4. Single operations with audit logs (Week 5-6)

**Design Decision**: Incremental migration reduces risk and allows testing at each phase

## Components and Interfaces

### 1. TablesDB Client Integration

**File**: `src/lib/appwrite.ts`

**Interface**:
```typescript
interface AppwriteClient {
  client: Client;
  account: Account;
  databases: Databases;      // Legacy API
  tablesDB: TablesDB;        // New API
  storage: Storage;
  functions: Functions;
}

interface AdminClient extends AppwriteClient {
  users: Users;
  teams: Teams;
}
```

**Implementation**:
```typescript
import { TablesDB } from 'node-appwrite';

export const createSessionClient = (req: NextApiRequest) => {
  const client = new AdminClient()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  const jwt = req.cookies?.['appwrite-session'];
  if (jwt) {
    client.setJWT(jwt);
  }

  return {
    client,
    account: new AdminAccount(client),
    databases: new AdminDatabases(client),
    tablesDB: new TablesDB(client),  // ADD THIS
    storage: new AdminStorage(client),
    functions: new AdminFunctions(client),
  };
};
```

### 2. Transaction Utilities

**File**: `src/lib/transactions.ts`

**Interfaces**:
```typescript
interface TransactionOperation {
  action: 'create' | 'update' | 'upsert' | 'delete' | 
          'increment' | 'decrement' | 
          'bulkCreate' | 'bulkUpdate' | 'bulkUpsert' | 'bulkDelete';
  databaseId: string;
  tableId: string;
  rowId?: string;
  data?: any;
}

interface TransactionResult {
  success: boolean;
  transactionId?: string;
  error?: Error;
  retries?: number;
}

interface TransactionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}
```

**Core Functions**:

```typescript
/**
 * Execute operations within a transaction with automatic rollback
 */
export async function executeTransaction(
  tablesDB: TablesDB,
  operations: TransactionOperation[]
): Promise<void> {
  const tx = await tablesDB.createTransaction();
  
  try {
    await tablesDB.createOperations({
      transactionId: tx.$id,
      operations
    });
    
    await tablesDB.updateTransaction({
      transactionId: tx.$id,
      commit: true
    });
  } catch (error) {
    try {
      await tablesDB.updateTransaction({
        transactionId: tx.$id,
        rollback: true
      });
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    throw error;
  }
}

/**
 * Execute transaction with retry logic for conflicts
 */
export async function executeTransactionWithRetry(
  tablesDB: TablesDB,
  operations: TransactionOperation[],
  options: TransactionOptions = {}
): Promise<void> {
  const { maxRetries = 3, retryDelay = 100 } = options;
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await executeTransaction(tablesDB, operations);
      return; // Success
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a conflict error
      if (error.code === 409 || error.message?.includes('conflict')) {
        console.log(`Transaction conflict, retry ${attempt}/${maxRetries}`);
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
        );
        continue;
      }
      
      // Non-conflict error, don't retry
      throw error;
    }
  }
  
  throw new Error(
    `Transaction failed after ${maxRetries} retries: ${lastError.message}`
  );
}
```

### 3. Bulk Operation Helpers

**File**: `src/lib/transactions.ts`

```typescript
/**
 * Create operations for bulk delete with audit log
 */
export function createBulkDeleteOperations(
  databaseId: string,
  tableId: string,
  rowIds: string[],
  auditLog: {
    tableId: string;
    userId: string;
    action: string;
    details: any;
  }
): TransactionOperation[] {
  const operations: TransactionOperation[] = rowIds.map(rowId => ({
    action: 'delete',
    databaseId,
    tableId,
    rowId
  }));
  
  // Add audit log
  operations.push({
    action: 'create',
    databaseId,
    tableId: auditLog.tableId,
    rowId: ID.unique(),
    data: {
      userId: auditLog.userId,
      action: auditLog.action,
      details: JSON.stringify(auditLog.details)
    }
  });
  
  return operations;
}

/**
 * Create operations for bulk update with audit log
 */
export function createBulkUpdateOperations(
  databaseId: string,
  tableId: string,
  updates: Array<{ rowId: string; data: any }>,
  auditLog: {
    tableId: string;
    userId: string;
    action: string;
    details: any;
  }
): TransactionOperation[] {
  const operations: TransactionOperation[] = updates.map(({ rowId, data }) => ({
    action: 'update',
    databaseId,
    tableId,
    rowId,
    data
  }));
  
  // Add audit log
  operations.push({
    action: 'create',
    databaseId,
    tableId: auditLog.tableId,
    rowId: ID.unique(),
    data: {
      userId: auditLog.userId,
      action: auditLog.action,
      details: JSON.stringify(auditLog.details)
    }
  });
  
  return operations;
}

/**
 * Create operations for bulk create with audit log
 */
export function createBulkCreateOperations(
  databaseId: string,
  tableId: string,
  items: Array<{ rowId: string; data: any }>,
  auditLog: {
    tableId: string;
    userId: string;
    action: string;
    details: any;
  }
): TransactionOperation[] {
  const operations: TransactionOperation[] = items.map(({ rowId, data }) => ({
    action: 'create',
    databaseId,
    tableId,
    rowId,
    data
  }));
  
  // Add audit log
  operations.push({
    action: 'create',
    databaseId,
    tableId: auditLog.tableId,
    rowId: ID.unique(),
    data: {
      userId: auditLog.userId,
      action: auditLog.action,
      details: JSON.stringify(auditLog.details)
    }
  });
  
  return operations;
}
```

### 4. Batching for Plan Limits with Fallback

**File**: `src/lib/transactions.ts`

```typescript
/**
 * Plan limits for transactions
 */
export const TRANSACTION_LIMITS = {
  FREE: 100,
  PRO: 1000,
  SCALE: 2500
} as const;

/**
 * Get current plan limit from environment or default to FREE
 */
export function getTransactionLimit(): number {
  const plan = process.env.APPWRITE_PLAN?.toUpperCase() || 'FREE';
  return TRANSACTION_LIMITS[plan as keyof typeof TRANSACTION_LIMITS] || TRANSACTION_LIMITS.FREE;
}

/**
 * Execute operations in batches to respect plan limits
 * Includes fallback to legacy API if batching is not desired
 */
export async function executeBatchedTransaction(
  tablesDB: TablesDB,
  operations: TransactionOperation[],
  options: {
    batchSize?: number;
    enableFallback?: boolean;
    fallbackFn?: () => Promise<void>;
  } = {}
): Promise<{
  success: boolean;
  usedFallback: boolean;
  batchCount?: number;
  error?: Error;
}> {
  const limit = getTransactionLimit();
  const batchSize = options.batchSize || (limit - 1); // Leave 1 for audit log
  const enableFallback = options.enableFallback ?? true;
  
  // Check if we need batching
  if (operations.length <= batchSize) {
    // Single transaction - no batching needed
    try {
      await executeTransactionWithRetry(tablesDB, operations);
      return { success: true, usedFallback: false };
    } catch (error) {
      if (enableFallback && options.fallbackFn) {
        console.warn('[Transaction] Single transaction failed, using fallback', error);
        await options.fallbackFn();
        return { success: true, usedFallback: true };
      }
      throw error;
    }
  }
  
  // Multiple transactions needed
  console.log(`[Transaction] Batching ${operations.length} operations into batches of ${batchSize}`);
  
  const batches = [];
  for (let i = 0; i < operations.length; i += batchSize) {
    batches.push(operations.slice(i, i + batchSize));
  }
  
  try {
    for (let i = 0; i < batches.length; i++) {
      await executeTransactionWithRetry(tablesDB, batches[i]);
      console.log(`[Transaction] Batch ${i + 1}/${batches.length} complete`);
    }
    
    return { 
      success: true, 
      usedFallback: false, 
      batchCount: batches.length 
    };
  } catch (error: any) {
    console.error(`[Transaction] Batch failed:`, error);
    
    // If fallback is enabled and provided, use it
    if (enableFallback && options.fallbackFn) {
      console.warn('[Transaction] Batched transaction failed, using fallback');
      try {
        await options.fallbackFn();
        return { success: true, usedFallback: true };
      } catch (fallbackError: any) {
        console.error('[Transaction] Fallback also failed:', fallbackError);
        throw new Error(
          `Both transaction and fallback failed. Transaction: ${error.message}, Fallback: ${fallbackError.message}`
        );
      }
    }
    
    throw new Error(
      `Batch ${error.message?.match(/Batch (\d+)/)?.[1] || 'unknown'}/${batches.length} failed: ${error.message}`
    );
  }
}

/**
 * Execute bulk operation with automatic fallback to legacy API
 */
export async function executeBulkOperationWithFallback<T>(
  tablesDB: TablesDB,
  databases: any, // Legacy Databases API
  operations: TransactionOperation[],
  legacyFn: () => Promise<T>,
  options: {
    operationType: 'import' | 'delete' | 'edit';
    itemCount: number;
  }
): Promise<{
  result: T;
  usedTransactions: boolean;
  batchCount?: number;
}> {
  const limit = getTransactionLimit();
  
  // Log operation details
  console.log(`[Bulk ${options.operationType}] Processing ${options.itemCount} items (limit: ${limit})`);
  
  try {
    // Attempt transaction-based approach
    const txResult = await executeBatchedTransaction(tablesDB, operations, {
      enableFallback: true,
      fallbackFn: legacyFn
    });
    
    if (txResult.usedFallback) {
      console.log(`[Bulk ${options.operationType}] Used legacy API fallback`);
      return {
        result: await legacyFn(),
        usedTransactions: false
      };
    }
    
    console.log(`[Bulk ${options.operationType}] Completed with transactions (${txResult.batchCount || 1} batch(es))`);
    return {
      result: null as T, // Result is in the transaction
      usedTransactions: true,
      batchCount: txResult.batchCount
    };
  } catch (error) {
    console.error(`[Bulk ${options.operationType}] Transaction failed, falling back to legacy API`, error);
    
    // Fallback to legacy API
    const result = await legacyFn();
    return {
      result,
      usedTransactions: false
    };
  }
}
```

### 5. Bulk Operation Wrappers with Fallback

**File**: `src/lib/bulkOperations.ts` (New)

```typescript
import { TablesDB } from 'node-appwrite';
import { ID } from 'appwrite';
import {
  executeBulkOperationWithFallback,
  createBulkDeleteOperations,
  createBulkUpdateOperations,
  createBulkCreateOperations
} from './transactions';

/**
 * Bulk delete with automatic fallback
 */
export async function bulkDeleteWithFallback(
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
}> {
  const operations = createBulkDeleteOperations(
    config.databaseId,
    config.tableId,
    config.rowIds,
    config.auditLog
  );
  
  // Legacy fallback function
  const legacyDelete = async () => {
    let deletedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    for (const rowId of config.rowIds) {
      try {
        await databases.deleteDocument(config.databaseId, config.tableId, rowId);
        deletedCount++;
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        errors.push({ id: rowId, error: error.message });
      }
    }
    
    // Create audit log separately (legacy approach)
    if (config.auditLog) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.auditLog.tableId,
          ID.unique(),
          {
            userId: config.auditLog.userId,
            action: config.auditLog.action,
            details: JSON.stringify(config.auditLog.details)
          }
        );
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
      }
    }
    
    return { deletedCount, errors };
  };
  
  const result = await executeBulkOperationWithFallback(
    tablesDB,
    databases,
    operations,
    legacyDelete,
    {
      operationType: 'delete',
      itemCount: config.rowIds.length
    }
  );
  
  return {
    deletedCount: result.usedTransactions ? config.rowIds.length : result.result.deletedCount,
    usedTransactions: result.usedTransactions,
    batchCount: result.batchCount
  };
}

/**
 * Bulk import with automatic fallback
 */
export async function bulkImportWithFallback(
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
}> {
  const operations = createBulkCreateOperations(
    config.databaseId,
    config.tableId,
    config.items.map(item => ({ rowId: ID.unique(), data: item.data })),
    config.auditLog
  );
  
  // Legacy fallback function
  const legacyImport = async () => {
    let createdCount = 0;
    const errors: Array<{ row: number; error: string }> = [];
    
    for (let i = 0; i < config.items.length; i++) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.tableId,
          ID.unique(),
          config.items[i].data
        );
        createdCount++;
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        errors.push({ row: i + 1, error: error.message });
      }
    }
    
    // Create audit log separately (legacy approach)
    if (config.auditLog) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.auditLog.tableId,
          ID.unique(),
          {
            userId: config.auditLog.userId,
            action: config.auditLog.action,
            details: JSON.stringify(config.auditLog.details)
          }
        );
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
      }
    }
    
    return { createdCount, errors };
  };
  
  const result = await executeBulkOperationWithFallback(
    tablesDB,
    databases,
    operations,
    legacyImport,
    {
      operationType: 'import',
      itemCount: config.items.length
    }
  );
  
  return {
    createdCount: result.usedTransactions ? config.items.length : result.result.createdCount,
    usedTransactions: result.usedTransactions,
    batchCount: result.batchCount
  };
}

/**
 * Bulk edit with automatic fallback
 */
export async function bulkEditWithFallback(
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
}> {
  const operations = createBulkUpdateOperations(
    config.databaseId,
    config.tableId,
    config.updates,
    config.auditLog
  );
  
  // Legacy fallback function
  const legacyEdit = async () => {
    let updatedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    for (const update of config.updates) {
      try {
        await databases.updateDocument(
          config.databaseId,
          config.tableId,
          update.rowId,
          update.data
        );
        updatedCount++;
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        errors.push({ id: update.rowId, error: error.message });
      }
    }
    
    // Create audit log separately (legacy approach)
    if (config.auditLog) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.auditLog.tableId,
          ID.unique(),
          {
            userId: config.auditLog.userId,
            action: config.auditLog.action,
            details: JSON.stringify(config.auditLog.details)
          }
        );
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
      }
    }
    
    return { updatedCount, errors };
  };
  
  const result = await executeBulkOperationWithFallback(
    tablesDB,
    databases,
    operations,
    legacyEdit,
    {
      operationType: 'edit',
      itemCount: config.updates.length
    }
  );
  
  return {
    updatedCount: result.usedTransactions ? config.updates.length : result.result.updatedCount,
    usedTransactions: result.usedTransactions,
    batchCount: result.batchCount
  };
}
```

## Data Models

### Transaction Operation Model

```typescript
interface TransactionOperation {
  // Operation type
  action: 'create' | 'update' | 'upsert' | 'delete' | 
          'increment' | 'decrement' | 
          'bulkCreate' | 'bulkUpdate' | 'bulkUpsert' | 'bulkDelete';
  
  // Target location
  databaseId: string;
  tableId: string;
  rowId?: string;  // Optional for create, required for update/delete
  
  // Operation data
  data?: {
    [key: string]: any;
  };
  
  // For bulk operations
  queries?: Array<{
    method: string;
    attribute: string;
    values: any[];
  }>;
  
  // For atomic numeric operations
  value?: number;
  min?: number;
  max?: number;
  column?: string;
}
```

### Transaction Metadata

```typescript
interface TransactionMetadata {
  transactionId: string;
  operationCount: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'committed' | 'rolled_back' | 'failed';
  retries: number;
  error?: {
    code: number;
    message: string;
    type: string;
  };
}
```

## Error Handling

### Error Types and Responses

```typescript
enum TransactionErrorType {
  CONFLICT = 'CONFLICT',           // 409 - Concurrent modification
  VALIDATION = 'VALIDATION',       // 400 - Invalid data
  PERMISSION = 'PERMISSION',       // 403 - Insufficient permissions
  NOT_FOUND = 'NOT_FOUND',        // 404 - Resource not found
  PLAN_LIMIT = 'PLAN_LIMIT',      // 400 - Exceeds plan limits
  NETWORK = 'NETWORK',            // 500 - Network/timeout error
  ROLLBACK = 'ROLLBACK',          // 500 - Rollback failed
  UNKNOWN = 'UNKNOWN'             // 500 - Unknown error
}

interface TransactionError extends Error {
  type: TransactionErrorType;
  code: number;
  transactionId?: string;
  operations?: TransactionOperation[];
  retries?: number;
}
```

### Error Handling Strategy

```typescript
/**
 * Handle transaction errors with appropriate responses
 */
export function handleTransactionError(
  error: any,
  res: NextApiResponse
): void {
  // Conflict errors - retryable
  if (error.code === 409 || error.message?.includes('conflict')) {
    return res.status(409).json({
      error: 'Transaction conflict',
      message: 'Data was modified by another user. Please refresh and try again.',
      retryable: true,
      type: TransactionErrorType.CONFLICT
    });
  }
  
  // Validation errors - not retryable
  if (error.code === 400) {
    return res.status(400).json({
      error: 'Validation error',
      message: error.message,
      retryable: false,
      type: TransactionErrorType.VALIDATION
    });
  }
  
  // Permission errors - not retryable
  if (error.code === 403) {
    return res.status(403).json({
      error: 'Permission denied',
      message: error.message,
      retryable: false,
      type: TransactionErrorType.PERMISSION
    });
  }
  
  // Not found errors - not retryable
  if (error.code === 404) {
    return res.status(404).json({
      error: 'Resource not found',
      message: error.message,
      retryable: false,
      type: TransactionErrorType.NOT_FOUND
    });
  }
  
  // Network/timeout errors - retryable
  if (error.code === 500 || error.message?.includes('timeout')) {
    return res.status(500).json({
      error: 'Network error',
      message: 'Operation timed out. Please try again.',
      retryable: true,
      type: TransactionErrorType.NETWORK
    });
  }
  
  // Unknown errors
  return res.status(500).json({
    error: 'Internal server error',
    message: error.message || 'An unexpected error occurred',
    retryable: false,
    type: TransactionErrorType.UNKNOWN
  });
}
```

## Testing Strategy

### Unit Tests

**File**: `src/lib/__tests__/transactions.test.ts`

```typescript
describe('Transaction Utilities', () => {
  describe('executeTransaction', () => {
    it('should execute transaction successfully', async () => {
      // Test successful transaction
    });
    
    it('should rollback on error', async () => {
      // Test automatic rollback
    });
    
    it('should handle rollback failure', async () => {
      // Test rollback error handling
    });
  });
  
  describe('executeTransactionWithRetry', () => {
    it('should retry on conflict', async () => {
      // Test retry logic
    });
    
    it('should use exponential backoff', async () => {
      // Test backoff timing
    });
    
    it('should not retry non-conflict errors', async () => {
      // Test error type handling
    });
    
    it('should fail after max retries', async () => {
      // Test retry limit
    });
  });
  
  describe('Bulk Operation Helpers', () => {
    it('should create bulk delete operations', async () => {
      // Test operation creation
    });
    
    it('should include audit log in operations', async () => {
      // Test audit log inclusion
    });
  });
  
  describe('Batching', () => {
    it('should batch operations exceeding plan limit', async () => {
      // Test batching logic
    });
    
    it('should execute single transaction for small operations', async () => {
      // Test single transaction path
    });
  });
});
```

### Integration Tests

**File**: `src/pages/api/attendees/__tests__/bulk-import-transactions.test.ts`

```typescript
describe('Bulk Import with Transactions', () => {
  it('should import all attendees atomically', async () => {
    // Test atomic import
  });
  
  it('should rollback on failure', async () => {
    // Test rollback behavior
  });
  
  it('should include audit log in transaction', async () => {
    // Test audit log atomicity
  });
  
  it('should handle plan limits with batching', async () => {
    // Test batching for large imports
  });
  
  it('should retry on conflict', async () => {
    // Test conflict handling
  });
});
```

### Performance Tests

```typescript
describe('Transaction Performance', () => {
  it('should complete bulk import faster than sequential', async () => {
    // Measure performance improvement
  });
  
  it('should handle 100 operations within 2 seconds', async () => {
    // Test performance target
  });
  
  it('should handle 500 operations with batching', async () => {
    // Test large operation performance
  });
});
```

## Migration Plan

### Phase 1: Infrastructure (Week 1)

**Tasks**:
1. Add TablesDB to Appwrite clients
2. Create transaction utilities
3. Add unit tests for utilities
4. Create feature flags

**Deliverables**:
- Updated `src/lib/appwrite.ts`
- New `src/lib/transactions.ts`
- Unit tests with 90%+ coverage
- Feature flag configuration

### Phase 2: Bulk Operations (Week 2-3)

**Tasks**:
1. Migrate bulk import
2. Migrate bulk delete
3. Migrate bulk edit
4. Add integration tests
5. Performance testing

**Deliverables**:
- Updated bulk operation endpoints
- Integration tests
- Performance benchmarks
- Migration documentation

### Phase 3: Multi-Step Workflows (Week 4)

**Tasks**:
1. Migrate user linking
2. Migrate event settings update
3. Add integration tests
4. Update documentation

**Deliverables**:
- Updated workflow endpoints
- Integration tests
- Updated API documentation

### Phase 4: Single Operations (Week 5-6)

**Tasks**:
1. Migrate attendee CRUD with audit logs
2. Migrate custom field CRUD with audit logs
3. Migrate role CRUD with audit logs
4. Remove Documents API dependencies
5. Final testing and documentation

**Deliverables**:
- All endpoints migrated
- Complete test coverage
- Migration summary document
- Developer guide

## Monitoring and Observability

### Metrics to Track

```typescript
interface TransactionMetrics {
  // Success metrics
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  
  // Performance metrics
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  
  // Retry metrics
  totalRetries: number;
  retriesPerTransaction: number;
  conflictRate: number;
  
  // Operation metrics
  operationsPerTransaction: number;
  batchedTransactions: number;
  
  // Error metrics
  errorsByType: Record<TransactionErrorType, number>;
  rollbackFailures: number;
}
```

### Logging Strategy

```typescript
/**
 * Log transaction execution
 */
export function logTransaction(
  metadata: TransactionMetadata,
  operations: TransactionOperation[]
): void {
  console.log('[Transaction]', {
    transactionId: metadata.transactionId,
    operationCount: metadata.operationCount,
    duration: metadata.duration,
    status: metadata.status,
    retries: metadata.retries,
    operations: operations.map(op => ({
      action: op.action,
      tableId: op.tableId,
      rowId: op.rowId
    }))
  });
}
```

## Best Practices

### 1. Keep Transactions Short-Lived

```typescript
// ✅ GOOD: Quick transaction
const tx = await tablesDB.createTransaction();
await tablesDB.createOperations({ transactionId: tx.$id, operations });
await tablesDB.updateTransaction({ transactionId: tx.$id, commit: true });

// ❌ BAD: Long-running transaction
const tx = await tablesDB.createTransaction();
await someExpensiveOperation(); // Don't do this
await tablesDB.createOperations({ transactionId: tx.$id, operations });
await tablesDB.updateTransaction({ transactionId: tx.$id, commit: true });
```

### 2. Validate Before Transaction

```typescript
// ✅ GOOD: Validate first
if (!attendeeIds || attendeeIds.length === 0) {
  return res.status(400).json({ error: 'Invalid input' });
}
await executeTransaction(tablesDB, operations);

// ❌ BAD: Validate inside transaction
const tx = await tablesDB.createTransaction();
if (!attendeeIds || attendeeIds.length === 0) {
  await tablesDB.updateTransaction({ transactionId: tx.$id, rollback: true });
  return res.status(400).json({ error: 'Invalid input' });
}
```

### 3. Always Include Audit Logs in Transaction

```typescript
// ✅ GOOD: Audit log in same transaction
const operations = [
  { action: 'delete', databaseId, tableId, rowId: 'id1' },
  { action: 'create', databaseId, tableId: logsTableId, data: logData }
];

// ❌ BAD: Audit log separate
await executeTransaction(tablesDB, deleteOperations);
await databases.createDocument(logsCollectionId, logData); // Can fail independently
```

### 4. Use Helpers for Common Patterns

```typescript
// ✅ GOOD: Use helper
const operations = createBulkDeleteOperations(
  dbId, tableId, rowIds,
  { tableId: logsTableId, userId, action: 'bulk_delete', details }
);

// ❌ BAD: Manual construction
const operations = rowIds.map(id => ({ action: 'delete', ... }));
operations.push({ action: 'create', ... }); // Easy to forget
```

## Fallback Strategy for Plan Limits

### Overview

To handle operations that exceed transaction plan limits (100 for Free, 1000 for Pro, 2500 for Scale), we implement a comprehensive fallback strategy that:

1. **Attempts batched transactions first** - Split operations into multiple transactions
2. **Falls back to legacy API if batching fails** - Ensures operations always complete
3. **Logs which approach was used** - For monitoring and optimization
4. **Maintains audit trail** - Regardless of which approach is used

### Plan Limit Configuration

```typescript
// .env.local
APPWRITE_PLAN=PRO  # Current plan: PRO (1,000 operations per transaction)
ENABLE_TRANSACTION_FALLBACK=true
```

**Current CredentialStudio Plan**: PRO tier with 1,000 operations per transaction limit

### Fallback Decision Tree

```
Operation Request (e.g., 1,500 items on PRO tier)
│
├─ Check: Items <= Plan Limit (1,000)?
│  ├─ YES → Single Transaction
│  │         └─ Success ✓
│  │
│  └─ NO → Batched Transactions
│           ├─ Batch 1 (999 items) → Success ✓
│           ├─ Batch 2 (501 items) → Success ✓
│           └─ All batches succeed ✓
│
└─ IF ANY BATCH FAILS
   └─ Fallback to Legacy API
      ├─ Sequential operations with delays
      ├─ Track successes/failures
      └─ Create audit log separately
```

**Note**: With PRO tier (1,000 limit), most typical operations will use a single transaction. Batching only needed for very large imports (>1,000 attendees).

### Usage Example

```typescript
// In bulk delete endpoint
const result = await bulkDeleteWithFallback(
  tablesDB,
  databases,
  {
    databaseId: dbId,
    tableId: attendeesTableId,
    rowIds: attendeeIds,
    auditLog: {
      tableId: logsTableId,
      userId: user.$id,
      action: 'bulk_delete',
      details: { ... }
    }
  }
);

// Response includes which approach was used
return res.status(200).json({
  success: true,
  deletedCount: result.deletedCount,
  usedTransactions: result.usedTransactions,
  batchCount: result.batchCount,
  message: result.usedTransactions
    ? `Deleted ${result.deletedCount} attendees using transactions`
    : `Deleted ${result.deletedCount} attendees using legacy API`
});
```

### Monitoring Fallback Usage

```typescript
// Track fallback metrics
interface FallbackMetrics {
  totalOperations: number;
  transactionSuccesses: number;
  fallbackUsages: number;
  fallbackRate: number;
  averageItemsPerOperation: number;
  operationsExceedingLimit: number;
}

// Log fallback events
console.log('[Fallback] Transaction failed, using legacy API', {
  operationType: 'bulk_delete',
  itemCount: 150,
  planLimit: 100,
  reason: 'Batch 2 failed with conflict error'
});
```

### Benefits of Fallback Approach

1. **Reliability** - Operations always complete, even if transactions fail
2. **Gradual Migration** - Can deploy with confidence knowing fallback exists
3. **Plan Flexibility** - Works across all Appwrite plans
4. **Monitoring** - Track when fallback is used to optimize
5. **User Experience** - Users don't see failures, just slower operations

### When Fallback is Triggered

- **Batch transaction fails** - Any batch in a multi-batch operation fails
- **Conflict errors** - After max retries exhausted
- **Network errors** - Timeout or connection issues
- **Plan limit errors** - If plan limit is lower than expected
- **Unknown errors** - Any unexpected transaction failure

### Fallback Performance

| Operation | Transaction Time | Fallback Time | Difference |
|-----------|-----------------|---------------|------------|
| 100 items | ~1 second | ~6 seconds | 6x slower |
| 500 items | ~2 seconds | ~30 seconds | 15x slower |
| 1000 items | ~3 seconds | ~60 seconds | 20x slower |
| 1500 items | ~5 seconds (2 batches) | ~90 seconds | 18x slower |

**Note**: With PRO tier (1,000 limit), operations up to 1,000 items use a single transaction. Fallback is slower but ensures operations complete successfully.

## Rollback Strategy

### Feature Flags

```typescript
// .env.local
ENABLE_TRANSACTIONS=true
ENABLE_TRANSACTION_FALLBACK=true
TRANSACTIONS_ENDPOINTS=bulk-import,bulk-delete,bulk-edit
APPWRITE_PLAN=PRO
```

### Conditional API Usage

```typescript
export async function bulkDelete(attendeeIds: string[]) {
  const useTransactions = process.env.ENABLE_TRANSACTIONS === 'true' &&
    process.env.TRANSACTIONS_ENDPOINTS?.includes('bulk-delete');
  
  if (useTransactions) {
    // Use TablesDB with transactions and fallback
    return await bulkDeleteWithFallback(
      tablesDB,
      databases,
      { ... }
    );
  } else {
    // Use legacy Documents API directly
    return await bulkDeleteLegacy(attendeeIds);
  }
}
```

### Gradual Rollout

1. **Week 1**: Enable for bulk import only
2. **Week 2**: Enable for bulk delete
3. **Week 3**: Enable for bulk edit
4. **Week 4**: Enable for all operations
5. **Week 5**: Monitor fallback usage
6. **Week 6**: Optimize based on metrics

## Security Considerations

### 1. Permission Checks Before Transactions

Always verify permissions before starting a transaction to avoid wasting resources.

### 2. Input Validation

Validate all inputs before creating transaction operations to prevent injection attacks.

### 3. Audit Log Integrity

Always include audit logs in transactions to ensure complete audit trail.

### 4. Error Message Sanitization

Don't expose sensitive information in error messages returned to clients.

## Performance Optimization

### 1. Batch Size Tuning

```typescript
// Tune batch size based on plan and operation complexity
const BATCH_SIZES = {
  free: 99,    // Leave 1 for audit log
  pro: 999,    // Leave 1 for audit log
  scale: 2499  // Leave 1 for audit log
};
```

### 2. Parallel Validation

```typescript
// Validate all items in parallel before transaction
const validationResults = await Promise.all(
  attendeeIds.map(id => validateAttendee(id))
);
```

### 3. Connection Pooling

Reuse Appwrite client connections across requests.

## Conclusion

This design provides a comprehensive approach to migrating CredentialStudio to the Appwrite Transactions API. The phased migration strategy minimizes risk while delivering value incrementally. The transaction utilities provide reusable patterns that ensure consistency across all operations.

Key benefits:
- **Data consistency**: Eliminate partial failures
- **Performance**: 75-90% faster bulk operations
- **Maintainability**: Reusable utilities and clear patterns
- **Observability**: Comprehensive logging and monitoring
- **Safety**: Incremental migration with rollback capability
