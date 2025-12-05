/**
 * Mobile Sync Profiles API
 * 
 * GET /api/mobile/sync/profiles
 * 
 * Downloads approval profiles for mobile app rule evaluation.
 * Supports version comparison to only return profiles with newer versions.
 * 
 * Query Parameters:
 * - versions: JSON string - Object mapping profile IDs to local versions
 *   Example: {"prof_123":2,"prof_456":1}
 *   Returns only profiles with server version > local version
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

  // Check permissions - scanner operators need approval profile read permission
  const permissions = userProfile.role ? userProfile.role.permissions : {};
  const hasReadPermission = permissions?.approvalProfiles?.read === true || permissions?.all === true;

  if (!hasReadPermission) {
    return res.status(403).json({ 
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions to access approval profiles' }
    });
  }

  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const approvalProfilesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_APPROVAL_PROFILES_COLLECTION_ID!;

  try {
    // Parse versions parameter
    const { versions: versionsParam } = req.query;
    let localVersions: Record<string, number> = {};

    if (versionsParam && typeof versionsParam === 'string') {
      try {
        localVersions = JSON.parse(versionsParam);
        
        // Validate that it's an object with string keys and number values
        // Note: typeof null === 'object', so we must explicitly check for null
        if (typeof localVersions !== 'object' || localVersions === null || Array.isArray(localVersions)) {
          return res.status(400).json({
            success: false,
            error: { 
              code: 'VALIDATION_ERROR', 
              message: 'versions parameter must be a JSON object mapping profile IDs to version numbers' 
            }
          });
        }

        // Validate all values are numbers
        for (const [key, value] of Object.entries(localVersions)) {
          if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
            return res.status(400).json({
              success: false,
              error: { 
                code: 'VALIDATION_ERROR', 
                message: `Invalid version number for profile ${key}. Must be a non-negative integer.` 
              }
            });
          }
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid versions parameter. Must be valid JSON.' 
          }
        });
      }
    }

    // Fetch all non-deleted profiles
    const queries: string[] = [
      Query.equal('isDeleted', false),
      Query.orderDesc('$updatedAt'),
      Query.limit(100) // Reasonable limit for approval profiles
    ];

    const profilesResult = await databases.listDocuments(
      dbId,
      approvalProfilesCollectionId,
      queries
    );

    // Filter profiles based on version comparison
    // Include profiles that:
    // 1. Don't exist locally (not in localVersions)
    // 2. Have server version > local version
    const profilesToSync = profilesResult.documents.filter((profile: any) => {
      const localVersion = localVersions[profile.$id];
      
      // Profile doesn't exist locally - include it
      if (localVersion === undefined) {
        return true;
      }
      
      // Server version is greater than local version - include it
      return profile.version > localVersion;
    });

    // Map profiles to mobile-friendly format
    const profiles = profilesToSync.map((profile: any) => {
      // Parse rules from JSON string
      let rules;
      try {
        rules = typeof profile.rules === 'string' 
          ? JSON.parse(profile.rules) 
          : profile.rules;
      } catch (error) {
        console.error(`Failed to parse rules for profile ${profile.$id}:`, error);
        rules = { logic: 'AND', conditions: [] };
      }

      return {
        id: profile.$id,
        name: profile.name,
        description: profile.description || null,
        version: profile.version,
        rules,
        isDeleted: profile.isDeleted,
        updatedAt: profile.$updatedAt
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        profiles,
        syncTimestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[Mobile Sync Profiles] Error:', error);
    
    const errorResponse: any = {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to sync profiles'
      }
    };
    
    // Only include error details in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.error.details = error.message;
    }
    
    return res.status(500).json(errorResponse);
  }
});
