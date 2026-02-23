import type { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query } from 'appwrite';
import {
  ApprovalProfile,
  CreateApprovalProfileSchema,
  CreateApprovalProfileInput,
  RuleGroup,
} from '@/types/approvalProfile';
import { ID } from 'appwrite';
import { shouldLog } from '@/lib/logSettings';
import { isConfigError } from '@/lib/apiErrorHandler';

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const tableId = process.env.NEXT_PUBLIC_APPWRITE_APPROVAL_PROFILES_TABLE_ID!;

/**
 * GET /api/approval-profiles - List all approval profiles
 * POST /api/approval-profiles - Create a new approval profile
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}

/**
 * GET - List all approval profiles (excluding soft-deleted)
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { tablesDB } = createSessionClient(req);

    if (!databaseId || !tableId) {
      return res.status(500).json({
        success: false,
        errorCode: 'CONFIG_ERROR',
        error: 'Approval profiles table is not configured. Check NEXT_PUBLIC_APPWRITE_APPROVAL_PROFILES_TABLE_ID.',
      });
    }

    const response = await tablesDB.listRows({
      databaseId,
      tableId,
      queries: [
        Query.equal('isDeleted', false),
        Query.orderDesc('$createdAt'),
      ],
    });

    // Parse rules JSON strings to objects for consistent API response
    const profilesWithParsedRules = response.rows.map((profile: any) => {
      let parsedRules = profile.rules;
      if (typeof profile.rules === 'string') {
        try {
          parsedRules = JSON.parse(profile.rules);
        } catch (parseError) {
          console.error(`Error parsing profile ${profile.$id} rules JSON:`, parseError);
          // Return profile with rules as empty object on parse error
          parsedRules = { logic: 'AND', conditions: [] };
        }
      }
      return {
        ...profile,
        rules: parsedRules,
      };
    });

    return res.status(200).json({
      success: true,
      data: profilesWithParsedRules,
    });
  } catch (error: any) {
    console.error('Error listing approval profiles:', error);
    if (isConfigError(error)) {
      return res.status(500).json({
        success: false,
        errorCode: 'CONFIG_ERROR',
        error: 'Approval profiles table is not configured or does not exist. Check your Appwrite setup.',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to list approval profiles',
    });
  }
}

/**
 * POST - Create a new approval profile
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { tablesDB } = createSessionClient(req);
    
    // Validate request body
    const validation = CreateApprovalProfileSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const input: CreateApprovalProfileInput = validation.data;

    // Check for duplicate name
    const existingProfiles = await tablesDB.listRows({
      databaseId,
      tableId,
      queries: [
        Query.equal('name', input.name),
        Query.equal('isDeleted', false),
      ],
    });

    if (existingProfiles.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A profile with this name already exists',
      });
    }

    // Serialize rules to JSON string for database storage
    // Note: input.rules is a RuleGroup object, but Appwrite stores it as a string
    const rulesJson = JSON.stringify(input.rules);

    // Create the profile
    const profile = await tablesDB.createRow({
      databaseId,
      tableId,
      rowId: ID.unique(),
      data: {
        name: input.name,
        description: input.description || null,
        version: 1,
        rules: rulesJson as any, // Stored as JSON string in DB, parsed on retrieval
        isDeleted: false,
      },
    });

    // Log the profile creation if enabled
    if (await shouldLog('approvalProfileCreate')) {
      try {
        const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!;
        // Try to get user ID from session if available
        let userId = 'unknown';
        try {
          const { account } = createSessionClient(req);
          const user = await account.get();
          userId = user.$id;
        } catch {
          // Session not available, use unknown
        }
        
        await tablesDB.createRow(
          databaseId,
          logsTableId,
          ID.unique(),
          {
            userId,
            action: 'create',
            details: JSON.stringify({
              type: 'approval_profile_create',
              profileId: profile.$id,
              profileName: input.name,
              description: input.description || null,
              ruleCount: input.rules?.conditions?.length || 0,
            }),
          }
        );
      } catch (logError) {
        console.error('[Approval Profiles API] Error creating audit log:', logError);
        // Continue even if logging fails
      }
    }

    // Parse rules JSON string to object for consistent API response
    const responseProfile = {
      ...profile,
      rules: typeof profile.rules === 'string' ? JSON.parse(profile.rules) : profile.rules,
    };

    return res.status(201).json({
      success: true,
      data: responseProfile,
    });
  } catch (error: any) {
    console.error('Error creating approval profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create approval profile',
    });
  }
}
