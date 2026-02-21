/**
 * Concurrent Operations Testing for Database Operators
 * 
 * Tests requirement 9.4: Concurrent operation testing
 * 
 * This test suite has two parts:
 * 
 * 1. UNIT TESTS: Verify operator wrapper functions correctly create Appwrite Operator instances
 *    - Tests operator creation with various parameters
 *    - Verifies error handling and validation
 *    - Checks that operators are properly configured
 *    - Does NOT test actual database operations (uses mocks)
 * 
 * 2. INTEGRATION TESTS: Verify database operators maintain data integrity under concurrent load
 *    - Performs real Appwrite database operations
 *    - Tests 100 concurrent increments, 50 concurrent array appends, and mixed operations
 *    - Verifies final database state matches expected results
 *    - Detects actual race conditions and data corruption
 *    - Skipped when APPWRITE_INTEGRATION_TEST environment variable is not set
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock operatorMonitoring first
vi.mock('@/lib/operatorMonitoring', () => ({
  logOperatorUsage: vi.fn(),
}));

// Mock Appwrite
vi.mock('appwrite', () => ({
  Client: vi.fn(() => ({
    setEndpoint: vi.fn(function() { return this; },),
    setProject: vi.fn(function() { return this; },),
  })),
  Account: vi.fn(),
  TablesDB: vi.fn(),
  Storage: vi.fn(),
  Functions: vi.fn(),
  ID: {
    unique: vi.fn(() => `test-${Date.now()}-${Math.random()}`),
  },
  Operator: {
    increment: vi.fn((value: number, max?: number) => ({ __operator: 'increment', value, max })),
    decrement: vi.fn((value: number, min?: number) => ({ __operator: 'decrement', value, min })),
    arrayAppend: vi.fn((values: any[]) => ({ __operator: 'arrayAppend', values })),
    arrayRemove: vi.fn((value: any) => ({ __operator: 'arrayRemove', value })),
    arrayUnique: vi.fn(() => ({ __operator: 'arrayUnique' })),
    arrayInsert: vi.fn((index: number, value: any) => ({ __operator: 'arrayInsert', index, value })),
    arrayDiff: vi.fn((values: any[]) => ({ __operator: 'arrayDiff', values })),
    arrayPrepend: vi.fn((values: any[]) => ({ __operator: 'arrayPrepend', values })),
  },
}));

// Mock node-appwrite
vi.mock('node-appwrite', () => ({
  Client: vi.fn(() => ({
    setEndpoint: vi.fn(function() { return this; }),
    setProject: vi.fn(function() { return this; }),
    setKey: vi.fn(function() { return this; }),
    setJWT: vi.fn(function() { return this; }),
  })),
  Account: vi.fn(),
  TablesDB: vi.fn(() => ({
    createRow: vi.fn(),
    updateRow: vi.fn(),
    getRow: vi.fn(),
    deleteRow: vi.fn(),
  })),
  Storage: vi.fn(),
  Functions: vi.fn(),
  Users: vi.fn(),
  Teams: vi.fn(),
  TablesDB: vi.fn(),
}));

import { ID } from 'appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { createIncrement, createDecrement, arrayOperators } from '@/lib/operators';

// ============================================================================
// UNIT TESTS: Operator Wrapper Behavior
// ============================================================================

describe('Operator Wrapper Functions (Unit Tests)', () => {
  describe('createIncrement', () => {
    it('should create an increment operator with valid value', () => {
      const op = createIncrement(1);
      expect(op).toBeDefined();
      // Verify it's an Appwrite Operator instance
      expect(typeof op).toBe('object');
    });

    it('should throw error for non-numeric value', () => {
      expect(() => createIncrement(NaN)).toThrow('Increment value must be a valid number');
      expect(() => createIncrement('5' as any)).toThrow('Increment value must be a valid number');
    });

    it('should create increment operator with max bound', () => {
      const op = createIncrement(1, { max: 100 });
      expect(op).toBeDefined();
    });
  });

  describe('createDecrement', () => {
    it('should create a decrement operator with valid value', () => {
      const op = createDecrement(1);
      expect(op).toBeDefined();
      expect(typeof op).toBe('object');
    });

    it('should throw error for non-numeric value', () => {
      expect(() => createDecrement(NaN)).toThrow('Decrement value must be a valid number');
    });

    it('should create decrement operator with min bound', () => {
      const op = createDecrement(1, { min: 0 });
      expect(op).toBeDefined();
    });
  });

  describe('arrayOperators', () => {
    it('should create arrayAppend operator with valid array', () => {
      const op = arrayOperators.append(['value1', 'value2']);
      expect(op).toBeDefined();
      expect(typeof op).toBe('object');
    });

    it('should throw error for non-array value in append', () => {
      expect(() => arrayOperators.append('not-an-array' as any)).toThrow('arrayAppend requires an array');
    });

    it('should create arrayRemove operator', () => {
      const op = arrayOperators.remove('value');
      expect(op).toBeDefined();
      expect(typeof op).toBe('object');
    });

    it('should create arrayUnique operator', () => {
      const op = arrayOperators.unique();
      expect(op).toBeDefined();
      expect(typeof op).toBe('object');
    });

    it('should create arrayInsert operator with valid index', () => {
      const op = arrayOperators.insert(0, 'value');
      expect(op).toBeDefined();
    });

    it('should throw error for negative index in insert', () => {
      expect(() => arrayOperators.insert(-1, 'value')).toThrow('arrayInsert requires a non-negative index');
    });
  });

  describe('Concurrent Operator Creation', () => {
    it('should create 100 increment operators without errors', () => {
      const operators = Array.from({ length: 100 }, () => createIncrement(1));
      expect(operators).toHaveLength(100);
      expect(operators.every(op => op !== undefined)).toBe(true);
    });

    it('should create 50 array append operators without errors', () => {
      const operators = Array.from({ length: 50 }, (_, i) => 
        arrayOperators.append([`value-${i}`])
      );
      expect(operators).toHaveLength(50);
      expect(operators.every(op => op !== undefined)).toBe(true);
    });

    it('should handle rapid sequential operator creation', async () => {
      const results = await Promise.all(
        Array.from({ length: 100 }, async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          return createIncrement(1);
        })
      );
      expect(results).toHaveLength(100);
      expect(results.every(op => op !== undefined)).toBe(true);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS: Real Database Operations
// ============================================================================

// Helper function to wait for eventual consistency
async function waitForConsistency(
  checkFn: () => Promise<boolean>,
  maxRetries = 10,
  delayMs = 500
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    if (await checkFn()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  throw new Error('Timeout waiting for eventual consistency');
}

// Skip integration tests if environment is not configured
const skipIntegration = !process.env.APPWRITE_INTEGRATION_TEST;

describe.skipIf(skipIntegration)('Concurrent Operations Integration Tests (Real Database)', () => {
  let adminClient: ReturnType<typeof createAdminClient>;
  let databaseId: string;
  let tableId: string;
  const testDocuments: string[] = [];

  beforeEach(async () => {
    // Skip if integration tests are disabled
    if (skipIntegration) {
      return;
    }

    adminClient = createAdminClient();
    databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
    tableId = process.env.NEXT_PUBLIC_APPWRITE_CONCURRENT_TEST_TABLE_ID || 'concurrent_test';

    if (!databaseId) {
      throw new Error('NEXT_PUBLIC_APPWRITE_DATABASE_ID environment variable is required for integration tests');
    }
  });

  afterEach(async () => {
    // Clean up test documents
    if (skipIntegration) {
      return;
    }

    for (const docId of testDocuments) {
      try {
        await adminClient.tablesDB.deleteRow({
          databaseId,
          tableId,
          rowId: docId
        });
      } catch (error) {
        // Document may not exist, ignore
      }
    }
    testDocuments.length = 0;
  });

  describe('Real Appwrite Database Operations', () => {

    describe('100 Concurrent Increment Operations', () => {
      it('should execute 100 concurrent increments and verify final counter equals 100', async () => {
        const docId = ID.unique();
        testDocuments.push(docId);

        // Create test document with counter field
        await adminClient.tablesDB.createRow(
          databaseId,
          tableId,
          docId,
          {
            counter: 0,
            testType: 'increment_100',
          }
        );

        const startTime = Date.now();

        // Execute 100 concurrent increment operations with randomized delays
        const updatePromises = Array.from({ length: 100 }, async () => {
          // Introduce small randomized delays to simulate concurrency
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          
          return adminClient.tablesDB.updateRow(
            databaseId,
            tableId,
            docId,
            {
              counter: createIncrement(1),
            }
          );
        });

        const results = await Promise.all(updatePromises);
        const duration = Date.now() - startTime;

        // Verify all updates completed
        expect(results).toHaveLength(100);

        // Wait for eventual consistency and verify final counter value
        await waitForConsistency(async () => {
          const doc = await adminClient.tablesDB.getRow({
            databaseId,
            tableId,
            rowId: docId
          });
          return doc.counter === 100;
        });

        const finalDoc = await adminClient.tablesDB.getRow({
          databaseId,
          tableId,
          rowId: docId
        });
        expect(finalDoc.counter).toBe(100);

        console.log(`✓ 100 concurrent increments completed in ${duration}ms`);
        console.log(`  Final counter value: ${finalDoc.counter}`);
        console.log(`  Average per operation: ${(duration / 100).toFixed(2)}ms`);
      });
    });

    describe('50 Concurrent Array Append Operations', () => {
      it('should execute 50 concurrent array appends and verify all 50 unique values are preserved', async () => {
        const docId = ID.unique();
        testDocuments.push(docId);

        // Create test document with array field
        await adminClient.tablesDB.createRow(
          databaseId,
          tableId,
          docId,
          {
            items: [],
            testType: 'array_append_50',
          }
        );

        const startTime = Date.now();
        const uniqueValues = Array.from({ length: 50 }, (_, i) => `item-${i}-${Date.now()}`);

        // Execute 50 concurrent array append operations with randomized delays
        const updatePromises = uniqueValues.map(async (value) => {
          // Introduce small randomized delays to simulate concurrency
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          
          return adminClient.tablesDB.updateRow(
            databaseId,
            tableId,
            docId,
            {
              items: arrayOperators.append([value]),
            }
          );
        });

        const results = await Promise.all(updatePromises);
        const duration = Date.now() - startTime;

        // Verify all updates completed
        expect(results).toHaveLength(50);

        // Wait for eventual consistency and verify all values are present
        await waitForConsistency(async () => {
          const doc = await adminClient.tablesDB.getRow({
            databaseId,
            tableId,
            rowId: docId
          });
          return doc.items && doc.items.length === 50;
        });

        const finalDoc = await adminClient.tablesDB.getRow({
          databaseId,
          tableId,
          rowId: docId
        });
        
        // Verify array contains all 50 unique values
        expect(finalDoc.items).toHaveLength(50);
        expect(new Set(finalDoc.items).size).toBe(50);
        
        // Verify all expected values are present
        uniqueValues.forEach(value => {
          expect(finalDoc.items).toContain(value);
        });

        console.log(`✓ 50 concurrent array appends completed in ${duration}ms`);
        console.log(`  Final array length: ${finalDoc.items.length}`);
        console.log(`  All unique values preserved: ${new Set(finalDoc.items).size}`);
        console.log(`  Average per operation: ${(duration / 50).toFixed(2)}ms`);
      });
    });

    describe('Mixed Concurrent Operations', () => {
      it('should execute 100 concurrent increments and 50 concurrent appends simultaneously and verify both fields maintain integrity', async () => {
        const docId = ID.unique();
        testDocuments.push(docId);

        // Create test document with both counter and array fields
        await adminClient.tablesDB.createRow(
          databaseId,
          tableId,
          docId,
          {
            counter: 0,
            items: [],
            testType: 'mixed_operations',
          }
        );

        const startTime = Date.now();

        // Execute 100 concurrent increments
        const incrementPromises = Array.from({ length: 100 }, async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          return adminClient.tablesDB.updateRow(
            databaseId,
            tableId,
            docId,
            {
              counter: createIncrement(1),
            }
          );
        });

        // Execute 50 concurrent array appends
        const arrayValues = Array.from({ length: 50 }, (_, i) => `item-${i}-${Date.now()}`);
        const arrayPromises = arrayValues.map(async (value) => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          return adminClient.tablesDB.updateRow(
            databaseId,
            tableId,
            docId,
            {
              items: arrayOperators.append([value]),
            }
          );
        });

        const allResults = await Promise.all([...incrementPromises, ...arrayPromises]);
        const duration = Date.now() - startTime;

        expect(allResults).toHaveLength(150);

        // Wait for eventual consistency
        await waitForConsistency(async () => {
          const doc = await adminClient.tablesDB.getRow({
            databaseId,
            tableId,
            rowId: docId
          });
          return doc.counter === 100 && doc.items && doc.items.length === 50;
        });

        const finalDoc = await adminClient.tablesDB.getRow({
          databaseId,
          tableId,
          rowId: docId
        });

        // Verify both operations succeeded
        expect(finalDoc.counter).toBe(100);
        expect(finalDoc.items).toHaveLength(50);
        expect(new Set(finalDoc.items).size).toBe(50);

        console.log(`✓ Mixed concurrent operations completed in ${duration}ms`);
        console.log(`  Final counter: ${finalDoc.counter}`);
        console.log(`  Final array length: ${finalDoc.items.length}`);
        console.log(`  Average per operation: ${(duration / 150).toFixed(2)}ms`);
      });
    });
  });
});
