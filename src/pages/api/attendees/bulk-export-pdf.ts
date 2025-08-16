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

    // Generate individual record HTML for each attendee
    const recordTemplate = eventSettings.oneSimpleApiRecordTemplate || eventSettings.oneSimpleApiFormDataValue!;
    const recordsHtml = attendees.map(attendee => {
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

      for (const key in placeholders) {
        html = html.replace(new RegExp(key, 'g'), placeholders[key]);
      }
      
      return html;
    }).join('\n\n');

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

    for (const key in eventPlaceholders) {
      finalHtml = finalHtml.replace(new RegExp(key, 'g'), eventPlaceholders[key]);
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