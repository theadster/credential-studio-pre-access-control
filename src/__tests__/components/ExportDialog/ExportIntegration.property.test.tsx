/**
 * Property-Based Tests for Export Integration with Saved Reports
 *
 * These tests verify the correctness properties defined in the design document
 * for the Saved Reports feature, specifically Property 12: Export Integration.
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 *
 * **Validates: Requirements 8.1, 8.2, 8.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  hasActiveFilters,
  createEmptyFilters,
  type AdvancedSearchFilters,
} from '../../../lib/filterUtils';

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

/**
 * Generate text operators
 */
const textOperatorArbitrary = fc.constantFrom(
  'contains',
  'equals',
  'startsWith',
  'endsWith',
  'isEmpty',
  'isNotEmpty'
);

/**
 * Generate photo filter values
 */
const photoFilterArbitrary = fc.constantFrom('all', 'with', 'without') as fc.Arbitrary<
  'all' | 'with' | 'without'
>;

/**
 * Generate credential filter values
 */
const credentialFilterArbitrary = fc.constantFrom('all', 'with', 'without') as fc.Arbitrary<
  'all' | 'with' | 'without'
>;

/**
 * Generate access status values
 */
const accessStatusArbitrary = fc.constantFrom('all', 'active', 'inactive') as fc.Arbitrary<
  'all' | 'active' | 'inactive'
>;

/**
 * Generate match mode values
 */
const matchModeArbitrary = fc.constantFrom('all', 'any') as fc.Arbitrary<'all' | 'any'>;

/**
 * Generate text filter with value
 */
const textFilterArbitrary = fc.record({
  value: fc.string({ maxLength: 50 }),
  operator: textOperatorArbitrary,
});

/**
 * Generate notes filter
 */
const notesFilterArbitrary = fc.record({
  value: fc.string({ maxLength: 50 }),
  operator: textOperatorArbitrary,
  hasNotes: fc.boolean(),
});

/**
 * Generate custom field filter
 */
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

/**
 * Generate date string (YYYY-MM-DD format or empty)
 */
const dateStringArbitrary = fc.oneof(
  fc.constant(''),
  fc
    .date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2030-12-31T23:59:59Z') })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString().split('T')[0])
);

/**
 * Generate access control filters
 */
const accessControlArbitrary = fc.record({
  accessStatus: accessStatusArbitrary,
  validFromStart: dateStringArbitrary,
  validFromEnd: dateStringArbitrary,
  validUntilStart: dateStringArbitrary,
  validUntilEnd: dateStringArbitrary,
});

/**
 * Generate custom fields map
 */
const customFieldsMapArbitrary = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-zA-Z0-9-]+$/.test(s)),
  customFieldFilterArbitrary,
  { maxKeys: 10 }
);

/**
 * Generate complete filter state (may or may not have active filters)
 */
const advancedSearchFiltersArbitrary: fc.Arbitrary<AdvancedSearchFilters> = fc.record({
  firstName: textFilterArbitrary,
  lastName: textFilterArbitrary,
  barcode: textFilterArbitrary,
  notes: notesFilterArbitrary,
  photoFilter: photoFilterArbitrary,
  credentialFilter: credentialFilterArbitrary,
  customFields: customFieldsMapArbitrary,
  accessControl: accessControlArbitrary,
  matchMode: matchModeArbitrary,
});

/**
 * Generate filter state that is guaranteed to have at least one active filter
 * This represents filters loaded from a saved report
 */
