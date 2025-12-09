/**
 * Custom Field Mapping Utilities
 * 
 * Provides functions to map custom field values between different key formats:
 * - Field IDs (storage format)
 * - Display names (user-facing format)
 * - Internal names (approval profile rule format)
 */

/**
 * Represents a custom field definition with all naming variants
 */
export interface CustomFieldDefinition {
  $id: string;
  fieldName: string;
  internalFieldName?: string;
}

/**
 * Maps custom field values from field IDs to internal names
 * 
 * Used by mobile API to provide customFieldValuesByInternalName for approval profile rules.
 * 
 * @param customFieldValues - Object with field IDs as keys (or null/undefined)
 * @param customFieldInternalMap - Map of field ID -> internal name
 * @returns Object with internal names as keys, or empty object if input is invalid
 */
export function mapCustomFieldValuesByInternalName(
  customFieldValues: Record<string, any> | null | undefined,
  customFieldInternalMap: Map<string, string>
): Record<string, any> {
  if (!customFieldValues || typeof customFieldValues !== 'object' || Array.isArray(customFieldValues)) {
    return {};
  }
  
  const result: Record<string, any> = {};
  
  Object.entries(customFieldValues).forEach(([fieldId, value]) => {
    const internalName = customFieldInternalMap.get(fieldId) ?? fieldId;
    result[internalName] = value;
  });
  
  return result;
}

/**
 * Maps custom field values from field IDs to display names
 * 
 * Used by API to provide customFieldValuesByName for user-facing display.
 * 
 * @param customFieldValues - Object with field IDs as keys (or null/undefined)
 * @param customFieldMap - Map of field ID -> display name
 * @returns Object with display names as keys, or empty object if input is invalid
 */
export function mapCustomFieldValuesByName(
  customFieldValues: Record<string, any> | null | undefined,
  customFieldMap: Map<string, string>
): Record<string, any> {
  if (!customFieldValues || typeof customFieldValues !== 'object' || Array.isArray(customFieldValues)) {
    return {};
  }
  
  const result: Record<string, any> = {};
  
  Object.entries(customFieldValues).forEach(([fieldId, value]) => {
    const displayName = customFieldMap.get(fieldId) ?? fieldId;
    result[displayName] = value;
  });
  
  return result;
}

/**
 * Builds both mapping maps from custom field definitions
 * 
 * @param customFields - Array of custom field definitions
 * @returns Tuple of [displayNameMap, internalNameMap]
 */
export function buildCustomFieldMaps(
  customFields: CustomFieldDefinition[] | null | undefined,
): [Map<string, string>, Map<string, string>] {
  const displayNameMap = new Map<string, string>();
  const internalNameMap = new Map<string, string>();
  
  if (!Array.isArray(customFields)) {
    return [displayNameMap, internalNameMap];
  }
  
  customFields.forEach(field => {
    if (field.$id && field.fieldName) {
      displayNameMap.set(field.$id, field.fieldName);
    }
    if (field.$id && field.internalFieldName) {
      internalNameMap.set(field.$id, field.internalFieldName);
    }
  });
  
  return [displayNameMap, internalNameMap];
}

/**
 * Creates all three custom field value mappings from raw values
 * 
 * @param customFieldValues - Raw custom field values (field IDs as keys, or null/undefined)
 * @param customFieldMap - Map of field ID -> display name
 * @param customFieldInternalMap - Map of field ID -> internal name
 * @returns Object with all three mapping formats (empty objects if input is invalid)
 */
export function createAllCustomFieldMappings(
  customFieldValues: Record<string, any> | null | undefined,
  customFieldMap: Map<string, string>,
  customFieldInternalMap: Map<string, string>
): {
  customFieldValues: Record<string, any>;
  customFieldValuesByName: Record<string, any>;
  customFieldValuesByInternalName: Record<string, any>;
} {
  const normalized = customFieldValues && typeof customFieldValues === 'object' && !Array.isArray(customFieldValues)
    ? customFieldValues
    : {};
  
  return {
    customFieldValues: normalized,
    customFieldValuesByName: mapCustomFieldValuesByName(normalized, customFieldMap),
    customFieldValuesByInternalName: mapCustomFieldValuesByInternalName(normalized, customFieldInternalMap)
  };
}
