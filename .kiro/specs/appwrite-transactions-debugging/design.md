# Design Document: Appwrite Transactions Verification and Testing

## Overview

This design document outlines the approach for verifying and testing the Appwrite Transactions implementation in CredentialStudio. The TablesDB API has been integrated into the codebase, but comprehensive testing is needed to ensure it works correctly in all scenarios.

The design focuses on:
1. **Verification** - Confirm SDK and configuration are correct
2. **Unit Testing** - Test individual transaction methods
3. **Integration Testing** - Test real-world use cases
4. **Performance Testing** - Verify transactions are faster than sequential operations
5. **Error Handling** - Ensure failures are handled gracefully
6. **Diagnostic Tools** - Create scripts for quick verification

## Architecture

### Testing Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Testing Pyramid                           │
│                                                              │
│                    ┌──────────────┐                         │
│                    │  Diagnostic  │                         │
│                    │    Script    │                         │
│                    └──────────────┘                         │
│                                                              │
│              ┌────────────────────────┐                     │
│              │  Integration Tests     │                     │
│              │  - Bulk operations     │                     │
│              │  - Real-world use cases│                     │
│              └────────────────────────┘                     │
│                                                              │
│        ┌──────────────────────────────────────┐            │
│        │        Unit Tests                     │            │
│        │  - createTransaction()                │            │
│        │  - createOperations()                 │            │
│        │  - updateTransaction()                │            │
│        │  - Error handling                     │            │
│        └──────────────────────────────────────┘            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │           Configuration Verification                │   │
│  │  - SDK version check                                │   │
│  │  - Environment variables                            │   │
│  │  - Client initialization                            │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Test Levels

#### Level 1: Configuration Verification
- Check package.json for correct SDK versions
- Verify environment variables are set
- Confirm TablesDB client is initialized
- Test basic connectivity to Appwrite

#### Level 2: Unit Tests
- Test each transaction method in isolation
- Mock Appwrite responses
- Verify error handling
- Test retry logic

#### Level 3: Integration Tests
- Test complete workflows end-to-end
- Use real Appwrite instance (test database)
- Verify data consistency
- Test concurrent operations

#### Level 4: Diagnostic Script
- Quick verification tool for developers
- Tests all functionality in sequence
- Provides detailed output
- Cleans up test data

## Components and Interfaces

### 1. Configuration Verification Script

**File**: `scripts/verify-transactions-config.ts`

**Purpose**: Verify SDK and configuration are correct

**Checks**:
```typescript
interface ConfigCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

interface ConfigReport {
  checks: ConfigCheck[];
  overallStatus: 'pass' | 'fail';
  recommendations: string[];
}
```

**Verification Steps**:
1. Check `node-appwrite` version >= 19.1.0
2. Verify `NEXT_PUBLIC_APPWRITE_ENDPOINT` is set
3. Verify `NEXT_PUBLIC_APPWRITE_PROJECT_ID` is set
4. Verify `APPWRITE_API_KEY` is set
5. Test TablesDB client initialization
6. Test basic connectivity to Appwrite
7. Verify database exists

### 2. Transaction Unit Tests

**File**: `src/lib/__tests__/transactions-integration.test.ts`

**Purpose**: Test transaction methods with real Appwrite instance

**Test Cases**:

#### Test Suite 1: Basic Transaction Operations
```typescript
describe('Basic Transaction Operations', () => {
  test('createTransaction returns transaction with $id', async () => {
    const tx = await tablesDB.createTransaction();
    expect(tx).toHaveProperty('$id');
    expect(typeof tx.$id).toBe('string');
  });

  test('createOperations stages operations successfully', async () => {
    const tx = await tablesDB.createTransaction();
    await tablesDB.createOperations({
      transactionId: tx.$id,
      operations: [
        {
          action: 'create',
          databaseId: 'test_db',
          tableId: 'test_table',
          rowId: 'test_row',
          data: { name: 'Test' }
        }
      ]
    });
    // Should not throw
  });

  test('updateTransaction commits successfully', async () => {
    const tx = await tablesDB.createTransaction();
    await tablesDB.createOperations({
      transactionId: tx.$id,
      operations: [/* ... */]
    });
    await tablesDB.updateTransaction({
      transactionId: tx.$id,
      commit: true
    });
    // Verify data was committed
  });

  test('updateTransaction rollback successfully', async () => {
    const tx = await tablesDB.createTransaction();
    await tablesDB.createOperations({
      transactionId: tx.$id,
      operations: [/* ... */]
    });
    await tablesDB.updateTransaction({
      transactionId: tx.$id,
      rollback: true
    });
    // Verify data was not committed
  });
});
```

