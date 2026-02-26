/**
 * Mobile Debug Attendee API - Dynamic Route
 * 
 * GET /api/mobile/debug/attendee/{barcode}
 * 
 * Returns detailed information for a single attendee by barcode number.
 * Useful for debugging and testing mobile app access control logic.
 * 
 * Path Parameters:
 * - barcode: The barcode number to look up (URL-encoded)
 * 
 * Response Format (200):
 * {
 *   "id": "string",
 *   "barcodeNumber": "string",
 *   "firstName": "string",
 *   "lastName": "string",
 *   "email": "string",
 *   "phone": "string",
 *   "photoUrl": "string (optional)",
 *   "customFields": {                           // Display names as keys (legacy)
 *     "fieldName": value
 *   },
 *   "customFieldValues": {                      // Field IDs as keys
 *     "field-id": value
 *   },
 *   "customFieldValuesByInternalName": {        // Internal names as keys (for approval profiles)
 *     "internal_name": value
 *   },
 *   "accessControl": {
 *     "accessEnabled": boolean,
 *     "validFrom": "ISO8601 timestamp (optional)",
 *     "validUntil": "ISO8601 timestamp (optional)"
 *   }
 * }
 * 
 * Error Response (4xx/5xx):
 * {
 *   "error": "ERROR_CODE",
 *   "message": "Human readable message"
 * }
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 * @see .kiro/specs/mobile-debug-endpoint/requirements.md
 * @see .kiro/specs/mobile-debug-endpoint/design.md
 */

import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // Requirement 2.1: Validate HTTP method (GET only)
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: `Method ${req.method} not allowed`
    });
  }

  const { userProfile } = req;
  const { tablesDB } = createSessionClient(req);

  // Requirement 2.2, 2.3: Check permissions for mobile access
  // Mobile access requires attendees read permission
  const permissions = userProfile.role ? userProfile.role.permissions : {};
  const hasReadPermission = permissions?.attendees?.read === true || permissions?.all === true;

  if (!hasReadPermission) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Forbidden'
    });
  }

  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const attendeesTableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID!;
  const accessControlTableId = process.env.NEXT_PUBLIC_APPWRITE_ACCESS_CONTROL_TABLE_ID!;
  const customFieldsTableId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID!;

  try {
    // Requirement 1.6: Extract and validate barcode parameter from route
    const { barcode } = req.query;

    // Requirement 5.1: URL decode the barcode parameter
    let decodedBarcode: string;
    try {
      decodedBarcode = Array.isArray(barcode) ? barcode[0] : barcode || '';
      decodedBarcode = decodeURIComponent(decodedBarcode);
    } catch (error) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Barcode is required'
      });
    }

    // Requirement 5.2: Validate barcode is not empty
    if (!decodedBarcode || decodedBarcode.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Barcode is required'
      });
    }

    // Requirement 1.1: Query attendees collection by barcode number
    const attendeesResult = await tablesDB.listRows({
      databaseId: dbId,
      tableId: attendeesTableId,
      queries: [Query.equal('barcodeNumber', decodedBarcode), Query.limit(1)]
    });

    // Requirement 1.5: Handle case where attendee is not found (404 response)
    if (attendeesResult.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Attendee not found'
      });
    }

    const attendee = attendeesResult.rows[0];

    // Requirement 1.2: Retrieve core fields
    const coreData = {
      id: attendee.$id,
      barcodeNumber: attendee.barcodeNumber,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      email: attendee.email || null,
      phone: attendee.phone || null,
      photoUrl: attendee.photoUrl || undefined
    };

    // Requirement 1.4: Retrieve access control fields
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
          accessEnabled: ac.accessEnabled ?? true,
          validFrom: ac.validFrom || null,
          validUntil: ac.validUntil || null
        };
      }
    } catch (error) {
      console.warn(`[Mobile Debug Attendee] Failed to fetch access control for attendee ${attendee.$id}:`, error);
    }

    // Requirement 1.3: Retrieve custom fields and format
    let customFields: Record<string, any> = {};
    let customFieldValues: Record<string, any> = {};
    let customFieldValuesByInternalName: Record<string, any> = {};

    try {
      // Fetch custom field definitions for field name mapping
      const customFieldsResult = await tablesDB.listRows({
        databaseId: dbId,
        tableId: customFieldsTableId,
        queries: [Query.limit(1000)]
      });

      const fieldNameMap = new Map<string, string>();
      const fieldInternalMap = new Map<string, string>();
      customFieldsResult.rows.forEach((field: any) => {
        if (field.$id && field.fieldName) {
          fieldNameMap.set(field.$id, field.fieldName);
        }
        if (field.$id && field.internalFieldName) {
          fieldInternalMap.set(field.$id, field.internalFieldName);
        }
      });

      // Parse and map custom field values
      if (attendee.customFieldValues) {
        try {
          const parsed = typeof attendee.customFieldValues === 'string'
            ? JSON.parse(attendee.customFieldValues)
            : attendee.customFieldValues;

          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            customFieldValues = parsed; // Store original with field IDs
            Object.entries(parsed).forEach(([fieldId, value]) => {
              const displayName = fieldNameMap.get(fieldId) || fieldId;
              const internalName = fieldInternalMap.get(fieldId) || fieldId;
              customFields[displayName] = value;
              customFieldValuesByInternalName[internalName] = value;
            });
          }
        } catch (error) {
          console.error(`Failed to parse customFieldValues for attendee ${attendee.$id}:`, error);
        }
      }
    } catch (error) {
      console.warn('[Mobile Debug Attendee] Failed to fetch custom fields:', error);
    }

    // Requirement 3.1, 3.2, 3.3, 3.4: Format response
    const response = {
      ...coreData,
      accessControl,
      customFields, // Display names as keys (legacy format)
      customFieldValues, // Field IDs as keys
      customFieldValuesByInternalName // Internal names as keys (for approval profiles)
    };

    // Remove undefined photoUrl if not present
    if (response.photoUrl === undefined) {
      delete response.photoUrl;
    }

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('[Mobile Debug Attendee] Error:', error);

    // Requirement 5.4: Handle database connection errors (503 response)
    if (error.code === 'service_unavailable' || error.message?.includes('unavailable')) {
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Service unavailable'
      });
    }

    // Generic server error
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Failed to fetch attendee'
    });
  }
});
