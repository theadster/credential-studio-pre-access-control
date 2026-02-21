/**
 * Unit Tests for OptimisticLockService
 * 
 * Tests version-based optimistic locking, conflict detection,
 * retry logic with exponential backoff, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TablesDB } from 'node-appwrite';
import {
  readWithVersion,
  updateWithLock,
  partialUpdateWithLock,
  withRetry,
  getVersion,
  isVersionMismatchError,
  OptimisticLockConflictError,
  DEFAULT_LOCK_CONFIG,
} from '../../lib/optimisticLock';
import { mockTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

describe('OptimisticLockService', () => {
  const testDatabaseId = 'test-database';
  const testTableId = 'test-table';
  const testDocumentId = 'test-document-123';

  beforeEach(() => {
    resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getVersion', () => {
    it('should return version when present', () => {
      expect(getVersion({ version: 5 })).toBe(5);
      expect(getVersion({ version: 0 })).toBe(0);
      expect(getVersion({ version: 100 })).toBe(100);
    });

    it('should return 0 when version is missing', () => {
      expect(getVersion({})).toBe(0);
      expect(getVersion({ otherField: 'value' })).toBe(0);
    });

    it('should return 0 when version is not a number', () => {
      expect(getVersion({ version: 'string' })).toBe(0);
      expect(getVersion({ version: null })).toBe(0);
      expect(getVersion({ version: undefined })).toBe(0);
    });
  });

  describe('isVersionMismatchError', () => {
    it('should detect OptimisticLockConflictError', () => {
      const error = new OptimisticLockConflictError('doc-123', 1, 2);
      expect(isVersionMismatchError(error)).toBe(true);
    });

    it('should detect version-related error messages', () => {
      expect(isVersionMismatchError(new Error('Version mismatch'))).toBe(true);
      expect(isVersionMismatchError(new Error('Document conflict detected'))).toBe(true);
      expect(isVersionMismatchError(new Error('Record was modified'))).toBe(true);
      expect(isVersionMismatchError(new Error('Stale revision detected'))).toBe(true);
      expect(isVersionMismatchError(new Error('Version conflict on document'))).toBe(true);
      expect(isVersionMismatchError(new Error('Optimistic lock failure'))).toBe(true);
      expect(isVersionMismatchError(new Error('Concurrent modification error'))).toBe(true);
    });

    it('should detect Appwrite 409 conflict errors', () => {
      expect(isVersionMismatchError({ code: 409 })).toBe(true);
      expect(isVersionMismatchError({ type: 'document_conflict' })).toBe(true);
      expect(isVersionMismatchError({ code: 409, type: 'document_conflict' })).toBe(true);
    });

    it('should not detect unrelated errors', () => {
      expect(isVersionMismatchError(new Error('Network error'))).toBe(false);
      expect(isVersionMismatchError(new Error('Not found'))).toBe(false);
      expect(isVersionMismatchError({ code: 404 })).toBe(false);
      expect(isVersionMismatchError({ code: 500 })).toBe(false);
    });

    it('should not false-positive on generic words', () => {
      // These should NOT match - they contain generic words but not conflict phrases
      expect(isVersionMismatchError(new Error('Invalid version format'))).toBe(false);
      expect(isVersionMismatchError(new Error('File was modified successfully'))).toBe(false);
      expect(isVersionMismatchError(new Error('Stale cache cleared'))).toBe(false);
      expect(isVersionMismatchError(new Error('Conflict of interest'))).toBe(false);
      expect(isVersionMismatchError(new Error('API version 2.0'))).toBe(false);
    });
  });

  describe('OptimisticLockConflictError', () => {
    it('should create error with correct properties', () => {
      const error = new OptimisticLockConflictError('doc-123', 5, 7);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('OptimisticLockConflictError');
      expect(error.type).toBe('VERSION_MISMATCH');
      expect(error.documentId).toBe('doc-123');
      expect(error.expectedVersion).toBe(5);
      expect(error.actualVersion).toBe(7);
    });

    it('should have descriptive error message', () => {
      const error = new OptimisticLockConflictError('doc-456', 3, 5);

      expect(error.message).toContain('Version conflict');
      expect(error.message).toContain('doc-456');
      expect(error.message).toContain('expected 3');
      expect(error.message).toContain('found 5');
    });

    it('should allow custom message', () => {
      const error = new OptimisticLockConflictError('doc-789', 1, 2, 'Custom conflict message');
      expect(error.message).toBe('Custom conflict message');
    });
  });

  describe('readWithVersion', () => {
    it('should read document and extract version', async () => {
      const mockDocument = {
        $id: testDocumentId,
        name: 'Test',
        version: 5,
      };
      mockTablesDB.getRow.mockResolvedValue(mockDocument);

      const result = await readWithVersion(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId
      );

      expect(result.document).toEqual(mockDocument);
      expect(result.version).toBe(5);
      expect(mockTablesDB.getRow).toHaveBeenCalledWith({
        databaseId: testDatabaseId,
        tableId: testTableId,
        rowId: testDocumentId
      });
    });

    it('should default version to 0 when missing', async () => {
      const mockDocument = {
        $id: testDocumentId,
        name: 'Test',
        // No version field
      };
      mockTablesDB.getRow.mockResolvedValue(mockDocument);

      const result = await readWithVersion(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId
      );

      expect(result.version).toBe(0);
    });

    it('should throw error when document not found', async () => {
      mockTablesDB.getRow.mockRejectedValue(new Error('Document not found'));

      await expect(
        readWithVersion(
          mockTablesDB as unknown as TablesDB,
          testDatabaseId,
          testTableId,
          testDocumentId
        )
      ).rejects.toThrow('Document not found');
    });
  });

  describe('updateWithLock', () => {
    it('should increment version on successful update', async () => {
      const mockDocument = {
        $id: testDocumentId,
        name: 'Original',
        version: 3,
      };
      const mockUpdated = {
        ...mockDocument,
        name: 'Updated',
        version: 4,
      };

      mockTablesDB.getRow.mockResolvedValue(mockDocument);
      mockTablesDB.updateRow.mockResolvedValue(mockUpdated);

      const result = await updateWithLock(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        (current) => ({ name: 'Updated' })
      );

      expect(result.success).toBe(true);
      expect(result.version).toBe(4);
      expect(result.retriesUsed).toBe(0);
      expect(result.conflictDetected).toBe(false);
      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        testDatabaseId,
        testTableId,
        testDocumentId,
        expect.objectContaining({ name: 'Updated', version: 4 })
      );
    });

    it('should detect conflict with stale version', async () => {
      // First read returns version 3
      mockTablesDB.getRow.mockResolvedValue({
        $id: testDocumentId,
        name: 'Original',
        version: 3,
      });

      // Update fails with conflict
      const conflictError = { code: 409, message: 'Document conflict' };
      mockTablesDB.updateRow.mockRejectedValue(conflictError);

      const resultPromise = updateWithLock(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        () => ({ name: 'Updated' }),
        { maxRetries: 0 } // No retries for this test
      );

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.conflictDetected).toBe(true);
      expect(result.error?.type).toBe('MAX_RETRIES_EXCEEDED');
    });

    it('should retry with exponential backoff on conflict', async () => {
      const mockDocument = {
        $id: testDocumentId,
        name: 'Original',
        version: 3,
      };

      mockTablesDB.getRow.mockResolvedValue(mockDocument);

      // First two attempts fail with conflict, third succeeds
      const conflictError = { code: 409, message: 'Document conflict' };
      mockTablesDB.updateRow
        .mockRejectedValueOnce(conflictError)
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce({ ...mockDocument, name: 'Updated', version: 4 });

      const resultPromise = updateWithLock(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        () => ({ name: 'Updated' }),
        { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 2000 }
      );

      // Advance timers for backoff delays
      await vi.advanceTimersByTimeAsync(100); // First retry delay
      await vi.advanceTimersByTimeAsync(200); // Second retry delay

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.retriesUsed).toBe(2);
      expect(result.conflictDetected).toBe(true);
      expect(mockTablesDB.updateRow).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exceeded', async () => {
      const mockDocument = {
        $id: testDocumentId,
        name: 'Original',
        version: 3,
      };

      mockTablesDB.getRow.mockResolvedValue(mockDocument);

      // All attempts fail with conflict
      const conflictError = { code: 409, message: 'Document conflict' };
      mockTablesDB.updateRow.mockRejectedValue(conflictError);

      const resultPromise = updateWithLock(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        () => ({ name: 'Updated' }),
        { maxRetries: 2, baseDelayMs: 50, maxDelayMs: 200 }
      );

      // Advance timers for all retry delays
      await vi.advanceTimersByTimeAsync(50);  // First retry
      await vi.advanceTimersByTimeAsync(100); // Second retry

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.conflictDetected).toBe(true);
      expect(result.retriesUsed).toBe(2);
      expect(result.error?.type).toBe('MAX_RETRIES_EXCEEDED');
      expect(result.error?.message).toContain('2 retries');
    });

    it('should not retry on non-conflict errors', async () => {
      mockTablesDB.getRow.mockResolvedValue({
        $id: testDocumentId,
        version: 1,
      });

      const networkError = new Error('Network error');
      mockTablesDB.updateRow.mockRejectedValue(networkError);

      const result = await updateWithLock(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        () => ({ name: 'Updated' })
      );

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('UPDATE_FAILED');
      expect(mockTablesDB.updateRow).toHaveBeenCalledTimes(1);
    });

    it('should handle document not found error', async () => {
      mockTablesDB.getRow.mockRejectedValue(new Error('Document not found'));

      const result = await updateWithLock(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        () => ({ name: 'Updated' })
      );

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('RECORD_NOT_FOUND');
    });

    it('should pass current document and version to update function', async () => {
      const mockDocument = {
        $id: testDocumentId,
        count: 5,
        version: 2,
      };

      mockTablesDB.getRow.mockResolvedValue(mockDocument);
      mockTablesDB.updateRow.mockResolvedValue({
        ...mockDocument,
        count: 6,
        version: 3,
      });

      const updateFn = vi.fn((current: any, version: number) => ({
        count: current.count + 1,
      }));

      await updateWithLock(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        updateFn
      );

      expect(updateFn).toHaveBeenCalledWith(mockDocument, 2);
    });
  });

  describe('partialUpdateWithLock', () => {
    it('should update specific fields only', async () => {
      const mockDocument = {
        $id: testDocumentId,
        name: 'Original',
        email: 'test@example.com',
        version: 1,
      };

      mockTablesDB.getRow.mockResolvedValue(mockDocument);
      mockTablesDB.updateRow.mockResolvedValue({
        ...mockDocument,
        name: 'Updated',
        version: 2,
      });

      const result = await partialUpdateWithLock(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { name: 'Updated' }
      );

      expect(result.success).toBe(true);
      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        testDatabaseId,
        testTableId,
        testDocumentId,
        expect.objectContaining({ name: 'Updated', version: 2 })
      );
    });

    it('should fail immediately on version mismatch when expectedVersion provided', async () => {
      mockTablesDB.getRow.mockResolvedValue({
        $id: testDocumentId,
        version: 5, // Current version is 5
      });

      const result = await partialUpdateWithLock(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { name: 'Updated' },
        3 // Expected version 3, but current is 5
      );

      expect(result.success).toBe(false);
      expect(result.conflictDetected).toBe(true);
      expect(result.retriesUsed).toBe(0);
      expect(result.error?.type).toBe('VERSION_MISMATCH');
      expect(result.error?.expectedVersion).toBe(3);
      expect(result.error?.actualVersion).toBe(5);
      expect(mockTablesDB.updateRow).not.toHaveBeenCalled();
    });

    it('should proceed when expectedVersion matches', async () => {
      const mockDocument = {
        $id: testDocumentId,
        version: 3,
      };

      mockTablesDB.getRow.mockResolvedValue(mockDocument);
      mockTablesDB.updateRow.mockResolvedValue({
        ...mockDocument,
        name: 'Updated',
        version: 4,
      });

      const result = await partialUpdateWithLock(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { name: 'Updated' },
        3 // Expected version matches
      );

      expect(result.success).toBe(true);
    });
  });

  describe('withRetry', () => {
    it('should return success on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue({ data: 'success' });

      const result = await withRetry(operation);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: 'success' });
      expect(result.retriesUsed).toBe(0);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on version mismatch errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce({ code: 409 })
        .mockResolvedValueOnce({ data: 'success' });

      const resultPromise = withRetry(operation, { baseDelayMs: 50 });

      await vi.advanceTimersByTimeAsync(50);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.retriesUsed).toBe(1);
      expect(result.conflictDetected).toBe(true);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Permission denied'));

      const result = await withRetry(operation);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('UPDATE_FAILED');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('DEFAULT_LOCK_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_LOCK_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_LOCK_CONFIG.baseDelayMs).toBe(100);
      expect(DEFAULT_LOCK_CONFIG.maxDelayMs).toBe(2000);
    });
  });
});
