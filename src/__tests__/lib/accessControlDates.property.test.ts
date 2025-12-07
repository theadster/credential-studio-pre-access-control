/**
 * Property-Based Tests for Access Control Date Utilities
 * 
 * These tests verify the correctness properties defined in the design document
 * for the access control date interpretation feature.
 * 
 * @see .kiro/specs/access-control-feature/design.md
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  startOfDay,
  endOfDay,
  parseForStorage,
  formatForDisplay,
  extractDateOnly,
  isValidDateRange,
} from '@/lib/accessControlDates';

// Common timezones for testing
const timezones = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

// Arbitrary for generating valid dates
const dateArbitrary = fc.date({
  min: new Date('2020-01-01T00:00:00Z'),
  max: new Date('2030-12-31T23:59:59Z'),
}).filter(d => !isNaN(d.getTime()));

// Arbitrary for generating timezones
const timezoneArbitrary = fc.constantFrom(...timezones);

/**
 * **Feature: access-control-feature, Property 6: Date-Only Mode Interpretation**
 * **Validates: Requirements 4.3, 4.4**
 * 
 * *For any* date value in date-only mode, validFrom SHALL be interpreted as
 * 00:00:00 (midnight) and validUntil SHALL be interpreted as 23:59:59 in the
 * event timezone.
 */
