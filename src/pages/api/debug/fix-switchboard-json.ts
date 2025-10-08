import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { getSwitchboardIntegration } from '@/lib/appwrite-integrations';

/**
 * Helper endpoint to view and fix Switchboard request body JSON
 * GET /api/integrations/fix-switchboard-json - View current template with line numbers
 * POST /api/integrations/fix-switchboard-json - Update with fixed template
 */
export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    const { databases } = createSessionClient(req);
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;
    const switchboardCollectionId = process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID!;

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

    if (req.method === 'GET') {
      // Return the current template with line numbers for debugging
      const requestBody = switchboardIntegration.requestBody || '';
      const lines = requestBody.split('\n');
      const numberedLines = lines.map((line, index) => ({
        lineNumber: index + 1,
        content: line,
        length: line.length
      }));

      // Try to parse and identify the error
      let parseError = null;
      let errorPosition = null;
      try {
        JSON.parse(requestBody);
      } catch (e: any) {
        parseError = e.message;
        // Extract position from error message
        const match = e.message.match(/position (\d+)/);
        if (match) {
          errorPosition = parseInt(match[1]);
        }
      }

      // Find the line and column of the error
      let errorLine = null;
      let errorColumn = null;
      if (errorPosition !== null) {
        let currentPos = 0;
        for (let i = 0; i < lines.length; i++) {
          const lineLength = lines[i].length + 1; // +1 for newline
          if (currentPos + lineLength > errorPosition) {
            errorLine = i + 1;
            errorColumn = errorPosition - currentPos + 1;
            break;
          }
          currentPos += lineLength;
        }
      }

      return res.status(200).json({
        integrationId: switchboardIntegration.$id,
        requestBody,
        lines: numberedLines,
        totalLines: lines.length,
        totalCharacters: requestBody.length,
        parseError,
        errorPosition,
        errorLine,
        errorColumn,
        errorContext: errorLine ? {
          line: errorLine,
          column: errorColumn,
          content: lines[errorLine - 1],
          before: errorLine > 1 ? lines[errorLine - 2] : null,
          after: errorLine < lines.length ? lines[errorLine] : null
        } : null,
        suggestions: [
          'Check for trailing commas (not allowed in JSON)',
          'Ensure all property names are in double quotes',
          'Verify all brackets and braces are properly closed',
          'Check for unescaped quotes in string values',
          'Ensure no comments (JSON doesn\'t support comments)'
        ]
      });
    } else if (req.method === 'POST') {
      // Update with fixed template
      const { requestBody } = req.body;

      if (!requestBody) {
        return res.status(400).json({ error: 'requestBody is required' });
      }

      // Validate it's valid JSON
      try {
        JSON.parse(requestBody);
      } catch (e: any) {
        return res.status(400).json({ 
          error: 'Invalid JSON',
          details: e.message 
        });
      }

      // Update the integration
      await databases.updateDocument(
        dbId,
        switchboardCollectionId,
        switchboardIntegration.$id,
        {
          requestBody,
          version: (switchboardIntegration.version || 0) + 1
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Request body updated successfully'
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in fix-switchboard-json:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});