#### Test Suite 2: Commit and Rollback Verification
```typescript
describe('Commit and Rollback', () => {
  test('committed data is visible in subsequent queries', async () => {
    const tx = await tablesDB.createTransaction();
    const rowId = ID.unique();
    
    await tablesDB.createOperations({
      transactionId: tx.$id,
      operations: [{
        action: 'create',
        databaseId: dbId,
        tableId: 'test_table',
        rowId,
        data: { name: 'Test User' }
      }]
    });
    
    await tablesDB.updateTransaction({
      transactionId: tx.$id,
      commit: true
    });
    
    // Verify data exists
    const row = await tablesDB.getRow({
      databaseId: dbId,
      tableId: 'test_table',
      rowId
    });
    
    expect(row.name).toBe('Test User');
  });

  test('rolled back data is not visible', async () => {
    const tx = await tablesDB.createTransaction();
    const rowId = ID.unique();
    
    await tablesDB.createOperations({
      transactionId: tx.$id,
      operations: [{
        action: 'create',
        databaseId: dbId,
        tableId: 'test_table',
        rowId,
        data: { name: 'Test User' }
      }]
    });
    
    await tablesDB.updateTransaction({
      transactionId: tx.$id,
      rollback: true
    });
    
    // Verify data does not exist
    await expect(
      tablesDB.getRow({
        databaseId: dbId,
        tableId: 'test_table',
        rowId
      })
    ).rejects.toThrow();
  });

  test('multiple operations are atomic', async () => {
    const tx = await tablesDB.createTransaction();
    const rowId1 = ID.unique();
    const rowId2 = ID.unique();
    
    await tablesDB.createOperations({
      transactionId: tx.$id,
      operations: [
        {
          action: 'create',
          databaseId: dbId,
          tableId: 'test_table',
          rowId: rowId1,
          data: { name: 'User 1' }
        },
        {
          action: 'create',
          databaseId: dbId,
          tableId: 'test_table',
          rowId: rowId2,
          data: { name: 'User 2' }
        }
      ]
    });
    
    await tablesDB.updateTransaction({
      transactionId: tx.$id,
      commit: true
    });
    
    // Both should exist
    const row1 = await tablesDB.getRow({
      databaseId: dbId,
      tableId: 'test_table',
      rowId: rowId1
    });
    const row2 = await tablesDB.getRow({
      databaseId: dbId,
      tableId: 'test_table',
      rowId: rowId2
    });
    
    expect(row1.name).toBe('User 1');
    expect(row2.name).toBe('User 2');
  });
});
```

#### Test Suite 3: Error Handling
```typescript
describe('Error Handling', () => {
  test('invalid transaction ID throws error', async () => {
    await expect(
      tablesDB.createOperations({
        transactionId: 'invalid_id',
        operations: []
      })
    ).rejects.toThrow();
  });

  test('conflict error is detected', async () => {
    // Create a row
    const rowId = ID.unique();
    await tablesDB.createRow({
      databaseId: dbId,
      tableId: 'test_table',
      rowId,
      data: { name: 'Original', version: 1 }
    });
    
    // Start transaction 1
    const tx1 = await tablesDB.createTransaction();
    await tablesDB.createOperations({
      transactionId: tx1.$id,
      operations: [{
        action: 'update',
        databaseId: dbId,
        tableId: 'test_table',
        rowId,
        data: { name: 'Updated by TX1', version: 2 }
      }]
    });
    
    // Update outside transaction
    await tablesDB.updateRow({
      databaseId: dbId,
      tableId: 'test_table',
      rowId,
      data: { name: 'Updated outside', version: 2 }
    });
    
    // Commit transaction 1 should fail with conflict
    await expect(
      tablesDB.updateTransaction({
        transactionId: tx1.$id,
        commit: true
      })
    ).rejects.toThrow(/conflict/i);
  });

  test('retry logic handles conflicts', async () => {
    const { executeTransactionWithRetry } = await import('@/lib/transactions');
    
    // This should retry and eventually succeed
    await executeTransactionWithRetry(
      tablesDB,
      [{
        action: 'create',
        databaseId: dbId,
        tableId: 'test_table',
        rowId: ID.unique(),
        data: { name: 'Test' }
      }],
      { maxRetries: 3 }
    );
  });
});
```

### 3. Bulk Operations Integration Tests

**File**: `src/lib/__tests__/bulkOperations-integration.test.ts`

**Purpose**: Test bulk operations with real Appwrite instance

**Test Cases**:

