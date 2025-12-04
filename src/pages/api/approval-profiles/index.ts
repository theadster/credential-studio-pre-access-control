import type { NextApiRequest, NextApiResponse } from 'next';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import {
  ApprovalProfile,
  CreateApprovalProfileSchema,
  CreateApprovalProfileInput,
  RuleGroup,
} from '@/types/approvalProfile';
import { ID } from 'appwrite';

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const collectionId = process.env.NEXT_PUBLIC_APPWRITE_APPROVAL_PROFILES_COLLECTION_ID!;

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
    const response = await databases.listDocuments<ApprovalProfile>(
      databaseId,
      collectionId,
      [
        Query.equal('isDeleted', false),
        Query.orderDesc('$createdAt'),
      ]
    );

    return res.status(200).json({
      success: true,
      data: response.documents,
    });
  } catch (error: any) {
    console.error('Error listing approval profiles:', error);
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
    // Validate request body
    const validation = CreateApprovalProfileSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const input: CreateApprovalProfileInput = validation.data;

    // Check for duplicate name
    const existingProfiles = await databases.listDocuments<ApprovalProfile>(
      databaseId,
      collectionId,
      [
        Query.equal('name', input.name),
        Query.equal('isDeleted', false),
      ]
    );

    if (existingProfiles.documents.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A profile with this name already exists',
      });
    }

    // Serialize rules to JSON string for database storage
    // Note: input.rules is a RuleGroup object, but Appwrite stores it as a string
    const rulesJson = JSON.stringify(input.rules);

    // Create the profile
    const profile = await databases.createDocument<ApprovalProfile>(
      databaseId,
      collectionId,
      ID.unique(),
      {
        name: input.name,
        description: input.description || null,
        version: 1,
        rules: rulesJson,
        isDeleted: false,
      }
    );

    return res.status(201).json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    console.error('Error creating approval profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create approval profile',
    });
  }
}
