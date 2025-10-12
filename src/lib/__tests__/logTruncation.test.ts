import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { truncateLogDetails } from '../logTruncation';

describe('truncateLogDetails', () => {
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('No truncation needed', () => {
    it('should return original details when under max length', () => {
      const details = {
        action: 'bulk_delete',
        successCount: 5,
        names: ['John Doe', 'Jane Smith'],
        deletedIds: ['id1', 'id2']
      };

      const result = truncateLogDetails(details, 10000);

      expect(result.wasTruncated).toBe(false);
      expect(result.truncationLevel).toBe('none');
      expect(JSON.parse(result.truncatedDetails)).toEqual(details);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle small objects correctly', () => {
      const details = { action: 'test', count: 1 };
      const result = truncateLogDetails(details);

      expect(result.wasTruncated).toBe(false);
      expect(result.truncationLevel).toBe('none');
      expect(result.truncatedDetails).toBe(JSON.stringify(details));
    });
  });

  describe('Partial truncation', () => {
    it('should truncate names array to first 10 items', () => {
      const names = Array.from({ length: 50 }, (_, i) => `Person ${i}`);
      const details = {
        action: 'bulk_delete',
        names,
        successCount: 50,
        totalRequested: 50
      };

      const result = truncateLogDetails(details, 500);

      expect(result.wasTruncated).toBe(true);
      expect(result.truncationLevel).toBe('partial');
      
      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.names).toHaveLength(10);
      expect(parsed.namesTruncated).toBe(true);
      expect(parsed.totalNames).toBe(50);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('partial truncation')
      );
    });

    it('should truncate deletedIds array to first 50 items', () => {
      const deletedIds = Array.from({ length: 100 }, (_, i) => `id-${i}`);
      const details = {
        action: 'bulk_delete',
        deletedIds,
        successCount: 100
      };

      const result = truncateLogDetails(details, 500);

      expect(result.wasTruncated).toBe(true);
      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.deletedIds).toHaveLength(50);
      expect(parsed.idsTruncated).toBe(true);
    });

    it('should truncate errors array to first 10 items', () => {
      const errors = Array.from({ length: 30 }, (_, i) => ({
        id: `id-${i}`,
        error: `Error message ${i}`
      }));
      const details = {
        action: 'bulk_delete',
        errors,
        errorCount: 30
      };

      const result = truncateLogDetails(details, 500);

      expect(result.wasTruncated).toBe(true);
      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.errors).toHaveLength(10);
      expect(parsed.errorsTruncated).toBe(true);
    });

    it('should remove attendees array and add note', () => {
      const attendees = Array.from({ length: 20 }, (_, i) => ({
        id: `id-${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        barcodeNumber: `BC${i}`
      }));
      const details = {
        action: 'bulk_delete',
        attendees,
        successCount: 20
      };

      const result = truncateLogDetails(details, 500);

      expect(result.wasTruncated).toBe(true);
      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.attendees).toBeUndefined();
      expect(parsed.note).toContain('Full details truncated');
      expect(parsed.note).toContain('20 attendees');
    });

    it('should apply multiple truncations together', () => {
      const details = {
        action: 'bulk_delete',
        names: Array.from({ length: 50 }, (_, i) => `Person ${i}`),
        deletedIds: Array.from({ length: 100 }, (_, i) => `id-${i}`),
        errors: Array.from({ length: 30 }, (_, i) => ({ id: `id-${i}`, error: 'Error' })),
        attendees: Array.from({ length: 50 }, (_, i) => ({ id: `id-${i}`, firstName: 'Test' })),
        successCount: 50,
        totalRequested: 80,
        errorCount: 30
      };

      const result = truncateLogDetails(details, 1000);

      expect(result.wasTruncated).toBe(true);
      const parsed = JSON.parse(result.truncatedDetails);
      
      // If partial truncation was applied
      if (result.truncationLevel === 'partial') {
        expect(parsed.names).toHaveLength(10);
        expect(parsed.namesTruncated).toBe(true);
        expect(parsed.deletedIds).toHaveLength(50);
        expect(parsed.idsTruncated).toBe(true);
        expect(parsed.errors).toHaveLength(10);
        expect(parsed.errorsTruncated).toBe(true);
        expect(parsed.attendees).toBeUndefined();
        expect(parsed.note).toBeDefined();
      } else {
        // Minimal truncation
        expect(parsed.action).toBe('bulk_delete');
        expect(parsed.successCount).toBe(50);
        expect(parsed.errorCount).toBe(30);
      }
    });

    it('should preserve original fields not being truncated', () => {
      const details = {
        action: 'bulk_delete',
        names: Array.from({ length: 50 }, (_, i) => `Person ${i}`),
        successCount: 50,
        totalRequested: 50,
        customField: 'preserved',
        anotherField: 123
      };

      const result = truncateLogDetails(details, 500);

      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.customField).toBe('preserved');
      expect(parsed.anotherField).toBe(123);
      expect(parsed.successCount).toBe(50);
      expect(parsed.totalRequested).toBe(50);
    });
  });

  describe('Minimal truncation', () => {
    it('should return minimal summary when partial truncation is insufficient', () => {
      // Create a very large object that even partial truncation won't fix
      const hugeString = 'x'.repeat(5000);
      const details = {
        action: 'bulk_delete',
        names: Array.from({ length: 100 }, () => hugeString),
        successCount: 100,
        totalRequested: 100,
        errorCount: 0
      };

      const result = truncateLogDetails(details, 500);

      expect(result.wasTruncated).toBe(true);
      expect(result.truncationLevel).toBe('minimal');
      
      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed).toEqual({
        action: 'bulk_delete',
        totalRequested: 100,
        successCount: 100,
        errorCount: 0,
        note: 'Bulk operation completed. Details truncated due to size.'
      });
      
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('minimal summary')
      );
    });

    it('should handle missing fields in minimal summary', () => {
      const details = {
        someField: 'x'.repeat(10000)
      };

      const result = truncateLogDetails(details, 500);

      expect(result.truncationLevel).toBe('minimal');
      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.action).toBe('unknown');
      expect(parsed.totalRequested).toBe(0);
      expect(parsed.successCount).toBe(0);
      expect(parsed.errorCount).toBe(0);
    });
  });

  describe('Custom max length', () => {
    it('should respect custom maxLength parameter', () => {
      const details = {
        action: 'test',
        data: 'x'.repeat(200),
        successCount: 10,
        totalRequested: 10,
        errorCount: 0
      };

      const result = truncateLogDetails(details, 100);

      expect(result.wasTruncated).toBe(true);
      // Minimal summary should be returned and fit within limit
      expect(result.truncationLevel).toBe('minimal');
      expect(result.truncatedDetails.length).toBeLessThanOrEqual(150); // Minimal summary is small
    });

    it('should use default maxLength of 9500 when not specified', () => {
      const details = {
        action: 'test',
        data: 'x'.repeat(9000)
      };

      const result = truncateLogDetails(details);

      expect(result.wasTruncated).toBe(false);
      expect(result.truncationLevel).toBe('none');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty object', () => {
      const result = truncateLogDetails({});

      expect(result.wasTruncated).toBe(false);
      expect(result.truncationLevel).toBe('none');
      expect(result.truncatedDetails).toBe('{}');
    });

    it('should handle null values in arrays', () => {
      const details = {
        action: 'test',
        names: [null, 'John', null, 'Jane'],
        deletedIds: [null, 'id1', null]
      };

      const result = truncateLogDetails(details);

      expect(result.wasTruncated).toBe(false);
      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.names).toEqual([null, 'John', null, 'Jane']);
    });

    it('should handle arrays with exactly 10 items (no truncation needed)', () => {
      const details = {
        action: 'test',
        names: Array.from({ length: 10 }, (_, i) => `Person ${i}`)
      };

      const result = truncateLogDetails(details, 500);

      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.names).toHaveLength(10);
      expect(parsed.namesTruncated).toBeUndefined();
    });

    it('should handle arrays with exactly 50 deletedIds (no truncation needed)', () => {
      const details = {
        action: 'test',
        deletedIds: Array.from({ length: 50 }, (_, i) => `id-${i}`)
      };

      const result = truncateLogDetails(details, 500);

      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.deletedIds).toHaveLength(50);
      expect(parsed.idsTruncated).toBeUndefined();
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical bulk delete log with 100 attendees', () => {
      const details = {
        action: 'bulk_delete',
        names: Array.from({ length: 100 }, (_, i) => `Attendee ${i} Name`),
        totalRequested: 100,
        successCount: 100,
        errorCount: 0,
        deletedIds: Array.from({ length: 100 }, (_, i) => `attendee-id-${i}`),
        attendees: Array.from({ length: 100 }, (_, i) => ({
          id: `attendee-id-${i}`,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          barcodeNumber: `BC${i}`
        }))
      };

      const result = truncateLogDetails(details);

      expect(result.truncatedDetails.length).toBeLessThanOrEqual(9500);
      const parsed = JSON.parse(result.truncatedDetails);
      
      // Should have truncated arrays
      if (result.wasTruncated) {
        expect(parsed.names.length).toBeLessThanOrEqual(10);
        expect(parsed.deletedIds.length).toBeLessThanOrEqual(50);
        expect(parsed.attendees).toBeUndefined();
      }
    });

    it('should handle bulk delete with errors', () => {
      const details = {
        action: 'bulk_delete',
        names: Array.from({ length: 50 }, (_, i) => `Attendee ${i}`),
        totalRequested: 50,
        successCount: 30,
        errorCount: 20,
        deletedIds: Array.from({ length: 30 }, (_, i) => `id-${i}`),
        errors: Array.from({ length: 20 }, (_, i) => ({
          id: `failed-id-${i}`,
          error: `Failed to delete: ${i}`
        }))
      };

      const result = truncateLogDetails(details, 1000);

      const parsed = JSON.parse(result.truncatedDetails);
      expect(parsed.successCount).toBe(30);
      expect(parsed.errorCount).toBe(20);
      
      if (result.wasTruncated && result.truncationLevel === 'partial') {
        expect(parsed.errors).toBeDefined();
        expect(parsed.errors.length).toBeLessThanOrEqual(10);
      }
    });
  });
});
