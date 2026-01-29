/**
 * Property-Based Tests for ReportCorrectionDialog
 *
 * These tests verify the correctness properties defined in the design document
 * for the Saved Reports feature, specifically Property 7: Stale Parameter Removal on Apply.
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 *
 * **Validates: Requirements 4.8**
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ReportCorrectionDialog } from '../../../components/AdvancedFiltersDialog/components/ReportCorrectionDialog';
import type { SavedReport, StaleParameter, ReportValidationResult } from '../../../types/reports';
import type { AdvancedSearchFilters, CustomFieldFilter } from '../../../lib/filterUtils';
import type { EventSettings, CustomField } from '../../../components/EventSettingsForm/types';

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
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0 && !s.includes('\n') && !s.includes('\r'))
  .map((s) => s.trim());

/**
 * Generate a valid option value
 */
const optionValueArbitrary = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0 && !s.includes('\n') && !s.includes('\r') && !s.includes('"'))
  .map((s) => s.trim());

/**
 * Generate a stale parameter for a deleted field
 */
const staleFieldParameterArbitrary = (fieldId: string, fieldName: string): fc.Arbitrary<StaleParameter> =>
  fc.record({
    type: fc.constant('customField' as const),
    fieldId: fc.constant(fieldId),
    fieldName: fc.constant(fieldName),
    originalValue: fc.option(optionValueArbitrary, { nil: undefined }),
    reason: fc.constant('field_deleted' as const),
  });

/**
 * Generate a stale parameter for a deleted value
 */
const staleValueParameterArbitrary = (fieldId: string, fieldName: string): fc.Arbitrary<StaleParameter> =>
  fc.record({
    type: fc.constant('customFieldValue' as const),
    fieldId: fc.constant(fieldId),
    fieldName: fc.constant(fieldName),
    originalValue: fc.oneof(
      optionValueArbitrary,
      fc.array(optionValueArbitrary, { minLength: 1, maxLength: 3 })
    ),
    reason: fc.constant('value_deleted' as const),
  });

/**
 * Generate empty/default filters
 */
