import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    const { attendeeIds } = req.body;

    if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      return res.status(400).json({ error: 'Attendee IDs are required' });
    }

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

    // Check permissions
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const hasBulkGeneratePDFsPermission = permissions?.attendees?.bulkGeneratePDFs === true || permissions?.all === true;

    if (!hasBulkGeneratePDFsPermission) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions for bulk PDF generation' });
    }
    
    // Get event settings with integrations
    const eventSettingsDocs = await databases.listDocuments(dbId, eventSettingsCollectionId, [Query.limit(1)]);
    
    if (eventSettingsDocs.documents.length === 0) {
      return res.status(400).json({ error: 'Event settings not configured' });
    }

    const eventSettings = eventSettingsDocs.documents[0];
    const eventSettingsId = eventSettings.$id;
    
    // Get OneSimpleAPI integration
    const oneSimpleApiCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID!;
    const oneSimpleApiDocs = await databases.listDocuments(dbId, oneSimpleApiCollectionId, [
      Query.equal('eventSettingsId', eventSettingsId),
      Query.limit(1)
    ]);
    
    if (oneSimpleApiDocs.documents.length === 0 || !oneSimpleApiDocs.documents[0].enabled) {
      return res.status(400).json({ error: 'OneSimpleAPI integration is not enabled' });
    }
    
    const oneSimpleApi = oneSimpleApiDocs.documents[0];
    
    if (!oneSimpleApi.url || !oneSimpleApi.formDataKey || !oneSimpleApi.formDataValue) {
      return res.status(400).json({ error: 'OneSimpleAPI is not properly configured' });
    }

    // First, get all attendees regardless of credential status to check for missing credentials
    const allAttendees: any[] = [];
    for (const id of attendeeIds) {
      try {
        const attendee = await databases.getDocument(dbId, attendeesCollectionId, id);
        allAttendees.push(attendee);
      } catch (error) {
        console.warn(`Attendee ${id} not found`);
      }
    }

    if (allAttendees.length === 0) {
      return res.status(404).json({ error: 'No attendees found for the given IDs' });
    }

    // Check for attendees without credentials
    const attendeesWithoutCredentials = allAttendees.filter(attendee => !attendee.credentialUrl);

    if (attendeesWithoutCredentials.length > 0) {
      return res.status(400).json({ 
        error: 'Some attendees do not have generated credentials',
        errorType: 'missing_credentials',
        attendeesWithoutCredentials: attendeesWithoutCredentials.map(a => `${a.firstName} ${a.lastName}`)
      });
    }

    // Now filter to only attendees with credentials for further processing
    const attendees = allAttendees.filter(attendee => attendee.credentialUrl);

    // Check for outdated credentials
    const attendeesWithOutdatedCredentials = attendees.filter(attendee => {
      if (!attendee.credentialGeneratedAt) return true; // No generation timestamp means outdated
      
      const credentialGeneratedAt = new Date(attendee.credentialGeneratedAt);
      const recordUpdatedAt = new Date(attendee.updatedAt);
      
      // Since generating a credential also updates the record, we need to account for this
      // We'll consider the credential "current" if it was generated within a reasonable time
      // of the last record update (e.g., within 5 seconds to account for processing time)
      const timeDifference = Math.abs(credentialGeneratedAt.getTime() - recordUpdatedAt.getTime());
      const isCredentialFromSameUpdate = timeDifference <= 5000; // 5 seconds tolerance
      
      if (isCredentialFromSameUpdate) {
        return false; // Current
      } else {
        return credentialGeneratedAt < recordUpdatedAt; // Outdated if credential was generated before record was last updated
      }
    });

    if (attendeesWithOutdatedCredentials.length > 0) {
      return res.status(400).json({ 
        error: 'Some attendees have outdated credentials that need to be regenerated',
        errorType: 'outdated_credentials',
        attendeesWithOutdatedCredentials: attendeesWithOutdatedCredentials.map(a => `${a.firstName} ${a.lastName}`)
      });
    }

    // Check if we have both templates configured
    if (!oneSimpleApi.recordTemplate) {
      return res.status(400).json({ error: 'OneSimpleAPI record template is not configured' });
    }

    // Get custom fields for mapping
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
    const customFieldsDocs = await databases.listDocuments(
      dbId,
      customFieldsCollectionId,
      [Query.limit(100)]
    );
    const customFieldsMap = new Map(customFieldsDocs.documents.map(cf => [cf.$id, cf]));

    // Generate individual record HTML for each attendee using the record template
    const recordsHtml = attendees.map((attendee) => {
      let html = oneSimpleApi.recordTemplate!;
      
      // Ensure credentialUrl is absolute
      let credentialUrl = attendee.credentialUrl || '';
      if (credentialUrl && !credentialUrl.startsWith('http')) {
        // Remove leading slash if present to avoid double slashes
        const cleanPath = credentialUrl.startsWith('/') ? credentialUrl.substring(1) : credentialUrl;
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        credentialUrl = `${baseUrl}/${cleanPath}`;
      }
      
      // Ensure photoUrl is absolute
      let photoUrl = attendee.photoUrl || '';
      if (photoUrl && !photoUrl.startsWith('http')) {
        // Remove leading slash if present to avoid double slashes
        const cleanPath = photoUrl.startsWith('/') ? photoUrl.substring(1) : photoUrl;
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        photoUrl = `${baseUrl}/${cleanPath}`;
      }

      // Helper function to escape HTML
      const escapeHtml = (str: string): string => {
        return str.replace(/[&<>"']/g, (match: string) => {
          const escapeMap: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          };
          return escapeMap[match];
        });
      };

      // Create placeholders object with properly escaped values for HTML
      const placeholders: { [key: string]: string } = {
        '{{firstName}}': escapeHtml(attendee.firstName || ''),
        '{{lastName}}': escapeHtml(attendee.lastName || ''),
        '{{barcodeNumber}}': escapeHtml(attendee.barcodeNumber || ''),
        '{{photoUrl}}': photoUrl, // URLs don't need HTML escaping in src attributes
        '{{credentialUrl}}': credentialUrl, // URLs don't need HTML escaping in src attributes
        '{{eventName}}': escapeHtml(eventSettings.eventName || ''),
        '{{eventDate}}': eventSettings.eventDate ? new Date(eventSettings.eventDate).toLocaleDateString() : '',
        '{{eventTime}}': escapeHtml(eventSettings.eventTime || ''),
        '{{eventLocation}}': escapeHtml(eventSettings.eventLocation || ''),
      };

      // Add custom field placeholders
      const customFieldValues = attendee.customFieldValues ? 
        (typeof attendee.customFieldValues === 'string' ? 
          JSON.parse(attendee.customFieldValues) : attendee.customFieldValues) : {};

      for (const [fieldId, fieldValue] of Object.entries(customFieldValues)) {
        const customField = customFieldsMap.get(fieldId);
        if (customField?.internalFieldName) {
          // Escape HTML entities for custom field values
          const escapedValue = escapeHtml(String(fieldValue || ''));
          placeholders[`{{${customField.internalFieldName}}}`] = escapedValue;
        }
      }

      // Replace all placeholders in the record template
      // Use a more robust replacement that handles both escaped and unescaped placeholders
      for (const [placeholder, value] of Object.entries(placeholders)) {
        // Replace both the normal placeholder and any HTML-escaped versions
        const normalPlaceholder = placeholder;
        const escapedPlaceholder = placeholder.replace(/[{}]/g, (match) => {
          return match === '{' ? '&#123;' : '&#125;';
        });
        
        // Create regex that matches the placeholder with word boundaries
        const normalRegex = new RegExp(normalPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const escapedRegex = new RegExp(escapedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        
        // Replace both versions
        html = html.replace(normalRegex, value);
        html = html.replace(escapedRegex, value);
      }
      
      return html;
    }).join('\n');

    // Generate final HTML by replacing {{credentialRecords}} in main template
    let finalHtml = oneSimpleApi.formDataValue!;
    
    // Replace event-level placeholders in main template
    const eventPlaceholders: { [key: string]: string } = {
      '{{eventName}}': eventSettings.eventName || '',
      '{{eventDate}}': eventSettings.eventDate ? new Date(eventSettings.eventDate).toLocaleDateString() : '',
      '{{eventTime}}': eventSettings.eventTime || '',
      '{{eventLocation}}': eventSettings.eventLocation || '',
      '{{credentialRecords}}': recordsHtml,
    };

    // Replace placeholders in main template using the same robust method
    for (const [placeholder, value] of Object.entries(eventPlaceholders)) {
      // Replace both the normal placeholder and any HTML-escaped versions
      const normalPlaceholder = placeholder;
      const escapedPlaceholder = placeholder.replace(/[{}]/g, (match) => {
        return match === '{' ? '&#123;' : '&#125;';
      });
      
      // Create regex that matches the placeholder
      const normalRegex = new RegExp(normalPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const escapedRegex = new RegExp(escapedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      
      // Replace both versions
      finalHtml = finalHtml.replace(normalRegex, value);
      finalHtml = finalHtml.replace(escapedRegex, value);
    }

    // Validate that we have actual HTML content
    if (!finalHtml || finalHtml.trim().length === 0) {
      return res.status(400).json({ error: 'Generated HTML is empty' });
    }

    // Create form data for the request
    const formData = new FormData();
    formData.append(oneSimpleApi.formDataKey!, finalHtml);

    const response = await fetch(oneSimpleApi.url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Failed to generate PDF: ${errorText}` });
    }

    // Get response text first to handle both JSON and plain text responses
    const responseText = await response.text();
    console.log('OneSimpleAPI raw response:', responseText);

    let pdfUrl: string;

    // Try to parse as JSON first
    try {
      const jsonResponse = JSON.parse(responseText);
      if (jsonResponse.url) {
        pdfUrl = jsonResponse.url;
        console.log('OneSimpleAPI response URL (from JSON):', pdfUrl);
      } else {
        console.error('OneSimpleAPI JSON response missing URL field:', jsonResponse);
        return res.status(500).json({ 
          error: 'OneSimpleAPI JSON response missing URL field',
          response: jsonResponse 
        });
      }
    } catch (jsonError) {
      // If JSON parsing fails, treat the response as a plain URL string
      console.log('Response is not JSON, treating as plain URL string');
      pdfUrl = responseText.trim();
      
      // Basic URL validation
      if (!pdfUrl || (!pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://'))) {
        console.error('OneSimpleAPI response is not a valid URL:', pdfUrl);
        return res.status(500).json({ 
          error: 'OneSimpleAPI response is not a valid URL',
          response: responseText
        });
      }
      
      console.log('OneSimpleAPI response URL (plain text):', pdfUrl);
    }

    // Return the URL to the frontend instead of downloading the PDF
    res.status(200).json({ 
      success: true, 
      url: pdfUrl,
      message: 'PDF generated successfully'
    });

  } catch (error: any) {
    console.error('Error generating bulk PDF:', error);
    
    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.status(500).json({ error: 'Failed to generate bulk PDF', details: error.message });
  }
});