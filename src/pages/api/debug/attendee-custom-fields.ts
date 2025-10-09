import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

/**
 * Debug endpoint to check an attendee's custom field values
 * GET /api/attendees/debug-custom-fields?attendeeId=xxx
 */
export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { databases } = createSessionClient(req);
    const { attendeeId } = req.query;

    if (!attendeeId || typeof attendeeId !== 'string') {
      return res.status(400).json({ error: 'attendeeId is required' });
    }

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID;

    if (!dbId) {
      return res.status(500).json({ error: 'Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID' });
    }

    if (!attendeesCollectionId) {
      return res.status(500).json({ error: 'Missing NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID' });
    }

    // Get attendee
    const attendee = await databases.getDocument(dbId, attendeesCollectionId, attendeeId);

    // Parse custom field values
    let customFieldValues: any = {};
    let parseError = null;

    if (attendee.customFieldValues) {
      try {
        if (typeof attendee.customFieldValues === 'string') {
          customFieldValues = JSON.parse(attendee.customFieldValues);
        } else {
          customFieldValues = attendee.customFieldValues;
        }
      } catch (e: any) {
        parseError = e.message;
      }
    }

    return res.status(200).json({
      attendeeId: attendee.$id,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      customFieldValuesRaw: attendee.customFieldValues,
      customFieldValuesParsed: customFieldValues,
      customFieldValuesType: typeof attendee.customFieldValues,
      customFieldValuesIsString: typeof attendee.customFieldValues === 'string',
      customFieldValuesLength: attendee.customFieldValues ? String(attendee.customFieldValues).length : 0,
      hasCustomFieldValues: !!attendee.customFieldValues,
      isEmpty: Object.keys(customFieldValues).length === 0,
      parseError,
      fieldCount: Object.keys(customFieldValues).length,
      fields: Object.keys(customFieldValues)
    });

  } catch (error: any) {
    console.error('Error debugging custom fields:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});
