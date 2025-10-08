import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { Models, Query } from 'node-appwrite';
import { createSessionClient } from '@/lib/appwrite';
import { handleApiError } from '@/lib/apiErrorHandler';

/**
 * User profile structure with role information
 */
export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  name: string;
  roleId: string | null;
  isInvited: boolean;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    description: string;
    permissions: Record<string, any>;
  } | null;
}

/**
 * Extended request object with authenticated user and profile
 */
export interface AuthenticatedRequest extends NextApiRequest {
  user: Models.User<Models.Preferences>;
  userProfile: UserProfile;
}

/**
 * API handler type that receives authenticated request
 */
export type AuthenticatedApiHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void> | void;

/**
 * Authentication middleware for API routes
 * 
 * Verifies JWT token, fetches user profile and role information,
 * and attaches them to the request object for use in route handlers.
 * 
 * @param handler - The API route handler to wrap with authentication
 * @returns Wrapped handler with authentication
 * 
 * @example
 * ```typescript
 * export default withAuth(async (req, res) => {
 *   // req.user and req.userProfile are now available
 *   const { user, userProfile } = req;
 *   
 *   // Check permissions
 *   if (!userProfile.role?.permissions.canViewUsers) {
 *     return res.status(403).json({ error: 'Forbidden' });
 *   }
 *   
 *   // Handle request...
 * });
 * ```
 */
export function withAuth(handler: AuthenticatedApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    const endpoint = req.url || 'unknown';
    const method = req.method || 'unknown';
    
    try {
      // Create session client with JWT from cookie
      const { account, databases } = createSessionClient(req);
      
      // Verify authentication by fetching user
      let user: Models.User<Models.Preferences>;
      try {
        user = await account.get();
        
        console.log('[API Middleware] ✓ Authentication successful', {
          timestamp: new Date().toISOString(),
          userId: user.$id,
          email: user.email,
          endpoint,
          method,
        });
      } catch (authError: any) {
        // Authentication failed - use error handler for consistent response
        console.error('[API Middleware] ✗ Authentication failed', {
          timestamp: new Date().toISOString(),
          endpoint,
          method,
          error: authError.message || 'Unknown error',
          errorType: authError.type || 'unknown',
          errorCode: authError.code || 'unknown',
        });
        
        return handleApiError(authError, res, { logError: true }, {
          endpoint,
          method,
          userId: 'unauthenticated',
        });
      }
      
      // Fetch user profile from database
      const userDocs = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        [Query.equal('userId', user.$id)]
      );
      
      if (userDocs.documents.length === 0) {
        console.error('[API Middleware] ✗ User profile not found', {
          timestamp: new Date().toISOString(),
          userId: user.$id,
          endpoint,
          method,
        });
        
        return res.status(404).json({ 
          error: 'User profile not found',
          code: 404,
          type: 'profile_not_found',
          message: 'User profile does not exist in the database'
        });
      }
      
      const userProfileDoc = userDocs.documents[0];
      
      // Fetch role information if user has a role assigned
      let role = null;
      if (userProfileDoc.roleId) {
        try {
          const roleDoc = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
            userProfileDoc.roleId
          );
          
          // Parse permissions if stored as string
          const permissions = typeof roleDoc.permissions === 'string' 
            ? JSON.parse(roleDoc.permissions) 
            : roleDoc.permissions;
          
          role = {
            id: roleDoc.$id,
            name: roleDoc.name,
            description: roleDoc.description,
            permissions: permissions
          };
        } catch (roleError) {
          // Log warning but continue - role fetch is not critical
          console.warn('[API Middleware] Failed to fetch role', {
            timestamp: new Date().toISOString(),
            userId: user.$id,
            roleId: userProfileDoc.roleId,
            error: roleError instanceof Error ? roleError.message : 'Unknown error',
          });
        }
      }
      
      // Build user profile object
      const userProfile: UserProfile = {
        id: userProfileDoc.$id,
        userId: userProfileDoc.userId,
        email: userProfileDoc.email,
        name: userProfileDoc.name,
        roleId: userProfileDoc.roleId,
        isInvited: userProfileDoc.isInvited,
        createdAt: userProfileDoc.$createdAt,
        updatedAt: userProfileDoc.$updatedAt,
        role: role
      };
      
      // Attach user and profile to request object
      (req as AuthenticatedRequest).user = user;
      (req as AuthenticatedRequest).userProfile = userProfile;
      
      const authDuration = Date.now() - startTime;
      console.log('[API Middleware] Request authenticated', {
        timestamp: new Date().toISOString(),
        userId: user.$id,
        endpoint,
        method,
        authDurationMs: authDuration,
        hasRole: !!role,
      });
      
      // Call the actual handler with authenticated request
      return await handler(req as AuthenticatedRequest, res);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      console.error('[API Middleware] ✗ Unexpected error', {
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        durationMs: duration,
        error: error.message || 'Unknown error',
        errorType: error.type || 'unknown',
      });
      
      // Handle any unexpected errors with consistent error handler
      return handleApiError(error, res, { 
        logError: true,
        includeStack: process.env.NODE_ENV === 'development'
      }, {
        endpoint,
        method,
        durationMs: duration,
      });
    }
  };
}

/**
 * Helper function to check if a user has a specific permission
 * 
 * @param userProfile - The user profile with role information
 * @param permission - The permission key to check (e.g., 'canViewUsers')
 * @returns true if user has the permission
 */
export function hasPermission(
  userProfile: UserProfile,
  permission: string
): boolean {
  if (!userProfile.role || !userProfile.role.permissions) {
    return false;
  }
  
  return userProfile.role.permissions[permission] === true;
}

/**
 * Middleware that requires a specific permission
 * Returns 403 Forbidden if user doesn't have the permission
 * 
 * @param permission - The required permission key
 * @param handler - The API route handler
 * @returns Wrapped handler with permission check
 * 
 * @example
 * ```typescript
 * export default withPermission('canManageUsers', async (req, res) => {
 *   // User is guaranteed to have canManageUsers permission
 *   // Handle request...
 * });
 * ```
 */
export function withPermission(
  permission: string,
  handler: AuthenticatedApiHandler
): NextApiHandler {
  return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Check if user has required permission
    if (!hasPermission(req.userProfile, permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 403,
        type: 'insufficient_permissions',
        message: `You do not have permission to perform this action. Required: ${permission}`
      });
    }
    
    // User has permission, proceed with handler
    return await handler(req, res);
  });
}
