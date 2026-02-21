import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { hasPermission } from '@/lib/permissions';
import { getRoleUserCount } from '@/lib/getRoleUserCount';
import { invalidateRoleUserCount } from '@/lib/roleUserCountCache';
import { validatePermissions } from '@/lib/validatePermissions';
import { executeTransactionWithRetry, handleTransactionError } from '@/lib/transactions';
import type { TransactionOperation } from '@/lib/transactions';
import { userProfileCache } from '@/lib/userProfileCache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Create session client
    const { account, tablesDB } = createSessionClient(req);

    // Verify authentication
    const user = await account.get();

    // Get user profile with role
    const userDocs = await tablesDB.listRows(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID!,
      [Query.equal('userId', user.$id)]
    );

    if (userDocs.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userProfile = userDocs.rows[0];

    // Get role if exists
    let currentUserRole = null;
    if (userProfile.roleId) {
      currentUserRole = await tablesDB.getRow(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
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
          role = await tablesDB.getRow(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
            id
          );
        } catch (error: any) {
          if (error.code === 404) {
            return res.status(404).json({ error: 'Role not found' });
          }
          throw error;
        }

        // Get user count for this role (with caching)
        const userCount = await getRoleUserCount(tablesDB, role.$id);

        const roleWithCount = {
          id: role.$id,
          name: role.name,
          description: role.description,
          createdAt: role.$createdAt,
          permissions: typeof role.permissions === 'string' 
            ? JSON.parse(role.permissions) 
            : role.permissions,
          _count: {
            users: userCount
          }
        };

        // Log the view action
        try {
          await tablesDB.createRow(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!,
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
          existingRole = await tablesDB.getRow(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
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
          const nameConflictDocs = await tablesDB.listRows(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
            [Query.equal('name', name)]
          );

          if (nameConflictDocs.rows.length > 0) {
            return res.status(400).json({ error: 'Role name already exists' });
          }
        }

        // Prevent modification of Super Administrator role by non-super admins
        if (existingRole.name === 'Super Administrator' && currentUserRole?.name !== 'Super Administrator') {
          return res.status(403).json({ error: 'Cannot modify Super Administrator role' });
        }

        // Create transaction operations for role update + audit log
        const logId = ID.unique();
        const logDetails = (await import('@/lib/logFormatting')).createRoleLogDetails('update', {
          name,
          id
        }, {
          changes: Object.keys({ name, description, permissions }).filter(k => ({ name, description, permissions } as any)[k] !== undefined)
        });

        const operations: TransactionOperation[] = [
          {
            action: 'update',
            databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
            rowId: id,
            data: {
              name,
              description: description || '',
              permissions: JSON.stringify(permissions)
            }
          },
          {
            action: 'create',
            databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!,
            rowId: logId,
            data: {
              userId: user.$id,
              action: 'update',
              details: JSON.stringify(logDetails)
            }
          }
        ];

        // Execute transaction with retry logic
        try {
          await executeTransactionWithRetry(tablesDB, operations);
          console.log('[Role Update] Transaction completed successfully');
        } catch (error: any) {
          console.error('[Role Update] Transaction failed:', error);
          return handleTransactionError(error, res);
        }

        // Invalidate cache for this role since it was updated
        invalidateRoleUserCount(id);
        
        // Invalidate user profile cache for all users with this role
        // This ensures they get fresh permissions on next API call
        userProfileCache.invalidateByRole(id);

        // Get updated role and user count
        const updatedRole = await tablesDB.getRow(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
          id
        );

        const updatedUserCount = await getRoleUserCount(tablesDB, updatedRole.$id);

        const updatedRoleWithCount = {
          id: updatedRole.$id,
          name: updatedRole.name,
          description: updatedRole.description,
          createdAt: updatedRole.$createdAt,
          permissions: typeof updatedRole.permissions === 'string' 
            ? JSON.parse(updatedRole.permissions) 
            : updatedRole.permissions,
          _count: {
            users: updatedUserCount
          }
        };

        return res.status(200).json(updatedRoleWithCount);

      case 'DELETE':
        // Check delete permission
        if (!currentUserRole || !hasPermission(currentUserRole, 'roles', 'delete')) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Get the role to delete
        let roleToDelete;
        try {
          roleToDelete = await tablesDB.getRow(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
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
        const userCountToDelete = await getRoleUserCount(tablesDB, roleToDelete.$id);

        if (userCountToDelete > 0) {
          return res.status(400).json({
            error: `Cannot delete role with ${userCountToDelete} assigned users. Please reassign users first.`
          });
        }

        // Create transaction operations for role delete + audit log
        const deleteLogId = ID.unique();
        const deleteLogDetails = (await import('@/lib/logFormatting')).createRoleLogDetails('delete', {
          name: roleToDelete.name,
          id: roleToDelete.$id
        });

        const deleteOperations: TransactionOperation[] = [
          {
            action: 'delete',
            databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
            rowId: id
          },
          {
            action: 'create',
            databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!,
            rowId: deleteLogId,
            data: {
              userId: user.$id,
              action: 'delete',
              details: JSON.stringify(deleteLogDetails)
            }
          }
        ];

        // Execute transaction with retry logic
        try {
          await executeTransactionWithRetry(tablesDB, deleteOperations);
          console.log('[Role Delete] Transaction completed successfully');
        } catch (error: any) {
          console.error('[Role Delete] Transaction failed:', error);
          return handleTransactionError(error, res);
        }

        // Invalidate cache for deleted role
        invalidateRoleUserCount(roleToDelete.$id);
        
        // Invalidate user profile cache for all users with this role
        userProfileCache.invalidateByRole(roleToDelete.$id);

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