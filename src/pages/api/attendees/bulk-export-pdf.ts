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

    // Generate individual record HTML for each attendee
    const recordTemplate = eventSettings.oneSimpleApiRecordTemplate || eventSettings.oneSimpleApiFormDataValue!;
    
    console.log('=== ONESIMPLEAPI DEBUG: Starting HTML generation ===');
    console.log('Record template:', recordTemplate);
    console.log('Main template:', eventSettings.oneSimpleApiFormDataValue);
    console.log('Number of attendees to process:', attendees.length);
    console.log('Form data key:', eventSettings.oneSimpleApiFormDataKey);
    console.log('API URL:', eventSettings.oneSimpleApiUrl);
    
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
      
      let html = recordTemplate;
      
      const placeholders: { [key: string]: string } = {
        '{{firstName}}': attendee.firstName,
        '{{lastName}}': attendee.lastName,
        '{{barcodeNumber}}': attendee.barcodeNumber,
        '{{photoUrl}}': attendee.photoUrl || '',
        '{{credentialUrl}}': attendee.credentialUrl || '',
        '{{eventName}}': eventSettings.eventName,
        '{{eventDate}}': new Date(eventSettings.eventDate).toLocaleDateString(),
        '{{eventTime}}': eventSettings.eventTime || '',
        '{{eventLocation}}': eventSettings.eventLocation,
      };

      attendee.customFieldValues.forEach(cfv => {
        placeholders[`{{${cfv.customField.internalFieldName}}}`] = cfv.value;
      });

      console.log('Available placeholders for this attendee:', placeholders);

      for (const key in placeholders) {
        const beforeReplace = html;
        html = html.replace(new RegExp(key, 'g'), placeholders[key]);
        if (beforeReplace !== html) {
          console.log(`Replaced ${key} with "${placeholders[key]}"`);
        }
      }
      
      console.log('Final record HTML:', html);
      return html;
    }).join('\n\n');

    console.log('\n=== COMBINED RECORDS HTML ===');
    console.log('Records HTML length:', recordsHtml.length);
    console.log('Records HTML preview (first 1000 chars):', recordsHtml.substring(0, 1000));
    if (recordsHtml.length > 1000) {
      console.log('Records HTML preview (last 1000 chars):', recordsHtml.substring(Math.max(0, recordsHtml.length - 1000)));
    }

    // Generate final HTML by replacing {{credentialRecords}} in main template
    let finalHtml = eventSettings.oneSimpleApiFormDataValue!;
    
    // Replace event-level placeholders in main template
    const eventPlaceholders: { [key: string]: string } = {
      '{{eventName}}': eventSettings.eventName,
      '{{eventDate}}': new Date(eventSettings.eventDate).toLocaleDateString(),
      '{{eventTime}}': eventSettings.eventTime || '',
      '{{eventLocation}}': eventSettings.eventLocation,
      '{{credentialRecords}}': recordsHtml,
    };

    console.log('\n=== EVENT-LEVEL PLACEHOLDERS ===');
    console.log('Event placeholders:', eventPlaceholders);

    for (const key in eventPlaceholders) {
      const beforeReplace = finalHtml;
      finalHtml = finalHtml.replace(new RegExp(key, 'g'), eventPlaceholders[key]);
      if (beforeReplace !== finalHtml) {
        console.log(`Replaced ${key} in main template`);
      }
    }

    console.log('\n=== FINAL HTML CONTENT ===');
    console.log('Final HTML length:', finalHtml.length);
    console.log('Final HTML content:');
    console.log('--- START OF FINAL HTML ---');
    console.log(finalHtml);
    console.log('--- END OF FINAL HTML ---');

    // Create form data for the request
    const formData = new FormData();
    formData.append(eventSettings.oneSimpleApiFormDataKey!, finalHtml);

    console.log('\n=== API REQUEST DEBUG ===');
    console.log('POST URL:', eventSettings.oneSimpleApiUrl);
    console.log('Form data key:', eventSettings.oneSimpleApiFormDataKey);
    console.log('Form data value length:', finalHtml.length);
    console.log('Form data entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}: ${typeof value === 'string' ? value.substring(0, 200) + '...' : '[File/Blob]'}`);
    }

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