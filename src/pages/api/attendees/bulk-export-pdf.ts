import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== BULK EXPORT PDF API CALLED ===');
  console.log('Method:', req.method);
  console.log('Request body:', req.body);
  
  if (req.method !== 'POST') {
    console.log('ERROR: Method not allowed');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('Creating Supabase client...');
  const supabase = createClient(req, res);
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log('ERROR: Authentication failed', { userError, user: user?.id });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('User authenticated:', user.id);

  const { attendeeIds } = req.body;
  console.log('Received attendeeIds:', attendeeIds);

  if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
    console.log('ERROR: Invalid attendeeIds');
    return res.status(400).json({ error: 'Attendee IDs are required' });
  }

  try {
    console.log('Fetching event settings...');
    const eventSettings = await prisma.eventSettings.findFirst();
    console.log('Event settings found:', {
      oneSimpleApiEnabled: eventSettings?.oneSimpleApiEnabled,
      oneSimpleApiUrl: eventSettings?.oneSimpleApiUrl ? 'SET' : 'NOT SET',
      oneSimpleApiFormDataKey: eventSettings?.oneSimpleApiFormDataKey ? 'SET' : 'NOT SET',
      oneSimpleApiFormDataValue: eventSettings?.oneSimpleApiFormDataValue ? 'SET' : 'NOT SET',
      oneSimpleApiRecordTemplate: eventSettings?.oneSimpleApiRecordTemplate ? 'SET' : 'NOT SET'
    });
    
    if (!eventSettings || !eventSettings.oneSimpleApiEnabled || !eventSettings.oneSimpleApiUrl || !eventSettings.oneSimpleApiFormDataKey || !eventSettings.oneSimpleApiFormDataValue) {
      console.log('ERROR: OneSimpleAPI configuration incomplete');
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

    console.log('=== ONESIMPLEAPI DEBUG: Starting HTML generation ===');
    console.log('Main template (oneSimpleApiFormDataValue):', eventSettings.oneSimpleApiFormDataValue);
    console.log('Record template (oneSimpleApiRecordTemplate):', eventSettings.oneSimpleApiRecordTemplate);
    console.log('Number of attendees to process:', attendees.length);
    console.log('Form data key:', eventSettings.oneSimpleApiFormDataKey);
    console.log('API URL:', eventSettings.oneSimpleApiUrl);

    // Check if we have both templates configured
    if (!eventSettings.oneSimpleApiRecordTemplate) {
      console.log('ERROR: No record template configured');
      return res.status(400).json({ error: 'OneSimpleAPI record template is not configured' });
    }

    // Generate individual record HTML for each attendee using the record template
    const recordsHtml = attendees.map((attendee, index) => {
      console.log(`\n--- Processing attendee ${index + 1}/${attendees.length} ---`);
      console.log('Attendee data:', {
        id: attendee.id,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        barcodeNumber: attendee.barcodeNumber,
        photoUrl: attendee.photoUrl,
        credentialUrl: attendee.credentialUrl,
        customFieldValues: attendee.customFieldValues?.map(cfv => ({
          fieldName: cfv.customField?.name,
          internalFieldName: cfv.customField?.internalFieldName,
          value: cfv.value
        }))
      });
      
      let html = eventSettings.oneSimpleApiRecordTemplate!;
      
      const placeholders: { [key: string]: string } = {
        '{{firstName}}': attendee.firstName || '',
        '{{lastName}}': attendee.lastName || '',
        '{{barcodeNumber}}': attendee.barcodeNumber || '',
        '{{photoUrl}}': attendee.photoUrl || '',
        '{{credentialUrl}}': attendee.credentialUrl || '',
        '{{eventName}}': eventSettings.eventName || '',
        '{{eventDate}}': eventSettings.eventDate ? new Date(eventSettings.eventDate).toLocaleDateString() : '',
        '{{eventTime}}': eventSettings.eventTime || '',
        '{{eventLocation}}': eventSettings.eventLocation || '',
      };

      // Add custom field placeholders
      if (attendee.customFieldValues) {
        attendee.customFieldValues.forEach(cfv => {
          if (cfv.customField?.internalFieldName) {
            placeholders[`{{${cfv.customField.internalFieldName}}}`] = cfv.value || '';
          }
        });
      }

      console.log('Available placeholders for this attendee:', placeholders);

      // Replace all placeholders in the record template
      for (const [placeholder, value] of Object.entries(placeholders)) {
        const beforeReplace = html;
        html = html.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        if (beforeReplace !== html) {
          console.log(`Replaced ${placeholder} with "${value}"`);
        }
      }
      
      console.log('Final record HTML for attendee:', html);
      return html;
    }).join('\n');

    console.log('\n=== COMBINED RECORDS HTML ===');
    console.log('Records HTML length:', recordsHtml.length);
    console.log('Records HTML preview (first 500 chars):', recordsHtml.substring(0, 500));
    if (recordsHtml.length > 500) {
      console.log('Records HTML preview (last 500 chars):', recordsHtml.substring(Math.max(0, recordsHtml.length - 500)));
    }

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

    console.log('\n=== EVENT-LEVEL PLACEHOLDERS ===');
    console.log('Event placeholders:', eventPlaceholders);

    // Replace placeholders in main template
    for (const [placeholder, value] of Object.entries(eventPlaceholders)) {
      const beforeReplace = finalHtml;
      finalHtml = finalHtml.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      if (beforeReplace !== finalHtml) {
        console.log(`Replaced ${placeholder} in main template`);
      }
    }

    console.log('\n=== FINAL HTML CONTENT ===');
    console.log('Final HTML length:', finalHtml.length);
    console.log('Final HTML content:');
    console.log('--- START OF FINAL HTML ---');
    console.log(finalHtml);
    console.log('--- END OF FINAL HTML ---');

    // Validate that we have actual HTML content
    if (!finalHtml || finalHtml.trim().length === 0) {
      console.log('ERROR: Final HTML is empty');
      return res.status(400).json({ error: 'Generated HTML is empty' });
    }

    // Create form data for the request
    const formData = new FormData();
    formData.append(eventSettings.oneSimpleApiFormDataKey!, finalHtml);

    console.log('\n=== API REQUEST DEBUG ===');
    console.log('POST URL:', eventSettings.oneSimpleApiUrl);
    console.log('Form data key:', eventSettings.oneSimpleApiFormDataKey);
    console.log('Form data value length:', finalHtml.length);
    console.log('Form data value preview (first 200 chars):', finalHtml.substring(0, 200));
    
    // Log all form data entries
    console.log('Form data entries:');
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        console.log(`  ${key}: ${value.length} characters - "${value.substring(0, 100)}${value.length > 100 ? '...' : ''}"`);
      } else {
        console.log(`  ${key}: [File/Blob]`);
      }
    }

    console.log('\n=== MAKING API REQUEST ===');
    const response = await fetch(eventSettings.oneSimpleApiUrl, {
      method: 'POST',
      body: formData,
    });

    console.log('\n=== API RESPONSE DEBUG ===');
    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OneSimpleAPI error:', errorText);
      return res.status(response.status).json({ error: `Failed to generate PDF: ${errorText}` });
    }

    const pdfBuffer = await response.arrayBuffer();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="credentials.pdf"');
    res.send(Buffer.from(pdfBuffer));

  } catch (error: any) {
    console.error('Error generating bulk PDF:', error);
    res.status(500).json({ error: 'Failed to generate bulk PDF', details: error.message });
  }
}