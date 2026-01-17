/**
 * Property-Based Tests for Filter Change Reactivity
 *
 * **Feature: advanced-filters-redesign, Property 4: Filter Change Reactivity**
 * **Validates: Requirements 2.3, 2.7, 4.3**
 *
 * *For any* filter change operation (value change, operator change, or chip removal),
 * the component SHALL emit the updated filter state through the onFiltersChange callback,
 * and the Active_Filters_Bar SHALL immediately reflect the new state.
 *
 * @see .kiro/specs/advanced-filters-redesign/design.md
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { AdvancedFiltersDialog } from '../../../components/AdvancedFiltersDialog';
import {
  type AdvancedSearchFilters,
  createEmptyFilters,
  filtersToChips,
  hasActiveFilters,
} from '../../../lib/filterUtils';
import type { EventSettings } from '../../../components/EventSettingsForm/types';

// Arbitrary for text operators
const textOperatorArbitrary = fc.constantFrom(
  'contains',
  'equals',
  'startsWith',
  'endsWith',
  'isEmpty',
  'isNotEmpty'
);

// Arbitrary for photo filter values
const photoFilterArbitrary = fc.constantFrom('all', 'with', 'without') as fc.Arbitrary<
  'all' | 'with' | 'without'
>;

// Arbitrary for access status values
const accessStatusArbitrary = fc.constantFrom('all', 'active', 'inactive') as fc.Arbitrary<
  'all' | 'active' | 'inactive'
>;

// Arbitrary for text filter
const textFilterArbitrary = fc.record({
  value: fc.string({ maxLength: 50 }),
  operator: textOperatorArbitrary,
});

// Arbitrary for notes filter
const notesFilterArbitrary = fc.record({
  value: fc.string({ maxLength: 50 }),
  operator: textOperatorArbitrary,
  hasNotes: fc.boolean(),
});

// Arbitrary for custom field filter
const customFieldFilterArbitrary = fc.oneof(
  fc.record({
    value: fc.string({ maxLength: 50 }),
    operator: textOperatorArbitrary,
  }),
  fc.record({
    value: fc.array(fc.string({ maxLength: 20 }), { maxLength: 5 }),
    operator: fc.constant('contains'),
  })
);

// Arbitrary for date string (YYYY-MM-DD format or empty)
const dateStringArbitrary = fc.oneof(
  fc.constant(''),
  fc
    .date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2030-12-31T23:59:59Z') })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString().split('T')[0])
);

// Arbitrary for access control filters
const accessControlArbitrary = fc.record({
  accessStatus: accessStatusArbitrary,
  validFromStart: dateStringArbitrary,
  validFromEnd: dateStringArbitrary,
  validUntilStart: dateStringArbitrary,
  validUntilEnd: dateStringArbitrary,
});

// Arbitrary for custom fields map
const customFieldsMapArbitrary = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-zA-Z0-9-]+$/.test(s)),
  customFieldFilterArbitrary,
  { maxKeys: 5 }
);

// Arbitrary for complete filter state
const advancedSearchFiltersArbitrary: fc.Arbitrary<AdvancedSearchFilters> = fc.record({
  firstName: textFilterArbitrary,
  lastName: textFilterArbitrary,
  barcode: textFilterArbitrary,
  notes: notesFilterArbitrary,
  photoFilter: photoFilterArbitrary,
  customFields: customFieldsMapArbitrary,
  accessControl: accessControlArbitrary,
});

// Minimal event settings for testing
const minimalEventSettings: EventSettings = {
  eventName: 'Test Event',
  eventDate: '2025-01-01',
  eventLocation: 'Test Location',
  timeZone: 'UTC',
  barcodeType: 'numerical',
  barcodeLength: 8,
  barcodeUnique: true,
  accessControlEnabled: true,
  customFields: [],
};

/**
 * Helper to create filter state with at least one active filter
 */
function createActiveFilterState(): AdvancedSearchFilters {
  return {
    ...createEmptyFilters(),
    firstName: { value: 'John', operator: 'contains' },
  };
}

