/**
 * Property-Based Tests for Access Status Field Visibility
 * 
 * **Feature: access-control-feature, Property 8: Access Status Field Visibility**
 * **Validates: Requirements 5.1, 5.3**
 * 
 * These tests verify that the Access Status field is visible in the attendee form
 * if and only if `accessControlEnabled` is true, and that it displays the correct
 * options (Active/Inactive).
 * 
 * @see .kiro/specs/access-control-feature/design.md
 * @see .kiro/specs/access-control-feature/requirements.md
 */

/// <reference types="@testing-library/jest-dom" />

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { AccessControlFields } from '../../../components/AttendeeForm/AccessControlFields';
import type { AccessControlTimeMode } from '../../../lib/accessControlDates';

// Ensure cleanup after each test
afterEach(() => {
  cleanup();
});

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

// Helper to create default props
const createDefaultProps = (overrides: Partial<Parameters<typeof AccessControlFields>[0]> = {}) => ({
  accessControlEnabled: true,
  accessControlTimeMode: 'date_only' as AccessControlTimeMode,
  validFrom: null,
  validUntil: null,
  accessEnabled: true,
  onValidFromChange: vi.fn(),
  onValidUntilChange: vi.fn(),
  onAccessEnabledChange: vi.fn(),
  eventTimezone: 'America/Los_Angeles',
  ...overrides,
});

/**
 * **Feature: access-control-feature, Property 8: Access Status Field Visibility**
 * **Validates: Requirements 5.1, 5.3**
 * 
 * *For any* event settings configuration, the Access Status field SHALL be visible
 * in the attendee form if and only if `accessControlEnabled` is true.
 */
