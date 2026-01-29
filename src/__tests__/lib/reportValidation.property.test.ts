/**
 * Property-Based Tests for Report Validation
 *
 * These tests verify the correctness properties defined in the design document
 * for the Saved Reports feature, specifically Property 6: Stale Parameter Detection.
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 *
 * **Validates: Requirements 4.2, 4.4, 4.9**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateReportConfiguration } from '@/lib/reportValidation';
import type { AdvancedSearchFilters, CustomFieldFilter } from '@/lib/filterUtils';
import type { EventSettings, CustomField } from '@/components/EventSettingsForm/types';

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

/**
 * Generate a valid custom field ID
 */
const fieldIdArbitrary = fc.uuid();

/**
 * Generate a valid field name
 */
const fieldNameArbitrary = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

/**
 * Generate a valid option value for select fields
 */
const optionValueArbitrary = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0);

/**
 * Generate a list of unique option values
 */
const optionsListArbitrary = fc
  .array(optionValueArbitrary, { minLength: 1, maxLength: 10 })
  .map((arr) => [...new Set(arr)]); // Ensure uniqueness

/**
 * Generate a custom field definition
 */
const customFieldArbitrary = (
  fieldId: string,
  fieldType: 'text' | 'select' | 'multiselect',
  options?: string[]
): CustomField => ({
  id: fieldId,
  fieldName: `Field ${fieldId.slice(0, 8)}`,
  fieldType,
  fieldOptions:
    fieldType === 'select' || fieldType === 'multiselect'
      ? { options: options || [] }
      : undefined,
  required: false,
  order: 0,
});

/**
 * Generate a custom field filter
 */
const customFieldFilterArbitrary = (
  value: string | string[]
): CustomFieldFilter => ({
  value,
  operator: 'equals',
});

/**
 * Generate empty/default filters
 */
const emptyFiltersArbitrary = (): AdvancedSearchFilters => ({
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
  matchMode: 'all',
});

/**
 * Generate event settings with custom fields
 */
const eventSettingsWithFieldsArbitrary = (
  customFields: CustomField[]
): EventSettings => ({
  eventName: 'Test Event',
  eventDate: '2025-01-01',
  eventLocation: 'Test Location',
  timeZone: 'UTC',
  barcodeType: 'numerical',
  barcodeLength: 8,
  barcodeUnique: true,
  customFields,
});

// ============================================================================
// Property 6: Stale Parameter Detection
// ============================================================================

/**
 * **Feature: saved-reports, Property 6: Stale Parameter Detection**
 * **Validates: Requirements 4.2, 4.4, 4.9**
 *
 * *For any* saved report containing custom field filters that reference
 * non-existent field IDs or non-existent dropdown/select values, the
 * validation service should identify all such stale parameters and return
 * them with their original field names and values.
 */
