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
    const { account, databases } = createSessionClient(req);
    
    // Get the authenticated user
    let user;
    try {
      user = await account.get();
    } catch (authError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user profile with role
    const userDocs = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
      [Query.equal('userId', user.$id)]
    );

    if (userDocs.documents.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userProfile = userDocs.documents[0];

    // Get role if exists
    let role = null;
    if (userProfile.roleId) {
      try {
        role = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
          userProfile.roleId
        );
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

    // Fetch all Appwrite Auth users
    const authUsers = await adminClient.users.list();

    // Fetch all user profiles from database to find which are already linked
    const linkedUserDocs = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
      [Query.limit(1000)] // Adjust limit as needed
    );

    // Create a set of linked user IDs for quick lookup
    const linkedUserIds = new Set(
      linkedUserDocs.documents.map(doc => doc.userId)
    );

    // Filter auth users to find those not yet linked to database
    const unlinkedUsers = authUsers.users
      .filter(authUser => !linkedUserIds.has(authUser.$id))
      .map(authUser => ({
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
