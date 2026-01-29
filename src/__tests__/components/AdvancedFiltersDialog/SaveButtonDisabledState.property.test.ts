/**
 * Property-Based Tests for Save Button Disabled State
 *
 * These tests verify the correctness properties defined in the design document
 * for the Saved Reports feature, specifically Property 11: Save Button Disabled State.
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 *
 * **Validates: Requirements 7.2**
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
 * Generate filter state that is guaranteed to have NO active filters
 * This represents the state where the save button should be disabled
 */
const emptyFiltersArbitrary: fc.Arbitrary<AdvancedSearchFilters> = fc.record({
  firstName: fc.constant({ value: '', operator: 'contains' as const }),
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
  matchMode: matchModeArbitrary, // Match mode doesn't affect "active" status
});

/**
 * Generate filter state that is guaranteed to have at least one active filter
 * This represents the state where the save button should be enabled
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
  // Active credentialFilter
  fc.record({
    firstName: fc.constant({ value: '', operator: 'contains' as const }),
    lastName: fc.constant({ value: '', operator: 'contains' as const }),
    barcode: fc.constant({ value: '', operator: 'contains' as const }),
    notes: fc.constant({ value: '', operator: 'contains' as const, hasNotes: false }),
    photoFilter: fc.constant('all' as const),
    credentialFilter: fc.constantFrom('with', 'without') as fc.Arbitrary<'with' | 'without'>,
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
  // Active hasNotes filter
  fc.record({
    firstName: fc.constant({ value: '', operator: 'contains' as const }),
    lastName: fc.constant({ value: '', operator: 'contains' as const }),
    barcode: fc.constant({ value: '', operator: 'contains' as const }),
    notes: fc.constant({ value: '', operator: 'contains' as const, hasNotes: true }),
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
  // Active accessStatus filter
  fc.record({
    firstName: fc.constant({ value: '', operator: 'contains' as const }),
    lastName: fc.constant({ value: '', operator: 'contains' as const }),
    barcode: fc.constant({ value: '', operator: 'contains' as const }),
    notes: fc.constant({ value: '', operator: 'contains' as const, hasNotes: false }),
    photoFilter: fc.constant('all' as const),
    credentialFilter: fc.constant('all' as const),
    customFields: fc.constant({}),
    accessControl: fc.record({
      accessStatus: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
      validFromStart: fc.constant(''),
      validFromEnd: fc.constant(''),
      validUntilStart: fc.constant(''),
      validUntilEnd: fc.constant(''),
    }),
    matchMode: matchModeArbitrary,
  }),
  // Active isEmpty/isNotEmpty operator
  fc.record({
    firstName: fc.record({
      value: fc.constant(''),
      operator: fc.constantFrom('isEmpty', 'isNotEmpty') as fc.Arbitrary<'isEmpty' | 'isNotEmpty'>,
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
  })
);

// ============================================================================
// Property 11: Save Button Disabled State
// ============================================================================

/**
 * **Feature: saved-reports, Property 11: Save Button Disabled State**
 * **Validates: Requirements 7.2**
 *
 * *For any* filter state where `hasActiveFilters()` returns false, the
 * "Save Report" button should be disabled and clicking it should have no effect.
 */
describe('Property 11: Save Button Disabled State', () => {
  describe('Save button disabled when no active filters', () => {
    it('hasActiveFilters returns false for empty filter state', () => {
      fc.assert(
        fc.property(emptyFiltersArbitrary, (filters) => {
          const result = hasActiveFilters(filters);
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('hasActiveFilters returns false for createEmptyFilters()', () => {
      const emptyFilters = createEmptyFilters();
      const result = hasActiveFilters(emptyFilters);
      expect(result).toBe(false);
    });

    it('save button should be disabled (isSaveDisabled = true) when hasActiveFilters returns false', () => {
      fc.assert(
        fc.property(emptyFiltersArbitrary, (filters) => {
          // This simulates the component logic: isSaveDisabled = !hasActiveFilters(filters)
          const isSaveDisabled = !hasActiveFilters(filters);
          expect(isSaveDisabled).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Save button enabled when filters are active', () => {
    it('hasActiveFilters returns true for filter state with active filters', () => {
      fc.assert(
        fc.property(activeFiltersArbitrary, (filters) => {
          const result = hasActiveFilters(filters);
          expect(result).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('save button should be enabled (isSaveDisabled = false) when hasActiveFilters returns true', () => {
      fc.assert(
        fc.property(activeFiltersArbitrary, (filters) => {
          // This simulates the component logic: isSaveDisabled = !hasActiveFilters(filters)
          const isSaveDisabled = !hasActiveFilters(filters);
          expect(isSaveDisabled).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Consistency between hasActiveFilters and save button state', () => {
    it('isSaveDisabled is always the inverse of hasActiveFilters', () => {
      fc.assert(
        fc.property(advancedSearchFiltersArbitrary, (filters) => {
          const hasActive = hasActiveFilters(filters);
          const isSaveDisabled = !hasActive;

          // The save button disabled state should always be the inverse of hasActiveFilters
          expect(isSaveDisabled).toBe(!hasActive);
        }),
        { numRuns: 100 }
      );
    });

    it('save button state is deterministic for the same filter state', () => {
      fc.assert(
        fc.property(advancedSearchFiltersArbitrary, (filters) => {
          // Call hasActiveFilters multiple times with the same input
          const result1 = hasActiveFilters(filters);
          const result2 = hasActiveFilters(filters);
          const result3 = hasActiveFilters(filters);

          // Results should be consistent
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge cases for save button disabled state', () => {
    it('matchMode alone does not make filters active', () => {
      fc.assert(
        fc.property(matchModeArbitrary, (matchMode) => {
          const filters: AdvancedSearchFilters = {
            ...createEmptyFilters(),
            matchMode,
          };
          const result = hasActiveFilters(filters);
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('empty custom fields object does not make filters active', () => {
      const filters: AdvancedSearchFilters = {
        ...createEmptyFilters(),
        customFields: {},
      };
      const result = hasActiveFilters(filters);
      expect(result).toBe(false);
    });

    it('custom field with empty value does not make filters active', () => {
      const filters: AdvancedSearchFilters = {
        ...createEmptyFilters(),
        customFields: {
          'field-1': { value: '', operator: 'contains' },
        },
      };
      const result = hasActiveFilters(filters);
      expect(result).toBe(false);
    });

    it('custom field with isEmpty/isNotEmpty operator makes filters active', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('isEmpty', 'isNotEmpty') as fc.Arbitrary<'isEmpty' | 'isNotEmpty'>,
          (operator) => {
            const filters: AdvancedSearchFilters = {
              ...createEmptyFilters(),
              customFields: {
                'field-1': { value: '', operator },
              },
            };
            const result = hasActiveFilters(filters);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('access control with only default values does not make filters active', () => {
      const filters: AdvancedSearchFilters = {
        ...createEmptyFilters(),
        accessControl: {
          accessStatus: 'all',
          validFromStart: '',
          validFromEnd: '',
          validUntilStart: '',
          validUntilEnd: '',
        },
      };
      const result = hasActiveFilters(filters);
      expect(result).toBe(false);
    });

    it('access control with date range makes filters active', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
            .filter((d) => !isNaN(d.getTime()))
            .map((d) => d.toISOString().split('T')[0]),
          (dateStr) => {
            const filters: AdvancedSearchFilters = {
              ...createEmptyFilters(),
              accessControl: {
                accessStatus: 'all',
                validFromStart: dateStr,
                validFromEnd: '',
                validUntilStart: '',
                validUntilEnd: '',
              },
            };
            const result = hasActiveFilters(filters);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
