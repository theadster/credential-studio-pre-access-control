import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { generateInternalFieldName } from '@/util/string';
import { shouldLog } from '@/lib/logSettings';
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

/**
 * Extract integration fields from the update payload
 * Filters out undefined values to avoid overwriting with undefined
 */
function extractIntegrationFields(updateData: any) {
  // Extract all 9 Cloudinary fields
  const cloudinaryFields = {
    enabled: updateData.cloudinaryEnabled,
    cloudName: updateData.cloudinaryCloudName,
    apiKey: updateData.cloudinaryApiKey,
    apiSecret: updateData.cloudinaryApiSecret,
    uploadPreset: updateData.cloudinaryUploadPreset,
    autoOptimize: updateData.cloudinaryAutoOptimize,
    generateThumbnails: updateData.cloudinaryGenerateThumbnails,
    disableSkipCrop: updateData.cloudinaryDisableSkipCrop,
    cropAspectRatio: updateData.cloudinaryCropAspectRatio
  };

  // Extract all 7 Switchboard fields
  const switchboardFields = {
    enabled: updateData.switchboardEnabled,
    apiEndpoint: updateData.switchboardApiEndpoint,
    authHeaderType: updateData.switchboardAuthHeaderType,
    apiKey: updateData.switchboardApiKey,
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
 * Get core event settings fields (non-integration)
 * Excludes all integration-specific fields and customFields from the update payload
 * Returns only core event settings fields
 */
function getCoreEventSettingsFields(updateData: any) {
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
    // Keep all remaining core fields
    ...coreFields
  } = updateData;

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
        
        // Check cache first
        const cacheKey = 'event-settings';
        const cachedData = eventSettingsCache.get(cacheKey);
        
        if (cachedData) {
          // Cache hit - return cached data immediately
          perfTracker.logSummary('GET /api/event-settings (cache hit)');
          
          // Add cache hit header
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Age', Math.floor((Date.now() - cachedData.timestamp) / 1000).toString());
          
          // Send cached response
          res.status(200).json(cachedData);
          
          // Still do async logging
          setImmediate(() => {
            (async () => {
              try {
                const { account, databases: sessionDatabases } = createSessionClient(req);
                const user = await account.get();
                
                const userDocs = await sessionDatabases.listDocuments(dbId, usersCollectionId, [
                  Query.equal('userId', user.$id)
                ]);
                
                if (userDocs.documents.length > 0 && await shouldLog('systemViewEventSettings')) {
                  await sessionDatabases.createDocument(
                    dbId,
                    logsCollectionId,
                    ID.unique(),
                    {
                      userId: user.$id,
                      action: 'view',
                      details: JSON.stringify({ type: 'event_settings' })
                    }
                  );
                }
              } catch (error) {
                console.error('Async logging failed for event settings view:', error);
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

        let eventSettings = eventSettingsResult.documents[0];

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
        if (customFieldsResult.status === 'fulfilled') {
          fetchedCustomFields = customFieldsResult.value.documents;
        } else {
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
        if (switchboardResult.status === 'fulfilled' && switchboardResult.value.documents.length > 0) {
          switchboardData = switchboardResult.value.documents[0];
        } else if (switchboardResult.status === 'rejected') {
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
        if (cloudinaryResult.status === 'fulfilled' && cloudinaryResult.value.documents.length > 0) {
          cloudinaryData = cloudinaryResult.value.documents[0];
        } else if (cloudinaryResult.status === 'rejected') {
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
        if (oneSimpleApiResult.status === 'fulfilled' && oneSimpleApiResult.value.documents.length > 0) {
          oneSimpleApiData = oneSimpleApiResult.value.documents[0];
        } else if (oneSimpleApiResult.status === 'rejected') {
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
          fieldOptions: field.fieldOptions ? 
            (typeof field.fieldOptions === 'string' ? 
              JSON.parse(field.fieldOptions) : field.fieldOptions) : null
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
        eventSettingsCache.set(cacheKey, eventSettingsWithFields);

        // Send response immediately without waiting for logging
        res.status(200).json(eventSettingsWithFields);

        // Fire-and-forget async logging after response is sent
        // This doesn't block the response and failures won't affect the user
        setImmediate(() => {
          (async () => {
            try {
              const { account, databases: sessionDatabases } = createSessionClient(req);
              const user = await account.get();
              
              // Get user profile
              const userDocs = await sessionDatabases.listDocuments(dbId, usersCollectionId, [
                Query.equal('userId', user.$id)
              ]);
              
              if (userDocs.documents.length > 0 && await shouldLog('systemViewEventSettings')) {
                await sessionDatabases.createDocument(
                  dbId,
                  logsCollectionId,
                  ID.unique(),
                  {
                    userId: user.$id,
                    action: 'view',
                    details: JSON.stringify({ type: 'event_settings' })
                  }
                );
              }
            } catch (error) {
              // Log errors but don't throw - logging failures should be silent
              console.error('Async logging failed for event settings view:', error);
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
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
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
            cloudinaryApiKey,
            cloudinaryApiSecret,
            cloudinaryUploadPreset,
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
          let createParsedEventDate: string;
          if (eventDate) {
            if (typeof eventDate === 'string' && eventDate.includes('-') && !eventDate.includes('T')) {
              // If it's a date string (YYYY-MM-DD), parse it as local date to avoid UTC conversion
              const [year, month, day] = eventDate.split('-').map(Number);
              createParsedEventDate = new Date(year, month - 1, day).toISOString();
            } else {
              createParsedEventDate = new Date(eventDate).toISOString();
            }
          } else {
            createParsedEventDate = new Date().toISOString();
          }

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
                cloudinaryApiKey: cloudinaryApiKey || null,
                cloudinaryApiSecret: cloudinaryApiSecret || null,
                cloudinaryUploadPreset: cloudinaryUploadPreset || null,
                switchboardApiKey: switchboardApiKey || null,
                switchboardTemplateId: switchboardTemplateId || null,
                bannerImageUrl: bannerImageUrl || null,
                signInBannerUrl: signInBannerUrl || null
              }
            )
          );

          // Fetch custom fields (should be empty for new settings)
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

        // Fetch current custom fields
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
        let updateParsedEventDate;
        if (eventSettingsData.eventDate) {
          if (typeof eventSettingsData.eventDate === 'string' && eventSettingsData.eventDate.includes('-') && !eventSettingsData.eventDate.includes('T')) {
            // If it's a date string (YYYY-MM-DD), parse it as local date to avoid UTC conversion
            const [year, month, day] = eventSettingsData.eventDate.split('-').map(Number);
            updateParsedEventDate = new Date(year, month - 1, day).toISOString();
          } else {
            updateParsedEventDate = new Date(eventSettingsData.eventDate).toISOString();
          }
        }

        // Handle custom fields separately if they exist
        if (customFields && Array.isArray(customFields)) {
          const existingFieldIds = currentCustomFields.map(f => f.$id);
          const incomingFieldIds = customFields.filter(f => f.id && !f.id.startsWith('temp_')).map(f => f.id);
          
          // Separate existing fields from new fields
          const existingFields = customFields.filter(f => f.id && !f.id.startsWith('temp_'));
          const newFields = customFields.filter(f => !f.id || f.id.startsWith('temp_'));
          
          // Check if any existing fields were deleted
          const deletedFieldIds = existingFieldIds.filter(id => !incomingFieldIds.includes(id));
          
          // Check if any existing fields were modified (excluding order changes)
          const modifiedFields = existingFields.filter(incomingField => {
            const existingField = currentCustomFields.find(f => f.$id === incomingField.id);
            if (!existingField) return false;
            
            return existingField.fieldName !== incomingField.fieldName ||
                   existingField.fieldType !== incomingField.fieldType ||
                   existingField.required !== incomingField.required ||
                   JSON.stringify(existingField.fieldOptions) !== JSON.stringify(incomingField.fieldOptions);
          });
          
          // If there are deletions or modifications, we need to handle them carefully to preserve data
          if (deletedFieldIds.length > 0 || modifiedFields.length > 0) {
            // Get deleted field information for cleanup
            let deletedFields: any[] = [];
            if (deletedFieldIds.length > 0) {
              // Fetch deleted fields info before deleting
              deletedFields = currentCustomFields.filter(f => deletedFieldIds.includes(f.$id));
              
              // Delete fields one by one (Appwrite doesn't support batch deletes)
              for (const fieldId of deletedFieldIds) {
                await databases.deleteDocument(dbId, customFieldsCollectionId, fieldId);
              }
            }
            
            // Clean up integration templates if fields were deleted
            if (deletedFields.length > 0) {
              let needsIntegrationUpdate = false;
              let updatedSwitchboardBody = updateData.switchboardRequestBody || currentSettings.switchboardRequestBody;
              let updatedOneSimpleApiValue = updateData.oneSimpleApiFormDataValue || currentSettings.oneSimpleApiFormDataValue;
              let updatedOneSimpleApiTemplate = updateData.oneSimpleApiRecordTemplate || currentSettings.oneSimpleApiRecordTemplate;
              let updatedFieldMappings = updateData.switchboardFieldMappings || 
                (currentSettings.switchboardFieldMappings ? 
                  (typeof currentSettings.switchboardFieldMappings === 'string' ? 
                    JSON.parse(currentSettings.switchboardFieldMappings as string) : 
                    currentSettings.switchboardFieldMappings) : 
                  []);
              
              for (const deletedField of deletedFields) {
                const placeholder = `{{${deletedField.internalFieldName}}}`;
                
                // Clean up Switchboard Canvas request body
                if (updatedSwitchboardBody && updatedSwitchboardBody.includes(placeholder)) {
                  updatedSwitchboardBody = updatedSwitchboardBody.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '""');
                  needsIntegrationUpdate = true;
                }
                
                // Clean up OneSimpleAPI templates
                if (updatedOneSimpleApiValue && updatedOneSimpleApiValue.includes(placeholder)) {
                  updatedOneSimpleApiValue = updatedOneSimpleApiValue.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
                  needsIntegrationUpdate = true;
                }
                
                if (updatedOneSimpleApiTemplate && updatedOneSimpleApiTemplate.includes(placeholder)) {
                  updatedOneSimpleApiTemplate = updatedOneSimpleApiTemplate.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
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
              if (needsIntegrationUpdate) {
                updateData.switchboardRequestBody = updatedSwitchboardBody;
                updateData.oneSimpleApiFormDataValue = updatedOneSimpleApiValue;
                updateData.oneSimpleApiRecordTemplate = updatedOneSimpleApiTemplate;
                updateData.switchboardFieldMappings = updatedFieldMappings;
              }
            }
            
            // Handle modifications - update existing fields without deleting them
            for (const modifiedField of modifiedFields) {
              const fieldOptionsStr = modifiedField.fieldOptions ? 
                (typeof modifiedField.fieldOptions === 'string' ? modifiedField.fieldOptions : JSON.stringify(modifiedField.fieldOptions)) : 
                null;
              
              await databases.updateDocument(
                dbId,
                customFieldsCollectionId,
                modifiedField.id,
                {
                  fieldName: modifiedField.fieldName,
                  internalFieldName: modifiedField.internalFieldName || generateInternalFieldName(modifiedField.fieldName),
                  fieldType: modifiedField.fieldType,
                  fieldOptions: fieldOptionsStr,
                  required: modifiedField.required || false,
                  order: modifiedField.order
                }
              );
            }
            
            // Handle new fields
            for (const field of newFields) {
              const fieldOptionsStr = field.fieldOptions ? 
                (typeof field.fieldOptions === 'string' ? field.fieldOptions : JSON.stringify(field.fieldOptions)) : 
                null;
              
              await databases.createDocument(
                dbId,
                customFieldsCollectionId,
                ID.unique(),
                {
                  eventSettingsId: currentSettings.$id,
                  fieldName: field.fieldName,
                  internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName),
                  fieldType: field.fieldType,
                  fieldOptions: fieldOptionsStr,
                  required: field.required || false,
                  order: field.order || customFields.length
                }
              );
            }
            
            // Handle order updates for unchanged existing fields
            const unchangedFields = existingFields.filter(incomingField => {
              const existingField = currentCustomFields.find(f => f.$id === incomingField.id);
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
            for (const field of newFields) {
              const fieldOptionsStr = field.fieldOptions ? 
                (typeof field.fieldOptions === 'string' ? field.fieldOptions : JSON.stringify(field.fieldOptions)) : 
                null;
              
              await databases.createDocument(
                dbId,
                customFieldsCollectionId,
                ID.unique(),
                {
                  eventSettingsId: currentSettings.$id,
                  fieldName: field.fieldName,
                  internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName),
                  fieldType: field.fieldType,
                  fieldOptions: fieldOptionsStr,
                  required: field.required || false,
                  order: field.order || customFields.length
                }
              );
            }
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
        } catch (error) {
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

        // Invalidate cache after successful updates
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

        const [
          updatedSwitchboardResult,
          updatedCloudinaryResult,
          updatedOneSimpleApiResult
        ] = await Promise.allSettled([
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

        // Extract integration data
        let updatedSwitchboardData = null;
        if (updatedSwitchboardResult.status === 'fulfilled' && updatedSwitchboardResult.value.documents.length > 0) {
          updatedSwitchboardData = updatedSwitchboardResult.value.documents[0];
        } else if (updatedSwitchboardResult.status === 'rejected') {
          console.warn('Failed to fetch updated switchboard integration:', updatedSwitchboardResult.reason);
        }

        let updatedCloudinaryData = null;
        if (updatedCloudinaryResult.status === 'fulfilled' && updatedCloudinaryResult.value.documents.length > 0) {
          updatedCloudinaryData = updatedCloudinaryResult.value.documents[0];
        } else if (updatedCloudinaryResult.status === 'rejected') {
          console.warn('Failed to fetch updated cloudinary integration:', updatedCloudinaryResult.reason);
        }

        let updatedOneSimpleApiData = null;
        if (updatedOneSimpleApiResult.status === 'fulfilled' && updatedOneSimpleApiResult.value.documents.length > 0) {
          updatedOneSimpleApiData = updatedOneSimpleApiResult.value.documents[0];
        } else if (updatedOneSimpleApiResult.status === 'rejected') {
          console.warn('Failed to fetch updated onesimpleapi integration:', updatedOneSimpleApiResult.reason);
        }

        // Parse custom fields - convert fieldOptions from JSON string to object
        const parsedUpdatedCustomFields = updatedCustomFieldsResult.documents.map((field: any) => ({
          id: field.$id,
          fieldName: field.fieldName,
          internalFieldName: field.internalFieldName,
          fieldType: field.fieldType,
          required: field.required,
          order: field.order,
          fieldOptions: field.fieldOptions ? 
            (typeof field.fieldOptions === 'string' ? 
              JSON.parse(field.fieldOptions) : field.fieldOptions) : null
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
          // Create a more descriptive list of changes
          const changedFields: string[] = [];
          
          // Check for main event settings changes
          if (updateData.eventName && updateData.eventName !== currentSettings.eventName) {
            changedFields.push('Event Name');
          }
          if (updateData.eventDate && new Date(updateData.eventDate).getTime() !== new Date(currentSettings.eventDate as string).getTime()) {
            changedFields.push('Event Date');
          }
          if (updateData.eventTime && updateData.eventTime !== currentSettings.eventTime) {
            changedFields.push('Event Time');
          }
          if (updateData.eventLocation && updateData.eventLocation !== currentSettings.eventLocation) {
            changedFields.push('Event Location');
          }
          if (updateData.timeZone && updateData.timeZone !== currentSettings.timeZone) {
            changedFields.push('Time Zone');
          }
          if (updateData.barcodeType && updateData.barcodeType !== currentSettings.barcodeType) {
            changedFields.push('Barcode Type');
          }
          if (updateData.barcodeLength && updateData.barcodeLength !== currentSettings.barcodeLength) {
            changedFields.push('Barcode Length');
          }
          if (updateData.barcodeUnique !== undefined && updateData.barcodeUnique !== currentSettings.barcodeUnique) {
            changedFields.push('Barcode Unique Setting');
          }
          if (updateData.forceFirstNameUppercase !== undefined && updateData.forceFirstNameUppercase !== currentSettings.forceFirstNameUppercase) {
            changedFields.push('Force First Name Uppercase');
          }
          if (updateData.forceLastNameUppercase !== undefined && updateData.forceLastNameUppercase !== currentSettings.forceLastNameUppercase) {
            changedFields.push('Force Last Name Uppercase');
          }
          if (updateData.bannerImageUrl !== undefined && updateData.bannerImageUrl !== currentSettings.bannerImageUrl) {
            changedFields.push('Banner Image');
          }
          if (updateData.signInBannerUrl !== undefined && updateData.signInBannerUrl !== currentSettings.signInBannerUrl) {
            changedFields.push('Sign In Banner Image');
          }
          
          // Check for Cloudinary settings changes
          if (updateData.cloudinaryEnabled !== undefined && updateData.cloudinaryEnabled !== currentSettings.cloudinaryEnabled) {
            changedFields.push('Cloudinary Integration');
          }
          if (updateData.cloudinaryCloudName && updateData.cloudinaryCloudName !== currentSettings.cloudinaryCloudName) {
            changedFields.push('Cloudinary Cloud Name');
          }
          if (updateData.cloudinaryApiKey && updateData.cloudinaryApiKey !== currentSettings.cloudinaryApiKey) {
            changedFields.push('Cloudinary API Key');
          }
          if (updateData.cloudinaryApiSecret && updateData.cloudinaryApiSecret !== currentSettings.cloudinaryApiSecret) {
            changedFields.push('Cloudinary API Secret');
          }
          if (updateData.cloudinaryUploadPreset && updateData.cloudinaryUploadPreset !== currentSettings.cloudinaryUploadPreset) {
            changedFields.push('Cloudinary Upload Preset');
          }
          if (updateData.cloudinaryAutoOptimize !== undefined && updateData.cloudinaryAutoOptimize !== currentSettings.cloudinaryAutoOptimize) {
            changedFields.push('Cloudinary Auto-optimize');
          }
          if (updateData.cloudinaryGenerateThumbnails !== undefined && updateData.cloudinaryGenerateThumbnails !== currentSettings.cloudinaryGenerateThumbnails) {
            changedFields.push('Cloudinary Generate Thumbnails');
          }
          if (updateData.cloudinaryDisableSkipCrop !== undefined && updateData.cloudinaryDisableSkipCrop !== currentSettings.cloudinaryDisableSkipCrop) {
            changedFields.push('Cloudinary Disable Skip Crop');
          }
          if (updateData.cloudinaryCropAspectRatio && updateData.cloudinaryCropAspectRatio !== currentSettings.cloudinaryCropAspectRatio) {
            changedFields.push('Cloudinary Crop Aspect Ratio');
          }
          
          // Check for Switchboard settings changes
          if (updateData.switchboardEnabled !== undefined && updateData.switchboardEnabled !== currentSettings.switchboardEnabled) {
            changedFields.push('Switchboard Canvas Integration');
          }
          if (updateData.switchboardApiEndpoint && updateData.switchboardApiEndpoint !== currentSettings.switchboardApiEndpoint) {
            changedFields.push('Switchboard API Endpoint');
          }
          if (updateData.switchboardAuthHeaderType && updateData.switchboardAuthHeaderType !== currentSettings.switchboardAuthHeaderType) {
            changedFields.push('Switchboard Auth Header Type');
          }
          if (updateData.switchboardApiKey && updateData.switchboardApiKey !== currentSettings.switchboardApiKey) {
            changedFields.push('Switchboard API Key');
          }
          if (updateData.switchboardRequestBody && updateData.switchboardRequestBody !== currentSettings.switchboardRequestBody) {
            changedFields.push('Switchboard Request Body');
          }
          if (updateData.switchboardTemplateId && updateData.switchboardTemplateId !== currentSettings.switchboardTemplateId) {
            changedFields.push('Switchboard Template ID');
          }
          if (updateData.switchboardFieldMappings && JSON.stringify(updateData.switchboardFieldMappings) !== JSON.stringify(currentSettings.switchboardFieldMappings)) {
            changedFields.push('Switchboard Field Mappings');
          }
          
          // Check for custom fields changes
          if (updateData.customFields) {
            changedFields.push('Custom Fields');
          }
          
          // If no specific changes detected, fall back to generic message
          if (changedFields.length === 0) {
            changedFields.push('Event Settings');
          }

          await databases.createDocument(
            dbId,
            logsCollectionId,
            ID.unique(),
            {
              userId: authUser.$id,
              action: 'update',
              details: JSON.stringify({ 
                type: 'event_settings',
                eventName: updatedEventSettings.eventName,
                changes: changedFields
              })
            }
          );
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
