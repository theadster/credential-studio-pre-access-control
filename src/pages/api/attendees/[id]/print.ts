import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { ID, Query } from 'node-appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { validateAppwriteEnv } from '@/lib/envValidation';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid attendee ID' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Validate environment variables
    try {
      const validation = validateAppwriteEnv();
      if (!validation.isValid) {
        console.error('Missing required environment variables:', validation.missingVars);
        return res.status(500).json({ error: 'Server configuration error' });
      }
    } catch (error) {
      console.error('Environment validation error:', error);
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
    const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

    // Check print permission
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const hasPrintPermission = permissions?.attendees?.print === true || permissions?.all === true;

    if (!hasPrintPermission) {
      return res.status(403).json({ error: 'Insufficient permissions to print credentials' });
    }

    // Get attendee details
    const attendee = await databases.getDocument({
      databaseId: dbId,
      collectionId: attendeesCollectionId,
      documentId: id
    });

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    // Get event settings
    const eventSettingsDocs = await databases.listDocuments({
      databaseId: dbId,
      collectionId: eventSettingsCollectionId,
      queries: [Query.limit(1)]
    });
    const eventSettings = eventSettingsDocs.documents[0];

    // Verify Switchboard configuration
    if (!process.env.SWITCHBOARD_API_KEY) {
      console.error('SWITCHBOARD_API_KEY environment variable is not configured');
      return res.status(500).json({ error: 'Switchboard Canvas API key not configured' });
    }

    if (!eventSettings || !eventSettings.switchboardTemplateId) {
      return res.status(400).json({ error: 'Switchboard Canvas template not configured' });
    }

    // Parse custom field values
    let customFieldValues = {};
    try {
      customFieldValues = attendee.customFieldValues
        ? (typeof attendee.customFieldValues === 'string'
          ? JSON.parse(attendee.customFieldValues)
          : attendee.customFieldValues)
        : {};
    } catch (parseError) {
      console.error('Failed to parse customFieldValues:', parseError);
      // Continue with empty object as fallback
    }

    // Prepare data for Switchboard Canvas
    const switchboardData = {
      template_id: eventSettings.switchboardTemplateId,
      data: {
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        fullName: `${attendee.firstName} ${attendee.lastName}`,
        barcodeNumber: attendee.barcodeNumber,
        eventName: eventSettings.eventName,
        eventDate: eventSettings.eventDate ? new Date(eventSettings.eventDate).toLocaleDateString() : '',
        eventLocation: eventSettings.eventLocation,
        photoUrl: attendee.photoUrl || '',
        // Add custom fields
        ...Object.entries(customFieldValues).reduce((acc, [fieldId, value]) => {
          // Use field ID as key for now (could be improved with field name mapping)
          acc[fieldId] = String(value);
          return acc;
        }, {} as Record<string, string>)
      }
    };

    // Call Switchboard Canvas API
    const switchboardResponse = await fetch('https://api.switchboard.ai/v1/render', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SWITCHBOARD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(switchboardData)
    });

    if (!switchboardResponse.ok) {
      const errorData = await switchboardResponse.text();
      console.error('Switchboard API Error:', errorData);
      return res.status(500).json({ error: 'Failed to generate credential image' });
    }

    const switchboardResult = await switchboardResponse.json();

    // Log the print action
    await databases.createDocument({
      databaseId: dbId,
      collectionId: logsCollectionId,
      documentId: ID.unique(),
      data: {
        userId: user.$id,
        attendeeId: attendee.$id,
        action: 'print',
        details: JSON.stringify({
          type: 'credential',
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          barcodeNumber: attendee.barcodeNumber,
          switchboardJobId: switchboardResult.job_id || switchboardResult.id,
          imageUrl: switchboardResult.url || switchboardResult.image_url
        })
      }
    });

    return res.status(200).json({
      success: true,
      attendee: {
        id: attendee.$id,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        barcodeNumber: attendee.barcodeNumber
      },
      credential: {
        imageUrl: switchboardResult.url || switchboardResult.image_url,
        jobId: switchboardResult.job_id || switchboardResult.id,
        status: switchboardResult.status || 'completed'
      }
    });

  } catch (error: any) {
    console.error('Print API Error:', error);

    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
});
