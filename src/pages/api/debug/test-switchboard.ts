import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { getSwitchboardIntegration } from '@/lib/appwrite-integrations';

/**
 * Test endpoint to validate Switchboard integration configuration
 * GET /api/integrations/test-switchboard
 */
export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { databases } = createSessionClient(req);
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

    // Get event settings
    const eventSettingsDocs = await databases.listDocuments(dbId, eventSettingsCollectionId);
    const eventSettings = eventSettingsDocs.documents[0];

    if (!eventSettings) {
      return res.status(400).json({ 
        error: 'Event settings not configured',
        help: 'Please configure your event settings first'
      });
    }

    // Get Switchboard integration
    const switchboardIntegration = await getSwitchboardIntegration(databases, eventSettings.$id);

    if (!switchboardIntegration) {
      return res.status(400).json({ 
        error: 'Switchboard integration not found',
        help: 'Please configure Switchboard integration in Event Settings → Integrations'
      });
    }

    // Check if enabled
    if (!switchboardIntegration.enabled) {
      return res.status(400).json({ 
        error: 'Switchboard integration is disabled',
        help: 'Enable Switchboard integration in Event Settings → Integrations',
        integration: {
          enabled: switchboardIntegration.enabled,
          hasApiEndpoint: !!switchboardIntegration.apiEndpoint,
          hasApiKey: !!switchboardIntegration.apiKey,
          hasTemplateId: !!switchboardIntegration.templateId,
          hasRequestBody: !!switchboardIntegration.requestBody
        }
      });
    }

    // Validate configuration
    const issues: string[] = [];
    
    if (!switchboardIntegration.apiEndpoint) {
      issues.push('API Endpoint is not configured');
    }
    
    if (!switchboardIntegration.apiKey) {
      issues.push('API Key is not configured');
    }
    
    if (!switchboardIntegration.templateId) {
      issues.push('Template ID is not configured');
    }
    
    if (!switchboardIntegration.requestBody) {
      issues.push('Request Body template is not configured');
    }

    // Try to parse request body as JSON
    let requestBodyValid = false;
    let requestBodyError = null;
    let parsedRequestBody = null;

    if (switchboardIntegration.requestBody) {
      try {
        parsedRequestBody = JSON.parse(switchboardIntegration.requestBody);
        requestBodyValid = true;
      } catch (e) {
        requestBodyError = e instanceof Error ? e.message : String(e);
        issues.push(`Request Body is not valid JSON: ${requestBodyError}`);
      }
    }

    // Try to parse field mappings
    let fieldMappingsValid = false;
    let fieldMappingsError = null;
    let parsedFieldMappings = null;

    if (switchboardIntegration.fieldMappings) {
      try {
        parsedFieldMappings = JSON.parse(switchboardIntegration.fieldMappings);
        fieldMappingsValid = true;
        
        if (!Array.isArray(parsedFieldMappings)) {
          issues.push('Field Mappings should be an array');
          fieldMappingsValid = false;
        }
      } catch (e) {
        fieldMappingsError = e instanceof Error ? e.message : String(e);
        issues.push(`Field Mappings is not valid JSON: ${fieldMappingsError}`);
      }
    }

    // Check for placeholders in request body
    const placeholders: string[] = [];
    if (switchboardIntegration.requestBody) {
      const matches = switchboardIntegration.requestBody.match(/\{\{[^}]+\}\}/g);
      if (matches) {
        placeholders.push(...matches);
      }
    }

    return res.status(200).json({
      status: issues.length === 0 ? 'valid' : 'invalid',
      issues: issues.length > 0 ? issues : undefined,
      integration: {
        enabled: switchboardIntegration.enabled,
        apiEndpoint: switchboardIntegration.apiEndpoint,
        hasApiKey: !!switchboardIntegration.apiKey,
        apiKeyLength: switchboardIntegration.apiKey?.length || 0,
        authHeaderType: switchboardIntegration.authHeaderType,
        templateId: switchboardIntegration.templateId,
        requestBody: {
          configured: !!switchboardIntegration.requestBody,
          valid: requestBodyValid,
          error: requestBodyError,
          length: switchboardIntegration.requestBody?.length || 0,
          preview: switchboardIntegration.requestBody?.substring(0, 200) + (switchboardIntegration.requestBody?.length > 200 ? '...' : ''),
          placeholders: placeholders.length > 0 ? placeholders : undefined
        },
        fieldMappings: {
          configured: !!switchboardIntegration.fieldMappings,
          valid: fieldMappingsValid,
          error: fieldMappingsError,
          count: Array.isArray(parsedFieldMappings) ? parsedFieldMappings.length : 0,
          mappings: parsedFieldMappings
        }
      },
      help: issues.length > 0 
        ? 'Fix the issues above in Event Settings → Integrations → Switchboard Canvas'
        : 'Configuration looks good! Try generating a credential.'
    });

  } catch (error: any) {
    console.error('Error testing Switchboard integration:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});
