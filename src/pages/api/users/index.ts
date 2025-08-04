import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { checkApiPermission } from '@/lib/permissions';
import { shouldLog } from '@/lib/logSettings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Check read permission for users
        const readPermission = await checkApiPermission(user.id, 'users', 'read', prisma);
        if (!readPermission.hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to view users' });
        }

        const users = await prisma.user.findMany({
          include: {
            role: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        // Log the view action if enabled
        if (readPermission.user && await shouldLog('systemViewUsersList')) {
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'view',
              details: { type: 'users_list', count: users.length }
            }
          });
        }

        return res.status(200).json(users);

      case 'POST':
        // Check create permission for users
        const createPermission = await checkApiPermission(user.id, 'users', 'create', prisma);
        if (!createPermission.hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to create users' });
        }

        const { email, name, roleId } = req.body;

        if (!email || !name) {
          return res.status(400).json({ error: 'Email and name are required' });
        }

        // Check if user already exists in our database
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Validate role if provided
        if (roleId) {
          const role = await prisma.role.findUnique({
            where: { id: roleId }
          });

          if (!role) {
            return res.status(400).json({ error: 'Invalid role ID' });
          }
        }

        // Create user in our database with a proper UUID
        // The user will need to sign up separately to get a real Supabase auth account
        const tempId = randomUUID();
        
        const newUser = await prisma.user.create({
          data: {
            id: tempId,
            email,
            name,
            roleId,
            isInvited: true // Flag to indicate this is an invited user who hasn't signed up yet
          },
          include: {
            role: true
          }
        });

        // Log the create action
        if (createPermission.user) {
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'create',
              details: { 
                type: 'user_invitation',
                email: newUser.email,
                name: newUser.name,
                roleId: newUser.roleId
              }
            }
          });
        }

        return res.status(201).json(newUser);

      case 'PUT':
        // Check update permission for users
        const updatePermission = await checkApiPermission(user.id, 'users', 'update', prisma);
        if (!updatePermission.hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to update users' });
        }

        const { id, name: updateName, roleId: updateRoleId } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        // Validate role if provided
        if (updateRoleId) {
          const role = await prisma.role.findUnique({
            where: { id: updateRoleId }
          });

          if (!role) {
            return res.status(400).json({ error: 'Invalid role ID' });
          }
        }

        // Update user in our database
        const updatedUser = await prisma.user.update({
          where: { id },
          data: {
            name: updateName,
            roleId: updateRoleId
          },
          include: {
            role: true
          }
        });

        // Log the update action
        if (updatePermission.user) {
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'update',
              details: { 
                type: 'user',
                email: updatedUser.email,
                name: updatedUser.name,
                roleId: updatedUser.roleId
              }
            }
          });
        }

        return res.status(200).json(updatedUser);

      case 'DELETE':
        // Check delete permission for users
        const deletePermission = await checkApiPermission(user.id, 'users', 'delete', prisma);
        if (!deletePermission.hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to delete users' });
        }

        const { id: deleteId } = req.body;

        if (!deleteId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        // Don't allow deleting yourself
        if (deleteId === user.id) {
          return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Get user info before deletion for logging
        const userToDelete = await prisma.user.findUnique({
          where: { id: deleteId }
        });

        if (!userToDelete) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Delete user from our database
        await prisma.user.delete({
          where: { id: deleteId }
        });

        // Log the delete action
        if (deletePermission.user) {
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'delete',
              details: { 
                type: 'user',
                email: userToDelete.email,
                name: userToDelete.name
              }
            }
          });
        }

        return res.status(200).json({ message: 'User deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}