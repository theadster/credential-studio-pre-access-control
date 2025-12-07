/**
 * Property-Based Tests for AccessControlTab Component
 * 
 * These tests verify the correctness properties defined in the design document
 * for the access control configuration feature.
 * 
 * @see .kiro/specs/access-control-feature/design.md
 */

/// <reference types="@testing-library/jest-dom" />

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AccessControlTab } from '../../../components/EventSettingsForm/AccessControlTab';
import type { EventSettings, AccessControlTimeMode } from '../../../components/EventSettingsForm/types';

// Ensure cleanup after each test
afterEach(() => {
  cleanup();
});

// Helper to create minimal form data for testing
const createFormData = (overrides: Partial<EventSettings> = {}): EventSettings => ({
  eventName: 'Test Event',
  eventDate: '2025-01-01',
  eventLocation: 'Test Location',
  timeZone: 'America/Los_Angeles',
  barcodeType: 'alphanumerical',
  barcodeLength: 8,
  barcodeUnique: true,
  accessControlEnabled: false,
  accessControlTimeMode: 'date_only',
  ...overrides,
});

/**
 * **Feature: access-control-feature, Property 3: Warning Notice Visibility**
 * **Validates: Requirements 2.1, 2.4**
 * 
 * *For any* event settings configuration, the hardware warning notice SHALL be
 * visible if and only if `accessControlEnabled` is true.
 */
