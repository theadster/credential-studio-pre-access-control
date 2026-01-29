/**
 * Report Validation Utility
 *
 * Validates saved report filter configurations against the current
 * event settings to detect stale parameters (deleted custom fields
 * or removed dropdown values).
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 *
 * Requirements: 4.1, 4.2, 4.9
 */

import type { AdvancedSearchFilters, CustomFieldFilter } from '@/lib/filterUtils';
import type { EventSettings, CustomField, SelectFieldOptions } from '@/components/EventSettingsForm/types';
import type { StaleParameter, ReportValidationResult } from '@/types/reports';

/**
 * Check if field options are SelectFieldOptions
 */
function isSelectFieldOptions(options: unknown): options is SelectFieldOptions {
  return (
    typeof options === 'object' &&
    options !== null &&
    'options' in options &&
    Array.isArray((options as SelectFieldOptions).options)
  );
}

/**
 * Get the options array from a custom field if it's a select/multiselect type
 */
function getFieldOptions(field: CustomField): string[] | null {
  if (field.fieldType !== 'select' && field.fieldType !== 'multiselect') {
    return null;
  }

  if (isSelectFieldOptions(field.fieldOptions)) {
    return field.fieldOptions.options;
  }

  return null;
}

/**
 * Validates a report's filter configuration against current event settings.
 *
 * Detects two types of stale parameters:
 * 1. Custom fields that no longer exist (field_deleted)
 * 2. Select/multiselect values that are no longer valid options (value_deleted)
 *
 * Returns a validation result containing:
 * - isValid: true if no stale parameters found
 * - staleParameters: list of all detected stale parameters
 * - validConfiguration: the configuration with stale parameters removed
 *
 * Requirements: 4.1, 4.2, 4.9
 *
 * @param savedConfig - The saved filter configuration to validate
 * @param eventSettings - Current event settings with custom field definitions
 * @returns Validation result with stale parameters and cleaned configuration
 */
export function validateReportConfiguration(
  savedConfig: AdvancedSearchFilters,
  eventSettings: EventSettings | null
): ReportValidationResult {
  const staleParameters: StaleParameter[] = [];

  // Deep clone the config to avoid mutating the original
  const validConfiguration: AdvancedSearchFilters = JSON.parse(
    JSON.stringify(savedConfig)
  );

  // If no event settings or no custom fields, all custom field filters are stale
  if (!eventSettings?.customFields) {
    // Mark all custom field filters as stale
    Object.entries(savedConfig.customFields || {}).forEach(([fieldId, filter]) => {
      staleParameters.push({
        type: 'customField',
        fieldId,
        fieldName: fieldId, // No way to get original name without event settings
        originalValue: filter.value,
        reason: 'field_deleted',
      });
    });

    // Clear all custom fields from valid configuration
    validConfiguration.customFields = {};

    return {
      isValid: staleParameters.length === 0,
      staleParameters,
      validConfiguration,
    };
  }

  // Build lookup maps for efficient validation
  const currentFieldsById = new Map<string, CustomField>();
  eventSettings.customFields.forEach((field) => {
    if (field.id) {
      currentFieldsById.set(field.id, field);
    }
  });

  // Validate each custom field filter
  const validCustomFields: Record<string, CustomFieldFilter> = {};

  Object.entries(savedConfig.customFields || {}).forEach(([fieldId, filter]) => {
    const currentField = currentFieldsById.get(fieldId);

    // Check if field still exists
    if (!currentField) {
      staleParameters.push({
        type: 'customField',
        fieldId,
        fieldName: fieldId, // Original name not available
        originalValue: filter.value,
        reason: 'field_deleted',
      });
      return; // Skip this field in valid config
    }

    // Check if select/multiselect values still exist
    const validOptions = getFieldOptions(currentField);

    if (validOptions !== null && filter.value) {
      const filterValues = Array.isArray(filter.value)
        ? filter.value
        : [filter.value];

      const validOptionsSet = new Set(validOptions);
      const invalidValues = filterValues.filter((v) => !validOptionsSet.has(v));

      if (invalidValues.length > 0) {
        staleParameters.push({
          type: 'customFieldValue',
          fieldId,
          fieldName: currentField.fieldName,
          originalValue: invalidValues.length === 1 ? invalidValues[0] : invalidValues,
          reason: 'value_deleted',
        });

        // Keep only valid values
        const validValues = filterValues.filter((v) => validOptionsSet.has(v));

        if (validValues.length > 0) {
          validCustomFields[fieldId] = {
            ...filter,
            value: Array.isArray(filter.value) ? validValues : validValues[0],
          };
        }
        // If no valid values remain, don't include this field in valid config
        return;
      }
    }

    // Field and values are valid - include in valid configuration
    validCustomFields[fieldId] = filter;
  });

  validConfiguration.customFields = validCustomFields;

  return {
    isValid: staleParameters.length === 0,
    staleParameters,
    validConfiguration,
  };
}
