/**
 * Integration Tests: Concurrent Operation Simulation
 * 
 * Tests simultaneous credential generation and photo upload operations
 * to verify that both operations succeed and data persists correctly.
 * 
 * Requirements: 2.1, 3.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Databases } from 'node-appwrite';
import {
  updateCredentialFields,
  updatePhotoFields,
  FIELD_GROUPS,
} from '../../lib/fieldUpdate';
import {
  updateWithLock,
  readWithVersion,
  DEFAULT_LOCK_CONFIG,
} from '../../lib/optimisticLock';
import { mockDatabases, resetAllMocks } from '../../test/mocks/appwrite';

describe('Concurrent Operation Simulation', () => {
  const testDatabaseId = 'test-database';
  const testCollectionId = 'attendees';
  const testAttendeeId = 'attendee-123';

  beforeEach(() => {
    resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Simultaneous Credential Generation and Photo Upload', () => {
    it('should allow both credential and photo updates to succeed on same attendee', async () => {
      // Initial attendee state
      const initialAttendee = {
        $id: testAttendeeId,
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: null,
        photoUploadCount: 0,
        credentialUrl: null,
        credentialCount: 0,
        version: 1,
      };

      // Track version increments
      let currentVersion = 1;

      // Mock getDocument to return current state with updated version
      mockDatabases.getDocument.mockImplementation(() => {
        return Promise.resolve({
          ...initialAttendee,
          version: currentVersion,
        });
      });

      // Mock updateDocument to simulate successful updates
      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        currentVersion++;
        return Promise.resolve({
          ...initialAttendee,
          ...data,
          version: currentVersion,
        });
      });

      // Simulate concurrent operations
      const credentialPromise = updateCredentialFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          credentialUrl: 'https://example.com/credential.pdf',
          credentialGeneratedAt: '2024-01-01T00:00:00.000Z',
        }
      );

      const photoPromise = updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          photoUrl: 'https://example.com/photo.jpg',
        }
      );

      const [credentialResult, photoResult] = await Promise.all([
        credentialPromise,
        photoPromise,
      ]);

      // Both operations should succeed
      expect(credentialResult.success).toBe(true);
      expect(photoResult.success).toBe(true);

      // Verify credential update only included credential fields
      const credentialUpdateCall = mockDatabases.updateDocument.mock.calls.find(
        call => call[3].credentialUrl !== undefined
      );
      expect(credentialUpdateCall).toBeDefined();
      expect(credentialUpdateCall![3]).toHaveProperty('credentialUrl');
      expect(credentialUpdateCall![3]).not.toHaveProperty('photoUrl');

      // Verify photo update only included photo fields
      const photoUpdateCall = mockDatabases.updateDocument.mock.calls.find(
        call => call[3].photoUrl !== undefined
      );
      expect(photoUpdateCall).toBeDefined();
      expect(photoUpdateCall![3]).toHaveProperty('photoUrl');
      expect(photoUpdateCall![3]).not.toHaveProperty('credentialUrl');
    });

    it('should preserve photo data when credential generation runs concurrently', async () => {
      const existingPhotoUrl = 'https://example.com/existing-photo.jpg';
      const existingPhotoCount = 3;

      const attendeeWithPhoto = {
        $id: testAttendeeId,
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: existingPhotoUrl,
        photoUploadCount: existingPhotoCount,
        lastPhotoUploaded: '2024-01-01T00:00:00.000Z',
        credentialUrl: null,
        credentialCount: 0,
        version: 5,
      };

      mockDatabases.getDocument.mockResolvedValue(attendeeWithPhoto);
      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        return Promise.resolve({
          ...attendeeWithPhoto,
          ...data,
          version: attendeeWithPhoto.version + 1,
        });
      });

      // Generate credential
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

      // Verify photo fields were NOT included in the update
      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];

      expect(updateData).not.toHaveProperty('photoUrl');
      expect(updateData).not.toHaveProperty('photoUploadCount');
      expect(updateData).not.toHaveProperty('lastPhotoUploaded');

      // Verify credential fields were updated
      expect(updateData).toHaveProperty('credentialUrl', 'https://example.com/credential.pdf');
    });

    it('should preserve credential data when photo upload runs concurrently', async () => {
      const existingCredentialUrl = 'https://example.com/existing-credential.pdf';
      const existingCredentialCount = 2;

      const attendeeWithCredential = {
        $id: testAttendeeId,
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: null,
        photoUploadCount: 0,
        credentialUrl: existingCredentialUrl,
        credentialCount: existingCredentialCount,
        credentialGeneratedAt: '2024-01-01T00:00:00.000Z',
        lastCredentialGenerated: '2024-01-01T00:00:00.000Z',
        version: 3,
      };

      mockDatabases.getDocument.mockResolvedValue(attendeeWithCredential);
      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        return Promise.resolve({
          ...attendeeWithCredential,
          ...data,
          version: attendeeWithCredential.version + 1,
        });
      });

      // Upload photo
      const result = await updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          photoUrl: 'https://example.com/new-photo.jpg',
        }
      );

      expect(result.success).toBe(true);

      // Verify credential fields were NOT included in the update
      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];

      expect(updateData).not.toHaveProperty('credentialUrl');
      expect(updateData).not.toHaveProperty('credentialCount');
      expect(updateData).not.toHaveProperty('credentialGeneratedAt');
      expect(updateData).not.toHaveProperty('lastCredentialGenerated');

      // Verify photo fields were updated
      expect(updateData).toHaveProperty('photoUrl', 'https://example.com/new-photo.jpg');
    });
  });

  describe('Multiple Concurrent Photo Uploads to Same Attendee', () => {
    it('should handle multiple concurrent photo uploads with retry', async () => {
      const initialAttendee = {
        $id: testAttendeeId,
        photoUrl: null,
        photoUploadCount: 0,
        version: 1,
      };

      let currentVersion = 1;
      let updateCallCount = 0;

      mockDatabases.getDocument.mockImplementation(() => {
        return Promise.resolve({
          ...initialAttendee,
          version: currentVersion,
        });
      });

      // Simulate version conflicts on first attempts, then success
      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        updateCallCount++;
        
        // First two calls conflict, third succeeds
        if (updateCallCount <= 2) {
          const error = { code: 409, message: 'Document conflict' };
          return Promise.reject(error);
        }
        
        currentVersion++;
        return Promise.resolve({
          ...initialAttendee,
          ...data,
          version: currentVersion,
        });
      });

      // Start photo upload with retry
      const resultPromise = updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        {
          photoUrl: 'https://example.com/photo1.jpg',
        }
      );

      // Run all pending timers to allow retries to complete
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.retriesUsed).toBeGreaterThan(0);
    });

    it('should allow concurrent photo uploads with last-write-wins behavior', async () => {
      const initialAttendee = {
        $id: testAttendeeId,
        photoUrl: null,
        photoUploadCount: 0,
        version: 1,
      };

      let currentVersion = 1;
      const photoUrls: string[] = [];

      mockDatabases.getDocument.mockImplementation(() => {
        return Promise.resolve({
          ...initialAttendee,
          version: currentVersion,
        });
      });

      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        currentVersion++;
        if (data.photoUrl) {
          photoUrls.push(data.photoUrl);
        }
        return Promise.resolve({
          ...initialAttendee,
          ...data,
          version: currentVersion,
        });
      });

      // Simulate two concurrent photo uploads
      const photo1Promise = updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        { photoUrl: 'https://example.com/photo1.jpg' }
      );

      const photo2Promise = updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        { photoUrl: 'https://example.com/photo2.jpg' }
      );

      const [result1, result2] = await Promise.all([photo1Promise, photo2Promise]);

      // Both should succeed (field-specific updates don't conflict with each other
      // when they're updating the same field group - they just overwrite)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Both photo URLs should have been written
      expect(photoUrls).toHaveLength(2);
    });
  });

  describe('Version Increment Verification', () => {
    it('should increment version on each successful update', async () => {
      const initialAttendee = {
        $id: testAttendeeId,
        firstName: 'John',
        version: 5,
      };

      mockDatabases.getDocument.mockResolvedValue(initialAttendee);
      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        return Promise.resolve({
          ...initialAttendee,
          ...data,
        });
      });

      await updateCredentialFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        { credentialUrl: 'https://example.com/credential.pdf' }
      );

      // Verify version was incremented in the update
      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];

      expect(updateData.version).toBe(6); // 5 + 1
    });

    it('should handle version starting from 0 for new records', async () => {
      const newAttendee = {
        $id: testAttendeeId,
        firstName: 'John',
        // No version field - should default to 0
      };

      mockDatabases.getDocument.mockResolvedValue(newAttendee);
      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        return Promise.resolve({
          ...newAttendee,
          ...data,
        });
      });

      await updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        testAttendeeId,
        { photoUrl: 'https://example.com/photo.jpg' }
      );

      // Verify version was set to 1 (0 + 1)
      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      const updateData = updateCall[3];

      expect(updateData.version).toBe(1);
    });
  });

  describe('Field Group Isolation Verification', () => {
    it('should verify credential and photo field groups have no overlap', () => {
      const credentialFields = new Set(FIELD_GROUPS.credential);
      const photoFields = new Set(FIELD_GROUPS.photo);

      // Check for any overlap
      for (const field of credentialFields) {
        expect(photoFields.has(field)).toBe(false);
      }

      for (const field of photoFields) {
        expect(credentialFields.has(field)).toBe(false);
      }
    });

    it('should verify profile fields are separate from credential and photo', () => {
      const profileFields = new Set(FIELD_GROUPS.profile);
      const credentialFields = new Set(FIELD_GROUPS.credential);
      const photoFields = new Set(FIELD_GROUPS.photo);

      for (const field of profileFields) {
        expect(credentialFields.has(field)).toBe(false);
        expect(photoFields.has(field)).toBe(false);
      }
    });
  });
});
