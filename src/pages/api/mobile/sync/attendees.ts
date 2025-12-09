/**
 * Mobile Sync Attendees API
 * 
 * GET /api/mobile/sync/attendees
 * 
 * Downloads attendee data including access control fields for mobile app caching.
 * Supports full sync and delta sync with pagination.
 * 
 * Query Parameters:
 * - since: ISO 8601 datetime - Only return records modified after this timestamp (delta sync)
 * - limit: number - Max records to return (default: 1000, max: 5000)
 * - offset: number - Pagination offset (default: 0)
 * 
 * @see .kiro/specs/mobile-access-control/design.md - Mobile Integration Guide
 */

import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ 
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} not allowed` }
    });
  }

  const { user, userProfile } = req;
  const { databases } = createSessionClient(req);

  // Check permissions - scanner operators need attendee read permission
  const permissions = userProfile.role ? userProfile.role.permissions : {};
  const hasReadPermission = permissions?.attendees?.read === true || permissions?.all === true;

  if (!hasReadPermission) {
    return res.status(403).json({ 
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions to access attendee data' }
    });
  }

  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
  const accessControlCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ACCESS_CONTROL_COLLECTION_ID!;
  const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
  const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

  try {
    // Parse query parameters
    const { since, limit: limitParam, offset: offsetParam } = req.query;
    
    // Parse and validate pagination parameters
    const parsedLimit = parseInt(limitParam as string);
    const parsedOffset = parseInt(offsetParam as string);
    
    // Clamp limit to [1, 5000] range (Appwrite max is 5000)
    const limit = Math.max(1, Math.min(
      !isNaN(parsedLimit) ? parsedLimit : 1000,
      5000
    ));
    
    // Clamp offset to non-negative values
    const offset = Math.max(0, !isNaN(parsedOffset) ? parsedOffset : 0);

    // Build queries
    const queries: any[] = [];

    // Delta sync: only fetch records modified after 'since' timestamp
    if (since && typeof since === 'string') {
      try {
        const sinceDate = new Date(since);
        if (isNaN(sinceDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid since parameter. Must be ISO 8601 datetime.' }
          });
        }
        queries.push(Query.greaterThan('$updatedAt', since));
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid since parameter format' }
        });
      }
    }

    // Add pagination
    queries.push(Query.limit(limit));
    queries.push(Query.offset(offset));
    
    // Order by update time for consistent pagination
    queries.push(Query.orderDesc('$updatedAt'));

    // Fetch custom fields for field name mapping
    let customFieldMap = new Map<string, string>(); // Maps fieldId -> fieldName
    let customFieldInternalMap = new Map<string, string>(); // Maps fieldId -> internalFieldName
    try {
      const customFieldsResult = await databases.listDocuments(
        dbId,
        customFieldsCollectionId,
        [Query.limit(1000)] // Reasonable limit for custom fields
      );
      
      // Build mappings from field IDs to display names and internal names
      // Custom field values are stored with field ID as key, not internalFieldName
      customFieldsResult.documents.forEach((field: any) => {
        if (field.$id && field.fieldName) {
          customFieldMap.set(field.$id, field.fieldName);
        }
        if (field.$id && field.internalFieldName) {
          customFieldInternalMap.set(field.$id, field.internalFieldName);
        }
      });
    } catch (error) {
      console.warn('[Mobile Sync Attendees] Failed to fetch custom fields:', error);
      // Continue without field name mapping if custom fields fetch fails
    }

    // Fetch attendees
    const attendeesResult = await databases.listDocuments(
      dbId,
      attendeesCollectionId,
      queries
    );

    /**
     * ACCESS CONTROL DATA FETCHING
     * 
     * PERFORMANCE: Uses batch fetching (100 attendees per query) instead of
     * individual queries to avoid N+1 query problem.
     * 
     * Note: validFrom and validUntil are stored as strings to preserve exact values
     * without Appwrite's automatic timezone conversion
     */
    const attendeeIds = attendeesResult.documents.map((doc: any) => doc.$id);
    const accessControlMap = new Map<string, any>();
    
    if (attendeeIds.length > 0) {
      // Fetch access control data in batches (Appwrite limit for OR queries is 100)
      // This prevents N+1 query problem and dramatically improves performance
      const chunkSize = 100;
      for (let i = 0; i < attendeeIds.length; i += chunkSize) {
        const chunk = attendeeIds.slice(i, i + chunkSize);
        try {
          // Build OR queries for multiple attendee IDs using Query.or()
          // This properly combines multiple equal conditions with OR logic
          const orQueries = chunk.map(id => Query.equal('attendeeId', id));
          const accessControlResult = await databases.listDocuments(
            dbId,
            accessControlCollectionId,
            [Query.or(orQueries), Query.limit(chunkSize)]
          );
          
          // Map access control records by attendeeId
          accessControlResult.documents.forEach((ac: any) => {
            accessControlMap.set(ac.attendeeId, {
              accessEnabled: ac.accessEnabled,
              validFrom: ac.validFrom || null,
              validUntil: ac.validUntil || null
            });
          });
        } catch (error) {
          console.warn(`[Mobile Sync Attendees] Failed to fetch access control batch:`, error);
          // Continue with next batch if one fails
        }
      }
    }

    // Map attendees with access control data
    const attendees = attendeesResult.documents.map((attendee: any) => {
      // Get access control for this attendee (default to enabled if not found)
      const accessControl = accessControlMap.get(attendee.$id) || {
        accessEnabled: true,
        validFrom: null,
        validUntil: null
      };

      // Parse custom field values
      let customFieldValues: Record<string, any> = {};
      let customFieldValuesByName: Record<string, any> = {}; // Display names as keys
      let customFieldValuesByInternalName: Record<string, any> = {}; // Internal names as keys
      
      if (attendee.customFieldValues) {
        try {
          customFieldValues = typeof attendee.customFieldValues === 'string'
            ? JSON.parse(attendee.customFieldValues)
            : attendee.customFieldValues;
          
          // Create mappings with display names and internal names
          // customFieldValues keys are field IDs, map them to both display and internal names
          Object.entries(customFieldValues).forEach(([fieldId, value]) => {
            const displayName = customFieldMap.get(fieldId) || fieldId;
            const internalName = customFieldInternalMap.get(fieldId) || fieldId;
            customFieldValuesByName[displayName] = value;
            customFieldValuesByInternalName[internalName] = value;
          });
        } catch (error) {
          console.error(`Failed to parse customFieldValues for attendee ${attendee.$id}:`, error);
          customFieldValues = {};
          customFieldValuesByName = {};
          customFieldValuesByInternalName = {};
        }
      }

      return {
        id: attendee.$id,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        barcodeNumber: attendee.barcodeNumber,
        photoUrl: attendee.photoUrl || null,
        customFieldValues, // Field IDs as keys (backward compatibility)
        customFieldValuesByName, // Display names as keys
        customFieldValuesByInternalName, // Internal names as keys (for approval profile rules)
        accessControl,
        updatedAt: attendee.$updatedAt
      };
    });

    // Calculate pagination metadata
    const hasMore = offset + attendees.length < attendeesResult.total;

    return res.status(200).json({
      success: true,
      data: {
        attendees,
        pagination: {
          total: attendeesResult.total,
          limit,
          offset,
          hasMore
        },
        syncTimestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[Mobile Sync Attendees] Error:', error);
    
    const errorResponse: any = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to sync attendees'
      }
    };
    
    // Only include error details in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.error.details = error.message;
    }
    
    return res.status(500).json(errorResponse);
  }
});