```typescript
describe('Bulk Import with Transactions', () => {
  test('imports 10 attendees atomically', async () => {
    const attendees = Array.from({ length: 10 }, (_, i) => ({
      name: `Attendee ${i}`,
      email: `attendee${i}@test.com`
    }));
    
    const result = await bulkImportWithFallback(tablesDB, databases, {
      databaseId: dbId,
      tableId: 'attendees',
      items: attendees.map(data => ({ data })),
      auditLog: {
        tableId: 'logs',
        userId: 'test_user',
        action: 'BULK_IMPORT_TEST',
        details: { count: 10 }
      }
    });
    
    expect(result.createdCount).toBe(10);
    expect(result.usedTransactions).toBe(true);
  });

  test('imports 100 attendees atomically', async () => {
    const attendees = Array.from({ length: 100 }, (_, i) => ({
      name: `Attendee ${i}`,
      email: `attendee${i}@test.com`
    }));
    
    const result = await bulkImportWithFallback(tablesDB, databases, {
      databaseId: dbId,
      tableId: 'attendees',
      items: attendees.map(data => ({ data })),
      auditLog: {
        tableId: 'logs',
        userId: 'test_user',
        action: 'BULK_IMPORT_TEST',
        details: { count: 100 }
      }
    });
    
    expect(result.createdCount).toBe(100);
    expect(result.usedTransactions).toBe(true);
  });

  test('failed import does not create partial data', async () => {
    const attendees = [
      { name: 'Valid User', email: 'valid@test.com' },
      { name: 'Invalid User', email: 'invalid' }, // Invalid email
      { name: 'Another User', email: 'another@test.com' }
    ];
    
    // Count before
    const beforeCount = await countAttendees();
    
    try {
      await bulkImportWithFallback(tablesDB, databases, {
        databaseId: dbId,
        tableId: 'attendees',
        items: attendees.map(data => ({ data })),
        auditLog: {
          tableId: 'logs',
          userId: 'test_user',
          action: 'BULK_IMPORT_TEST',
          details: { count: 3 }
        }
      });
      fail('Should have thrown error');
    } catch (error) {
      // Expected to fail
    }
    
    // Count after - should be same
    const afterCount = await countAttendees();
    expect(afterCount).toBe(beforeCount);
  });
});

describe('Bulk Delete with Transactions', () => {
  test('deletes 50 attendees atomically', async () => {
    // Create 50 test attendees
    const attendeeIds = await createTestAttendees(50);
    
    const result = await bulkDeleteWithFallback(tablesDB, databases, {
      databaseId: dbId,
      tableId: 'attendees',
      rowIds: attendeeIds,
      auditLog: {
        tableId: 'logs',
        userId: 'test_user',
        action: 'BULK_DELETE_TEST',
        details: { count: 50 }
      }
    });
    
    expect(result.deletedCount).toBe(50);
    expect(result.usedTransactions).toBe(true);
    
    // Verify all are deleted
    for (const id of attendeeIds) {
      await expect(
        tablesDB.getRow({
          databaseId: dbId,
          tableId: 'attendees',
          rowId: id
        })
      ).rejects.toThrow();
    }
  });
});

describe('Bulk Edit with Transactions', () => {
  test('edits 50 attendees atomically', async () => {
    // Create 50 test attendees
    const attendeeIds = await createTestAttendees(50);
    
    const updates = attendeeIds.map(id => ({
      rowId: id,
      data: { status: 'checked-in' }
    }));
    
    const result = await bulkEditWithFallback(tablesDB, databases, {
      databaseId: dbId,
      tableId: 'attendees',
      updates,
      auditLog: {
        tableId: 'logs',
        userId: 'test_user',
        action: 'BULK_EDIT_TEST',
        details: { count: 50 }
      }
    });
    
    expect(result.updatedCount).toBe(50);
    expect(result.usedTransactions).toBe(true);
    
    // Verify all are updated
    for (const id of attendeeIds) {
      const row = await tablesDB.getRow({
        databaseId: dbId,
        tableId: 'attendees',
        rowId: id
      });
      expect(row.status).toBe('checked-in');
    }
  });
});
```

### 4. Real-World Use Case Tests

**File**: `src/lib/__tests__/transactions-use-cases.test.ts`

**Purpose**: Test actual production scenarios

**Test Cases**:

