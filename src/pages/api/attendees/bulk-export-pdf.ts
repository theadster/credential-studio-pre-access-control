import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = createClient(req, res);
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { attendeeIds } = req.body;

  if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
    return res.status(400).json({ error: 'Attendee IDs are required' });
  }

  try {
    const eventSettings = await prisma.eventSettings.findFirst();
    
    if (!eventSettings || !eventSettings.oneSimpleApiEnabled || !eventSettings.oneSimpleApiUrl || !eventSettings.oneSimpleApiFormDataKey || !eventSettings.oneSimpleApiFormDataValue) {
      return res.status(400).json({ error: 'OneSimpleAPI is not configured' });
    }

    const attendees = await prisma.attendee.findMany({
      where: {
        id: { in: attendeeIds },
        credentialUrl: { not: null },
      },
      include: {
        customFieldValues: {
          include: {
            customField: true,
          },
        },
      },
    });

    if (attendees.length === 0) {
      return res.status(404).json({ error: 'No attendees with credentials found for the given IDs' });
    }

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
    if (!eventSettings.oneSimpleApiRecordTemplate) {
      return res.status(400).json({ error: 'OneSimpleAPI record template is not configured' });
    }

    // Generate individual record HTML for each attendee using the record template
    const recordsHtml = attendees.map((attendee) => {
      let html = eventSettings.oneSimpleApiRecordTemplate!;
      
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

      // Create placeholders object with properly escaped values for HTML
      const placeholders: { [key: string]: string } = {
        '{{firstName}}': (attendee.firstName || '').replace(/[&<>"']/g, (match) => {
          const escapeMap: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          };
          return escapeMap[match];
        }),
        '{{lastName}}': (attendee.lastName || '').replace(/[&<>"']/g, (match) => {
          const escapeMap: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          };
          return escapeMap[match];
        }),
        '{{barcodeNumber}}': (attendee.barcodeNumber || '').replace(/[&<>"']/g, (match) => {
          const escapeMap: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          };
          return escapeMap[match];
        }),
        '{{photoUrl}}': photoUrl, // URLs don't need HTML escaping in src attributes
        '{{credentialUrl}}': credentialUrl, // URLs don't need HTML escaping in src attributes
        '{{eventName}}': (eventSettings.eventName || '').replace(/[&<>"']/g, (match) => {
          const escapeMap: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          };
          return escapeMap[match];
        }),
        '{{eventDate}}': eventSettings.eventDate ? new Date(eventSettings.eventDate).toLocaleDateString() : '',
        '{{eventTime}}': (eventSettings.eventTime || '').replace(/[&<>"']/g, (match) => {
          const escapeMap: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          };
          return escapeMap[match];
        }),
        '{{eventLocation}}': (eventSettings.eventLocation || '').replace(/[&<>"']/g, (match) => {
          const escapeMap: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          };
          return escapeMap[match];
        }),
      };

      // Add custom field placeholders
      if (attendee.customFieldValues) {
        attendee.customFieldValues.forEach(cfv => {
          if (cfv.customField?.internalFieldName) {
            const fieldValue = cfv.value || '';
            // Escape HTML entities for custom field values
            const escapedValue = fieldValue.replace(/[&<>"']/g, (match) => {
              const escapeMap: { [key: string]: string } = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
              };
              return escapeMap[match];
            });
            placeholders[`{{${cfv.customField.internalFieldName}}}`] = escapedValue;
          }
        });
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
    let finalHtml = eventSettings.oneSimpleApiFormDataValue!;
    
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
    formData.append(eventSettings.oneSimpleApiFormDataKey!, finalHtml);

    const response = await fetch(eventSettings.oneSimpleApiUrl, {
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
    res.status(500).json({ error: 'Failed to generate bulk PDF', details: error.message });
  }
}