/**
 * Photo Tracking Integration Tests
 * 
 * Tests atomic photo upload count tracking using Appwrite database operators.
 * Verifies that photoUploadCount is correctly incremented/decremented when photos
 * are added or removed from attendee records.
 * 
 * Requirements tested:
 * - 5.1: Photo upload increments count atomically
 * - 5.2: Photo delete decrements count atomically
 * - 5.4: Concurrent photo operations maintain accurate counts
 * - 9.3: Integration tests verify end-to-end functionality
 * - 9.4: Concurrent operation testing
 * 
 * NOTE: This test requires a live Appwrite instance and will use the real database.
 * Make sure you have proper credentials in .env.local before running.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createAdminClient } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load real environment variables from .env.local for integration tests
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  Object.keys(envConfig).forEach(key => {
    process.env[key] = envConfig[key];
  });
}

const TEST_PREFIX = 'photo-tracking-test';
const CONCURRENT_TEST_COUNT = 5;

describe('Photo Tracking with Operators', () => {
  let databases: any;
  let dbId: string;
  let attendeesCollectionId: string;
  let testAttendeeIds: string[] = [];

  beforeAll(async () => {
    const { databases: db } = createAdminClient();
    databases = db;
    dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;

    if (!dbId || !attendeesCollectionId) {
      throw new Error('Missing required environment variables for testing');
    }
  });

  beforeEach(() => {
    testAttendeeIds = [];
  });

  afterAll(async () => {
    // Cleanup: Delete all test attendees
    if (testAttendeeIds.length > 0) {
      console.log(`Cleaning up ${testAttendeeIds.length} test attendees...`);
      for (const id of testAttendeeIds) {
        try {
          await databases.deleteDocument(dbId, attendeesCollectionId, id);
        } catch (error) {
          console.error(`Failed to delete test attendee ${id}:`, error);
        }
      }
    }

    // Also cleanup any attendees with test prefix that might have been missed
    try {
      const testAttendees = await databases.listDocuments(
        dbId,
        attendeesCollectionId,
        [Query.startsWith('barcodeNumber', TEST_PREFIX)]
      );

      for (const attendee of testAttendees.documents) {
        try {
          await databases.deleteDocument(dbId, attendeesCollectionId, attendee.$id);
        } catch (error) {
          console.error(`Failed to cleanup attendee ${attendee.$id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup test attendees:', error);
    }
  });

  /**
   * Helper function to create a test attendee
   */
  async function createTestAttendee(overrides: any = {}) {
    const attendeeData = {
      firstName: 'Photo',
      lastName: 'Test',
      barcodeNumber: `${TEST_PREFIX}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      notes: '',
      photoUrl: null,
      photoUploadCount: 0,
      customFieldValues: JSON.stringify({}),
      ...overrides
    };

    const attendee = await databases.createDocument(
      dbId,
      attendeesCollectionId,
      ID.unique(),
      attendeeData
    );

    testAttendeeIds.push(attendee.$id);
    return attendee;
  }

  /**
   * Helper function to update attendee photo through the API
   * This tests the full integration including operator application
   */
  async function updateAttendeePhoto(attendeeId: string, photoUrl: string | null) {
    // Import operators to apply them directly since we're testing database-level functionality
    const { createIncrement, createDecrement, dateOperators } = await import('@/lib/operators');
    
    // Get current attendee state
    const current = await databases.getDocument(dbId, attendeesCollectionId, attendeeId);
    const hadPhoto = current.photoUrl && current.photoUrl !== '';
    const hasPhoto = photoUrl && photoUrl !== '';
    
    const updateData: any = { photoUrl };
    
    // Apply operators based on photo state change
    if (hasPhoto && !hadPhoto) {
      // Photo was added - increment count
      updateData.photoUploadCount = createIncrement(1);
      updateData.lastPhotoUploaded = dateOperators.setNow();
    } else if (!hasPhoto && hadPhoto) {
      // Photo was removed - decrement count (with min bound of 0)
      updateData.photoUploadCount = createDecrement(1, { min: 0 });
    }
    
    return await databases.updateDocument(
      dbId,
      attendeesCollectionId,
      attendeeId,
      updateData
    );
  }

  it('should increment photoUploadCount when photo is uploaded', async () => {
    // Create attendee without photo
    const attendee = await createTestAttendee();
    expect(attendee.photoUploadCount).toBe(0);
    expect(attendee.photoUrl).toBeNull();

    // Upload photo
    const photoUrl = 'https://example.com/photo1.jpg';
    const updated = await updateAttendeePhoto(attendee.$id, photoUrl);

    // Verify count incremented
    expect(updated.photoUploadCount).toBe(1);
    expect(updated.photoUrl).toBe(photoUrl);
    expect(updated.lastPhotoUploaded).toBeDefined();
  });

  it('should decrement photoUploadCount when photo is deleted', async () => {
    // Create attendee with photo
    const attendee = await createTestAttendee({
      photoUrl: 'https://example.com/photo1.jpg',
      photoUploadCount: 1
    });

    expect(attendee.photoUploadCount).toBe(1);
    expect(attendee.photoUrl).toBe('https://example.com/photo1.jpg');

    // Delete photo
    const updated = await updateAttendeePhoto(attendee.$id, null);

    // Verify count decremented
    expect(updated.photoUploadCount).toBe(0);
    expect(updated.photoUrl).toBeNull();
  });

  it('should not go below 0 when decrementing photoUploadCount', async () => {
    // Create attendee without photo (count = 0)
    const attendee = await createTestAttendee();
    expect(attendee.photoUploadCount).toBe(0);

    // Try to delete photo (should not go negative)
    const updated = await updateAttendeePhoto(attendee.$id, null);

    // Verify count stays at 0
    expect(updated.photoUploadCount).toBe(0);
  });

  it('should not change count when replacing photo URL', async () => {
    // Create attendee with photo
    const attendee = await createTestAttendee({
      photoUrl: 'https://example.com/photo1.jpg',
      photoUploadCount: 1
    });

    expect(attendee.photoUploadCount).toBe(1);

    // Replace with different photo URL
    const newPhotoUrl = 'https://example.com/photo2.jpg';
    const updated = await updateAttendeePhoto(attendee.$id, newPhotoUrl);

    // Verify count unchanged (still has photo, just different URL)
    expect(updated.photoUploadCount).toBe(1);
    expect(updated.photoUrl).toBe(newPhotoUrl);
  });

  it('should handle multiple photo uploads correctly', async () => {
    // Create attendee without photo
    const attendee = await createTestAttendee();
    expect(attendee.photoUploadCount).toBe(0);

    // Upload photo 1
    let updated = await updateAttendeePhoto(attendee.$id, 'https://example.com/photo1.jpg');
    expect(updated.photoUploadCount).toBe(1);

    // Delete photo
    updated = await updateAttendeePhoto(attendee.$id, null);
    expect(updated.photoUploadCount).toBe(0);

    // Upload photo 2
    updated = await updateAttendeePhoto(attendee.$id, 'https://example.com/photo2.jpg');
    expect(updated.photoUploadCount).toBe(1);

    // Delete photo
    updated = await updateAttendeePhoto(attendee.$id, null);
    expect(updated.photoUploadCount).toBe(0);

    // Upload photo 3
    updated = await updateAttendeePhoto(attendee.$id, 'https://example.com/photo3.jpg');
    expect(updated.photoUploadCount).toBe(1);
  });

  it('should maintain accurate counts under concurrent photo operations', async () => {
    // Create multiple attendees
    const attendees = await Promise.all(
      Array.from({ length: CONCURRENT_TEST_COUNT }, () => createTestAttendee())
    );

    // Concurrently upload photos to all attendees
    await Promise.all(
      attendees.map((attendee, index) =>
        updateAttendeePhoto(attendee.$id, `https://example.com/photo${index}.jpg`)
      )
    );

    // Verify all counts incremented correctly
    const updatedAttendees = await Promise.all(
      attendees.map(attendee =>
        databases.getDocument(dbId, attendeesCollectionId, attendee.$id)
      )
    );

    updatedAttendees.forEach((attendee, index) => {
      expect(attendee.photoUploadCount).toBe(1);
      expect(attendee.photoUrl).toBe(`https://example.com/photo${index}.jpg`);
    });

    // Concurrently delete photos from all attendees
    await Promise.all(
      attendees.map(attendee => updateAttendeePhoto(attendee.$id, null))
    );

    // Verify all counts decremented correctly
    const finalAttendees = await Promise.all(
      attendees.map(attendee =>
        databases.getDocument(dbId, attendeesCollectionId, attendee.$id)
      )
    );

    finalAttendees.forEach(attendee => {
      expect(attendee.photoUploadCount).toBe(0);
      expect(attendee.photoUrl).toBeNull();
    });
  });

  it('should set lastPhotoUploaded timestamp when photo is uploaded', async () => {
    // Create attendee without photo
    const attendee = await createTestAttendee();
    // Appwrite returns null for undefined fields
    expect(attendee.lastPhotoUploaded).toBeNull();

    // Upload photo
    const beforeUpload = new Date();
    const updated = await updateAttendeePhoto(attendee.$id, 'https://example.com/photo.jpg');
    const afterUpload = new Date();
    // Add 1 second buffer for server-side timestamp generation
    afterUpload.setSeconds(afterUpload.getSeconds() + 1);

    // Verify timestamp was set
    expect(updated.lastPhotoUploaded).toBeDefined();
    const uploadTime = new Date(updated.lastPhotoUploaded);
    expect(uploadTime.getTime()).toBeGreaterThanOrEqual(beforeUpload.getTime());
    expect(uploadTime.getTime()).toBeLessThanOrEqual(afterUpload.getTime());
  });

  it('should not update lastPhotoUploaded when photo is deleted', async () => {
    // Create attendee with photo
    const attendee = await createTestAttendee({
      photoUrl: 'https://example.com/photo.jpg',
      photoUploadCount: 1,
      lastPhotoUploaded: new Date().toISOString()
    });

    const originalTimestamp = attendee.lastPhotoUploaded;

    // Delete photo
    const updated = await updateAttendeePhoto(attendee.$id, null);

    // Verify timestamp unchanged
    expect(updated.lastPhotoUploaded).toBe(originalTimestamp);
  });

  it('should handle empty string as photo deletion', async () => {
    // Create attendee with photo
    const attendee = await createTestAttendee({
      photoUrl: 'https://example.com/photo.jpg',
      photoUploadCount: 1
    });

    // Delete photo using empty string
    const updated = await updateAttendeePhoto(attendee.$id, '');

    // Verify count decremented
    expect(updated.photoUploadCount).toBe(0);
    expect(updated.photoUrl).toBe('');
  });
});
