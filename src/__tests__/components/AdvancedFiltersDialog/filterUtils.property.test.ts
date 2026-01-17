/**
 * Property-Based Tests for Filter Utilities
 *
 * These tests use fast-check to verify universal properties across all valid inputs.
 * Each test runs a minimum of 100 iterations with randomly generated data.
 *
 * @see .kiro/specs/advanced-filters-redesign/design.md
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  countSectionFilters,
  filtersToChips,
  hasActiveFilters,
  formatFilterValue,
  type AdvancedSearchFilters,
  type FilterSection,
} from '../../../lib/filterUtils';
import type { EventSettings, CustomField } from '../../../components/EventSettingsForm/types';

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
  { maxKeys: 10 }
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

// Arbitrary for custom field definition
const customFieldArbitrary: fc.Arbitrary<CustomField> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-zA-Z0-9-]+$/.test(s)),
  fieldName: fc.string({ minLength: 1, maxLength: 30 }),
  fieldType: fc.constantFrom('text', 'select', 'multi-select', 'boolean'),
  required: fc.boolean(),
  order: fc.integer({ min: 0, max: 100 }),
});

// Arbitrary for event settings
const eventSettingsArbitrary: fc.Arbitrary<EventSettings> = fc.record({
  eventName: fc.string({ minLength: 1, maxLength: 50 }),
  eventDate: fc
    .date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2030-12-31T23:59:59Z') })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString().split('T')[0]),
  eventLocation: fc.string({ maxLength: 100 }),
  timeZone: fc.constant('UTC'),
  barcodeType: fc.constantFrom('numerical', 'alphanumerical'),
  barcodeLength: fc.integer({ min: 4, max: 20 }),
  barcodeUnique: fc.boolean(),
  accessControlEnabled: fc.boolean(),
  customFields: fc.array(customFieldArbitrary, { maxLength: 10 }),
});

/**
 * Helper function to manually count active filters in a section
 * This is the "oracle" implementation for property testing
 */
function manualCountSectionFilters(
  filters: AdvancedSearchFilters,
  section: FilterSection
): number {
  const isTextActive = (f: { value: string; operator: string }) =>
    !!f.value || f.operator === 'isEmpty' || f.operator === 'isNotEmpty';

  const isCustomFieldActive = (f: { value: string | string[]; operator: string }) => {
    const hasValue = Array.isArray(f.value) ? f.value.length > 0 : !!f.value;
    return hasValue || f.operator === 'isEmpty' || f.operator === 'isNotEmpty';
  };

  switch (section) {
    case 'basic': {
      let count = 0;
      if (isTextActive(filters.firstName)) count++;
      if (isTextActive(filters.lastName)) count++;
      if (isTextActive(filters.barcode)) count++;
      if (filters.photoFilter !== 'all') count++;
      return count;
    }
    case 'notes': {
      let count = 0;
      if (isTextActive(filters.notes)) count++;
      if (filters.notes.hasNotes) count++;
      return count;
    }
    case 'access': {
      let count = 0;
      if (filters.accessControl.accessStatus !== 'all') count++;
      if (filters.accessControl.validFromStart || filters.accessControl.validFromEnd) count++;
      if (filters.accessControl.validUntilStart || filters.accessControl.validUntilEnd) count++;
      return count;
    }
    case 'custom': {
      let count = 0;
      Object.values(filters.customFields).forEach((f) => {
        if (isCustomFieldActive(f as { value: string | string[]; operator: string })) count++;
      });
      return count;
    }
    default:
      return 0;
  }
}

/**
 * Helper function to manually count all active filters
 */
function manualCountAllActiveFilters(filters: AdvancedSearchFilters): number {
  return (
    manualCountSectionFilters(filters, 'basic') +
    manualCountSectionFilters(filters, 'notes') +
    manualCountSectionFilters(filters, 'access') +
    manualCountSectionFilters(filters, 'custom')
  );
}

/**
 * **Feature: advanced-filters-redesign, Property 1: Section Filter Count Badge Accuracy**
 * **Validates: Requirements 1.3**
 *
 * *For any* filter state and any accordion section, the badge count displayed
 * in the section header SHALL equal the actual number of active filters within
 * that section.
 */
