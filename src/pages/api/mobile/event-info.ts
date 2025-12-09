/**
 * Mobile Event Info API
 * 
 * GET /api/mobile/event-info
 * 
 * Returns essential event information for mobile app display.
 * Includes event name, location, date/time, and mobile settings passcode.
 * 
 * This endpoint is optimized for mobile clients and returns minimal data
 * to reduce bandwidth usage.
 * 
 * @see .kiro/specs/mobile-access-control/design.md - Mobile Integration Guide
 * @see .kiro/specs/mobile-settings-passcode/design.md - Mobile Settings Passcode Feature
 */

import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ 
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} not allowed` }
    });
  }

  const { userProfile } = req;
  const { databases } = createSessionClient(req);

  // Check permissions - scanner operators need attendee read permission
  const permissions = userProfile.role ? userProfile.role.permissions : {};
  const hasReadPermission = permissions?.attendees?.read === true || permissions?.all === true;

  if (!hasReadPermission) {
    return res.status(403).json({ 
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions to access event information' }
    });
  }

  // Validate required environment variables
  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID;

  const missingEnvVars: string[] = [];
  if (!dbId || dbId.trim() === '') {
    missingEnvVars.push('NEXT_PUBLIC_APPWRITE_DATABASE_ID');
  }
  if (!eventSettingsCollectionId || eventSettingsCollectionId.trim() === '') {
    missingEnvVars.push('NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID');
  }

  if (missingEnvVars.length > 0) {
    console.error('[Mobile Event Info] Missing environment variables:', missingEnvVars);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CONFIGURATION_ERROR',
        message: `Missing required environment variable(s): ${missingEnvVars.join(', ')}`
      }
    });
  }

  try {
    // At this point, both values are guaranteed to be non-empty strings
    const validatedDbId = dbId as string;
    const validatedEventSettingsCollectionId = eventSettingsCollectionId as string;

    // Fetch event settings - there should only be one document
    const eventSettingsResult = await databases.listDocuments(
      validatedDbId,
      validatedEventSettingsCollectionId,
      []
    );

    if (eventSettingsResult.documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event settings not configured' }
      });
    }

    const eventSettings = eventSettingsResult.documents[0];

    // Return minimal event info for mobile app
    return res.status(200).json({
      success: true,
      data: {
        eventName: eventSettings.eventName || 'Event',
        eventDate: eventSettings.eventDate || null,
        eventLocation: eventSettings.eventLocation || null,
        eventTime: eventSettings.eventTime || null,
        timeZone: eventSettings.timeZone || null,
        mobileSettingsPasscode: eventSettings.mobileSettingsPasscode || null,
        updatedAt: eventSettings.$updatedAt
      }
    });

  } catch (error: any) {
    console.error('[Mobile Event Info] Error:', error);
    
    const errorResponse: any = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch event information'
      }
    };
    
    // Only include error details in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.error.details = error.message;
    }
    
    return res.status(500).json(errorResponse);
  }
});
