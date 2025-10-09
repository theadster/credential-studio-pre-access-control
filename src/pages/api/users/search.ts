import { NextApiResponse } from 'next';
import { Query, ID } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { hasPermission } from '@/lib/permissions';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { ApiError, ErrorCode, handleApiError, validateInput, withRetry } from '@/lib/errorHandling';

/**
 * POST /api/users/search
 * 
 * Search Appwrite auth users with pagination and filtering
 * Returns users with verification status and link status
 * 
 * Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 9.2
 */
export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { user, userProfile } = req;

    // Extract role from userProfile for permission checks
    const role = userProfile.role ? {
      ...userProfile.role,
      permissions: userProfile.role.permissions
    } : null;

    // Check read permission for users (Requirement 9.2)
    if (!hasPermission(role, 'users', 'read')) {
      throw new ApiError(
        'Insufficient permissions to search users',
        ErrorCode.PERMISSION_DENIED,
        403
      );
    }
    // Parse request body
    const { q = '', page = 1, limit = 25 } = req.body;

    // Validate and sanitize pagination parameters (Requirement 7.3)
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 25)); // Cap at 100
    const pageOffset = (pageNum - 1) * limitNum;

    // Create admin client to access Users API
    const adminClient = createAdminClient();
    const { users, databases } = adminClient;

    // Build queries for Appwrite Users API
    const queries: string[] = [
      Query.limit(limitNum),
      Query.offset(pageOffset)
    ];

    // Add search query if provided (Requirement 2.2)
    // Appwrite supports searching by email and name
    if (q && q.trim()) {
      queries.push(Query.search('email', q.trim()));
    }

    // Fetch auth users from Appwrite with retry logic (Requirement 7.5)
    const authUsersResponse = await withRetry(
      () => users.list(queries),
      { maxRetries: 2 }
    );

    // Get list of linked user IDs from database (Requirement 2.4)
    // Fetch all linked users with pagination
    let allLinkedUsers: any[] = [];
    let batchOffset = 0;
    const batchSize = 500; // Reduced from 1000
    let hasMore = true;
    const maxIterations = 100; // Safety limit
    let iterations = 0;

    while (hasMore && iterations < maxIterations) {
      try {
        const batch = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          [Query.select(['userId']), Query.limit(batchSize), Query.offset(batchOffset)]
        );
        allLinkedUsers.push(...batch.documents);
        batchOffset += batchSize;
        hasMore = batch.documents.length === batchSize;
        iterations++;
      } catch (error) {
        console.error('Error fetching linked users batch:', error);
        throw new ApiError(
          'Failed to fetch linked users',
          ErrorCode.DATABASE_ERROR,
          500
        );
      }
    }

    if (iterations >= maxIterations) {
      console.warn('Max iterations reached while fetching linked users');
    }

    const linkedUsersResponse = { documents: allLinkedUsers };

    const linkedUserIds = new Set(
      linkedUsersResponse.documents.map((doc: any) => doc.userId)
    );

    // Map auth users to response format with link status (Requirements 2.3, 2.4)
    const usersWithStatus = authUsersResponse.users.map((authUser: any) => ({
      $id: authUser.$id,
      email: authUser.email,
      name: authUser.name,
      $createdAt: authUser.$createdAt,
      emailVerification: authUser.emailVerification, // Requirement 2.3
      phoneVerification: authUser.phoneVerification,
      isLinked: linkedUserIds.has(authUser.$id) // Requirement 2.4
    }));

    // Calculate pagination info (Requirement 2.1)
    const totalPages = Math.ceil(authUsersResponse.total / limitNum);

    // Log the search action (Requirement 9.7)
    if (user) {
      try {
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
          ID.unique(),
          {
            userId: user.$id,
            action: 'auth_users_searched',
            details: JSON.stringify({
              type: 'auth_user_search',
              operation: 'search',
              searchQuery: q || null,
              resultsCount: usersWithStatus.length,
              totalResults: authUsersResponse.total,
              page: pageNum,
              limit: limitNum,
              timestamp: new Date().toISOString()
            })
          }
        );
      } catch (logError) {
        // Log error but don't fail the request
        console.error('Error logging auth user search:', logError);
      }
    }

    // Return response
    return res.status(200).json({
      users: usersWithStatus,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: authUsersResponse.total,
        totalPages
      }
    });

  } catch (error: any) {
    // Use centralized error handling (Requirement 7.1, 7.6)
    handleApiError(error, res);
  }
});
