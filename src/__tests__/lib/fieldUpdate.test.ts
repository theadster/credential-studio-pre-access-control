/**
 * Unit Tests for FieldUpdateService
 * 
 * Tests field-specific updates, field group isolation,
 * and ensuring concurrent operations don't overwrite each other's fields.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Databases } from 'node-appwrite';
import {
  FIELD_GROUPS,
  getFieldGroup,
  isFieldInGroup,
  getFieldGroupName,
  filterToGroups,
  excludeGroups,
  updateCredentialFields,
  updatePhotoFields,
  updateFields,
  updateFieldGroup,
} from '../../lib/fieldUpdate';
import { mockDatabases, resetAllMocks } from '../../test/mocks/appwrite';

describe('FieldUpdateService', () => {
  const testDatabaseId = 'test-database';
  const testCollectionId = 'test-collection';
  const testAttendeeId = 'attendee-123';

  beforeEach(() => {
    resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // Field Group Definitions Tests
  // ============================================================================

  describe('FIELD_GROUPS', () => {
    it('should define credential fields correctly', () => {
      expect(FIELD_GROUPS.credential).toContain('credentialUrl');
      expect(FIELD_GROUPS.credential).toContain('credentialGeneratedAt');
      expect(FIELD_GROUPS.credential).toContain('credentialCount');
      expect(FIELD_GROUPS.credential).toContain('lastCredentialGenerated');
      expect(FIELD_GROUPS.credential).toHaveLength(4);
    });

    it('should define photo fields correctly', () => {
      expect(FIELD_GROUPS.photo).toContain('photoUrl');
      expect(FIELD_GROUPS.photo).toContain('photoUploadCount');
      expect(FIELD_GROUPS.photo).toContain('lastPhotoUploaded');
      expect(FIELD_GROUPS.photo).toHaveLength(3);
    });

    it('should define profile fields correctly', () => {
      expect(FIELD_GROUPS.profile).toContain('firstName');
      expect(FIELD_GROUPS.profile).toContain('lastName');
      expect(FIELD_GROUPS.profile).toContain('barcodeNumber');
      expect(FIELD_GROUPS.profile).toContain('notes');
      expect(FIELD_GROUPS.profile).toHaveLength(4);
    });

    it('should define access control fields correctly', () => {
      expect(FIELD_GROUPS.accessControl).toContain('accessEnabled');
      expect(FIELD_GROUPS.accessControl).toContain('validFrom');
      expect(FIELD_GROUPS.accessControl).toContain('validUntil');
      expect(FIELD_GROUPS.accessControl).toHaveLength(3);
    });

    it('should have no overlap between credential and photo fields', () => {
      const credentialSet = new Set(FIELD_GROUPS.credential);
      const photoSet = new Set(FIELD_GROUPS.photo);
      
      for (const field of credentialSet) {
        expect(photoSet.has(field)).toBe(false);
      }
    });

    it('should have no overlap between credential and profile fields', () => {
      const credentialSet = new Set(FIELD_GROUPS.credential);
      const profileSet = new Set(FIELD_GROUPS.profile);
      
      for (const field of credentialSet) {
        expect(profileSet.has(field)).toBe(false);
      }
    });
  });

  // ============================================================================
  // Helper Function Tests
  // ============================================================================

  describe('getFieldGroup', () => {
    it('should return credential fields', () => {
      const fields = getFieldGroup('credential');
      expect(fields).toEqual(FIELD_GROUPS.credential);
    });

    it('should return photo fields', () => {
      const fields = getFieldGroup('photo');
      expect(fields).toEqual(FIELD_GROUPS.photo);
    });
  });

  describe('isFieldInGroup', () => {
    it('should return true for credential fields in credential group', () => {
      expect(isFieldInGroup('credentialUrl', 'credential')).toBe(true);
      expect(isFieldInGroup('credentialGeneratedAt', 'credential')).toBe(true);
    });

    it('should return false for photo fields in credential group', () => {
      expect(isFieldInGroup('photoUrl', 'credential')).toBe(false);
      expect(isFieldInGroup('photoUploadCount', 'credential')).toBe(false);
    });

    it('should return true for photo fields in photo group', () => {
      expect(isFieldInGroup('photoUrl', 'photo')).toBe(true);
      expect(isFieldInGroup('lastPhotoUploaded', 'photo')).toBe(true);
    });
  });

  describe('getFieldGroupName', () => {
    it('should return correct group for credential fields', () => {
      expect(getFieldGroupName('credentialUrl')).toBe('credential');
      expect(getFieldGroupName('credentialCount')).toBe('credential');
    });

    it('should return correct group for photo fields', () => {
      expect(getFieldGroupName('photoUrl')).toBe('photo');
      expect(getFieldGroupName('photoUploadCount')).toBe('photo');
    });

    it('should return undefined for unknown fields', () => {
      expect(getFieldGroupName('unknownField')).toBeUndefined();
      expect(getFieldGroupName('randomField')).toBeUndefined();
    });
  });

  describe('filterToGroups', () => {
    it('should filter data to only credential fields', () => {
      const data = {
        credentialUrl: 'https://example.com/cred.pdf',
        credentialGeneratedAt: '2024-01-01',
        photoUrl: 'https://example.com/photo.jpg',
        firstName: 'John',
      };

      const filtered = filterToGroups(data, ['credential']);

      expect(filtered).toEqual({
        credentialUrl: 'https://example.com/cred.pdf',
        credentialGeneratedAt: '2024-01-01',
      });
      expect(filtered).not.toHaveProperty('photoUrl');
      expect(filtered).not.toHaveProperty('firstName');
    });

    it('should filter data to multiple groups', () => {
      const data = {
        credentialUrl: 'https://example.com/cred.pdf',
        photoUrl: 'https://example.com/photo.jpg',
        firstName: 'John',
        accessEnabled: true,
      };

      const filtered = filterToGroups(data, ['credential', 'photo']);

      expect(filtered).toHaveProperty('credentialUrl');
      expect(filtered).toHaveProperty('photoUrl');
      expect(filtered).not.toHaveProperty('firstName');
      expect(filtered).not.toHaveProperty('accessEnabled');
    });
  });

  describe('excludeGroups', () => {
    it('should exclude credential fields from data', () => {
      const data = {
        credentialUrl: 'https://example.com/cred.pdf',
        photoUrl: 'https://example.com/photo.jpg',
        firstName: 'John',
      };

      const filtered = excludeGroups(data, ['credential']);

      expect(filtered).not.toHaveProperty('credentialUrl');
      expect(filtered).toHaveProperty('photoUrl');
      expect(filtered).toHaveProperty('firstName');
    });
  });

  // ============================================================================
  // updateCredentialFields Tests
  // ============================================================================

  describe('updateCredentialFields', () => {
    it('should only update credential-specific fields', async () => {
      const mockAttendee = {
        $id: testAttendeeId,
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: 'https://example.com/photo.jpg',
        photoUploadCount: 1,
        credentialUrl: null,
        credentialCount: 0,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl: 'https://example.com/credential.pdf',
        credentialGeneratedAt: '2024-01-01T00:00:00.000Z',
        credentialCount: 1,
        lastCredentialGenerated: '2024-01-01T00:00:00.000Z',
        version: 2,
      });

      const result = await updateCredentialFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          credentialUrl: 'https://example.com/credential.pdf',
        }
      );

      expect(result.success).toBe(true);
      
      // Verify only credential fields were in the update
      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];
      
      expect(updateData).toHaveProperty('credentialUrl');
      expect(updateData).toHaveProperty('credentialGeneratedAt');
      expect(updateData).toHaveProperty('credentialCount');
      expect(updateData).toHaveProperty('lastCredentialGenerated');
      expect(updateData).toHaveProperty('version');
      
      // Should NOT have photo or profile fields
      expect(updateData).not.toHaveProperty('photoUrl');
      expect(updateData).not.toHaveProperty('photoUploadCount');
      expect(updateData).not.toHaveProperty('firstName');
      expect(updateData).not.toHaveProperty('lastName');
    });

    it('should not affect photo fields during credential update', async () => {
      const originalPhotoUrl = 'https://example.com/original-photo.jpg';
      const originalPhotoCount = 5;
      
      const mockAttendee = {
        $id: testAttendeeId,
        photoUrl: originalPhotoUrl,
        photoUploadCount: originalPhotoCount,
        credentialUrl: null,
        credentialCount: 0,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        // Simulate Appwrite behavior - only update provided fields
        return Promise.resolve({
          ...mockAttendee,
          ...data,
        });
      });

      await updateCredentialFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          credentialUrl: 'https://example.com/credential.pdf',
        }
      );

      // Verify photo fields were NOT included in update
      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];
      
      expect(updateData).not.toHaveProperty('photoUrl');
      expect(updateData).not.toHaveProperty('photoUploadCount');
      expect(updateData).not.toHaveProperty('lastPhotoUploaded');
    });

    it('should increment credential count correctly', async () => {
      const mockAttendee = {
        $id: testAttendeeId,
        credentialUrl: 'https://example.com/old-credential.pdf',
        credentialCount: 3,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialCount: 4,
        version: 2,
      });

      await updateCredentialFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          credentialUrl: 'https://example.com/new-credential.pdf',
        }
      );

      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];
      
      expect(updateData.credentialCount).toBe(4); // 3 + 1
    });
  });

  // ============================================================================
  // updatePhotoFields Tests
  // ============================================================================

  describe('updatePhotoFields', () => {
    it('should only update photo-specific fields', async () => {
      const mockAttendee = {
        $id: testAttendeeId,
        firstName: 'John',
        lastName: 'Doe',
        credentialUrl: 'https://example.com/credential.pdf',
        credentialCount: 2,
        photoUrl: null,
        photoUploadCount: 0,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        photoUrl: 'https://example.com/photo.jpg',
        photoUploadCount: 1,
        lastPhotoUploaded: '2024-01-01T00:00:00.000Z',
        version: 2,
      });

      const result = await updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          photoUrl: 'https://example.com/photo.jpg',
        }
      );

      expect(result.success).toBe(true);
      
      // Verify only photo fields were in the update
      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];
      
      expect(updateData).toHaveProperty('photoUrl');
      expect(updateData).toHaveProperty('photoUploadCount');
      expect(updateData).toHaveProperty('lastPhotoUploaded');
      expect(updateData).toHaveProperty('version');
      
      // Should NOT have credential or profile fields
      expect(updateData).not.toHaveProperty('credentialUrl');
      expect(updateData).not.toHaveProperty('credentialCount');
      expect(updateData).not.toHaveProperty('firstName');
      expect(updateData).not.toHaveProperty('lastName');
    });

    it('should not affect credential fields during photo update', async () => {
      const originalCredentialUrl = 'https://example.com/original-credential.pdf';
      const originalCredentialCount = 3;
      
      const mockAttendee = {
        $id: testAttendeeId,
        credentialUrl: originalCredentialUrl,
        credentialCount: originalCredentialCount,
        photoUrl: null,
        photoUploadCount: 0,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        return Promise.resolve({
          ...mockAttendee,
          ...data,
        });
      });

      await updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          photoUrl: 'https://example.com/photo.jpg',
        }
      );

      // Verify credential fields were NOT included in update
      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];
      
      expect(updateData).not.toHaveProperty('credentialUrl');
      expect(updateData).not.toHaveProperty('credentialCount');
      expect(updateData).not.toHaveProperty('credentialGeneratedAt');
      expect(updateData).not.toHaveProperty('lastCredentialGenerated');
    });

    it('should increment photo count when adding photo', async () => {
      const mockAttendee = {
        $id: testAttendeeId,
        photoUrl: null,
        photoUploadCount: 0,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        photoUrl: 'https://example.com/photo.jpg',
        photoUploadCount: 1,
        version: 2,
      });

      await updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          photoUrl: 'https://example.com/photo.jpg',
        }
      );

      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];
      
      expect(updateData.photoUploadCount).toBe(1);
      expect(updateData.lastPhotoUploaded).toBeDefined();
    });

    it('should decrement photo count when removing photo', async () => {
      const mockAttendee = {
        $id: testAttendeeId,
        photoUrl: 'https://example.com/photo.jpg',
        photoUploadCount: 2,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        photoUrl: null,
        photoUploadCount: 1,
        version: 2,
      });

      await updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          photoUrl: null,
        }
      );

      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];
      
      expect(updateData.photoUploadCount).toBe(1);
    });

    it('should not go below 0 when decrementing photo count', async () => {
      const mockAttendee = {
        $id: testAttendeeId,
        photoUrl: 'https://example.com/photo.jpg',
        photoUploadCount: 0, // Already at 0
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        photoUrl: null,
        photoUploadCount: 0,
        version: 2,
      });

      await updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          photoUrl: null,
        }
      );

      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];
      
      expect(updateData.photoUploadCount).toBe(0);
    });

    it('should not change count when replacing photo', async () => {
      const mockAttendee = {
        $id: testAttendeeId,
        photoUrl: 'https://example.com/old-photo.jpg',
        photoUploadCount: 3,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        photoUrl: 'https://example.com/new-photo.jpg',
        version: 2,
      });

      await updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          photoUrl: 'https://example.com/new-photo.jpg',
        }
      );

      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];
      
      // Count should not be in update when replacing (had photo, still has photo)
      expect(updateData.photoUploadCount).toBeUndefined();
    });
  });

  // ============================================================================
  // Field Group Isolation Tests
  // ============================================================================

  describe('Field Group Isolation', () => {
    it('should ensure credential updates never include photo fields', async () => {
      const mockAttendee = {
        $id: testAttendeeId,
        photoUrl: 'https://example.com/photo.jpg',
        photoUploadCount: 5,
        lastPhotoUploaded: '2024-01-01T00:00:00.000Z',
        credentialUrl: null,
        credentialCount: 0,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl: 'https://example.com/credential.pdf',
        version: 2,
      });

      await updateCredentialFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        { credentialUrl: 'https://example.com/credential.pdf' }
      );

      const updateData = mockDatabases.updateDocument.mock.calls[0][3];
      
      // Verify NO photo fields are present
      for (const photoField of FIELD_GROUPS.photo) {
        expect(updateData).not.toHaveProperty(photoField);
      }
    });

    it('should ensure photo updates never include credential fields', async () => {
      const mockAttendee = {
        $id: testAttendeeId,
        credentialUrl: 'https://example.com/credential.pdf',
        credentialCount: 3,
        credentialGeneratedAt: '2024-01-01T00:00:00.000Z',
        lastCredentialGenerated: '2024-01-01T00:00:00.000Z',
        photoUrl: null,
        photoUploadCount: 0,
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        photoUrl: 'https://example.com/photo.jpg',
        version: 2,
      });

      await updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        { photoUrl: 'https://example.com/photo.jpg' }
      );

      const updateData = mockDatabases.updateDocument.mock.calls[0][3];
      
      // Verify NO credential fields are present
      for (const credentialField of FIELD_GROUPS.credential) {
        expect(updateData).not.toHaveProperty(credentialField);
      }
    });
  });

  // ============================================================================
  // Generic updateFields Tests
  // ============================================================================

  describe('updateFields', () => {
    it('should update only specified fields', async () => {
      const mockDocument = {
        $id: testAttendeeId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockDocument);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockDocument,
        firstName: 'Jane',
        version: 2,
      });

      await updateFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
        { fields: ['firstName'] }
      );

      const updateData = mockDatabases.updateDocument.mock.calls[0][3];
      
      expect(updateData).toHaveProperty('firstName', 'Jane');
      expect(updateData).not.toHaveProperty('lastName');
      expect(updateData).not.toHaveProperty('email');
    });
  });

  describe('updateFieldGroup', () => {
    it('should update only fields in the specified group', async () => {
      const mockDocument = {
        $id: testAttendeeId,
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: 'https://example.com/photo.jpg',
        credentialUrl: 'https://example.com/credential.pdf',
        version: 1,
      };

      mockDatabases.getDocument.mockResolvedValue(mockDocument);
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockDocument,
        firstName: 'Jane',
        lastName: 'Smith',
        version: 2,
      });

      await updateFieldGroup(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        'profile',
        {
          firstName: 'Jane',
          lastName: 'Smith',
          photoUrl: 'should-be-ignored',
          credentialUrl: 'should-be-ignored',
        }
      );

      const updateData = mockDatabases.updateDocument.mock.calls[0][3];
      
      expect(updateData).toHaveProperty('firstName', 'Jane');
      expect(updateData).toHaveProperty('lastName', 'Smith');
      expect(updateData).not.toHaveProperty('photoUrl');
      expect(updateData).not.toHaveProperty('credentialUrl');
    });
  });
});
