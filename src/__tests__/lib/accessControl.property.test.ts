/**
 * Property-Based Tests for Access Control
 * 
 * These tests verify the correctness properties defined in the design document
 * for the mobile access control system.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  toUtcDatetime,
  validateDateRange,
  utcDatetimeSchema,
  accessControlInputSchema,
} from '@/types/accessControl';

/**
 * **Feature: mobile-access-control, Property 1: UTC datetime storage**
 * **Validates: Requirements 1.2, 1.3**
 * 
 * *For any* datetime input for validFrom or validUntil, the stored value
 * SHALL be in UTC format.
 */
describe('Property 1: UTC datetime storage', () => {
  // Arbitrary for generating valid Date objects
  const dateArbitrary = fc.date({
    min: new Date('2020-01-01T00:00:00Z'),
    max: new Date('2030-12-31T23:59:59Z'),
  });

  it('toUtcDatetime always produces UTC format strings (ending with Z)', () => {
    fc.assert(
      fc.property(
        dateArbitrary.filter((date) => !isNaN(date.getTime())),
        (date) => {
          const isoString = date.toISOString();
          const result = toUtcDatetime(isoString);
          
          // Result should be defined for valid input
          expect(result).toBeDefined();
          
          // Result should end with 'Z' indicating UTC
          expect(result!.endsWith('Z')).toBe(true);
          
          // Result should be a valid ISO 8601 string
          const parsed = new Date(result!);
          expect(isNaN(parsed.getTime())).toBe(false);
          
          // The parsed date should represent the same moment in time
          expect(parsed.getTime()).toBe(date.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('toUtcDatetime converts any valid datetime input to UTC format', () => {
    // Test that any valid datetime string that JavaScript can parse
    // gets converted to a UTC ISO string (ending with Z)
    fc.assert(
      fc.property(
        dateArbitrary.filter((date) => !isNaN(date.getTime())),
        fc.constantFrom(
          (d: Date) => d.toISOString(), // UTC ISO string
          (d: Date) => d.toString(), // Local string format
          (d: Date) => d.toUTCString(), // UTC string format
          (d: Date) => d.getTime().toString() // Unix timestamp
        ),
        (date, formatFn) => {
          const inputString = formatFn(date);
          const result = toUtcDatetime(inputString);
          
          // Result should be defined
          expect(result).toBeDefined();
          
          // Result should end with 'Z' indicating UTC
          expect(result!.endsWith('Z')).toBe(true);
          
          // Result should be a valid ISO 8601 string
          const parsed = new Date(result!);
          expect(isNaN(parsed.getTime())).toBe(false);
          
          // The result should represent the same moment in time
          expect(parsed.getTime()).toBe(date.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('utcDatetimeSchema validates UTC format strings', () => {
    fc.assert(
      fc.property(
        dateArbitrary.filter((date) => !isNaN(date.getTime())),
        (date) => {
          const utcString = date.toISOString();
          const result = utcDatetimeSchema.safeParse(utcString);
          
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('utcDatetimeSchema accepts null values', () => {
    const result = utcDatetimeSchema.safeParse(null);
    expect(result.success).toBe(true);
  });

  it('utcDatetimeSchema rejects non-UTC format strings', () => {
    // Strings without Z suffix should be rejected
    const nonUtcStrings = [
      '2024-01-15T10:30:00',           // No timezone
      '2024-01-15T10:30:00+05:00',     // With offset
      '2024-01-15T10:30:00-08:00',     // With negative offset
      '2024-01-15',                     // Date only
      'invalid-date',                   // Invalid format
    ];

    for (const str of nonUtcStrings) {
      const result = utcDatetimeSchema.safeParse(str);
      expect(result.success).toBe(false);
    }
  });
});

/**
 * **Feature: mobile-access-control, Property 2: Date validation constraint**
 * **Validates: Requirements 1.6**
 * 
 * *For any* pair of validFrom and validUntil dates where validFrom > validUntil,
 * validation SHALL fail.
 */
describe('Property 2: Date validation constraint', () => {
  const dateArbitrary = fc.date({
    min: new Date('2020-01-01T00:00:00Z'),
    max: new Date('2030-12-31T23:59:59Z'),
  });

  it('validateDateRange returns false when validFrom > validUntil', () => {
    // Generate two different dates and ensure validFrom > validUntil
    fc.assert(
      fc.property(
        fc.tuple(dateArbitrary, dateArbitrary).filter(([d1, d2]) => {
          // Filter out invalid dates and ensure they're different
          return !isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d1.getTime() !== d2.getTime();
        }),
        ([date1, date2]) => {
          // Ensure validFrom > validUntil
          const [later, earlier] = date1 > date2 ? [date1, date2] : [date2, date1];
          
          const validFrom = later.toISOString();
          const validUntil = earlier.toISOString();
          
          const result = validateDateRange(validFrom, validUntil);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validateDateRange returns true when validFrom < validUntil', () => {
    fc.assert(
      fc.property(
        fc.tuple(dateArbitrary, dateArbitrary).filter(([d1, d2]) => {
          // Filter out invalid dates and ensure they're different
          return !isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d1.getTime() !== d2.getTime();
        }),
        ([date1, date2]) => {
          // Ensure validFrom < validUntil
          const [earlier, later] = date1 < date2 ? [date1, date2] : [date2, date1];
          
          const validFrom = earlier.toISOString();
          const validUntil = later.toISOString();
          
          const result = validateDateRange(validFrom, validUntil);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validateDateRange returns true when either date is null', () => {
    fc.assert(
      fc.property(
        dateArbitrary.filter((date) => !isNaN(date.getTime())),
        (date) => {
          const dateStr = date.toISOString();
          
          // validFrom is null
          expect(validateDateRange(null, dateStr)).toBe(true);
          
          // validUntil is null
          expect(validateDateRange(dateStr, null)).toBe(true);
          
          // Both are null
          expect(validateDateRange(null, null)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accessControlInputSchema rejects when validFrom > validUntil', () => {
    fc.assert(
      fc.property(
        fc.tuple(dateArbitrary, dateArbitrary).filter(([d1, d2]) => {
          // Filter out invalid dates and ensure they're different
          return !isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d1.getTime() !== d2.getTime();
        }),
        ([date1, date2]) => {
          // Ensure validFrom > validUntil
          const [later, earlier] = date1 > date2 ? [date1, date2] : [date2, date1];
          
          const input = {
            attendeeId: 'test-attendee-id',
            accessEnabled: true,
            validFrom: later.toISOString(),
            validUntil: earlier.toISOString(),
          };
          
          const result = accessControlInputSchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accessControlInputSchema accepts when validFrom < validUntil', () => {
    fc.assert(
      fc.property(
        fc.tuple(dateArbitrary, dateArbitrary).filter(([d1, d2]) => {
          // Filter out invalid dates and ensure they're different
          return !isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d1.getTime() !== d2.getTime();
        }),
        ([date1, date2]) => {
          // Ensure validFrom < validUntil
          const [earlier, later] = date1 < date2 ? [date1, date2] : [date2, date1];
          
          const input = {
            attendeeId: 'test-attendee-id',
            accessEnabled: true,
            validFrom: earlier.toISOString(),
            validUntil: later.toISOString(),
          };
          
          const result = accessControlInputSchema.safeParse(input);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
