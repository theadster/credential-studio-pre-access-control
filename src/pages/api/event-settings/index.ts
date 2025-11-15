/**
 * Event Settings API Handler
 * Manages event configuration, custom fields, and integration settings
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { generateInternalFieldName } from '@/util/string';
import { shouldLog } from '@/lib/logSettings';
import { sanitizeHTMLTemplate } from '@/lib/sanitization';
import { validateSwitchboardRequestBody, validateEventSettings } from '@/lib/validation';
import { isError, hasProperty, isFulfilled, isRejected } from '@/lib/typeGuards';
import {
  IntegrationConflictError,
  updateCloudinaryIntegration,
  updateSwitchboardIntegration,
  updateOneSimpleApiIntegration,
  flattenEventSettings
} from '@/lib/appwrite-integrations';
import { PerformanceTracker } from '@/lib/performance';
import { eventSettingsCache } from '@/lib/cache';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import {
  executeTransactionWithRetry,
  TransactionOperation,
  handleTransactionError
} from '@/lib/transactions';

/**
 * Interface for custom field structure
 */
interface CustomFieldInput {
  id?: string;
  fieldName: string;
  internalFieldName?: string;
  fieldType: string;
  fieldOptions?: any;
  required?: boolean;
  order?: number;
  showOnMainPage?: boolean;
  printable?: boolean;
}

/**
 * Type-safe helper to extract documents from a fulfilled PromiseSettledResult
 * Returns the documents array if the promise is fulfilled and has documents, otherwise null
 */
function getDocuments<T>(
  result: PromiseSettledResult<{ documents: T[] }>
): T[] | null {
  if (isFulfilled(result) && result.value.documents.length > 0) {
    return result.value.documents;
  }
  return null;
}

/**
 * Extract integration fields from the update payload
 * Filters out undefined values to avoid overwriting with undefined
 */
function extractIntegrationFields(updateData: any) {
  // Extract Cloudinary fields (7 fields - credentials removed for security)
  const cloudinaryFields = {
    enabled: updateData.cloudinaryEnabled,
    cloudName: updateData.cloudinaryCloudName,
    // SECURITY: API credentials are NOT stored in database
    // apiKey: updateData.cloudinaryApiKey,
    // apiSecret: updateData.cloudinaryApiSecret,
    uploadPreset: updateData.cloudinaryUploadPreset,
    autoOptimize: updateData.cloudinaryAutoOptimize,
    generateThumbnails: updateData.cloudinaryGenerateThumbnails,
    disableSkipCrop: updateData.cloudinaryDisableSkipCrop,
    cropAspectRatio: updateData.cloudinaryCropAspectRatio
  };

  // Extract Switchboard fields (6 fields - API key removed for security)
  const switchboardFields = {
    enabled: updateData.switchboardEnabled,
    apiEndpoint: updateData.switchboardApiEndpoint,
    authHeaderType: updateData.switchboardAuthHeaderType,
    // SECURITY: API key is NOT stored in database
    // apiKey: updateData.switchboardApiKey,
    requestBody: updateData.switchboardRequestBody,
    templateId: updateData.switchboardTemplateId,
    fieldMappings: typeof updateData.switchboardFieldMappings === 'string'
      ? updateData.switchboardFieldMappings
      : (updateData.switchboardFieldMappings !== undefined ? JSON.stringify(updateData.switchboardFieldMappings) : undefined)
  };

  // Extract all 5 OneSimpleAPI fields
  const oneSimpleApiFields = {
    enabled: updateData.oneSimpleApiEnabled,
    url: updateData.oneSimpleApiUrl,
    formDataKey: updateData.oneSimpleApiFormDataKey,
    formDataValue: updateData.oneSimpleApiFormDataValue,
    recordTemplate: updateData.oneSimpleApiRecordTemplate
  };

  // Filter out undefined values to avoid overwriting with undefined
  const filterUndefined = (obj: any) => {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
  };

  return {
    cloudinary: filterUndefined(cloudinaryFields),
    switchboard: filterUndefined(switchboardFields),
    oneSimpleApi: filterUndefined(oneSimpleApiFields)
  };
}

/**
 * Parse event date string to ISO format, handling timezone issues
 * @param eventDate - Date string in various formats (YYYY-MM-DD, ISO, etc.) or undefined
 * @returns ISO date string
 */
function parseEventDate(eventDate: string | undefined): string {
  if (!eventDate) {
    return new Date().toISOString();
  }

  // If it's a date string (YYYY-MM-DD), parse it as local date to avoid UTC conversion
  if (typeof eventDate === 'string' && eventDate.includes('-') && !eventDate.includes('T')) {
    const [year, month, day] = eventDate.split('-').map(Number);
    return new Date(year, month - 1, day).toISOString();
  }

  return new Date(eventDate).toISOString();
}

/**
 * Create default custom fields for a new event.
 * 
 * This function automatically creates two default custom fields when a new event is initialized:
 * 1. Credential Type - A select field for categorizing attendees (VIP, Staff, Press, etc.)
 * 2. Notes - A textarea field for capturing additional attendee information
 * 
 * Both fields are created with:
 * - showOnMainPage: true (visible on main attendees page by default)
 * - required: false (optional fields)
 * - Empty options for Credential Type (to be configured by admin)
 * 
 * Error Handling:
 * - Errors are logged but not thrown to prevent event creation failure
 * - If default fields fail to create, the event settings will still be created successfully
 * 
 * @param databases - Appwrite databases instance from session or admin client
 * @param dbId - Database ID from environment variables
 * @param customFieldsCollectionId - Custom fields collection ID from environment variables
 * @param eventSettingsId - The ID of the newly created event settings document
 * @returns Promise<void> - Resolves when fields are created or error is logged
 * 
 * @example
 * ```typescript
 * await createDefaultCustomFields(
 *   databases,
 *   process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
 *   process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!,
 *   newEventSettings.$id
 * );
 * ```
 */
