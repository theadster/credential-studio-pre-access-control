import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { hasPermission } from '@/lib/permissions';
import { getRoleUserCount } from '@/lib/getRoleUserCount';
import { invalidateRoleUserCount } from '@/lib/roleUserCountCache';
import { validatePermissions } from '@/lib/validatePermissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Create session client
    const { account, databases } = createSessionClient(req);

    // Verify authentication
    const user = await account.get();

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
    let currentUserRole = null;
    if (userProfile.roleId) {
      currentUserRole = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
        userProfile.roleId
      );
      // Parse permissions JSON
      // Parse permissions JSON
      if (currentUserRole.permissions) {
        try {
          currentUserRole.permissions = JSON.parse(currentUserRole.permissions);
        } catch (error) {
          console.error('Invalid permissions JSON:', error);
          currentUserRole.permissions = {};
        }
      }
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Role ID is required' });
    }

    switch (req.method) {
      case 'GET':
        // Check read permission
        if (!currentUserRole || !hasPermission(currentUserRole, 'roles', 'read')) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Get the role
        let role;
        try {
          role = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
            id
          );
        } catch (error: any) {
          if (error.code === 404) {
            return res.status(404).json({ error: 'Role not found' });
          }
          throw error;
        }

        // Get user count for this role (with caching)
        const userCount = await getRoleUserCount(databases, role.$id);

        const roleWithCount = {
          ...role,
          _count: {
            users: userCount
          }
        };

        // Log the view action
        try {
          await databases.createDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
            ID.unique(),
            {
              userId: user.$id,
              action: 'view',
              details: JSON.stringify((await import('@/lib/logFormatting')).createRoleLogDetails('view', {
                name: role.name,
                id: role.$id
              }))
            }
          );
        } catch (logError) {
          console.error('Error creating log:', logError);
        }

        return res.status(200).json(roleWithCount);

      case 'PUT':
        // Check update permission
        if (!currentUserRole || !hasPermission(currentUserRole, 'roles', 'update')) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const { name, description, permissions } = req.body;

        if (!name || !permissions) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate permissions structure using utility
        const validationResult = validatePermissions(permissions);
        if (!validationResult.valid) {
          if (validationResult.details?.unknownKeys) {
            console.warn('Unknown permission keys detected:', validationResult.details.unknownKeys);
          }
          return res.status(400).json({
            error: validationResult.error,
            ...(validationResult.details?.message && { message: validationResult.details.message }),
            ...(validationResult.details?.unknownKeys && { unknownKeys: validationResult.details.unknownKeys }),
            ...(validationResult.details?.key && { key: validationResult.details.key })
          });
        }

        // Check if role exists
        let existingRole;
        try {
          existingRole = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
            id
          );
        } catch (error: any) {
          if (error.code === 404) {
            return res.status(404).json({ error: 'Role not found' });
          }
          throw error;
        }

        // Check if new name conflicts with another role
        if (name !== existingRole.name) {
          const nameConflictDocs = await databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
            [Query.equal('name', name)]
          );

          if (nameConflictDocs.documents.length > 0) {
            return res.status(400).json({ error: 'Role name already exists' });
          }
        }

        // Prevent modification of Super Administrator role by non-super admins
        if (existingRole.name === 'Super Administrator' && currentUserRole?.name !== 'Super Administrator') {
          return res.status(403).json({ error: 'Cannot modify Super Administrator role' });
        }

        // Update the role
        const updatedRole = await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
          id,
          {
            name,
            description: description || '',
            permissions: JSON.stringify(permissions)
          }
        );

        // Invalidate cache for this role since it was updated
        invalidateRoleUserCount(updatedRole.$id);

        // Get user count for updated role (will refresh cache)
        const updatedUserCount = await getRoleUserCount(databases, updatedRole.$id);

        const updatedRoleWithCount = {
          ...updatedRole,
          _count: {
            users: updatedUserCount
          }
        };

        // Log the update action
        try {
          await databases.createDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
            ID.unique(),
            {
              userId: user.$id,
              action: 'update',
              details: JSON.stringify((await import('@/lib/logFormatting')).createRoleLogDetails('update', {
                name: updatedRole.name,
                id: updatedRole.$id
              }, {
                changes: Object.keys({ name, description, permissions }).filter(k => ({ name, description, permissions } as any)[k] !== undefined)
              }))
            }
          );
        } catch (logError) {
          console.error('Error creating log:', logError);
        }

        return res.status(200).json(updatedRoleWithCount);

      case 'DELETE':
        // Check delete permission
        if (!currentUserRole || !hasPermission(currentUserRole, 'roles', 'delete')) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Get the role to delete
        let roleToDelete;
        try {
          roleToDelete = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
            id
          );
        } catch (error: any) {
          if (error.code === 404) {
            return res.status(404).json({ error: 'Role not found' });
          }
          throw error;
        }

        // Prevent deletion of Super Administrator role
        if (roleToDelete.name === 'Super Administrator') {
          return res.status(403).json({ error: 'Cannot delete Super Administrator role' });
        }

        // Check if role has users assigned (with caching)
        const userCountToDelete = await getRoleUserCount(databases, roleToDelete.$id);

        if (userCountToDelete > 0) {
          return res.status(400).json({
            error: `Cannot delete role with ${userCountToDelete} assigned users. Please reassign users first.`
          });
        }

        // Delete the role
        await databases.deleteDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
          id
        );

        // Invalidate cache for deleted role
        invalidateRoleUserCount(roleToDelete.$id);

        // Log the delete action
        try {
          await databases.createDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
            ID.unique(),
            {
              userId: user.$id,
              action: 'delete',
              details: JSON.stringify((await import('@/lib/logFormatting')).createRoleLogDetails('delete', {
                name: roleToDelete.name,
                id: roleToDelete.$id
              }))
            }
          );
        } catch (logError) {
          console.error('Error creating log:', logError);
        }

        return res.status(200).json({ message: 'Role deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('API Error:', error);

    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}