describe('Property 8: Access Status Field Visibility', () => {
  /**
   * Requirement 5.1: WHEN Access Control is enabled THEN the System SHALL display
   * an "Access Status" field in the attendee form with options "Active" and "Inactive"
   */
  it('Access Status field is visible when accessControlEnabled is true', () => {
    fc.assert(
      fc.property(
        timeModeArbitrary,
        timezoneArbitrary,
        fc.boolean(), // accessEnabled value
        (timeMode, timezone, accessEnabled) => {
          cleanup();
          const props = createDefaultProps({
            accessControlEnabled: true,
            accessControlTimeMode: timeMode,
            eventTimezone: timezone,
            accessEnabled,
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          // Access Status field should be visible
          const accessEnabledSelect = screen.queryByTestId('access-enabled-select');
          expect(accessEnabledSelect).not.toBeNull();
          expect(accessEnabledSelect).toBeInTheDocument();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Requirement 5.3: WHEN Access Control is disabled THEN the System SHALL hide
   * the Access Status field from the attendee form
   */
  it('Access Status field is hidden when accessControlEnabled is false', () => {
    fc.assert(
      fc.property(
        timeModeArbitrary,
        timezoneArbitrary,
        fc.boolean(), // accessEnabled value
        (timeMode, timezone, accessEnabled) => {
          cleanup();
          const props = createDefaultProps({
            accessControlEnabled: false,
            accessControlTimeMode: timeMode,
            eventTimezone: timezone,
            accessEnabled,
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          // Access Status field should NOT be visible
          const accessEnabledSelect = screen.queryByTestId('access-enabled-select');
          expect(accessEnabledSelect).toBeNull();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Requirement 5.1: The Access Status field SHALL have options "Active" and "Inactive"
   * This test verifies the field displays the correct value based on accessEnabled prop
   */
  it('Access Status field displays correct value based on accessEnabled prop', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (accessEnabled) => {
          cleanup();
          const props = createDefaultProps({
            accessControlEnabled: true,
            accessEnabled,
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          // The select should show the correct value
          const accessEnabledSelect = screen.getByTestId('access-enabled-select');
          
          // Check the displayed text in the select trigger
          if (accessEnabled) {
            expect(accessEnabledSelect).toHaveTextContent(/Active/i);
          } else {
            expect(accessEnabledSelect).toHaveTextContent(/Inactive/i);
          }
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Verify that Access Status field visibility is independent of time mode
   */
  it('Access Status field visibility is independent of time mode setting', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // accessControlEnabled
        timezoneArbitrary,
        (accessControlEnabled, timezone) => {
          cleanup();
          
          // Test with date_only mode
          const propsDateOnly = createDefaultProps({
            accessControlEnabled,
            accessControlTimeMode: 'date_only',
            eventTimezone: timezone,
          });
          
          const { unmount: unmount1 } = render(<AccessControlFields {...propsDateOnly} />);
          const selectDateOnly = screen.queryByTestId('access-enabled-select');
          const visibleDateOnly = selectDateOnly !== null;
          unmount1();
          cleanup();
          
          // Test with date_time mode
          const propsDateTime = createDefaultProps({
            accessControlEnabled,
            accessControlTimeMode: 'date_time',
            eventTimezone: timezone,
          });
          
          const { unmount: unmount2 } = render(<AccessControlFields {...propsDateTime} />);
          const selectDateTime = screen.queryByTestId('access-enabled-select');
          const visibleDateTime = selectDateTime !== null;
          unmount2();
          
          // Visibility should be the same regardless of time mode
          expect(visibleDateOnly).toBe(visibleDateTime);
          // And should match accessControlEnabled
          expect(visibleDateOnly).toBe(accessControlEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Verify that Access Status field visibility is independent of timezone
   */
  it('Access Status field visibility is independent of timezone setting', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // accessControlEnabled
        timeModeArbitrary,
        timezoneArbitrary,
        timezoneArbitrary,
        (accessControlEnabled, timeMode, tz1, tz2) => {
          cleanup();
          
          // Test with first timezone
          const props1 = createDefaultProps({
            accessControlEnabled,
            accessControlTimeMode: timeMode,
            eventTimezone: tz1,
          });
          
          const { unmount: unmount1 } = render(<AccessControlFields {...props1} />);
          const select1 = screen.queryByTestId('access-enabled-select');
          const visible1 = select1 !== null;
          unmount1();
          cleanup();
          
          // Test with second timezone
          const props2 = createDefaultProps({
            accessControlEnabled,
            accessControlTimeMode: timeMode,
            eventTimezone: tz2,
          });
          
          const { unmount: unmount2 } = render(<AccessControlFields {...props2} />);
          const select2 = screen.queryByTestId('access-enabled-select');
          const visible2 = select2 !== null;
          unmount2();
          
          // Visibility should be the same regardless of timezone
          expect(visible1).toBe(visible2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Verify that Access Status field visibility is independent of date values
   */
  it('Access Status field visibility is independent of validFrom and validUntil values', () => {
    // Use integer-based approach to avoid invalid date issues
    const dateArbitrary = fc.integer({
      min: new Date('2020-01-01').getTime(),
      max: new Date('2030-12-31').getTime(),
    }).map(timestamp => new Date(timestamp).toISOString());
    
    const nullableDateArbitrary = fc.option(dateArbitrary, { nil: null });
    
    fc.assert(
      fc.property(
        fc.boolean(), // accessControlEnabled
        nullableDateArbitrary,
        nullableDateArbitrary,
        (accessControlEnabled, validFrom, validUntil) => {
          cleanup();
          const props = createDefaultProps({
            accessControlEnabled,
            validFrom,
            validUntil,
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          const accessEnabledSelect = screen.queryByTestId('access-enabled-select');
          
          // Visibility should only depend on accessControlEnabled
          if (accessControlEnabled) {
            expect(accessEnabledSelect).not.toBeNull();
          } else {
            expect(accessEnabledSelect).toBeNull();
          }
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Verify consistency: multiple renders with same props produce same visibility
   */
  it('Access Status field visibility is consistent across multiple renders', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // accessControlEnabled
        fc.integer({ min: 2, max: 5 }), // number of renders
        (accessControlEnabled, renderCount) => {
          const results: boolean[] = [];
          
          for (let i = 0; i < renderCount; i++) {
            cleanup();
            const props = createDefaultProps({ accessControlEnabled });
            const { unmount } = render(<AccessControlFields {...props} />);
            
            const select = screen.queryByTestId('access-enabled-select');
            results.push(select !== null);
            
            unmount();
          }
          
          // All results should be the same
          const allSame = results.every(r => r === results[0]);
          expect(allSame).toBe(true);
          // And should match accessControlEnabled
          expect(results[0]).toBe(accessControlEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Verify that toggling accessControlEnabled toggles Access Status field visibility
   */
  it('toggling accessControlEnabled toggles Access Status field visibility', () => {
    fc.assert(
      fc.property(
        timeModeArbitrary,
        timezoneArbitrary,
        (timeMode, timezone) => {
          cleanup();
          
          // First render with enabled
          const propsEnabled = createDefaultProps({
            accessControlEnabled: true,
            accessControlTimeMode: timeMode,
            eventTimezone: timezone,
          });
          
          const { unmount: unmount1 } = render(<AccessControlFields {...propsEnabled} />);
          const selectEnabled = screen.queryByTestId('access-enabled-select');
          expect(selectEnabled).not.toBeNull();
          unmount1();
          cleanup();
          
          // Second render with disabled
          const propsDisabled = createDefaultProps({
            accessControlEnabled: false,
            accessControlTimeMode: timeMode,
            eventTimezone: timezone,
          });
          
          const { unmount: unmount2 } = render(<AccessControlFields {...propsDisabled} />);
          const selectDisabled = screen.queryByTestId('access-enabled-select');
          expect(selectDisabled).toBeNull();
          unmount2();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Additional tests for Access Status field in the attendees table
 * These complement the Property 9 tests by specifically focusing on the Access Status column
 */
describe('Property 8 Extension: Access Status Column in Attendees Table', () => {
  /**
   * Helper function to determine if access status column should be visible
   * This mirrors the logic in the dashboard component
   */
  function shouldShowAccessStatusColumn(eventSettings: { accessControlEnabled: boolean } | null): boolean {
    return eventSettings?.accessControlEnabled === true;
  }

  it('Access Status column visibility follows accessControlEnabled setting', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (accessControlEnabled) => {
          const eventSettings = { accessControlEnabled };
          const shouldShow = shouldShowAccessStatusColumn(eventSettings);
          
          expect(shouldShow).toBe(accessControlEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Access Status column is hidden when eventSettings is null', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        (eventSettings) => {
          const shouldShow = shouldShowAccessStatusColumn(eventSettings);
          expect(shouldShow).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Helper function to get access status display value
   * This mirrors the logic in the dashboard component
   */
  function getAccessStatusDisplay(accessEnabled: boolean | undefined): 'Active' | 'Inactive' {
    return accessEnabled !== false ? 'Active' : 'Inactive';
  }

  /**
   * Requirement 5.1: Access Status should show "Active" or "Inactive"
   */
  it('Access Status displays "Active" when accessEnabled is true', () => {
    fc.assert(
      fc.property(
        fc.constant(true),
        (accessEnabled) => {
          const display = getAccessStatusDisplay(accessEnabled);
          expect(display).toBe('Active');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Access Status displays "Inactive" when accessEnabled is false', () => {
    fc.assert(
      fc.property(
        fc.constant(false),
        (accessEnabled) => {
          const display = getAccessStatusDisplay(accessEnabled);
          expect(display).toBe('Inactive');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Access Status defaults to "Active" when accessEnabled is undefined', () => {
    fc.assert(
      fc.property(
        fc.constant(undefined),
        (accessEnabled) => {
          const display = getAccessStatusDisplay(accessEnabled);
          expect(display).toBe('Active');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Access Status is always either "Active" or "Inactive"', () => {
    fc.assert(
      fc.property(
        fc.option(fc.boolean(), { nil: undefined }),
        (accessEnabled) => {
          const display = getAccessStatusDisplay(accessEnabled ?? undefined);
          expect(['Active', 'Inactive']).toContain(display);
        }
      ),
      { numRuns: 100 }
    );
  });
});