async function createDefaultCustomFields(
  databases: any,
  dbId: string,
  customFieldsCollectionId: string,
  eventSettingsId: string
): Promise<void> {
  try {
    // Create Credential Type field (select type with empty options)
    // This field allows event organizers to categorize attendees (e.g., VIP, Staff, Press)
    // Options are initially empty and must be configured through the Event Settings UI
    await databases.createDocument(
      dbId,
      customFieldsCollectionId,
      ID.unique(),
      {
        eventSettingsId,
        fieldName: 'Credential Type',
        internalFieldName: 'credential_type',
        fieldType: 'select',
        fieldOptions: JSON.stringify({ options: [] }), // Empty options - to be configured by admin
        required: false,
        order: 1,
        showOnMainPage: true, // Visible on main attendees page by default
        printable: false, // Default to non-printable
        version: 0
      }
    );

    // Create Notes field (textarea type)
    // This field provides a free-form text area for capturing additional attendee information
    // Useful for special requirements, dietary restrictions, accessibility needs, etc.
    await databases.createDocument(
      dbId,
      customFieldsCollectionId,
      ID.unique(),
      {
        eventSettingsId,
        fieldName: 'Notes',
        internalFieldName: 'notes',
        fieldType: 'textarea',
        fieldOptions: null, // No options needed for textarea
        required: false,
        order: 2,
        showOnMainPage: true, // Visible on main attendees page by default
        printable: false, // Default to non-printable
        version: 0
      }
    );
  } catch (error) {
    // Log error but don't throw - default fields creation should not fail event settings creation
    // This ensures that even if default fields fail, the event can still be created
    // Admins can manually create these fields later if needed
    console.error('Failed to create default custom fields:', {
      error: error instanceof Error ? error.message : String(error),
      eventSettingsId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle custom field deletions and clean up integration templates
 * @returns Object containing needsIntegrationUpdate flag, updated updateData, deletedFieldIds, and deletedFields
 */
async function handleCustomFieldDeletions(
  databases: any,
  dbId: string,
  customFieldsCollectionId: string,
  currentCustomFields: any[],
  incomingFields: any[],
  updateData: any,
  currentSettings: any
): Promise<{
  needsIntegrationUpdate: boolean;
  updatedUpdateData: any;
  deletedFieldIds: string[];
  deletedFields: any[];
}> {
  const existingFieldIds = currentCustomFields.map((f) => f.$id);
  const incomingFieldIds = incomingFields.filter((f) => f.id && !f.id.startsWith('temp_')).map((f) => f.id);
  const deletedFieldIds = existingFieldIds.filter((id) => !incomingFieldIds.includes(id));

  if (deletedFieldIds.length === 0) {
    return { needsIntegrationUpdate: false, updatedUpdateData: updateData, deletedFieldIds: [], deletedFields: [] };
  }

  // Fetch deleted fields info before deleting
  const deletedFields = currentCustomFields.filter((f) => deletedFieldIds.includes(f.$id));

  // Delete fields one by one (Appwrite doesn't support batch deletes)
  for (const fieldId of deletedFieldIds) {
    await databases.deleteDocument(dbId, customFieldsCollectionId, fieldId);
  }

  // Clean up integration templates if fields were deleted
  let needsIntegrationUpdate = false;
  let updatedSwitchboardBody = updateData.switchboardRequestBody || currentSettings.switchboardRequestBody;
  let updatedOneSimpleApiValue = updateData.oneSimpleApiFormDataValue || currentSettings.oneSimpleApiFormDataValue;
  let updatedOneSimpleApiTemplate = updateData.oneSimpleApiRecordTemplate || currentSettings.oneSimpleApiRecordTemplate;
  let updatedFieldMappings =
    updateData.switchboardFieldMappings ||
    (currentSettings.switchboardFieldMappings
      ? typeof currentSettings.switchboardFieldMappings === 'string'
        ? JSON.parse(currentSettings.switchboardFieldMappings as string)
        : currentSettings.switchboardFieldMappings
      : []);

  for (const deletedField of deletedFields) {
    const placeholder = `{{${deletedField.internalFieldName}}}`;
    // Escape regex special characters for safe replacement
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Clean up Switchboard Canvas request body
    if (updatedSwitchboardBody && updatedSwitchboardBody.includes(placeholder)) {
      updatedSwitchboardBody = updatedSwitchboardBody.replace(new RegExp(escapedPlaceholder, 'g'), '""');
      needsIntegrationUpdate = true;
    }

    // Clean up OneSimpleAPI templates
    if (updatedOneSimpleApiValue && updatedOneSimpleApiValue.includes(placeholder)) {
      updatedOneSimpleApiValue = updatedOneSimpleApiValue.replace(new RegExp(escapedPlaceholder, 'g'), '');
      needsIntegrationUpdate = true;
    }

    if (updatedOneSimpleApiTemplate && updatedOneSimpleApiTemplate.includes(placeholder)) {
      updatedOneSimpleApiTemplate = updatedOneSimpleApiTemplate.replace(new RegExp(escapedPlaceholder, 'g'), '');
      needsIntegrationUpdate = true;
    }

    // Clean up field mappings
    if (Array.isArray(updatedFieldMappings)) {
      const originalLength = updatedFieldMappings.length;
      updatedFieldMappings = updatedFieldMappings.filter((mapping: any) => mapping.fieldId !== deletedField.$id);
      if (updatedFieldMappings.length !== originalLength) {
        needsIntegrationUpdate = true;
      }
    }
  }

  // Update integration settings if cleanup was needed
  const updatedUpdateData = { ...updateData };
  if (needsIntegrationUpdate) {
    updatedUpdateData.switchboardRequestBody = updatedSwitchboardBody;
    updatedUpdateData.oneSimpleApiFormDataValue = updatedOneSimpleApiValue;
    updatedUpdateData.oneSimpleApiRecordTemplate = updatedOneSimpleApiTemplate;
    updatedUpdateData.switchboardFieldMappings = updatedFieldMappings;
  }

  return { needsIntegrationUpdate, updatedUpdateData, deletedFieldIds, deletedFields };
}

/**
 * Handle custom field modifications
 * Updates existing fields with new values, serializing fieldOptions and generating internalFieldName
 */
async function handleCustomFieldModifications(
  databases: any,
  dbId: string,
  customFieldsCollectionId: string,
  modifiedFields: any[]
): Promise<void> {
  for (const modifiedField of modifiedFields) {
    const fieldOptionsStr = modifiedField.fieldOptions
      ? typeof modifiedField.fieldOptions === 'string'
        ? modifiedField.fieldOptions
        : JSON.stringify(modifiedField.fieldOptions)
      : null;

    await databases.updateDocument(dbId, customFieldsCollectionId, modifiedField.id, {
      fieldName: modifiedField.fieldName,
      internalFieldName: modifiedField.internalFieldName || generateInternalFieldName(modifiedField.fieldName),
      fieldType: modifiedField.fieldType,
      fieldOptions: fieldOptionsStr,
      required: modifiedField.required || false,
      order: modifiedField.order,
      showOnMainPage: modifiedField.showOnMainPage !== undefined ? modifiedField.showOnMainPage : true,
      printable: modifiedField.printable !== undefined ? modifiedField.printable : false,
    });
  }
}

/**
 * Handle custom field additions
 * Creates new custom field documents with proper serialization and defaults
 */
async function handleCustomFieldAdditions(
  databases: any,
  dbId: string,
  customFieldsCollectionId: string,
  newFields: any[],
  currentSettings: any,
  totalFieldsCount: number
): Promise<void> {
  for (const field of newFields) {
    const fieldOptionsStr = field.fieldOptions
      ? typeof field.fieldOptions === 'string'
        ? field.fieldOptions
        : JSON.stringify(field.fieldOptions)
      : null;

    await databases.createDocument(dbId, customFieldsCollectionId, ID.unique(), {
      eventSettingsId: currentSettings.$id,
      fieldName: field.fieldName,
      internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName),
      fieldType: field.fieldType,
      fieldOptions: fieldOptionsStr,
      required: field.required || false,
      order: field.order || totalFieldsCount,
      showOnMainPage: field.showOnMainPage !== undefined ? field.showOnMainPage : true,
      printable: field.printable !== undefined ? field.printable : false,
    });
  }
}

/**
 * Handle event settings update using transactions
 * Provides atomic updates for core settings, custom fields, integrations, and audit log
 */
async function handleEventSettingsUpdateWithTransactions(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  databases: any,
  dbId: string,
  customFieldsCollectionId: string,
  eventSettingsCollectionId: string,
  logsCollectionId: string,
  currentSettings: any,
  updateData: any,
  customFields: any[] | undefined,
  authUser: any,
  perfTracker: PerformanceTracker
): Promise<any> {
  // Get TablesDB client
  const { tablesDB } = createSessionClient(req);

  // Fetch current custom fields
  const currentCustomFieldsResult = await perfTracker.trackQuery(
    'fetchCurrentCustomFields',
    () => databases.listDocuments(
      dbId,
      customFieldsCollectionId,
      [
        Query.equal('eventSettingsId', currentSettings.$id),
        Query.orderAsc('order'),
        Query.limit(100)
      ]
    )
  ) as any;

  const currentCustomFields = currentCustomFieldsResult.documents;

  // Build transaction operations
  const {
    operations,
    deletedFieldIds,
    deletedFields,
    needsIntegrationUpdate,
    updatedUpdateData
  } = await buildEventSettingsTransactionOperations(
    databases,
    dbId,
    customFieldsCollectionId,
    eventSettingsCollectionId,
    logsCollectionId,
    currentSettings,
    currentCustomFields,
    updateData,
    customFields,
    authUser.$id
  );

  console.log(`[Event Settings Transaction] Executing ${operations.length} operations atomically`);

  // Execute transaction with retry logic
  await executeTransactionWithRetry(tablesDB, operations);

  console.log('[Event Settings Transaction] Successfully committed all operations');

  // Handle integration updates separately (not in transaction due to optimistic locking)
  const integrationFields = extractIntegrationFields(updatedUpdateData);
  let integrationWarnings: any[] = [];

  // DEBUG: Log what's being sent for Switchboard
  console.log('[Event Settings] Integration fields extracted:', {
    switchboard: integrationFields.switchboard,
    switchboardFieldMappings: updatedUpdateData.switchboardFieldMappings,
    originalFieldMappings: updateData.switchboardFieldMappings
  });

  const integrationUpdates = [];

  if (Object.keys(integrationFields.cloudinary).length > 0) {
    integrationUpdates.push(
      updateCloudinaryIntegration(
        databases,
        currentSettings.$id,
        integrationFields.cloudinary
      ).catch(error => {
        if (error instanceof IntegrationConflictError) {
          throw error;
        }
        console.error('Failed to update Cloudinary integration:', error);
        return {
          error: 'cloudinary',
          message: error instanceof Error ? error.message : 'Unknown error',
          fields: Object.keys(integrationFields.cloudinary)
        };
      })
    );
  }

  if (Object.keys(integrationFields.switchboard).length > 0) {
    console.log('[Event Settings] Updating Switchboard integration with:', integrationFields.switchboard);
    integrationUpdates.push(
      updateSwitchboardIntegration(
        databases,
        currentSettings.$id,
        integrationFields.switchboard
      ).catch(error => {
        if (error instanceof IntegrationConflictError) {
          throw error;
        }
        console.error('Failed to update Switchboard integration:', error);
        return {
          error: 'switchboard',
          message: error instanceof Error ? error.message : 'Unknown error',
          fields: Object.keys(integrationFields.switchboard)
        };
      })
    );
  }

  if (Object.keys(integrationFields.oneSimpleApi).length > 0) {
    integrationUpdates.push(
      updateOneSimpleApiIntegration(
        databases,
        currentSettings.$id,
        integrationFields.oneSimpleApi
      ).catch(error => {
        if (error instanceof IntegrationConflictError) {
          throw error;
        }
        console.error('Failed to update OneSimpleAPI integration:', error);
        return {
          error: 'onesimpleapi',
          message: error instanceof Error ? error.message : 'Unknown error',
          fields: Object.keys(integrationFields.oneSimpleApi)
        };
      })
    );
  }

  if (integrationUpdates.length > 0) {
    try {
      const integrationResults = await Promise.all(integrationUpdates);
      const integrationErrors = integrationResults.filter(r => r && typeof r === 'object' && 'error' in r);
      if (integrationErrors.length > 0) {
        integrationWarnings = integrationErrors.map(e => ({
          integration: e.error,
          message: e.message,
          fields: e.fields
        }));
      }
    } catch (error: unknown) {
      if (error instanceof IntegrationConflictError) {
        return res.status(409).json({
          error: 'Conflict',
          message: error.message,
          integrationType: error.integrationType,
          eventSettingsId: error.eventSettingsId,
          expectedVersion: error.expectedVersion,
          actualVersion: error.actualVersion,
          resolution: 'Please refresh the page and try again. Another user may have modified these settings.'
        });
      }
      throw error;
    }
  }

  // Invalidate cache after successful updates
  eventSettingsCache.invalidate('event-settings');

  // Fetch updated data
  const updatedEventSettings = await databases.getDocument(
    dbId,
    eventSettingsCollectionId,
    currentSettings.$id
  );

  const updatedCustomFieldsResult = await databases.listDocuments(
    dbId,
    customFieldsCollectionId,
    [
      Query.equal('eventSettingsId', currentSettings.$id),
      Query.orderAsc('order'),
      Query.limit(100)
    ]
  );

  // Fetch updated integration data
  const switchboardCollectionId = process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID!;
  const cloudinaryCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID!;
  const oneSimpleApiCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID!;

  const [
    updatedSwitchboardResult,
    updatedCloudinaryResult,
    updatedOneSimpleApiResult
  ] = await Promise.allSettled([
    databases.listDocuments(
      dbId,
      switchboardCollectionId,
      [Query.equal('eventSettingsId', currentSettings.$id), Query.limit(1)]
    ),
    databases.listDocuments(
      dbId,
      cloudinaryCollectionId,
      [Query.equal('eventSettingsId', currentSettings.$id), Query.limit(1)]
    ),
    databases.listDocuments(
      dbId,
      oneSimpleApiCollectionId,
      [Query.equal('eventSettingsId', currentSettings.$id), Query.limit(1)]
    )
  ]);

  const updatedSwitchboardData = getDocuments(updatedSwitchboardResult)?.[0] ?? null;
  const updatedCloudinaryData = getDocuments(updatedCloudinaryResult)?.[0] ?? null;
  const updatedOneSimpleApiData = getDocuments(updatedOneSimpleApiResult)?.[0] ?? null;

  // Parse custom fields
  const parsedUpdatedCustomFields = updatedCustomFieldsResult.documents.map((field: any) => ({
    id: field.$id,
    fieldName: field.fieldName,
    internalFieldName: field.internalFieldName,
    fieldType: field.fieldType,
    required: field.required,
    order: field.order,
    showOnMainPage: field.showOnMainPage,
    printable: field.printable,
    fieldOptions: (() => {
      if (!field.fieldOptions) return null;
      if (typeof field.fieldOptions === 'string') return JSON.parse(field.fieldOptions);
      return field.fieldOptions;
    })()
  }));

  // Prepare response
  const updatedEventSettingsWithIntegrations = {
    ...updatedEventSettings,
    cloudinary: updatedCloudinaryData || undefined,
    switchboard: updatedSwitchboardData || undefined,
    oneSimpleApi: updatedOneSimpleApiData || undefined
  } as any;

  const flattenedUpdatedSettings = flattenEventSettings(updatedEventSettingsWithIntegrations);

  const updatedEventSettingsWithFields = {
    ...flattenedUpdatedSettings,
    customFields: parsedUpdatedCustomFields
  };

  // Log performance metrics
  perfTracker.logSummary('PUT /api/event-settings (transactions)');

  const perfHeaders = perfTracker.getResponseHeaders();
  Object.entries(perfHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Add transaction indicator header
  res.setHeader('X-Transaction-Used', 'true');

  const response: any = {
    ...updatedEventSettingsWithFields
  };

  if (integrationWarnings.length > 0) {
    response.warnings = {
      integrations: integrationWarnings,
      message: 'Some integration updates failed. Core event settings were updated successfully.'
    };
    res.setHeader('X-Integration-Warnings', 'true');
  }

  return res.status(200).json(response);
}

/**
 * Build transaction operations for event settings update
 * Creates operations for core settings, custom fields, integrations, and audit log
 */
async function buildEventSettingsTransactionOperations(
  databases: any,
  dbId: string,
  customFieldsCollectionId: string,
  eventSettingsCollectionId: string,
  logsCollectionId: string,
  currentSettings: any,
  currentCustomFields: any[],
  updateData: any,
  customFields: any[] | undefined,
  userId: string
): Promise<{
  operations: TransactionOperation[];
  deletedFieldIds: string[];
  deletedFields: any[];
  needsIntegrationUpdate: boolean;
  updatedUpdateData: any;
}> {
  const operations: TransactionOperation[] = [];
  let deletedFieldIds: string[] = [];
  let deletedFields: any[] = [];
  let needsIntegrationUpdate = false;
  let updatedUpdateData = { ...updateData };

  // 1. Handle custom field deletions first (to clean up integration templates)
  if (customFields && Array.isArray(customFields)) {
    const existingFieldIds = currentCustomFields.map((f) => f.$id);
    const incomingFieldIds = customFields.filter((f) => f.id && !f.id.startsWith('temp_')).map((f) => f.id);
    deletedFieldIds = existingFieldIds.filter((id) => !incomingFieldIds.includes(id));

    if (deletedFieldIds.length > 0) {
      // Fetch deleted fields info before deleting
      deletedFields = currentCustomFields.filter((f) => deletedFieldIds.includes(f.$id));

      // Add delete operations for custom fields
      for (const fieldId of deletedFieldIds) {
        operations.push({
          action: 'delete',
          databaseId: dbId,
          tableId: customFieldsCollectionId,
          rowId: fieldId
        });
      }

      // Clean up integration templates if fields were deleted
      let updatedSwitchboardBody = updateData.switchboardRequestBody || currentSettings.switchboardRequestBody;
      let updatedOneSimpleApiValue = updateData.oneSimpleApiFormDataValue || currentSettings.oneSimpleApiFormDataValue;
      let updatedOneSimpleApiTemplate = updateData.oneSimpleApiRecordTemplate || currentSettings.oneSimpleApiRecordTemplate;
      let updatedFieldMappings =
        updateData.switchboardFieldMappings ||
        (currentSettings.switchboardFieldMappings
          ? typeof currentSettings.switchboardFieldMappings === 'string'
            ? JSON.parse(currentSettings.switchboardFieldMappings as string)
            : currentSettings.switchboardFieldMappings
          : []);

      for (const deletedField of deletedFields) {
        const placeholder = `{{${deletedField.internalFieldName}}}`;
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (updatedSwitchboardBody && updatedSwitchboardBody.includes(placeholder)) {
          updatedSwitchboardBody = updatedSwitchboardBody.replace(new RegExp(escapedPlaceholder, 'g'), '""');
          needsIntegrationUpdate = true;
        }

        if (updatedOneSimpleApiValue && updatedOneSimpleApiValue.includes(placeholder)) {
          updatedOneSimpleApiValue = updatedOneSimpleApiValue.replace(new RegExp(escapedPlaceholder, 'g'), '');
          needsIntegrationUpdate = true;
        }

        if (updatedOneSimpleApiTemplate && updatedOneSimpleApiTemplate.includes(placeholder)) {
          updatedOneSimpleApiTemplate = updatedOneSimpleApiTemplate.replace(new RegExp(escapedPlaceholder, 'g'), '');
          needsIntegrationUpdate = true;
        }

        if (Array.isArray(updatedFieldMappings)) {
          const originalLength = updatedFieldMappings.length;
          updatedFieldMappings = updatedFieldMappings.filter((mapping: any) => mapping.fieldId !== deletedField.$id);
          if (updatedFieldMappings.length !== originalLength) {
            needsIntegrationUpdate = true;
          }
        }
      }

      if (needsIntegrationUpdate) {
        updatedUpdateData.switchboardRequestBody = updatedSwitchboardBody;
        updatedUpdateData.oneSimpleApiFormDataValue = updatedOneSimpleApiValue;
        updatedUpdateData.oneSimpleApiRecordTemplate = updatedOneSimpleApiTemplate;
        updatedUpdateData.switchboardFieldMappings = updatedFieldMappings;
      }
    }

    // 2. Handle custom field modifications
    const existingFields = customFields.filter((f: CustomFieldInput) => f.id && !f.id.startsWith('temp_'));
    const modifiedFields = existingFields.filter((incomingField: CustomFieldInput) => {
      const existingField = currentCustomFields.find((f: any) => f.$id === incomingField.id);
      if (!existingField) return false;

      return existingField.fieldName !== incomingField.fieldName ||
        existingField.fieldType !== incomingField.fieldType ||
        existingField.required !== incomingField.required ||
        existingField.showOnMainPage !== incomingField.showOnMainPage ||
        existingField.printable !== incomingField.printable ||
        JSON.stringify(existingField.fieldOptions) !== JSON.stringify(incomingField.fieldOptions);
    });

    for (const modifiedField of modifiedFields) {
      const fieldOptionsStr = modifiedField.fieldOptions
        ? typeof modifiedField.fieldOptions === 'string'
          ? modifiedField.fieldOptions
          : JSON.stringify(modifiedField.fieldOptions)
        : null;

      operations.push({
        action: 'update',
        databaseId: dbId,
        tableId: customFieldsCollectionId,
        rowId: modifiedField.id,
        data: {
          fieldName: modifiedField.fieldName,
          internalFieldName: modifiedField.internalFieldName || generateInternalFieldName(modifiedField.fieldName),
          fieldType: modifiedField.fieldType,
          fieldOptions: fieldOptionsStr,
          required: modifiedField.required || false,
          order: modifiedField.order,
          showOnMainPage: modifiedField.showOnMainPage !== undefined ? modifiedField.showOnMainPage : true,
          printable: modifiedField.printable !== undefined ? modifiedField.printable : false,
        }
      });
    }

    // 3. Handle custom field additions
    const newFields = customFields.filter((f: CustomFieldInput) => !f.id || f.id.startsWith('temp_'));
    for (const field of newFields) {
      const fieldOptionsStr = field.fieldOptions
        ? typeof field.fieldOptions === 'string'
          ? field.fieldOptions
          : JSON.stringify(field.fieldOptions)
        : null;

      operations.push({
        action: 'create',
        databaseId: dbId,
        tableId: customFieldsCollectionId,
        rowId: ID.unique(),
        data: {
          eventSettingsId: currentSettings.$id,
          fieldName: field.fieldName,
          internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName),
          fieldType: field.fieldType,
          fieldOptions: fieldOptionsStr,
          required: field.required || false,
          order: field.order || customFields.length,
          showOnMainPage: field.showOnMainPage !== undefined ? field.showOnMainPage : true,
          printable: field.printable !== undefined ? field.printable : false,
        }
      });
    }

    // 4. Handle order updates for unchanged fields
    const unchangedFields = existingFields.filter(incomingField => {
      const existingField = currentCustomFields.find(f => f.$id === incomingField.id);
      if (!existingField) return false;

      return existingField.fieldName === incomingField.fieldName &&
        existingField.fieldType === incomingField.fieldType &&
        existingField.required === incomingField.required &&
        JSON.stringify(existingField.fieldOptions) === JSON.stringify(incomingField.fieldOptions);
    });

    for (const field of unchangedFields) {
      operations.push({
        action: 'update',
        databaseId: dbId,
        tableId: customFieldsCollectionId,
        rowId: field.id,
        data: { order: field.order }
      });
    }
  }

  // 5. Update core event settings
  const coreFields = getCoreEventSettingsFields(updatedUpdateData);
  const updatePayload: any = { ...coreFields };

  if (updatedUpdateData.eventDate) {
    updatePayload.eventDate = parseEventDate(updatedUpdateData.eventDate);
  }

  operations.push({
    action: 'update',
    databaseId: dbId,
    tableId: eventSettingsCollectionId,
    rowId: currentSettings.$id,
    data: updatePayload
  });

  // 6. Add audit log operation
  const changedFields = detectChanges(updatedUpdateData, currentSettings);
  const shouldLogUpdate = await shouldLog('eventSettingsUpdate');
  if (shouldLogUpdate) {
    const { createSettingsLogDetails } = await import('@/lib/logFormatting');
    operations.push({
      action: 'create',
      databaseId: dbId,
      tableId: logsCollectionId,
      rowId: ID.unique(),
      data: {
        userId,
        action: 'update',
        details: JSON.stringify(createSettingsLogDetails('update', 'event', {
          eventName: currentSettings.eventName,
          changes: changedFields
        }))
      }
    });
  }

  return {
    operations,
    deletedFieldIds,
    deletedFields,
    needsIntegrationUpdate,
    updatedUpdateData
  };
}

/**
 * Detect changes between update data and current settings
 * Returns array of human-readable field labels that changed
 */
function detectChanges(updateData: any, currentSettings: any): string[] {
  const changedFields: string[] = [];

  // Field mapping: key -> label, with optional comparison function
  const fieldMappings: Array<{
    key: string;
    label: string;
    compare?: (updateVal: any, currentVal: any) => boolean;
  }> = [
      { key: 'eventName', label: 'Event Name' },
      {
        key: 'eventDate',
        label: 'Event Date',
        compare: (updateVal, currentVal) => {
          if (!updateVal) return false;
          return new Date(updateVal).getTime() !== new Date(currentVal).getTime();
        },
      },
      { key: 'eventTime', label: 'Event Time' },
      { key: 'eventLocation', label: 'Event Location' },
      { key: 'timeZone', label: 'Time Zone' },
      { key: 'barcodeType', label: 'Barcode Type' },
      { key: 'barcodeLength', label: 'Barcode Length' },
      { key: 'barcodeUnique', label: 'Barcode Unique Setting' },
      { key: 'forceFirstNameUppercase', label: 'Force First Name Uppercase' },
      { key: 'forceLastNameUppercase', label: 'Force Last Name Uppercase' },
      { key: 'bannerImageUrl', label: 'Banner Image' },
      { key: 'signInBannerUrl', label: 'Sign In Banner Image' },
      // Cloudinary fields
      { key: 'cloudinaryEnabled', label: 'Cloudinary Integration' },
      { key: 'cloudinaryCloudName', label: 'Cloudinary Cloud Name' },
      { key: 'cloudinaryUploadPreset', label: 'Cloudinary Upload Preset' },
      { key: 'cloudinaryAutoOptimize', label: 'Cloudinary Auto-optimize' },
      { key: 'cloudinaryGenerateThumbnails', label: 'Cloudinary Generate Thumbnails' },
      { key: 'cloudinaryDisableSkipCrop', label: 'Cloudinary Disable Skip Crop' },
      { key: 'cloudinaryCropAspectRatio', label: 'Cloudinary Crop Aspect Ratio' },
      // Switchboard fields
      { key: 'switchboardEnabled', label: 'Switchboard Canvas Integration' },
      { key: 'switchboardApiEndpoint', label: 'Switchboard API Endpoint' },
      { key: 'switchboardAuthHeaderType', label: 'Switchboard Auth Header Type' },
      { key: 'switchboardRequestBody', label: 'Switchboard Request Body' },
      { key: 'switchboardTemplateId', label: 'Switchboard Template ID' },
      {
        key: 'switchboardFieldMappings',
        label: 'Switchboard Field Mappings',
        compare: (updateVal, currentVal) => {
          if (!updateVal) return false;
          return JSON.stringify(updateVal) !== JSON.stringify(currentVal);
        },
      },
      // OneSimpleAPI fields
      { key: 'oneSimpleApiEnabled', label: 'OneSimpleAPI Integration' },
      { key: 'oneSimpleApiUrl', label: 'OneSimpleAPI URL' },
      { key: 'oneSimpleApiFormDataKey', label: 'OneSimpleAPI Form Data Key' },
      { key: 'oneSimpleApiFormDataValue', label: 'OneSimpleAPI Form Data Value' },
      { key: 'oneSimpleApiRecordTemplate', label: 'OneSimpleAPI Record Template' },
    ];

  // Check each field for changes
  for (const { key, label, compare } of fieldMappings) {
    const updateVal = updateData[key];

    // Skip if not in update data
    if (updateVal === undefined) continue;

    const currentVal = currentSettings[key];

    // Use custom comparison if provided
    if (compare) {
      if (compare(updateVal, currentVal)) {
        changedFields.push(label);
      }
    } else {
      // Default strict equality comparison
      if (updateVal !== currentVal) {
        changedFields.push(label);
      }
    }
  }

  // Handle custom fields specially
  if (updateData.customFields) {
    changedFields.push('Custom Fields');
  }

  // If no specific changes detected, fall back to generic message
  if (changedFields.length === 0) {
    changedFields.push('Event Settings');
  }

  return changedFields;
}

/**
 * Get core event settings fields (non-integration)
 * Excludes all integration-specific fields and customFields from the update payload
 * Returns only core event settings fields
 */
function getCoreEventSettingsFields(updateData: any) {
  // First, exclude known integration and special fields
  const {
    // Exclude all Cloudinary integration fields
    cloudinaryEnabled, cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret,
    cloudinaryUploadPreset, cloudinaryAutoOptimize, cloudinaryGenerateThumbnails,
    cloudinaryDisableSkipCrop, cloudinaryCropAspectRatio,
    // Exclude all Switchboard integration fields
    switchboardEnabled, switchboardApiEndpoint, switchboardAuthHeaderType,
    switchboardApiKey, switchboardRequestBody, switchboardTemplateId,
    switchboardFieldMappings,
    // Exclude all OneSimpleAPI integration fields
    oneSimpleApiEnabled, oneSimpleApiUrl, oneSimpleApiFormDataKey,
    oneSimpleApiFormDataValue, oneSimpleApiRecordTemplate,
    // Exclude custom fields (handled separately)
    customFields,
    // Exclude cache metadata fields
    timestamp,
    // Keep all remaining fields for now
    ...remainingFields
  } = updateData;

  // Filter out ALL Appwrite internal fields (anything starting with $)
  // Also filter out createdAt and updatedAt which are managed by Appwrite
  const coreFields: any = {};
  for (const [key, value] of Object.entries(remainingFields)) {
    if (!key.startsWith('$') && key !== 'createdAt' && key !== 'updatedAt') {
      coreFields[key] = value;
    }
  }

  return coreFields;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const usersCollectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;
    const rolesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
    const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;

    switch (req.method) {
      case 'GET':
        // For GET requests, allow unauthenticated access to fetch basic event settings
        // This is needed for the login page to display the sign-in banner
        const { databases: adminDatabases } = createAdminClient();

        // Initialize performance tracker
        const perfTracker = new PerformanceTracker();

        // Check cache first - wrap in try-catch to handle cache errors gracefully
        const cacheKey = 'event-settings';
        let cachedData = null;
        try {
          cachedData = eventSettingsCache.get(cacheKey);
        } catch (cacheError) {
          // Log cache error with context but continue with database query
          console.error('Cache access error in GET /api/event-settings:', {
            error: cacheError,
            message: cacheError instanceof Error ? cacheError.message : 'Unknown cache error',
            stack: cacheError instanceof Error ? cacheError.stack : undefined,
            cacheKey,
            timestamp: new Date().toISOString()
          });
          // Set cachedData to null to proceed with database query
          cachedData = null;
        }

        if (cachedData) {
          // Cache hit - return cached data immediately
          perfTracker.logSummary('GET /api/event-settings (cache hit)');

          // Add cache hit header
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Age', Math.floor((Date.now() - cachedData.timestamp) / 1000).toString());

          // Send cached response
          res.status(200).json(cachedData);

          // Still do async logging (cache hit path)
          // Capture JWT before async operation since req context may be lost
          const jwt = req.cookies?.['appwrite-session'];
          setImmediate(() => {
            (async () => {
              if (!jwt) {
                console.warn('Async logging skipped: No JWT available');
                return;
              }
              try {
                // Create a mock request with the JWT for the session client
                const mockReq = { cookies: { 'appwrite-session': jwt } } as any;
                const { account, databases: sessionDatabases } = createSessionClient(mockReq);
                const user = await account.get();

                const userDocs = await sessionDatabases.listDocuments(dbId, usersCollectionId, [
                  Query.equal('userId', user.$id)
                ]);

                if (userDocs.documents.length > 0 && await shouldLog('systemViewEventSettings')) {
                  // Check for recent duplicate logs (within last 5 seconds)
                  const recentLogs = await sessionDatabases.listDocuments(
                    dbId,
                    logsCollectionId,
                    [
                      Query.equal('userId', user.$id),
                      Query.equal('action', 'view'),
                      Query.greaterThan('$createdAt', new Date(Date.now() - 5000).toISOString()),
                      Query.limit(5)
                    ]
                  );

                  // Check if there's already a recent event settings view log
                  const hasDuplicate = recentLogs.documents.some(log => {
                    try {
                      const details = JSON.parse(log.details);
                      return details.target === 'Event Settings';
                    } catch {
                      return false;
                    }
                  });

                  if (!hasDuplicate) {
                    await sessionDatabases.createDocument(
                      dbId,
                      logsCollectionId,
                      ID.unique(),
                      {
                        userId: user.$id,
                        action: 'view',
                        details: JSON.stringify({
                          type: 'system',
                          target: 'Event Settings',
                          description: 'Viewed event configuration'
                        })
                      }
                    );
                  }
                }
              } catch (error: unknown) {
                console.warn('Async logging failed for event settings view:', {
                  error: isError(error) ? error.message : 'Unknown error',
                  type: hasProperty(error, 'type') ? error.type : undefined,
                  hint: 'This is expected if the user logged out or session expired'
                });
              }
            })();
          });

          return;
        }

        // Cache miss - fetch from database
        res.setHeader('X-Cache', 'MISS');

        const eventSettingsResult = await perfTracker.trackQuery(
          'eventSettings',
          () => adminDatabases.listDocuments(
            dbId,
            eventSettingsCollectionId,
            [Query.limit(1)]
          )
        );

        if (eventSettingsResult.documents.length === 0) {
          return res.status(404).json({ error: 'Event settings not found' });
        }

        const eventSettings = eventSettingsResult.documents[0];

        // Fetch custom fields and all integrations in parallel using Promise.allSettled
        const switchboardCollectionId = process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID!;
        const cloudinaryCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID!;
        const oneSimpleApiCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID!;

        const [
          customFieldsResult,
          switchboardResult,
          cloudinaryResult,
          oneSimpleApiResult
        ] = await perfTracker.trackQuery(
          'parallelIntegrations',
          () => Promise.allSettled([
            adminDatabases.listDocuments(
              dbId,
              customFieldsCollectionId,
              [
                Query.equal('eventSettingsId', eventSettings.$id),
                Query.orderAsc('order'),
                Query.limit(100)
              ]
            ),
            adminDatabases.listDocuments(
              dbId,
              switchboardCollectionId,
              [Query.equal('eventSettingsId', eventSettings.$id), Query.limit(1)]
            ),
            adminDatabases.listDocuments(
              dbId,
              cloudinaryCollectionId,
              [Query.equal('eventSettingsId', eventSettings.$id), Query.limit(1)]
            ),
            adminDatabases.listDocuments(
              dbId,
              oneSimpleApiCollectionId,
              [Query.equal('eventSettingsId', eventSettings.$id), Query.limit(1)]
            )
          ])
        );

        // Extract custom fields or use empty array if failed
        let fetchedCustomFields: any[] = [];
        if (isFulfilled(customFieldsResult)) {
          fetchedCustomFields = customFieldsResult.value.documents;
        } else if (isRejected(customFieldsResult)) {
          console.error('Failed to fetch custom fields:', {
            error: customFieldsResult.reason,
            message: customFieldsResult.reason instanceof Error ? customFieldsResult.reason.message : 'Unknown error',
            stack: customFieldsResult.reason instanceof Error ? customFieldsResult.reason.stack : undefined,
            eventSettingsId: eventSettings.$id
          });
        }

        // Extract integration data, setting null for failed integrations
        // Track integration failures for logging
        const integrationFailures: Array<{ name: string; error: any }> = [];

        let switchboardData = null;
        if (isFulfilled(switchboardResult) && switchboardResult.value.documents.length > 0) {
          switchboardData = switchboardResult.value.documents[0];
        } else if (isRejected(switchboardResult)) {
          const error = switchboardResult.reason;
          integrationFailures.push({ name: 'Switchboard', error });
          console.error('Failed to fetch Switchboard integration:', {
            integration: 'Switchboard',
            error: error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            eventSettingsId: eventSettings.$id,
            collectionId: switchboardCollectionId
          });
        }

        let cloudinaryData = null;
        if (isFulfilled(cloudinaryResult) && cloudinaryResult.value.documents.length > 0) {
          cloudinaryData = cloudinaryResult.value.documents[0];
        } else if (isRejected(cloudinaryResult)) {
          const error = cloudinaryResult.reason;
          integrationFailures.push({ name: 'Cloudinary', error });
          console.error('Failed to fetch Cloudinary integration:', {
            integration: 'Cloudinary',
            error: error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            eventSettingsId: eventSettings.$id,
            collectionId: cloudinaryCollectionId
          });
        }

        let oneSimpleApiData = null;
        if (isFulfilled(oneSimpleApiResult) && oneSimpleApiResult.value.documents.length > 0) {
          oneSimpleApiData = oneSimpleApiResult.value.documents[0];
        } else if (isRejected(oneSimpleApiResult)) {
          const error = oneSimpleApiResult.reason;
          integrationFailures.push({ name: 'OneSimpleAPI', error });
          console.error('Failed to fetch OneSimpleAPI integration:', {
            integration: 'OneSimpleAPI',
            error: error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            eventSettingsId: eventSettings.$id,
            collectionId: oneSimpleApiCollectionId
          });
        }

        // Log summary of integration failures if any occurred
        if (integrationFailures.length > 0) {
          console.warn(`Integration fetch failures (${integrationFailures.length}/${3}):`, {
            failures: integrationFailures.map(f => ({
              integration: f.name,
              error: f.error instanceof Error ? f.error.message : String(f.error)
            })),
            eventSettingsId: eventSettings.$id,
            note: 'Event settings response will include null values for failed integrations'
          });
        }

        // Verify that we can still return a valid response even if all integrations failed
        // The main event settings data is required, but integrations are optional
        if (!eventSettings) {
          console.error('Critical error: Event settings data is missing');
          return res.status(500).json({
            error: 'Failed to fetch event settings',
            details: 'Event settings data is unavailable'
          });
        }

        // Parse custom fields - convert fieldOptions from JSON string to object
        // Generate internal field names on-the-fly for display without persisting them
        const parsedCustomFields = fetchedCustomFields.map((field: any) => ({
          id: field.$id,
          fieldName: field.fieldName,
          internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName),
          fieldType: field.fieldType,
          required: field.required,
          order: field.order,
          showOnMainPage: field.showOnMainPage !== undefined ? field.showOnMainPage : true,
          printable: field.printable !== undefined ? field.printable : false,
          fieldOptions: (() => {
            if (!field.fieldOptions) return null;
            if (typeof field.fieldOptions === 'string') return JSON.parse(field.fieldOptions);
            return field.fieldOptions;
          })()
        }));

        // Prepare event settings with integrations for flattening
        const eventSettingsWithIntegrations = {
          ...eventSettings,
          cloudinary: cloudinaryData || undefined,
          switchboard: switchboardData || undefined,
          oneSimpleApi: oneSimpleApiData || undefined
        } as any;

        // Use the flattenEventSettings helper to map all integration fields correctly
        const flattenedSettings = flattenEventSettings(eventSettingsWithIntegrations);

        // Add custom fields to the flattened response
        const eventSettingsWithFields = {
          ...flattenedSettings,
          customFields: parsedCustomFields
        };

        // Log performance metrics
        perfTracker.logSummary('GET /api/event-settings');

        // Add performance headers to response
        const perfHeaders = perfTracker.getResponseHeaders();
        Object.entries(perfHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        // Cache the response data (5 minute TTL by default)
        try {
          eventSettingsCache.set(cacheKey, eventSettingsWithFields);
        } catch (cacheSetError) {
          // Log cache set error but don't fail the request
          console.error('Cache set error in GET /api/event-settings:', {
            error: cacheSetError,
            message: cacheSetError instanceof Error ? cacheSetError.message : 'Unknown cache set error',
            cacheKey,
            timestamp: new Date().toISOString()
          });
        }

        // Send response immediately without waiting for logging
        res.status(200).json(eventSettingsWithFields);

        // Fire-and-forget async logging after response is sent
        // This doesn't block the response and failures won't affect the user
        // Capture JWT before async operation since req context may be lost
        const jwt = req.cookies?.['appwrite-session'];
        setImmediate(() => {
          (async () => {
            if (!jwt) {
              console.warn('Async logging skipped: No JWT available');
              return;
            }
            try {
              // Create a mock request with the JWT for the session client
              const mockReq = { cookies: { 'appwrite-session': jwt } } as any;
              const { account, databases: sessionDatabases } = createSessionClient(mockReq);
              const user = await account.get();

              // Get user profile
              const userDocs = await sessionDatabases.listDocuments(dbId, usersCollectionId, [
                Query.equal('userId', user.$id)
              ]);

              if (userDocs.documents.length > 0 && await shouldLog('systemViewEventSettings')) {
                // Check for recent duplicate logs (within last 5 seconds)
                const recentLogs = await sessionDatabases.listDocuments(
                  dbId,
                  logsCollectionId,
                  [
                    Query.equal('userId', user.$id),
                    Query.equal('action', 'view'),
                    Query.greaterThan('$createdAt', new Date(Date.now() - 5000).toISOString()),
                    Query.limit(5)
                  ]
                );

                // Check if there's already a recent event settings view log
                const hasDuplicate = recentLogs.documents.some(log => {
                  try {
                    const details = JSON.parse(log.details);
                    return details.target === 'Event Settings';
                  } catch {
                    return false;
                  }
                });

                if (!hasDuplicate) {
                  await sessionDatabases.createDocument(
                    dbId,
                    logsCollectionId,
                    ID.unique(),
                    {
                      userId: user.$id,
                      action: 'view',
                      details: JSON.stringify({
                        type: 'system',
                        target: 'Event Settings',
                        description: 'Viewed event configuration'
                      })
                    }
                  );
                }
              }
            } catch (error: unknown) {
              // Log errors but don't throw - logging failures should be silent
              console.warn('Async logging failed for event settings view:', {
                error: isError(error) ? error.message : 'Unknown error',
                type: hasProperty(error, 'type') ? error.type : undefined,
                hint: 'This is expected if the user logged out or session expired'
              });
            }
          })();
        });

        return;

      case 'POST':
      case 'PUT':
        // For POST and PUT requests, require authentication
        // We'll handle this by creating a separate authenticated handler
        return await handleAuthenticatedEventSettings(req, res);

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: unknown) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: isError(error) ? error.message : 'Unknown error'
    });
  }
}

