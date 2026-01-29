/**
 * Property-Based Tests for useReports Hook
 *
 * These tests verify the correctness properties defined in the design document
 * for the Saved Reports feature, specifically Property 1: Filter Configuration
 * Round-Trip Consistency.
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 *
 * **Validates: Requirements 1.4, 2.2, 2.3, 6.5**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { AdvancedSearchFilters, CustomFieldFilter, TextFilter, NotesFilter, AccessControlFilters, FilterMatchMode } from '@/lib/filterUtils';
import type { SavedReport, LoadReportResponse, ReportValidationResult } from '@/types/reports';

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

/**
 * Generate a valid text filter operator
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
 * Generate a valid filter value (non-empty string or empty for isEmpty/isNotEmpty operators)
 */
const filterValueArbitrary = fc.string({ minLength: 0, maxLength: 50 });

/**
 * Generate a TextFilter
 */
const textFilterArbitrary: fc.Arbitrary<TextFilter> = fc.record({
  value: filterValueArbitrary,
  operator: textOperatorArbitrary,
});

/**
 * Generate a NotesFilter
 */
const notesFilterArbitrary: fc.Arbitrary<NotesFilter> = fc.record({
  value: filterValueArbitrary,
  operator: textOperatorArbitrary,
  hasNotes: fc.boolean(),
});

/**
 * Generate a photo/credential filter value
 */
const photoCredentialFilterArbitrary = fc.constantFrom('all', 'with', 'without') as fc.Arbitrary<'all' | 'with' | 'without'>;

/**
 * Generate an access status value
 */
const accessStatusArbitrary = fc.constantFrom('all', 'active', 'inactive') as fc.Arbitrary<'all' | 'active' | 'inactive'>;

/**
 * Generate a date string (empty or ISO date format)
 */
const dateStringArbitrary = fc.oneof(
  fc.constant(''),
  fc.integer({ min: 2020, max: 2030 }).chain(year =>
    fc.integer({ min: 1, max: 12 }).chain(month =>
      fc.integer({ min: 1, max: 28 }).map(day => {
        const monthStr = month.toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        return `${year}-${monthStr}-${dayStr}`;
      })
    )
  )
);

/**
 * Generate AccessControlFilters
 */
const accessControlFiltersArbitrary: fc.Arbitrary<AccessControlFilters> = fc.record({
  accessStatus: accessStatusArbitrary,
  validFromStart: dateStringArbitrary,
  validFromEnd: dateStringArbitrary,
  validUntilStart: dateStringArbitrary,
  validUntilEnd: dateStringArbitrary,
});

/**
 * Generate a match mode
 */
const matchModeArbitrary: fc.Arbitrary<FilterMatchMode> = fc.constantFrom('all', 'any');

/**
 * Generate a custom field ID
 */
const customFieldIdArbitrary = fc.uuid();

/**
 * Generate a custom field filter value (string or array of strings)
 */
const customFieldValueArbitrary = fc.oneof(
  filterValueArbitrary,
  fc.array(filterValueArbitrary, { minLength: 0, maxLength: 5 })
);

/**
 * Generate a CustomFieldFilter
 */
const customFieldFilterArbitrary: fc.Arbitrary<CustomFieldFilter> = fc.record({
  value: customFieldValueArbitrary,
  operator: textOperatorArbitrary,
});

/**
 * Generate a record of custom field filters
 */
const customFieldsRecordArbitrary: fc.Arbitrary<Record<string, CustomFieldFilter>> = fc
  .array(
    fc.tuple(customFieldIdArbitrary, customFieldFilterArbitrary),
    { minLength: 0, maxLength: 5 }
  )
  .map(pairs => {
    const record: Record<string, CustomFieldFilter> = {};
    pairs.forEach(([id, filter]) => {
      record[id] = filter;
    });
    return record;
  });

/**
 * Generate a complete AdvancedSearchFilters object
 */
const advancedSearchFiltersArbitrary: fc.Arbitrary<AdvancedSearchFilters> = fc.record({
  firstName: textFilterArbitrary,
  lastName: textFilterArbitrary,
  barcode: textFilterArbitrary,
  notes: notesFilterArbitrary,
  photoFilter: photoCredentialFilterArbitrary,
  credentialFilter: photoCredentialFilterArbitrary,
  customFields: customFieldsRecordArbitrary,
  accessControl: accessControlFiltersArbitrary,
  matchMode: matchModeArbitrary,
});

/**
 * Generate a report name
 */
const reportNameArbitrary = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

/**
 * Generate a report description
 */
