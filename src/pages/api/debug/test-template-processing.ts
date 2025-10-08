import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { getSwitchboardIntegration } from '@/lib/appwrite-integrations';

// Helper function to escape regex special characters
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Test endpoint to see how template processing works
 * GET /api/integrations/test-template-processing?attendeeId=xxx
 */
export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { databases } = createSessionClient(req);
    const { attendeeId } = req.query;

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
    const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

    // Get attendee (or use dummy data if not provided)
    let attendee: any;
    if (attendeeId && typeof attendeeId === 'string') {
      attendee = await databases.getDocument(dbId, attendeesCollectionId, attendeeId);
    } else {
      // Use dummy data for testing
      attendee = {
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345678',
        photoUrl: 'https://example.com/photo.jpg',
        customFieldValues: '{}'
      };
    }

    // Get event settings
    const eventSettingsDocs = await databases.listDocuments(dbId, eventSettingsCollectionId);
    const eventSettings = eventSettingsDocs.documents[0];

    if (!eventSettings) {
      return res.status(400).json({ error: 'Event settings not configured' });
    }

    // Get Switchboard integration
    const switchboardIntegration = await getSwitchboardIntegration(databases, eventSettings.$id);

    if (!switchboardIntegration) {
      return res.status(400).json({ error: 'Switchboard integration not found' });
    }

    // Get custom fields
    const customFieldsDocs = await databases.listDocuments(
      dbId,
      customFieldsCollectionId,
      [Query.limit(100)]
    );
    const customFields = customFieldsDocs.documents;

    // Process the template
    const requestBody = switchboardIntegration.requestBody || '{}';
    
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

    console.log('Custom field values from attendee:', customFieldValues);

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
      '{{template_id}}': switchboardIntegration.templateId || ''
    };

    // Parse field mappings
    let fieldMappings: any[] = [];
    try {
      fieldMappings = switchboardIntegration.fieldMappings 
        ? JSON.parse(switchboardIntegration.fieldMappings) 
        : [];
    } catch (e) {
      fieldMappings = [];
    }

    console.log('Field mappings:', fieldMappings);
    console.log('Custom fields available:', customFields.map((cf: any) => ({ id: cf.$id, name: cf.fieldName, internalName: cf.internalFieldName })));

    const numericPlaceholders: Record<string, number> = {};
    const mappedFieldIds = new Set(fieldMappings.map((m: any) => m.fieldId));
    
    // Add placeholders for unmapped custom fields with internal names
    for (const [fieldId, fieldValue] of Object.entries(customFieldValues)) {
      const customField = customFields.find((cf: any) => cf.$id === fieldId);
      if (customField && !mappedFieldIds.has(fieldId)) {
        if ((customField as any).internalFieldName) {
          console.log(`Adding unmapped field: {{${(customField as any).internalFieldName}}} = ${fieldValue}`);
          placeholders[`{{${(customField as any).internalFieldName}}}`] = String(fieldValue || '');
        }
      }
    }
    
    // Process field mappings with full logic
    fieldMappings.forEach((mapping: any) => {
      const customFieldValue = customFieldValues[mapping.fieldId];
      console.log(`Processing mapping: ${mapping.jsonVariable} from field ${mapping.fieldId}, value:`, customFieldValue);
      
      if (mapping.jsonVariable) {
        let finalValue: any = '';

        // If we have a custom field value, use it
        if (customFieldValue !== undefined && customFieldValue !== null) {
          finalValue = customFieldValue ?? '';

          // Check if a mapping exists and apply it
          if (mapping.valueMapping && typeof mapping.valueMapping === 'object') {
            const originalValue = customFieldValue || '';
            let lookupKey = String(originalValue);

            // For boolean fields, normalize the case for consistent lookup
            if (mapping.fieldType === 'boolean') {
              lookupKey = originalValue.toLowerCase();
            }
            
            console.log(`  Looking up value mapping for key: "${lookupKey}"`);
            console.log(`  Available mapping keys:`, Object.keys(mapping.valueMapping));
            
            if (Object.prototype.hasOwnProperty.call(mapping.valueMapping, lookupKey)) {
              finalValue = mapping.valueMapping[lookupKey];
              console.log(`  ✓ Value mapped: "${originalValue}" -> "${finalValue}"`);
            } else {
              console.log(`  ✗ No mapping found for key: "${lookupKey}"`);
            }
          }
        } else {
          // If no custom field value exists, check if there's a default mapping
          if (mapping.valueMapping && typeof mapping.valueMapping === 'object') {
            // For boolean fields, default to 'no' if no value exists
            if (mapping.fieldType === 'boolean') {
              finalValue = mapping.valueMapping['no'] || '0';
            }
          }
        }

        // Determine if finalValue should be a number or string
        const numValue = Number(finalValue);
        if (typeof finalValue === 'number') {
          console.log(`  Adding numeric placeholder: {{${mapping.jsonVariable}}} = ${finalValue}`);
          numericPlaceholders[`{{${mapping.jsonVariable}}}`] = finalValue;
        } else if (typeof finalValue === 'string' && finalValue.trim() !== '' && !isNaN(numValue)) {
          console.log(`  Adding numeric placeholder: {{${mapping.jsonVariable}}} = ${numValue}`);
          numericPlaceholders[`{{${mapping.jsonVariable}}}`] = numValue;
        } else {
          console.log(`  Adding string placeholder: {{${mapping.jsonVariable}}} = ${finalValue}`);
          placeholders[`{{${mapping.jsonVariable}}}`] = String(finalValue ?? '');
        }
      }
    });

    // Perform replacements
    let bodyString = requestBody;

    // Replace string placeholders
    Object.entries(placeholders).forEach(([placeholder, value]) => {
      const jsonEscapedValue = JSON.stringify(value).slice(1, -1);
      const escapedPlaceholder = escapeRegex(placeholder);
      bodyString = bodyString.replace(new RegExp(escapedPlaceholder, 'g'), jsonEscapedValue);
    });

    // Replace numeric placeholders
    Object.entries(numericPlaceholders).forEach(([placeholder, value]) => {
      const escapedPlaceholder = escapeRegex(placeholder);
      const quotedPlaceholderRegex = new RegExp(`"${escapedPlaceholder}"`, 'g');
      const unquotedPlaceholderRegex = new RegExp(escapedPlaceholder, 'g');
      
      if (bodyString.includes(`"${placeholder}"`)) {
        bodyString = bodyString.replace(quotedPlaceholderRegex, String(value));
      } else {
        bodyString = bodyString.replace(unquotedPlaceholderRegex, String(value));
      }
    });

    // Check for unreplaced placeholders
    const unreplacedPlaceholders = bodyString.match(/\{\{[^}]+\}\}/g);

    // Try to parse
    let parseError = null;
    let parsedJson = null;
    try {
      parsedJson = JSON.parse(bodyString);
    } catch (e: any) {
      parseError = e.message;
    }

    return res.status(200).json({
      status: parseError ? 'invalid' : 'valid',
      originalTemplate: requestBody,
      processedTemplate: bodyString,
      placeholders: {
        string: placeholders,
        numeric: numericPlaceholders
      },
      unreplacedPlaceholders: unreplacedPlaceholders || [],
      parseError,
      parsedJson: parseError ? null : parsedJson,
      attendeeData: {
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        barcodeNumber: attendee.barcodeNumber,
        photoUrl: attendee.photoUrl
      },
      debugInfo: {
        customFieldValues: customFieldValues,
        fieldMappings: fieldMappings,
        customFieldsAvailable: customFields.map((cf: any) => ({
          id: cf.$id,
          name: cf.fieldName,
          internalName: cf.internalFieldName
        }))
      }
    });

  } catch (error: any) {
    console.error('Error testing template processing:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});
