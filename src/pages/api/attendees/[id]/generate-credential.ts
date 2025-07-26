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

    // Check permissions
    const hasPermission = await checkApiPermission(req, res, 'attendees', 'print');
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
        '{{eventDate}}': eventSettings.eventDate || '',
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

      // Convert body template to string and replace placeholders
      let bodyString = JSON.stringify(bodyTemplate);
      Object.entries(placeholders).forEach(([placeholder, value]) => {
        bodyString = bodyString.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      });

      const finalRequestBody = JSON.parse(bodyString);

      // Make the API call to Switchboard Canvas
      const authHeaderType = eventSettings.switchboardAuthHeaderType || 'Bearer';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        [authHeaderType]: eventSettings.switchboardApiKey
      };

      const switchboardResponse = await fetch(eventSettings.switchboardApiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(finalRequestBody)
      });

      if (!switchboardResponse.ok) {
        const errorText = await switchboardResponse.text();
        console.error('Switchboard API error:', errorText);
        return res.status(500).json({ error: 'Failed to generate credential with Switchboard Canvas' });
      }

      const switchboardResult = await switchboardResponse.json();
      
      // Extract the credential URL from the response
      // This may need to be adjusted based on Switchboard Canvas API response format
      const credentialUrl = switchboardResult.url || switchboardResult.imageUrl || switchboardResult.downloadUrl;
      
      if (!credentialUrl) {
        console.error('No credential URL in Switchboard response:', switchboardResult);
        return res.status(500).json({ error: 'No credential URL returned from Switchboard Canvas' });
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