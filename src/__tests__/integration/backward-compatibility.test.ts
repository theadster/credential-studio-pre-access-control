/**
 * Integration Tests: Backward Compatibility
 * 
 * Tests that the concurrency improvements work with existing data
 * without requiring migrations, and that existing API contracts still work.
 * 
 * Requirements: 7.1, 7.2, 7.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TablesDB } from 'node-appwrite';
import {
  updateCredentialFields,
  updatePhotoFields,
  updateFields,
  FIELD_GROUPS,
} from '../../lib/fieldUpdate';
import {
  readWithVersion,
  updateWithLock,
  partialUpdateWithLock,
  getVersion,
} from '../../lib/optimisticLock';
import {
  detectConflict,
  OperationType,
} from '../../lib/conflictResolver';
import { mockTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

describe('Backward Compatibility', () => {
  const testDatabaseId = 'test-database';
  const testTableId = 'attendees';
  const testDocumentId = 'attendee-123';

  /**
   * Helper to extract update data from mock calls.
   * Appwrite SDK uses positional args: (databaseId, tableId, documentId, data)
   */
  function getUpdateData(callIndex = 0): Record<string, unknown> {
    return mockTablesDB.updateRow.mock.calls[callIndex][3];
  }

  beforeEach(() => {
    resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Records Without Version Field', () => {
    it('should treat missing version field as version 0', async () => {
      const legacyAttendee = {
        $id: testDocumentId,
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: 'https://example.com/photo.jpg',
        credentialUrl: null,
        // No version field - legacy record
      };

      mockTablesDB.getRow.mockResolvedValue(legacyAttendee);

      const { document, version } = await readWithVersion(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId
      );

      expect(version).toBe(0);
      expect(document).toEqual(legacyAttendee);
    });

    it('should add version field on first update to legacy record', async () => {
      const legacyAttendee = {
        $id: testDocumentId,
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: null,
        // No version field
      };

      mockTablesDB.getRow.mockResolvedValue(legacyAttendee);
      mockTablesDB.updateRow.mockImplementation((dbId, collId, docId, data) => {
        return Promise.resolve({
          ...legacyAttendee,
          ...data,
        });
      });

      await updateCredentialFields(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { credentialUrl: 'https://example.com/credential.pdf' }
      );

      // Verify version was set to 1 (0 + 1)
      const updateCall = mockTablesDB.updateRow.mock.calls[0];
      const updateData = updateCall[3];

      expect(updateData.version).toBe(1);
    });

    it('should handle update to record with version: undefined', async () => {
      const attendeeWithUndefinedVersion = {
        $id: testDocumentId,
        firstName: 'John',
        version: undefined, // Explicitly undefined
      };

      mockTablesDB.getRow.mockResolvedValue(attendeeWithUndefinedVersion);
      mockTablesDB.updateRow.mockResolvedValue({
        ...attendeeWithUndefinedVersion,
        photoUrl: 'https://example.com/photo.jpg',
        version: 1,
      });

      const result = await updatePhotoFields(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { photoUrl: 'https://example.com/photo.jpg' }
      );

      expect(result.success).toBe(true);
      
      const updateData = getUpdateData();
      expect(updateData.version).toBe(1);
    });

    it('should handle update to record with version: null', async () => {
      const attendeeWithNullVersion = {
        $id: testDocumentId,
        firstName: 'John',
        version: null, // Null version
      };

      mockTablesDB.getRow.mockResolvedValue(attendeeWithNullVersion);
      mockTablesDB.updateRow.mockResolvedValue({
        ...attendeeWithNullVersion,
        credentialUrl: 'https://example.com/credential.pdf',
        version: 1,
      });

      const result = await updateCredentialFields(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { credentialUrl: 'https://example.com/credential.pdf' }
      );

      expect(result.success).toBe(true);
      
      const updateData = getUpdateData();
      expect(updateData.version).toBe(1);
    });

    it('should handle update to record with version as string', async () => {
      const attendeeWithStringVersion = {
        $id: testDocumentId,
        firstName: 'John',
        version: '5', // String instead of number (data corruption scenario)
      };

      mockTablesDB.getRow.mockResolvedValue(attendeeWithStringVersion);
      mockTablesDB.updateRow.mockResolvedValue({
        ...attendeeWithStringVersion,
        photoUrl: 'https://example.com/photo.jpg',
        version: 1,
      });

      const result = await updatePhotoFields(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { photoUrl: 'https://example.com/photo.jpg' }
      );

      expect(result.success).toBe(true);
      
      // Should treat non-number version as 0 and increment to 1
      const updateData = getUpdateData();
      expect(updateData.version).toBe(1);
    });
  });

  describe('Version Field Initialization', () => {
    it('should initialize version to 1 on first update', async () => {
      const newAttendee = {
        $id: testDocumentId,
        firstName: 'New',
        lastName: 'Attendee',
      };

      mockTablesDB.getRow.mockResolvedValue(newAttendee);
      mockTablesDB.updateRow.mockResolvedValue({
        ...newAttendee,
        version: 1,
      });

      await updateFields(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { firstName: 'Updated' }
      );

      const updateData = getUpdateData();
      expect(updateData.version).toBe(1);
    });

    it('should increment existing version correctly', async () => {
      const existingAttendee = {
        $id: testDocumentId,
        firstName: 'John',
        version: 5,
      };

      mockTablesDB.getRow.mockResolvedValue(existingAttendee);
      mockTablesDB.updateRow.mockResolvedValue({
        ...existingAttendee,
        firstName: 'Jane',
        version: 6,
      });

      await updateFields(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { firstName: 'Jane' }
      );

      const updateData = getUpdateData();
      expect(updateData.version).toBe(6);
    });

    it('should handle version 0 correctly', async () => {
      const attendeeWithZeroVersion = {
        $id: testDocumentId,
        firstName: 'John',
        version: 0,
      };

      mockTablesDB.getRow.mockResolvedValue(attendeeWithZeroVersion);
      mockTablesDB.updateRow.mockResolvedValue({
        ...attendeeWithZeroVersion,
        version: 1,
      });

      await updateCredentialFields(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { credentialUrl: 'https://example.com/credential.pdf' }
      );

      const updateData = getUpdateData();
      expect(updateData.version).toBe(1);
    });
  });

  describe('Existing API Contracts', () => {
    it('should maintain backward compatibility with updateCredentialFields', async () => {
      const attendee = {
        $id: testDocumentId,
        firstName: 'John',
        credentialUrl: null,
        credentialCount: 0,
        version: 3,
      };

      mockTablesDB.getRow.mockResolvedValue(attendee);
      mockTablesDB.updateRow.mockResolvedValue({
        ...attendee,
        credentialUrl: 'https://example.com/credential.pdf',
        credentialCount: 1,
        version: 4,
      });

      const result = await updateCredentialFields(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        {
          credentialUrl: 'https://example.com/credential.pdf',
        }
      );

      // API contract: returns LockResult with success, data, version
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('version');
      expect(result.success).toBe(true);
    });

    it('should maintain backward compatibility with updatePhotoFields', async () => {
      const attendee = {
        $id: testDocumentId,
        firstName: 'John',
        photoUrl: null,
        photoUploadCount: 0,
        version: 2,
      };

      mockTablesDB.getRow.mockResolvedValue(attendee);
      mockTablesDB.updateRow.mockResolvedValue({
        ...attendee,
        photoUrl: 'https://example.com/photo.jpg',
        photoUploadCount: 1,
        version: 3,
      });

      const result = await updatePhotoFields(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        {
          photoUrl: 'https://example.com/photo.jpg',
        }
      );

      // API contract: returns LockResult with success, data, version
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('version');
      expect(result.success).toBe(true);
    });

    it('should maintain backward compatibility with updateWithLock', async () => {
      const attendee = {
        $id: testDocumentId,
        firstName: 'John',
        version: 1,
      };

      mockTablesDB.getRow.mockResolvedValue(attendee);
      mockTablesDB.updateRow.mockResolvedValue({
        ...attendee,
        firstName: 'Jane',
        version: 2,
      });

      const result = await updateWithLock(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        (current) => ({ firstName: 'Jane' })
      );

      // API contract: returns LockResult
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('conflictDetected');
      expect(result).toHaveProperty('retriesUsed');
      expect(result.success).toBe(true);
    });

    it('should maintain backward compatibility with partialUpdateWithLock', async () => {
      const attendee = {
        $id: testDocumentId,
        firstName: 'John',
        lastName: 'Doe',
        version: 5,
      };

      mockTablesDB.getRow.mockResolvedValue(attendee);
      mockTablesDB.updateRow.mockResolvedValue({
        ...attendee,
        firstName: 'Jane',
        version: 6,
      });

      const result = await partialUpdateWithLock(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { firstName: 'Jane' }
      );

      // API contract: returns LockResult
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('conflictDetected');
      expect(result.success).toBe(true);
    });
  });

  describe('getVersion Helper Function', () => {
    it('should return version when present as number', () => {
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
      expect(getVersion({ version: {} })).toBe(0);
      expect(getVersion({ version: [] })).toBe(0);
    });

    it('should handle negative version numbers', () => {
      // While unusual, negative versions should be returned as-is
      expect(getVersion({ version: -1 })).toBe(-1);
    });

    it('should handle floating point version numbers', () => {
      // Floating point versions should be returned as-is
      expect(getVersion({ version: 5.5 })).toBe(5.5);
    });
  });

  describe('Conflict Detection with Legacy Records', () => {
    it('should detect conflict when legacy record (no version) is updated', () => {
      const legacyDoc = {
        $id: testDocumentId,
        firstName: 'John',
        // No version field
      };

      const conflict = detectConflict(
        legacyDoc,
        { version: 1, fields: ['firstName'] },
        { operationType: OperationType.PROFILE_UPDATE, modifyingFields: ['firstName'] }
      );

      // Should detect conflict: expected version 1, actual version 0 (default)
      expect(conflict).not.toBeNull();
      expect(conflict?.actualVersion).toBe(0);
      expect(conflict?.expectedVersion).toBe(1);
    });

    it('should not detect conflict when expected version is 0 for legacy record', () => {
      const legacyDoc = {
        $id: testDocumentId,
        firstName: 'John',
        // No version field - defaults to 0
      };

      const conflict = detectConflict(
        legacyDoc,
        { version: 0, fields: ['firstName'] },
        { operationType: OperationType.PROFILE_UPDATE, modifyingFields: ['firstName'] }
      );

      // No conflict: expected 0, actual 0
      expect(conflict).toBeNull();
    });
  });

  describe('Mixed Version and Non-Version Records', () => {
    it('should handle batch with mixed version states', async () => {
      const attendees = [
        { $id: 'att-1', firstName: 'John', version: 5 },
        { $id: 'att-2', firstName: 'Jane' }, // No version
        { $id: 'att-3', firstName: 'Bob', version: 0 },
        { $id: 'att-4', firstName: 'Alice', version: null },
      ];

      const results: { id: string; newVersion: number }[] = [];

      mockTablesDB.getRow.mockImplementation((dbId, collId, docId) => {
        const attendee = attendees.find(a => a.$id === docId);
        return Promise.resolve(attendee);
      });

      mockTablesDB.updateRow.mockImplementation((dbId, collId, docId, data) => {
        results.push({ id: docId, newVersion: data.version });
        const attendee = attendees.find(a => a.$id === docId);
        return Promise.resolve({ ...attendee, ...data });
      });

      // Update all attendees
      for (const attendee of attendees) {
        await updateCredentialFields(
          mockTablesDB as unknown as TablesDB,
          testDatabaseId,
          testTableId,
          attendee.$id,
          { credentialUrl: `https://example.com/cred-${attendee.$id}.pdf` }
        );
      }

      // Verify version increments
      expect(results.find(r => r.id === 'att-1')?.newVersion).toBe(6);  // 5 + 1
      expect(results.find(r => r.id === 'att-2')?.newVersion).toBe(1);  // 0 + 1 (no version)
      expect(results.find(r => r.id === 'att-3')?.newVersion).toBe(1);  // 0 + 1
      expect(results.find(r => r.id === 'att-4')?.newVersion).toBe(1);  // 0 + 1 (null version)
    });
  });

  describe('No Migration Required', () => {
    it('should work with existing records without any schema changes', async () => {
      // Simulate a record that was created before the concurrency feature
      const existingRecord = {
        $id: testDocumentId,
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        photoUrl: 'https://example.com/photo.jpg',
        credentialUrl: 'https://example.com/credential.pdf',
        customFieldValues: JSON.stringify({ field1: 'value1' }),
        // No version, no tracking fields
      };

      mockTablesDB.getRow.mockResolvedValue(existingRecord);
      mockTablesDB.updateRow.mockResolvedValue({
        ...existingRecord,
        credentialUrl: 'https://example.com/new-credential.pdf',
        version: 1,
      });

      // Should be able to update without errors
      const result = await updateCredentialFields(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { credentialUrl: 'https://example.com/new-credential.pdf' }
      );

      expect(result.success).toBe(true);
      
      // Version should be added automatically
      const updateData = getUpdateData();
      expect(updateData.version).toBe(1);
    });

    it('should preserve all existing fields during update', async () => {
      const existingRecord = {
        $id: testDocumentId,
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        photoUrl: 'https://example.com/photo.jpg',
        photoUploadCount: 3,
        credentialUrl: 'https://example.com/credential.pdf',
        credentialCount: 2,
        customFieldValues: JSON.stringify({ field1: 'value1' }),
        notes: 'Important notes',
      };

      mockTablesDB.getRow.mockResolvedValue(existingRecord);
      mockTablesDB.updateRow.mockImplementation((dbId, collId, docId, data) => {
        return Promise.resolve({
          ...existingRecord,
          ...data,
        });
      });

      // Update only credential fields
      await updateCredentialFields(
        mockTablesDB as unknown as TablesDB,
        testDatabaseId,
        testTableId,
        testDocumentId,
        { credentialUrl: 'https://example.com/new-credential.pdf' }
      );

      // Verify only credential fields + version were in the update
      const updateData = getUpdateData();
      
      // Should NOT include non-credential fields
      expect(updateData).not.toHaveProperty('firstName');
      expect(updateData).not.toHaveProperty('lastName');
      expect(updateData).not.toHaveProperty('photoUrl');
      expect(updateData).not.toHaveProperty('customFieldValues');
      expect(updateData).not.toHaveProperty('notes');
      
      // Should include credential fields
      expect(updateData).toHaveProperty('credentialUrl');
      expect(updateData).toHaveProperty('version');
    });
  });
});
