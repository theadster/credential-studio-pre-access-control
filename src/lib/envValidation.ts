/**
 * Environment Variable Validation Helpers
 * 
 * Provides utilities for validating required environment variables
 * with clear error messages listing missing variables.
 */

export interface EnvValidationResult {
  isValid: boolean;
  missingVars: string[];
  errorMessage?: string;
}

/**
 * Validate that required environment variables are defined and non-empty
 * 
 * @param envVars - Object mapping variable names to their values
 * @returns Validation result with missing variables list
 * 
 * @example
 * ```typescript
 * const result = validateEnvVars({
 *   'DATABASE_ID': process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
 *   'API_KEY': process.env.API_KEY
 * });
 * 
 * if (!result.isValid) {
 *   throw new Error(result.errorMessage);
 * }
 * ```
 */
export function validateEnvVars(
  envVars: Record<string, string | undefined>
): EnvValidationResult {
  const missingVars: string[] = [];

  for (const [name, value] of Object.entries(envVars)) {
    if (!value || value.trim() === '') {
      missingVars.push(name);
    }
  }

  if (missingVars.length > 0) {
    return {
      isValid: false,
      missingVars,
      errorMessage: `Missing required environment variables: ${missingVars.join(', ')}`
    };
  }

  return {
    isValid: true,
    missingVars: []
  };
}

/**
 * Get a required environment variable or throw an error
 * 
 * @param name - Environment variable name
 * @param value - Environment variable value
 * @returns The validated value
 * @throws Error if the variable is undefined or empty
 * 
 * @example
 * ```typescript
 * const dbId = getRequiredEnv('NEXT_PUBLIC_APPWRITE_DATABASE_ID', process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID);
 * ```
 */
export function getRequiredEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Validate required Appwrite collection IDs
 * Common helper for API routes that need database access
 * 
 * @returns Validation result with missing variables
 * 
 * @example
 * ```typescript
 * const validation = validateAppwriteEnv();
 * if (!validation.isValid) {
 *   return res.status(500).json({
 *     error: 'Server configuration error',
 *     details: validation.errorMessage,
 *     missingVariables: validation.missingVars
 *   });
 * }
 * ```
 */
export function validateAppwriteEnv(): EnvValidationResult {
  return validateEnvVars({
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID': process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
    'NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
    'NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
    'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID,
    'NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
    'NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID,
    'NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID
  });
}

/**
 * Get validated Appwrite collection IDs or throw an error
 * 
 * @returns Object with all validated collection IDs
 * @throws Error if any required variables are missing
 * 
 * @example
 * ```typescript
 * try {
 *   const { dbId, attendeesCollectionId, ... } = getAppwriteCollectionIds();
 *   // Use the validated IDs
 * } catch (error) {
 *   return res.status(500).json({ error: error.message });
 * }
 * ```
 */
export function getAppwriteCollectionIds() {
  const validation = validateAppwriteEnv();
  
  if (!validation.isValid) {
    throw new Error(validation.errorMessage);
  }

  return {
    dbId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string,
    attendeesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID as string,
    customFieldsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID as string,
    eventSettingsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID as string,
    usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID as string,
    rolesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID as string,
    logsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID as string
  };
}
