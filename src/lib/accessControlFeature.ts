/**
 * Access Control Feature Flag
 * 
 * Controls whether the Access Control feature is globally enabled.
 * This is a security-focused feature flag that must be enabled via environment variable.
 * 
 * When disabled:
 * - Access Control tab is hidden from the dashboard sidebar
 * - Access control fields are not shown in attendee forms
 * - Access control filters are not available in advanced search
 * - Import/export skip access control data
 * 
 * When enabled:
 * - The feature becomes available, but still respects per-event `accessControlEnabled` setting
 * - Admins can configure access control settings in Event Settings
 */

/**
 * Check if the Access Control feature is globally enabled via environment variable.
 * 
 * This is a client-safe check using NEXT_PUBLIC_ prefix.
 * 
 * @returns true if NEXT_PUBLIC_ENABLE_ACCESS_CONTROL is set to 'true'
 */
export function isAccessControlFeatureEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_ACCESS_CONTROL === 'true';
}

/**
 * Check if Access Control is fully enabled for an event.
 * 
 * Both conditions must be true:
 * 1. The feature must be globally enabled via env variable
 * 2. The event must have accessControlEnabled set to true in event settings
 * 
 * @param eventAccessControlEnabled - The accessControlEnabled value from event settings
 * @returns true if both global feature flag AND event setting are enabled
 */
export function isAccessControlEnabledForEvent(eventAccessControlEnabled?: boolean): boolean {
  return isAccessControlFeatureEnabled() && eventAccessControlEnabled === true;
}