const createEmptyFilters = (): AdvancedSearchFilters => ({
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
 * Generate a custom field filter
 */
const customFieldFilterArbitrary = (value: string | string[]): CustomFieldFilter => ({
  value,
  operator: 'equals',
});

/**
 * Generate a SavedReport with stale custom fields
 */
const savedReportWithStaleFieldsArbitrary = (
  staleFieldIds: string[],
  validFieldIds: string[]
): fc.Arbitrary<SavedReport> => {
  return fc.record({
    $id: fc.uuid(),
    name: fieldNameArbitrary,
    description: fc.option(fieldNameArbitrary, { nil: undefined }),
    userId: fc.uuid(),
    filterConfiguration: fc.array(optionValueArbitrary, { minLength: 1, maxLength: 3 }).map((values) => {
      const filters = createEmptyFilters();
      // Add stale field filters
      staleFieldIds.forEach((id, idx) => {
        filters.customFields[id] = customFieldFilterArbitrary(values[idx % values.length]);
      });
      // Add valid field filters
      validFieldIds.forEach((id, idx) => {
        filters.customFields[id] = customFieldFilterArbitrary(values[idx % values.length]);
      });
      return JSON.stringify(filters);
    }),
    createdAt: fc.constant(new Date().toISOString()),
    updatedAt: fc.constant(new Date().toISOString()),
    lastAccessedAt: fc.option(fc.constant(new Date().toISOString()), { nil: undefined }),
  });
};

/**
 * Generate event settings with custom fields
 */
const eventSettingsWithFieldsArbitrary = (customFields: CustomField[]): EventSettings => ({
  eventName: 'Test Event',
  eventDate: '2025-01-01',
  eventLocation: 'Test Location',
  timeZone: 'UTC',
  barcodeType: 'numerical',
  barcodeLength: 8,
  barcodeUnique: true,
  customFields,
});

/**
 * Generate a custom field definition
 */
const customFieldArbitrary = (fieldId: string, fieldName: string): CustomField => ({
  id: fieldId,
  fieldName,
  fieldType: 'text',
  required: false,
  order: 0,
});

// ============================================================================
// Test Setup
// ============================================================================

// Mock handlers
const mockOnApplyWithRemoval = vi.fn();
const mockOnSaveCorrections = vi.fn().mockResolvedValue(undefined);
const mockOnOpenChange = vi.fn();

// Reset before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// ============================================================================
// Property 7: Stale Parameter Removal on Apply
// ============================================================================

/**
 * **Feature: saved-reports, Property 7: Stale Parameter Removal on Apply**
 * **Validates: Requirements 4.8**
 *
 * *For any* report with stale parameters, when a user chooses to apply
 * with stale parameters removed, the resulting filter configuration
 * loaded into the dialog should contain only valid parameters (no
 * references to deleted fields or values).
 */
describe('Property 7: Stale Parameter Removal on Apply', () => {
  describe('Apply with removal excludes all stale parameters', () => {
    it('excludes all stale custom field references when applying', () => {
      fc.assert(
        fc.property(
          // Generate 1-3 stale field IDs
          fc.array(fieldIdArbitrary, { minLength: 1, maxLength: 3 }),
          // Generate 0-2 valid field IDs
          fc.array(fieldIdArbitrary, { minLength: 0, maxLength: 2 }),
          // Generate field names
          fc.array(fieldNameArbitrary, { minLength: 3, maxLength: 5 }),
          // Generate filter values
          fc.array(optionValueArbitrary, { minLength: 1, maxLength: 3 }),
          (staleFieldIds, validFieldIds, fieldNames, filterValues) => {
            // Clear mocks at the start of each property run
            mockOnApplyWithRemoval.mockClear();
            mockOnSaveCorrections.mockClear();
            mockOnOpenChange.mockClear();
            // Ensure no overlap between stale and valid field IDs
            const validSet = new Set(validFieldIds);
            const uniqueStaleIds = [...new Set(staleFieldIds)].filter((id) => !validSet.has(id));
            const uniqueValidIds = [...new Set(validFieldIds)];

            if (uniqueStaleIds.length === 0) return; // Skip if no unique stale IDs

            // Create stale parameters
            const staleParameters: StaleParameter[] = uniqueStaleIds.map((id, idx) => ({
              type: 'customField' as const,
              fieldId: id,
              fieldName: fieldNames[idx % fieldNames.length],
              originalValue: filterValues[idx % filterValues.length],
              reason: 'field_deleted' as const,
            }));

            // Create valid configuration (without stale fields)
            const validConfiguration = createEmptyFilters();
            uniqueValidIds.forEach((id, idx) => {
              validConfiguration.customFields[id] = customFieldFilterArbitrary(
                filterValues[idx % filterValues.length]
              );
            });

            // Create original configuration (with stale fields)
            const originalConfiguration = createEmptyFilters();
            uniqueStaleIds.forEach((id, idx) => {
              originalConfiguration.customFields[id] = customFieldFilterArbitrary(
                filterValues[idx % filterValues.length]
              );
            });
            uniqueValidIds.forEach((id, idx) => {
              originalConfiguration.customFields[id] = customFieldFilterArbitrary(
                filterValues[idx % filterValues.length]
              );
            });

            const validationResult: ReportValidationResult = {
              isValid: false,
              staleParameters,
              validConfiguration,
            };

            const report: SavedReport = {
              $id: 'test-report-id',
              name: 'Test Report',
              userId: 'test-user-id',
              filterConfiguration: JSON.stringify(originalConfiguration),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            // Create event settings with only valid fields
            const customFields = uniqueValidIds.map((id, idx) =>
              customFieldArbitrary(id, fieldNames[idx % fieldNames.length])
            );
            const eventSettings = eventSettingsWithFieldsArbitrary(customFields);

            const { unmount } = render(
              <ReportCorrectionDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                report={report}
                validationResult={validationResult}
                eventSettings={eventSettings}
                onApplyWithRemoval={mockOnApplyWithRemoval}
                onSaveCorrections={mockOnSaveCorrections}
              />
            );

            // Click "Apply with valid filters only" button
            const applyButton = screen.getByTestId('apply-with-removal-btn');
            fireEvent.click(applyButton);

            // Verify onApplyWithRemoval was called
            expect(mockOnApplyWithRemoval).toHaveBeenCalledTimes(1);

            // Get the configuration passed to onApplyWithRemoval
            const appliedConfig = mockOnApplyWithRemoval.mock.calls[0][0] as AdvancedSearchFilters;

            // Verify NO stale field IDs are in the applied configuration
            uniqueStaleIds.forEach((staleId) => {
              expect(appliedConfig.customFields[staleId]).toBeUndefined();
            });

            // Verify valid field IDs ARE in the applied configuration
            uniqueValidIds.forEach((validId) => {
              expect(appliedConfig.customFields[validId]).toBeDefined();
            });

            unmount();
            mockOnApplyWithRemoval.mockClear();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('preserves non-custom-field filters when applying with removal', () => {
      fc.assert(
        fc.property(
          fieldIdArbitrary,
          fieldNameArbitrary,
          optionValueArbitrary,
          optionValueArbitrary,
          (staleFieldId, fieldName, firstName, lastName) => {
            // Clear mocks at the start of each property run
            mockOnApplyWithRemoval.mockClear();
            mockOnSaveCorrections.mockClear();
            mockOnOpenChange.mockClear();

            // Create stale parameter
            const staleParameters: StaleParameter[] = [{
              type: 'customField',
              fieldId: staleFieldId,
              fieldName,
              originalValue: 'stale-value',
              reason: 'field_deleted',
            }];

            // Create valid configuration with basic filters
            const validConfiguration = createEmptyFilters();
            validConfiguration.firstName = { value: firstName, operator: 'contains' };
            validConfiguration.lastName = { value: lastName, operator: 'equals' };

            const validationResult: ReportValidationResult = {
              isValid: false,
              staleParameters,
              validConfiguration,
            };

            // Create original configuration
            const originalConfiguration = createEmptyFilters();
            originalConfiguration.firstName = { value: firstName, operator: 'contains' };
            originalConfiguration.lastName = { value: lastName, operator: 'equals' };
            // Ensure customFields exists and has the stale field
            if (!originalConfiguration.customFields) {
              originalConfiguration.customFields = {};
            }
            originalConfiguration.customFields[staleFieldId] = customFieldFilterArbitrary('stale-value');

            const report: SavedReport = {
              $id: 'test-report-id',
              name: 'Test Report',
              userId: 'test-user-id',
              filterConfiguration: JSON.stringify(originalConfiguration),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const { unmount } = render(
              <ReportCorrectionDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                report={report}
                validationResult={validationResult}
                eventSettings={eventSettingsWithFieldsArbitrary([])}
                onApplyWithRemoval={mockOnApplyWithRemoval}
                onSaveCorrections={mockOnSaveCorrections}
              />
            );

            // Click "Apply with valid filters only" button
            const applyButton = screen.getByTestId('apply-with-removal-btn');
            fireEvent.click(applyButton);

            // Verify the mock was called
            expect(mockOnApplyWithRemoval).toHaveBeenCalled();

            // Get the configuration passed to onApplyWithRemoval
            const appliedConfig = mockOnApplyWithRemoval.mock.calls[0][0] as AdvancedSearchFilters;

            // Verify basic filters are preserved
            expect(appliedConfig.firstName.value).toBe(firstName);
            expect(appliedConfig.lastName.value).toBe(lastName);

            // Verify stale custom field is NOT in the applied configuration
            expect(appliedConfig.customFields[staleFieldId]).toBeUndefined();

            unmount();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('handles multiple stale parameters of different types', () => {
      fc.assert(
        fc.property(
          // Generate stale field IDs
          fc.array(fieldIdArbitrary, { minLength: 1, maxLength: 2 }),
          // Generate stale value field IDs
          fc.array(fieldIdArbitrary, { minLength: 1, maxLength: 2 }),
          // Generate field names
          fc.array(fieldNameArbitrary, { minLength: 4, maxLength: 6 }),
          // Generate filter values
          fc.array(optionValueArbitrary, { minLength: 1, maxLength: 3 }),
          (staleFieldIds, staleValueFieldIds, fieldNames, filterValues) => {
            // Clear mocks at the start of each property iteration
            mockOnApplyWithRemoval.mockClear();
            mockOnSaveCorrections.mockClear();
            mockOnOpenChange.mockClear();

            // Ensure no overlap
            const staleFieldSet = new Set(staleFieldIds);
            const uniqueStaleValueIds = [...new Set(staleValueFieldIds)].filter(
              (id) => !staleFieldSet.has(id)
            );
            const uniqueStaleFieldIds = [...new Set(staleFieldIds)];

            // Discard cases with no stale parameters (not vacuous)
            fc.pre(uniqueStaleFieldIds.length > 0 || uniqueStaleValueIds.length > 0);

            // Create stale parameters
            const staleParameters: StaleParameter[] = [
              ...uniqueStaleFieldIds.map((id, idx) => ({
                type: 'customField' as const,
                fieldId: id,
                fieldName: fieldNames[idx % fieldNames.length],
                originalValue: filterValues[idx % filterValues.length],
                reason: 'field_deleted' as const,
              })),
              ...uniqueStaleValueIds.map((id, idx) => ({
                type: 'customFieldValue' as const,
                fieldId: id,
                fieldName: fieldNames[(idx + uniqueStaleFieldIds.length) % fieldNames.length],
                originalValue: filterValues[idx % filterValues.length],
                reason: 'value_deleted' as const,
              })),
            ];

            // Create valid configuration (empty custom fields)
            const validConfiguration = createEmptyFilters();

            const validationResult: ReportValidationResult = {
              isValid: false,
              staleParameters,
              validConfiguration,
            };

            const report: SavedReport = {
              $id: 'test-report-id',
              name: 'Test Report',
              userId: 'test-user-id',
              filterConfiguration: JSON.stringify(createEmptyFilters()),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const { unmount } = render(
              <ReportCorrectionDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                report={report}
                validationResult={validationResult}
                eventSettings={eventSettingsWithFieldsArbitrary([])}
                onApplyWithRemoval={mockOnApplyWithRemoval}
                onSaveCorrections={mockOnSaveCorrections}
              />
            );

            // Click "Apply with valid filters only" button
            const applyButton = screen.getByTestId('apply-with-removal-btn');
            fireEvent.click(applyButton);

            // Verify the mock was called
            expect(mockOnApplyWithRemoval).toHaveBeenCalled();

            // Get the configuration passed to onApplyWithRemoval
            const appliedConfig = mockOnApplyWithRemoval.mock.calls[0][0] as AdvancedSearchFilters;

            // Verify ALL stale field IDs are excluded
            [...uniqueStaleFieldIds, ...uniqueStaleValueIds].forEach((staleId) => {
              expect(appliedConfig.customFields[staleId]).toBeUndefined();
            });

            unmount();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Stale parameters are displayed correctly', () => {
    it('displays all stale parameters in the list', () => {
      fc.assert(
        fc.property(
          fc.array(fieldIdArbitrary, { minLength: 1, maxLength: 3 }),
          fc.array(fieldNameArbitrary, { minLength: 3, maxLength: 5 }),
          fc.array(optionValueArbitrary, { minLength: 1, maxLength: 3 }),
          (fieldIds, fieldNames, filterValues) => {
            const uniqueFieldIds = [...new Set(fieldIds)];
            if (uniqueFieldIds.length === 0) return;

            // Create stale parameters
            const staleParameters: StaleParameter[] = uniqueFieldIds.map((id, idx) => ({
              type: 'customField' as const,
              fieldId: id,
              fieldName: fieldNames[idx % fieldNames.length],
              originalValue: filterValues[idx % filterValues.length],
              reason: 'field_deleted' as const,
            }));

            const validationResult: ReportValidationResult = {
              isValid: false,
              staleParameters,
              validConfiguration: createEmptyFilters(),
            };

            const report: SavedReport = {
              $id: 'test-report-id',
              name: 'Test Report',
              userId: 'test-user-id',
              filterConfiguration: JSON.stringify(createEmptyFilters()),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const { unmount } = render(
              <ReportCorrectionDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                report={report}
                validationResult={validationResult}
                eventSettings={eventSettingsWithFieldsArbitrary([])}
                onApplyWithRemoval={mockOnApplyWithRemoval}
                onSaveCorrections={mockOnSaveCorrections}
              />
            );

            // Verify each stale parameter is displayed
            uniqueFieldIds.forEach((fieldId) => {
              const paramElement = screen.getByTestId(`stale-param-${fieldId}`);
              expect(paramElement).toBeInTheDocument();
            });

            unmount();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('displays field name and original value for each stale parameter', () => {
      fc.assert(
        fc.property(
          fieldIdArbitrary,
          fieldNameArbitrary,
          optionValueArbitrary,
          (fieldId, fieldName, originalValue) => {
            // Clean up any previous renders
            cleanup();

            const staleParameters: StaleParameter[] = [{
              type: 'customField',
              fieldId,
              fieldName,
              originalValue,
              reason: 'field_deleted',
            }];

            const validationResult: ReportValidationResult = {
              isValid: false,
              staleParameters,
              validConfiguration: createEmptyFilters(),
            };

            const report: SavedReport = {
              $id: 'test-report-id',
              name: 'Test Report',
              userId: 'test-user-id',
              filterConfiguration: JSON.stringify(createEmptyFilters()),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const { unmount } = render(
              <ReportCorrectionDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                report={report}
                validationResult={validationResult}
                eventSettings={eventSettingsWithFieldsArbitrary([])}
                onApplyWithRemoval={mockOnApplyWithRemoval}
                onSaveCorrections={mockOnSaveCorrections}
              />
            );

            // Verify field name is displayed
            const nameElement = screen.getByTestId(`stale-param-name-${fieldId}`);
            expect(nameElement).toHaveTextContent(fieldName);

            // Verify original value is displayed (check for formatted version with quotes)
            // Note: HTML collapses multiple consecutive spaces to single spaces in text content
            const valueElement = screen.getByTestId(`stale-param-value-${fieldId}`);
            const expectedFormatted = Array.isArray(originalValue)
              ? originalValue.length === 0
                ? '(empty)'
                : originalValue.length === 1
                  ? `"${originalValue[0]}"`
                  : originalValue.map((v) => `"${v}"`).join(', ')
              : `"${originalValue}"`;
            // Normalize whitespace in both expected and actual to match HTML rendering
            // Collapse internal spaces and trim leading/trailing whitespace
            const normalizedExpected = expectedFormatted.replace(/\s+/g, ' ').trim();
            const normalizedActual = (valueElement.textContent || '').replace(/\s+/g, ' ').trim();
            expect(normalizedActual).toBe(normalizedExpected);

            unmount();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Remove button functionality', () => {
    it('provides remove button for each stale parameter', () => {
      fc.assert(
        fc.property(
          fc.array(fieldIdArbitrary, { minLength: 1, maxLength: 3 }),
          fc.array(fieldNameArbitrary, { minLength: 3, maxLength: 5 }),
          (fieldIds, fieldNames) => {
            const uniqueFieldIds = [...new Set(fieldIds)];
            if (uniqueFieldIds.length === 0) return;

            const staleParameters: StaleParameter[] = uniqueFieldIds.map((id, idx) => ({
              type: 'customField' as const,
              fieldId: id,
              fieldName: fieldNames[idx % fieldNames.length],
              originalValue: 'test-value',
              reason: 'field_deleted' as const,
            }));

            const validationResult: ReportValidationResult = {
              isValid: false,
              staleParameters,
              validConfiguration: createEmptyFilters(),
            };

            const report: SavedReport = {
              $id: 'test-report-id',
              name: 'Test Report',
              userId: 'test-user-id',
              filterConfiguration: JSON.stringify(createEmptyFilters()),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const { unmount } = render(
              <ReportCorrectionDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                report={report}
                validationResult={validationResult}
                eventSettings={eventSettingsWithFieldsArbitrary([])}
                onApplyWithRemoval={mockOnApplyWithRemoval}
                onSaveCorrections={mockOnSaveCorrections}
              />
            );

            // Verify each stale parameter has a remove button
            uniqueFieldIds.forEach((fieldId) => {
              const removeButton = screen.getByTestId(`stale-param-remove-${fieldId}`);
              expect(removeButton).toBeInTheDocument();
            });

            unmount();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('removes stale parameter from display when remove button is clicked', () => {
      const fieldId = 'test-field-id';
      const fieldName = 'Test Field';

      const staleParameters: StaleParameter[] = [{
        type: 'customField',
        fieldId,
        fieldName,
        originalValue: 'test-value',
        reason: 'field_deleted',
      }];

      const validationResult: ReportValidationResult = {
        isValid: false,
        staleParameters,
        validConfiguration: createEmptyFilters(),
      };

      const report: SavedReport = {
        $id: 'test-report-id',
        name: 'Test Report',
        userId: 'test-user-id',
        filterConfiguration: JSON.stringify(createEmptyFilters()),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <ReportCorrectionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          report={report}
          validationResult={validationResult}
          eventSettings={eventSettingsWithFieldsArbitrary([])}
          onApplyWithRemoval={mockOnApplyWithRemoval}
          onSaveCorrections={mockOnSaveCorrections}
        />
      );

      // Verify parameter is initially displayed
      expect(screen.getByTestId(`stale-param-${fieldId}`)).toBeInTheDocument();

      // Click remove button
      const removeButton = screen.getByTestId(`stale-param-remove-${fieldId}`);
      fireEvent.click(removeButton);

      // Verify parameter is no longer displayed
      expect(screen.queryByTestId(`stale-param-${fieldId}`)).not.toBeInTheDocument();
    });
  });

  describe('Dialog closes after applying', () => {
    it('calls onOpenChange(false) after applying with removal', () => {
      const staleParameters: StaleParameter[] = [{
        type: 'customField',
        fieldId: 'test-field-id',
        fieldName: 'Test Field',
        originalValue: 'test-value',
        reason: 'field_deleted',
      }];

      const validationResult: ReportValidationResult = {
        isValid: false,
        staleParameters,
        validConfiguration: createEmptyFilters(),
      };

      const report: SavedReport = {
        $id: 'test-report-id',
        name: 'Test Report',
        userId: 'test-user-id',
        filterConfiguration: JSON.stringify(createEmptyFilters()),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <ReportCorrectionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          report={report}
          validationResult={validationResult}
          eventSettings={eventSettingsWithFieldsArbitrary([])}
          onApplyWithRemoval={mockOnApplyWithRemoval}
          onSaveCorrections={mockOnSaveCorrections}
        />
      );

      // Click "Apply with valid filters only" button
      const applyButton = screen.getByTestId('apply-with-removal-btn');
      fireEvent.click(applyButton);

      // Verify dialog close was requested
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
