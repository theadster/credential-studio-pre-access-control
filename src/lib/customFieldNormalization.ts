/**
 * Custom Field Normalization Utilities
 * 
 * Ensures custom field values are always stored in the correct object format:
 * {"fieldId": "value", "fieldId2": "value2"}
 * 
 * Prevents legacy array format from being saved:
 * [{"customFieldId": "id", "value": "val"}]
 */

/**
 * Normalizes custom field values to ensure they're in object format
 * 
 * @param customFieldValues - The custom field values to normalize (can be string, object, or array)
 * @returns Normalized object format or null if invalid
 */
export function normalizeCustomFieldValues(
  customFieldValues: string | Record<string, any> | Array<any> | null | undefined
): Record<string, any> | null {
  // Handle null/undefined (but allow empty string to be parsed)
  if (customFieldValues === null || customFieldValues === undefined) {
    return null;
  }

  let parsed: any;

  // Parse if string
  if (typeof customFieldValues === 'string') {
    try {
      parsed = JSON.parse(customFieldValues);
    } catch (error) {
      console.error('Failed to parse custom field values:', error);
      return null;
    }
  } else {
    parsed = customFieldValues;
  }

  // If already in object format, return as-is
  if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
    return parsed;
  }

  // Convert legacy array format to object format
  if (Array.isArray(parsed)) {
    // Treat empty arrays as invalid (consistent with other invalid formats returning null)
    // Empty arrays provide no field data and should be normalized to null rather than {}
    if (parsed.length === 0) {
      return null;
    }

    const normalized: Record<string, any> = {};
    
    for (const item of parsed) {
      if (item && typeof item === 'object' && item.customFieldId !== undefined) {
        // Normalize and validate the key: coerce to string, trim, and skip if empty
        const normalizedKey = String(item.customFieldId).trim();
        if (normalizedKey.length === 0) {
          continue; // Skip entries with empty keys
        }
        
        // Skip entries with undefined values (allow null, false, 0, empty string, etc.)
        if (item.value === undefined) {
          continue;
        }
        
        normalized[normalizedKey] = item.value;
      }
    }

    // If no valid entries were extracted, treat as invalid (consistent with empty array)
    if (Object.keys(normalized).length === 0) {
      return null;
    }

    console.warn('Converted legacy array format to object format:', {
      arrayLength: parsed.length,
      objectKeys: Object.keys(normalized).length
    });

    return normalized;
  }

  // Invalid format
  console.error('Invalid custom field values format:', typeof parsed);
  return null;
}

/**
 * Validates that custom field values can be normalized to valid format
 * 
 * Accepts:
 * - null/undefined (no custom fields)
 * - Objects in correct format: {"fieldId": "value"}
 * - Legacy arrays that can be converted: [{"customFieldId": "id", "value": "val"}]
 * - JSON strings that parse to either format above
 * 
 * @param customFieldValues - The custom field values to validate
 * @returns true if valid/normalizable format, false otherwise
 */
export function isValidCustomFieldFormat(
  customFieldValues: string | Record<string, any> | Array<any> | null | undefined
): boolean {
  if (customFieldValues === null || customFieldValues === undefined) {
    return true; // null/undefined is valid (no custom fields)
  }

  let parsed: any;

  // Parse if string
  if (typeof customFieldValues === 'string') {
    try {
      parsed = JSON.parse(customFieldValues);
    } catch (error) {
      return false;
    }
  } else {
    parsed = customFieldValues;
  }

  // Must be an object or array (not null)
  // Objects are valid as-is, arrays can be normalized by normalizeCustomFieldValues
  return typeof parsed === 'object' && parsed !== null;
}

/**
 * Safely stringifies custom field values after normalization
 * 
 * @param customFieldValues - The custom field values to stringify
 * @returns JSON string of normalized values
 * @throws Error if custom field values cannot be normalized (invalid format)
 */
export function stringifyCustomFieldValues(
  customFieldValues: string | Record<string, any> | Array<any> | null | undefined
): string {
  const normalized = normalizeCustomFieldValues(customFieldValues);
  
  if (normalized === null) {
    throw new Error(
      `Invalid custom field values: cannot normalize input. ` +
      `Received: ${typeof customFieldValues === 'string' ? customFieldValues : JSON.stringify(customFieldValues)}`
    );
  }
  
  return JSON.stringify(normalized);
}