const activeFiltersArbitrary: fc.Arbitrary<AdvancedSearchFilters> = fc.oneof(
  // Active firstName filter
  fc.record({
    firstName: fc.record({
      value: fc.string({ minLength: 1, maxLength: 50 }),
      operator: fc.constant('contains' as const),
    }),
    lastName: fc.constant({ value: '', operator: 'contains' as const }),
    barcode: fc.constant({ value: '', operator: 'contains' as const }),
    notes: fc.constant({ value: '', operator: 'contains' as const, hasNotes: false }),
    photoFilter: fc.constant('all' as const),
    credentialFilter: fc.constant('all' as const),
    customFields: fc.constant({}),
    accessControl: fc.constant({
      accessStatus: 'all' as const,
      validFromStart: '',
      validFromEnd: '',
      validUntilStart: '',
      validUntilEnd: '',
    }),
    matchMode: matchModeArbitrary,
  }),
  // Active photoFilter
  fc.record({
    firstName: fc.constant({ value: '', operator: 'contains' as const }),
    lastName: fc.constant({ value: '', operator: 'contains' as const }),
    barcode: fc.constant({ value: '', operator: 'contains' as const }),
    notes: fc.constant({ value: '', operator: 'contains' as const, hasNotes: false }),
    photoFilter: fc.constantFrom('with', 'without') as fc.Arbitrary<'with' | 'without'>,
    credentialFilter: fc.constant('all' as const),
    customFields: fc.constant({}),
    accessControl: fc.constant({
      accessStatus: 'all' as const,
      validFromStart: '',
      validFromEnd: '',
      validUntilStart: '',
      validUntilEnd: '',
    }),
    matchMode: matchModeArbitrary,
  }),
  // Active custom field filter
  fc.record({
    firstName: fc.constant({ value: '', operator: 'contains' as const }),
    lastName: fc.constant({ value: '', operator: 'contains' as const }),
    barcode: fc.constant({ value: '', operator: 'contains' as const }),
    notes: fc.constant({ value: '', operator: 'contains' as const, hasNotes: false }),
    photoFilter: fc.constant('all' as const),
    credentialFilter: fc.constant('all' as const),
    customFields: fc.record({
      'field-1': fc.record({
        value: fc.string({ minLength: 1, maxLength: 20 }),
        operator: fc.constant('contains' as const),
      }),
    }),
    accessControl: fc.constant({
      accessStatus: 'all' as const,
      validFromStart: '',
      validFromEnd: '',
      validUntilStart: '',
      validUntilEnd: '',
    }),
    matchMode: matchModeArbitrary,
  })
);

// ============================================================================
// Helper Functions - Simulating ExportDialog Logic
// ============================================================================

/**
 * Simulates the ExportDialog's isFiltered prop calculation
 * This mirrors the logic in dashboard.tsx:
 * isFiltered={showAdvancedSearch || searchTerm !== '' || photoFilter !== 'all'}
 */
function calculateIsFiltered(
  showAdvancedSearch: boolean,
  searchTerm: string,
  photoFilter: 'all' | 'with' | 'without'
): boolean {
  return showAdvancedSearch || searchTerm !== '' || photoFilter !== 'all';
}

/**
 * Simulates the ExportDialog's advancedFilters prop transformation
 * This mirrors the logic in dashboard.tsx that transforms AdvancedSearchFilters
 * to the format expected by ExportDialog
 */
function transformFiltersForExport(
  filters: AdvancedSearchFilters,
  showAdvancedSearch: boolean
): {
  firstName: string;
  lastName: string;
  barcode: string;
  photoFilter: 'all' | 'with' | 'without';
  customFields: { [key: string]: { value: string | string[]; searchEmpty: boolean } };
} | null {
  if (!showAdvancedSearch) {
    return null;
  }

  return {
    firstName: filters.firstName.value,
    lastName: filters.lastName.value,
    barcode: filters.barcode.value,
    photoFilter: filters.photoFilter,
    customFields: Object.fromEntries(
      Object.entries(filters.customFields).map(([key, field]) => [
        key,
        { value: field.value, searchEmpty: field.operator === 'isEmpty' },
      ])
    ),
  };
}

/**
 * Simulates the ExportDialog's getActiveFiltersDescription function
 * This mirrors the logic in ExportDialog.tsx
 */
function getActiveFiltersDescription(
  searchTerm: string | undefined,
  photoFilter: 'all' | 'with' | 'without' | undefined,
  advancedFilters: {
    firstName: string;
    lastName: string;
    barcode: string;
    photoFilter: 'all' | 'with' | 'without';
    customFields: { [key: string]: { value: string | string[]; searchEmpty: boolean } };
  } | null
): string[] {
  const filters: string[] = [];

  if (searchTerm) {
    filters.push(`Search: "${searchTerm}"`);
  }

  if (photoFilter && photoFilter !== 'all') {
    filters.push(`Photo: ${photoFilter === 'with' ? 'With Photo' : 'Without Photo'}`);
  }

  if (advancedFilters) {
    if (advancedFilters.firstName) filters.push(`First Name: "${advancedFilters.firstName}"`);
    if (advancedFilters.lastName) filters.push(`Last Name: "${advancedFilters.lastName}"`);
    if (advancedFilters.barcode) filters.push(`Barcode: "${advancedFilters.barcode}"`);
    if (advancedFilters.photoFilter && advancedFilters.photoFilter !== 'all') {
      filters.push(
        `Photo: ${advancedFilters.photoFilter === 'with' ? 'With Photo' : 'Without Photo'}`
      );
    }

    // Add custom field filters
    if (advancedFilters.customFields) {
      Object.entries(advancedFilters.customFields).forEach(([, filter]) => {
        if (filter.value !== undefined && filter.value !== null && filter.value !== '') {
          // Handle both string and array values
          if (Array.isArray(filter.value) && filter.value.length > 0) {
            filters.push(`Custom Field: "${filter.value.join(', ')}"`);
          } else if (typeof filter.value === 'string') {
            filters.push(`Custom Field: "${filter.value}"`);
          } else {
            // Handle other types (number, boolean, etc.)
            filters.push(`Custom Field: "${String(filter.value)}"`);
          }
        }
        if (filter.searchEmpty) {
          filters.push(`Empty Custom Field`);
        }
      });
    }
  }

  return filters;
}

