/**
 * Feature Flags for Database Operators
 * 
 * This module provides feature flag management for gradual rollout of database operators.
 * Feature flags allow enabling/disabling operators incrementally to monitor performance
 * and catch issues before full deployment.
 */

export interface OperatorFeatureFlags {
  /** Enable all operator features (master switch) */
  enableOperators: boolean;
  
  /** Enable operators for credential tracking */
  enableCredentialOperators: boolean;
  
  /** Enable operators for photo tracking */
  enablePhotoOperators: boolean;
  
  /** Enable operators for bulk operations */
  enableBulkOperators: boolean;
  
  /** Enable operators for logging */
  enableLoggingOperators: boolean;
  
  /** Enable operators for custom field array operations */
  enableArrayOperators: boolean;
}

/**
 * Default feature flags - all disabled initially for safe rollout
 */
const DEFAULT_FLAGS: OperatorFeatureFlags = {
  enableOperators: false,
  enableCredentialOperators: false,
  enablePhotoOperators: false,
  enableBulkOperators: false,
  enableLoggingOperators: false,
  enableArrayOperators: false,
};

/**
 * Get feature flags from environment variables
 * Environment variables override defaults for deployment control
 */
function getFeatureFlagsFromEnv(): Partial<OperatorFeatureFlags> {
  return {
    enableOperators: process.env.ENABLE_OPERATORS === 'true',
    enableCredentialOperators: process.env.ENABLE_CREDENTIAL_OPERATORS === 'true',
    enablePhotoOperators: process.env.ENABLE_PHOTO_OPERATORS === 'true',
    enableBulkOperators: process.env.ENABLE_BULK_OPERATORS === 'true',
    enableLoggingOperators: process.env.ENABLE_LOGGING_OPERATORS === 'true',
    enableArrayOperators: process.env.ENABLE_ARRAY_OPERATORS === 'true',
  };
}

/**
 * Current feature flags (merged from defaults and environment)
 */
let currentFlags: OperatorFeatureFlags = {
  ...DEFAULT_FLAGS,
  ...getFeatureFlagsFromEnv(),
};

/**
 * Check if a specific operator feature is enabled
 */
export function isOperatorFeatureEnabled(feature: keyof OperatorFeatureFlags): boolean {
  // Master switch must be enabled
  if (!currentFlags.enableOperators) {
    return false;
  }
  
  return currentFlags[feature];
}

/**
 * Check if the master operators switch is enabled
 * Use this when you only need to check the master flag without checking specific features
 */
export function areOperatorsEnabled(): boolean {
  return currentFlags.enableOperators;
}

/**
 * Check if credential operators are enabled
 */
export function areCredentialOperatorsEnabled(): boolean {
  return isOperatorFeatureEnabled('enableCredentialOperators');
}

/**
 * Check if photo operators are enabled
 */
export function arePhotoOperatorsEnabled(): boolean {
  return isOperatorFeatureEnabled('enablePhotoOperators');
}

/**
 * Check if bulk operators are enabled
 */
export function areBulkOperatorsEnabled(): boolean {
  return isOperatorFeatureEnabled('enableBulkOperators');
}

/**
 * Check if logging operators are enabled
 */
export function areLoggingOperatorsEnabled(): boolean {
  return isOperatorFeatureEnabled('enableLoggingOperators');
}

/**
 * Check if array operators are enabled
 */
export function areArrayOperatorsEnabled(): boolean {
  return isOperatorFeatureEnabled('enableArrayOperators');
}

/**
 * Get all current feature flags (for debugging/monitoring)
 */
export function getFeatureFlags(): OperatorFeatureFlags {
  return { ...currentFlags };
}

/**
 * Update feature flags at runtime (for testing/admin control)
 * 
 * **IMPORTANT: In-Process Only**
 * Changes affect only the current server instance and will NOT propagate to other instances.
 * 
 * **Multi-Instance Deployments:**
 * For production environments with multiple server instances, use one of these approaches:
 * - Environment variables + server restart (recommended for static configuration)
 * - Centralized feature flag service (e.g., LaunchDarkly, Unleash)
 * - Shared database or Redis store for dynamic flags
 * 
 * @param flags - Partial feature flags to update
 */
export function updateFeatureFlags(flags: Partial<OperatorFeatureFlags>): void {
  currentFlags = {
    ...currentFlags,
    ...flags,
  };
}

/**
 * Reset feature flags to defaults (environment variables + defaults)
 * 
 * **IMPORTANT: In-Process Only**
 * Changes affect only the current server instance and will NOT propagate to other instances.
 * 
 * **Multi-Instance Deployments:**
 * For production environments with multiple server instances, use one of these approaches:
 * - Environment variables + server restart (recommended for static configuration)
 * - Centralized feature flag service (e.g., LaunchDarkly, Unleash)
 * - Shared database or Redis store for dynamic flags
 */
export function resetFeatureFlags(): void {
  currentFlags = {
    ...DEFAULT_FLAGS,
    ...getFeatureFlagsFromEnv(),
  };
}
