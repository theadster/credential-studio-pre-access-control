import type { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import {
  ApprovalProfile,
  UpdateApprovalProfileSchema,
  UpdateApprovalProfileInput,
} from '@/types/approvalProfile';
import { shouldLog } from '@/lib/logSettings';

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const collectionId = process.env.NEXT_PUBLIC_APPWRITE_APPROVAL_PROFILES_COLLECTION_ID!;

/**
 * GET /api/approval-profiles/[id] - Get a single approval profile
 * PUT /api/approval-profiles/[id] - Update an approval profile
 * DELETE /api/approval-profiles/[id] - Soft delete an approval profile
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid profile ID',
    });
  }

  if (req.method === 'GET') {
    return handleGet(id, req, res);
  } else if (req.method === 'PUT') {
    return handlePut(id, req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(id, req, res);
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}

/**
 * GET - Get a single approval profile by ID
 */
async function handleGet(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { databases } = createSessionClient(req);
    const profile = await databases.getDocument<ApprovalProfile>(
      databaseId,
      collectionId,
      id
    );

    // Don't return soft-deleted profiles
    if (profile.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    // Parse rules JSON string to object for consistent API response
    let parsedRules = profile.rules;
    if (typeof profile.rules === 'string') {
      try {
        parsedRules = JSON.parse(profile.rules);
      } catch (parseError) {
        console.error('Error parsing profile rules JSON:', parseError);
        return res.status(500).json({
          success: false,
          error: 'Invalid profile data: rules JSON is malformed',
        });
      }
    }

    const responseProfile = {
      ...profile,
      rules: parsedRules,
    };

    return res.status(200).json({
      success: true,
      data: responseProfile,
    });
  } catch (error: any) {
    if (error.code === 404) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    console.error('Error getting approval profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get approval profile',
    });
  }
}

/**
 * PUT - Update an approval profile (increments version)
 */
async function handlePut(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { databases } = createSessionClient(req);
    
    // Validate request body
    const validation = UpdateApprovalProfileSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const input: UpdateApprovalProfileInput = validation.data;

    // Get current profile
    const currentProfile = await databases.getDocument<ApprovalProfile>(
      databaseId,
      collectionId,
      id
    );

    if (currentProfile.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    // Check for duplicate name if name is being changed
    if (input.name && input.name !== currentProfile.name) {
      const existingProfiles = await databases.listDocuments<ApprovalProfile>(
        databaseId,
        collectionId,
        [
          Query.equal('name', input.name),
          Query.equal('isDeleted', false),
          Query.notEqual('$id', id),
        ]
      );

      if (existingProfiles.documents.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'A profile with this name already exists',
        });
      }
    }

    // Prepare update data
    const updateData: any = {
      version: currentProfile.version + 1, // Increment version
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.rules !== undefined) {
      // Serialize rules to JSON string for database storage
      updateData.rules = JSON.stringify(input.rules);
    }

    // Update the profile
    const updatedProfile = await databases.updateDocument<ApprovalProfile>(
      databaseId,
      collectionId,
      id,
      updateData
    );

    // Log the profile update if enabled
    if (await shouldLog('approvalProfileUpdate')) {
      try {
        const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
        // Try to get user ID from session if available
        let userId = 'unknown';
        try {
          const { account } = createSessionClient(req);
          const user = await account.get();
          userId = user.$id;
        } catch {
          // Session not available, use unknown
        }
        
        await databases.createDocument(
          databaseId,
          logsCollectionId,
          ID.unique(),
          {
            userId,
            action: 'update',
            details: JSON.stringify({
              type: 'approval_profile_update',
              profileId: id,
              profileName: updatedProfile.name,
              previousVersion: currentProfile.version,
              newVersion: updatedProfile.version,
              changes: {
                name: input.name !== undefined ? { from: currentProfile.name, to: input.name } : undefined,
                description: input.description !== undefined ? { from: currentProfile.description, to: input.description } : undefined,
                rulesUpdated: input.rules !== undefined,
              },
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
      ...updatedProfile,
      rules: typeof updatedProfile.rules === 'string' ? JSON.parse(updatedProfile.rules) : updatedProfile.rules,
    };

    return res.status(200).json({
      success: true,
      data: responseProfile,
    });
  } catch (error: any) {
    if (error.code === 404) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    console.error('Error updating approval profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update approval profile',
    });
  }
}

/**
 * DELETE - Soft delete an approval profile
 */
async function handleDelete(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { databases } = createSessionClient(req);
    
    // Get current profile
    const currentProfile = await databases.getDocument<ApprovalProfile>(
      databaseId,
      collectionId,
      id
    );

    if (currentProfile.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    // Soft delete by setting isDeleted flag
    const deletedProfile = await databases.updateDocument<ApprovalProfile>(
      databaseId,
      collectionId,
      id,
      {
        isDeleted: true,
      }
    );

    // Log the profile deletion if enabled
    if (await shouldLog('approvalProfileDelete')) {
      try {
        const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
        // Try to get user ID from session if available
        let userId = 'unknown';
        try {
          const { account } = createSessionClient(req);
          const user = await account.get();
          userId = user.$id;
        } catch {
          // Session not available, use unknown
        }
        
        await databases.createDocument(
          databaseId,
          logsCollectionId,
          ID.unique(),
          {
            userId,
            action: 'delete',
            details: JSON.stringify({
              type: 'approval_profile_delete',
              profileId: id,
              profileName: currentProfile.name,
              profileVersion: currentProfile.version,
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
      ...deletedProfile,
      rules: typeof deletedProfile.rules === 'string' ? JSON.parse(deletedProfile.rules) : deletedProfile.rules,
    };

    return res.status(200).json({
      success: true,
      data: responseProfile,
    });
  } catch (error: any) {
    if (error.code === 404) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    console.error('Error deleting approval profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete approval profile',
    });
  }
}
