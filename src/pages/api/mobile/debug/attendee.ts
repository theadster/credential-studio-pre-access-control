/**
 * Mobile Debug Attendee API
 * 
 * GET /api/mobile/debug/attendee/{barcode}
 * 
 * Returns detailed information for a single attendee by barcode number.
 * Useful for debugging and testing mobile app access control logic.
 * 
 * Path Parameters:
 * - barcode: The barcode number to look up
 * 
 * Response Format:
 * {
 *   "id": "string",
 *   "barcodeNumber": "string",
 *   "firstName": "string",
 *   "lastName": "string",
 *   "photoUrl": "string (optional)",
 *   "customFieldValues": {},                    // Field IDs as keys
 *   "customFieldValuesByName": {},              // Display names as keys
 *   "customFieldValuesByInternalName": {},      // Internal names as keys (for approval profiles)
 *   "accessControl": {
 *     "accessEnabled": true,
 *     "validFrom": "ISO8601 timestamp (optional)",
 *     "validUntil": "ISO8601 timestamp (optional)"
 *   },
 *   "updatedAt": "ISO8601 timestamp"
 * }
 * 
 * Error Response (404):
 * {
 *   "error": "Attendee not found",
 *   "barcode": "{barcode}"
 * }
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

  const { userProfile } = req;
  const { tablesDB } = createSessionClient(req);

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
  const attendeesTableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID!;
  const accessControlTableId = process.env.NEXT_PUBLIC_APPWRITE_ACCESS_CONTROL_TABLE_ID!;
  const customFieldsTableId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID!;

  try {
    // Extract barcode from query parameters
    const { barcode } = req.query;

    if (!barcode || typeof barcode !== 'string' || barcode.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Barcode parameter is required' }
      });
    }

    // Fetch custom fields for field name mapping
    let customFieldMap = new Map<string, string>(); // Maps fieldId -> fieldName
    let customFieldInternalMap = new Map<string, string>(); // Maps fieldId -> internalFieldName
    try {
      const customFieldsResult = await tablesDB.listRows({
        databaseId: dbId,
        tableId: customFieldsTableId,
        queries: [Query.limit(1000)]
      });
      
      customFieldsResult.rows.forEach((field: any) => {
        if (field.$id && field.fieldName) {
          customFieldMap.set(field.$id, field.fieldName);
        }
        if (field.$id && field.internalFieldName) {
          customFieldInternalMap.set(field.$id, field.internalFieldName);
        }
      });
    } catch (error) {
      console.warn('[Mobile Debug Attendee] Failed to fetch custom fields:', error);
    }

    // Search for attendee by barcode number
    const attendeesResult = await tablesDB.listRows({
      databaseId: dbId,
      tableId: attendeesTableId,
      queries: [Query.equal('barcodeNumber', barcode), Query.limit(1)]
    });

    if (attendeesResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Attendee not found',
        barcode: barcode
      });
    }

    const attendee = attendeesResult.rows[0];

    // Fetch access control data for this attendee
    let accessControl = {
      accessEnabled: true,
      validFrom: null,
      validUntil: null
    };

    try {
      const accessControlResult = await tablesDB.listRows({
        databaseId: dbId,
        tableId: accessControlTableId,
        queries: [Query.equal('attendeeId', attendee.$id), Query.limit(1)]
      });

      if (accessControlResult.rows.length > 0) {
        const ac = accessControlResult.rows[0];
        accessControl = {
          accessEnabled: ac.accessEnabled,
          validFrom: ac.validFrom || null,
          validUntil: ac.validUntil || null
        };
      }
    } catch (error) {
      console.warn(`[Mobile Debug Attendee] Failed to fetch access control for attendee ${attendee.$id}:`, error);
    }

    // Parse custom field values
    let customFieldValues: Record<string, any> = {};
    let customFieldValuesByName: Record<string, any> = {};
    let customFieldValuesByInternalName: Record<string, any> = {};
    
    if (attendee.customFieldValues) {
      try {
        customFieldValues = typeof attendee.customFieldValues === 'string'
          ? JSON.parse(attendee.customFieldValues)
          : attendee.customFieldValues;
        
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

    return res.status(200).json({
      id: attendee.$id,
      barcodeNumber: attendee.barcodeNumber,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      photoUrl: attendee.photoUrl || null,
      customFieldValues,
      customFieldValuesByName,
      customFieldValuesByInternalName,
      accessControl,
      updatedAt: attendee.$updatedAt
    });

  } catch (error: any) {
    console.error('[Mobile Debug Attendee] Error:', error);
    
    const errorResponse: any = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch attendee'
      }
    };
    
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.error.details = error.message;
    }
    
    return res.status(500).json(errorResponse);
  }
});
