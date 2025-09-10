import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get current user's role for permission checking
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true }
    });

    if (!currentUser?.role) {
      return res.status(403).json({ error: 'No role assigned' });
    }

    // Check permissions
    const userRole = currentUser.role;
    const permissions = userRole.permissions as any;
    const hasPermission = permissions?.attendees?.print || permissions?.all;
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid attendee ID' });
    }

    // Get attendee with custom field values
    const attendee = await prisma.attendee.findUnique({
      where: { id },
      include: {
        customFieldValues: {
          include: {
            customField: true
          }
        }
      }
    });

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    // Get event settings
    const eventSettings = await prisma.eventSettings.findFirst({
      include: {
        customFields: true
      }
    });

    if (!eventSettings) {
      return res.status(400).json({ error: 'Event settings not configured' });
    }

    // Check if Switchboard Canvas is enabled and configured
    if (!eventSettings.switchboardEnabled) {
      return res.status(400).json({ error: 'Switchboard Canvas integration is not enabled' });
    }

    if (!eventSettings.switchboardApiEndpoint || !eventSettings.switchboardApiKey) {
      return res.status(400).json({ error: 'Switchboard Canvas is not properly configured' });
    }

    // Build the request body with placeholders replaced
    let requestBody = eventSettings.switchboardRequestBody || '{}';
    
    try {
      // Fix common JSON syntax issues
      let cleanedRequestBody = requestBody;
      cleanedRequestBody = cleanedRequestBody.replace(/\t/g, '  ');
      cleanedRequestBody = cleanedRequestBody.replace(/([}\]])\s*("[^"]+":)/g, '$1,\n$2');

      // Define basic placeholders
      const placeholders: Record<string, string> = {
        '{{firstName}}': attendee.firstName || '',
        '{{lastName}}': attendee.lastName || '',
        '{{barcodeNumber}}': attendee.barcodeNumber || '',
        '{{photoUrl}}': attendee.photoUrl || '',
        '{{eventName}}': eventSettings.eventName || '',
        '{{eventDate}}': eventSettings.eventDate ? eventSettings.eventDate.toISOString().split('T')[0] : '',
        '{{eventTime}}': eventSettings.eventTime || '',
        '{{eventLocation}}': eventSettings.eventLocation || '',
        '{{template_id}}': eventSettings.switchboardTemplateId || ''
      };

      const fieldMappings = eventSettings.switchboardFieldMappings as any[] || [];
      const numericPlaceholders: Record<string, number> = {};
      
      // Create a set of field IDs that have mappings
      const mappedFieldIds = new Set(fieldMappings.map(m => m.fieldId));

      // Add placeholders for unmapped custom fields
      attendee.customFieldValues.forEach(cfv => {
        if (cfv.customField && !mappedFieldIds.has(cfv.customField.id)) {
          if (cfv.customField.internalFieldName) {
            placeholders[`{{${cfv.customField.internalFieldName}}}`] = cfv.value || '';
          }
        }
      });

      // Process mapped fields
      fieldMappings.forEach((mapping) => {
        const customFieldValue = attendee.customFieldValues.find(cfv => cfv.customField?.id === mapping.fieldId);
        
        if (mapping.jsonVariable) {
          let finalValue: any = '';

          // If we have a custom field value, use it
          if (customFieldValue) {
            finalValue = customFieldValue.value ?? '';

            // Check if a mapping exists and apply it
            if (mapping.valueMapping && typeof mapping.valueMapping === 'object') {
              const originalValue = customFieldValue.value || '';
              let lookupKey = originalValue;

              // For boolean fields, normalize the case for consistent lookup
              if (mapping.fieldType === 'boolean') {
                lookupKey = originalValue.toLowerCase();
              }
              
              if (Object.prototype.hasOwnProperty.call(mapping.valueMapping, lookupKey)) {
                finalValue = mapping.valueMapping[lookupKey];
              }
            }
          } else {
            // If no custom field value exists, check if there's a default mapping
            if (mapping.valueMapping && typeof mapping.valueMapping === 'object') {
              // For boolean fields, default to 'no' if no value exists
              if (mapping.fieldType === 'boolean') {
                finalValue = mapping.valueMapping['no'] || '0';
              } else {
                // For other fields, use empty string or first available mapping
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

      // Perform replacements on the cleaned request body string
      let bodyString = cleanedRequestBody;

      // Replace string placeholders
      Object.entries(placeholders).forEach(([placeholder, value]) => {
        const jsonEscapedValue = JSON.stringify(value).slice(1, -1);
        bodyString = bodyString.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), jsonEscapedValue);
      });

      // Replace numeric placeholders (these should not be quoted in JSON)
      Object.entries(numericPlaceholders).forEach(([placeholder, value]) => {
        // Check if the placeholder is within quotes in the JSON
        const quotedPlaceholderRegex = new RegExp(`"${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
        const unquotedPlaceholderRegex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        
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
        console.log('Unreplaced placeholders found:', unreplacedPlaceholders);
        console.log('Available placeholders:', Object.keys(placeholders));
        console.log('Available numeric placeholders:', Object.keys(numericPlaceholders));
        console.log('Field mappings:', fieldMappings);
        
        // Replace any remaining placeholders with empty string or default values
        unreplacedPlaceholders.forEach(placeholder => {
          // For numeric contexts, replace with 0
          if (bodyString.includes(`"opacity": ${placeholder}`) || 
              bodyString.includes(`"value": ${placeholder}`) ||
              bodyString.includes(`"number": ${placeholder}`)) {
            bodyString = bodyString.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '0');
          } else {
            // For string contexts, replace with empty string
            bodyString = bodyString.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '""');
          }
        });
      }

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
            const position = parseInt(match[1]);
            const start = Math.max(0, position - 50);
            const end = Math.min(bodyString.length, position + 50);
            const snippet = bodyString.slice(start, end);
            debugInfo = `\n\nJSON snippet around error (position ${position}):\n"${snippet}"`;
          }
        }
        
        return res.status(400).json({ 
          error: 'Invalid request body template in Switchboard Canvas settings',
          details: `JSON parse error: ${errorMessage}${debugInfo}`,
          processedTemplate: bodyString.length > 1000 ? bodyString.slice(0, 1000) + '...' : bodyString
        });
      }

      // Make the API call to Switchboard Canvas
      let switchboardResponse;
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Set the authentication header based on the configured type
        const authHeaderType = eventSettings.switchboardAuthHeaderType || 'Bearer';
        if (authHeaderType === 'Bearer') {
          headers['Authorization'] = `Bearer ${eventSettings.switchboardApiKey}`;
        } else {
          headers[authHeaderType] = eventSettings.switchboardApiKey || '';
        }

        switchboardResponse = await fetch(eventSettings.switchboardApiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(finalRequestBody)
        });

      } catch (fetchError) {
        return res.status(500).json({ error: 'Failed to connect to Switchboard Canvas API' });
      }

      if (!switchboardResponse.ok) {
        const errorText = await switchboardResponse.text();
        return res.status(500).json({ 
          error: 'Failed to generate credential with Switchboard Canvas',
          details: `API returned ${switchboardResponse.status}: ${errorText}`
        });
      }

      let switchboardResult;
      try {
        switchboardResult = await switchboardResponse.json();
      } catch (parseError) {
        return res.status(500).json({ error: 'Invalid response format from Switchboard Canvas' });
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
          responseFields: Object.keys(switchboardResult),
          response: switchboardResult
        });
      }

      // Update the attendee record with the credential URL and timestamp
      const now = new Date();
      const updatedAttendee = await prisma.attendee.update({
        where: { id },
        data: {
          credentialUrl,
          credentialGeneratedAt: now
        }
      });

      // Log the activity
      await prisma.log.create({
        data: {
          action: 'generate_credential',
          userId: user.id,
          attendeeId: attendee.id,
          details: {
            attendeeId: attendee.id,
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            barcodeNumber: attendee.barcodeNumber,
            credentialUrl
          }
        }
      });

      return res.status(200).json({
        success: true,
        credentialUrl,
        generatedAt: now.toISOString(),
        attendee: updatedAttendee
      });

    } catch (parseError) {
      return res.status(400).json({ 
        error: 'Invalid request body template in Switchboard Canvas settings',
        details: parseError instanceof Error ? parseError.message : String(parseError)
      });
    }

  } catch (error) {
    console.error('Error generating credential:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}