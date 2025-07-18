import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

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
        const users = await prisma.user.findMany({
          include: {
            role: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        // Log the view action - only if user exists in our database
        const existingPrismaUser = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingPrismaUser) {
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
        const { email, name, roleId, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
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

        // Create user in Supabase Auth using admin API
        const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: name
          }
        });

        if (signUpError) {
          console.error('Supabase auth error:', signUpError);
          return res.status(400).json({ error: signUpError.message });
        }

        if (!authData.user) {
          return res.status(400).json({ error: 'Failed to create user in Supabase' });
        }

        // Create user in our database
        const newUser = await prisma.user.create({
          data: {
            id: authData.user.id,
            email,
            name,
            roleId
          },
          include: {
            role: true
          }
        });

        // Log the create action - only if user exists in our database
        const existingPrismaUserForCreate = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingPrismaUserForCreate) {
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'create',
              details: { 
                type: 'user',
                email: newUser.email,
                name: newUser.name,
                roleId: newUser.roleId
              }
            }
          });
        }

        return res.status(201).json(newUser);

      case 'PUT':
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

        // Update user metadata in Supabase if name changed
        if (updateName) {
          await supabase.auth.admin.updateUserById(id, {
            user_metadata: {
              full_name: updateName
            }
          });
        }

        // Log the update action - only if user exists in our database
        const existingPrismaUserForUpdate = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingPrismaUserForUpdate) {
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

        // Delete user from our database first
        await prisma.user.delete({
          where: { id: deleteId }
        });

        // Delete user from Supabase Auth
        const { error: deleteError } = await supabase.auth.admin.deleteUser(deleteId);
        
        if (deleteError) {
          console.error('Error deleting user from Supabase:', deleteError);
          // Note: User is already deleted from our DB, so we continue
        }

        // Log the delete action - only if user exists in our database
        const existingPrismaUserForDelete = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingPrismaUserForDelete) {
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