describe('Property 6: Stale Parameter Detection', () => {
  describe('Stale custom field detection (field_deleted)', () => {
    it('identifies all custom field filters referencing non-existent field IDs', () => {
      fc.assert(
        fc.property(
          // Generate 1-5 stale field IDs
          fc.array(fieldIdArbitrary, { minLength: 1, maxLength: 5 }),
          // Generate 0-3 valid field IDs
          fc.array(fieldIdArbitrary, { minLength: 0, maxLength: 3 }),
          // Generate filter values
          fc.array(optionValueArbitrary, { minLength: 1, maxLength: 3 }),
          (staleFieldIds, validFieldIds, filterValues) => {
            // Ensure no overlap between stale and valid field IDs
            const validSet = new Set(validFieldIds);
            const uniqueStaleIds = staleFieldIds.filter((id) => !validSet.has(id));

            if (uniqueStaleIds.length === 0) return; // Skip if no unique stale IDs

            // Create event settings with only valid fields
            const validFields = validFieldIds.map((id) =>
              customFieldArbitrary(id, 'text')
            );
            const eventSettings = eventSettingsWithFieldsArbitrary(validFields);

            // Create filters with both stale and valid field references
            const filters = emptyFiltersArbitrary();
            uniqueStaleIds.forEach((id, idx) => {
              filters.customFields[id] = customFieldFilterArbitrary(
                filterValues[idx % filterValues.length]
              );
            });
            validFieldIds.forEach((id, idx) => {
              filters.customFields[id] = customFieldFilterArbitrary(
                filterValues[idx % filterValues.length]
              );
            });

            // Validate
            const result = validateReportConfiguration(filters, eventSettings);

            // All stale field IDs should be detected
            const detectedStaleIds = result.staleParameters
              .filter((p) => p.type === 'customField' && p.reason === 'field_deleted')
              .map((p) => p.fieldId);

            expect(detectedStaleIds.sort()).toEqual(uniqueStaleIds.sort());

            // Valid configuration should not contain stale fields
            uniqueStaleIds.forEach((id) => {
              expect(result.validConfiguration.customFields[id]).toBeUndefined();
            });

            // Valid configuration should contain valid fields
            validFieldIds.forEach((id) => {
              expect(result.validConfiguration.customFields[id]).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns isValid=false when any stale custom field is detected', () => {
      fc.assert(
        fc.property(
          fieldIdArbitrary,
          optionValueArbitrary,
          (staleFieldId, filterValue) => {
            // Create event settings with no custom fields
            const eventSettings = eventSettingsWithFieldsArbitrary([]);

            // Create filters referencing a non-existent field
            const filters = emptyFiltersArbitrary();
            filters.customFields[staleFieldId] = customFieldFilterArbitrary(filterValue);

            // Validate
            const result = validateReportConfiguration(filters, eventSettings);

            expect(result.isValid).toBe(false);
            expect(result.staleParameters.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns isValid=true when all custom fields exist', () => {
      fc.assert(
        fc.property(
          fc.array(fieldIdArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(optionValueArbitrary, { minLength: 1, maxLength: 3 }),
          (fieldIds, filterValues) => {
            // Ensure unique field IDs
            const uniqueFieldIds = [...new Set(fieldIds)];
            if (uniqueFieldIds.length === 0) return;

            // Create event settings with all the fields
            const customFields = uniqueFieldIds.map((id) =>
              customFieldArbitrary(id, 'text')
            );
            const eventSettings = eventSettingsWithFieldsArbitrary(customFields);

            // Create filters referencing only existing fields
            const filters = emptyFiltersArbitrary();
            uniqueFieldIds.forEach((id, idx) => {
              filters.customFields[id] = customFieldFilterArbitrary(
                filterValues[idx % filterValues.length]
              );
            });

            // Validate
            const result = validateReportConfiguration(filters, eventSettings);

            expect(result.isValid).toBe(true);
            expect(result.staleParameters.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Stale dropdown value detection (value_deleted)', () => {
    it('identifies select field filters with non-existent option values', () => {
      fc.assert(
        fc.property(
          fieldIdArbitrary,
          optionsListArbitrary,
          optionsListArbitrary,
          (fieldId, validOptions, staleValues) => {
            // Ensure stale values don't overlap with valid options
            const validSet = new Set(validOptions);
            const uniqueStaleValues = staleValues.filter((v) => !validSet.has(v));

            if (uniqueStaleValues.length === 0) return; // Skip if no unique stale values

            // Create event settings with a select field
            const customField = customFieldArbitrary(fieldId, 'select', validOptions);
            const eventSettings = eventSettingsWithFieldsArbitrary([customField]);

            // Create filter with stale value
            const filters = emptyFiltersArbitrary();
            filters.customFields[fieldId] = customFieldFilterArbitrary(
              uniqueStaleValues[0]
            );

            // Validate
            const result = validateReportConfiguration(filters, eventSettings);

            expect(result.isValid).toBe(false);

            const staleParam = result.staleParameters.find(
              (p) => p.type === 'customFieldValue' && p.fieldId === fieldId
            );
            expect(staleParam).toBeDefined();
            expect(staleParam?.reason).toBe('value_deleted');
            expect(staleParam?.originalValue).toBe(uniqueStaleValues[0]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('identifies multiselect field filters with non-existent option values', () => {
      fc.assert(
        fc.property(
          fieldIdArbitrary,
          optionsListArbitrary,
          optionsListArbitrary,
          (fieldId, validOptions, filterValues) => {
            // Ensure some filter values are stale
            const validSet = new Set(validOptions);
            const staleValues = filterValues.filter((v) => !validSet.has(v));

            if (staleValues.length === 0) return; // Skip if no stale values

            // Create event settings with a multiselect field
            const customField = customFieldArbitrary(fieldId, 'multiselect', validOptions);
            const eventSettings = eventSettingsWithFieldsArbitrary([customField]);

            // Create filter with mix of valid and stale values
            const filters = emptyFiltersArbitrary();
            filters.customFields[fieldId] = customFieldFilterArbitrary(filterValues);

            // Validate
            const result = validateReportConfiguration(filters, eventSettings);

            expect(result.isValid).toBe(false);

            const staleParam = result.staleParameters.find(
              (p) => p.type === 'customFieldValue' && p.fieldId === fieldId
            );
            expect(staleParam).toBeDefined();
            expect(staleParam?.reason).toBe('value_deleted');

            // Original value should contain the stale values
            const originalValues = Array.isArray(staleParam?.originalValue)
              ? staleParam?.originalValue
              : [staleParam?.originalValue];
            staleValues.forEach((sv) => {
              expect(originalValues).toContain(sv);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves valid values when some multiselect values are stale', () => {
      fc.assert(
        fc.property(
          fieldIdArbitrary,
          optionsListArbitrary,
          optionsListArbitrary,
          (fieldId, validOptions, additionalValues) => {
            // Ensure we have both valid and stale values
            const validSet = new Set(validOptions);
            const staleValues = additionalValues.filter((v) => !validSet.has(v));

            if (staleValues.length === 0 || validOptions.length === 0) return;

            // Create event settings with a multiselect field
            const customField = customFieldArbitrary(fieldId, 'multiselect', validOptions);
            const eventSettings = eventSettingsWithFieldsArbitrary([customField]);

            // Create filter with mix of valid and stale values
            const mixedValues = [...validOptions.slice(0, 2), ...staleValues.slice(0, 2)];
            const filters = emptyFiltersArbitrary();
            filters.customFields[fieldId] = customFieldFilterArbitrary(mixedValues);

            // Validate
            const result = validateReportConfiguration(filters, eventSettings);

            // Valid configuration should only contain valid values
            const validConfigFilter = result.validConfiguration.customFields[fieldId];

            if (validConfigFilter) {
              const configValues = Array.isArray(validConfigFilter.value)
                ? validConfigFilter.value
                : [validConfigFilter.value];

              // All values in valid config should be in validOptions
              configValues.forEach((v) => {
                expect(validSet.has(v)).toBe(true);
              });

              // No stale values should be in valid config
              staleValues.forEach((sv) => {
                expect(configValues).not.toContain(sv);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns isValid=true when all select values exist', () => {
      fc.assert(
        fc.property(
          fieldIdArbitrary,
          optionsListArbitrary,
          (fieldId, validOptions) => {
            if (validOptions.length === 0) return;

            // Create event settings with a select field
            const customField = customFieldArbitrary(fieldId, 'select', validOptions);
            const eventSettings = eventSettingsWithFieldsArbitrary([customField]);

            // Create filter with a valid value
            const filters = emptyFiltersArbitrary();
            filters.customFields[fieldId] = customFieldFilterArbitrary(validOptions[0]);

            // Validate
            const result = validateReportConfiguration(filters, eventSettings);

            expect(result.isValid).toBe(true);
            expect(result.staleParameters.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge cases', () => {
    it('handles null event settings by marking all custom fields as stale', () => {
      fc.assert(
        fc.property(
          fc.array(fieldIdArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(optionValueArbitrary, { minLength: 1, maxLength: 3 }),
          (fieldIds, filterValues) => {
            const uniqueFieldIds = [...new Set(fieldIds)];
            if (uniqueFieldIds.length === 0) return;

            // Create filters with custom fields
            const filters = emptyFiltersArbitrary();
            uniqueFieldIds.forEach((id, idx) => {
              filters.customFields[id] = customFieldFilterArbitrary(
                filterValues[idx % filterValues.length]
              );
            });

            // Validate with null event settings
            const result = validateReportConfiguration(filters, null);

            // All custom fields should be marked as stale
            expect(result.isValid).toBe(false);
            expect(result.staleParameters.length).toBe(uniqueFieldIds.length);

            // Valid configuration should have no custom fields
            expect(Object.keys(result.validConfiguration.customFields).length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles empty custom fields in filters', () => {
      fc.assert(
        fc.property(
          fc.array(fieldIdArbitrary, { minLength: 0, maxLength: 3 }),
          (fieldIds) => {
            // Create event settings with some fields
            const customFields = fieldIds.map((id) => customFieldArbitrary(id, 'text'));
            const eventSettings = eventSettingsWithFieldsArbitrary(customFields);

            // Create filters with no custom fields
            const filters = emptyFiltersArbitrary();

            // Validate
            const result = validateReportConfiguration(filters, eventSettings);

            expect(result.isValid).toBe(true);
            expect(result.staleParameters.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves non-custom-field filters in valid configuration', () => {
      fc.assert(
        fc.property(
          optionValueArbitrary,
          optionValueArbitrary,
          fieldIdArbitrary,
          (firstName, lastName, staleFieldId) => {
            // Create event settings with no custom fields
            const eventSettings = eventSettingsWithFieldsArbitrary([]);

            // Create filters with basic filters and a stale custom field
            const filters = emptyFiltersArbitrary();
            filters.firstName = { value: firstName, operator: 'contains' };
            filters.lastName = { value: lastName, operator: 'equals' };
            filters.customFields[staleFieldId] = customFieldFilterArbitrary('stale');

            // Validate
            const result = validateReportConfiguration(filters, eventSettings);

            // Basic filters should be preserved
            expect(result.validConfiguration.firstName.value).toBe(firstName);
            expect(result.validConfiguration.lastName.value).toBe(lastName);

            // Stale custom field should be removed
            expect(result.validConfiguration.customFields[staleFieldId]).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
