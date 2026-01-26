/**
 * Integration Tests: Bulk Operation Isolation
 * 
 * Tests that bulk credential generation (100+ attendees) with concurrent
 * photo uploads maintains data integrity and no photo data is lost.
 * 
 * Requirements: 3.1, 3.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Databases } from 'node-appwrite';
import {
  updateCredentialFields,
  updatePhotoFields,
  FIELD_GROUPS,
} from '../../lib/fieldUpdate';
import { mockDatabases, resetAllMocks } from '../../test/mocks/appwrite';

describe('Bulk Operation Isolation', () => {
  const testDatabaseId = 'test-database';
  const testCollectionId = 'attendees';

  beforeEach(() => {
    resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper to create mock attendees with optional photos
   */
  function createMockAttendees(count: number, withPhotos: boolean = false): Record<string, any>[] {
    return Array.from({ length: count }, (_, i) => ({
      $id: `attendee-${i + 1}`,
      firstName: `First${i + 1}`,
      lastName: `Last${i + 1}`,
      barcodeNumber: `BC${String(i + 1).padStart(5, '0')}`,
      photoUrl: withPhotos ? `https://example.com/photo-${i + 1}.jpg` : null,
      photoUploadCount: withPhotos ? 1 : 0,
      lastPhotoUploaded: withPhotos ? '2024-01-01T00:00:00.000Z' : null,
      credentialUrl: null,
      credentialCount: 0,
      credentialGeneratedAt: null,
      lastCredentialGenerated: null,
      version: 1,
    }));
  }

  describe('Bulk Credential Generation with Existing Photos', () => {
    it('should not overwrite photos during bulk credential generation (100+ attendees)', async () => {
      const attendeeCount = 112; // Matches the user's reported scenario
      const attendees = createMockAttendees(attendeeCount, true);
      const originalPhotos = attendees.map(a => a.photoUrl);

      // Track all updates
      const updates: Record<string, any>[] = [];

      // Mock getDocument to return the correct attendee
      mockDatabases.getDocument.mockImplementation((dbId, collId, docId) => {
        const attendee = attendees.find(a => a.$id === docId);
        return Promise.resolve(attendee || { $id: docId, version: 1 });
      });

      // Mock updateDocument to track updates
      mockDatabases.updateDocument.mockImplementation((dbIdOrParams: any, collId?: any, docId?: any, data?: any) => {
        // Handle both positional and object parameter styles
        let databaseId: string;
        let collectionId: string;
        let documentId: string;
        let updateData: any;

        if (typeof dbIdOrParams === 'object' && dbIdOrParams !== null) {
          // Object-style: { databaseId, collectionId, documentId, data }
          databaseId = dbIdOrParams.databaseId;
          collectionId = dbIdOrParams.collectionId;
          documentId = dbIdOrParams.documentId;
          updateData = dbIdOrParams.data;
        } else {
          // Positional style: (dbId, collId, docId, data)
          databaseId = dbIdOrParams;
          collectionId = collId;
          documentId = docId;
          updateData = data;
        }

        updates.push({ docId: documentId, data: updateData });
        const attendee = attendees.find(a => a.$id === documentId);
        return Promise.resolve({
          ...attendee,
          ...updateData,
          version: (attendee?.version || 0) + 1,
        });
      });

      // Simulate bulk credential generation for all attendees
      const credentialPromises = attendees.map(attendee =>
        updateCredentialFields(
          mockDatabases as unknown as Databases,
          testDatabaseId,
          testCollectionId,
          attendee.$id,
          {
            credentialUrl: `https://example.com/credential-${attendee.$id}.pdf`,
            credentialGeneratedAt: new Date().toISOString(),
          }
        )
      );

      const results = await Promise.all(credentialPromises);

      // All credential generations should succeed
      expect(results.every(r => r.success)).toBe(true);
      expect(results.length).toBe(attendeeCount);

      // Verify NO photo fields were included in ANY update
      for (const update of updates) {
        expect(update.data).not.toHaveProperty('photoUrl');
        expect(update.data).not.toHaveProperty('photoUploadCount');
        expect(update.data).not.toHaveProperty('lastPhotoUploaded');
      }

      // Verify credential fields WERE updated
      for (const update of updates) {
        expect(update.data).toHaveProperty('credentialUrl');
      }

      // Verify photos remain unchanged after bulk credential generation
      for (let i = 0; i < attendees.length; i++) {
        expect(attendees[i].photoUrl).toBe(originalPhotos[i]);
      }
    });

    it('should preserve photo data when concurrent photo upload happens during bulk generation', async () => {
      const attendeeCount = 50;
      const attendees = createMockAttendees(attendeeCount, true);
      
      // Track updates per attendee
      const updatesByAttendee: Record<string, any[]> = {};

      mockDatabases.getDocument.mockImplementation((dbId, collId, docId) => {
        const attendee = attendees.find(a => a.$id === docId);
        return Promise.resolve(attendee || { $id: docId, version: 1 });
      });

      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        if (!updatesByAttendee[docId]) {
          updatesByAttendee[docId] = [];
        }
        updatesByAttendee[docId].push(data);
        
        const attendee = attendees.find(a => a.$id === docId);
        return Promise.resolve({
          ...attendee,
          ...data,
          version: (attendee?.version || 0) + 1,
        });
      });

      // Start bulk credential generation
      const credentialPromises = attendees.map(attendee =>
        updateCredentialFields(
          mockDatabases as unknown as Databases,
          testDatabaseId,
          testCollectionId,
          attendee.$id,
          { credentialUrl: `https://example.com/credential-${attendee.$id}.pdf` }
        )
      );

      // Simultaneously upload a photo to one of the attendees
      const targetAttendeeId = 'attendee-25';
      const newPhotoUrl = 'https://example.com/new-photo-during-bulk.jpg';
      
      const photoPromise = updatePhotoFields(
        mockDatabases as unknown as Databases,
        testDatabaseId,
        testCollectionId,
        targetAttendeeId,
        { photoUrl: newPhotoUrl }
      );

      // Wait for all operations
      const [credentialResults, photoResult] = await Promise.all([
        Promise.all(credentialPromises),
        photoPromise,
      ]);

      // All operations should succeed
      expect(credentialResults.every(r => r.success)).toBe(true);
      expect(photoResult.success).toBe(true);

      // Verify the photo update for target attendee only included photo fields
      const targetUpdates = updatesByAttendee[targetAttendeeId];
      expect(targetUpdates).toBeDefined();
      expect(targetUpdates.length).toBeGreaterThan(0);
      
      const photoUpdate = targetUpdates.find(u => u.photoUrl !== undefined);
      
      expect(photoUpdate).toBeDefined();
      if (!photoUpdate) {
        throw new Error('Photo update not found for target attendee');
      }
      expect(photoUpdate).toHaveProperty('photoUrl', newPhotoUrl);
      expect(photoUpdate).not.toHaveProperty('credentialUrl');

      // Verify credential updates for target attendee don't touch photo fields
      const credentialUpdate = targetUpdates.find(u => u.credentialUrl !== undefined);
      expect(credentialUpdate).toBeDefined();
      if (!credentialUpdate) {
        throw new Error('Credential update not found for target attendee');
      }
      expect(credentialUpdate).toHaveProperty('credentialUrl');
      expect(credentialUpdate).not.toHaveProperty('photoUrl');
      expect(credentialUpdate).not.toHaveProperty('photoUploadCount');
      expect(credentialUpdate).not.toHaveProperty('lastPhotoUploaded');
    });
  });

  describe('Field Isolation During Bulk Operations', () => {
    it('should only modify credential-specific fields during bulk credential generation', async () => {
      const attendeeCount = 20;
      const attendees = createMockAttendees(attendeeCount, true);
      
      // Add custom field values to attendees
      attendees.forEach((a, i) => {
        a.customFieldValues = JSON.stringify({ field1: `value${i}` });
        a.notes = `Notes for attendee ${i}`;
      });

      const allUpdateData: any[] = [];

      mockDatabases.getDocument.mockImplementation((dbId, collId, docId) => {
        const attendee = attendees.find(a => a.$id === docId);
        return Promise.resolve(attendee);
      });

      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        allUpdateData.push(data);
        const attendee = attendees.find(a => a.$id === docId);
        return Promise.resolve({ ...attendee, ...data });
      });

      // Run bulk credential generation
      const promises = attendees.map(a =>
        updateCredentialFields(
          mockDatabases as unknown as Databases,
          testDatabaseId,
          testCollectionId,
          a.$id,
          { credentialUrl: `https://example.com/cred-${a.$id}.pdf` }
        )
      );

      await Promise.all(promises);

      // Verify each update only contains credential fields + version
      const credentialFieldSet = new Set([...FIELD_GROUPS.credential, 'version']);
      
      for (const updateData of allUpdateData) {
        const updateFields = Object.keys(updateData);
        
        for (const field of updateFields) {
          expect(credentialFieldSet.has(field)).toBe(true);
        }

        // Explicitly verify non-credential fields are NOT present
        expect(updateData).not.toHaveProperty('photoUrl');
        expect(updateData).not.toHaveProperty('firstName');
        expect(updateData).not.toHaveProperty('lastName');
        expect(updateData).not.toHaveProperty('customFieldValues');
        expect(updateData).not.toHaveProperty('notes');
      }
    });

    it('should only modify photo-specific fields during bulk photo operations', async () => {
      const attendeeCount = 20;
      const attendees = createMockAttendees(attendeeCount, false);
      
      // Add credentials to attendees
      attendees.forEach((a, i) => {
        a.credentialUrl = `https://example.com/existing-cred-${i}.pdf`;
        a.credentialCount = 1;
      });

      const allUpdateData: any[] = [];

      mockDatabases.getDocument.mockImplementation((dbId, collId, docId) => {
        const attendee = attendees.find(a => a.$id === docId);
        return Promise.resolve(attendee);
      });

      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        allUpdateData.push(data);
        const attendee = attendees.find(a => a.$id === docId);
        return Promise.resolve({ ...attendee, ...data });
      });

      // Run bulk photo uploads
      const promises = attendees.map(a =>
        updatePhotoFields(
          mockDatabases as unknown as Databases,
          testDatabaseId,
          testCollectionId,
          a.$id,
          { photoUrl: `https://example.com/photo-${a.$id}.jpg` }
        )
      );

      await Promise.all(promises);

      // Verify each update only contains photo fields + version
      const photoFieldSet = new Set([...FIELD_GROUPS.photo, 'version']);
      
      for (const updateData of allUpdateData) {
        const updateFields = Object.keys(updateData);
        
        for (const field of updateFields) {
          expect(photoFieldSet.has(field)).toBe(true);
        }

        // Explicitly verify non-photo fields are NOT present
        expect(updateData).not.toHaveProperty('credentialUrl');
        expect(updateData).not.toHaveProperty('credentialCount');
        expect(updateData).not.toHaveProperty('firstName');
        expect(updateData).not.toHaveProperty('customFieldValues');
      }
    });
  });

  describe('Data Integrity Verification', () => {
    it('should maintain data integrity across 100+ concurrent operations', async () => {
      const attendeeCount = 100;
      const attendees = createMockAttendees(attendeeCount, true);
      
      // Store final state for each attendee
      const finalStates: Record<string, any> = {};
      attendees.forEach(a => {
        finalStates[a.$id] = { ...a };
      });

      mockDatabases.getDocument.mockImplementation((dbId, collId, docId) => {
        return Promise.resolve(finalStates[docId] || { $id: docId, version: 1 });
      });

      mockDatabases.updateDocument.mockImplementation((dbId, collId, docId, data) => {
        // Merge only the provided fields (simulating Appwrite behavior)
        finalStates[docId] = {
          ...finalStates[docId],
          ...data,
        };
        return Promise.resolve(finalStates[docId]);
      });

      // Generate credentials for all attendees
      const credentialPromises = attendees.map(a =>
        updateCredentialFields(
          mockDatabases as unknown as Databases,
          testDatabaseId,
          testCollectionId,
          a.$id,
          { credentialUrl: `https://example.com/cred-${a.$id}.pdf` }
        )
      );

      await Promise.all(credentialPromises);

      // Verify all attendees still have their original photos
      for (const attendee of attendees) {
        const finalState = finalStates[attendee.$id];
        
        // Photo should be preserved
        expect(finalState.photoUrl).toBe(attendee.photoUrl);
        expect(finalState.photoUploadCount).toBe(attendee.photoUploadCount);
        
        // Credential should be updated
        expect(finalState.credentialUrl).toBe(`https://example.com/cred-${attendee.$id}.pdf`);
        
        // Profile data should be preserved
        expect(finalState.firstName).toBe(attendee.firstName);
        expect(finalState.lastName).toBe(attendee.lastName);
      }
    });

    it('should not lose any photo data during high-volume bulk operations', async () => {
      const attendeeCount = 150;
      const attendeesWithPhotos = createMockAttendees(attendeeCount, true);
      
      // Track which photos were "lost" (overwritten with null or different value)
      const photoStates: Record<string, string | null> = {};
      attendeesWithPhotos.forEach(a => {
        photoStates[a.$id] = a.photoUrl;
      });

      mockDatabases.getDocument.mockImplementation((dbIdOrParams: any, collId?: any, docId?: any) => {
        // Handle both positional and object-style arguments
        let documentId: string;
        
        if (typeof dbIdOrParams === 'string') {
          // Positional style: (dbId, collId, docId)
          documentId = docId;
        } else {
          // Object-style: { databaseId, collectionId, documentId }
          documentId = dbIdOrParams.documentId;
        }
        
        const attendee = attendeesWithPhotos.find(a => a.$id === documentId);
        return Promise.resolve({
          ...(attendee || { $id: documentId }),
          photoUrl: photoStates[documentId],
        });
      });

      mockDatabases.updateDocument.mockImplementation((dbIdOrParams: any, collId?: any, docId?: any, data?: any) => {
        // Handle both positional and object-style arguments
        let documentId: string;
        let updateData: any;
        
        if (typeof dbIdOrParams === 'string') {
          // Positional style: (dbId, collId, docId, data)
          documentId = docId;
          updateData = data;
        } else {
          // Object-style: { databaseId, collectionId, documentId, data }
          documentId = dbIdOrParams.documentId;
          updateData = dbIdOrParams.data;
        }
        
        // If photoUrl is in the update data, track it
        if ('photoUrl' in updateData) {
          photoStates[documentId] = updateData.photoUrl;
        }
        
        const attendee = attendeesWithPhotos.find(a => a.$id === documentId);
        return Promise.resolve({
          ...(attendee || { $id: documentId }),
          ...updateData,
          photoUrl: photoStates[documentId],
        });
      });

      // Run bulk credential generation
      const promises = attendeesWithPhotos.map(a =>
        updateCredentialFields(
          mockDatabases as unknown as Databases,
          testDatabaseId,
          testCollectionId,
          a.$id,
          { credentialUrl: `https://example.com/cred-${a.$id}.pdf` }
        )
      );

      await Promise.all(promises);

      // Verify NO photos were lost
      let lostPhotoCount = 0;
      for (const attendee of attendeesWithPhotos) {
        if (photoStates[attendee.$id] !== attendee.photoUrl) {
          lostPhotoCount++;
        }
      }

      expect(lostPhotoCount).toBe(0);
    });
  });

  describe('Concurrent Bulk Operations', () => {
    it('should handle bulk credentials and bulk photos running simultaneously', async () => {
      const attendeeCount = 30;
      const attendees = createMockAttendees(attendeeCount, false);
      
      const updateLog: { docId: string; type: 'credential' | 'photo' | 'violation'; data: any }[] = [];

      mockDatabases.getDocument.mockImplementation((dbId, collId, docId) => {
        const attendee = attendees.find(a => a.$id === docId);
        return Promise.resolve(attendee);
      });

      mockDatabases.updateDocument.mockImplementation((dbIdOrParams: any, collId?: any, docId?: any, data?: any) => {
        // Handle both positional and object parameter styles
        let databaseId: string;
        let collectionId: string;
        let documentId: string;
        let updateData: any;

        if (typeof dbIdOrParams === 'object' && dbIdOrParams !== null) {
          // Object-style: { databaseId, collectionId, documentId, data }
          databaseId = dbIdOrParams.databaseId;
          collectionId = dbIdOrParams.collectionId;
          documentId = dbIdOrParams.documentId;
          updateData = dbIdOrParams.data;
        } else {
          // Positional style: (dbId, collId, docId, data)
          databaseId = dbIdOrParams;
          collectionId = collId;
          documentId = docId;
          updateData = data;
        }

        const hasCredential = 'credentialUrl' in updateData;
        const hasPhoto = 'photoUrl' in updateData;
        const type = hasCredential && hasPhoto ? 'violation' : hasCredential ? 'credential' : 'photo';
        updateLog.push({ docId: documentId, type: type as 'credential' | 'photo' | 'violation', data: updateData });
        
        const attendee = attendees.find(a => a.$id === documentId);
        return Promise.resolve({ ...attendee, ...updateData });
      });

      // Start both bulk operations simultaneously
      const credentialPromises = attendees.map(a =>
        updateCredentialFields(
          mockDatabases as unknown as Databases,
          testDatabaseId,
          testCollectionId,
          a.$id,
          { credentialUrl: `https://example.com/cred-${a.$id}.pdf` }
        )
      );

      const photoPromises = attendees.map(a =>
        updatePhotoFields(
          mockDatabases as unknown as Databases,
          testDatabaseId,
          testCollectionId,
          a.$id,
          { photoUrl: `https://example.com/photo-${a.$id}.jpg` }
        )
      );

      const [credentialResults, photoResults] = await Promise.all([
        Promise.all(credentialPromises),
        Promise.all(photoPromises),
      ]);

      // All operations should succeed
      expect(credentialResults.every(r => r.success)).toBe(true);
      expect(photoResults.every(r => r.success)).toBe(true);

      // Verify no field isolation violations occurred
      const violations = updateLog.filter(l => l.type === 'violation');
      expect(violations).toHaveLength(0);

      // Verify field isolation in all updates
      for (const log of updateLog) {
        if (log.type === 'credential') {
          expect(log.data).not.toHaveProperty('photoUrl');
        } else if (log.type === 'photo') {
          expect(log.data).not.toHaveProperty('credentialUrl');
        }
      }

      // Each attendee should have both credential and photo updates
      const credentialUpdates = updateLog.filter(l => l.type === 'credential');
      const photoUpdates = updateLog.filter(l => l.type === 'photo');

      expect(credentialUpdates.length).toBe(attendeeCount);
      expect(photoUpdates.length).toBe(attendeeCount);
    });
  });
});
