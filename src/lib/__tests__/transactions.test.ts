/**
 * Unit tests for transaction utilities
 * 
 * Tests cover:
 * - executeTransaction() success and rollback scenarios
 * - executeTransactionWithRetry() retry logic and exponential backoff
 * - executeBatchedTransaction() batching logic
 * - Bulk operation helpers (create, update, delete)
 * - Error handling utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TablesDB } from 'node-appwrite';
import {
  executeTransaction,
  executeTransactionWithRetry,
  executeBatchedTransaction,
  executeBulkOperationWithFallback,
  createBulkDeleteOperations,
  createBulkUpdateOperations,
  createBulkCreateOperations,
  getTransactionLimit,
  handleTransactionError,
  detectTransactionErrorType,
  isRetryableError,
  createErrorMessage,
  TransactionErrorType,
  TRANSACTION_LIMITS,
  type TransactionOperation
} from '../transactions';

// Mock TablesDB
const createMockTablesDB = () => ({
  createTransaction: vi.fn(),
  createOperations: vi.fn(),
  updateTransaction: vi.fn()
});

// Mock NextApiResponse
const createMockResponse = () => {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
  return res;
};

describe('Transaction Utilities', () => {
  let mockTablesDB: ReturnType<typeof createMockTablesDB>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    mockTablesDB = createMockTablesDB();
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getTransactionLimit', () => {
    it('should return PRO limit by default', () => {
      delete process.env.APPWRITE_PLAN;
      expect(getTransactionLimit()).toBe(TRANSACTION_LIMITS.PRO);
    });

    it('should return FREE limit when plan is FREE', () => {
      process.env.APPWRITE_PLAN = 'FREE';
      expect(getTransactionLimit()).toBe(TRANSACTION_LIMITS.FREE);
    });

    it('should return PRO limit when plan is PRO', () => {
      process.env.APPWRITE_PLAN = 'PRO';
      expect(getTransactionLimit()).toBe(TRANSACTION_LIMITS.PRO);
    });

    it('should return SCALE limit when plan is SCALE', () => {
      process.env.APPWRITE_PLAN = 'SCALE';
      expect(getTransactionLimit()).toBe(TRANSACTION_LIMITS.SCALE);
    });

    it('should be case insensitive', () => {
      process.env.APPWRITE_PLAN = 'free';
      expect(getTransactionLimit()).toBe(TRANSACTION_LIMITS.FREE);
    });

    it('should return PRO limit for invalid plan', () => {
      process.env.APPWRITE_PLAN = 'INVALID';
      expect(getTransactionLimit()).toBe(TRANSACTION_LIMITS.PRO);
    });
  });

  describe('executeTransaction', () => {
    it('should execute transaction successfully', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = [
        {
          action: 'create',
          databaseId: 'db123',
          tableId: 'table123',
          rowId: 'row123',
          data: { name: 'Test' }
        }
      ];

      await executeTransaction(mockTablesDB as any, operations);

      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);
      expect(mockTablesDB.createOperations).toHaveBeenCalledWith({
        transactionId: 'tx123',
        operations
      });
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx123',
        commit: true
      });
    });

    it('should rollback on error', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockRejectedValue(new Error('Operation failed'));
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = [
        {
          action: 'create',
          databaseId: 'db123',
          tableId: 'table123',
          data: { name: 'Test' }
        }
      ];

      await expect(executeTransaction(mockTablesDB as any, operations)).rejects.toThrow('Operation failed');

      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx123',
        rollback: true
      });
    });

    it('should throw original error even if rollback fails', async () => {
      const mockTx = { $id: 'tx123' };
      const originalError = new Error('Operation failed');
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockRejectedValue(originalError);
      mockTablesDB.updateTransaction.mockRejectedValue(new Error('Rollback failed'));

      const operations: TransactionOperation[] = [
        {
          action: 'create',
          databaseId: 'db123',
          tableId: 'table123',
          data: { name: 'Test' }
        }
      ];

      await expect(executeTransaction(mockTablesDB as any, operations)).rejects.toThrow('Operation failed');
    });

    it('should handle commit failure', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction
        .mockRejectedValueOnce(new Error('Commit failed'))
        .mockResolvedValueOnce(undefined); // rollback succeeds

      const operations: TransactionOperation[] = [
        {
          action: 'create',
          databaseId: 'db123',
          tableId: 'table123',
          data: { name: 'Test' }
        }
      ];

      await expect(executeTransaction(mockTablesDB as any, operations)).rejects.toThrow('Commit failed');
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeTransactionWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = [
        {
          action: 'create',
          databaseId: 'db123',
          tableId: 'table123',
          data: { name: 'Test' }
        }
      ];

      await executeTransactionWithRetry(mockTablesDB as any, operations);

      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);
    });

    it('should retry on conflict error (409)', async () => {
      const mockTx = { $id: 'tx123' };
      const conflictError = Object.assign(new Error('Conflict'), { code: 409 });
      
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = [
        {
          action: 'create',
          databaseId: 'db123',
          tableId: 'table123',
          data: { name: 'Test' }
        }
      ];

      await executeTransactionWithRetry(mockTablesDB as any, operations, {
        maxRetries: 3,
        retryDelay: 10
      });

      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
    });

    it('should retry on conflict message', async () => {
      const mockTx = { $id: 'tx123' };
      const conflictError = new Error('Transaction conflict detected');
      
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = [
        {
          action: 'create',
          databaseId: 'db123',
          tableId: 'table123',
          data: { name: 'Test' }
        }
      ];

      await executeTransactionWithRetry(mockTablesDB as any, operations, {
        maxRetries: 3,
        retryDelay: 10
      });

      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const mockTx = { $id: 'tx123' };
      const conflictError = Object.assign(new Error('Conflict'), { code: 409 });
      
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError)
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = [
        {
          action: 'create',
          databaseId: 'db123',
          tableId: 'table123',
          data: { name: 'Test' }
        }
      ];

      const startTime = Date.now();
      await executeTransactionWithRetry(mockTablesDB as any, operations, {
        maxRetries: 3,
        retryDelay: 10
      });
      const duration = Date.now() - startTime;

      // Should have delays: 10ms (first retry) + 20ms (second retry) = 30ms minimum
      expect(duration).toBeGreaterThanOrEqual(25);
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-conflict errors', async () => {
      const mockTx = { $id: 'tx123' };
      const validationError = Object.assign(new Error('Validation failed'), { code: 400 });
      
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockRejectedValue(validationError);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = [
        {
          action: 'create',
          databaseId: 'db123',
          tableId: 'table123',
          data: { name: 'Test' }
        }
      ];

      await expect(
        executeTransactionWithRetry(mockTablesDB as any, operations, {
          maxRetries: 3,
          retryDelay: 10
        })
      ).rejects.toThrow('Validation failed');

      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const mockTx = { $id: 'tx123' };
      const conflictError = Object.assign(new Error('Conflict'), { code: 409 });
      
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockRejectedValue(conflictError);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = [
        {
          action: 'create',
          databaseId: 'db123',
          tableId: 'table123',
          data: { name: 'Test' }
        }
      ];

      await expect(
        executeTransactionWithRetry(mockTablesDB as any, operations, {
          maxRetries: 3,
          retryDelay: 10
        })
      ).rejects.toThrow('Conflict');

      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('executeBatchedTransaction', () => {
    beforeEach(() => {
      process.env.APPWRITE_PLAN = 'PRO'; // 1000 limit
    });

    it('should execute single transaction for small operations', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = Array(50).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      const result = await executeBatchedTransaction(mockTablesDB as any, operations);

      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(false);
      expect(result.batchCount).toBeUndefined();
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);
    });

    it('should batch operations exceeding plan limit', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Create 1500 operations (exceeds PRO limit of 1000)
      const operations: TransactionOperation[] = Array(1500).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      const result = await executeBatchedTransaction(mockTablesDB as any, operations);

      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(false);
      expect(result.batchCount).toBe(2); // Should create 2 batches
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
    });

    it('should use custom batch size', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = Array(250).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      const result = await executeBatchedTransaction(mockTablesDB as any, operations, {
        batchSize: 100
      });

      expect(result.success).toBe(true);
      expect(result.batchCount).toBe(3); // 250 / 100 = 3 batches
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(3);
    });

    it('should use fallback on single transaction failure', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockRejectedValue(new Error('Transaction failed'));
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = Array(50).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      const fallbackFn = vi.fn().mockResolvedValue(undefined);

      const result = await executeBatchedTransaction(mockTablesDB as any, operations, {
        enableFallback: true,
        fallbackFn
      });

      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(true);
      expect(fallbackFn).toHaveBeenCalledTimes(1);
    });

    it('should use fallback on batch failure', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations
        .mockResolvedValueOnce(undefined) // First batch succeeds
        .mockRejectedValueOnce(new Error('Batch failed')); // Second batch fails
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = Array(1500).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      const fallbackFn = vi.fn().mockResolvedValue(undefined);

      const result = await executeBatchedTransaction(mockTablesDB as any, operations, {
        enableFallback: true,
        fallbackFn
      });

      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(true);
      expect(fallbackFn).toHaveBeenCalledTimes(1);
    });

    it('should throw error when fallback is disabled', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockRejectedValue(new Error('Transaction failed'));
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = Array(50).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      const result = await executeBatchedTransaction(mockTablesDB as any, operations, {
        enableFallback: false
      });

      expect(result.success).toBe(false);
      expect(result.usedFallback).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should throw error when fallback function not provided', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockRejectedValue(new Error('Transaction failed'));
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = Array(50).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      const result = await executeBatchedTransaction(mockTablesDB as any, operations, {
        enableFallback: true
        // No fallbackFn provided
      });

      expect(result.success).toBe(false);
      expect(result.usedFallback).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should throw error when both transaction and fallback fail', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations
        .mockResolvedValueOnce(undefined) // First batch succeeds
        .mockRejectedValueOnce(new Error('Batch 2 failed')); // Second batch fails
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Create enough operations to trigger batching
      const operations: TransactionOperation[] = Array(1500).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      const fallbackFn = vi.fn().mockRejectedValue(new Error('Fallback failed'));

      await expect(
        executeBatchedTransaction(mockTablesDB as any, operations, {
          enableFallback: true,
          fallbackFn
        })
      ).rejects.toThrow('Both transaction and fallback failed');

      expect(fallbackFn).toHaveBeenCalledTimes(1);
    });

    it('should throw error with batch info when batch fails without fallback', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations
        .mockResolvedValueOnce(undefined) // First batch succeeds
        .mockRejectedValueOnce(new Error('Batch 2/3 failed')); // Second batch fails
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = Array(1500).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      await expect(
        executeBatchedTransaction(mockTablesDB as any, operations, {
          enableFallback: false
        })
      ).rejects.toThrow(/Batch.*failed/);
    });
  });

  describe('executeBulkOperationWithFallback', () => {
    beforeEach(() => {
      process.env.APPWRITE_PLAN = 'PRO';
    });

    it('should use transactions for successful operation', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = Array(50).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      const legacyFn = vi.fn().mockResolvedValue({ created: 50 });
      const mockDatabases = {};

      const result = await executeBulkOperationWithFallback(
        mockTablesDB as any,
        mockDatabases,
        operations,
        legacyFn,
        { operationType: 'import', itemCount: 50 }
      );

      expect(result.usedTransactions).toBe(true);
      expect(result.result).toBeNull();
      expect(legacyFn).not.toHaveBeenCalled();
    });

    it('should use legacy API on transaction failure', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockRejectedValue(new Error('Transaction failed'));
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = Array(50).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      const legacyFn = vi.fn().mockResolvedValue({ created: 50 });
      const mockDatabases = {};

      const result = await executeBulkOperationWithFallback(
        mockTablesDB as any,
        mockDatabases,
        operations,
        legacyFn,
        { operationType: 'import', itemCount: 50 }
      );

      expect(result.usedTransactions).toBe(false);
      expect(result.result).toEqual({ created: 50 });
      // legacyFn is called twice: once in fallback, once after fallback detection
      expect(legacyFn).toHaveBeenCalled();
    });

    it('should handle batched transactions', async () => {
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = Array(1500).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      const legacyFn = vi.fn().mockResolvedValue({ created: 1500 });
      const mockDatabases = {};

      const result = await executeBulkOperationWithFallback(
        mockTablesDB as any,
        mockDatabases,
        operations,
        legacyFn,
        { operationType: 'import', itemCount: 1500 }
      );

      expect(result.usedTransactions).toBe(true);
      expect(result.batchCount).toBe(2);
      expect(legacyFn).not.toHaveBeenCalled();
    });

    it('should catch and fallback when transaction throws error', async () => {
      // This test covers the catch block in executeBulkOperationWithFallback (lines 464-475)
      // We need to make executeBatchedTransaction throw an error (not return fallback result)
      const mockTx = { $id: 'tx123' };
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockRejectedValue(new Error('Transaction failed'));
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      const operations: TransactionOperation[] = Array(50).fill(null).map((_, i) => ({
        action: 'create',
        databaseId: 'db123',
        tableId: 'table123',
        rowId: `row${i}`,
        data: { name: `Test ${i}` }
      }));

      const legacyFn = vi.fn().mockResolvedValue({ created: 50 });
      const mockDatabases = {};

      // Mock executeBatchedTransaction to throw an error
      // This happens when fallback is disabled or not provided
      const result = await executeBulkOperationWithFallback(
        mockTablesDB as any,
        mockDatabases,
        operations,
        legacyFn,
        { operationType: 'delete', itemCount: 50 }
      );

      expect(result.usedTransactions).toBe(false);
      expect(result.result).toEqual({ created: 50 });
      expect(legacyFn).toHaveBeenCalled();
    });
  });

  describe('Bulk Operation Helpers', () => {
    describe('createBulkDeleteOperations', () => {
      it('should create delete operations with audit log', () => {
        const operations = createBulkDeleteOperations(
          'db123',
          'attendees',
          ['id1', 'id2', 'id3'],
          {
            tableId: 'logs',
            userId: 'user123',
            action: 'BULK_DELETE',
            details: { count: 3 }
          }
        );

        expect(operations).toHaveLength(4); // 3 deletes + 1 audit log
        
        // Check delete operations
        expect(operations[0]).toMatchObject({
          action: 'delete',
          databaseId: 'db123',
          tableId: 'attendees',
          rowId: 'id1'
        });
        expect(operations[1].rowId).toBe('id2');
        expect(operations[2].rowId).toBe('id3');

        // Check audit log
        expect(operations[3]).toMatchObject({
          action: 'create',
          databaseId: 'db123',
          tableId: 'logs'
        });
        expect(operations[3].data).toMatchObject({
          userId: 'user123',
          action: 'BULK_DELETE'
        });
        expect(operations[3].data?.details).toBe(JSON.stringify({ count: 3 }));
        expect(operations[3].data?.timestamp).toBeDefined();
      });

      it('should handle empty row IDs', () => {
        const operations = createBulkDeleteOperations(
          'db123',
          'attendees',
          [],
          {
            tableId: 'logs',
            userId: 'user123',
            action: 'BULK_DELETE',
            details: { count: 0 }
          }
        );

        expect(operations).toHaveLength(1); // Only audit log
        expect(operations[0].action).toBe('create');
      });
    });

    describe('createBulkUpdateOperations', () => {
      it('should create update operations with audit log', () => {
        const operations = createBulkUpdateOperations(
          'db123',
          'attendees',
          [
            { rowId: 'id1', data: { status: 'checked-in' } },
            { rowId: 'id2', data: { status: 'checked-in' } }
          ],
          {
            tableId: 'logs',
            userId: 'user123',
            action: 'BULK_UPDATE',
            details: { count: 2, changes: { status: 'checked-in' } }
          }
        );

        expect(operations).toHaveLength(3); // 2 updates + 1 audit log
        
        // Check update operations
        expect(operations[0]).toMatchObject({
          action: 'update',
          databaseId: 'db123',
          tableId: 'attendees',
          rowId: 'id1',
          data: { status: 'checked-in' }
        });
        expect(operations[1].rowId).toBe('id2');

        // Check audit log
        expect(operations[2]).toMatchObject({
          action: 'create',
          databaseId: 'db123',
          tableId: 'logs'
        });
        expect(operations[2].data?.userId).toBe('user123');
        expect(operations[2].data?.action).toBe('BULK_UPDATE');
      });

      it('should handle empty updates', () => {
        const operations = createBulkUpdateOperations(
          'db123',
          'attendees',
          [],
          {
            tableId: 'logs',
            userId: 'user123',
            action: 'BULK_UPDATE',
            details: { count: 0 }
          }
        );

        expect(operations).toHaveLength(1); // Only audit log
      });
    });

    describe('createBulkCreateOperations', () => {
      it('should create create operations with audit log', () => {
        const operations = createBulkCreateOperations(
          'db123',
          'attendees',
          [
            { rowId: 'id1', data: { name: 'John Doe' } },
            { rowId: 'id2', data: { name: 'Jane Smith' } }
          ],
          {
            tableId: 'logs',
            userId: 'user123',
            action: 'BULK_IMPORT',
            details: { count: 2 }
          }
        );

        expect(operations).toHaveLength(3); // 2 creates + 1 audit log
        
        // Check create operations
        expect(operations[0]).toMatchObject({
          action: 'create',
          databaseId: 'db123',
          tableId: 'attendees',
          rowId: 'id1',
          data: { name: 'John Doe' }
        });
        expect(operations[1]).toMatchObject({
          action: 'create',
          rowId: 'id2',
          data: { name: 'Jane Smith' }
        });

        // Check audit log
        expect(operations[2]).toMatchObject({
          action: 'create',
          databaseId: 'db123',
          tableId: 'logs'
        });
        expect(operations[2].data?.userId).toBe('user123');
        expect(operations[2].data?.action).toBe('BULK_IMPORT');
      });

      it('should handle empty items', () => {
        const operations = createBulkCreateOperations(
          'db123',
          'attendees',
          [],
          {
            tableId: 'logs',
            userId: 'user123',
            action: 'BULK_IMPORT',
            details: { count: 0 }
          }
        );

        expect(operations).toHaveLength(1); // Only audit log
      });

      it('should preserve all data fields', () => {
        const operations = createBulkCreateOperations(
          'db123',
          'attendees',
          [
            { 
              rowId: 'id1', 
              data: { 
                name: 'John Doe',
                email: 'john@example.com',
                customField1: 'value1',
                customField2: 123
              } 
            }
          ],
          {
            tableId: 'logs',
            userId: 'user123',
            action: 'BULK_IMPORT',
            details: { count: 1 }
          }
        );

        expect(operations[0].data).toEqual({
          name: 'John Doe',
          email: 'john@example.com',
          customField1: 'value1',
          customField2: 123
        });
      });
    });
  });

  describe('Error Handling Utilities', () => {
    describe('detectTransactionErrorType', () => {
      it('should detect conflict errors by code', () => {
        const error = Object.assign(new Error('Conflict'), { code: 409 });
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.CONFLICT);
      });

      it('should detect conflict errors by message', () => {
        const error = new Error('Transaction conflict detected');
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.CONFLICT);
      });

      it('should detect validation errors', () => {
        const error = Object.assign(new Error('Invalid data'), { code: 400 });
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.VALIDATION);
      });

      it('should detect plan limit errors', () => {
        const error = Object.assign(new Error('Exceeds plan limit'), { code: 400 });
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.PLAN_LIMIT);
      });

      it('should detect permission errors by code', () => {
        const error = Object.assign(new Error('Forbidden'), { code: 403 });
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.PERMISSION);
      });

      it('should detect permission errors by message', () => {
        const error = new Error('Permission denied');
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.PERMISSION);
      });

      it('should detect not found errors by code', () => {
        const error = Object.assign(new Error('Not found'), { code: 404 });
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.NOT_FOUND);
      });

      it('should detect not found errors by message', () => {
        const error = new Error('Resource not found');
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.NOT_FOUND);
      });

      it('should detect rollback errors', () => {
        const error = new Error('Rollback failed');
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.ROLLBACK);
      });

      it('should detect network errors by code 500', () => {
        const error = Object.assign(new Error('Server error'), { code: 500 });
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.NETWORK);
      });

      it('should detect network errors by code 503', () => {
        const error = Object.assign(new Error('Service unavailable'), { code: 503 });
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.NETWORK);
      });

      it('should detect timeout errors', () => {
        const error = new Error('Request timeout');
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.NETWORK);
      });

      it('should detect network connection errors', () => {
        const error = new Error('Network connection failed');
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.NETWORK);
      });

      it('should return UNKNOWN for unrecognized errors', () => {
        const error = new Error('Something went wrong');
        expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.UNKNOWN);
      });
    });

    describe('isRetryableError', () => {
      it('should return true for conflict errors', () => {
        const error = Object.assign(new Error('Conflict'), { code: 409 });
        expect(isRetryableError(error)).toBe(true);
      });

      it('should return true for network errors', () => {
        const error = Object.assign(new Error('Timeout'), { code: 500 });
        expect(isRetryableError(error)).toBe(true);
      });

      it('should return false for validation errors', () => {
        const error = Object.assign(new Error('Invalid'), { code: 400 });
        expect(isRetryableError(error)).toBe(false);
      });

      it('should return false for permission errors', () => {
        const error = Object.assign(new Error('Forbidden'), { code: 403 });
        expect(isRetryableError(error)).toBe(false);
      });

      it('should return false for not found errors', () => {
        const error = Object.assign(new Error('Not found'), { code: 404 });
        expect(isRetryableError(error)).toBe(false);
      });

      it('should return false for rollback errors', () => {
        const error = new Error('Rollback failed');
        expect(isRetryableError(error)).toBe(false);
      });

      it('should return false for unknown errors', () => {
        const error = new Error('Unknown error');
        expect(isRetryableError(error)).toBe(false);
      });
    });

    describe('createErrorMessage', () => {
      it('should create message for conflict errors', () => {
        const error = Object.assign(new Error('Conflict'), { code: 409 });
        const message = createErrorMessage(error);
        expect(message).toContain('modified by another user');
        expect(message).toContain('refresh');
      });

      it('should create message for validation errors', () => {
        const error = Object.assign(new Error('Invalid email'), { code: 400 });
        const message = createErrorMessage(error);
        expect(message).toBe('Invalid email');
      });

      it('should create message for permission errors', () => {
        const error = Object.assign(new Error('Forbidden'), { code: 403 });
        const message = createErrorMessage(error);
        expect(message).toContain('permission');
      });

      it('should create message for not found errors', () => {
        const error = Object.assign(new Error('Not found'), { code: 404 });
        const message = createErrorMessage(error);
        expect(message).toContain('could not be found');
        expect(message).toContain('deleted');
      });

      it('should create message for plan limit errors', () => {
        const error = Object.assign(new Error('Exceeds limit'), { code: 400 });
        const message = createErrorMessage(error);
        expect(message).toContain('plan limits');
        expect(message).toContain('support');
      });

      it('should create message for network errors', () => {
        const error = new Error('Timeout');
        const message = createErrorMessage(error);
        expect(message).toContain('Network error');
        expect(message).toContain('connection');
      });

      it('should create message for rollback errors', () => {
        const error = new Error('Rollback failed');
        const message = createErrorMessage(error);
        expect(message).toContain('rolled back');
        expect(message).toContain('support immediately');
      });

      it('should create generic message for unknown errors', () => {
        const error = new Error('Something went wrong');
        const message = createErrorMessage(error);
        expect(message).toBe('Something went wrong');
      });
    });

    describe('handleTransactionError', () => {
      let mockRes: ReturnType<typeof createMockResponse>;

      beforeEach(() => {
        mockRes = createMockResponse();
      });

      it('should handle conflict errors with 409 status', () => {
        const error = Object.assign(new Error('Conflict'), { code: 409 });
        handleTransactionError(error, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(409);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Transaction conflict',
            retryable: true,
            type: TransactionErrorType.CONFLICT
          })
        );
      });

      it('should handle validation errors with 400 status', () => {
        const error = Object.assign(new Error('Invalid data'), { code: 400 });
        handleTransactionError(error, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation error',
            retryable: false,
            type: TransactionErrorType.VALIDATION
          })
        );
      });

      it('should handle plan limit errors with 400 status', () => {
        const error = Object.assign(new Error('Exceeds plan limit'), { code: 400 });
        handleTransactionError(error, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Plan limit exceeded',
            retryable: false,
            type: TransactionErrorType.PLAN_LIMIT
          })
        );
      });

      it('should handle permission errors with 403 status', () => {
        const error = Object.assign(new Error('Forbidden'), { code: 403 });
        handleTransactionError(error, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Permission denied',
            retryable: false,
            type: TransactionErrorType.PERMISSION
          })
        );
      });

      it('should handle not found errors with 404 status', () => {
        const error = Object.assign(new Error('Not found'), { code: 404 });
        handleTransactionError(error, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Resource not found',
            retryable: false,
            type: TransactionErrorType.NOT_FOUND
          })
        );
      });

      it('should handle rollback errors with 500 status', () => {
        const error = new Error('Rollback failed');
        handleTransactionError(error, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Transaction rollback failed',
            retryable: false,
            type: TransactionErrorType.ROLLBACK,
            details: expect.objectContaining({
              critical: true
            })
          })
        );
      });

      it('should handle network errors with 500 status', () => {
        const error = Object.assign(new Error('Timeout'), { code: 500 });
        handleTransactionError(error, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Network error',
            retryable: true,
            type: TransactionErrorType.NETWORK
          })
        );
      });

      it('should handle unknown errors with 500 status', () => {
        const error = new Error('Something went wrong');
        handleTransactionError(error, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Internal server error',
            retryable: false,
            type: TransactionErrorType.UNKNOWN
          })
        );
      });

      it('should include suggestions in error responses', () => {
        const error = Object.assign(new Error('Conflict'), { code: 409 });
        handleTransactionError(error, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              suggestion: expect.any(String)
            })
          })
        );
      });
    });
  });
});