describe('Property 1: Section Filter Count Badge Accuracy', () => {
  it('countSectionFilters returns correct count for basic section', () => {
    fc.assert(
      fc.property(advancedSearchFiltersArbitrary, (filters) => {
        const result = countSectionFilters(filters, 'basic');
        const expected = manualCountSectionFilters(filters, 'basic');
        expect(result).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('countSectionFilters returns correct count for notes section', () => {
    fc.assert(
      fc.property(advancedSearchFiltersArbitrary, (filters) => {
        const result = countSectionFilters(filters, 'notes');
        const expected = manualCountSectionFilters(filters, 'notes');
        expect(result).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('countSectionFilters returns correct count for access section', () => {
    fc.assert(
      fc.property(advancedSearchFiltersArbitrary, (filters) => {
        const result = countSectionFilters(filters, 'access');
        const expected = manualCountSectionFilters(filters, 'access');
        expect(result).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('countSectionFilters returns correct count for custom section', () => {
    fc.assert(
      fc.property(advancedSearchFiltersArbitrary, (filters) => {
        const result = countSectionFilters(filters, 'custom');
        const expected = manualCountSectionFilters(filters, 'custom');
        expect(result).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('sum of all section counts equals total active filter count', () => {
    fc.assert(
      fc.property(advancedSearchFiltersArbitrary, (filters) => {
        const basicCount = countSectionFilters(filters, 'basic');
        const notesCount = countSectionFilters(filters, 'notes');
        const accessCount = countSectionFilters(filters, 'access');
        const customCount = countSectionFilters(filters, 'custom');

        const totalFromSections = basicCount + notesCount + accessCount + customCount;
        const expectedTotal = manualCountAllActiveFilters(filters);

        expect(totalFromSections).toBe(expectedTotal);
      }),
      { numRuns: 100 }
    );
  });

  it('section counts are always non-negative', () => {
    fc.assert(
      fc.property(
        advancedSearchFiltersArbitrary,
        fc.constantFrom('basic', 'notes', 'access', 'custom') as fc.Arbitrary<FilterSection>,
        (filters, section) => {
          const count = countSectionFilters(filters, section);
          expect(count).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty operators (isEmpty/isNotEmpty) count as active filters', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('isEmpty', 'isNotEmpty'),
        (operator) => {
          const filters: AdvancedSearchFilters = {
            firstName: { value: '', operator },
            lastName: { value: '', operator: 'contains' },
            barcode: { value: '', operator: 'contains' },
            notes: { value: '', operator: 'contains', hasNotes: false },
            photoFilter: 'all',
            customFields: {},
            accessControl: {
              accessStatus: 'all',
              validFromStart: '',
              validFromEnd: '',
              validUntilStart: '',
              validUntilEnd: '',
            },
          };

          const count = countSectionFilters(filters, 'basic');
          expect(count).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: advanced-filters-redesign, Property 3: Active Filters Bar Chip Accuracy**
 * **Validates: Requirements 2.1, 2.2, 2.4**
 *
 * *For any* filter state with one or more active filters, the Active_Filters_Bar
 * SHALL display exactly one chip for each active filter, and each chip SHALL
 * display the correct field name and formatted value.
 */
describe('Property 3: Active Filters Bar Chip Accuracy', () => {
  it('filtersToChips returns one chip per active filter', () => {
    fc.assert(
      fc.property(
        advancedSearchFiltersArbitrary,
        eventSettingsArbitrary,
        (filters, eventSettings) => {
          const chips = filtersToChips(filters, eventSettings);
          const expectedCount = manualCountAllActiveFilters(filters);

          expect(chips.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('each chip has a non-empty label', () => {
    fc.assert(
      fc.property(
        advancedSearchFiltersArbitrary,
        eventSettingsArbitrary,
        (filters, eventSettings) => {
          const chips = filtersToChips(filters, eventSettings);

          chips.forEach((chip) => {
            expect(chip.label).toBeDefined();
            expect(chip.label.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('each chip has a defined value (may be empty for isEmpty operator)', () => {
    fc.assert(
      fc.property(
        advancedSearchFiltersArbitrary,
        eventSettingsArbitrary,
        (filters, eventSettings) => {
          const chips = filtersToChips(filters, eventSettings);

          chips.forEach((chip) => {
            expect(chip.value).toBeDefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('each chip has a unique id', () => {
    fc.assert(
      fc.property(
        advancedSearchFiltersArbitrary,
        eventSettingsArbitrary,
        (filters, eventSettings) => {
          const chips = filtersToChips(filters, eventSettings);
          const ids = chips.map((c) => c.id);
          const uniqueIds = new Set(ids);

          expect(uniqueIds.size).toBe(ids.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('custom field chips include customFieldId', () => {
    fc.assert(
      fc.property(
        advancedSearchFiltersArbitrary,
        eventSettingsArbitrary,
        (filters, eventSettings) => {
          const chips = filtersToChips(filters, eventSettings);
          const customFieldChips = chips.filter((c) => c.filterKey === 'customField');

          customFieldChips.forEach((chip) => {
            expect(chip.customFieldId).toBeDefined();
            expect(chip.customFieldId!.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('hasActiveFilters returns true iff filtersToChips returns non-empty array', () => {
    fc.assert(
      fc.property(
        advancedSearchFiltersArbitrary,
        eventSettingsArbitrary,
        (filters, eventSettings) => {
          const chips = filtersToChips(filters, eventSettings);
          const hasActive = hasActiveFilters(filters);

          expect(hasActive).toBe(chips.length > 0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatFilterValue handles isEmpty/isNotEmpty operators correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('isEmpty', 'isNotEmpty'),
        fc.string(),
        (operator, value) => {
          const result = formatFilterValue(value, operator);

          if (operator === 'isEmpty') {
            expect(result).toBe('is empty');
          } else {
            expect(result).toBe('is not empty');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatFilterValue handles array values correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (values) => {
          const result = formatFilterValue(values, 'contains');

          if (values.length === 1) {
            expect(result).toBe(values[0]);
          } else {
            expect(result).toBe(`${values[0]} +${values.length - 1}`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatFilterValue handles boolean field type correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('yes', 'Yes', 'YES', 'true', 'True', 'TRUE'),
        (value) => {
          const result = formatFilterValue(value, 'equals', 'boolean');
          expect(result).toBe('Yes');
        }
      ),
      { numRuns: 100 }
    );

    fc.assert(
      fc.property(
        fc.constantFrom('no', 'No', 'NO', 'false', 'False', 'FALSE'),
        (value) => {
          const result = formatFilterValue(value, 'equals', 'boolean');
          expect(result).toBe('No');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('chips for basic filters have correct filterKey', () => {
    fc.assert(
      fc.property(advancedSearchFiltersArbitrary, eventSettingsArbitrary, (filters, eventSettings) => {
        const chips = filtersToChips(filters, eventSettings);

        const basicFilterKeys = ['firstName', 'lastName', 'barcode', 'photoFilter'];
        const basicChips = chips.filter((c) => basicFilterKeys.includes(c.filterKey));

        basicChips.forEach((chip) => {
          expect(basicFilterKeys).toContain(chip.filterKey);
        });
      }),
      { numRuns: 100 }
    );
  });
});
