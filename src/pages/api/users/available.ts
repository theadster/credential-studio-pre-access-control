import { NextApiRequest, NextApiResponse } from 'next';
import { Query } from 'appwrite';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { hasPermission } from '@/lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Create session client to verify authentication
    const { account, tablesDB } = createSessionClient(req);

    // Get the authenticated user
    let user;
    try {
      user = await account.get();
    } catch (authError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user profile with role
    const userDocs = await tablesDB.listRows({
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID!,
      queries: [Query.equal('userId', user.$id)]
    });

    if (userDocs.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userProfile = userDocs.rows[0];

    // Get role if exists
    let role = null;
    if (userProfile.roleId) {
      try {
        role = await tablesDB.getRow({
          databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
          rowId: userProfile.roleId
        });
      } catch (error) {
        console.warn('Failed to fetch role:', error);
      }
    }

    // Check if user has permission to view users (admin only)
    if (!hasPermission(role, 'users', 'read')) {
      return res.status(403).json({ error: 'Insufficient permissions to view available users' });
    }

    // Create admin client to fetch all auth users
    const adminClient = createAdminClient();

    // Fetch all Appwrite Auth users with pagination
    let allAuthUsers: any[] = [];
    let lastUserId: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await adminClient.users.list({
        queries: lastUserId ? [Query.cursorAfter(lastUserId)] : []
      });
      allAuthUsers = allAuthUsers.concat(response.users);
      hasMore = response.users.length === 100;
      if (hasMore) {
        lastUserId = response.users[response.users.length - 1].$id;
      }
    }

    // Fetch all user profiles from database to find which are already linked
    let allProfiles: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMoreProfiles = true;

    while (hasMoreProfiles) {
      const response = await tablesDB.listRows({
        databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        tableId: process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID!,
        queries: [Query.limit(limit), Query.offset(offset)]
      });
      allProfiles = allProfiles.concat(response.rows);
      hasMoreProfiles = response.rows.length === limit;
      offset += limit;
    }

    // Create a set of linked user IDs for quick lookup
    const linkedUserIds = new Set(
      allProfiles.map((doc: any) => doc.userId)
    );

    // Filter auth users to find those not yet linked to database
    const unlinkedUsers = allAuthUsers
      .filter((authUser: any) => !linkedUserIds.has(authUser.$id))
      .map((authUser: any) => ({
        userId: authUser.$id,
        email: authUser.email,
        name: authUser.name,
        createdAt: authUser.$createdAt,
        emailVerification: authUser.emailVerification,
        status: authUser.status
      }));

    return res.status(200).json({
      users: unlinkedUsers,
      total: unlinkedUsers.length
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
