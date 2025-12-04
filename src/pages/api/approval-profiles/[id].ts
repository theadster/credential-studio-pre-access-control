import type { NextApiRequest, NextApiResponse } from 'next';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import {
  ApprovalProfile,
  UpdateApprovalProfileSchema,
  UpdateApprovalProfileInput,
} from '@/types/approvalProfile';

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

    return res.status(200).json({
      success: true,
      data: profile,
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

    return res.status(200).json({
      success: true,
      data: updatedProfile,
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

    return res.status(200).json({
      success: true,
      data: deletedProfile,
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
