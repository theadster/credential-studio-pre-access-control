/**
 * Property-Based Tests for AccessControlFields Component
 * 
 * These tests verify the correctness properties defined in the design document
 * for the access control fields in the attendee form.
 * 
 * @see .kiro/specs/access-control-feature/design.md
 */

/// <reference types="@testing-library/jest-dom" />

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AccessControlFields } from '../../../components/AttendeeForm/AccessControlFields';
import type { AccessControlTimeMode } from '../../../lib/accessControlDates';

// Ensure cleanup after each test
afterEach(() => {
  cleanup();
});

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
 * **Feature: access-control-feature, Property 2: Access Control Field Visibility**
 * **Validates: Requirements 1.4, 1.5**
 * 
 * *For any* event settings configuration, the access control fields (validFrom,
 * validUntil, accessEnabled) SHALL be visible in the attendee form if and only
 * if `accessControlEnabled` is true.
 */
describe('Property 2: Access Control Field Visibility', () => {
  it('access control fields are visible if and only if accessControlEnabled is true', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (accessControlEnabled) => {
          cleanup();
          const props = createDefaultProps({ accessControlEnabled });

          render(<AccessControlFields {...props} />);

          // Look for the access control fields
          const validFromInput = screen.queryByTestId('valid-from-input');
          const validUntilInput = screen.queryByTestId('valid-until-input');
          const accessEnabledSelect = screen.queryByTestId('access-enabled-select');
          const accessControlCard = screen.queryByTestId('access-control-fields');

          if (accessControlEnabled) {
            // Fields should be visible when enabled
            expect(accessControlCard).not.toBeNull();
            expect(validFromInput).not.toBeNull();
            expect(validUntilInput).not.toBeNull();
            expect(accessEnabledSelect).not.toBeNull();
          } else {
            // Fields should NOT be visible when disabled
            expect(accessControlCard).toBeNull();
            expect(validFromInput).toBeNull();
            expect(validUntilInput).toBeNull();
            expect(accessEnabledSelect).toBeNull();
          }
          
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all three access control fields are present when enabled', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // Always enabled
        () => {
          cleanup();
          const props = createDefaultProps({ accessControlEnabled: true });

          const { unmount } = render(<AccessControlFields {...props} />);

          // All fields should be present
          expect(screen.getByTestId('valid-from-input')).toBeInTheDocument();
          expect(screen.getByTestId('valid-until-input')).toBeInTheDocument();
          expect(screen.getByTestId('access-enabled-select')).toBeInTheDocument();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('component returns null when accessControlEnabled is false', () => {
    fc.assert(
      fc.property(
        fc.constant(false), // Always disabled
        () => {
          cleanup();
          const props = createDefaultProps({ accessControlEnabled: false });

          const { container, unmount } = render(<AccessControlFields {...props} />);

          // Container should be empty
          expect(container.firstChild).toBeNull();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: access-control-feature, Property 5: Date Picker Type Based on Time Mode**
 * **Validates: Requirements 4.1, 4.2**
 * 
 * *For any* event with Access Control enabled, the date picker type for validFrom
 * and validUntil SHALL be date-only when `accessControlTimeMode` is 'date_only',
 * and date-time when `accessControlTimeMode` is 'date_time'.
 */
describe('Property 5: Date Picker Type Based on Time Mode', () => {
  it('date inputs have type="date" when time mode is date_only', () => {
    fc.assert(
      fc.property(
        fc.constant('date_only' as AccessControlTimeMode),
        (timeMode) => {
          cleanup();
          const props = createDefaultProps({
            accessControlEnabled: true,
            accessControlTimeMode: timeMode,
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          const validFromInput = screen.getByTestId('valid-from-input');
          const validUntilInput = screen.getByTestId('valid-until-input');

          expect(validFromInput).toHaveAttribute('type', 'date');
          expect(validUntilInput).toHaveAttribute('type', 'date');
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('date inputs have type="datetime-local" when time mode is date_time', () => {
    fc.assert(
      fc.property(
        fc.constant('date_time' as AccessControlTimeMode),
        (timeMode) => {
          cleanup();
          const props = createDefaultProps({
            accessControlEnabled: true,
            accessControlTimeMode: timeMode,
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          const validFromInput = screen.getByTestId('valid-from-input');
          const validUntilInput = screen.getByTestId('valid-until-input');

          expect(validFromInput).toHaveAttribute('type', 'datetime-local');
          expect(validUntilInput).toHaveAttribute('type', 'datetime-local');
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('input type changes correctly when time mode changes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('date_only', 'date_time') as fc.Arbitrary<AccessControlTimeMode>,
        (initialMode) => {
          cleanup();
          const props = createDefaultProps({
            accessControlEnabled: true,
            accessControlTimeMode: initialMode,
          });

          const { rerender, unmount } = render(<AccessControlFields {...props} />);

          // Check initial type
          const expectedInitialType = initialMode === 'date_only' ? 'date' : 'datetime-local';
          expect(screen.getByTestId('valid-from-input')).toHaveAttribute('type', expectedInitialType);
          expect(screen.getByTestId('valid-until-input')).toHaveAttribute('type', expectedInitialType);

          // Change time mode
          const newMode = initialMode === 'date_only' ? 'date_time' : 'date_only';
          rerender(<AccessControlFields {...props} accessControlTimeMode={newMode} />);

          // Check new type
          const expectedNewType = newMode === 'date_only' ? 'date' : 'datetime-local';
          expect(screen.getByTestId('valid-from-input')).toHaveAttribute('type', expectedNewType);
          expect(screen.getByTestId('valid-until-input')).toHaveAttribute('type', expectedNewType);
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('both validFrom and validUntil always have the same input type', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('date_only', 'date_time') as fc.Arbitrary<AccessControlTimeMode>,
        (timeMode) => {
          cleanup();
          const props = createDefaultProps({
            accessControlEnabled: true,
            accessControlTimeMode: timeMode,
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          const validFromInput = screen.getByTestId('valid-from-input');
          const validUntilInput = screen.getByTestId('valid-until-input');

          // Both inputs should have the same type
          expect(validFromInput.getAttribute('type')).toBe(validUntilInput.getAttribute('type'));
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: access-control-feature, Property 12: Date Validation**
 * **Validates: Requirements 8.1**
 * 
 * *For any* attendee record where both validFrom and validUntil are set,
 * if validFrom is after validUntil, the system SHALL display a validation error.
 */
describe('Property 12: Date Validation', () => {
  it('shows validation error when validFrom is after validUntil', () => {
    fc.assert(
      fc.property(
        // Generate a date in the past (filter out invalid dates)
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
          .filter(d => !isNaN(d.getTime())),
        // Generate a number of days to add (positive means validFrom > validUntil)
        fc.integer({ min: 1, max: 365 }),
        (baseDate, daysToAdd) => {
          cleanup();
          
          // Create validUntil as the base date
          const validUntil = baseDate.toISOString();
          
          // Create validFrom as a date AFTER validUntil (invalid)
          const validFromDate = new Date(baseDate);
          validFromDate.setDate(validFromDate.getDate() + daysToAdd);
          const validFrom = validFromDate.toISOString();

          const props = createDefaultProps({
            accessControlEnabled: true,
            validFrom,
            validUntil,
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          // Validation error should be visible
          const errorElement = screen.queryByTestId('date-validation-error');
          expect(errorElement).not.toBeNull();
          expect(errorElement).toHaveTextContent(/Valid From date must be before Valid Until date/i);
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not show validation error when validFrom is before validUntil', () => {
    fc.assert(
      fc.property(
        // Generate a date (filter out invalid dates)
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
          .filter(d => !isNaN(d.getTime())),
        // Generate a number of days to add (positive means validUntil > validFrom)
        fc.integer({ min: 1, max: 365 }),
        (baseDate, daysToAdd) => {
          cleanup();
          
          // Create validFrom as the base date
          const validFrom = baseDate.toISOString();
          
          // Create validUntil as a date AFTER validFrom (valid)
          const validUntilDate = new Date(baseDate);
          validUntilDate.setDate(validUntilDate.getDate() + daysToAdd);
          const validUntil = validUntilDate.toISOString();

          const props = createDefaultProps({
            accessControlEnabled: true,
            validFrom,
            validUntil,
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          // Validation error should NOT be visible
          const errorElement = screen.queryByTestId('date-validation-error');
          expect(errorElement).toBeNull();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not show validation error when validFrom is null', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
          .filter(d => !isNaN(d.getTime())),
        (validUntilDate) => {
          cleanup();
          
          const props = createDefaultProps({
            accessControlEnabled: true,
            validFrom: null,
            validUntil: validUntilDate.toISOString(),
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          // Validation error should NOT be visible
          const errorElement = screen.queryByTestId('date-validation-error');
          expect(errorElement).toBeNull();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not show validation error when validUntil is null', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
          .filter(d => !isNaN(d.getTime())),
        (validFromDate) => {
          cleanup();
          
          const props = createDefaultProps({
            accessControlEnabled: true,
            validFrom: validFromDate.toISOString(),
            validUntil: null,
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          // Validation error should NOT be visible
          const errorElement = screen.queryByTestId('date-validation-error');
          expect(errorElement).toBeNull();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not show validation error when both dates are null', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          cleanup();
          
          const props = createDefaultProps({
            accessControlEnabled: true,
            validFrom: null,
            validUntil: null,
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          // Validation error should NOT be visible
          const errorElement = screen.queryByTestId('date-validation-error');
          expect(errorElement).toBeNull();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not show validation error when validFrom equals validUntil', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
          .filter(d => !isNaN(d.getTime())), // Filter out invalid dates
        (date) => {
          cleanup();
          
          const isoDate = date.toISOString();
          const props = createDefaultProps({
            accessControlEnabled: true,
            validFrom: isoDate,
            validUntil: isoDate,
          });

          const { unmount } = render(<AccessControlFields {...props} />);

          // Validation error should NOT be visible (equal dates are valid)
          const errorElement = screen.queryByTestId('date-validation-error');
          expect(errorElement).toBeNull();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
