import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Create session client
    const { account, databases } = createSessionClient(req);
    
    // Verify authentication
    const user = await account.get();

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    // Get current user's role for permission checking
    const userDocs = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
      [Query.equal('userId', user.$id)]
    );

    if (userDocs.documents.length === 0) {
      return res.status(403).json({ error: 'User not found or no role assigned' });
    }

    const userProfile = userDocs.documents[0];

    if (!userProfile.roleId) {
      return res.status(403).json({ error: 'User not found or no role assigned' });
    }

    // Get user's role
    const currentUserRole = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
      userProfile.roleId
    );

    // Only allow Super Administrators to run this fix
    if (currentUserRole.name !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrators can run this fix' });
    }

    // Find the Super Administrator role
    const superAdminRoleDocs = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
      [Query.equal('name', 'Super Administrator')]
    );

    if (superAdminRoleDocs.documents.length === 0) {
      return res.status(404).json({ error: 'Super Administrator role not found' });
    }

    const superAdminRole = superAdminRoleDocs.documents[0];

    // Parse current permissions
    let currentPermissions;
    try {
      currentPermissions = JSON.parse(superAdminRole.permissions);
    } catch (parseError) {
      console.error('Error parsing role permissions:', parseError);
      return res.status(500).json({
        error: 'Role permissions data is corrupted',
        details: 'Unable to parse permissions JSON'
      });
    }

    // Check if logs delete permission is already present
    if (currentPermissions?.logs?.delete === true) {
      return res.status(200).json({ 
        message: 'Super Administrator role already has logs delete permission',
        alreadyFixed: true 
      });
    }

    // Update the permissions to include logs delete
    const updatedPermissions = {
      ...currentPermissions,
      logs: {
        ...currentPermissions.logs,
        delete: true
      }
    };

    // Update the role
    const updatedRole = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
      superAdminRole.$id,
      {
        permissions: JSON.stringify(updatedPermissions)
      }
    );

    // Log the fix action
    try {
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
        ID.unique(),
        {
          userId: user.$id,
          action: 'update',
          details: JSON.stringify({ 
            type: 'role_permission_fix',
            roleId: updatedRole.$id,
            roleName: updatedRole.name,
            addedPermission: 'logs:delete'
          })
        }
      );
    } catch (logError) {
      console.error('Error creating log:', logError);
      // Continue even if logging fails
    }

    return res.status(200).json({
      message: 'Super Administrator role updated with logs delete permission',
      role: updatedRole,
      fixed: true
    });

  } catch (error: any) {
    console.error('API Error:', error);
    
    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}