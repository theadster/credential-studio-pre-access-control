import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Create session client
    const { account, tablesDB } = createSessionClient(req);
    
    // Verify authentication
    const user = await account.get();

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    // Get current user's role for permission checking
    const userDocs = await tablesDB.listRows({
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID!,
      queries: [Query.equal('userId', user.$id)]
    });

    if (userDocs.rows.length === 0) {
      return res.status(403).json({ error: 'User not found or no role assigned' });
    }

    const userProfile = userDocs.rows[0];

    if (!userProfile.roleId) {
      return res.status(403).json({ error: 'User not found or no role assigned' });
    }

    // Get user's role
    const currentUserRole = await tablesDB.getRow({
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
      rowId: userProfile.roleId
    });

    // Only allow Super Administrators to run this fix
    if (currentUserRole.name !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrators can run this fix' });
    }

    // Find the Super Administrator role
    const superAdminRoleDocs = await tablesDB.listRows({
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
      queries: [Query.equal('name', 'Super Administrator')]
    });

    if (superAdminRoleDocs.rows.length === 0) {
      return res.status(404).json({ error: 'Super Administrator role not found' });
    }

    const superAdminRole = superAdminRoleDocs.rows[0];

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
    const updatedRole = await tablesDB.updateRow({
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
      rowId: superAdminRole.$id,
      data: {
        permissions: JSON.stringify(updatedPermissions)
      }
    });

    // Log the fix action
    try {
      await tablesDB.createRow({
        databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!,
        rowId: ID.unique(),
        data: {
          userId: user.$id,
          action: 'update',
          details: JSON.stringify({ 
            type: 'role_permission_fix',
            roleId: updatedRole.$id,
            roleName: updatedRole.name,
            addedPermission: 'logs:delete'
          })
        }
      });
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