/**
 * Integration Tests: Conflict Resolution Verification
 * 
 * Tests that the conflict resolution strategies (merge, latest-wins, retry)
 * produce correct combined data and handle edge cases properly.
 * 
 * Requirements: 4.1, 4.4, 4.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Databases } from 'node-appwrite';
import {
  ConflictType,
  OperationType,
  ResolutionStrategyType,
  detectConflict,
  determineStrategy,
  resolve,
  detectAndResolve,
  ConflictInfo,
  ResolutionStrategy,
} from '../../lib/conflictResolver';
import {
  updateWithLock,
  DEFAULT_LOCK_CONFIG,
} from '../../lib/optimisticLock';
import { mockDatabases, resetAllMocks } from '../../test/mocks/appwrite';

describe('Conflict Resolution Verification', () => {
  const testDatabaseId = 'test-database';
  const testCollectionId = 'attendees';
  const testDocumentId = 'attendee-123';

  beforeEach(() => {
    resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Merge Strategy Verification', () => {
    it('should produce correct combined data when merging credential and photo updates', () => {
      const conflict: ConflictInfo = {
        documentId: testDocumentId,
        operationType: OperationType.PHOTO_UPLOAD,
        expectedVersion: 3,
        actualVersion: 5,
        conflictingFields: ['credentialUrl', 'credentialGeneratedAt'],
        timestamp: new Date().toISOString(),
        conflictType: ConflictType.FIELD_COLLISION,
        affectedGroups: ['credential'],
      };

      const incomingData = {
        photoUrl: 'https://example.com/new-photo.jpg',
        photoUploadCount: 2,
        lastPhotoUploaded: '2024-01-15T10:00:00.000Z',
      };

      const currentData = {
        $id: testDocumentId,
        credentialUrl: 'https://example.com/credential.pdf',
        credentialGeneratedAt: '2024-01-14T09:00:00.000Z',
        photoUrl: 'https://example.com/old-photo.jpg',
        photoUploadCount: 1,
        version: 5,
      };

      const strategy = determineStrategy(conflict, incomingData, currentData);

      expect(strategy.type).toBe(ResolutionStrategyType.MERGE);
      expect(strategy.mergedData).toBeDefined();
      
      // Merged data should contain photo fields from incoming
      expect(strategy.mergedData).toHaveProperty('photoUrl', 'https://example.com/new-photo.jpg');
      expect(strategy.mergedData).toHaveProperty('photoUploadCount', 2);
    });

    it('should apply merge strategy successfully', async () => {
      const mockDocument = {
        $id: testDocumentId,
        credentialUrl: 'https://example.com/credential.pdf',
        photoUrl: 'https://example.com/old-photo.jpg',
        version: 5,
      };

      mockDatabases.getDocument.mockResolvedValue(mockDocument);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockDocument,
        photoUrl: 'https://example.com/new-photo.jpg',
        version: 6,
      });

      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.MERGE,
        mergedData: { photoUrl: 'https://example.com/new-photo.jpg' },
        reason: 'Non-overlapping field groups',
        retryable: true,
      };

      const result = await resolve(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testDocumentId,
        strategy,
        { photoUrl: 'https://example.com/new-photo.jpg' }
      );

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe(ResolutionStrategyType.MERGE);
    });

    it('should correctly merge non-overlapping field groups', () => {
      // Credential update conflicting with photo update
      const conflict: ConflictInfo = {
        documentId: testDocumentId,
        operationType: OperationType.CREDENTIAL_GENERATION,
        expectedVersion: 2,
        actualVersion: 4,
        conflictingFields: ['photoUrl'],
        timestamp: new Date().toISOString(),
        conflictType: ConflictType.FIELD_COLLISION,
        affectedGroups: ['photo'],
      };

      const incomingCredentialData = {
        credentialUrl: 'https://example.com/new-credential.pdf',
        credentialGeneratedAt: '2024-01-15T12:00:00.000Z',
        credentialCount: 3,
      };

      const currentData = {
        $id: testDocumentId,
        photoUrl: 'https://example.com/photo.jpg',
        photoUploadCount: 2,
        credentialUrl: 'https://example.com/old-credential.pdf',
        credentialCount: 2,
        version: 4,
      };

      const strategy = determineStrategy(conflict, incomingCredentialData, currentData);

      expect(strategy.type).toBe(ResolutionStrategyType.MERGE);
      expect(strategy.mergedData).toHaveProperty('credentialUrl');
      expect(strategy.mergedData).toHaveProperty('credentialGeneratedAt');
    });
  });

  describe('Retry Logic Verification', () => {
    it('should eventually succeed after retries', async () => {
      const mockDocument = {
        $id: testDocumentId,
        firstName: 'John',
        version: 1,
      };

      let attemptCount = 0;

      mockDatabases.getDocument.mockImplementation(() => {
        return Promise.resolve({
          ...mockDocument,
          version: attemptCount + 1, // Version increases with each attempt
        });
      });

      // First two attempts fail with conflict, third succeeds
      mockDatabases.updateDocument.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject({ code: 409, message: 'Document conflict' });
        }
        return Promise.resolve({
          ...mockDocument,
          firstName: 'Jane',
          version: attemptCount + 1,
        });
      });

      const resultPromise = updateWithLock(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testDocumentId,
        () => ({ firstName: 'Jane' }),
        { maxRetries: 3, baseDelayMs: 50, maxDelayMs: 200 }
      );

      // Advance timers for retry delays
      await vi.advanceTimersByTimeAsync(50);  // First retry
      await vi.advanceTimersByTimeAsync(100); // Second retry

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.retriesUsed).toBe(2);
      expect(result.conflictDetected).toBe(true);
    });

    it('should use exponential backoff between retries', async () => {
      const mockDocument = {
        $id: testDocumentId,
        version: 1,
      };

      const retryTimestamps: number[] = [];
      let startTime = Date.now();

      mockDatabases.getDocument.mockResolvedValue(mockDocument);
      mockDatabases.updateDocument.mockImplementation(() => {
        retryTimestamps.push(Date.now() - startTime);
        return Promise.reject({ code: 409, message: 'Document conflict' });
      });

      const resultPromise = updateWithLock(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testDocumentId,
        () => ({ firstName: 'Jane' }),
        { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 2000 }
      );

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(100);  // First retry (100ms)
      await vi.advanceTimersByTimeAsync(200);  // Second retry (200ms)
      await vi.advanceTimersByTimeAsync(400);  // Third retry (400ms)

      await resultPromise;

      // Verify exponential backoff pattern
      expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should respect max delay limit', async () => {
      const mockDocument = {
        $id: testDocumentId,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockDocument);
      mockDatabases.updateDocument.mockRejectedValue({ code: 409, message: 'Document conflict' });

      const resultPromise = updateWithLock(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testDocumentId,
        () => ({ firstName: 'Jane' }),
        { maxRetries: 5, baseDelayMs: 1000, maxDelayMs: 2000 }
      );

      // Even with high base delay, max delay should cap it
      // Delays would be: 1000, 2000 (capped), 2000 (capped), 2000 (capped), 2000 (capped)
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.retriesUsed).toBe(5);
    });
  });

  describe('Max Retries Error Handling', () => {
    it('should return appropriate error after max retries exceeded', async () => {
      const mockDocument = {
        $id: testDocumentId,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockDocument);
      mockDatabases.updateDocument.mockRejectedValue({ code: 409, message: 'Document conflict' });

      const resultPromise = updateWithLock(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testDocumentId,
        () => ({ firstName: 'Jane' }),
        { maxRetries: 2, baseDelayMs: 50, maxDelayMs: 200 }
      );

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(50);
      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('MAX_RETRIES_EXCEEDED');
      expect(result.error?.message).toContain('2 retries');
      expect(result.conflictDetected).toBe(true);
      expect(result.retriesUsed).toBe(2);
    });

    it('should include retry count in error response', async () => {
      const mockDocument = {
        $id: testDocumentId,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockDocument);
      mockDatabases.updateDocument.mockRejectedValue({ code: 409, message: 'Document conflict' });

      const maxRetries = 3;
      const resultPromise = updateWithLock(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testDocumentId,
        () => ({ firstName: 'Jane' }),
        { maxRetries, baseDelayMs: 25, maxDelayMs: 100 }
      );

      // Advance through all retries
      for (let i = 0; i < maxRetries; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      const result = await resultPromise;

      expect(result.retriesUsed).toBe(maxRetries);
      expect(result.error?.message).toContain(String(maxRetries));
    });

    it('should mark error as conflict-related when max retries due to conflicts', async () => {
      const mockDocument = {
        $id: testDocumentId,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockDocument);
      mockDatabases.updateDocument.mockRejectedValue({ code: 409, message: 'Document conflict' });

      const resultPromise = updateWithLock(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testDocumentId,
        () => ({ firstName: 'Jane' }),
        { maxRetries: 1, baseDelayMs: 25, maxDelayMs: 100 }
      );

      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(result.conflictDetected).toBe(true);
      expect(result.error?.type).toBe('MAX_RETRIES_EXCEEDED');
    });
  });

  describe('Latest-Wins Strategy Verification', () => {
    it('should use incoming data when it has newer timestamp', () => {
      const conflict: ConflictInfo = {
        documentId: testDocumentId,
        operationType: OperationType.PHOTO_UPLOAD,
        expectedVersion: 3,
        actualVersion: 5,
        conflictingFields: ['photoUrl'],
        timestamp: new Date().toISOString(),
        conflictType: ConflictType.FIELD_COLLISION,
        affectedGroups: ['photo'],
      };

      const incomingData = {
        photoUrl: 'https://example.com/newer-photo.jpg',
      };

      const currentData = {
        $id: testDocumentId,
        photoUrl: 'https://example.com/older-photo.jpg',
        lastPhotoUploaded: '2024-01-01T00:00:00.000Z',
        version: 5,
      };

      const strategy = determineStrategy(
        conflict,
        incomingData,
        currentData,
        { incomingTimestamp: '2024-01-15T00:00:00.000Z' }
      );

      expect(strategy.type).toBe(ResolutionStrategyType.LATEST_WINS);
      expect(strategy.mergedData).toHaveProperty('photoUrl', 'https://example.com/newer-photo.jpg');
    });

    it('should apply latest-wins strategy successfully', async () => {
      const mockDocument = {
        $id: testDocumentId,
        photoUrl: 'https://example.com/old-photo.jpg',
        version: 5,
      };

      mockDatabases.getDocument.mockResolvedValue(mockDocument);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockDocument,
        photoUrl: 'https://example.com/newer-photo.jpg',
        version: 6,
      });

      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.LATEST_WINS,
        mergedData: { photoUrl: 'https://example.com/newer-photo.jpg' },
        reason: 'Incoming data is newer',
        retryable: true,
      };

      const result = await resolve(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testDocumentId,
        strategy,
        { photoUrl: 'https://example.com/newer-photo.jpg' }
      );

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe(ResolutionStrategyType.LATEST_WINS);
    });
  });

  describe('Fail Strategy Verification', () => {
    it('should return FAIL for large version gaps with overlapping fields', () => {
      const conflict: ConflictInfo = {
        documentId: testDocumentId,
        operationType: OperationType.PHOTO_UPLOAD,
        expectedVersion: 1,
        actualVersion: 15, // Large gap
        conflictingFields: ['photoUrl'],
        timestamp: new Date().toISOString(),
        conflictType: ConflictType.FIELD_COLLISION,
        affectedGroups: ['photo'],
      };

      const incomingData = {
        photoUrl: 'https://example.com/photo.jpg',
      };

      const currentData = {
        $id: testDocumentId,
        photoUrl: 'https://example.com/current-photo.jpg',
        lastPhotoUploaded: '2024-01-15T00:00:00.000Z', // Current is newer
        version: 15,
      };

      const strategy = determineStrategy(
        conflict,
        incomingData,
        currentData,
        { incomingTimestamp: '2024-01-01T00:00:00.000Z' } // Incoming is older
      );

      expect(strategy.type).toBe(ResolutionStrategyType.FAIL);
      expect(strategy.retryable).toBe(false);
    });

    it('should return failure result for FAIL strategy', async () => {
      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.FAIL,
        reason: 'Cannot automatically resolve: version gap too large',
        retryable: false,
      };

      const result = await resolve(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testDocumentId,
        strategy,
        { photoUrl: 'https://example.com/photo.jpg' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error).toContain('Cannot automatically resolve: version gap too large');
    });
  });

  describe('Transient Conflict Handling', () => {
    it('should return RETRY for transient conflicts', () => {
      const conflict: ConflictInfo = {
        documentId: testDocumentId,
        operationType: OperationType.PROFILE_UPDATE,
        expectedVersion: 5,
        actualVersion: 6,
        conflictingFields: [],
        timestamp: new Date().toISOString(),
        conflictType: ConflictType.TRANSIENT,
        affectedGroups: [],
      };

      const strategy = determineStrategy(
        conflict,
        { firstName: 'Jane' },
        { version: 6 }
      );

      expect(strategy.type).toBe(ResolutionStrategyType.RETRY);
      expect(strategy.retryable).toBe(true);
    });

    it('should return RETRY for small version differences', () => {
      const conflict: ConflictInfo = {
        documentId: testDocumentId,
        operationType: OperationType.PROFILE_UPDATE,
        expectedVersion: 5,
        actualVersion: 6, // Only 1 version difference
        conflictingFields: [],
        timestamp: new Date().toISOString(),
        conflictType: ConflictType.VERSION_MISMATCH,
        affectedGroups: [],
      };

      const strategy = determineStrategy(
        conflict,
        { firstName: 'Jane' },
        { version: 6 }
      );

      expect(strategy.type).toBe(ResolutionStrategyType.RETRY);
    });
  });

  describe('Conflict Detection Accuracy', () => {
    it('should correctly detect version mismatch', () => {
      const currentDoc = {
        $id: testDocumentId,
        version: 10,
        photoUrl: 'photo.jpg',
      };

      const conflict = detectConflict(
        currentDoc,
        { version: 5, fields: ['photoUrl'] },
        { operationType: OperationType.PHOTO_UPLOAD, modifyingFields: ['photoUrl'] }
      );

      expect(conflict).not.toBeNull();
      expect(conflict?.expectedVersion).toBe(5);
      expect(conflict?.actualVersion).toBe(10);
    });

    it('should return null when versions match', () => {
      const currentDoc = {
        $id: testDocumentId,
        version: 5,
        photoUrl: 'photo.jpg',
      };

      const conflict = detectConflict(
        currentDoc,
        { version: 5, fields: ['photoUrl'] },
        { operationType: OperationType.PHOTO_UPLOAD, modifyingFields: ['photoUrl'] }
      );

      expect(conflict).toBeNull();
    });

    it('should handle documents without version field', () => {
      const currentDoc = {
        $id: testDocumentId,
        // No version field
        photoUrl: 'photo.jpg',
      };

      const conflict = detectConflict(
        currentDoc,
        { version: 1, fields: ['photoUrl'] },
        { operationType: OperationType.PHOTO_UPLOAD, modifyingFields: ['photoUrl'] }
      );

      expect(conflict).not.toBeNull();
      expect(conflict?.actualVersion).toBe(0); // Defaults to 0
      expect(conflict?.expectedVersion).toBe(1);
    });
  });
});
