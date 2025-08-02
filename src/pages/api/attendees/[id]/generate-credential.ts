import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';
import { checkApiPermission } from '@/lib/permissions';

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

    // Check permissions manually since checkApiPermission expects different parameters
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
      // Parse the request body to ensure it's valid JSON
      const bodyTemplate = JSON.parse(requestBody);
      
      // Replace standard placeholders
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

      // Add custom field placeholders
      attendee.customFieldValues.forEach(cfv => {
        if (cfv.customField?.internalFieldName) {
          placeholders[`{{${cfv.customField.internalFieldName}}}`] = cfv.value || '';
        }
      });

      // Add field mappings placeholders
      const fieldMappings = eventSettings.switchboardFieldMappings as any[] || [];
      fieldMappings.forEach(mapping => {
        // Find the custom field value for this mapping
        const customFieldValue = attendee.customFieldValues.find(cfv => 
          cfv.customField?.id === mapping.fieldId
        );
        
        if (customFieldValue && mapping.jsonVariable) {
          let mappedValue = customFieldValue.value || '';
          
          // Apply value mapping if it exists
          if (mapping.valueMapping && typeof mapping.valueMapping === 'object') {
            const originalValue = customFieldValue.value || '';
            
            // For boolean fields, convert string values to boolean for mapping
            if (mapping.fieldType === 'boolean') {
              const boolValue = originalValue.toLowerCase() === 'true' || originalValue === '1';
              mappedValue = mapping.valueMapping[boolValue.toString()] || mappedValue;
            } else {
              // For select and other fields, use direct mapping
              mappedValue = mapping.valueMapping[originalValue] || mappedValue;
            }
          }
          
          placeholders[`{{${mapping.jsonVariable}}}`] = mappedValue;
        }
      });

      // Convert body template to string and replace placeholders
      let bodyString = JSON.stringify(bodyTemplate);
      Object.entries(placeholders).forEach(([placeholder, value]) => {
        bodyString = bodyString.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      });

      const finalRequestBody = JSON.parse(bodyString);

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

        console.log('Making Switchboard API request to:', eventSettings.switchboardApiEndpoint);
        console.log('Request headers:', { ...headers, [authHeaderType === 'Bearer' ? 'Authorization' : authHeaderType]: '[REDACTED]' });
        console.log('Request body:', JSON.stringify(finalRequestBody, null, 2));

        switchboardResponse = await fetch(eventSettings.switchboardApiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(finalRequestBody)
        });

        console.log('Switchboard API response status:', switchboardResponse.status);
        console.log('Switchboard API response headers:', Object.fromEntries(switchboardResponse.headers.entries()));

      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        return res.status(500).json({ error: 'Failed to connect to Switchboard Canvas API' });
      }

      if (!switchboardResponse.ok) {
        const errorText = await switchboardResponse.text();
        console.error('Switchboard API error response:', {
          status: switchboardResponse.status,
          statusText: switchboardResponse.statusText,
          body: errorText
        });
        return res.status(500).json({ 
          error: 'Failed to generate credential with Switchboard Canvas',
          details: `API returned ${switchboardResponse.status}: ${errorText}`
        });
      }

      let switchboardResult;
      try {
        switchboardResult = await switchboardResponse.json();
        console.log('Switchboard API response data:', switchboardResult);
      } catch (parseError) {
        console.error('Failed to parse Switchboard response as JSON:', parseError);
        return res.status(500).json({ error: 'Invalid response format from Switchboard Canvas' });
      }
      
      // Extract the credential URL from the response - try multiple possible field names
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
        console.error('No credential URL found in Switchboard response. Available fields:', Object.keys(switchboardResult));
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
      console.error('Error parsing request body template:', parseError);
      return res.status(400).json({ error: 'Invalid request body template in Switchboard Canvas settings' });
    }

  } catch (error) {
    console.error('Error generating credential:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}