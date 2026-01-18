/**
 * Custom Fields Type Definitions
 * 
 * Provides comprehensive type safety for custom field handling throughout the application.
 * Includes support for both legacy array format and current map format for custom field values.
 */

/**
 * Custom Field Definition
 * Represents the schema/configuration of a custom field
 */
export interface CustomField {
  id: string; // Required - must always have an ID
  fieldName: string;
  internalFieldName?: string;
  fieldType: string;
  fieldOptions?: {
    uppercase?: boolean;
    options?: string[];
  };
  required: boolean;
  order: number;
  showOnMainPage?: boolean;
  /** Default value for this field when creating new attendees or importing */
  defaultValue?: string;
}

/**
 * Legacy Custom Field Value Format
 * Array of objects with customFieldId and value
 * Used in older data and during migrations
 * 
 * Example: [{ customFieldId: 'field-1', value: 'John' }]
 */
export interface LegacyCustomFieldValue {
  customFieldId: string;
  value: string | string[];
}

/**
 * Current Custom Field Value Format
 * Map/object with field IDs as keys and values as values
 * Used in current implementation
 * 
 * Example: { 'field-1': 'John', 'field-2': ['option1', 'option2'] }
 */
export type CurrentCustomFieldValues = Record<string, string | string[]>;

/**
 * Discriminated Union for Custom Field Values
 * Supports both legacy array format and current map format
 * 
 * Usage:
 * - Array format: Array.isArray(values) ? ... : ...
 * - Map format: typeof values === 'object' && !Array.isArray(values) ? ... : ...
 */
export type CustomFieldValues = LegacyCustomFieldValue[] | CurrentCustomFieldValues;

/**
 * Parsed Custom Field Values
 * Result of parsing JSON string into typed union
 * Includes fallback for invalid JSON
 */
export type ParsedCustomFieldValues = CustomFieldValues | Record<string, never>;

/**
 * Custom Field with Value
 * Represents a custom field with its resolved value for display
 */
export interface CustomFieldWithValue {
  customFieldId: string;
  fieldName: string;
  fieldType: string;
  value: string | null;
}

/**
 * Type guard to check if value is legacy array format
 * @param value - Value to check
 * @returns True if value is array of LegacyCustomFieldValue
 */
export function isLegacyCustomFieldValues(
  value: unknown,
): value is LegacyCustomFieldValue[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => {
        if (typeof item !== 'object' || item === null) {
          return false;
        }
        const obj = item as Record<string, unknown>;
        const itemValue = obj.value;
        return (
          typeof obj.customFieldId === 'string' &&
          (typeof itemValue === 'string' || (Array.isArray(itemValue) && itemValue.every((v) => typeof v === 'string')))
        );
      },
    )
  );
}

/**
 * Type guard to check if value is current map format
 * @param value - Value to check
 * @returns True if value is Record<string, string | string[]>
 */
export function isCurrentCustomFieldValues(
  value: unknown,
): value is CurrentCustomFieldValues {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return (
    (proto === Object.prototype || proto === null) &&
    Object.values(value).every(
      (v) => typeof v === 'string' || (Array.isArray(v) && v.every((item) => typeof item === 'string')),
    )
  );
}

/**
 * Parse custom field values from JSON string or object
 * Handles both legacy and current formats
 * 
 * @param value - Raw value (string or object)
 * @returns Parsed CustomFieldValues or empty object on error
 */
export function parseCustomFieldValues(
  value: unknown,
): ParsedCustomFieldValues {
  // If already an object, validate and return
  if (typeof value === 'object' && value !== null) {
    if (isLegacyCustomFieldValues(value) || isCurrentCustomFieldValues(value)) {
      return value;
    }
    // Invalid object format, return empty
    return {};
  }

  // If string, try to parse JSON
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (isLegacyCustomFieldValues(parsed) || isCurrentCustomFieldValues(parsed)) {
        return parsed;
      }
      return {};
    } catch (error) {
      console.error('Failed to parse custom field values:', error);
      return {};
    }
  }

  // Invalid type, return empty
  return {};
}

/**
 * Get value from custom field values (supports both formats)
 * @param values - Custom field values (legacy or current format)
 * @param fieldId - Field ID to look up
 * @returns Value or undefined
 */
export function getCustomFieldValue(
  values: CustomFieldValues | Record<string, never>,
  fieldId: string | undefined,
): string | string[] | undefined {
  if (fieldId === undefined) return undefined;
  
  if (isLegacyCustomFieldValues(values)) {
    // Legacy array format
    const item = values.find((cfv) => cfv.customFieldId === fieldId);
    return item?.value;
  } else if (isCurrentCustomFieldValues(values)) {
    // Current map format
    return values[fieldId];
  }
  return undefined;
}

/**
 * Format custom field value for display
 * Handles boolean, URL, and text field types
 * 
 * @param value - Raw value
 * @param fieldType - Type of field
 * @returns Formatted display value
 */
export function formatCustomFieldValue(
  value: string | string[] | null | undefined,
  fieldType: string,
): string | null {
  if (value === null || value === undefined) return null;

  // Handle array values (multi-select)
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  // Handle boolean fields
  if (fieldType === 'boolean') {
    const normalizedValue = String(value).trim().toLowerCase();
    if (normalizedValue === 'yes' || normalizedValue === 'true' || normalizedValue === '1') {
      return 'Yes';
    }
    if (normalizedValue === 'no' || normalizedValue === 'false' || normalizedValue === '0') {
      return 'No';
    }
    // Return the value as-is for unrecognized boolean representations
    return value;
  }

  // Handle URL fields
  if (fieldType === 'url') {
    return value;
  }

  // Default text handling
  return value;
}
