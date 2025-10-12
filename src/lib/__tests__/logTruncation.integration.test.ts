import { describe, it, expect } from 'vitest';
import { truncateLogDetails } from '../logTruncation';

/**
 * Integration tests for log truncation in real-world bulk operation scenarios
 * These tests simulate actual usage patterns from bulk-delete.ts and similar endpoints
 */
describe('logTruncation - Integration Tests', () => {
  describe('Bulk delete scenarios', () => {
    it('should handle small bulk delete (10 attendees) without truncation', () => {
      // Simulate createBulkAttendeeLogDetails output for 10 attendees
      const logDetails = {
        action: 'bulk_delete',
        count: 10,
        names: Array.from({ length: 10 }, (_, i) => `Attendee ${i} Full Name`),
        totalRequested: 10,
        successCount: 10,
        errorCount: 0,
        deletedIds: Array.from({ length: 10 }, (_, i) => `attendee-id-${i}`),
        attendees: Array.from({ length: 10 }, (_, i) => ({
          id: `attendee-id-${i}`,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          barcodeNumber: `BC${i}`
        }))
      };

      const result = truncateLogDetails(logDetails, 9500);

      expect(result.wasTruncated).toBe(false);
      expect(result.truncationLevel).toBe('none');
      
      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.attendees).toHaveLength(10);
      expect(parsed.names).toHaveLength(10);
      expect(parsed.deletedIds).toHaveLength(10);
    });

    it('should handle medium bulk delete (50 attendees) with partial truncation', () => {
      const logDetails = {
        action: 'bulk_delete',
        count: 50,
        names: Array.from({ length: 50 }, (_, i) => `Attendee ${i} Full Name`),
        totalRequested: 50,
        successCount: 50,
        errorCount: 0,
        deletedIds: Array.from({ length: 50 }, (_, i) => `attendee-id-${i}`),
        attendees: Array.from({ length: 50 }, (_, i) => ({
          id: `attendee-id-${i}`,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          barcodeNumber: `BC${i}`,
          email: `attendee${i}@example.com`,
          phone: `555-000${i}`,
          company: `Company ${i}`,
          title: `Title ${i}`
        }))
      };

      const result = truncateLogDetails(logDetails, 9500);

      expect(result.truncatedDetails.length).toBeLessThanOrEqual(9500);
      
      const parsed = JSON.parse(result.truncatedDetails);
      
      // Should have truncated attendees array
      expect(parsed.attendees).toBeUndefined();
      expect(parsed.note).toContain('truncated');
      
      // Should preserve summary data
      expect(parsed.successCount).toBe(50);
      expect(parsed.totalRequested).toBe(50);
      expect(parsed.errorCount).toBe(0);
    });

    it('should handle large bulk delete (200 attendees) with full truncation', () => {
      const logDetails = {
        action: 'bulk_delete',
        count: 200,
        names: Array.from({ length: 200 }, (_, i) => `Attendee ${i} Full Name`),
        totalRequested: 200,
        successCount: 200,
        errorCount: 0,
        deletedIds: Array.from({ length: 200 }, (_, i) => `attendee-id-${i}`),
        attendees: Array.from({ length: 200 }, (_, i) => ({
          id: `attendee-id-${i}`,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          barcodeNumber: `BC${i}`,
          email: `attendee${i}@example.com`,
          phone: `555-000${i}`,
          company: `Company ${i}`,
          title: `Title ${i}`
        }))
      };

      const result = truncateLogDetails(logDetails, 9500);

      expect(result.wasTruncated).toBe(true);
      expect(result.truncatedDetails.length).toBeLessThanOrEqual(9500);
      
      const parsed = JSON.parse(result.truncatedDetails);
      
      // Should have truncated arrays
      if (result.truncationLevel === 'partial') {
        expect(parsed.names.length).toBeLessThanOrEqual(10);
        expect(parsed.deletedIds.length).toBeLessThanOrEqual(50);
        expect(parsed.attendees).toBeUndefined();
      } else {
        // Minimal summary
        expect(parsed.action).toBe('bulk_delete');
        expect(parsed.successCount).toBe(200);
      }
    });

    it('should handle bulk delete with errors', () => {
      const logDetails = {
        action: 'bulk_delete',
        count: 30,
        names: Array.from({ length: 50 }, (_, i) => `Attendee ${i} Full Name`),
        totalRequested: 50,
        successCount: 30,
        errorCount: 20,
        deletedIds: Array.from({ length: 30 }, (_, i) => `attendee-id-${i}`),
        errors: Array.from({ length: 20 }, (_, i) => ({
          id: `failed-id-${i}`,
          error: `Failed to delete attendee: Database error ${i}`
        })),
        attendees: Array.from({ length: 50 }, (_, i) => ({
          id: `attendee-id-${i}`,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          barcodeNumber: `BC${i}`
        }))
      };

      const result = truncateLogDetails(logDetails, 9500);

      expect(result.truncatedDetails.length).toBeLessThanOrEqual(9500);
      
      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.successCount).toBe(30);
      expect(parsed.errorCount).toBe(20);
      
      // Errors should be preserved (truncated if needed)
      if (result.truncationLevel === 'partial') {
        expect(parsed.errors).toBeDefined();
        expect(parsed.errors.length).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('Edge cases from production', () => {
    it('should handle attendees with very long names', () => {
      const longName = 'A'.repeat(500); // Extremely long name
      const logDetails = {
        action: 'bulk_delete',
        count: 20,
        names: Array.from({ length: 20 }, () => longName),
        totalRequested: 20,
        successCount: 20,
        errorCount: 0,
        deletedIds: Array.from({ length: 20 }, (_, i) => `id-${i}`),
        attendees: Array.from({ length: 20 }, (_, i) => ({
          id: `id-${i}`,
          firstName: longName,
          lastName: longName
        }))
      };

      const result = truncateLogDetails(logDetails, 9500);

      expect(result.truncatedDetails.length).toBeLessThanOrEqual(9500);
      expect(result.wasTruncated).toBe(true);
    });

    it('should handle attendees with special characters in names', () => {
      const specialNames = [
        'José García',
        'François Müller',
        'Владимир Петров',
        '李明',
        'محمد علي',
        'O\'Brien',
        'Smith-Jones',
        'van der Berg'
      ];
      
      const logDetails = {
        action: 'bulk_delete',
        count: specialNames.length,
        names: specialNames,
        totalRequested: specialNames.length,
        successCount: specialNames.length,
        errorCount: 0,
        deletedIds: Array.from({ length: specialNames.length }, (_, i) => `id-${i}`),
        attendees: specialNames.map((name, i) => ({
          id: `id-${i}`,
          firstName: name.split(' ')[0],
          lastName: name.split(' ')[1] || ''
        }))
      };

      const result = truncateLogDetails(logDetails, 9500);

      // Should handle special characters without errors
      expect(() => JSON.parse(result.truncatedDetails)).not.toThrow();
      
      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.successCount).toBe(specialNames.length);
    });

    it('should handle empty arrays gracefully', () => {
      const logDetails = {
        action: 'bulk_delete',
        count: 0,
        names: [],
        totalRequested: 0,
        successCount: 0,
        errorCount: 0,
        deletedIds: [],
        attendees: []
      };

      const result = truncateLogDetails(logDetails, 9500);

      expect(result.wasTruncated).toBe(false);
      expect(result.truncationLevel).toBe('none');
      
      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.names).toEqual([]);
      expect(parsed.deletedIds).toEqual([]);
    });

    it('should preserve all metadata fields during truncation', () => {
      const logDetails = {
        action: 'bulk_delete',
        count: 100,
        names: Array.from({ length: 100 }, (_, i) => `Attendee ${i}`),
        totalRequested: 100,
        successCount: 100,
        errorCount: 0,
        deletedIds: Array.from({ length: 100 }, (_, i) => `id-${i}`),
        attendees: Array.from({ length: 100 }, (_, i) => ({ id: `id-${i}` })),
        // Additional metadata
        timestamp: '2025-01-10T12:00:00Z',
        userId: 'user-123',
        eventId: 'event-456'
      };

      const result = truncateLogDetails(logDetails, 9500);

      const parsed = JSON.parse(result.truncatedDetails);
      
      // Core fields should always be preserved
      expect(parsed.action).toBe('bulk_delete');
      expect(parsed.successCount).toBe(100);
      expect(parsed.totalRequested).toBe(100);
      expect(parsed.errorCount).toBe(0);
      
      // Metadata should be preserved if possible
      if (result.truncationLevel !== 'minimal') {
        expect(parsed.timestamp).toBe('2025-01-10T12:00:00Z');
        expect(parsed.userId).toBe('user-123');
        expect(parsed.eventId).toBe('event-456');
      }
    });
  });

  describe('Performance characteristics', () => {
    it('should handle truncation quickly for large datasets', () => {
      const logDetails = {
        action: 'bulk_delete',
        count: 1000,
        names: Array.from({ length: 1000 }, (_, i) => `Attendee ${i} Full Name`),
        totalRequested: 1000,
        successCount: 1000,
        errorCount: 0,
        deletedIds: Array.from({ length: 1000 }, (_, i) => `id-${i}`),
        attendees: Array.from({ length: 1000 }, (_, i) => ({
          id: `id-${i}`,
          firstName: `First${i}`,
          lastName: `Last${i}`
        }))
      };

      const startTime = Date.now();
      const result = truncateLogDetails(logDetails, 9500);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
      expect(result.truncatedDetails.length).toBeLessThanOrEqual(9500);
    });
  });
});
