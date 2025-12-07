/**
 * Event Settings Response Transformers
 * 
 * Shared transformation logic for event settings API responses.
 * This module ensures consistent transformation of event settings data
 * across all API endpoints and tests.
 */

/**
 * Type representing the access control time mode
 */
export type AccessControlTimeMode = 'date_only' | 'date_time';

/**
 * Interface representing the event settings response structure
 * with access control fields
 */
export interface EventSettingsResponse {
  id?: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  timeZone: string;
  accessControlEnabled?: boolean;
  accessControlTimeMode?: AccessControlTimeMode;
  [key: string]: unknown;
}

/**
 * Transforms raw event settings data into a complete response object
 * with access control fields and proper defaults.
 * 
 * This function ensures that:
 * 1. All required fields are present
 * 2. Access control fields always have values (never undefined)
 * 3. Default values are applied when fields are missing
 * 4. Existing values are preserved when present
 * 
 * @param rawSettings - Partial event settings data from database or request
 * @returns Complete EventSettingsResponse with all required fields
 * 
 * @example
 * ```typescript
 * const response = transformEventSettingsResponse({
 *   eventName: 'Tech Conference 2024',
 *   eventDate: '2024-06-15',
 *   accessControlEnabled: true
 * });
 * // Returns:
 * // {
 * //   eventName: 'Tech Conference 2024',
 * //   eventDate: '2024-06-15T00:00:00.000Z',
 * //   eventLocation: '',
 * //   timeZone: 'UTC',
 * //   accessControlEnabled: true,
 * //   accessControlTimeMode: 'date_only'
 * // }
 * ```
 */
export function transformEventSettingsResponse(
  rawSettings: Partial<EventSettingsResponse>
): EventSettingsResponse {
  // Parse accessControlDefaults if it's a string
  let accessControlDefaults = rawSettings.accessControlDefaults;
  if (typeof accessControlDefaults === 'string') {
    try {
      accessControlDefaults = JSON.parse(accessControlDefaults);
    } catch (e) {
      console.error('Failed to parse accessControlDefaults:', e);
      accessControlDefaults = {
        accessEnabled: true,
        validFrom: null,
        validUntil: null,
        validFromUseToday: false
      };
    }
  }
  
  return {
    ...rawSettings,
    eventName: rawSettings.eventName || '',
    eventDate: rawSettings.eventDate || new Date().toISOString(),
    eventLocation: rawSettings.eventLocation || '',
    timeZone: rawSettings.timeZone || 'UTC',
    // Access control fields should always be present with defaults
    accessControlEnabled: rawSettings.accessControlEnabled ?? false,
    accessControlTimeMode: rawSettings.accessControlTimeMode ?? 'date_only',
    accessControlDefaults: accessControlDefaults || {
      accessEnabled: true,
      validFrom: null,
      validUntil: null,
      validFromUseToday: false
    },
  };
}

/**
 * Validates that an event settings response contains the required
 * access control fields with correct types and values.
 * 
 * @param response - Event settings response to validate
 * @returns Validation result object with field presence and type information
 * 
 * @example
 * ```typescript
 * const validation = validateAccessControlFieldsPresent(response);
 * if (!validation.hasAccessControlEnabled) {
 *   console.error('Missing accessControlEnabled field');
 * }
 * ```
 */
export function validateAccessControlFieldsPresent(response: EventSettingsResponse): {
  hasAccessControlEnabled: boolean;
  hasAccessControlTimeMode: boolean;
  accessControlEnabledType: string;
  accessControlTimeModeType: string;
  accessControlTimeModeValid: boolean;
} {
  const hasAccessControlEnabled = 'accessControlEnabled' in response;
  const hasAccessControlTimeMode = 'accessControlTimeMode' in response;
  
  return {
    hasAccessControlEnabled,
    hasAccessControlTimeMode,
    accessControlEnabledType: typeof response.accessControlEnabled,
    accessControlTimeModeType: typeof response.accessControlTimeMode,
    accessControlTimeModeValid: 
      response.accessControlTimeMode === 'date_only' || 
      response.accessControlTimeMode === 'date_time',
  };
}
