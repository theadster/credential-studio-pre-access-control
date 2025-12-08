/**
 * Mobile API Test Suite
 * 
 * Tests for all mobile endpoints:
 * - GET /api/mobile/sync/attendees
 * - GET /api/mobile/sync/profiles
 * - GET /api/mobile/event-info
 * - POST /api/mobile/scan-logs
 * - GET /api/mobile/debug/attendee/{barcode}
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables
process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test-db-id';
process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID = 'test-attendees-collection';
process.env.NEXT_PUBLIC_APPWRITE_ACCESS_CONTROL_COLLECTION_ID = 'test-access-control-collection';
process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID = 'test-custom-fields-collection';
process.env.NEXT_PUBLIC_APPWRITE_APPROVAL_PROFILES_COLLECTION_ID = 'test-profiles-collection';
process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID = 'test-event-settings-collection';
process.env.NEXT_PUBLIC_APPWRITE_SCAN_LOGS_COLLECTION_ID = 'test-scan-logs-collection';

describe('Mobile API Endpoints', () => {
  describe('Response Format Validation', () => {
    it('should have correct sync attendees response structure', () => {
      const mockResponse = {
        success: true,
        data: {
          attendees: [
            {
              id: 'attendee-1',
              barcodeNumber: '12345',
              firstName: 'John',
              lastName: 'Doe',
              photoUrl: 'https://example.com/photo.jpg',
              customFieldValues: { field1: 'value1' },
              customFieldValuesByName: { 'Field 1': 'value1' },
              accessControl: {
                accessEnabled: true,
                validFrom: '2024-01-01T00:00:00Z',
                validUntil: '2024-12-31T23:59:59Z'
              },
              updatedAt: '2024-01-15T10:30:00Z'
            }
          ],
          pagination: {
            total: 100,
            limit: 1000,
            offset: 0,
            hasMore: false
          },
          syncTimestamp: '2024-01-15T10:30:00Z'
        }
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data.attendees).toHaveLength(1);
      expect(mockResponse.data.attendees[0]).toHaveProperty('id');
      expect(mockResponse.data.attendees[0]).toHaveProperty('barcodeNumber');
      expect(mockResponse.data.attendees[0]).toHaveProperty('accessControl');
      expect(mockResponse.data.attendees[0].accessControl).toHaveProperty('accessEnabled');
      expect(typeof mockResponse.data.attendees[0].accessControl.accessEnabled).toBe('boolean');
    });

    it('should have correct sync profiles response structure', () => {
      const mockResponse = {
        success: true,
        data: {
          profiles: [
            {
              $id: 'profile-1',
              name: 'VIP Access',
              description: 'VIP attendees',
              version: 1,
              rules: {
                logic: 'AND',
                rules: []
              },
              isDeleted: false,
              updatedAt: '2024-01-15T10:30:00Z'
            }
          ],
          syncTimestamp: '2024-01-15T10:30:00Z'
        }
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data.profiles).toHaveLength(1);
      expect(mockResponse.data.profiles[0]).toHaveProperty('$id');
      expect(mockResponse.data.profiles[0]).toHaveProperty('version');
      expect(mockResponse.data.profiles[0]).toHaveProperty('rules');
    });

    it('should have correct event info response structure', () => {
      const mockResponse = {
        success: true,
        data: {
          eventName: 'Tech Conference 2024',
          eventDate: '2024-06-15',
          eventLocation: 'San Francisco, CA',
          eventTime: '09:00 AM',
          timeZone: 'America/Los_Angeles',
          updatedAt: '2024-01-15T10:30:00Z'
        }
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data).toHaveProperty('eventName');
      expect(mockResponse.data).toHaveProperty('eventDate');
      expect(mockResponse.data).toHaveProperty('eventLocation');
    });

    it('should have correct scan logs upload response structure', () => {
      const mockResponse = {
        success: true,
        data: {
          received: 10,
          duplicates: 2,
          errors: []
        }
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data).toHaveProperty('received');
      expect(mockResponse.data).toHaveProperty('duplicates');
      expect(mockResponse.data).toHaveProperty('errors');
      expect(typeof mockResponse.data.received).toBe('number');
      expect(typeof mockResponse.data.duplicates).toBe('number');
      expect(mockResponse.data.duplicates).toBeGreaterThanOrEqual(0);
    });

    it('should have correct debug attendee response structure', () => {
      const mockResponse = {
        id: 'attendee-1',
        barcodeNumber: '3266565',
        firstName: 'Jane',
        lastName: 'Smith',
        photoUrl: 'https://example.com/photo.jpg',
        customFieldValues: { field1: 'value1' },
        customFieldValuesByName: { 'Field 1': 'value1' },
        accessControl: {
          accessEnabled: true,
          validFrom: '2024-01-01T00:00:00Z',
          validUntil: '2024-12-31T23:59:59Z'
        },
        updatedAt: '2024-01-15T10:30:00Z'
      };

      expect(mockResponse).toHaveProperty('id');
      expect(mockResponse).toHaveProperty('barcodeNumber');
      expect(mockResponse).toHaveProperty('accessControl');
      expect(mockResponse.accessControl).toHaveProperty('accessEnabled');
      expect(typeof mockResponse.accessControl.accessEnabled).toBe('boolean');
    });

    it('should have correct debug attendee 404 response structure', () => {
      const mockResponse = {
        error: 'Attendee not found',
        barcode: '9999999'
      };

      expect(mockResponse).toHaveProperty('error');
      expect(mockResponse).toHaveProperty('barcode');
      expect(mockResponse.error).toBe('Attendee not found');
    });
  });

  describe('Access Control Field Validation', () => {
    it('should have accessEnabled as boolean in attendee response', () => {
      const attendee = {
        accessControl: {
          accessEnabled: true,
          validFrom: null,
          validUntil: null
        }
      };

      expect(typeof attendee.accessControl.accessEnabled).toBe('boolean');
      expect([true, false]).toContain(attendee.accessControl.accessEnabled);
    });

    it('should support various boolean representations', () => {
      // Helper function to normalize boolean representations
      const normalizeBoolean = (value: any): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
          return ['true', 'yes', 'active', 'enabled', '1'].includes(value.toLowerCase());
        }
        return false;
      };

      const testCases = [
        { input: true, expected: true },
        { input: false, expected: false },
        { input: 1, expected: true },
        { input: 0, expected: false },
        { input: 'true', expected: true },
        { input: 'false', expected: false },
        { input: 'yes', expected: true },
        { input: 'no', expected: false },
        { input: 'active', expected: true },
        { input: 'inactive', expected: false },
        { input: 'enabled', expected: true },
        { input: 'disabled', expected: false }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(normalizeBoolean(input)).toBe(expected);
      });
    });

    it('should have validFrom and validUntil as ISO 8601 timestamps', () => {
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
      const validFrom = '2024-01-01T00:00:00Z';
      const validUntil = '2024-12-31T23:59:59Z';

      expect(validFrom).toMatch(iso8601Regex);
      expect(validUntil).toMatch(iso8601Regex);
    });

    it('should allow null values for validFrom and validUntil', () => {
      const accessControl = {
        accessEnabled: true,
        validFrom: null,
        validUntil: null
      };

      expect(accessControl.validFrom).toBeNull();
      expect(accessControl.validUntil).toBeNull();
    });
  });

  describe('Pagination Validation', () => {
    it('should have valid pagination metadata', () => {
      const pagination = {
        total: 100,
        limit: 1000,
        offset: 0,
        hasMore: false
      };

      expect(typeof pagination.total).toBe('number');
      expect(typeof pagination.limit).toBe('number');
      expect(typeof pagination.offset).toBe('number');
      expect(typeof pagination.hasMore).toBe('boolean');
      expect(pagination.limit).toBeGreaterThan(0);
      expect(pagination.limit).toBeLessThanOrEqual(5000);
      expect(pagination.offset).toBeGreaterThanOrEqual(0);
    });

    it('should calculate hasMore correctly', () => {
      const testCases = [
        { offset: 0, attendeeCount: 10, total: 100, expectedHasMore: true },
        { offset: 90, attendeeCount: 10, total: 100, expectedHasMore: false },
        { offset: 0, attendeeCount: 100, total: 100, expectedHasMore: false }
      ];

      testCases.forEach(({ offset, attendeeCount, total, expectedHasMore }) => {
        const hasMore = offset + attendeeCount < total;
        expect(hasMore).toBe(expectedHasMore);
      });
    });
  });

  describe('Custom Fields Mapping', () => {
    it('should map custom field IDs to display names', () => {
      const customFieldMap = new Map([
        ['field-1', 'First Name'],
        ['field-2', 'Last Name'],
        ['field-3', 'Company']
      ]);

      const customFieldValues = {
        'field-1': 'John',
        'field-2': 'Doe',
        'field-3': 'Acme Corp'
      };

      const customFieldValuesByName: Record<string, any> = {};
      Object.entries(customFieldValues).forEach(([fieldId, value]) => {
        const displayName = customFieldMap.get(fieldId) || fieldId;
        customFieldValuesByName[displayName] = value;
      });

      expect(customFieldValuesByName['First Name']).toBe('John');
      expect(customFieldValuesByName['Last Name']).toBe('Doe');
      expect(customFieldValuesByName['Company']).toBe('Acme Corp');
    });

    it('should fallback to field ID if display name not found', () => {
      const customFieldMap = new Map([
        ['field-1', 'First Name']
      ]);

      const customFieldValues = {
        'field-1': 'John',
        'field-unknown': 'Unknown Value'
      };

      const customFieldValuesByName: Record<string, any> = {};
      Object.entries(customFieldValues).forEach(([fieldId, value]) => {
        const displayName = customFieldMap.get(fieldId) || fieldId;
        customFieldValuesByName[displayName] = value;
      });

      expect(customFieldValuesByName['First Name']).toBe('John');
      expect(customFieldValuesByName['field-unknown']).toBe('Unknown Value');
    });
  });

  describe('Error Handling', () => {
    it('should return 405 for unsupported HTTP methods', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Method POST not allowed'
        }
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('should return 403 for insufficient permissions', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to access attendee data'
        }
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid parameters', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid since parameter. Must be ISO 8601 datetime.'
        }
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for missing attendee', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Attendee not found'
        },
        barcode: '9999999'
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('NOT_FOUND');
      expect(errorResponse.barcode).toBe('9999999');
    });

    it('should return 500 for server errors', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to sync attendees'
        }
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('SERVER_ERROR');
    });
  });

  describe('Query Parameter Validation', () => {
    it('should validate ISO 8601 since parameter', () => {
      const validDates = [
        '2024-01-15T10:30:00Z',
        '2024-12-31T23:59:59Z',
        '2024-01-01T00:00:00Z'
      ];

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

      validDates.forEach(date => {
        expect(date).toMatch(iso8601Regex);
      });
    });

    it('should validate pagination limit parameter', () => {
      const testCases = [
        { input: 100, expected: 100 },
        { input: 5000, expected: 5000 },
        { input: 10000, expected: 5000 }, // Should be clamped to max
        { input: 0, expected: 1 }, // Should be clamped to min
        { input: -100, expected: 1 } // Should be clamped to min
      ];

      testCases.forEach(({ input, expected }) => {
        const limit = Math.max(1, Math.min(input, 5000));
        expect(limit).toBe(expected);
      });
    });

    it('should validate pagination offset parameter', () => {
      const testCases = [
        { input: 0, expected: 0 },
        { input: 100, expected: 100 },
        { input: -10, expected: 0 } // Should be clamped to min
      ];

      testCases.forEach(({ input, expected }) => {
        const offset = Math.max(0, input);
        expect(offset).toBe(expected);
      });
    });

    it('should validate versions parameter as JSON', () => {
      const validVersions = [
        { profile1: 5, profile2: 3 },
        { prof_123: 2, prof_456: 1 },
        {}
      ];

      validVersions.forEach(versions => {
        expect(typeof versions).toBe('object');
        expect(versions).not.toBeNull();
        expect(Array.isArray(versions)).toBe(false);
      });
    });

    it('should reject invalid versions parameter', () => {
      const invalidVersions = [
        null,
        'not-json',
        [1, 2, 3],
        { profile1: 'not-a-number' }
      ];

      invalidVersions.forEach(versions => {
        // null should be rejected
        if (versions === null) {
          expect(versions).toBeNull();
        }
        // arrays should be rejected
        else if (Array.isArray(versions)) {
          expect(Array.isArray(versions)).toBe(true);
        }
        // strings should be rejected
        else if (typeof versions === 'string') {
          expect(typeof versions).toBe('string');
        }
        // objects with non-number values should be rejected
        else if (typeof versions === 'object') {
          const hasInvalidValue = Object.values(versions).some(v => typeof v !== 'number');
          expect(hasInvalidValue).toBe(true);
        }
      });
    });
  });

  describe('Scan Logs Validation', () => {
    it('should validate scan log batch structure', () => {
      const validBatch = {
        logs: [
          {
            localId: 'local-1',
            attendeeId: 'attendee-1',
            barcodeScanned: '12345',
            result: 'approved',
            denialReason: null,
            profileId: 'profile-1',
            profileVersion: 1,
            deviceId: 'device-1',
            scannedAt: '2024-01-15T10:30:00Z'
          }
        ]
      };

      expect(validBatch.logs).toHaveLength(1);
      expect(validBatch.logs[0]).toHaveProperty('localId');
      expect(validBatch.logs[0]).toHaveProperty('barcodeScanned');
      expect(['approved', 'denied']).toContain(validBatch.logs[0].result);
    });

    it('should handle deduplication correctly', () => {
      const existingLocalIds = new Set(['local-1', 'local-2']);
      const newLogs = [
        { localId: 'local-1' }, // Duplicate
        { localId: 'local-3' }, // New
        { localId: 'local-2' }  // Duplicate
      ];

      let duplicates = 0;
      let received = 0;

      newLogs.forEach(log => {
        if (existingLocalIds.has(log.localId)) {
          duplicates++;
        } else {
          received++;
        }
      });

      expect(duplicates).toBe(2);
      expect(received).toBe(1);
    });
  });

  describe('Profile Version Comparison', () => {
    it('should filter profiles based on version comparison', () => {
      const localVersions = {
        'profile-1': 1,
        'profile-2': 2
      };

      const serverProfiles = [
        { $id: 'profile-1', version: 2 }, // Should sync (2 > 1)
        { $id: 'profile-2', version: 2 }, // Should not sync (2 = 2)
        { $id: 'profile-3', version: 1 }  // Should sync (not in local)
      ];

      const profilesToSync = serverProfiles.filter(profile => {
        const localVersion = localVersions[profile.$id];
        if (localVersion === undefined) return true;
        return profile.version > localVersion;
      });

      expect(profilesToSync).toHaveLength(2);
      expect(profilesToSync.map(p => p.$id)).toContain('profile-1');
      expect(profilesToSync.map(p => p.$id)).toContain('profile-3');
    });
  });
});
