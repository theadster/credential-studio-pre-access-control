/**
 * Appwrite Integration Collections Helper
 * 
 * This module provides helper functions to work with the normalized
 * integration collections (Cloudinary, Switchboard, OneSimpleAPI)
 */

import { TablesDB, Query } from 'node-appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const CLOUDINARY_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_TABLE_ID!;
const SWITCHBOARD_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_TABLE_ID!;
const ONESIMPLEAPI_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_TABLE_ID!;

/**
 * Custom error class for integration version conflicts
 * Thrown when optimistic locking detects concurrent modifications
 */
export class IntegrationConflictError extends Error {
  constructor(
    public integrationType: string,
    public eventSettingsId: string,
    public expectedVersion: number,
    public actualVersion: number
  ) {
    super(
      `Integration conflict: ${integrationType} for event ${eventSettingsId}. ` +
      `Expected version ${expectedVersion}, but found version ${actualVersion}. ` +
      `The integration was modified by another request.`
    );
    this.name = 'IntegrationConflictError';
  }
}

export interface CloudinaryIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  cloudName: string;
  // SECURITY: API credentials removed from database schema
  // Use CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET environment variables
  uploadPreset: string;
  autoOptimize: boolean;
  generateThumbnails: boolean;
  disableSkipCrop: boolean;
  cropAspectRatio: string;
}

export interface SwitchboardIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  apiEndpoint: string;
  authHeaderType: string;
  // SECURITY: API key removed from database schema
  // Use SWITCHBOARD_API_KEY environment variable
  requestBody: string;
  templateId: string;
  fieldMappings: string; // JSON string
}

export interface OneSimpleApiIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  url: string;
  formDataKey: string;
  formDataValue: string;
  recordTemplate: string;
}

export interface EventSettingsWithIntegrations {
  // Core event settings fields
  $id: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  timeZone: string;
  barcodeType: string;
  barcodeLength: number;
  barcodeUnique: boolean;
  forceFirstNameUppercase: boolean;
  forceLastNameUppercase: boolean;
  attendeeSortField: string;
  attendeeSortDirection: string;
  bannerImageUrl: string;
  signInBannerUrl: string;

  // Integration data
  cloudinary?: CloudinaryIntegration;
  switchboard?: SwitchboardIntegration;
  oneSimpleApi?: OneSimpleApiIntegration;
}

/**
 * Get Cloudinary integration for an event
 */
export async function getCloudinaryIntegration(
  tablesDB: TablesDB,
  eventSettingsId: string
): Promise<CloudinaryIntegration | null> {
  try {
    const response = await tablesDB.listRows(
      DATABASE_ID,
      CLOUDINARY_TABLE_ID,
      [Query.equal('eventSettingsId', eventSettingsId), Query.limit(1)]
    );

    return response.rows.length > 0 ? (response.rows[0] as any) : null;
  } catch (error: any) {
    // Return null only for not-found errors (404 or collection doesn't exist)
    if (error.code === 404 || error.code === 'document_not_found' || error.code === 'collection_not_found') {
      return null;
    }

    // For all other errors (network, permission, etc.), log and re-throw
    console.error('Error fetching Cloudinary integration:', error);
    throw error;
  }
}

/**
 * Get Switchboard integration for an event
 */
export async function getSwitchboardIntegration(
  tablesDB: TablesDB,
  eventSettingsId: string
): Promise<SwitchboardIntegration | null> {
  try {
    const response = await tablesDB.listRows(
      DATABASE_ID,
      SWITCHBOARD_TABLE_ID,
      [Query.equal('eventSettingsId', eventSettingsId), Query.limit(1)]
    );

    return response.rows.length > 0 ? (response.rows[0] as any) : null;
  } catch (error: any) {
    // Return null only for not-found errors (404 or collection doesn't exist)
    if (error.code === 404 || error.code === 'document_not_found' || error.code === 'collection_not_found') {
      return null;
    }

    // For all other errors (network, permission, etc.), log and re-throw
    console.error('Error fetching Switchboard integration:', error);
    throw error;
  }
}

/**
 * Get OneSimpleAPI integration for an event
 */
export async function getOneSimpleApiIntegration(
  tablesDB: TablesDB,
  eventSettingsId: string
): Promise<OneSimpleApiIntegration | null> {
  try {
    const response = await tablesDB.listRows(
      DATABASE_ID,
      ONESIMPLEAPI_TABLE_ID,
      [Query.equal('eventSettingsId', eventSettingsId), Query.limit(1)]
    );

    return response.rows.length > 0 ? (response.rows[0] as any) : null;
  } catch (error: any) {
    // Return null only for not-found errors (404 or collection doesn't exist)
    if (error.code === 404 || error.code === 'document_not_found' || error.code === 'collection_not_found') {
      return null;
    }

    // For all other errors (network, permission, etc.), log and re-throw
    console.error('Error fetching OneSimpleAPI integration:', error);
    throw error;
  }
}

/**
 * Get event settings with all integrations
 */
