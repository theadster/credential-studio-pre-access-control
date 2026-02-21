/**
 * Mobile Custom Fields API
 * 
 * GET /api/mobile/custom-fields
 * 
 * Returns custom field definitions for the event, so the mobile app knows
 * what fields exist and can build approval profile rules.
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
  const { tablesDB } = createSessionClient(req);

  // Check permissions - scanner operators need custom field read permission
  const permissions = userProfile.role ? userProfile.role.permissions : {};
  const hasReadPermission = permissions?.customFields?.read === true || permissions?.all === true;

  if (!hasReadPermission) {
    return res.status(403).json({ 
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions to access custom fields' }
    });
  }

  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const customFieldsTableId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID!;

  try {
    // Fetch all non-deleted custom fields, ordered by their display order
    const queries: string[] = [
      Query.isNull('deletedAt'),
      Query.orderAsc('order'),
      Query.limit(100) // Reasonable limit for custom fields
    ];

    const customFieldsResult = await tablesDB.listRows({
      databaseId: dbId,
      tableId: customFieldsTableId,
      queries
    });

    // Map custom fields to mobile-friendly format
    const fields = customFieldsResult.rows.map((field: any) => {
      // Parse field options if they exist
      let fieldOptions = null;
      if (field.fieldOptions) {
        try {
          fieldOptions = typeof field.fieldOptions === 'string'
            ? JSON.parse(field.fieldOptions)
            : field.fieldOptions;
        } catch (error) {
          console.error(`Failed to parse fieldOptions for field ${field.$id}:`, error);
          fieldOptions = null;
        }
      }

      return {
        id: field.$id,
        fieldName: field.fieldName,
        internalFieldName: field.internalFieldName,
        fieldType: field.fieldType,
        fieldOptions,
        required: field.required || false
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        fields
      }
    });

  } catch (error: any) {
    console.error('[Mobile Custom Fields] Error:', error);
    
    const errorResponse: any = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch custom fields'
      }
    };
    
    // Only include error details in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.error.details = error.message;
    }
    
    return res.status(500).json(errorResponse);
  }
});
