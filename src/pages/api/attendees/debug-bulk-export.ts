import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const debugInfo: any = {
    step: 'starting',
    timestamp: new Date().toISOString()
  };

  try {
    debugInfo.method = req.method;
    debugInfo.requestBody = req.body;

    if (req.method !== 'POST') {
      debugInfo.error = 'Method not allowed';
      return res.status(405).json(debugInfo);
    }

    debugInfo.step = 'authentication';
    const supabase = createClient(req, res);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      debugInfo.error = 'Authentication failed';
      debugInfo.userError = userError;
      debugInfo.userId = user?.id;
      return res.status(401).json(debugInfo);
    }

    debugInfo.userId = user.id;
    debugInfo.step = 'validating_input';

    const { attendeeIds } = req.body;
    debugInfo.attendeeIds = attendeeIds;

    if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      debugInfo.error = 'Invalid attendeeIds';
      return res.status(400).json(debugInfo);
    }

    debugInfo.step = 'fetching_event_settings';
    const eventSettings = await prisma.eventSettings.findFirst();
    
    debugInfo.eventSettings = {
      found: !!eventSettings,
      oneSimpleApiEnabled: eventSettings?.oneSimpleApiEnabled,
      oneSimpleApiUrl: eventSettings?.oneSimpleApiUrl,
      oneSimpleApiFormDataKey: eventSettings?.oneSimpleApiFormDataKey,
      oneSimpleApiFormDataValue: eventSettings?.oneSimpleApiFormDataValue ? 'SET (length: ' + eventSettings.oneSimpleApiFormDataValue.length + ')' : 'NOT SET',
      oneSimpleApiRecordTemplate: eventSettings?.oneSimpleApiRecordTemplate ? 'SET (length: ' + eventSettings.oneSimpleApiRecordTemplate.length + ')' : 'NOT SET'
    };

    if (!eventSettings || !eventSettings.oneSimpleApiEnabled || !eventSettings.oneSimpleApiUrl || !eventSettings.oneSimpleApiFormDataKey || !eventSettings.oneSimpleApiFormDataValue) {
      debugInfo.error = 'OneSimpleAPI is not configured';
      return res.status(400).json(debugInfo);
    }

    debugInfo.step = 'fetching_attendees';
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

    debugInfo.attendeesFound = attendees.length;
    debugInfo.attendeesData = attendees.map(a => ({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      barcodeNumber: a.barcodeNumber,
      hasCredentialUrl: !!a.credentialUrl,
      credentialUrl: a.credentialUrl,
      customFieldsCount: a.customFieldValues?.length || 0
    }));

    if (attendees.length === 0) {
      debugInfo.error = 'No attendees with credentials found';
      return res.status(404).json(debugInfo);
    }

    debugInfo.step = 'generating_html';
    const recordTemplate = eventSettings.oneSimpleApiRecordTemplate || eventSettings.oneSimpleApiFormDataValue!;
    
    debugInfo.templates = {
      recordTemplate: recordTemplate,
      mainTemplate: eventSettings.oneSimpleApiFormDataValue,
      formDataKey: eventSettings.oneSimpleApiFormDataKey,
      apiUrl: eventSettings.oneSimpleApiUrl
    };

    // Generate HTML for first attendee as example
    const firstAttendee = attendees[0];
    let sampleHtml = recordTemplate;
    
    const placeholders: { [key: string]: string } = {
      '{{firstName}}': firstAttendee.firstName,
      '{{lastName}}': firstAttendee.lastName,
      '{{barcodeNumber}}': firstAttendee.barcodeNumber,
      '{{photoUrl}}': firstAttendee.photoUrl || '',
      '{{credentialUrl}}': firstAttendee.credentialUrl || '',
      '{{eventName}}': eventSettings.eventName,
      '{{eventDate}}': new Date(eventSettings.eventDate).toLocaleDateString(),
      '{{eventTime}}': eventSettings.eventTime || '',
      '{{eventLocation}}': eventSettings.eventLocation,
    };

    firstAttendee.customFieldValues.forEach(cfv => {
      placeholders[`{{${cfv.customField.internalFieldName}}}`] = cfv.value;
    });

    debugInfo.samplePlaceholders = placeholders;

    for (const key in placeholders) {
      sampleHtml = sampleHtml.replace(new RegExp(key, 'g'), placeholders[key]);
    }

    debugInfo.sampleGeneratedHtml = sampleHtml;
    debugInfo.step = 'complete';

    return res.status(200).json(debugInfo);

  } catch (error: any) {
    debugInfo.error = 'Exception occurred';
    debugInfo.errorMessage = error.message;
    debugInfo.errorStack = error.stack;
    return res.status(500).json(debugInfo);
  }
}