describe('Property 6: Date-Only Mode Interpretation', () => {
  it('startOfDay returns 00:00:00.000 in the specified timezone', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timezone) => {
          const result = startOfDay(date, timezone);
          
          // Result should be a valid ISO string
          expect(result).toBeDefined();
          expect(result.endsWith('Z')).toBe(true);
          
          // Parse the result and format it in the target timezone
          const resultDate = new Date(result);
          expect(isNaN(resultDate.getTime())).toBe(false);
          
          // Get the time components in the target timezone
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });
          
          const parts = formatter.formatToParts(resultDate);
          const hour = parts.find(p => p.type === 'hour')?.value;
          const minute = parts.find(p => p.type === 'minute')?.value;
          const second = parts.find(p => p.type === 'second')?.value;
          
          // Time should be 00:00:00 in the target timezone
          expect(hour).toBe('00');
          expect(minute).toBe('00');
          expect(second).toBe('00');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('endOfDay returns 23:59:59 in the specified timezone', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timezone) => {
          const result = endOfDay(date, timezone);
          
          // Result should be a valid ISO string
          expect(result).toBeDefined();
          expect(result.endsWith('Z')).toBe(true);
          
          // Parse the result and format it in the target timezone
          const resultDate = new Date(result);
          expect(isNaN(resultDate.getTime())).toBe(false);
          
          // Get the time components in the target timezone
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });
          
          const parts = formatter.formatToParts(resultDate);
          const hour = parts.find(p => p.type === 'hour')?.value;
          const minute = parts.find(p => p.type === 'minute')?.value;
          const second = parts.find(p => p.type === 'second')?.value;
          
          // Time should be 23:59:59 in the target timezone
          expect(hour).toBe('23');
          expect(minute).toBe('59');
          expect(second).toBe('59');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('startOfDay and endOfDay preserve the same calendar date in the timezone', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timezone) => {
          const startResult = startOfDay(date, timezone);
          const endResult = endOfDay(date, timezone);
          
          // Get the date components in the target timezone for both results
          const dateFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          
          const startDateStr = dateFormatter.format(new Date(startResult));
          const endDateStr = dateFormatter.format(new Date(endResult));
          
          // Both should represent the same calendar date
          expect(startDateStr).toBe(endDateStr);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('parseForStorage in date_only mode applies startOfDay for validFrom', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timezone) => {
          const dateStr = date.toISOString();
          const result = parseForStorage(dateStr, 'date_only', timezone, false);
          
          expect(result).not.toBeNull();
          
          // Should match startOfDay result
          const expected = startOfDay(date, timezone);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('parseForStorage in date_only mode applies endOfDay for validUntil', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timezone) => {
          const dateStr = date.toISOString();
          const result = parseForStorage(dateStr, 'date_only', timezone, true);
          
          expect(result).not.toBeNull();
          
          // Should match endOfDay result
          const expected = endOfDay(date, timezone);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('endOfDay is always after startOfDay for the same date', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timezone) => {
          const start = new Date(startOfDay(date, timezone));
          const end = new Date(endOfDay(date, timezone));
          
          // End of day should be after start of day
          expect(end.getTime()).toBeGreaterThan(start.getTime());
          
          // The difference should be approximately 23:59:59.999 (86399999 ms)
          // However, on DST transition days, the day can be 23 or 25 hours:
          // - "Spring forward" days: 23 hours (82799999 ms)
          // - "Fall back" days: 25 hours (89999999 ms)
          // - Normal days: 24 hours (86399999 ms)
          const diffMs = end.getTime() - start.getTime();
          const minDiff = 82799999; // 23 hours - 1 ms (spring forward)
          const maxDiff = 89999999; // 25 hours - 1 ms (fall back)
          expect(diffMs).toBeGreaterThanOrEqual(minDiff);
          expect(diffMs).toBeLessThanOrEqual(maxDiff);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: access-control-feature, Property 7: Date-Time Mode Exact Storage**
 * **Validates: Requirements 4.5, 4.6**
 * 
 * *For any* datetime value in date-time mode, the stored timestamp SHALL
 * exactly match the input timestamp without modification.
 */
describe('Property 7: Date-Time Mode Exact Storage', () => {
  it('parseForStorage in date_time mode preserves exact timestamp for validFrom', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timezone) => {
          const inputStr = date.toISOString();
          const result = parseForStorage(inputStr, 'date_time', timezone, false);
          
          expect(result).not.toBeNull();
          
          // The result should be the exact same ISO string
          expect(result).toBe(inputStr);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('parseForStorage in date_time mode preserves exact timestamp for validUntil', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timezone) => {
          const inputStr = date.toISOString();
          const result = parseForStorage(inputStr, 'date_time', timezone, true);
          
          expect(result).not.toBeNull();
          
          // The result should be the exact same ISO string
          expect(result).toBe(inputStr);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('date_time mode ignores timezone parameter (exact storage)', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        timezoneArbitrary,
        (date, timezone1, timezone2) => {
          const inputStr = date.toISOString();
          
          const result1 = parseForStorage(inputStr, 'date_time', timezone1, false);
          const result2 = parseForStorage(inputStr, 'date_time', timezone2, false);
          
          // Both should produce the same result regardless of timezone
          expect(result1).toBe(result2);
          expect(result1).toBe(inputStr);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('date_time mode preserves millisecond precision', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timezone) => {
          const inputStr = date.toISOString();
          const result = parseForStorage(inputStr, 'date_time', timezone, false);
          
          expect(result).not.toBeNull();
          
          // Parse both and compare timestamps
          const inputMs = new Date(inputStr).getTime();
          const resultMs = new Date(result!).getTime();
          
          expect(resultMs).toBe(inputMs);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isEndDate parameter has no effect in date_time mode', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timezone) => {
          const inputStr = date.toISOString();
          
          const resultStart = parseForStorage(inputStr, 'date_time', timezone, false);
          const resultEnd = parseForStorage(inputStr, 'date_time', timezone, true);
          
          // Both should produce the same result
          expect(resultStart).toBe(resultEnd);
          expect(resultStart).toBe(inputStr);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Additional property tests for utility functions
 */
describe('Additional Date Utility Properties', () => {
  it('formatForDisplay returns empty string for null input', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('date_only', 'date_time') as fc.Arbitrary<'date_only' | 'date_time'>,
        timezoneArbitrary,
        (mode, timezone) => {
          const result = formatForDisplay(null, mode, timezone);
          expect(result).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatForDisplay includes time only in date_time mode', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timezone) => {
          const dateStr = date.toISOString();
          
          const dateOnlyResult = formatForDisplay(dateStr, 'date_only', timezone);
          const dateTimeResult = formatForDisplay(dateStr, 'date_time', timezone);
          
          // date_time result should be longer (includes time)
          expect(dateTimeResult.length).toBeGreaterThan(dateOnlyResult.length);
          
          // date_time result should contain AM or PM
          expect(dateTimeResult).toMatch(/AM|PM/);
          
          // date_only result should not contain AM or PM
          expect(dateOnlyResult).not.toMatch(/AM|PM/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('extractDateOnly returns YYYY-MM-DD format', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timezone) => {
          const dateStr = date.toISOString();
          const result = extractDateOnly(dateStr, timezone);
          
          // Should match YYYY-MM-DD format
          expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('extractDateOnly returns empty string for null input', () => {
    fc.assert(
      fc.property(
        timezoneArbitrary,
        (timezone) => {
          const result = extractDateOnly(null, timezone);
          expect(result).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isValidDateRange returns true when validFrom <= validUntil', () => {
    fc.assert(
      fc.property(
        fc.tuple(dateArbitrary, dateArbitrary).filter(([d1, d2]) => d1.getTime() !== d2.getTime()),
        ([date1, date2]) => {
          const [earlier, later] = date1 < date2 ? [date1, date2] : [date2, date1];
          
          const result = isValidDateRange(earlier.toISOString(), later.toISOString());
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isValidDateRange returns false when validFrom > validUntil', () => {
    fc.assert(
      fc.property(
        fc.tuple(dateArbitrary, dateArbitrary).filter(([d1, d2]) => d1.getTime() !== d2.getTime()),
        ([date1, date2]) => {
          const [earlier, later] = date1 < date2 ? [date1, date2] : [date2, date1];
          
          // Pass later as validFrom and earlier as validUntil
          const result = isValidDateRange(later.toISOString(), earlier.toISOString());
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isValidDateRange returns true when either date is null', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        (date) => {
          const dateStr = date.toISOString();
          
          expect(isValidDateRange(null, dateStr)).toBe(true);
          expect(isValidDateRange(dateStr, null)).toBe(true);
          expect(isValidDateRange(null, null)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('parseForStorage returns null for empty or null input', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('date_only', 'date_time') as fc.Arbitrary<'date_only' | 'date_time'>,
        timezoneArbitrary,
        fc.boolean(),
        (mode, timezone, isEndDate) => {
          expect(parseForStorage(null, mode, timezone, isEndDate)).toBeNull();
          expect(parseForStorage('', mode, timezone, isEndDate)).toBeNull();
          expect(parseForStorage('   ', mode, timezone, isEndDate)).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