/**
 * Helper to apply a filter change and return the expected new state
 */
function applyFilterChange(
  filters: AdvancedSearchFilters,
  changeType: 'firstName' | 'lastName' | 'barcode' | 'photoFilter' | 'notes' | 'accessStatus',
  newValue: string
): AdvancedSearchFilters {
  const newFilters = { ...filters };

  switch (changeType) {
    case 'firstName':
      newFilters.firstName = { ...newFilters.firstName, value: newValue };
      break;
    case 'lastName':
      newFilters.lastName = { ...newFilters.lastName, value: newValue };
      break;
    case 'barcode':
      newFilters.barcode = { ...newFilters.barcode, value: newValue };
      break;
    case 'photoFilter':
      newFilters.photoFilter = newValue as 'all' | 'with' | 'without';
      break;
    case 'notes':
      newFilters.notes = { ...newFilters.notes, value: newValue };
      break;
    case 'accessStatus':
      newFilters.accessControl = {
        ...newFilters.accessControl,
        accessStatus: newValue as 'all' | 'active' | 'inactive',
      };
      break;
  }

  return newFilters;
}

describe('Property 4: Filter Change Reactivity', () => {
  // Cleanup after each test to prevent DOM pollution
  afterEach(() => {
    cleanup();
  });

  /**
   * Property: For any filter state, applying a change should result in
   * onFiltersChange being called with the updated state
   */
  it('onFiltersChange is called when filter value changes', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        (newValue) => {
          const initialFilters = createEmptyFilters();
          const onFiltersChange = vi.fn();
          const onApply = vi.fn();
          const onClear = vi.fn();
          const onOpenChange = vi.fn();

          const { unmount } = render(
            <AdvancedFiltersDialog
              eventSettings={minimalEventSettings}
              filters={initialFilters}
              onFiltersChange={onFiltersChange}
              onApply={onApply}
              onClear={onClear}
              open={true}
              onOpenChange={onOpenChange}
            />
          );

          // Find the first name input by its specific ID
          const firstNameInput = document.getElementById('filter-firstName-value') as HTMLInputElement;
          expect(firstNameInput).toBeTruthy();
          
          fireEvent.change(firstNameInput, { target: { value: newValue } });

          // Verify onFiltersChange was called
          expect(onFiltersChange).toHaveBeenCalled();

          // Verify the new filter state contains the updated value
          const lastCall = onFiltersChange.mock.calls[onFiltersChange.mock.calls.length - 1][0];
          expect(lastCall.firstName.value).toBe(newValue);

          // Cleanup to prevent multiple elements issue
          unmount();
        }
      ),
      { numRuns: 20 } // Reduced runs due to DOM rendering overhead
    );
  });

  /**
   * Property: For any filter state with active filters, the chip count
   * should match the number of active filters
   */
  it('Active filters bar chip count matches active filter count', () => {
    fc.assert(
      fc.property(advancedSearchFiltersArbitrary, (filters) => {
        const chips = filtersToChips(filters, minimalEventSettings);
        const hasActive = hasActiveFilters(filters);

        // If there are active filters, chips should be non-empty
        // If no active filters, chips should be empty
        if (hasActive) {
          expect(chips.length).toBeGreaterThan(0);
        } else {
          expect(chips.length).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Removing a filter should result in one fewer active filter
   */
  it('removing a filter decreases active filter count by one', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('firstName', 'lastName', 'barcode') as fc.Arbitrary<
          'firstName' | 'lastName' | 'barcode'
        >,
        fc.string({ minLength: 1, maxLength: 20 }),
        (filterKey, value) => {
          // Create a filter state with the specified filter active
          const filters: AdvancedSearchFilters = {
            ...createEmptyFilters(),
            [filterKey]: { value, operator: 'contains' },
          };

          const chipsBefore = filtersToChips(filters, minimalEventSettings);

          // Simulate removing the filter
          const filtersAfter: AdvancedSearchFilters = {
            ...filters,
            [filterKey]: { value: '', operator: 'contains' },
          };

          const chipsAfter = filtersToChips(filtersAfter, minimalEventSettings);

          // Should have one fewer chip
          expect(chipsAfter.length).toBe(chipsBefore.length - 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Clear all should result in zero active filters
   */
  it('clear all results in zero active filters', () => {
    fc.assert(
      fc.property(advancedSearchFiltersArbitrary, (filters) => {
        // Apply clear all (reset to empty filters)
        const clearedFilters = createEmptyFilters();

        const hasActive = hasActiveFilters(clearedFilters);
        const chips = filtersToChips(clearedFilters, minimalEventSettings);

        expect(hasActive).toBe(false);
        expect(chips.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Changing operator to isEmpty/isNotEmpty should make filter active
   * even with empty value
   */
  it('isEmpty/isNotEmpty operators make filter active without value', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('isEmpty', 'isNotEmpty'),
        fc.constantFrom('firstName', 'lastName', 'barcode') as fc.Arbitrary<
          'firstName' | 'lastName' | 'barcode'
        >,
        (operator, filterKey) => {
          const filters: AdvancedSearchFilters = {
            ...createEmptyFilters(),
            [filterKey]: { value: '', operator },
          };

          const hasActive = hasActiveFilters(filters);
          const chips = filtersToChips(filters, minimalEventSettings);

          expect(hasActive).toBe(true);
          expect(chips.length).toBe(1);
          expect(chips[0].filterKey).toBe(filterKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Photo filter change should be reflected in chips
   */
  it('photo filter changes are reflected in chips', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('with', 'without') as fc.Arbitrary<'with' | 'without'>,
        (photoValue) => {
          const filters: AdvancedSearchFilters = {
            ...createEmptyFilters(),
            photoFilter: photoValue,
          };

          const chips = filtersToChips(filters, minimalEventSettings);

          expect(chips.length).toBe(1);
          expect(chips[0].filterKey).toBe('photoFilter');
          expect(chips[0].label).toBe('Photo');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Access status filter change should be reflected in chips
   */
  it('access status changes are reflected in chips', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
        (statusValue) => {
          const filters: AdvancedSearchFilters = {
            ...createEmptyFilters(),
            accessControl: {
              ...createEmptyFilters().accessControl,
              accessStatus: statusValue,
            },
          };

          const chips = filtersToChips(filters, minimalEventSettings);

          expect(chips.length).toBe(1);
          expect(chips[0].filterKey).toBe('accessStatus');
          expect(chips[0].label).toBe('Access Status');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Notes hasNotes checkbox should create a separate chip
   */
  it('hasNotes checkbox creates a separate chip', () => {
    fc.assert(
      fc.property(fc.boolean(), (hasNotes) => {
        const filters: AdvancedSearchFilters = {
          ...createEmptyFilters(),
          notes: {
            ...createEmptyFilters().notes,
            hasNotes,
          },
        };

        const chips = filtersToChips(filters, minimalEventSettings);

        if (hasNotes) {
          expect(chips.length).toBe(1);
          expect(chips[0].filterKey).toBe('hasNotes');
          expect(chips[0].label).toBe('Has Notes');
        } else {
          expect(chips.length).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple filter changes should accumulate correctly
   */
  it('multiple filter changes accumulate correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.constantFrom('with', 'without') as fc.Arbitrary<'with' | 'without'>,
        (firstName, lastName, photoFilter) => {
          const filters: AdvancedSearchFilters = {
            ...createEmptyFilters(),
            firstName: { value: firstName, operator: 'contains' },
            lastName: { value: lastName, operator: 'contains' },
            photoFilter,
          };

          const chips = filtersToChips(filters, minimalEventSettings);

          // Should have exactly 3 chips
          expect(chips.length).toBe(3);

          // Verify each filter is represented
          const filterKeys = chips.map((c) => c.filterKey);
          expect(filterKeys).toContain('firstName');
          expect(filterKeys).toContain('lastName');
          expect(filterKeys).toContain('photoFilter');
        }
      ),
      { numRuns: 100 }
    );
  });
});