export async function getEventSettingsWithIntegrations(
  tablesDB: TablesDB,
  eventSettingsId: string
): Promise<EventSettingsWithIntegrations | null> {
  try {
    const eventSettingsTableId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID!;

    // Fetch event settings
    const eventSettings = await tablesDB.getRow(
      DATABASE_ID,
      eventSettingsTableId,
      eventSettingsId
    );

    // Fetch all integrations in parallel
    const [cloudinary, switchboard, oneSimpleApi] = await Promise.all([
      getCloudinaryIntegration(tablesDB, eventSettingsId),
      getSwitchboardIntegration(tablesDB, eventSettingsId),
      getOneSimpleApiIntegration(tablesDB, eventSettingsId),
    ]);

    return {
      ...(eventSettings as any),
      cloudinary: cloudinary || undefined,
      switchboard: switchboard || undefined,
      oneSimpleApi: oneSimpleApi || undefined,
    };
  } catch (error) {
    console.error('Error fetching event settings with integrations:', error);
    return null;
  }
}

/**
 * Generic helper function for updating integrations with optimistic locking
 * Handles version checking, create/update logic, and retry on concurrent create conflicts
 * 
 * @param tablesDB - Appwrite TablesDB instance
 * @param tableId - The table ID for the integration type
 * @param integrationType - Human-readable integration type name (for error messages)
 * @param eventSettingsId - The event settings ID this integration belongs to
 * @param data - The data to create or update
 * @param expectedVersion - Optional version for optimistic locking
 * @param getExisting - Function to fetch existing integration document
 * @returns The created or updated integration document
 * @throws IntegrationConflictError when version mismatch is detected
 */
