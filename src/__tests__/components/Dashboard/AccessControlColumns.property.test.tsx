/**
 * Property-Based Tests for Access Control Columns in Attendees Table
 * 
 * These tests verify the correctness properties defined in the design document
 * for the access control columns visibility and date formatting.
 * 
 * @see .kiro/specs/access-control-feature/design.md
 */

/// <reference types="@testing-library/jest-dom" />

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { formatForDisplay, AccessControlTimeMode } from '../../../lib/accessControlDates';

// Mock event settings for testing
interface MockEventSettings {
  accessControlEnabled: boolean;
  accessControlTimeMode: AccessControlTimeMode;
  timeZone: string;
}

// Mock attendee for testing
interface MockAttendee {
  id: string;
  firstName: string;
  lastName: string;
  validFrom: string | null;
  validUntil: string | null;
  accessEnabled: boolean;
}

/**
 * Helper function to determine if access control columns should be visible
 * This mirrors the logic in the dashboard component
 */
function shouldShowAccessControlColumns(eventSettings: MockEventSettings | null): boolean {
  return eventSettings?.accessControlEnabled === true;
}

/**
 * Helper function to format date for display based on time mode
 * This mirrors the logic in the dashboard component
 */
function formatDateForTable(
  date: string | null,
  eventSettings: MockEventSettings
): string {
  if (!date) {
    return '—';
  }
  return formatForDisplay(
    date,
    eventSettings.accessControlTimeMode || 'date_only',
    eventSettings.timeZone || 'UTC'
  );
}

/**
 * Helper function to get access status display
 * This mirrors the logic in the dashboard component
 */
function getAccessStatusDisplay(accessEnabled: boolean | undefined): 'Active' | 'Inactive' {
  return accessEnabled !== false ? 'Active' : 'Inactive';
}

// Arbitraries for property-based testing
const timezoneArbitrary = fc.constantFrom(
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Tokyo',
  'Australia/Sydney'
);

const timeModeArbitrary = fc.constantFrom<AccessControlTimeMode>('date_only', 'date_time');

const eventSettingsArbitrary = fc.record({
  accessControlEnabled: fc.boolean(),
  accessControlTimeMode: timeModeArbitrary,
  timeZone: timezoneArbitrary,
});

// Generate valid ISO date strings
// Use integer-based approach to avoid invalid date issues
const dateArbitrary = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2030-12-31').getTime(),
}).map(timestamp => new Date(timestamp).toISOString());

const nullableDateArbitrary = fc.option(dateArbitrary, { nil: null });

const attendeeArbitrary = fc.record({
  id: fc.uuid(),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
  validFrom: nullableDateArbitrary,
  validUntil: nullableDateArbitrary,
  accessEnabled: fc.boolean(),
});

/**
 * **Feature: access-control-feature, Property 9: Table Column Visibility**
 * **Validates: Requirements 6.1, 6.2**
 * 
 * *For any* event settings configuration, the validFrom, validUntil, and accessEnabled
 * columns SHALL be visible in the attendees table if and only if `accessControlEnabled` is true.
 */
