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

    // Get event settings
    const eventSettings = await prisma.eventSettings.findFirst();

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

    // Create a test request body
    const testRequestBody = {
      template_id: eventSettings.switchboardTemplateId || "test-template",
      data: {
        firstName: "Test",
        lastName: "User",
        barcodeNumber: "TEST123",
        eventName: eventSettings.eventName || "Test Event",
        eventDate: "2024-01-01",
        eventLocation: eventSettings.eventLocation || "Test Location"
      }
    };

    // Try to parse the configured request body if it exists
    let configuredRequestBody = testRequestBody;
    if (eventSettings.switchboardRequestBody) {
      try {
        configuredRequestBody = JSON.parse(eventSettings.switchboardRequestBody);
      } catch (parseError) {
        console.log('Could not parse configured request body, using test body');
      }
    }

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

    console.log('=== SWITCHBOARD TEST REQUEST ===');
    console.log('Endpoint:', eventSettings.switchboardApiEndpoint);
    console.log('Auth Header Type:', authHeaderType);
    console.log('Headers:', { ...headers, [authHeaderType === 'Bearer' ? 'Authorization' : authHeaderType]: '[REDACTED]' });
    console.log('Request Body:', JSON.stringify(configuredRequestBody, null, 2));

    try {
      const response = await fetch(eventSettings.switchboardApiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(configuredRequestBody)
      });

      console.log('Response Status:', response.status);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Response Body:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      return res.status(200).json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        response: responseData,
        requestSent: {
          endpoint: eventSettings.switchboardApiEndpoint,
          authHeaderType,
          body: configuredRequestBody
        }
      });

    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to connect to Switchboard Canvas API',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
      });
    }

  } catch (error) {
    console.error('Error testing Switchboard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}