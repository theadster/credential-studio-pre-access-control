/**
 * Permission validation utility
 * Validates permission structures for role management
 */

export interface PermissionValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    message?: string;
    unknownKeys?: string[];
    key?: string;
  };
}

const ALLOWED_PERMISSION_KEYS = [
  'attendees',
  'users',
  'roles',
  'eventSettings',
  'customFields',
  'logs',
  'system',
  'monitoring',
  'accessControl',
  'approvalProfiles',
  'scanLogs',
  'all'
];

/**
 * Validates a permissions object structure
 * 
 * @param permissions - The permissions object to validate
 * @returns Validation result with error details if invalid
 * 
 * @example
 * // Valid permission structures:
 * validatePermissions({ all: true })
 * validatePermissions({ attendees: { read: true, create: false } })
 * validatePermissions({ users: ['read', 'update'] })
 * 
 * // Invalid structures:
 * validatePermissions(null) // Must be an object
 * validatePermissions({ invalid: true }) // Unknown key
 * validatePermissions({ all: 'yes' }) // Wrong type
 */
export function validatePermissions(permissions: unknown): PermissionValidationResult {
  // Check if permissions is a valid object (not null, not array)
  if (permissions === null || typeof permissions !== 'object' || Array.isArray(permissions)) {
    return {
      valid: false,
      error: 'Permissions must be a valid JSON object'
    };
  }

  const permissionKeys = Object.keys(permissions);

  // Check for unknown permission keys
  const unknownKeys = permissionKeys.filter(key => !ALLOWED_PERMISSION_KEYS.includes(key));
  if (unknownKeys.length > 0) {
    return {
      valid: false,
      error: 'Invalid permission keys detected',
      details: {
        message: `Unknown permission keys: ${unknownKeys.join(', ')}. Allowed keys are: ${ALLOWED_PERMISSION_KEYS.join(', ')}`,
        unknownKeys
      }
    };
  }

  // Validate each permission value type
  for (const [key, value] of Object.entries(permissions)) {
    // Each permission value should be either:
    // 1. A boolean (for 'all' permission)
    // 2. An object with boolean values (for specific CRUD permissions)
    // 3. An array of strings (for specific permission names)

    if (key === 'all') {
      // 'all' should be a boolean
      if (typeof value !== 'boolean') {
        return {
          valid: false,
          error: 'Invalid permission value type',
          details: {
            message: `Permission '${key}' must be a boolean, got ${typeof value}`,
            key
          }
        };
      }
    } else {
      // Other permissions should be objects with boolean values or arrays of strings
      if (value === null || typeof value !== 'object') {
        return {
          valid: false,
          error: 'Invalid permission value type',
          details: {
            message: `Permission '${key}' must be an object or array, got ${typeof value}`,
            key
          }
        };
      }

      // If it's an object (not array), validate its properties are booleans
      if (!Array.isArray(value)) {
        for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
          if (typeof subValue !== 'boolean') {
            return {
              valid: false,
              error: 'Invalid permission value type',
              details: {
                message: `Permission '${key}.${subKey}' must be a boolean, got ${typeof subValue}`,
                key: `${key}.${subKey}`
              }
            };
          }
        }
      } else {
        // If it's an array, validate all elements are strings
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] !== 'string') {
            return {
              valid: false,
              error: 'Invalid permission value type',
              details: {
                message: `Permission '${key}[${i}]' must be a string, got ${typeof value[i]}`,
                key: `${key}[${i}]`
              }
            };
          }
        }
      }
    }
  }

  return { valid: true };
}
