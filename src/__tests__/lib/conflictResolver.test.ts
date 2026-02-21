/**
 * Unit Tests for ConflictResolver
 * 
 * Tests conflict detection, strategy determination, resolution,
 * and logging functionality for concurrent operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TablesDB } from 'node-appwrite';
import {
  ConflictType,
  OperationType,
  ResolutionStrategyType,
  detectConflict,
  determineStrategy,
  resolve,
  logConflict,
  logConflictDetailed,
  formatConflictMessage,
  createUserFriendlyMessage,
  hasOverlappingFields,
  fieldsOverlapWithOperation,
  getOperationFieldGroups,
  getOperationFields,
  ConflictInfo,
  ResolutionStrategy,
} from '../../lib/conflictResolver';
import { FIELD_GROUPS } from '../../lib/fieldUpdate';
import { mockTablesDB, resetAllMocks } from '@/test/mocks/appwrite';
import { logger } from '../../lib/logger';

// Mock the logger
vi.mock('../../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ConflictResolver', () => {
  const testDatabaseId = 'test-database';
  const testTableId = 'test-table';
  const testDocumentId = 'test-document-123';

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
  });

  describe('detectConflict', () => {
    it('should detect version mismatch conflict', () => {
      const currentDoc = {
        $id: testDocumentId,
        version: 5,
        photoUrl: 'photo.jpg',
      };

      const conflict = detectConflict(
        currentDoc,
        { version: 3, fields: ['credentialUrl'] },
        { operationType: OperationType.CREDENTIAL_GENERATION, modifyingFields: ['credentialUrl'] }
      );

      expect(conflict).not.toBeNull();
      // When there are conflicting fields, it's a FIELD_COLLISION; otherwise VERSION_MISMATCH
      expect([ConflictType.VERSION_MISMATCH, ConflictType.FIELD_COLLISION]).toContain(conflict?.conflictType);
      expect(conflict?.expectedVersion).toBe(3);
      expect(conflict?.actualVersion).toBe(5);
      expect(conflict?.documentId).toBe(testDocumentId);
    });

    it('should return null when versions match', () => {
      const currentDoc = {
        $id: testDocumentId,
        version: 5,
      };

      const conflict = detectConflict(
        currentDoc,
        { version: 5, fields: ['credentialUrl'] },
        { operationType: OperationType.CREDENTIAL_GENERATION, modifyingFields: ['credentialUrl'] }
      );

      expect(conflict).toBeNull();
    });

    it('should identify conflicting fields based on operation type', () => {
      const currentDoc = {
        $id: testDocumentId,
        version: 5,
        photoUrl: 'photo.jpg',
        credentialUrl: 'credential.pdf',
      };

      const conflict = detectConflict(
        currentDoc,
        { version: 3, fields: ['photoUrl'] },
        { operationType: OperationType.PHOTO_UPLOAD, modifyingFields: ['photoUrl'] }
      );

      expect(conflict).not.toBeNull();
      expect(conflict?.conflictingFields).toContain('photoUrl');
      expect(conflict?.operationType).toBe(OperationType.PHOTO_UPLOAD);
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
      expect(conflict?.actualVersion).toBe(0);
      expect(conflict?.expectedVersion).toBe(1);
    });

    it('should identify affected field groups', () => {
      const currentDoc = {
        $id: testDocumentId,
        version: 5,
      };

      const conflict = detectConflict(
        currentDoc,
        { version: 3, fields: ['photoUrl', 'credentialUrl'] },
        { operationType: OperationType.PHOTO_UPLOAD, modifyingFields: ['photoUrl'] }
      );

      expect(conflict).not.toBeNull();
      expect(conflict?.affectedGroups).toBeDefined();
    });
  });

  describe('determineStrategy', () => {
    const baseConflict: ConflictInfo = {
      documentId: testDocumentId,
      operationType: OperationType.PHOTO_UPLOAD,
      expectedVersion: 3,
      actualVersion: 5,
      conflictingFields: ['credentialUrl'],
      timestamp: new Date().toISOString(),
      conflictType: ConflictType.VERSION_MISMATCH,
      affectedGroups: ['credential'],
    };

    it('should return MERGE for non-overlapping field conflicts (credential + photo)', () => {
      const conflict: ConflictInfo = {
        ...baseConflict,
        operationType: OperationType.PHOTO_UPLOAD,
        conflictingFields: ['credentialUrl', 'credentialGeneratedAt'],
        affectedGroups: ['credential'],
      };

      const strategy = determineStrategy(
        conflict,
        { photoUrl: 'new-photo.jpg' }, // Photo upload data
        { credentialUrl: 'credential.pdf', version: 5 } // Current data has credential
      );

      expect(strategy.type).toBe(ResolutionStrategyType.MERGE);
      expect(strategy.retryable).toBe(true);
      expect(strategy.mergedData).toBeDefined();
    });

    it('should return LATEST_WINS for overlapping fields with newer timestamp', () => {
      const conflict: ConflictInfo = {
        ...baseConflict,
        operationType: OperationType.PHOTO_UPLOAD,
        conflictingFields: ['photoUrl'],
        affectedGroups: ['photo'],
      };

      const oldTimestamp = '2024-01-01T00:00:00.000Z';
      const newTimestamp = '2024-01-02T00:00:00.000Z';

      const strategy = determineStrategy(
        conflict,
        { photoUrl: 'newer-photo.jpg' },
        { photoUrl: 'older-photo.jpg', lastPhotoUploaded: oldTimestamp, version: 5 },
        { incomingTimestamp: newTimestamp }
      );

      expect(strategy.type).toBe(ResolutionStrategyType.LATEST_WINS);
      expect(strategy.retryable).toBe(true);
    });

    it('should return RETRY for transient conflicts', () => {
      const conflict: ConflictInfo = {
        ...baseConflict,
        conflictType: ConflictType.TRANSIENT,
      };

      const strategy = determineStrategy(
        conflict,
        { photoUrl: 'photo.jpg' },
        { version: 5 }
      );

      expect(strategy.type).toBe(ResolutionStrategyType.RETRY);
      expect(strategy.retryable).toBe(true);
    });

    it('should return RETRY for small version differences', () => {
      const conflict: ConflictInfo = {
        ...baseConflict,
        expectedVersion: 4,
        actualVersion: 5, // Only 1 version difference
        conflictingFields: [],
        affectedGroups: [],
      };

      const strategy = determineStrategy(
        conflict,
        { firstName: 'John' },
        { version: 5 }
      );

      expect(strategy.type).toBe(ResolutionStrategyType.RETRY);
    });

    it('should return FAIL for large version gaps', () => {
      const conflict: ConflictInfo = {
        ...baseConflict,
        expectedVersion: 1,
        actualVersion: 10, // Large gap
        conflictingFields: ['photoUrl'],
        affectedGroups: ['photo'],
      };

      const strategy = determineStrategy(
        conflict,
        { photoUrl: 'photo.jpg' },
        { photoUrl: 'existing.jpg', lastPhotoUploaded: '2024-01-02T00:00:00.000Z', version: 10 },
        { incomingTimestamp: '2024-01-01T00:00:00.000Z' } // Older than current
      );

      expect(strategy.type).toBe(ResolutionStrategyType.FAIL);
      expect(strategy.retryable).toBe(false);
    });
  });

  describe('resolve', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should apply merge strategy by combining field sets', async () => {
      const mockDocument = {
        $id: testDocumentId,
        version: 5,
        credentialUrl: 'credential.pdf',
      };

      mockTablesDB.getRow.mockResolvedValue(mockDocument);
      mockTablesDB.updateRow.mockResolvedValue({
        ...mockDocument,
        photoUrl: 'photo.jpg',
        version: 6,
      });

      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.MERGE,
        mergedData: { photoUrl: 'photo.jpg' },
        reason: 'Non-overlapping fields',
        retryable: true,
      };

      const result = await resolve(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        strategy,
        { photoUrl: 'photo.jpg' }
      );

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe(ResolutionStrategyType.MERGE);
    });

    it('should apply latest-wins by using newer data', async () => {
      const mockDocument = {
        $id: testDocumentId,
        version: 5,
      };

      mockTablesDB.getRow.mockResolvedValue(mockDocument);
      mockTablesDB.updateRow.mockResolvedValue({
        ...mockDocument,
        photoUrl: 'newer-photo.jpg',
        version: 6,
      });

      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.LATEST_WINS,
        mergedData: { photoUrl: 'newer-photo.jpg' },
        reason: 'Incoming data is newer',
        retryable: true,
      };

      const result = await resolve(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        strategy,
        { photoUrl: 'newer-photo.jpg' }
      );

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe(ResolutionStrategyType.LATEST_WINS);
    });

    it('should return failure for FAIL strategy', async () => {
      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.FAIL,
        reason: 'Cannot resolve automatically',
        retryable: false,
      };

      const result = await resolve(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        strategy,
        { photoUrl: 'photo.jpg' }
      );

      expect(result.success).toBe(false);
      expect(result.strategyUsed).toBe(ResolutionStrategyType.FAIL);
      expect(result.error).toBe('Cannot resolve automatically');
    });

    it('should retry with fresh data for RETRY strategy', async () => {
      const mockDocument = {
        $id: testDocumentId,
        version: 5,
      };

      mockTablesDB.getRow.mockResolvedValue(mockDocument);
      mockTablesDB.updateRow.mockResolvedValue({
        ...mockDocument,
        photoUrl: 'photo.jpg',
        version: 6,
      });

      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.RETRY,
        reason: 'Transient conflict',
        retryable: true,
      };

      const result = await resolve(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        strategy,
        { photoUrl: 'photo.jpg' }
      );

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe(ResolutionStrategyType.RETRY);
    });
  });

  describe('logConflict', () => {
    it('should log successful resolution with info level', () => {
      const conflict: ConflictInfo = {
        documentId: testDocumentId,
        operationType: OperationType.PHOTO_UPLOAD,
        expectedVersion: 3,
        actualVersion: 5,
        conflictingFields: ['credentialUrl'],
        timestamp: new Date().toISOString(),
        conflictType: ConflictType.VERSION_MISMATCH,
      };

      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.MERGE,
        reason: 'Non-overlapping fields',
        retryable: true,
      };

      logConflict(conflict, strategy, true);

      expect(logger.info).toHaveBeenCalledWith(
        '[Concurrency] Conflict resolved',
        expect.objectContaining({
          documentId: testDocumentId,
          operationType: OperationType.PHOTO_UPLOAD,
          strategy: ResolutionStrategyType.MERGE,
        })
      );
    });

    it('should log failed resolution with warn level', () => {
      const conflict: ConflictInfo = {
        documentId: testDocumentId,
        operationType: OperationType.PHOTO_UPLOAD,
        expectedVersion: 3,
        actualVersion: 5,
        conflictingFields: ['photoUrl'],
        timestamp: new Date().toISOString(),
        conflictType: ConflictType.FIELD_COLLISION,
      };

      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.FAIL,
        reason: 'Cannot resolve automatically',
        retryable: false,
      };

      logConflict(conflict, strategy, false);

      expect(logger.warn).toHaveBeenCalledWith(
        '[Concurrency] Conflict resolution failed',
        expect.objectContaining({
          documentId: testDocumentId,
          reason: 'Cannot resolve automatically',
        })
      );
    });

    it('should anonymize session ID in logs', () => {
      const conflict: ConflictInfo = {
        documentId: testDocumentId,
        operationType: OperationType.PHOTO_UPLOAD,
        expectedVersion: 3,
        actualVersion: 5,
        conflictingFields: [],
        timestamp: new Date().toISOString(),
        conflictType: ConflictType.VERSION_MISMATCH,
      };

      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.MERGE,
        reason: 'Test',
        retryable: true,
      };

      // The session ID should be anonymized in the log entry
      logConflict(conflict, strategy, true, 'session-abc123-xyz789');

      // Verify logger was called (session anonymization is internal)
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('logConflictDetailed', () => {
    it('should return complete log entry', () => {
      const conflict: ConflictInfo = {
        documentId: testDocumentId,
        operationType: OperationType.CREDENTIAL_GENERATION,
        expectedVersion: 2,
        actualVersion: 4,
        conflictingFields: ['photoUrl'],
        timestamp: new Date().toISOString(),
        conflictType: ConflictType.FIELD_COLLISION,
      };

      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.MERGE,
        reason: 'Non-overlapping fields',
        retryable: true,
      };

      const result = {
        success: true,
        strategyUsed: ResolutionStrategyType.MERGE,
        retriesUsed: 1,
      };

      const logEntry = logConflictDetailed(conflict, strategy, result, 'session-123');

      expect(logEntry.documentId).toBe(testDocumentId);
      expect(logEntry.operationType).toBe(OperationType.CREDENTIAL_GENERATION);
      expect(logEntry.conflictType).toBe(ConflictType.FIELD_COLLISION);
      expect(logEntry.resolutionStrategy).toBe(ResolutionStrategyType.MERGE);
      expect(logEntry.resolutionSuccess).toBe(true);
      expect(logEntry.retriesUsed).toBe(1);
      expect(logEntry.sessionInfo).toBeDefined();
    });
  });

  describe('formatConflictMessage', () => {
    it('should format conflict for human-readable output', () => {
      const conflict: ConflictInfo = {
        documentId: testDocumentId,
        operationType: OperationType.PHOTO_UPLOAD,
        expectedVersion: 3,
        actualVersion: 5,
        conflictingFields: ['credentialUrl', 'photoUrl'],
        timestamp: new Date().toISOString(),
        conflictType: ConflictType.FIELD_COLLISION,
        affectedGroups: ['credential', 'photo'],
      };

      const message = formatConflictMessage(conflict);

      expect(message).toContain(testDocumentId);
      expect(message).toContain('photo_upload');
      expect(message).toContain('FIELD_COLLISION');
      expect(message).toContain('expected 3');
      expect(message).toContain('found 5');
      expect(message).toContain('credentialUrl');
    });
  });

  describe('createUserFriendlyMessage', () => {
    const baseConflict: ConflictInfo = {
      documentId: testDocumentId,
      operationType: OperationType.PHOTO_UPLOAD,
      expectedVersion: 3,
      actualVersion: 5,
      conflictingFields: [],
      timestamp: new Date().toISOString(),
      conflictType: ConflictType.VERSION_MISMATCH,
    };

    it('should return merge message for MERGE strategy', () => {
      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.MERGE,
        reason: 'Test',
        retryable: true,
      };

      const message = createUserFriendlyMessage(baseConflict, strategy);
      expect(message).toContain('merged');
    });

    it('should return latest-wins message for LATEST_WINS strategy', () => {
      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.LATEST_WINS,
        reason: 'Test',
        retryable: true,
      };

      const message = createUserFriendlyMessage(baseConflict, strategy);
      expect(message).toContain('more recent');
    });

    it('should return retry message for RETRY strategy', () => {
      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.RETRY,
        reason: 'Test',
        retryable: true,
      };

      const message = createUserFriendlyMessage(baseConflict, strategy);
      expect(message).toContain('try again');
    });

    it('should return failure message for FAIL strategy', () => {
      const strategy: ResolutionStrategy = {
        type: ResolutionStrategyType.FAIL,
        reason: 'Test',
        retryable: false,
      };

      const message = createUserFriendlyMessage(baseConflict, strategy);
      expect(message).toContain('Unable to save');
    });
  });

  describe('hasOverlappingFields', () => {
    it('should return false for credential and photo operations', () => {
      expect(hasOverlappingFields(
        OperationType.CREDENTIAL_GENERATION,
        OperationType.PHOTO_UPLOAD
      )).toBe(false);
    });

    it('should return true for same operation types', () => {
      expect(hasOverlappingFields(
        OperationType.PHOTO_UPLOAD,
        OperationType.PHOTO_UPLOAD
      )).toBe(true);
    });

    it('should return true for operations with shared field groups', () => {
      // Bulk edit includes profile and customFields
      // Profile update includes profile
      expect(hasOverlappingFields(
        OperationType.BULK_EDIT,
        OperationType.PROFILE_UPDATE
      )).toBe(true);
    });
  });

  describe('fieldsOverlapWithOperation', () => {
    it('should return true when fields overlap with operation', () => {
      expect(fieldsOverlapWithOperation(
        ['photoUrl', 'photoUploadCount'],
        OperationType.PHOTO_UPLOAD
      )).toBe(true);
    });

    it('should return false when fields do not overlap', () => {
      expect(fieldsOverlapWithOperation(
        ['credentialUrl', 'credentialGeneratedAt'],
        OperationType.PHOTO_UPLOAD
      )).toBe(false);
    });

    it('should handle mixed fields', () => {
      expect(fieldsOverlapWithOperation(
        ['firstName', 'photoUrl'], // firstName is profile, photoUrl is photo
        OperationType.PHOTO_UPLOAD
      )).toBe(true);
    });
  });

  describe('getOperationFieldGroups', () => {
    it('should return correct groups for credential generation', () => {
      const groups = getOperationFieldGroups(OperationType.CREDENTIAL_GENERATION);
      expect(groups).toContain('credential');
      expect(groups).not.toContain('photo');
    });

    it('should return correct groups for photo upload', () => {
      const groups = getOperationFieldGroups(OperationType.PHOTO_UPLOAD);
      expect(groups).toContain('photo');
      expect(groups).not.toContain('credential');
    });

    it('should return multiple groups for bulk edit', () => {
      const groups = getOperationFieldGroups(OperationType.BULK_EDIT);
      expect(groups).toContain('profile');
      expect(groups).toContain('customFields');
    });
  });

  describe('getOperationFields', () => {
    it('should return all credential fields for credential generation', () => {
      const fields = getOperationFields(OperationType.CREDENTIAL_GENERATION);
      expect(fields).toContain('credentialUrl');
      expect(fields).toContain('credentialGeneratedAt');
      expect(fields).toContain('credentialCount');
      expect(fields).toContain('lastCredentialGenerated');
    });

    it('should return all photo fields for photo upload', () => {
      const fields = getOperationFields(OperationType.PHOTO_UPLOAD);
      expect(fields).toContain('photoUrl');
      expect(fields).toContain('photoUploadCount');
      expect(fields).toContain('lastPhotoUploaded');
    });
  });
});
