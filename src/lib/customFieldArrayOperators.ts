/**
 * Custom Field Array Operators
 * 
 * This module provides utilities for working with array-based custom fields
 * using Appwrite's database operators for atomic operations.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.2
 */

import { arrayOperators } from './operators';

/**
 * Determines if a custom field should use array storage
 * 
 * Array storage is used for:
 * - Select fields with multiple: true option
 * - Any field type explicitly marked as array-based
 * 
 * @param fieldType - The type of the custom field
 * @param fieldOptions - The field configuration options
 * @returns true if the field should store values as an array
 */
export function isArrayField(fieldType: string, fieldOptions: any): boolean {
  // Parse fieldOptions if it's a string
  const options = typeof fieldOptions === 'string' 
    ? JSON.parse(fieldOptions) 
    : fieldOptions;
  
  // Select fields with multiple option enabled
  if (fieldType === 'select' && options?.multiple === true) {
    return true;
  }
  
  // Explicitly marked array fields
  if (options?.isArray === true) {
    return true;
  }
  
  return false;
}

/**
 * Parses a custom field value based on whether it's an array field
 * 
 * @param value - The stored value (string or array)
 * @param isArray - Whether this is an array field
 * @returns Parsed value in the correct format
 */
export function parseCustomFieldValue(value: any, isArray: boolean): any {
  if (isArray) {
    // Array fields should be stored as actual arrays
    if (Array.isArray(value)) {
      return value;
    }
    // Handle legacy comma-separated strings
    if (typeof value === 'string' && value) {
      return value.split(',').map(v => v.trim()).filter(v => v);
    }
    return [];
  } else {
    // Single-value fields stored as strings
    return String(value || '');
  }
}

/**
 * Formats a custom field value for storage
 * 
 * @param value - The value to store
 * @param isArray - Whether this is an array field
 * @returns Formatted value ready for database storage
 */
export function formatCustomFieldValue(value: any, isArray: boolean): any {
  if (isArray) {
    // Ensure array format
    if (Array.isArray(value)) {
      return value.filter(v => v !== null && v !== undefined && v !== '');
    }
    if (typeof value === 'string' && value) {
      return value.split(',').map(v => v.trim()).filter(v => v);
    }
    return [];
  } else {
    // Single value as string
    return String(value || '');
  }
}

/**
 * Creates an operator to append values to an array field
 * 
 * @param fieldId - The custom field ID
 * @param values - Values to append (string or array)
 * @returns Object with field ID and operator
 */
export function createArrayAppendOperator(fieldId: string, values: string | string[]): { fieldId: string; operator: any } {
  const valuesArray = Array.isArray(values) ? values : [values];
  const filteredValues = valuesArray.filter(v => v !== null && v !== undefined && v !== '');
  
  if (filteredValues.length === 0) {
    throw new Error('Cannot append empty values to array field');
  }
  
  return {
    fieldId,
    operator: arrayOperators.append(filteredValues)
  };
}

/**
 * Creates an operator to remove values from an array field
 * 
 * @param fieldId - The custom field ID
 * @param values - Values to remove (string or array)
 * @returns Object with field ID and operator
 */
export function createArrayRemoveOperator(fieldId: string, values: string | string[]): { fieldId: string; operator: any } {
  const valuesArray = Array.isArray(values) ? values : [values];
  const filteredValues = valuesArray.filter(v => v !== null && v !== undefined && v !== '');
  
  if (filteredValues.length === 0) {
    throw new Error('Cannot remove empty values from array field');
  }
  
  // For multiple values, we need to create multiple remove operations
  // Appwrite's arrayRemove only removes one value at a time
  return {
    fieldId,
    operator: filteredValues.length === 1 
      ? arrayOperators.remove(filteredValues[0])
      : arrayOperators.diff(filteredValues) // Use diff to remove multiple values
  };
}

/**
 * Creates an operator to ensure unique values in an array field
 * 
 * @param fieldId - The custom field ID
 * @returns Object with field ID and operator
 */
export function createArrayUniqueOperator(fieldId: string): { fieldId: string; operator: any } {
  return {
    fieldId,
    operator: arrayOperators.unique()
  };
}

/**
 * Builds update data for custom field values with array operator support
 * 
 * This function determines which fields need array operators and which
 * can use traditional updates, then constructs the appropriate update object.
 * 
 * @param customFieldsMap - Map of field ID to field metadata
 * @param changes - Object mapping field IDs to new values
 * @param currentValues - Current custom field values object
 * @param operation - Type of operation: 'set', 'append', 'remove'
 * @returns Update data object with operators where applicable
 */
export function buildCustomFieldUpdateData(
  customFieldsMap: Map<string, { fieldType: string; fieldOptions: any }>,
  changes: Record<string, any>,
  currentValues: Record<string, any>,
  operation: 'set' | 'append' | 'remove' = 'set'
): Record<string, any> {
  const updateData: Record<string, any> = {};
  
  for (const [fieldId, newValue] of Object.entries(changes)) {
    const fieldMeta = customFieldsMap.get(fieldId);
    if (!fieldMeta) {
      continue; // Skip unknown fields
    }
    
    const isArray = isArrayField(fieldMeta.fieldType, fieldMeta.fieldOptions);
    
    if (isArray) {
      // Use array operators for array fields
      if (operation === 'append') {
        const { operator } = createArrayAppendOperator(fieldId, newValue);
        updateData[fieldId] = operator;
      } else if (operation === 'remove') {
        const { operator } = createArrayRemoveOperator(fieldId, newValue);
        updateData[fieldId] = operator;
      } else {
        // For 'set' operation, replace the entire array
        updateData[fieldId] = formatCustomFieldValue(newValue, true);
      }
    } else {
      // Traditional update for single-value fields
      updateData[fieldId] = formatCustomFieldValue(newValue, false);
    }
  }
  
  return updateData;
}

/**
 * Validates array field operations
 * 
 * @param fieldId - The custom field ID
 * @param operation - The operation type
 * @param value - The value being operated on
 * @param fieldMeta - Field metadata
 * @throws Error if validation fails
 */
export function validateArrayFieldOperation(
  fieldId: string,
  operation: 'set' | 'append' | 'remove',
  value: any,
  fieldMeta: { fieldType: string; fieldOptions: any }
): void {
  const isArray = isArrayField(fieldMeta.fieldType, fieldMeta.fieldOptions);
  
  if (!isArray && (operation === 'append' || operation === 'remove')) {
    throw new Error(
      `Cannot perform ${operation} operation on non-array field ${fieldId}. ` +
      `Field type: ${fieldMeta.fieldType}`
    );
  }
  
  if (operation === 'append' || operation === 'remove') {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      throw new Error(
        `Cannot ${operation} empty values to/from array field ${fieldId}`
      );
    }
  }
  
  // Validate select field options if applicable
  if (fieldMeta.fieldType === 'select' && fieldMeta.fieldOptions) {
    const options = typeof fieldMeta.fieldOptions === 'string'
      ? JSON.parse(fieldMeta.fieldOptions)
      : fieldMeta.fieldOptions;
    
    if (options.options && Array.isArray(options.options)) {
      const validOptions = new Set(options.options);
      const valuesToCheck = Array.isArray(value) ? value : [value];
      
      for (const val of valuesToCheck) {
        if (val && !validOptions.has(val)) {
          throw new Error(
            `Invalid option "${val}" for select field ${fieldId}. ` +
            `Valid options: ${options.options.join(', ')}`
          );
        }
      }
    }
  }
}