```typescript
describe('Attendee with Audit Log', () => {
  test('creates attendee and audit log atomically', async () => {
    const attendeeId = ID.unique();
    
    const operations = [
      {
        action: 'create',
        databaseId: dbId,
        tableId: 'attendees',
        rowId: attendeeId,
        data: {
          name: 'John Doe',
          email: 'john@test.com'
        }
      },
      {
        action: 'create',
        databaseId: dbId,
        tableId: 'logs',
        data: {
          userId: 'test_user',
          action: 'CREATE_ATTENDEE',
          details: JSON.stringify({ attendeeId, name: 'John Doe' })
        }
      }
    ];
    
    await executeTransactionWithRetry(tablesDB, operations);
    
    // Verify both exist
    const attendee = await tablesDB.getRow({
      databaseId: dbId,
      tableId: 'attendees',
      rowId: attendeeId
    });
    expect(attendee.name).toBe('John Doe');
    
    const logs = await tablesDB.listRows({
      databaseId: dbId,
      tableId: 'logs',
      queries: [Query.equal('action', 'CREATE_ATTENDEE')]
    });
    expect(logs.total).toBeGreaterThan(0);
  });
});

describe('User Linking', () => {
  test('links user with team membership atomically', async () => {
    const userProfileId = ID.unique();
    const teamId = 'test_team';
    
    const operations = [
      {
        action: 'create',
        databaseId: dbId,
        tableId: 'user_profiles',
        rowId: userProfileId,
        data: {
          name: 'Test User',
          email: 'test@example.com'
        }
      },
      {
        action: 'create',
        databaseId: dbId,
        tableId: 'team_memberships',
        data: {
          userId: userProfileId,
          teamId,
          role: 'member'
        }
      },
      {
        action: 'create',
        databaseId: dbId,
        tableId: 'logs',
        data: {
          userId: 'admin',
          action: 'LINK_USER',
          details: JSON.stringify({ userProfileId, teamId })
        }
      }
    ];
    
    await executeTransactionWithRetry(tablesDB, operations);
    
    // Verify all exist
    const userProfile = await tablesDB.getRow({
      databaseId: dbId,
      tableId: 'user_profiles',
      rowId: userProfileId
    });
    expect(userProfile.name).toBe('Test User');
    
    const memberships = await tablesDB.listRows({
      databaseId: dbId,
      tableId: 'team_memberships',
      queries: [Query.equal('userId', userProfileId)]
    });
    expect(memberships.total).toBe(1);
  });
});
```

### 5. Diagnostic Script

**File**: `scripts/test-transactions.ts`

**Purpose**: Quick verification tool for developers

**Features**:
- Tests all transaction methods
- Provides detailed output
- Cleans up test data
- Generates summary report

**Structure**:
```typescript
interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  details?: any;
}

interface DiagnosticReport {
  timestamp: string;
  environment: {
    sdkVersion: string;
    endpoint: string;
    projectId: string;
  };
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  recommendations: string[];
}

async function runDiagnostic(): Promise<DiagnosticReport> {
  const results: TestResult[] = [];
  
  // Test 1: Configuration
  results.push(await testConfiguration());
  
  // Test 2: Create Transaction
  results.push(await testCreateTransaction());
  
  // Test 3: Create Operations
  results.push(await testCreateOperations());
  
  // Test 4: Commit Transaction
  results.push(await testCommitTransaction());
  
  // Test 5: Rollback Transaction
  results.push(await testRollbackTransaction());
  
  // Test 6: Bulk Import
  results.push(await testBulkImport());
  
  // Test 7: Bulk Delete
  results.push(await testBulkDelete());
  
  // Test 8: Error Handling
  results.push(await testErrorHandling());
  
  // Generate report
  return generateReport(results);
}
```

**Output Format**:
```
╔══════════════════════════════════════════════════════════════╗
║         Appwrite Transactions Diagnostic Report              ║
╚══════════════════════════════════════════════════════════════╝

Environment:
  SDK Version: node-appwrite@19.1.0
  Endpoint: https://nyc.cloud.appwrite.io/v1
  Project ID: 67a1234567890abcdef

Tests:
  ✓ Configuration Check (12ms)
  ✓ Create Transaction (45ms)
  ✓ Create Operations (67ms)
  ✓ Commit Transaction (123ms)
  ✓ Rollback Transaction (89ms)
  ✓ Bulk Import (456ms)
  ✓ Bulk Delete (234ms)
  ✓ Error Handling (78ms)

Summary:
  Total: 8
  Passed: 8
  Failed: 0
  Skipped: 0
  Duration: 1.104s

✓ All tests passed! Transactions are working correctly.

Recommendations:
  • Transactions are fully functional
  • Performance is within expected range
  • Ready for production use
```

## Data Models

### Test Database Schema

For testing, we'll use a simplified schema:

