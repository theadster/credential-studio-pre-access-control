/**
 * Switchboard Configuration Helper
 * 
 * Provides secure access to Switchboard API credentials from environment variables.
 * This replaces the previous insecure practice of storing credentials in the database.
 * 
 * SECURITY: Credentials are NEVER stored in the database or exposed to the client.
 * They must be configured as server-side environment variables.
 */

/**
 * Get Switchboard API key from environment variables
 * 
 * @throws {Error} If API key is not configured
 * @returns {string} Switchboard API key
 * 
 * @example
 * ```typescript
 * // In API route or server-side code
 * const apiKey = getSwitchboardApiKey();
 * 
 * // Use in API request
 * const response = await fetch(switchboardEndpoint, {
 *   headers: {
 *     'Authorization': `Bearer ${apiKey}`,
 *   },
 * });
 * ```
 */
export function getSwitchboardApiKey(): string {
  const apiKey = process.env.SWITCHBOARD_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Switchboard API key not configured. Missing environment variable: SWITCHBOARD_API_KEY. ' +
      'See docs/migration/INTEGRATION_SECRETS_MIGRATION.md for configuration instructions.'
    );
  }

  return apiKey;
}

/**
 * Validate that Switchboard API key is configured
 * 
 * @returns {boolean} True if API key is configured, false otherwise
 * 
 * @example
 * ```typescript
 * if (!isSwitchboardConfigured()) {
 *   return res.status(500).json({ 
 *     error: 'Switchboard integration not configured' 
 *   });
 * }
 * ```
 */
export function isSwitchboardConfigured(): boolean {
  try {
    getSwitchboardApiKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get safe Switchboard configuration for logging (API key redacted)
 * 
 * @returns {object} Configuration with redacted API key
 * 
 * @example
 * ```typescript
 * console.log('Switchboard config:', getSafeSwitchboardConfig());
 * // Output: { apiKey: '***REDACTED***', configured: 'true' }
 * ```
 */
export function getSafeSwitchboardConfig(): Record<string, string> {
  try {
    getSwitchboardApiKey();
    return {
      apiKey: '***REDACTED***',
      configured: 'true',
    };
  } catch {
    return {
      configured: 'false',
      error: 'API key not configured',
    };
  }
}

/**
 * Get Switchboard configuration with integration settings
 * 
 * @param {object} integration - Integration settings from database
 * @returns {object} Complete configuration including API key from environment
 * 
 * @example
 * ```typescript
 * // Get integration settings from database
 * const integration = await getSwitchboardIntegration(eventSettingsId);
 * 
 * // Merge with secure API key
 * const config = getSwitchboardConfig(integration);
 * // Returns: { apiKey, apiEndpoint, authHeaderType, templateId, ... }
 * ```
 */
export function getSwitchboardConfig(integration: {
  apiEndpoint?: string;
  authHeaderType?: string;
  templateId?: string;
  requestBody?: string;
  fieldMappings?: string;
}): {
  apiKey: string;
  apiEndpoint?: string;
  authHeaderType?: string;
  templateId?: string;
  requestBody?: string;
  fieldMappings?: string;
} {
  const apiKey = getSwitchboardApiKey();

  return {
    apiKey,
    ...integration,
  };
}

/**
 * SECURITY NOTE:
 * 
 * This module intentionally does NOT provide any way to:
 * - Store API key in the database
 * - Retrieve API key from the database
 * - Expose API key to client-side code
 * 
 * All API key access must go through environment variables.
 * 
 * For multi-tenant scenarios where different events use different Switchboard accounts,
 * consider using Appwrite Functions with per-function environment variables,
 * or an external secrets manager like AWS Secrets Manager.
 */