describe('Property 3: Warning Notice Visibility', () => {
  it('warning notice is visible if and only if accessControlEnabled is true', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (accessControlEnabled) => {
          cleanup(); // Clean up before each iteration
          const mockOnInputChange = vi.fn();
          const formData = createFormData({ accessControlEnabled });

          render(
            <AccessControlTab
              formData={formData}
              onInputChange={mockOnInputChange}
            />
          );

          // Look for the warning alert by its distinctive text
          const warningText = screen.queryByText(/Advanced Feature/i);
          const hardwareText = screen.queryByText(/additional hardware/i);

          if (accessControlEnabled) {
            // Warning should be visible when enabled
            expect(warningText).not.toBeNull();
            expect(hardwareText).not.toBeNull();
          } else {
            // Warning should NOT be visible when disabled
            expect(warningText).toBeNull();
            expect(hardwareText).toBeNull();
          }
          
          cleanup(); // Clean up after each iteration
        }
      ),
      { numRuns: 100 }
    );
  });

  it('warning notice appears immediately when toggle is enabled', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // Always start with disabled
        () => {
          cleanup();
          const mockOnInputChange = vi.fn();
          
          // Start with access control disabled
          const { rerender, unmount } = render(
            <AccessControlTab
              formData={createFormData({ accessControlEnabled: false })}
              onInputChange={mockOnInputChange}
            />
          );

          // Warning should not be visible initially
          expect(screen.queryByText(/Advanced Feature/i)).toBeNull();

          // Re-render with access control enabled
          rerender(
            <AccessControlTab
              formData={createFormData({ accessControlEnabled: true })}
              onInputChange={mockOnInputChange}
            />
          );

          // Warning should now be visible
          expect(screen.queryByText(/Advanced Feature/i)).not.toBeNull();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('warning notice disappears immediately when toggle is disabled', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // Always start with enabled
        () => {
          cleanup();
          const mockOnInputChange = vi.fn();
          
          // Start with access control enabled
          const { rerender, unmount } = render(
            <AccessControlTab
              formData={createFormData({ accessControlEnabled: true })}
              onInputChange={mockOnInputChange}
            />
          );

          // Warning should be visible initially
          expect(screen.queryByText(/Advanced Feature/i)).not.toBeNull();

          // Re-render with access control disabled
          rerender(
            <AccessControlTab
              formData={createFormData({ accessControlEnabled: false })}
              onInputChange={mockOnInputChange}
            />
          );

          // Warning should now be hidden
          expect(screen.queryByText(/Advanced Feature/i)).toBeNull();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: access-control-feature, Property 1: Access Control Toggle State Persistence**
 * **Validates: Requirements 1.2, 1.3**
 * 
 * *For any* toggle state (enabled or disabled), when the administrator changes
 * the Access Control toggle, the stored `accessControlEnabled` value SHALL
 * equal the toggle state.
 */
describe('Property 1: Access Control Toggle State Persistence', () => {
  it('toggle change calls onInputChange with correct boolean value', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (initialState) => {
          cleanup();
          const mockOnInputChange = vi.fn();
          const formData = createFormData({ accessControlEnabled: initialState });

          const { unmount } = render(
            <AccessControlTab
              formData={formData}
              onInputChange={mockOnInputChange}
            />
          );

          // Find and click the toggle switch
          const toggle = screen.getByRole('switch');
          fireEvent.click(toggle);

          // Verify onInputChange was called with the opposite state
          expect(mockOnInputChange).toHaveBeenCalledWith(
            'accessControlEnabled',
            !initialState
          );
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('toggle reflects the current accessControlEnabled state', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (accessControlEnabled) => {
          cleanup();
          const mockOnInputChange = vi.fn();
          const formData = createFormData({ accessControlEnabled });

          const { unmount } = render(
            <AccessControlTab
              formData={formData}
              onInputChange={mockOnInputChange}
            />
          );

          const toggle = screen.getByRole('switch');
          
          // Check the aria-checked attribute matches the state
          if (accessControlEnabled) {
            expect(toggle).toHaveAttribute('data-state', 'checked');
          } else {
            expect(toggle).toHaveAttribute('data-state', 'unchecked');
          }
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple toggle clicks produce alternating values', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 1, max: 10 }),
        (initialState, clickCount) => {
          cleanup();
          const mockOnInputChange = vi.fn();
          let currentState = initialState;
          
          const { rerender, unmount } = render(
            <AccessControlTab
              formData={createFormData({ accessControlEnabled: currentState })}
              onInputChange={mockOnInputChange}
            />
          );

          for (let i = 0; i < clickCount; i++) {
            const toggle = screen.getByRole('switch');
            fireEvent.click(toggle);
            
            // Verify the call was made with the opposite of current state
            expect(mockOnInputChange).toHaveBeenLastCalledWith(
              'accessControlEnabled',
              !currentState
            );
            
            // Update current state for next iteration
            currentState = !currentState;
            
            // Re-render with new state
            rerender(
              <AccessControlTab
                formData={createFormData({ accessControlEnabled: currentState })}
                onInputChange={mockOnInputChange}
              />
            );
          }

          // Total calls should equal click count
          expect(mockOnInputChange).toHaveBeenCalledTimes(clickCount);
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: access-control-feature, Property 4: Time Mode Storage**
 * **Validates: Requirements 3.2, 3.3**
 * 
 * *For any* time mode selection ("Date only" or "Date and time"), the stored
 * `accessControlTimeMode` value SHALL equal 'date_only' or 'date_time' respectively.
 */
describe('Property 4: Time Mode Storage', () => {
  it('time mode selector is visible only when access control is enabled', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (accessControlEnabled) => {
          cleanup();
          const mockOnInputChange = vi.fn();
          const formData = createFormData({ accessControlEnabled });

          const { unmount } = render(
            <AccessControlTab
              formData={formData}
              onInputChange={mockOnInputChange}
            />
          );

          const timeModeLabel = screen.queryByText(/Time Mode/i);
          const dateOnlyOption = screen.queryByText(/^Date only$/i);
          const dateTimeOption = screen.queryByText(/^Date and time$/i);

          if (accessControlEnabled) {
            // Time mode selector should be visible when enabled
            expect(timeModeLabel).not.toBeNull();
            expect(dateOnlyOption).not.toBeNull();
            expect(dateTimeOption).not.toBeNull();
          } else {
            // Time mode selector should NOT be visible when disabled
            expect(timeModeLabel).toBeNull();
            expect(dateOnlyOption).toBeNull();
            expect(dateTimeOption).toBeNull();
          }
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('selecting date_only mode calls onInputChange with date_only when switching from date_time', () => {
    fc.assert(
      fc.property(
        fc.constant('date_time' as AccessControlTimeMode), // Always start with date_time
        (initialMode) => {
          cleanup();
          const mockOnInputChange = vi.fn();
          const formData = createFormData({
            accessControlEnabled: true,
            accessControlTimeMode: initialMode,
          });

          const { unmount } = render(
            <AccessControlTab
              formData={formData}
              onInputChange={mockOnInputChange}
            />
          );

          // Find the date_only radio button by its id
          const dateOnlyRadio = screen.getByRole('radio', { name: /Date only/i });
          fireEvent.click(dateOnlyRadio);

          // Verify onInputChange was called with 'date_only'
          expect(mockOnInputChange).toHaveBeenCalledWith(
            'accessControlTimeMode',
            'date_only'
          );
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('selecting date_time mode calls onInputChange with date_time when switching from date_only', () => {
    fc.assert(
      fc.property(
        fc.constant('date_only' as AccessControlTimeMode), // Always start with date_only
        (initialMode) => {
          cleanup();
          const mockOnInputChange = vi.fn();
          const formData = createFormData({
            accessControlEnabled: true,
            accessControlTimeMode: initialMode,
          });

          const { unmount } = render(
            <AccessControlTab
              formData={formData}
              onInputChange={mockOnInputChange}
            />
          );

          // Find the date_time radio button by its role and name
          const dateTimeRadio = screen.getByRole('radio', { name: /Date and time/i });
          fireEvent.click(dateTimeRadio);

          // Verify onInputChange was called with 'date_time'
          expect(mockOnInputChange).toHaveBeenCalledWith(
            'accessControlTimeMode',
            'date_time'
          );
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clicking already selected radio does not trigger onInputChange', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('date_only', 'date_time') as fc.Arbitrary<AccessControlTimeMode>,
        (currentMode) => {
          cleanup();
          const mockOnInputChange = vi.fn();
          const formData = createFormData({
            accessControlEnabled: true,
            accessControlTimeMode: currentMode,
          });

          const { unmount } = render(
            <AccessControlTab
              formData={formData}
              onInputChange={mockOnInputChange}
            />
          );

          // Click on the already selected radio
          const radioName = currentMode === 'date_only' ? /Date only/i : /Date and time/i;
          const selectedRadio = screen.getByRole('radio', { name: radioName });
          fireEvent.click(selectedRadio);

          // onInputChange should NOT be called when clicking already selected option
          const timeModeChangeCalls = mockOnInputChange.mock.calls.filter(
            call => call[0] === 'accessControlTimeMode'
          );
          expect(timeModeChangeCalls.length).toBe(0);
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('time mode radio reflects the current accessControlTimeMode state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('date_only', 'date_time') as fc.Arbitrary<AccessControlTimeMode>,
        (timeMode) => {
          cleanup();
          const mockOnInputChange = vi.fn();
          const formData = createFormData({
            accessControlEnabled: true,
            accessControlTimeMode: timeMode,
          });

          const { unmount } = render(
            <AccessControlTab
              formData={formData}
              onInputChange={mockOnInputChange}
            />
          );

          const dateOnlyRadio = screen.getByRole('radio', { name: /Date only/i });
          const dateTimeRadio = screen.getByRole('radio', { name: /Date and time/i });

          if (timeMode === 'date_only') {
            expect(dateOnlyRadio).toHaveAttribute('data-state', 'checked');
            expect(dateTimeRadio).toHaveAttribute('data-state', 'unchecked');
          } else {
            expect(dateOnlyRadio).toHaveAttribute('data-state', 'unchecked');
            expect(dateTimeRadio).toHaveAttribute('data-state', 'checked');
          }
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('time mode value is always one of the valid enum values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('date_only', 'date_time') as fc.Arbitrary<AccessControlTimeMode>,
        (initialMode) => {
          cleanup();
          const mockOnInputChange = vi.fn();
          const formData = createFormData({
            accessControlEnabled: true,
            accessControlTimeMode: initialMode,
          });

          const { unmount } = render(
            <AccessControlTab
              formData={formData}
              onInputChange={mockOnInputChange}
            />
          );

          // Click both radio buttons
          const dateOnlyRadio = screen.getByRole('radio', { name: /Date only/i });
          const dateTimeRadio = screen.getByRole('radio', { name: /Date and time/i });
          
          fireEvent.click(dateOnlyRadio);
          fireEvent.click(dateTimeRadio);

          // All calls should have valid enum values
          const calls = mockOnInputChange.mock.calls.filter(
            call => call[0] === 'accessControlTimeMode'
          );
          
          expect(calls.length).toBeGreaterThan(0);
          calls.forEach(call => {
            expect(['date_only', 'date_time']).toContain(call[1]);
          });
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
