/**
 * Custom Field Constants
 * 
 * This file defines standard values and formats for custom fields
 * to ensure consistency across the application.
 */

/**
 * CRITICAL: Boolean Custom Field Format
 * 
 * Boolean custom fields MUST use 'yes'/'no' format (NOT 'true'/'false')
 * 
 * This standard is enforced across:
 * - Form inputs (Switch component)
 * - Database storage
 * - Import/export operations
 * - Bulk edit operations
 * - Switchboard integration field mappings
 * - Display logic
 * 
 * DO NOT change to 'true'/'false' - it will corrupt data and break integrations.
 * 
 * See: docs/fixes/BOOLEAN_FIELD_DATA_CORRUPTION_FIX.md
 */

/**
 * Boolean field value for "checked" or "true" state
 * @constant
 */
export const BOOLEAN_TRUE_VALUE = 'yes' as const;

/**
 * Boolean field value for "unchecked" or "false" state
 * @constant
 */
export const BOOLEAN_FALSE_VALUE = 'no' as const;

/**
 * Default value for boolean fields when no value is set
 * @constant
 */
export const BOOLEAN_DEFAULT_VALUE = BOOLEAN_FALSE_VALUE;

/**
 * Type definition for boolean field values
 */
export type BooleanFieldValue = typeof BOOLEAN_TRUE_VALUE | typeof BOOLEAN_FALSE_VALUE;

/**
 * Type guard to check if a value is a valid boolean field value
 * @param value - The value to check
 * @returns True if the value is 'yes' or 'no'
 */
export function isBooleanFieldValue(value: unknown): value is BooleanFieldValue {
  return value === BOOLEAN_TRUE_VALUE || value === BOOLEAN_FALSE_VALUE;
}

/**
 * Convert various boolean representations to the standard 'yes'/'no' format
 * Used in import operations to normalize different input formats
 * 
 * @param value - Input value (YES/NO, TRUE/FALSE, 1/0, yes/no, true/false, etc.)
 * @returns Standardized 'yes' or 'no' value
 */
export function normalizeBooleanValue(value: unknown): BooleanFieldValue {
  if (typeof value === 'boolean') {
    return value ? BOOLEAN_TRUE_VALUE : BOOLEAN_FALSE_VALUE;
  }

  const stringValue = String(value).toLowerCase().trim();
  const truthyValues = ['yes', 'true', '1', 'y', 't'];
  
  return truthyValues.includes(stringValue) ? BOOLEAN_TRUE_VALUE : BOOLEAN_FALSE_VALUE;
}

/**
 * Convert boolean field value to display format
 * Accepts both 'yes'/'no' (standard) and 'true'/'false' (legacy) for graceful handling
 * 
 * @param value - Boolean field value ('yes', 'no', 'true', 'false', etc.)
 * @returns Display string ('Yes' or 'No')
 */
export function formatBooleanDisplay(value: unknown): 'Yes' | 'No' {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return (normalizedValue === 'yes' || normalizedValue === 'true') ? 'Yes' : 'No';
}

/**
 * Validate that a boolean field value is in the correct format
 * Throws an error if the value is 'true' or 'false' (incorrect format)
 * 
 * @param value - Value to validate
 * @param fieldName - Name of the field (for error messages)
 * @throws Error if value is in incorrect format
 */
export function validateBooleanFieldValue(value: unknown, fieldName: string): void {
  if (value === 'true' || value === 'false') {
    throw new Error(
      `Invalid boolean field value for "${fieldName}": "${value}". ` +
      `Boolean fields must use 'yes'/'no' format, not 'true'/'false'. ` +
      `See: docs/fixes/BOOLEAN_FIELD_DATA_CORRUPTION_FIX.md`
    );
  }

  if (value !== BOOLEAN_TRUE_VALUE && value !== BOOLEAN_FALSE_VALUE && value !== '' && value !== null && value !== undefined) {
    console.warn(
      `Unexpected boolean field value for "${fieldName}": "${value}". ` +
      `Expected 'yes' or 'no'. Defaulting to 'no'.`
    );
  }
}
