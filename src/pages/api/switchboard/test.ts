import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/appwrite';
import { Query } from 'node-appwrite';
import { getEventSettingsWithIntegrations } from '@/lib/appwrite-integrations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use admin client for server-side operations
    const { databases } = createAdminClient();
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

    // Get first event settings
    const eventSettingsList = await databases.listDocuments(dbId, eventSettingsCollectionId, [Query.limit(1)]);
    
    if (eventSettingsList.documents.length === 0) {
      return res.status(400).json({ error: 'Event settings not configured' });
    }

    const eventSettingsId = eventSettingsList.documents[0].$id;
    
    // Get event settings with integrations
    const settings = await getEventSettingsWithIntegrations(databases, eventSettingsId);

    if (!settings) {
      return res.status(400).json({ error: 'Event settings not found' });
    }

    // Check if Switchboard Canvas is enabled and configured
    if (!settings.switchboard?.enabled) {
      return res.status(400).json({ error: 'Switchboard Canvas integration is not enabled' });
    }

    // Get API key from environment variable (not stored in database for security)
    const switchboardApiKey = process.env.SWITCHBOARD_API_KEY;
    
    if (!settings.switchboard.apiEndpoint || !switchboardApiKey) {
      return res.status(400).json({ error: 'Switchboard Canvas is not properly configured. Check SWITCHBOARD_API_KEY environment variable.' });
    }

    // Create a test request body
    const testRequestBody = {
      template_id: settings.switchboard.templateId || "test-template",
      data: {
        firstName: "Test",
        lastName: "User",
        barcodeNumber: "TEST123",
        eventName: settings.eventName || "Test Event",
        eventDate: "2024-01-01",
        eventLocation: settings.eventLocation || "Test Location"
      }
    };

    // Try to parse the configured request body if it exists
    let configuredRequestBody = testRequestBody;
    if (settings.switchboard.requestBody) {
      try {
        configuredRequestBody = JSON.parse(settings.switchboard.requestBody);
      } catch (parseError) {
        console.log('Could not parse configured request body, using test body');
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Set the authentication header based on the configured type
    // API key is read from environment variable for security
    const authHeaderType = settings.switchboard.authHeaderType || 'Bearer';
    if (authHeaderType === 'Bearer') {
      headers['Authorization'] = `Bearer ${switchboardApiKey}`;
    } else {
      headers[authHeaderType] = switchboardApiKey;
    }

    console.log('=== SWITCHBOARD TEST REQUEST ===');
    console.log('Endpoint:', settings.switchboard.apiEndpoint);
    console.log('Auth Header Type:', authHeaderType);
    console.log('Headers:', { ...headers, [authHeaderType === 'Bearer' ? 'Authorization' : authHeaderType]: '[REDACTED]' });
    console.log('Request Body:', JSON.stringify(configuredRequestBody, null, 2));

    try {
      const response = await fetch(settings.switchboard.apiEndpoint, {
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
          endpoint: settings.switchboard.apiEndpoint,
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