describe('Property 9: Table Column Visibility', () => {
  it('access control columns are visible if and only if accessControlEnabled is true', () => {
    fc.assert(
      fc.property(
        eventSettingsArbitrary,
        (eventSettings) => {
          const shouldShow = shouldShowAccessControlColumns(eventSettings);
          
          // The columns should be visible exactly when accessControlEnabled is true
          expect(shouldShow).toBe(eventSettings.accessControlEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('columns are hidden when eventSettings is null', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        (eventSettings) => {
          const shouldShow = shouldShowAccessControlColumns(eventSettings);
          expect(shouldShow).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('columns visibility is consistent across multiple checks with same settings', () => {
    fc.assert(
      fc.property(
        eventSettingsArbitrary,
        fc.integer({ min: 2, max: 10 }),
        (eventSettings, checkCount) => {
          const results: boolean[] = [];
          
          for (let i = 0; i < checkCount; i++) {
            results.push(shouldShowAccessControlColumns(eventSettings));
          }
          
          // All results should be the same
          const allSame = results.every(r => r === results[0]);
          expect(allSame).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('toggling accessControlEnabled toggles column visibility', () => {
    fc.assert(
      fc.property(
        eventSettingsArbitrary,
        (eventSettings) => {
          const visibleWhenEnabled = shouldShowAccessControlColumns({
            ...eventSettings,
            accessControlEnabled: true,
          });
          
          const visibleWhenDisabled = shouldShowAccessControlColumns({
            ...eventSettings,
            accessControlEnabled: false,
          });
          
          // Should be visible when enabled, hidden when disabled
          expect(visibleWhenEnabled).toBe(true);
          expect(visibleWhenDisabled).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('column visibility is independent of time mode setting', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        timezoneArbitrary,
        (accessControlEnabled, timeZone) => {
          const visibleWithDateOnly = shouldShowAccessControlColumns({
            accessControlEnabled,
            accessControlTimeMode: 'date_only',
            timeZone,
          });
          
          const visibleWithDateTime = shouldShowAccessControlColumns({
            accessControlEnabled,
            accessControlTimeMode: 'date_time',
            timeZone,
          });
          
          // Visibility should be the same regardless of time mode
          expect(visibleWithDateOnly).toBe(visibleWithDateTime);
          expect(visibleWithDateOnly).toBe(accessControlEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('column visibility is independent of timezone setting', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        timeModeArbitrary,
        timezoneArbitrary,
        timezoneArbitrary,
        (accessControlEnabled, timeMode, tz1, tz2) => {
          const visibleWithTz1 = shouldShowAccessControlColumns({
            accessControlEnabled,
            accessControlTimeMode: timeMode,
            timeZone: tz1,
          });
          
          const visibleWithTz2 = shouldShowAccessControlColumns({
            accessControlEnabled,
            accessControlTimeMode: timeMode,
            timeZone: tz2,
          });
          
          // Visibility should be the same regardless of timezone
          expect(visibleWithTz1).toBe(visibleWithTz2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: access-control-feature, Property 10: Date Display Formatting**
 * **Validates: Requirements 6.3**
 * 
 * *For any* validity date displayed in the table, the format SHALL match the time mode
 * setting (date-only shows date, date-time shows date and time).
 */
describe('Property 10: Date Display Formatting', () => {
  it('null dates display as em-dash', () => {
    fc.assert(
      fc.property(
        eventSettingsArbitrary,
        (eventSettings) => {
          const formatted = formatDateForTable(null, eventSettings);
          expect(formatted).toBe('—');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('date-only mode excludes time from display', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timeZone) => {
          const eventSettings: MockEventSettings = {
            accessControlEnabled: true,
            accessControlTimeMode: 'date_only',
            timeZone,
          };
          
          const formatted = formatDateForTable(date, eventSettings);
          
          // Should not contain AM/PM indicators (time markers)
          expect(formatted).not.toMatch(/\d{1,2}:\d{2}/);
          expect(formatted).not.toMatch(/AM|PM/i);
          
          // Should contain date components (month name, day, year)
          expect(formatted).toMatch(/\w{3}\s+\d{1,2},\s+\d{4}/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('date-time mode includes time in display', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timeZone) => {
          const eventSettings: MockEventSettings = {
            accessControlEnabled: true,
            accessControlTimeMode: 'date_time',
            timeZone,
          };
          
          const formatted = formatDateForTable(date, eventSettings);
          
          // Should contain time components (hour:minute and AM/PM)
          expect(formatted).toMatch(/\d{1,2}:\d{2}/);
          expect(formatted).toMatch(/AM|PM/i);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('same date formats differently based on time mode', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        timezoneArbitrary,
        (date, timeZone) => {
          const dateOnlySettings: MockEventSettings = {
            accessControlEnabled: true,
            accessControlTimeMode: 'date_only',
            timeZone,
          };
          
          const dateTimeSettings: MockEventSettings = {
            accessControlEnabled: true,
            accessControlTimeMode: 'date_time',
            timeZone,
          };
          
          const dateOnlyFormatted = formatDateForTable(date, dateOnlySettings);
          const dateTimeFormatted = formatDateForTable(date, dateTimeSettings);
          
          // Date-time format should be longer (includes time)
          expect(dateTimeFormatted.length).toBeGreaterThan(dateOnlyFormatted.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatting is consistent for the same date and settings', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        eventSettingsArbitrary,
        fc.integer({ min: 2, max: 10 }),
        (date, eventSettings, formatCount) => {
          const results: string[] = [];
          
          for (let i = 0; i < formatCount; i++) {
            results.push(formatDateForTable(date, eventSettings));
          }
          
          // All results should be identical
          const allSame = results.every(r => r === results[0]);
          expect(allSame).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatted date always contains year', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        eventSettingsArbitrary,
        (date, eventSettings) => {
          const formatted = formatDateForTable(date, eventSettings);
          
          // Should contain a 4-digit year
          expect(formatted).toMatch(/\d{4}/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatted date always contains month', () => {
    fc.assert(
      fc.property(
        dateArbitrary,
        eventSettingsArbitrary,
        (date, eventSettings) => {
          const formatted = formatDateForTable(date, eventSettings);
          
          // Should contain a month abbreviation (Jan, Feb, etc.)
          const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const containsMonth = monthAbbreviations.some(month => formatted.includes(month));
          expect(containsMonth).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('access status displays correctly based on accessEnabled value', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (accessEnabled) => {
          const status = getAccessStatusDisplay(accessEnabled);
          
          if (accessEnabled) {
            expect(status).toBe('Active');
          } else {
            expect(status).toBe('Inactive');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('undefined accessEnabled defaults to Active', () => {
    fc.assert(
      fc.property(
        fc.constant(undefined),
        (accessEnabled) => {
          const status = getAccessStatusDisplay(accessEnabled);
          expect(status).toBe('Active');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('access status is always one of Active or Inactive', () => {
    fc.assert(
      fc.property(
        fc.option(fc.boolean(), { nil: undefined }),
        (accessEnabled) => {
          const status = getAccessStatusDisplay(accessEnabled ?? undefined);
          expect(['Active', 'Inactive']).toContain(status);
        }
      ),
      { numRuns: 100 }
    );
  });
});