/**
 * Authenticated handler for POST and PUT requests
 * Uses withAuth middleware for consistent authentication
 */
const handleAuthenticatedEventSettings = withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // User is already authenticated by middleware
  const { user: authUser } = req;
  const { databases } = createSessionClient(req);

  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const usersCollectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;
  const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
  const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;
  const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;

  if (req.method === 'POST') {
    // Initialize performance tracker for POST request
    const postPerfTracker = new PerformanceTracker();

    // PHASE 1 SECURITY: Validate request body
    const settingsValidation = validateEventSettings(req.body);
    if (!settingsValidation.valid) {
      return res.status(400).json({ 
        error: 'Validation Error', 
        message: settingsValidation.error 
      });
    }

    // PHASE 1 SECURITY: Sanitize HTML templates
    if (req.body.oneSimpleApiEnabled) {
      if (req.body.oneSimpleApiFormDataValue) {
        req.body.oneSimpleApiFormDataValue = sanitizeHTMLTemplate(req.body.oneSimpleApiFormDataValue);
      }
      if (req.body.oneSimpleApiRecordTemplate) {
        req.body.oneSimpleApiRecordTemplate = sanitizeHTMLTemplate(req.body.oneSimpleApiRecordTemplate);
      }
    }

    // PHASE 1 SECURITY: Validate Switchboard JSON
    if (req.body.switchboardEnabled && req.body.switchboardRequestBody) {
      const validation = validateSwitchboardRequestBody(req.body.switchboardRequestBody);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Invalid JSON', 
          message: validation.error 
        });
      }
    }

    // Create initial event settings (should only happen once)
    const {
      eventName,
      eventDate,
      eventTime,
      eventLocation,
      timeZone,
      barcodeType,
      barcodeLength,
      barcodeUnique,
      forceFirstNameUppercase,
      forceLastNameUppercase,
      cloudinaryCloudName,
      // DEPRECATED: Credentials no longer stored in database
      cloudinaryApiKey,
      cloudinaryApiSecret,
      cloudinaryUploadPreset,
      // DEPRECATED: API key no longer stored in database
      switchboardApiKey,
      switchboardTemplateId,
      bannerImageUrl,
      signInBannerUrl
    } = req.body;

    if (!eventName || !eventDate || !eventLocation || !timeZone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if event settings already exist
    const existingSettingsResult = await postPerfTracker.trackQuery(
      'checkExistingSettings',
      () => databases.listDocuments(
        dbId,
        eventSettingsCollectionId,
        [Query.limit(1)]
      )
    );

    if (existingSettingsResult.documents.length > 0) {
      return res.status(400).json({ error: 'Event settings already exist. Use PUT to update.' });
    }

    // Handle date properly to avoid timezone issues
    const createParsedEventDate = parseEventDate(eventDate);

    const newEventSettings = await postPerfTracker.trackQuery(
      'createEventSettings',
      () => databases.createDocument(
        dbId,
        eventSettingsCollectionId,
        ID.unique(),
        {
          eventName,
          eventDate: createParsedEventDate,
          eventTime: eventTime || null,
          eventLocation,
          timeZone,
          barcodeType: barcodeType || 'alphanumerical',
          barcodeLength: barcodeLength || 8,
          barcodeUnique: barcodeUnique !== undefined ? barcodeUnique : true,
          forceFirstNameUppercase: forceFirstNameUppercase || false,
          forceLastNameUppercase: forceLastNameUppercase || false,
          cloudinaryCloudName: cloudinaryCloudName || null,
          // DEPRECATED: Credentials no longer stored (legacy schema only)
          cloudinaryApiKey: cloudinaryApiKey || null,
          cloudinaryApiSecret: cloudinaryApiSecret || null,
          cloudinaryUploadPreset: cloudinaryUploadPreset || null,
          // DEPRECATED: API key no longer stored (legacy schema only)
          switchboardApiKey: switchboardApiKey || null,
          switchboardTemplateId: switchboardTemplateId || null,
          bannerImageUrl: bannerImageUrl || null,
          signInBannerUrl: signInBannerUrl || null
        }
      )
    );

    // Create default custom fields (Credential Type and Notes)
    // This is done after event settings creation but errors won't fail the request
    await createDefaultCustomFields(
      databases,
      dbId,
      customFieldsCollectionId,
      newEventSettings.$id
    );

    // Fetch custom fields (should now include the default fields)
    const customFieldsResult = await postPerfTracker.trackQuery(
      'fetchCustomFields',
      () => databases.listDocuments(
        dbId,
        customFieldsCollectionId,
        [
          Query.equal('eventSettingsId', newEventSettings.$id),
          Query.orderAsc('order'),
          Query.limit(100)
        ]
      )
    );

    const newEventSettingsWithFields = {
      ...newEventSettings,
      customFields: customFieldsResult.documents
    };

    // Log the create action - only if user exists in our database
    const userDocs = await databases.listDocuments(dbId, usersCollectionId, [
      Query.equal('userId', authUser.$id)
    ]);

    if (userDocs.documents.length > 0) {
      await databases.createDocument(
        dbId,
        logsCollectionId,
        ID.unique(),
        {
          userId: authUser.$id,
          action: 'create',
          details: JSON.stringify({
            type: 'event_settings',
            eventName: newEventSettings.eventName,
            eventDate: newEventSettings.eventDate
          })
        }
      );
    }

    // Invalidate cache after creating event settings
    eventSettingsCache.invalidate('event-settings');

    // Log performance metrics for POST request
    postPerfTracker.logSummary('POST /api/event-settings');

    // Add performance headers to response
    const postPerfHeaders = postPerfTracker.getResponseHeaders();
    Object.entries(postPerfHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    return res.status(201).json(newEventSettingsWithFields);
  }

  // PUT request - Update event settings
  const updateData = req.body;
  const { customFields, ...eventSettingsData } = updateData;

  // PHASE 1 SECURITY: Validate request body
  const settingsValidation = validateEventSettings(updateData);
  if (!settingsValidation.valid) {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: settingsValidation.error 
    });
  }

  // PHASE 1 SECURITY: Sanitize HTML templates
  if (updateData.oneSimpleApiEnabled) {
    if (updateData.oneSimpleApiFormDataValue) {
      updateData.oneSimpleApiFormDataValue = sanitizeHTMLTemplate(updateData.oneSimpleApiFormDataValue);
    }
    if (updateData.oneSimpleApiRecordTemplate) {
      updateData.oneSimpleApiRecordTemplate = sanitizeHTMLTemplate(updateData.oneSimpleApiRecordTemplate);
    }
  }

  // PHASE 1 SECURITY: Validate Switchboard JSON
  if (updateData.switchboardEnabled && updateData.switchboardRequestBody) {
    const validation = validateSwitchboardRequestBody(updateData.switchboardRequestBody);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid JSON', 
        message: validation.error 
      });
    }
  }

  // DEBUG: Log incoming switchboard field mappings
  console.log('[Event Settings PUT] Request body analysis:', {
    hasSwitchboardFieldMappings: 'switchboardFieldMappings' in updateData,
    switchboardFieldMappingsType: typeof updateData.switchboardFieldMappings,
    switchboardFieldMappingsIsArray: Array.isArray(updateData.switchboardFieldMappings),
    switchboardFieldMappingsLength: Array.isArray(updateData.switchboardFieldMappings)
      ? updateData.switchboardFieldMappings.length
      : 'N/A',
    switchboardFieldMappingsValue: updateData.switchboardFieldMappings
  });

  // Invalidate cache immediately to prevent serving stale data during update
  // This ensures concurrent GET requests won't receive outdated cached data
  eventSettingsCache.invalidate('event-settings');

  // Initialize performance tracker for PUT request
  const putPerfTracker = new PerformanceTracker();

  // Get existing settings
  const currentSettingsResult = await putPerfTracker.trackQuery(
    'fetchCurrentSettings',
    () => databases.listDocuments(
      dbId,
      eventSettingsCollectionId,
      [Query.limit(1)]
    )
  );

  if (currentSettingsResult.documents.length === 0) {
    return res.status(404).json({ error: 'Event settings not found. Create them first.' });
  }

  const currentSettings = currentSettingsResult.documents[0];

  // Use transaction-based update
  try {
    return await handleEventSettingsUpdateWithTransactions(
      req,
      res,
      databases,
      dbId,
      customFieldsCollectionId,
      eventSettingsCollectionId,
      logsCollectionId,
      currentSettings,
      updateData,
      customFields,
      authUser,
      putPerfTracker
    );
  } catch (error: unknown) {
    // Transaction failed, return error
    console.error('[Event Settings] Transaction failed:', error);
    return handleTransactionError(error, res);
  }
  const currentCustomFieldsResult = await putPerfTracker.trackQuery(
    'fetchCurrentCustomFields',
    () => databases.listDocuments(
      dbId,
      customFieldsCollectionId,
      [
        Query.equal('eventSettingsId', currentSettings.$id),
        Query.orderAsc('order'),
        Query.limit(100)
      ]
    )
  );

  const currentCustomFields = currentCustomFieldsResult.documents;

  // Handle date properly to avoid timezone issues
  const updateParsedEventDate = eventSettingsData.eventDate ? parseEventDate(eventSettingsData.eventDate) : undefined;

  // Handle custom fields separately if they exist
  if (customFields && Array.isArray(customFields)) {
    // Separate existing fields from new fields
    const existingFields = customFields.filter((f: CustomFieldInput) => f.id && !f.id.startsWith('temp_'));
    const newFields = customFields.filter((f: CustomFieldInput) => !f.id || f.id.startsWith('temp_'));

    // Check if any existing fields were modified (excluding order changes)
    const modifiedFields = existingFields.filter((incomingField: CustomFieldInput) => {
      const existingField = currentCustomFields.find(f => f.$id === incomingField.id);
      if (!existingField) return false;

      return existingField.fieldName !== incomingField.fieldName ||
        existingField.fieldType !== incomingField.fieldType ||
        existingField.required !== incomingField.required ||
        existingField.showOnMainPage !== incomingField.showOnMainPage ||
        JSON.stringify(existingField.fieldOptions) !== JSON.stringify(incomingField.fieldOptions);
    });

    // Handle deletions and clean up integration templates
    const deletionResult = await handleCustomFieldDeletions(
      databases,
      dbId,
      customFieldsCollectionId,
      currentCustomFields,
      customFields,
      updateData,
      currentSettings
    );

    // Wire updated integration data back into updateData
    if (deletionResult.needsIntegrationUpdate) {
      Object.assign(updateData, deletionResult.updatedUpdateData);
    }

    // If there are deletions or modifications, we need to handle them carefully to preserve data
    if (deletionResult.deletedFieldIds.length > 0 || modifiedFields.length > 0) {
      // Handle modifications - update existing fields without deleting them
      await handleCustomFieldModifications(
        databases,
        dbId,
        customFieldsCollectionId,
        modifiedFields
      );

      // Handle new fields
      await handleCustomFieldAdditions(
        databases,
        dbId,
        customFieldsCollectionId,
        newFields,
        currentSettings,
        customFields.length
      );

      // Handle order updates for unchanged existing fields
      const unchangedFields = existingFields.filter((incomingField: CustomFieldInput) => {
        const existingField = currentCustomFields.find((f: any) => f.$id === incomingField.id);
        if (!existingField) return false;

        return existingField.fieldName === incomingField.fieldName &&
          existingField.fieldType === incomingField.fieldType &&
          existingField.required === incomingField.required &&
          JSON.stringify(existingField.fieldOptions) === JSON.stringify(incomingField.fieldOptions);
      });

      for (const field of unchangedFields) {
        await databases.updateDocument(
          dbId,
          customFieldsCollectionId,
          field.id,
          { order: field.order }
        );
      }
    } else {
      // Only additions and/or reordering - handle incrementally
      // Update order for existing fields
      for (const field of existingFields) {
        await databases.updateDocument(
          dbId,
          customFieldsCollectionId,
          field.id,
          { order: field.order }
        );
      }

      // Create new fields
      await handleCustomFieldAdditions(
        databases,
        dbId,
        customFieldsCollectionId,
        newFields,
        currentSettings,
        customFields.length
      );
    }
  }

  // Extract integration fields using the new helper
  const integrationFields = extractIntegrationFields(updateData);

  // Get core event settings fields (excluding integration and custom fields)
  const coreFields = getCoreEventSettingsFields(eventSettingsData);

  // Handle eventDate properly
  const updatePayload: any = { ...coreFields };
  if (updateParsedEventDate) {
    updatePayload.eventDate = updateParsedEventDate;
  }

  // Always update the EventSettings record with core fields
  const updatedEventSettings = await putPerfTracker.trackQuery(
    'updateEventSettings',
    () => databases.updateDocument(
      dbId,
      eventSettingsCollectionId,
      currentSettings.$id,
      updatePayload
    )
  );

  // Update integrations in parallel using Promise.all
  // Each integration update is wrapped in try-catch to handle individual failures
  const integrationUpdates = [];

  // Handle Cloudinary integration if fields are present
  if (Object.keys(integrationFields.cloudinary).length > 0) {
    integrationUpdates.push(
      updateCloudinaryIntegration(
        databases,
        updatedEventSettings.$id,
        integrationFields.cloudinary
      ).catch(error => {
        if (error instanceof IntegrationConflictError) {
          // Re-throw conflict errors to be handled at the top level
          throw error;
        }
        // Log detailed error information for non-conflict errors
        console.error('Failed to update Cloudinary integration:', {
          integration: 'Cloudinary',
          eventSettingsId: updatedEventSettings.$id,
          fields: Object.keys(integrationFields.cloudinary),
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
        return {
          error: 'cloudinary',
          message: error instanceof Error ? error.message : 'Unknown error',
          fields: Object.keys(integrationFields.cloudinary)
        };
      })
    );
  }

  // Handle Switchboard integration if fields are present
  if (Object.keys(integrationFields.switchboard).length > 0) {
    integrationUpdates.push(
      updateSwitchboardIntegration(
        databases,
        updatedEventSettings.$id,
        integrationFields.switchboard
      ).catch(error => {
        if (error instanceof IntegrationConflictError) {
          // Re-throw conflict errors to be handled at the top level
          throw error;
        }
        // Log detailed error information for non-conflict errors
        console.error('Failed to update Switchboard integration:', {
          integration: 'Switchboard',
          eventSettingsId: updatedEventSettings.$id,
          fields: Object.keys(integrationFields.switchboard),
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
        return {
          error: 'switchboard',
          message: error instanceof Error ? error.message : 'Unknown error',
          fields: Object.keys(integrationFields.switchboard)
        };
      })
    );
  }

  // Handle OneSimpleAPI integration if fields are present
  if (Object.keys(integrationFields.oneSimpleApi).length > 0) {
    integrationUpdates.push(
      updateOneSimpleApiIntegration(
        databases,
        updatedEventSettings.$id,
        integrationFields.oneSimpleApi
      ).catch(error => {
        if (error instanceof IntegrationConflictError) {
          // Re-throw conflict errors to be handled at the top level
          throw error;
        }
        // Log detailed error information for non-conflict errors
        console.error('Failed to update OneSimpleAPI integration:', {
          integration: 'OneSimpleAPI',
          eventSettingsId: updatedEventSettings.$id,
          fields: Object.keys(integrationFields.oneSimpleApi),
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
        return {
          error: 'onesimpleapi',
          message: error instanceof Error ? error.message : 'Unknown error',
          fields: Object.keys(integrationFields.oneSimpleApi)
        };
      })
    );
  }

  // Wait for all integration updates to complete
  let integrationWarnings: any[] = [];
  try {
    const integrationResults = await Promise.all(integrationUpdates);

    // Check for partial failures (non-conflict errors)
    const integrationErrors = integrationResults.filter(r => r && typeof r === 'object' && 'error' in r);
    if (integrationErrors.length > 0) {
      // Log summary of integration failures
      console.warn('Integration update partial failures:', {
        totalUpdates: integrationUpdates.length,
        failedCount: integrationErrors.length,
        failures: integrationErrors.map(e => ({
          integration: e.error,
          message: e.message,
          fields: e.fields
        })),
        eventSettingsId: updatedEventSettings.$id,
        timestamp: new Date().toISOString(),
        note: 'Core event settings were updated successfully. Integration failures are non-critical.'
      });

      // Store warnings to include in response
      integrationWarnings = integrationErrors.map(e => ({
        integration: e.error,
        message: e.message,
        fields: e.fields
      }));
    }
  } catch (error: unknown) {
    // Handle IntegrationConflictError with 409 response
    if (error instanceof IntegrationConflictError) {
      console.error('Integration optimistic locking conflict detected:', {
        integrationType: error.integrationType,
        eventSettingsId: error.eventSettingsId,
        expectedVersion: error.expectedVersion,
        actualVersion: error.actualVersion,
        timestamp: new Date().toISOString(),
        resolution: 'Client should refetch event settings and retry the update'
      });

      return res.status(409).json({
        error: 'Conflict',
        message: error.message,
        integrationType: error.integrationType,
        eventSettingsId: error.eventSettingsId,
        expectedVersion: error.expectedVersion,
        actualVersion: error.actualVersion,
        resolution: 'Please refresh the page and try again. Another user may have modified these settings.'
      });
    }
    // Re-throw other unexpected errors
    throw error;
  }

  // Invalidate cache after successful updates to ensure fresh data
  // Second invalidation needed in case cache was repopulated by concurrent GET during update
  eventSettingsCache.invalidate('event-settings');

  // Fetch updated custom fields
  const updatedCustomFieldsResult = await databases.listDocuments(
    dbId,
    customFieldsCollectionId,
    [
      Query.equal('eventSettingsId', updatedEventSettings.$id),
      Query.orderAsc('order'),
      Query.limit(100)
    ]
  );

  // Fetch updated integration data from separate collections
  const putSwitchboardCollectionId = process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID!;
  const putCloudinaryCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID!;
  const putOneSimpleApiCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID!;

  const integrationResults = await Promise.allSettled([
    databases.listDocuments(
      dbId,
      putSwitchboardCollectionId,
      [Query.equal('eventSettingsId', updatedEventSettings.$id), Query.limit(1)]
    ),
    databases.listDocuments(
      dbId,
      putCloudinaryCollectionId,
      [Query.equal('eventSettingsId', updatedEventSettings.$id), Query.limit(1)]
    ),
    databases.listDocuments(
      dbId,
      putOneSimpleApiCollectionId,
      [Query.equal('eventSettingsId', updatedEventSettings.$id), Query.limit(1)]
    )
  ]);

  // Extract integration data using type guards
  let updatedSwitchboardData = null;
  const switchboardResult = integrationResults[0];
  if (isFulfilled(switchboardResult)) {
    const documents = (switchboardResult as any).value.documents;
    if (documents.length > 0) {
      updatedSwitchboardData = documents[0];
    }
  } else if (isRejected(switchboardResult)) {
    console.warn('Failed to fetch updated switchboard integration:', (switchboardResult as any).reason);
  }

  let updatedCloudinaryData = null;
  const cloudinaryResult = integrationResults[1];
  if (isFulfilled(cloudinaryResult)) {
    const documents = (cloudinaryResult as any).value.documents;
    if (documents.length > 0) {
      updatedCloudinaryData = documents[0];
    }
  } else if (isRejected(cloudinaryResult)) {
    console.warn('Failed to fetch updated cloudinary integration:', (cloudinaryResult as any).reason);
  }

  let updatedOneSimpleApiData = null;
  const oneSimpleApiResult = integrationResults[2];
  if (isFulfilled(oneSimpleApiResult)) {
    const documents = (oneSimpleApiResult as any).value.documents;
    if (documents.length > 0) {
      updatedOneSimpleApiData = documents[0];
    }
  } else if (isRejected(oneSimpleApiResult)) {
    console.warn('Failed to fetch updated onesimpleapi integration:', (oneSimpleApiResult as any).reason);
  }

  // Parse custom fields - convert fieldOptions from JSON string to object
  const parsedUpdatedCustomFields = updatedCustomFieldsResult.documents.map((field: any) => ({
    id: field.$id,
    fieldName: field.fieldName,
    internalFieldName: field.internalFieldName,
    fieldType: field.fieldType,
    required: field.required,
    order: field.order,
    showOnMainPage: field.showOnMainPage,
    printable: field.printable,
    fieldOptions: (() => {
      if (!field.fieldOptions) return null;
      if (typeof field.fieldOptions === 'string') return JSON.parse(field.fieldOptions);
      return field.fieldOptions;
    })()
  }));

  // Prepare event settings with integrations for flattening
  const updatedEventSettingsWithIntegrations = {
    ...updatedEventSettings,
    cloudinary: updatedCloudinaryData || undefined,
    switchboard: updatedSwitchboardData || undefined,
    oneSimpleApi: updatedOneSimpleApiData || undefined
  } as any;

  // Use the flattenEventSettings helper to map all integration fields correctly
  const flattenedUpdatedSettings = flattenEventSettings(updatedEventSettingsWithIntegrations);

  // Add custom fields to the flattened response
  const updatedEventSettingsWithFields = {
    ...flattenedUpdatedSettings,
    customFields: parsedUpdatedCustomFields
  };

  // Log the update action - only if user exists in our database
  const userDocs = await databases.listDocuments(dbId, usersCollectionId, [
    Query.equal('userId', authUser.$id)
  ]);

  if (userDocs.documents.length > 0) {
    // Detect changes for logging
    const changedFields = detectChanges(updateData, currentSettings);

    // Log the update action if enabled
    if (await shouldLog('eventSettingsUpdate')) {
      const { createSettingsLogDetails } = await import('@/lib/logFormatting');
      await databases.createDocument(
        dbId,
        logsCollectionId,
        ID.unique(),
        {
          userId: authUser.$id,
          action: 'update',
          details: JSON.stringify(createSettingsLogDetails('update', 'event', {
            eventName: updatedEventSettings.eventName,
            changes: changedFields
          }))
        }
      );
    }
  }

  // Log performance metrics for PUT request
  putPerfTracker.logSummary('PUT /api/event-settings');

  // Add performance headers to response
  const putPerfHeaders = putPerfTracker.getResponseHeaders();
  Object.entries(putPerfHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Prepare response with integration warnings if any occurred
  const response: any = {
    ...updatedEventSettingsWithFields
  };

  // Include integration warnings in response if there were partial failures
  if (integrationWarnings.length > 0) {
    response.warnings = {
      integrations: integrationWarnings,
      message: 'Some integration updates failed. Core event settings were updated successfully.'
    };

    // Add warning header for client-side detection
    res.setHeader('X-Integration-Warnings', 'true');
  }

  return res.status(200).json(response);
});
