/**
 * Cloudinary Configuration Helper
 * 
 * Provides secure access to Cloudinary credentials.
 * - API credentials (apiKey, apiSecret) are read from environment variables (SECURE)
 * - Configuration (cloudName, uploadPreset, etc.) is read from database
 * 
 * SECURITY: API credentials are NEVER stored in the database or exposed to the client.
 * They must be configured as server-side environment variables.
 */

export interface CloudinarySecrets {
  apiKey: string;
  apiSecret: string;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset?: string;
}

/**
 * Get Cloudinary API credentials from environment variables
 * 
 * @throws {Error} If credentials are not configured
 * @returns {CloudinarySecrets} Cloudinary API credentials (key and secret only)
 * 
 * @example
 * ```typescript
 * // In API route or server-side code
 * const secrets = getCloudinarySecrets();
 * // Returns: { apiKey: '...', apiSecret: '...' }
 * ```
 */
export function getCloudinarySecrets(): CloudinarySecrets {
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // Validate all required credentials are present
  if (!apiKey || !apiSecret) {
    const missing: string[] = [];
    if (!apiKey) missing.push('CLOUDINARY_API_KEY');
    if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');

    throw new Error(
      `Cloudinary API credentials not configured. Missing environment variables: ${missing.join(', ')}. ` +
      'Add these to your .env.local file. See docs/fixes/CLOUDINARY_API_KEY_ENV_FIX.md for instructions.'
    );
  }

  return {
    apiKey,
    apiSecret,
  };
}

/**
 * Get complete Cloudinary configuration for SDK initialization
 * Combines database configuration (cloudName, uploadPreset) with environment secrets (apiKey, apiSecret)
 * 
 * @param {string} cloudName - Cloud name from database integration settings
 * @param {string} [uploadPreset] - Optional upload preset from database settings
 * @returns {CloudinaryConfig} Complete Cloudinary configuration
 * 
 * @example
 * ```typescript
 * // Get integration settings from database
 * const integration = await getCloudinaryIntegration(databases, eventSettingsId);
 * 
 * // Merge database config with environment secrets
 * const config = getCloudinaryConfig(integration.cloudName, integration.uploadPreset);
 * 
 * // Configure Cloudinary SDK
 * const cloudinary = require('cloudinary').v2;
 * cloudinary.config({
 *   cloud_name: config.cloudName,
 *   api_key: config.apiKey,
 *   api_secret: config.apiSecret
 * });
 * ```
 */
export function getCloudinaryConfig(cloudName: string, uploadPreset?: string): CloudinaryConfig {
  if (!cloudName) {
    throw new Error('Cloud name is required. This should come from the database integration settings.');
  }

  // Validate cloudName format
  const trimmedCloudName = cloudName.trim();
  const cloudNameRegex = /^[A-Za-z][A-Za-z0-9-]{1,127}$/;

  if (!cloudNameRegex.test(trimmedCloudName)) {
    throw new Error(
      'Invalid cloud name format. Cloud name must be 2-128 characters, start with a letter, and contain only letters, digits, or hyphens.'
    );
  }

  const secrets = getCloudinarySecrets();

  return {
    cloudName: trimmedCloudName,
    ...secrets,
    uploadPreset,
  };
}

/**
 * Validate that Cloudinary API credentials are configured in environment variables
 * 
 * @returns {boolean} True if API credentials are configured, false otherwise
 * 
 * @example
 * ```typescript
 * if (!isCloudinaryConfigured()) {
 *   return res.status(500).json({ 
 *     error: 'Cloudinary API credentials not configured in environment variables' 
 *   });
 * }
 * ```
 */
export function isCloudinaryConfigured(): boolean {
  try {
    getCloudinarySecrets();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get safe Cloudinary configuration for logging (credentials redacted)
 * 
 * @param {string} [cloudName] - Optional cloud name from database
 * @returns {object} Configuration with redacted credentials
 * 
 * @example
 * ```typescript
 * console.log('Cloudinary config:', getSafeCloudinaryConfig('my-cloud'));
 * // Output: { cloudName: 'my-cloud', apiKey: '***REDACTED***', apiSecret: '***REDACTED***', configured: 'true' }
 * ```
 */
export function getSafeCloudinaryConfig(cloudName?: string): Record<string, string> {
  try {
    getCloudinarySecrets();
    return {
      cloudName: cloudName || '(from database)',
      apiKey: '***REDACTED***',
      apiSecret: '***REDACTED***',
      configured: 'true',
    };
  } catch {
    return {
      configured: 'false',
      error: 'API credentials not configured in environment variables',
    };
  }
}

/**
 * SECURITY NOTE:
 * 
 * This module separates configuration from secrets:
 * 
 * DATABASE (Configuration - Not Secret):
 * - cloudName: Identifies which Cloudinary account to use
 * - uploadPreset: Upload configuration
 * - autoOptimize, generateThumbnails, etc.: Feature flags
 * 
 * ENVIRONMENT VARIABLES (Secrets):
 * - CLOUDINARY_API_KEY: API authentication key
 * - CLOUDINARY_API_SECRET: API authentication secret
 * 
 * This module intentionally does NOT provide any way to:
 * - Store API credentials in the database
 * - Retrieve API credentials from the database
 * - Expose API credentials to client-side code
 * 
 * All API credential access must go through environment variables.
 * 
 * For multi-tenant scenarios where different events use different Cloudinary accounts:
 * - Store different cloudName values in the database per event
 * - Use a single set of API credentials that has access to all accounts
 * - Or implement custom logic to select credentials based on cloudName
 */