```typescript
// Test Attendees Table
interface TestAttendee {
  $id: string;
  name: string;
  email: string;
  status?: string;
  version?: number;
  $createdAt: string;
  $updatedAt: string;
}

// Test Logs Table
interface TestLog {
  $id: string;
  userId: string;
  action: string;
  details: string;
  $createdAt: string;
}

// Test User Profiles Table
interface TestUserProfile {
  $id: string;
  name: string;
  email: string;
  $createdAt: string;
}

// Test Team Memberships Table
interface TestTeamMembership {
  $id: string;
  userId: string;
  teamId: string;
  role: string;
  $createdAt: string;
}
```

## Error Handling

### Error Categories

1. **Configuration Errors**
   - Missing SDK
   - Invalid environment variables
   - Connection failures

2. **Transaction Errors**
   - Invalid transaction ID
   - Transaction expired
   - Operation staging failed

3. **Commit Errors**
   - Conflict detected
   - Validation failed
   - Permission denied

4. **Test Errors**
   - Test setup failed
   - Assertion failed
   - Cleanup failed

### Error Handling Strategy

```typescript
try {
  await runTest();
} catch (error) {
  if (error.code === 404) {
    return {
      status: 'fail',
      error: 'Resource not found - check database/table configuration'
    };
  } else if (error.code === 409) {
    return {
      status: 'fail',
      error: 'Conflict detected - this is expected for conflict tests'
    };
  } else if (error.code === 401 || error.code === 403) {
    return {
      status: 'fail',
      error: 'Permission denied - check API key permissions'
    };
  } else {
    return {
      status: 'fail',
      error: `Unexpected error: ${error.message}`
    };
  }
}
```

## Testing Strategy

### Test Environment

- Use a dedicated test database
- Create test tables on setup
- Clean up test data after each test
- Use unique IDs to avoid conflicts

### Test Data Management

```typescript
// Setup
beforeAll(async () => {
  // Create test database and tables
  await setupTestDatabase();
});

// Cleanup
afterEach(async () => {
  // Clean up test data
  await cleanupTestData();
});

// Teardown
afterAll(async () => {
  // Remove test database
  await teardownTestDatabase();
});
```

### Performance Benchmarks

Expected performance targets:

- Single transaction: < 100ms
- 10 operations: < 200ms
- 100 operations: < 2s
- 1000 operations: < 10s (with batching)

### Success Criteria

Tests pass if:
1. All transaction methods work correctly
2. Commit applies all operations
3. Rollback reverts all operations
4. Bulk operations are atomic
5. Error handling works as expected
6. Performance meets targets
7. No data corruption occurs

## Best Practices

### Test Writing

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Assertions**: Use specific assertions
4. **Error Messages**: Provide clear failure messages
5. **Performance**: Track test duration

### Diagnostic Script

1. **Non-Destructive**: Don't affect production data
2. **Comprehensive**: Test all functionality
3. **Clear Output**: Easy to understand results
4. **Actionable**: Provide recommendations
5. **Fast**: Complete in under 2 minutes

### Integration Tests

1. **Real Environment**: Use actual Appwrite instance
2. **Complete Workflows**: Test end-to-end scenarios
3. **Edge Cases**: Test boundary conditions
4. **Concurrent Operations**: Test race conditions
5. **Error Scenarios**: Test failure paths

## Implementation Plan

### Phase 1: Configuration Verification (Day 1)
1. Create verification script
2. Check SDK versions
3. Verify environment variables
4. Test client initialization

### Phase 2: Unit Tests (Day 2-3)
1. Test createTransaction()
2. Test createOperations()
3. Test updateTransaction()
4. Test error handling

### Phase 3: Integration Tests (Day 4-5)
1. Test bulk import
2. Test bulk delete
3. Test bulk edit
4. Test real-world use cases

### Phase 4: Diagnostic Script (Day 6)
1. Create diagnostic script
2. Implement all test cases
3. Add reporting
4. Test cleanup

### Phase 5: Documentation (Day 7)
1. Document test results
2. Update developer guide
3. Create troubleshooting guide
4. Document known issues

## Conclusion

This design provides a comprehensive approach to verifying and testing the Appwrite Transactions implementation. By following this plan, we'll ensure that transactions work correctly in all scenarios and are ready for production use.

The testing strategy covers:
- Configuration verification
- Unit tests for individual methods
- Integration tests for real-world scenarios
- Performance benchmarks
- Error handling verification
- Diagnostic tools for quick verification

Once testing is complete, we'll have confidence that the transactions implementation is production-ready and provides the atomicity guarantees we need.
