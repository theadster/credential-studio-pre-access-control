/**
 * Parses custom field values from various formats into a standardized array format.
 * 
 * @param customFieldValues - Can be null, undefined, a JSON string, an object, or an array
 * @returns Array of {customFieldId: string, value: string} objects
 */
export function parseCustomFieldValues(
  customFieldValues: any
): Array<{ customFieldId: string; value: string }> {
  if (!customFieldValues) {
    return [];
  }

  // Parse if it's a JSON string
  let parsed;
  if (typeof customFieldValues === 'string') {
    try {
      parsed = JSON.parse(customFieldValues);
    } catch (error) {
      console.error('Failed to parse customFieldValues:', error);
      return [];
    }
  } else {
    parsed = customFieldValues;
  }

  // Convert object format {fieldId: value} to array format [{customFieldId, value}]
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return Object.entries(parsed).map(([customFieldId, value]) => ({
      customFieldId,
      value: String(value)
    }));
  }

  // Validate and normalize array format
  if (Array.isArray(parsed)) {
    const validatedArray: Array<{ customFieldId: string; value: string }> = [];

    for (let i = 0; i < parsed.length; i++) {
      const element = parsed[i];

      // Validate element is an object
      if (typeof element !== 'object' || element === null) {
        throw new TypeError(
          `Invalid custom field value at index ${i}: expected object, got ${typeof element}`
        );
      }

      // Validate customFieldId exists and is a string
      if (!('customFieldId' in element)) {
        throw new TypeError(
          `Invalid custom field value at index ${i}: missing required field 'customFieldId'`
        );
      }

      const { customFieldId } = element;
      if (typeof customFieldId !== 'string' && typeof customFieldId !== 'number') {
        throw new TypeError(
          `Invalid custom field value at index ${i}: customFieldId must be string or number, got ${typeof customFieldId}`
        );
      }

      // Validate value field exists
      if (!('value' in element)) {
        throw new TypeError(
          `Invalid custom field value at index ${i}: missing required field 'value'`
        );
      }

      // Normalize to expected format
      validatedArray.push({
        customFieldId: String(customFieldId),
        value: String(element.value)
      });
    }

    return validatedArray;
  }

  return [];
}
