import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { ID, Models, Query } from 'appwrite';
import { AuthenticatedRequest, withAuth } from '@/lib/apiMiddleware';
import { getSwitchboardIntegration } from '@/lib/appwrite-integrations';
import { shouldLog } from '@/lib/logSettings';
import { createIncrement, dateOperators } from '@/lib/operators';
import { updateCredentialFields } from '@/lib/fieldUpdate';
import { 
  ConcurrencyErrorCode, 
  createConcurrencyErrorResponse, 
  getHttpStatusForError,
  mapLockErrorToCode, 
} from '@/lib/concurrencyErrors';
import { OperationType } from '@/lib/conflictResolver';

// Helper function to escape regex special characters
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { tablesDB } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesTableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID!;
    const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!;
    const customFieldsTableId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID!;
    const eventSettingsTableId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID!;

    // Check permissions
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const hasPermission = permissions?.attendees?.print || permissions?.all;
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions to generate credentials',
        details: 'You need attendee print permissions to generate credentials',
        requiredPermission: 'attendees.print',
        userRole: userProfile.role?.name || 'No role assigned',
        errorType: 'PermissionError',
      });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid attendee ID',
        details: 'Attendee ID must be a valid string',
        errorType: 'ValidationError',
      });
    }

    // Get attendee
    const attendee = await tablesDB.getRow({
      databaseId: dbId,
      tableId: attendeesTableId,
      rowId: id,
    });

    if (!attendee) {
      return res.status(404).json({ 
        error: 'Attendee not found',
        details: `No attendee found with ID: ${id}`,
        errorType: 'NotFoundError',
      });
    }

    // Get event settings
    const eventSettingsDocs = await tablesDB.listRows({ databaseId: dbId, tableId: eventSettingsTableId });
    const eventSettings = eventSettingsDocs.rows[0];

    if (!eventSettings) {
      return res.status(400).json({ 
        error: 'Event settings not configured',
        details: 'Please configure event settings first in the Event Settings tab',
        hint: 'Go to Event Settings to set up your event configuration',
        errorType: 'ConfigurationError',
      });
    }

    // Get Switchboard integration from separate collection
    const switchboardIntegration = await getSwitchboardIntegration(tablesDB, eventSettings.$id);

    if (!switchboardIntegration) {
      return res.status(400).json({ 
        error: 'Switchboard Canvas integration not found',
        details: 'No Switchboard Canvas integration configured for this event',
        hint: 'Go to Event Settings > Integrations to configure Switchboard Canvas',
        errorType: 'ConfigurationError',
      });
    }

    // Check if Switchboard Canvas is enabled and configured
    if (!switchboardIntegration.enabled) {
      return res.status(400).json({ 
        error: 'Switchboard Canvas integration is not enabled',
        details: 'The Switchboard Canvas integration exists but is currently disabled',
        hint: 'Go to Event Settings > Integrations and enable Switchboard Canvas',
        errorType: 'ConfigurationError',
      });
    }

    // Get API key from environment variable (not stored in database for security)
    const switchboardApiKey = process.env.SWITCHBOARD_API_KEY;
    
    if (!switchboardApiKey || !switchboardIntegration.apiEndpoint) {
      const missingItems = [];
      if (!switchboardApiKey) missingItems.push('SWITCHBOARD_API_KEY environment variable');
      if (!switchboardIntegration.apiEndpoint) missingItems.push('API endpoint in integration settings');
      
      return res.status(400).json({ 
        error: 'Switchboard Canvas is not properly configured',
        details: `Missing configuration: ${missingItems.join(', ')}`,
        missingConfiguration: missingItems,
        hint: 'Check environment variables and integration settings',
        errorType: 'ConfigurationError',
      });
    }

    // Get custom fields
    const customFieldsDocs = await tablesDB.listRows({
      databaseId: dbId,
      tableId: customFieldsTableId,
      queries: [Query.limit(100)],
    });
    const customFields = customFieldsDocs.rows;

    // Build the request body with placeholders replaced
    const requestBody = switchboardIntegration.requestBody || '{}';
    
    try {
      // Parse custom field values
      let customFieldValues: Record<string, string> = {};
      
      if (attendee.customFieldValues) {
        const parsed = typeof attendee.customFieldValues === 'string' 
          ? JSON.parse(attendee.customFieldValues) 
          : attendee.customFieldValues;
        
        // Convert array format to object format
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item.customFieldId && item.value !== undefined) {
              customFieldValues[item.customFieldId] = String(item.value);
            }
          });
        } else if (typeof parsed === 'object') {
          // Already in object format
          customFieldValues = parsed;
        }
      }

      console.log('Final customFieldValues:', customFieldValues);
      console.log('Keys:', Object.keys(customFieldValues));
      console.log('====================================');

      // Define basic placeholders
      const placeholders: Record<string, string> = {
        '{{firstName}}': attendee.firstName || '',
        '{{lastName}}': attendee.lastName || '',
        '{{barcodeNumber}}': attendee.barcodeNumber || '',
        '{{photoUrl}}': attendee.photoUrl || '',
        '{{eventName}}': eventSettings.eventName || '',
        '{{eventDate}}': eventSettings.eventDate ? new Date(eventSettings.eventDate).toISOString().split('T')[0] : '',
        '{{eventTime}}': eventSettings.eventTime || '',
        '{{eventLocation}}': eventSettings.eventLocation || '',
        '{{template_id}}': switchboardIntegration.templateId || '',
      };

      // Parse field mappings from JSON string
      let fieldMappings: any[] = [];
      try {
        fieldMappings = switchboardIntegration.fieldMappings 
          ? JSON.parse(switchboardIntegration.fieldMappings) 
          : [];
      } catch (e) {
        console.error('Error parsing field mappings:', e);
        fieldMappings = [];
      }

      const numericPlaceholders: Record<string, number> = {};
      
      // Create a set of field IDs that have mappings
      const mappedFieldIds = new Set(fieldMappings.map((m: any) => m.fieldId));

      // Add placeholders for unmapped custom fields
      for (const [fieldId, fieldValue] of Object.entries(customFieldValues)) {
        const customField = customFields.find((cf: any) => cf.$id === fieldId);
        if (customField && !mappedFieldIds.has(fieldId)) {
          if ((customField as any).internalFieldName) {
            placeholders[`{{${(customField as any).internalFieldName}}}`] = String(fieldValue || '');
          }
        }
      }

      // Process mapped fields
      fieldMappings.forEach((mapping: any) => {
        const customFieldValue = customFieldValues[mapping.fieldId];
        
        if (mapping.jsonVariable) {
          let finalValue: any = '';

          // If we have a custom field value, use it
          if (customFieldValue !== undefined && customFieldValue !== null) {
            finalValue = customFieldValue ?? '';

            // Check if a mapping exists and apply it
            if (mapping.valueMapping && typeof mapping.valueMapping === 'object') {
              const originalValue = customFieldValue || '';
              let lookupKey = String(originalValue);

              // CRITICAL: Boolean fields are stored as 'yes'/'no' (lowercase) in database
              // Normalize case for consistent field mapping lookup
              if (mapping.fieldType === 'boolean') {
                lookupKey = originalValue.toLowerCase();  // Should be 'yes' or 'no'
              }
              
              if (Object.prototype.hasOwnProperty.call(mapping.valueMapping, lookupKey)) {
                finalValue = mapping.valueMapping[lookupKey];
              }
            }
          } else {
            // If no custom field value exists, check if there's a default mapping
            if (mapping.valueMapping && typeof mapping.valueMapping === 'object') {
              // CRITICAL: Boolean fields default to 'no' (NOT 'false')
              // If no value exists, use the mapping for 'no' or fallback to '0'
              if (mapping.fieldType === 'boolean') {
                finalValue = mapping.valueMapping['no'] || '0';
              } else {
                // For other fields, use empty string
                finalValue = '';
              }
            }
          }

          // Determine if finalValue should be a number or string
          const numValue = Number(finalValue);
          if (typeof finalValue === 'number') {
             numericPlaceholders[`{{${mapping.jsonVariable}}}`] = finalValue;
          } else if (typeof finalValue === 'string' && finalValue.trim() !== '' && !isNaN(numValue)) {
             numericPlaceholders[`{{${mapping.jsonVariable}}}`] = numValue;
          } else {
            placeholders[`{{${mapping.jsonVariable}}}`] = String(finalValue ?? '');
          }
        }
      });

      // Perform replacements on the request body string
      let bodyString = requestBody;

      // Replace string placeholders
      Object.entries(placeholders).forEach(([placeholder, value]) => {
        const jsonEscapedValue = JSON.stringify(value).slice(1, -1);
        const escapedPlaceholder = escapeRegex(placeholder);
        bodyString = bodyString.replace(new RegExp(escapedPlaceholder, 'g'), jsonEscapedValue);
      });

      // Replace numeric placeholders (these should not be quoted in JSON)
      Object.entries(numericPlaceholders).forEach(([placeholder, value]) => {
        const escapedPlaceholder = escapeRegex(placeholder);
        // Check if the placeholder is within quotes in the JSON
        const quotedPlaceholderRegex = new RegExp(`"${escapedPlaceholder}"`, 'g');
        const unquotedPlaceholderRegex = new RegExp(escapedPlaceholder, 'g');
        
        // Replace quoted placeholders with unquoted numeric values
        if (bodyString.includes(`"${placeholder}"`)) {
          bodyString = bodyString.replace(quotedPlaceholderRegex, String(value));
        } else {
          // Replace unquoted placeholders
          bodyString = bodyString.replace(unquotedPlaceholderRegex, String(value));
        }
      });

      // Check for any remaining unreplaced placeholders
      const unreplacedPlaceholders = bodyString.match(/\{\{[^}]+\}\}/g);
      if (unreplacedPlaceholders) {
        // Create a set of numeric placeholder keys (without the {{}} wrapper)
        const numericPlaceholderKeys = new Set(
          Object.keys(numericPlaceholders).map(key => key.slice(2, -2)),
        );
        
        // Log warning with detailed information for troubleshooting
        console.warn('⚠️  Unreplaced placeholders detected in Switchboard template');
        console.warn('Unreplaced placeholders:', unreplacedPlaceholders);
        console.warn('Available string placeholders:', Object.keys(placeholders));
        console.warn('Available numeric placeholders:', Object.keys(numericPlaceholders));
        console.warn('This may indicate missing field mappings or custom field values');
        
        // Replace any remaining placeholders with appropriate default values
        unreplacedPlaceholders.forEach(placeholder => {
          const escapedPlaceholder = escapeRegex(placeholder);
          // Strip {{}} to get the placeholder name
          const placeholderName = placeholder.slice(2, -2);
          
          // Check if this placeholder should be numeric based on our numericPlaceholders map
          if (numericPlaceholderKeys.has(placeholderName)) {
            // Replace with 0 for numeric placeholders
            bodyString = bodyString.replace(new RegExp(escapedPlaceholder, 'g'), '0');
          } else {
            // Replace with empty string for string placeholders
            bodyString = bodyString.replace(new RegExp(escapedPlaceholder, 'g'), '');
          }
        });
      }

      // Template processing complete

      let finalRequestBody;
      try {
        finalRequestBody = JSON.parse(bodyString);
      } catch (jsonParseError) {
        // Add debugging information to help identify the issue
        const errorMessage = jsonParseError instanceof Error ? jsonParseError.message : String(jsonParseError);
        
        // Try to identify the problematic part of the JSON
        let debugInfo = '';
        if (errorMessage.includes('position')) {
          const match = errorMessage.match(/position (\d+)/);
          if (match) {
            const position = parseInt(match[1], 10);
            const start = Math.max(0, position - 50);
            const end = Math.min(bodyString.length, position + 50);
            const snippet = bodyString.slice(start, end);
            debugInfo = `\n\nJSON snippet around error (position ${position}):\n"${snippet}"`;
          }
        }
        
        return res.status(400).json({ 
          error: 'Invalid request body template in Switchboard Canvas settings',
          details: `JSON parse error: ${errorMessage}${debugInfo}`,
          processedTemplate: bodyString,
          originalTemplate: requestBody,
          placeholders: Object.keys(placeholders),
          numericPlaceholders: Object.keys(numericPlaceholders),
        });
      }

      // Make the API call to Switchboard Canvas
      let switchboardResponse;
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Set the authentication header based on the configured type
        // API key is read from environment variable for security
        const authHeaderType = switchboardIntegration.authHeaderType || 'Bearer';
        if (authHeaderType === 'Bearer') {
          headers['Authorization'] = `Bearer ${switchboardApiKey}`;
        } else {
          headers[authHeaderType] = switchboardApiKey;
        }

        switchboardResponse = await fetch(switchboardIntegration.apiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(finalRequestBody),
        });

      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        return res.status(500).json({ 
          error: 'Failed to connect to Switchboard Canvas API',
          details: `Network error: ${errorMessage}`,
          endpoint: switchboardIntegration.apiEndpoint,
          errorType: 'NetworkError',
        });
      }

      if (!switchboardResponse.ok) {
        const errorText = await switchboardResponse.text();
        let responseBody = errorText;
        
        // Try to parse as JSON for better error details
        try {
          const parsedError = JSON.parse(errorText);
          responseBody = JSON.stringify(parsedError, null, 2);
        } catch {
          // Keep as plain text if not JSON
        }
        
        return res.status(500).json({ 
          error: 'Failed to generate credential with Switchboard Canvas',
          details: `API returned ${switchboardResponse.status} ${switchboardResponse.statusText}`,
          statusCode: switchboardResponse.status,
          statusText: switchboardResponse.statusText,
          responseBody: responseBody,
          endpoint: switchboardIntegration.apiEndpoint,
          errorType: 'APIError',
        });
      }

      let switchboardResult;
      try {
        switchboardResult = await switchboardResponse.json();
      } catch (parseError) {
        const responseText = await switchboardResponse.text();
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        
        return res.status(500).json({ 
          error: 'Invalid response format from Switchboard Canvas',
          details: `Failed to parse JSON response: ${errorMessage}`,
          responseBody: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
          endpoint: switchboardIntegration.apiEndpoint,
          errorType: 'ResponseFormatError',
        });
      }
      
      // Extract the credential URL from the response
      let credentialUrl = switchboardResult.url || 
                         switchboardResult.imageUrl || 
                         switchboardResult.downloadUrl ||
                         switchboardResult.credentialUrl ||
                         switchboardResult.result?.url ||
                         switchboardResult.data?.url ||
                         switchboardResult.response?.url;
      
      // Check for URL in sizes array (Switchboard Canvas specific structure)
      if (!credentialUrl && switchboardResult.sizes && Array.isArray(switchboardResult.sizes)) {
        for (const sizeItem of switchboardResult.sizes) {
          if (sizeItem.url && typeof sizeItem.url === 'string') {
            credentialUrl = sizeItem.url;
            break;
          }
        }
      }
      
      if (!credentialUrl) {
        return res.status(500).json({ 
          error: 'No credential URL returned from Switchboard Canvas',
          details: 'The API response did not contain a credential URL in any expected field',
          responseFields: Object.keys(switchboardResult),
          expectedFields: ['url', 'imageUrl', 'downloadUrl', 'credentialUrl', 'result.url', 'data.url', 'response.url', 'sizes[].url'],
          response: switchboardResult,
          errorType: 'ResponseProcessingError',
        });
      }

      // Update the attendee record with the credential URL and timestamp
      // Use field-specific update to prevent overwriting photo/profile fields during concurrent operations
      let updatedAttendee: any;
      try {
        // First try with atomic operators
        updatedAttendee = await tablesDB.updateRow({
          databaseId: dbId,
          tableId: attendeesTableId,
          rowId: id,
          data: {
            credentialUrl,
            credentialGeneratedAt: dateOperators.setNow(),
            credentialCount: createIncrement(1),
            lastCredentialGenerated: dateOperators.setNow(),
          },
        });
      } catch (operatorError) {
        // Only fall back for operator-specific errors
        // Check if error is operator-related (e.g., unsupported operator)
        const isOperatorError = operatorError instanceof Error &&
          (operatorError.message.includes('operator') ||
           operatorError.message.includes('Increment'));
        
        if (isOperatorError) {
          console.error('Operator not supported, falling back to field-specific update with optimistic locking:', operatorError);
          
          // Use FieldUpdateService for safe concurrent updates
          // This ensures we only update credential fields and don't overwrite photo/profile changes
          const result = await updateCredentialFields(
            tablesDB,
            dbId,
            attendeesTableId,
            id,
            { credentialUrl },
          );
          
          if (!result.success) {
            // If optimistic locking failed after retries, return error with user-friendly message
            console.error('Field update failed after retries:', result.error);
            const errorCode = result.error?.type 
              ? mapLockErrorToCode(result.error.type) 
              : ConcurrencyErrorCode.MAX_RETRIES_EXCEEDED;
            const errorResponse = createConcurrencyErrorResponse({
              code: errorCode,
              documentId: id,
              operationType: OperationType.CREDENTIAL_GENERATION,
              retriesAttempted: result.retriesUsed,
              conflictingFields: ['credentialUrl', 'credentialGeneratedAt'],
            });
            return res.status(getHttpStatusForError(errorCode)).json(errorResponse);
          }
          
          updatedAttendee = result.data;
        } else {
          // Re-throw non-operator errors
          throw operatorError;
        }
      }

      // Log the activity if enabled
      if (await shouldLog('credentialGenerate')) {
        try {
          await tablesDB.createRow({
            databaseId: dbId,
            tableId: logsTableId,
            rowId: ID.unique(),
            data: {
              action: 'generate_credential',
              userId: user.$id,
              attendeeId: attendee.$id,
              details: JSON.stringify({
                attendeeId: attendee.$id,
                firstName: attendee.firstName,
                lastName: attendee.lastName,
                barcodeNumber: attendee.barcodeNumber,
                credentialUrl,
              }),
            },
          });
        } catch (logError) {
          console.error('Failed to write credential audit log:', logError);
        }
      }

      return res.status(200).json({
        success: true,
        credentialUrl,
        generatedAt: updatedAttendee.credentialGeneratedAt,
        updatedAt: updatedAttendee.$updatedAt, // Include Appwrite's actual update timestamp
        attendee: updatedAttendee,
      });

    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      
      return res.status(400).json({ 
        error: 'Invalid request body template in Switchboard Canvas settings',
        details: `Template processing error: ${errorMessage}`,
        errorType: 'TemplateProcessingError',
      });
    }

  } catch (error: any) {
    console.error('Error generating credential:', error);
    
    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Authentication failed or session expired',
        errorType: 'AuthenticationError',
      });
    } else if (error.code === 404) {
      return res.status(404).json({ 
        error: 'Resource not found',
        details: 'The requested resource could not be found',
        errorType: 'NotFoundError',
      });
    }
    
    // Generic error with additional context in development
    const errorResponse: any = { 
      error: 'Internal server error',
      errorType: 'InternalError',
    };
    
    // Add error details in development mode
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error.message;
      if (error.stack) {
        errorResponse.stackTrace = error.stack.split('\n').slice(0, 3);
      }
    }
    
    // Add Appwrite error code if available
    if (error.code) {
      errorResponse.appwriteErrorCode = error.code;
    }
    
    return res.status(500).json(errorResponse);
  }
});