async function updateIntegrationWithLocking<T extends { $id: string; version: number }>(
  tablesDB: TablesDB,
  tableId: string,
  integrationType: string,
  eventSettingsId: string,
  data: any,
  expectedVersion: number | undefined,
  getExisting: () => Promise<T | null>
): Promise<T> {
  try {
    // Fetch existing integration
    const existing = await getExisting();

    if (existing) {
      // Update existing integration with version check
      const currentVersion = existing.version || 0;

      // If expectedVersion is provided, verify it matches current version
      if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
        throw new IntegrationConflictError(
          integrationType,
          eventSettingsId,
          expectedVersion,
          currentVersion
        );
      }

      // Update with incremented version
      const updated = await tablesDB.updateRow(
        DATABASE_ID,
        tableId,
        existing.$id,
        {
          ...data,
          version: currentVersion + 1
        }
      );
      return updated as unknown as T;
    } else {
      // Create new integration with version 1
      try {
        const created = await tablesDB.createRow(
          DATABASE_ID,
          tableId,
          'unique()',
          {
            eventSettingsId,
            version: 1,
            ...data,
          }
        );
        return created as unknown as T;
      } catch (createError: any) {
        // Handle concurrent create conflicts - retry as update with bounded retries
        if (createError.code === 409 || createError.message?.includes('duplicate')) {
          const maxRetries = 3;
          let lastError = createError;

          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              // Re-fetch to get the latest version
              const existing = await getExisting();

              if (!existing) {
                // Document was deleted between create and now, re-throw original error
                console.warn(`${integrationType} integration was deleted during concurrent create retry`);
                throw createError;
              }

              // Attempt update with latest version
              const updated = await tablesDB.updateRow(
                DATABASE_ID,
                tableId,
                existing.$id,
                {
                  ...data,
                  version: (existing.version || 0) + 1
                }
              );
              return updated as unknown as T;
            } catch (updateError: any) {
              lastError = updateError;

              // If this is a conflict error and we have retries left, continue
              if ((updateError.code === 409 || updateError.message?.includes('conflict')) && attempt < maxRetries - 1) {
                // Exponential backoff: 50ms, 100ms, 200ms
                const backoffMs = 50 * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
                continue;
              }

              // Otherwise, break and throw
              break;
            }
          }

          // All retries exhausted, throw the last error
          console.error(`${integrationType} integration update failed after ${maxRetries} retries`);
          throw lastError;
        }
        throw createError;
      }
    }
  } catch (error) {
    // Re-throw conflict errors as-is
    if (error instanceof IntegrationConflictError) {
      throw error;
    }

    // Wrap other errors with context
    console.error(`Error updating ${integrationType} integration:`, error);
    throw new Error(
      `Failed to update ${integrationType} integration: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update Cloudinary integration with optimistic locking
 * 
 * @param tablesDB - Appwrite TablesDB instance
 * @param eventSettingsId - The event settings ID this integration belongs to
 * @param data - The data to create or update
 * @param expectedVersion - Optional version for optimistic locking
 * @returns The created or updated integration document
 * @throws IntegrationConflictError when version mismatch is detected
 */
export async function updateCloudinaryIntegration(
  tablesDB: TablesDB,
  eventSettingsId: string,
  data: Partial<Omit<CloudinaryIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<CloudinaryIntegration> {
  return updateIntegrationWithLocking<CloudinaryIntegration>(
    tablesDB,
    CLOUDINARY_TABLE_ID,
    'Cloudinary',
    eventSettingsId,
    data,
    expectedVersion,
    () => getCloudinaryIntegration(tablesDB, eventSettingsId)
  );
}

/**
 * Update Switchboard integration with optimistic locking
 * 
 * @param tablesDB - Appwrite TablesDB instance
 * @param eventSettingsId - The event settings ID this integration belongs to
 * @param data - The data to create or update
 * @param expectedVersion - Optional version for optimistic locking
 * @returns The created or updated integration document
 * @throws IntegrationConflictError when version mismatch is detected
 * @throws Error when requestBody contains invalid JSON
 */
export async function updateSwitchboardIntegration(
  tablesDB: TablesDB,
  eventSettingsId: string,
  data: Partial<Omit<SwitchboardIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<SwitchboardIntegration> {
  // Validate requestBody JSON if provided
  if (data.requestBody !== undefined && data.requestBody !== null && data.requestBody !== '') {
    try {
      JSON.parse(data.requestBody);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown JSON parse error';
      throw new Error(
        `Invalid JSON in Switchboard requestBody template. ${errorMessage}. ` +
        `Please ensure the template is valid JSON before saving.`
      );
    }
  }

  return updateIntegrationWithLocking<SwitchboardIntegration>(
    tablesDB,
    SWITCHBOARD_TABLE_ID,
    'Switchboard',
    eventSettingsId,
    data,
    expectedVersion,
    () => getSwitchboardIntegration(tablesDB, eventSettingsId)
  );
}

/**
 * Update OneSimpleAPI integration with optimistic locking
 * 
 * @param tablesDB - Appwrite TablesDB instance
 * @param eventSettingsId - The event settings ID this integration belongs to
 * @param data - The data to create or update
 * @param expectedVersion - Optional version for optimistic locking
 * @returns The created or updated integration document
 * @throws IntegrationConflictError when version mismatch is detected
 */
export async function updateOneSimpleApiIntegration(
  tablesDB: TablesDB,
  eventSettingsId: string,
  data: Partial<Omit<OneSimpleApiIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<OneSimpleApiIntegration> {
  return updateIntegrationWithLocking<OneSimpleApiIntegration>(
    tablesDB,
    ONESIMPLEAPI_TABLE_ID,
    'OneSimpleAPI',
    eventSettingsId,
    data,
    expectedVersion,
    () => getOneSimpleApiIntegration(tablesDB, eventSettingsId)
  );
}

/**
 * Helper to convert legacy event settings format to new format
 * Use this when migrating code that expects all fields in one object
 */
export function flattenEventSettings(settings: EventSettingsWithIntegrations): any {
  const { cloudinary, switchboard, oneSimpleApi, ...coreSettings } = settings;

  return {
    ...coreSettings,
    // Map Appwrite's automatic timestamp fields to the expected format
    createdAt: (coreSettings as any).$createdAt || (coreSettings as any).createdAt,
    updatedAt: (coreSettings as any).$updatedAt || (coreSettings as any).updatedAt,
    // Cloudinary fields
    cloudinaryEnabled: cloudinary?.enabled || false,
    cloudinaryCloudName: cloudinary?.cloudName || '',
    // SECURITY: API credentials are NOT stored in database
    // They must be read from environment variables at runtime
    // cloudinaryApiKey: cloudinary?.apiKey || '',
    // cloudinaryApiSecret: cloudinary?.apiSecret || '',
    cloudinaryUploadPreset: cloudinary?.uploadPreset || '',
    cloudinaryAutoOptimize: cloudinary?.autoOptimize || false,
    cloudinaryGenerateThumbnails: cloudinary?.generateThumbnails || false,
    cloudinaryDisableSkipCrop: cloudinary?.disableSkipCrop || false,
    cloudinaryCropAspectRatio: cloudinary?.cropAspectRatio || '1',
    // Switchboard fields
    switchboardEnabled: switchboard?.enabled || false,
    switchboardApiEndpoint: switchboard?.apiEndpoint || '',
    switchboardAuthHeaderType: switchboard?.authHeaderType || '',
    // SECURITY: API key is NOT stored in database
    // It must be read from environment variables at runtime
    // switchboardApiKey: switchboard?.apiKey || '',
    switchboardRequestBody: switchboard?.requestBody || '',
    switchboardTemplateId: switchboard?.templateId || '',
    switchboardFieldMappings: switchboard?.fieldMappings && switchboard.fieldMappings !== ''
      ? (() => {
        try {
          return JSON.parse(switchboard.fieldMappings);
        } catch (e) {
          console.error('Error parsing switchboard field mappings:', e);
          return [];
        }
      })()
      : [],
    // OneSimpleAPI fields
    oneSimpleApiEnabled: oneSimpleApi?.enabled || false,
    oneSimpleApiUrl: oneSimpleApi?.url || '',
    oneSimpleApiFormDataKey: oneSimpleApi?.formDataKey || '',
    oneSimpleApiFormDataValue: oneSimpleApi?.formDataValue || '',
    oneSimpleApiRecordTemplate: oneSimpleApi?.recordTemplate || '',
  };
}