const reportDescriptionArbitrary = fc.option(
  fc.string({ minLength: 0, maxLength: 500 }),
  { nil: undefined }
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Deep equality check for filter configurations
 * Handles the nuances of comparing filter objects
 */
function filtersAreEqual(a: AdvancedSearchFilters, b: AdvancedSearchFilters): boolean {
  // Compare basic text filters
  if (!textFiltersEqual(a.firstName, b.firstName)) return false;
  if (!textFiltersEqual(a.lastName, b.lastName)) return false;
  if (!textFiltersEqual(a.barcode, b.barcode)) return false;
  
  // Compare notes filter
  if (!notesFiltersEqual(a.notes, b.notes)) return false;
  
  // Compare simple filters
  if (a.photoFilter !== b.photoFilter) return false;
  if (a.credentialFilter !== b.credentialFilter) return false;
  if (a.matchMode !== b.matchMode) return false;
  
  // Compare access control
  if (!accessControlEqual(a.accessControl, b.accessControl)) return false;
  
  // Compare custom fields
  if (!customFieldsEqual(a.customFields, b.customFields)) return false;
  
  return true;
}

function textFiltersEqual(a: TextFilter, b: TextFilter): boolean {
  return a.value === b.value && a.operator === b.operator;
}

function notesFiltersEqual(a: NotesFilter, b: NotesFilter): boolean {
  return a.value === b.value && a.operator === b.operator && a.hasNotes === b.hasNotes;
}

function accessControlEqual(a: AccessControlFilters, b: AccessControlFilters): boolean {
  return (
    a.accessStatus === b.accessStatus &&
    a.validFromStart === b.validFromStart &&
    a.validFromEnd === b.validFromEnd &&
    a.validUntilStart === b.validUntilStart &&
    a.validUntilEnd === b.validUntilEnd
  );
}

function customFieldsEqual(
  a: Record<string, CustomFieldFilter>,
  b: Record<string, CustomFieldFilter>
): boolean {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  
  if (aKeys.length !== bKeys.length) return false;
  if (!aKeys.every((key, i) => key === bKeys[i])) return false;
  
  for (const key of aKeys) {
    const aFilter = a[key];
    const bFilter = b[key];
    
    if (aFilter.operator !== bFilter.operator) return false;
    
    // Compare values (handle both string and array)
    const aValue = aFilter.value;
    const bValue = bFilter.value;
    
    if (Array.isArray(aValue) && Array.isArray(bValue)) {
      if (aValue.length !== bValue.length) return false;
      if (!aValue.every((v, i) => v === bValue[i])) return false;
    } else if (Array.isArray(aValue) || Array.isArray(bValue)) {
      return false;
    } else if (aValue !== bValue) {
      return false;
    }
  }
  
  return true;
}

/**
 * Create a mock saved report from filter configuration
 */
function createMockSavedReport(
  id: string,
  name: string,
  filterConfiguration: AdvancedSearchFilters,
  description?: string
): SavedReport {
  const now = new Date().toISOString();
  return {
    $id: id,
    name,
    description,
    userId: 'test-user-id',
    filterConfiguration: JSON.stringify(filterConfiguration),
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
  };
}

/**
 * Create a mock validation result (all valid)
 */
function createMockValidationResult(
  filterConfiguration: AdvancedSearchFilters
): ReportValidationResult {
  return {
    isValid: true,
    staleParameters: [],
    validConfiguration: filterConfiguration,
  };
}

// ============================================================================
// Property 1: Filter Configuration Round-Trip Consistency
// ============================================================================

/**
 * **Feature: saved-reports, Property 1: Filter Configuration Round-Trip Consistency**
 * **Validates: Requirements 1.4, 2.2, 2.3, 6.5**
 *
 * *For any* valid `AdvancedSearchFilters` configuration, saving it as a report
 * and then loading that report should produce an equivalent filter configuration
 * (all values, operators, and match mode preserved).
 */
describe('Property 1: Filter Configuration Round-Trip Consistency', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('JSON serialization round-trip', () => {
    it('preserves all filter values through JSON serialization/deserialization', () => {
      fc.assert(
        fc.property(
          advancedSearchFiltersArbitrary,
          (filters) => {
            // Serialize to JSON (as done when saving)
            const serialized = JSON.stringify(filters);
            
            // Deserialize from JSON (as done when loading)
            const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;
            
            // Verify all properties are preserved
            expect(filtersAreEqual(filters, deserialized)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves text filter values and operators', () => {
      fc.assert(
        fc.property(
          textFilterArbitrary,
          textFilterArbitrary,
          textFilterArbitrary,
          (firstName, lastName, barcode) => {
            const filters: AdvancedSearchFilters = {
              firstName,
              lastName,
              barcode,
              notes: { value: '', operator: 'contains', hasNotes: false },
              photoFilter: 'all',
              credentialFilter: 'all',
              customFields: {},
              accessControl: {
                accessStatus: 'all',
                validFromStart: '',
                validFromEnd: '',
                validUntilStart: '',
                validUntilEnd: '',
              },
              matchMode: 'all',
            };

            const serialized = JSON.stringify(filters);
            const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

            expect(deserialized.firstName.value).toBe(firstName.value);
            expect(deserialized.firstName.operator).toBe(firstName.operator);
            expect(deserialized.lastName.value).toBe(lastName.value);
            expect(deserialized.lastName.operator).toBe(lastName.operator);
            expect(deserialized.barcode.value).toBe(barcode.value);
            expect(deserialized.barcode.operator).toBe(barcode.operator);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves notes filter including hasNotes flag', () => {
      fc.assert(
        fc.property(
          notesFilterArbitrary,
          (notes) => {
            const filters: AdvancedSearchFilters = {
              firstName: { value: '', operator: 'contains' },
              lastName: { value: '', operator: 'contains' },
              barcode: { value: '', operator: 'contains' },
              notes,
              photoFilter: 'all',
              credentialFilter: 'all',
              customFields: {},
              accessControl: {
                accessStatus: 'all',
                validFromStart: '',
                validFromEnd: '',
                validUntilStart: '',
                validUntilEnd: '',
              },
              matchMode: 'all',
            };

            const serialized = JSON.stringify(filters);
            const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

            expect(deserialized.notes.value).toBe(notes.value);
            expect(deserialized.notes.operator).toBe(notes.operator);
            expect(deserialized.notes.hasNotes).toBe(notes.hasNotes);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves photo and credential filter values', () => {
      fc.assert(
        fc.property(
          photoCredentialFilterArbitrary,
          photoCredentialFilterArbitrary,
          (photoFilter, credentialFilter) => {
            const filters: AdvancedSearchFilters = {
              firstName: { value: '', operator: 'contains' },
              lastName: { value: '', operator: 'contains' },
              barcode: { value: '', operator: 'contains' },
              notes: { value: '', operator: 'contains', hasNotes: false },
              photoFilter,
              credentialFilter,
              customFields: {},
              accessControl: {
                accessStatus: 'all',
                validFromStart: '',
                validFromEnd: '',
                validUntilStart: '',
                validUntilEnd: '',
              },
              matchMode: 'all',
            };

            const serialized = JSON.stringify(filters);
            const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

            expect(deserialized.photoFilter).toBe(photoFilter);
            expect(deserialized.credentialFilter).toBe(credentialFilter);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves match mode', () => {
      fc.assert(
        fc.property(
          matchModeArbitrary,
          (matchMode) => {
            const filters: AdvancedSearchFilters = {
              firstName: { value: '', operator: 'contains' },
              lastName: { value: '', operator: 'contains' },
              barcode: { value: '', operator: 'contains' },
              notes: { value: '', operator: 'contains', hasNotes: false },
              photoFilter: 'all',
              credentialFilter: 'all',
              customFields: {},
              accessControl: {
                accessStatus: 'all',
                validFromStart: '',
                validFromEnd: '',
                validUntilStart: '',
                validUntilEnd: '',
              },
              matchMode,
            };

            const serialized = JSON.stringify(filters);
            const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

            expect(deserialized.matchMode).toBe(matchMode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves access control filters', () => {
      fc.assert(
        fc.property(
          accessControlFiltersArbitrary,
          (accessControl) => {
            const filters: AdvancedSearchFilters = {
              firstName: { value: '', operator: 'contains' },
              lastName: { value: '', operator: 'contains' },
              barcode: { value: '', operator: 'contains' },
              notes: { value: '', operator: 'contains', hasNotes: false },
              photoFilter: 'all',
              credentialFilter: 'all',
              customFields: {},
              accessControl,
              matchMode: 'all',
            };

            const serialized = JSON.stringify(filters);
            const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

            expect(deserialized.accessControl.accessStatus).toBe(accessControl.accessStatus);
            expect(deserialized.accessControl.validFromStart).toBe(accessControl.validFromStart);
            expect(deserialized.accessControl.validFromEnd).toBe(accessControl.validFromEnd);
            expect(deserialized.accessControl.validUntilStart).toBe(accessControl.validUntilStart);
            expect(deserialized.accessControl.validUntilEnd).toBe(accessControl.validUntilEnd);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves custom field filters with string values', () => {
      fc.assert(
        fc.property(
          customFieldIdArbitrary,
          filterValueArbitrary,
          textOperatorArbitrary,
          (fieldId, value, operator) => {
            const filters: AdvancedSearchFilters = {
              firstName: { value: '', operator: 'contains' },
              lastName: { value: '', operator: 'contains' },
              barcode: { value: '', operator: 'contains' },
              notes: { value: '', operator: 'contains', hasNotes: false },
              photoFilter: 'all',
              credentialFilter: 'all',
              customFields: {
                [fieldId]: { value, operator },
              },
              accessControl: {
                accessStatus: 'all',
                validFromStart: '',
                validFromEnd: '',
                validUntilStart: '',
                validUntilEnd: '',
              },
              matchMode: 'all',
            };

            const serialized = JSON.stringify(filters);
            const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

            expect(deserialized.customFields[fieldId]).toBeDefined();
            expect(deserialized.customFields[fieldId].value).toBe(value);
            expect(deserialized.customFields[fieldId].operator).toBe(operator);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves custom field filters with array values (multiselect)', () => {
      fc.assert(
        fc.property(
          customFieldIdArbitrary,
          fc.array(filterValueArbitrary, { minLength: 1, maxLength: 5 }),
          textOperatorArbitrary,
          (fieldId, values, operator) => {
            const filters: AdvancedSearchFilters = {
              firstName: { value: '', operator: 'contains' },
              lastName: { value: '', operator: 'contains' },
              barcode: { value: '', operator: 'contains' },
              notes: { value: '', operator: 'contains', hasNotes: false },
              photoFilter: 'all',
              credentialFilter: 'all',
              customFields: {
                [fieldId]: { value: values, operator },
              },
              accessControl: {
                accessStatus: 'all',
                validFromStart: '',
                validFromEnd: '',
                validUntilStart: '',
                validUntilEnd: '',
              },
              matchMode: 'all',
            };

            const serialized = JSON.stringify(filters);
            const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

            expect(deserialized.customFields[fieldId]).toBeDefined();
            expect(Array.isArray(deserialized.customFields[fieldId].value)).toBe(true);
            expect(deserialized.customFields[fieldId].value).toEqual(values);
            expect(deserialized.customFields[fieldId].operator).toBe(operator);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves multiple custom field filters', () => {
      fc.assert(
        fc.property(
          customFieldsRecordArbitrary,
          (customFields) => {
            const filters: AdvancedSearchFilters = {
              firstName: { value: '', operator: 'contains' },
              lastName: { value: '', operator: 'contains' },
              barcode: { value: '', operator: 'contains' },
              notes: { value: '', operator: 'contains', hasNotes: false },
              photoFilter: 'all',
              credentialFilter: 'all',
              customFields,
              accessControl: {
                accessStatus: 'all',
                validFromStart: '',
                validFromEnd: '',
                validUntilStart: '',
                validUntilEnd: '',
              },
              matchMode: 'all',
            };

            const serialized = JSON.stringify(filters);
            const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

            expect(customFieldsEqual(deserialized.customFields, customFields)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('API round-trip simulation', () => {
    it('preserves filter configuration through simulated save/load cycle', () => {
      fc.assert(
        fc.property(
          advancedSearchFiltersArbitrary,
          reportNameArbitrary,
          reportDescriptionArbitrary,
          (filters, name, description) => {
            // Simulate save: serialize filter configuration
            const reportId = 'test-report-id';
            const savedReport = createMockSavedReport(reportId, name, filters, description);

            // Simulate load: deserialize filter configuration
            const loadedFilters = JSON.parse(savedReport.filterConfiguration) as AdvancedSearchFilters;

            // Verify round-trip consistency
            expect(filtersAreEqual(filters, loadedFilters)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves filter configuration through LoadReportResponse structure', () => {
      fc.assert(
        fc.property(
          advancedSearchFiltersArbitrary,
          reportNameArbitrary,
          (filters, name) => {
            // Create mock saved report
            const reportId = 'test-report-id';
            const savedReport = createMockSavedReport(reportId, name, filters);

            // Create mock load response (as returned by API)
            const loadResponse: LoadReportResponse = {
              report: savedReport,
              validation: createMockValidationResult(filters),
            };

            // Parse filter configuration (as done in useReports hook)
            const loadedFilters = JSON.parse(loadResponse.report.filterConfiguration) as AdvancedSearchFilters;

            // Verify round-trip consistency
            expect(filtersAreEqual(filters, loadedFilters)).toBe(true);

            // Verify validation result also contains correct configuration
            expect(filtersAreEqual(filters, loadResponse.validation.validConfiguration)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge cases', () => {
    it('handles empty custom fields object', () => {
      const filters: AdvancedSearchFilters = {
        firstName: { value: 'John', operator: 'contains' },
        lastName: { value: 'Doe', operator: 'equals' },
        barcode: { value: '', operator: 'contains' },
        notes: { value: '', operator: 'contains', hasNotes: false },
        photoFilter: 'all',
        credentialFilter: 'all',
        customFields: {},
        accessControl: {
          accessStatus: 'all',
          validFromStart: '',
          validFromEnd: '',
          validUntilStart: '',
          validUntilEnd: '',
        },
        matchMode: 'all',
      };

      const serialized = JSON.stringify(filters);
      const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

      expect(filtersAreEqual(filters, deserialized)).toBe(true);
      expect(Object.keys(deserialized.customFields).length).toBe(0);
    });

    it('handles special characters in filter values', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (specialValue) => {
            const filters: AdvancedSearchFilters = {
              firstName: { value: specialValue, operator: 'contains' },
              lastName: { value: '', operator: 'contains' },
              barcode: { value: '', operator: 'contains' },
              notes: { value: specialValue, operator: 'contains', hasNotes: false },
              photoFilter: 'all',
              credentialFilter: 'all',
              customFields: {
                'field-1': { value: specialValue, operator: 'equals' },
              },
              accessControl: {
                accessStatus: 'all',
                validFromStart: '',
                validFromEnd: '',
                validUntilStart: '',
                validUntilEnd: '',
              },
              matchMode: 'all',
            };

            const serialized = JSON.stringify(filters);
            const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

            expect(deserialized.firstName.value).toBe(specialValue);
            expect(deserialized.notes.value).toBe(specialValue);
            expect(deserialized.customFields['field-1'].value).toBe(specialValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles unicode characters in filter values', () => {
      const unicodeValues = ['日本語', '中文', 'العربية', 'עברית', '🎉🚀💻', 'Ñoño'];
      
      unicodeValues.forEach((unicodeValue) => {
        const filters: AdvancedSearchFilters = {
          firstName: { value: unicodeValue, operator: 'contains' },
          lastName: { value: '', operator: 'contains' },
          barcode: { value: '', operator: 'contains' },
          notes: { value: unicodeValue, operator: 'contains', hasNotes: false },
          photoFilter: 'all',
          credentialFilter: 'all',
          customFields: {},
          accessControl: {
            accessStatus: 'all',
            validFromStart: '',
            validFromEnd: '',
            validUntilStart: '',
            validUntilEnd: '',
          },
          matchMode: 'all',
        };

        const serialized = JSON.stringify(filters);
        const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

        expect(deserialized.firstName.value).toBe(unicodeValue);
        expect(deserialized.notes.value).toBe(unicodeValue);
      });
    });

    it('handles empty string values', () => {
      const filters: AdvancedSearchFilters = {
        firstName: { value: '', operator: 'isEmpty' },
        lastName: { value: '', operator: 'isNotEmpty' },
        barcode: { value: '', operator: 'contains' },
        notes: { value: '', operator: 'contains', hasNotes: false },
        photoFilter: 'all',
        credentialFilter: 'all',
        customFields: {
          'field-1': { value: '', operator: 'isEmpty' },
        },
        accessControl: {
          accessStatus: 'all',
          validFromStart: '',
          validFromEnd: '',
          validUntilStart: '',
          validUntilEnd: '',
        },
        matchMode: 'all',
      };

      const serialized = JSON.stringify(filters);
      const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

      expect(filtersAreEqual(filters, deserialized)).toBe(true);
    });

    it('handles empty array values in multiselect', () => {
      const filters: AdvancedSearchFilters = {
        firstName: { value: '', operator: 'contains' },
        lastName: { value: '', operator: 'contains' },
        barcode: { value: '', operator: 'contains' },
        notes: { value: '', operator: 'contains', hasNotes: false },
        photoFilter: 'all',
        credentialFilter: 'all',
        customFields: {
          'field-1': { value: [], operator: 'equals' },
        },
        accessControl: {
          accessStatus: 'all',
          validFromStart: '',
          validFromEnd: '',
          validUntilStart: '',
          validUntilEnd: '',
        },
        matchMode: 'all',
      };

      const serialized = JSON.stringify(filters);
      const deserialized = JSON.parse(serialized) as AdvancedSearchFilters;

      expect(Array.isArray(deserialized.customFields['field-1'].value)).toBe(true);
      expect((deserialized.customFields['field-1'].value as string[]).length).toBe(0);
    });
  });
});