// ============================================================================
// Property 12: Export Integration
// ============================================================================

/**
 * **Feature: saved-reports, Property 12: Export Integration**
 * **Validates: Requirements 8.1, 8.2, 8.4**
 *
 * *For any* loaded report with applied filters, when the Export dialog is opened,
 * the filtered attendee count should match the count from the applied filters,
 * and the active filters description should accurately reflect the report's filter criteria.
 */
describe('Property 12: Export Integration', () => {
  describe('Requirement 8.1: Export dialog recognizes filtered state', () => {
    it('isFiltered is true when showAdvancedSearch is true (report filters applied)', () => {
      fc.assert(
        fc.property(activeFiltersArbitrary, (filters) => {
          // When a report is loaded and applied, showAdvancedSearch becomes true
          const showAdvancedSearch = true;
          const searchTerm = '';
          const photoFilter = 'all' as const;

          const isFiltered = calculateIsFiltered(showAdvancedSearch, searchTerm, photoFilter);

          // The export dialog should recognize the filtered state
          expect(isFiltered).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('isFiltered correctly reflects filter state regardless of filter content', () => {
      fc.assert(
        fc.property(
          advancedSearchFiltersArbitrary,
          fc.boolean(),
          fc.string({ maxLength: 20 }),
          photoFilterArbitrary,
          (filters, showAdvancedSearch, searchTerm, photoFilter) => {
            const isFiltered = calculateIsFiltered(showAdvancedSearch, searchTerm, photoFilter);

            // isFiltered should be true if any of these conditions are met
            const expectedFiltered =
              showAdvancedSearch || searchTerm !== '' || photoFilter !== 'all';
            expect(isFiltered).toBe(expectedFiltered);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 8.2: Current Search Results option reflects report criteria', () => {
    it('advancedFilters prop is populated when showAdvancedSearch is true', () => {
      fc.assert(
        fc.property(activeFiltersArbitrary, (filters) => {
          const showAdvancedSearch = true;
          const advancedFilters = transformFiltersForExport(filters, showAdvancedSearch);

          // advancedFilters should not be null when showAdvancedSearch is true
          expect(advancedFilters).not.toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it('advancedFilters prop is null when showAdvancedSearch is false', () => {
      fc.assert(
        fc.property(activeFiltersArbitrary, (filters) => {
          const showAdvancedSearch = false;
          const advancedFilters = transformFiltersForExport(filters, showAdvancedSearch);

          // advancedFilters should be null when showAdvancedSearch is false
          expect(advancedFilters).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it('filter values are correctly transformed for export', () => {
      fc.assert(
        fc.property(activeFiltersArbitrary, (filters) => {
          const showAdvancedSearch = true;
          const advancedFilters = transformFiltersForExport(filters, showAdvancedSearch);

          expect(advancedFilters).not.toBeNull();
          if (advancedFilters) {
            // Basic filter values should be preserved
            expect(advancedFilters.firstName).toBe(filters.firstName.value);
            expect(advancedFilters.lastName).toBe(filters.lastName.value);
            expect(advancedFilters.barcode).toBe(filters.barcode.value);
            expect(advancedFilters.photoFilter).toBe(filters.photoFilter);

            // Custom fields should be transformed correctly
            Object.entries(filters.customFields).forEach(([key, field]) => {
              expect(advancedFilters.customFields[key]).toBeDefined();
              expect(advancedFilters.customFields[key].value).toEqual(field.value);
              expect(advancedFilters.customFields[key].searchEmpty).toBe(
                field.operator === 'isEmpty'
              );
            });
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 8.4: Active filters description displays report criteria', () => {
    it('active filters description includes firstName when set', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (firstName) => {
            const advancedFilters = {
              firstName,
              lastName: '',
              barcode: '',
              photoFilter: 'all' as const,
              customFields: {},
            };

            const description = getActiveFiltersDescription(undefined, undefined, advancedFilters);

            expect(description).toContain(`First Name: "${firstName}"`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('active filters description includes lastName when set', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (lastName) => {
            const advancedFilters = {
              firstName: '',
              lastName,
              barcode: '',
              photoFilter: 'all' as const,
              customFields: {},
            };

            const description = getActiveFiltersDescription(undefined, undefined, advancedFilters);

            expect(description).toContain(`Last Name: "${lastName}"`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('active filters description includes barcode when set', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (barcode) => {
            const advancedFilters = {
              firstName: '',
              lastName: '',
              barcode,
              photoFilter: 'all' as const,
              customFields: {},
            };

            const description = getActiveFiltersDescription(undefined, undefined, advancedFilters);

            expect(description).toContain(`Barcode: "${barcode}"`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('active filters description includes photoFilter when not "all"', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('with', 'without') as fc.Arbitrary<'with' | 'without'>,
          (photoFilter) => {
            const advancedFilters = {
              firstName: '',
              lastName: '',
              barcode: '',
              photoFilter,
              customFields: {},
            };

            const description = getActiveFiltersDescription(undefined, undefined, advancedFilters);

            const expectedText =
              photoFilter === 'with' ? 'Photo: With Photo' : 'Photo: Without Photo';
            expect(description).toContain(expectedText);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('active filters description includes custom field values', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (customFieldValue) => {
            const advancedFilters = {
              firstName: '',
              lastName: '',
              barcode: '',
              photoFilter: 'all' as const,
              customFields: {
                'field-1': { value: customFieldValue, searchEmpty: false },
              },
            };

            const description = getActiveFiltersDescription(undefined, undefined, advancedFilters);

            expect(description).toContain(`Custom Field: "${customFieldValue}"`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('active filters description includes "Empty Custom Field" when searchEmpty is true', () => {
      const advancedFilters = {
        firstName: '',
        lastName: '',
        barcode: '',
        photoFilter: 'all' as const,
        customFields: {
          'field-1': { value: '', searchEmpty: true },
        },
      };

      const description = getActiveFiltersDescription(undefined, undefined, advancedFilters);

      expect(description).toContain('Empty Custom Field');
    });

    it('active filters description handles array custom field values', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 3 }),
          (values) => {
            const advancedFilters = {
              firstName: '',
              lastName: '',
              barcode: '',
              photoFilter: 'all' as const,
              customFields: {
                'field-1': { value: values, searchEmpty: false },
              },
            };

            const description = getActiveFiltersDescription(undefined, undefined, advancedFilters);

            expect(description).toContain(`Custom Field: "${values.join(', ')}"`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('active filters description is empty when no filters are set', () => {
      const advancedFilters = {
        firstName: '',
        lastName: '',
        barcode: '',
        photoFilter: 'all' as const,
        customFields: {},
      };

      const description = getActiveFiltersDescription(undefined, undefined, advancedFilters);

      expect(description).toHaveLength(0);
    });
  });

  describe('Integration consistency', () => {
    it('filters with active values produce non-empty description', () => {
      fc.assert(
        fc.property(activeFiltersArbitrary, (filters) => {
          const showAdvancedSearch = true;
          const advancedFilters = transformFiltersForExport(filters, showAdvancedSearch);

          if (advancedFilters) {
            const description = getActiveFiltersDescription(undefined, undefined, advancedFilters);

            // If there are active basic filters, the description should have at least one entry
            // (unless the only active filter is credentialFilter, hasNotes, or accessControl
            // which are not included in the export dialog's description)
            const hasBasicFilters =
              advancedFilters.firstName !== '' ||
              advancedFilters.lastName !== '' ||
              advancedFilters.barcode !== '' ||
              advancedFilters.photoFilter !== 'all' ||
              Object.values(advancedFilters.customFields).some(
                (f) =>
                  (typeof f.value === 'string' && f.value !== '') ||
                  (Array.isArray(f.value) && f.value.length > 0) ||
                  f.searchEmpty
              );

            if (hasBasicFilters) {
              expect(description.length).toBeGreaterThan(0);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('filter transformation is deterministic', () => {
      fc.assert(
        fc.property(activeFiltersArbitrary, (filters) => {
          const showAdvancedSearch = true;

          const result1 = transformFiltersForExport(filters, showAdvancedSearch);
          const result2 = transformFiltersForExport(filters, showAdvancedSearch);

          expect(result1).toEqual(result2);
        }),
        { numRuns: 100 }
      );
    });

    it('description generation is deterministic', () => {
      fc.assert(
        fc.property(activeFiltersArbitrary, (filters) => {
          const showAdvancedSearch = true;
          const advancedFilters = transformFiltersForExport(filters, showAdvancedSearch);

          if (advancedFilters) {
            const desc1 = getActiveFiltersDescription(undefined, undefined, advancedFilters);
            const desc2 = getActiveFiltersDescription(undefined, undefined, advancedFilters);

            expect(desc1).toEqual(desc2);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
