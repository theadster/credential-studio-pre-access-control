/**
 * Validation Utilities
 * 
 * Provides validation functions for form inputs, JSON structures,
 * and integration configurations.
 */

/**
 * Validates JSON string format
 * 
 * @param jsonString - String to validate as JSON
 * @returns Validation result with error message if invalid
 * 
 * @example
 * ```typescript
 * const result = validateJSON('{"valid": true}');
 * // { valid: true }
 * 
 * const invalid = validateJSON('{invalid}');
 * // { valid: false, error: 'Unexpected token...' }
 * ```
 */
export function validateJSON(jsonString: string): { valid: boolean; error?: string } {
  if (!jsonString || typeof jsonString !== 'string') {
    return { valid: false, error: 'JSON string is required' };
  }

  try {
    JSON.parse(jsonString);
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : 'Invalid JSON format'
    };
  }
}

/**
 * Validates Switchboard Canvas API request body
 * 
 * Ensures the request body is valid JSON and contains required placeholders
 * 
 * @param body - JSON string for Switchboard API request
 * @returns Validation result with error message if invalid
 * 
 * @example
 * ```typescript
 * const body = '{"template_id": "{{template_id}}", "data": {}}';
 * const result = validateSwitchboardRequestBody(body);
 * // { valid: true }
 * ```
 */
export function validateSwitchboardRequestBody(body: string): { valid: boolean; error?: string } {
  // First validate JSON structure
  const jsonValidation = validateJSON(body);
  if (!jsonValidation.valid) {
    return jsonValidation;
  }

  // Check for required template_id placeholder
  if (!body.includes('{{template_id}}')) {
    return {
      valid: false,
      error: 'Request body must include {{template_id}} placeholder for the Switchboard template ID'
    };
  }

  // Validate that it's an object (not array or primitive)
  // Wrap JSON.parse in try/catch for defensive error handling
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        valid: false,
        error: 'Request body must be a JSON object'
      };
    }
  } catch (error) {
    // Handle any parsing errors defensively
    return {
      valid: false,
      error: 'Request body must be a valid JSON object'
    };
  }

  return { valid: true };
}

/**
 * Validates event settings required fields
 * 
 * @param settings - Event settings object to validate
 * @param isUpdate - Whether this is an update operation (optional fields allowed)
 * @returns Validation result with error message if invalid
 */
export function validateEventSettings(settings: any, isUpdate: boolean = false): { valid: boolean; error?: string } {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return {
      valid: false,
      error: 'Settings object is required'
    };
  }

  const requiredFields = ['eventName', 'eventDate', 'eventLocation'];

  // For updates, only validate required fields if they're present
  // This allows partial updates (e.g., only updating accessControlDefaults)
  for (const field of requiredFields) {
    const value = settings[field];
    
    // Skip validation if field is not present in update
    if (isUpdate && value === undefined) {
      continue;
    }
    
    // Validate if field is present
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return {
        valid: false,
        error: `${field} is required`
      };
    }
  }

  // Validate barcode length
  if (settings.barcodeLength !== undefined && settings.barcodeLength !== null) {
    const length = parseInt(settings.barcodeLength);
    if (isNaN(length) || length < 4 || length > 20) {
      return {
        valid: false,
        error: 'Barcode length must be between 4 and 20 characters'
      };
    }
  }

  // Validate OneSimpleAPI configuration
  if (settings.oneSimpleApiEnabled) {
    // Webhook URL is required when OneSimpleAPI is enabled
    if (!settings.oneSimpleApiUrl || settings.oneSimpleApiUrl.trim() === '') {
      return {
        valid: false,
        error: 'Webhook URL is required when OneSimpleAPI integration is enabled'
      };
    }

    // Validate URL format
    if (!isValidURL(settings.oneSimpleApiUrl)) {
      return {
        valid: false,
        error: 'Webhook URL must be a valid URL (e.g., https://api.example.com/webhook)'
      };
    }
  }

  return { valid: true };
}

/**
 * Validates custom field configuration
 * 
 * @param field - Custom field object to validate
 * @returns Validation result with error message if invalid
 */
export function validateCustomField(field: any): { valid: boolean; error?: string } {
  if (!field.fieldName || field.fieldName.trim() === '') {
    return {
      valid: false,
      error: 'Field name is required'
    };
  }

  if (!field.fieldType) {
    return {
      valid: false,
      error: 'Field type is required'
    };
  }

  // Validate select field has options
  if (field.fieldType === 'select') {
    if (!field.fieldOptions?.options || !Array.isArray(field.fieldOptions.options)) {
      return {
        valid: false,
        error: 'Select fields must have at least one option'
      };
    }

    if (field.fieldOptions.options.length === 0) {
      return {
        valid: false,
        error: 'Select fields must have at least one option'
      };
    }

    // Check for empty options
    const hasEmptyOption = field.fieldOptions.options.some((opt: string) => !opt || opt.trim() === '');
    if (hasEmptyOption) {
      return {
        valid: false,
        error: 'Select options cannot be empty'
      };
    }
  }

  return { valid: true };
}

/**
 * Validates field mapping configuration
 * 
 * @param mapping - Field mapping object to validate
 * @returns Validation result with error message if invalid
 */
export function validateFieldMapping(mapping: any): { valid: boolean; error?: string } {
  if (!mapping.fieldId) {
    return {
      valid: false,
      error: 'Field ID is required'
    };
  }

  if (!mapping.jsonVariable || mapping.jsonVariable.trim() === '') {
    return {
      valid: false,
      error: 'JSON variable name is required'
    };
  }

  // Validate JSON variable name format (must be valid JavaScript identifier)
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(mapping.jsonVariable)) {
    return {
      valid: false,
      error: 'JSON variable must be a valid identifier (letters, numbers, underscores, $)'
    };
  }

  return { valid: true };
}

/**
 * Validates URL format
 * 
 * @param url - URL string to validate
 * @returns True if valid URL, false otherwise
 */
export function isValidURL(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates email format
 * 
 * @param email - Email string to validate
 * @returns True if valid email format, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
