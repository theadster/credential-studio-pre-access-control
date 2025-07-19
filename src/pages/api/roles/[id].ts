import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { hasPermission } from '@/lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get current user's role for permission checking
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { role: true }
  });

  if (!currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if user has permission to manage roles
  if (!hasPermission(currentUser.role, 'roles', 'update') && req.method !== 'GET') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Role ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Check read permission
        if (!hasPermission(currentUser.role, 'roles', 'read')) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const role = await prisma.role.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                users: true
              }
            }
          }
        });

        if (!role) {
          return res.status(404).json({ error: 'Role not found' });
        }

        // Log the view action
        await prisma.log.create({
          data: {
            userId: user.id,
            action: 'view',
            details: { type: 'role', roleId: role.id, roleName: role.name }
          }
        });

        return res.status(200).json(role);

      case 'PUT':
        const { name, description, permissions } = req.body;

        if (!name || !permissions) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if role exists
        const existingRole = await prisma.role.findUnique({
          where: { id }
        });

        if (!existingRole) {
          return res.status(404).json({ error: 'Role not found' });
        }

        // Check if new name conflicts with another role
        if (name !== existingRole.name) {
          const nameConflict = await prisma.role.findUnique({
            where: { name }
          });

          if (nameConflict) {
            return res.status(400).json({ error: 'Role name already exists' });
          }
        }

        // Prevent modification of Super Administrator role by non-super admins
        if (existingRole.name === 'Super Administrator' && currentUser.role?.name !== 'Super Administrator') {
          return res.status(403).json({ error: 'Cannot modify Super Administrator role' });
        }

        const updatedRole = await prisma.role.update({
          where: { id },
          data: {
            name,
            description,
            permissions
          },
          include: {
            _count: {
              select: {
                users: true
              }
            }
          }
        });

        // Log the update action
        await prisma.log.create({
          data: {
            userId: user.id,
            action: 'update',
            details: { 
              type: 'role',
              roleId: updatedRole.id,
              roleName: updatedRole.name,
              changes: { name, description, permissions }
            }
          }
        });

        return res.status(200).json(updatedRole);

      case 'DELETE':
        // Check delete permission
        if (!hasPermission(currentUser.role, 'roles', 'delete')) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const roleToDelete = await prisma.role.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                users: true
              }
            }
          }
        });

        if (!roleToDelete) {
          return res.status(404).json({ error: 'Role not found' });
        }

        // Prevent deletion of Super Administrator role
        if (roleToDelete.name === 'Super Administrator') {
          return res.status(403).json({ error: 'Cannot delete Super Administrator role' });
        }

        // Check if role has users assigned
        if (roleToDelete._count.users > 0) {
          return res.status(400).json({ 
            error: `Cannot delete role with ${roleToDelete._count.users} assigned users. Please reassign users first.` 
          });
        }

        await prisma.role.delete({
          where: { id }
        });

        // Log the delete action
        await prisma.log.create({
          data: {
            userId: user.id,
            action: 'delete',
            details: { 
              type: 'role',
              roleId: roleToDelete.id,
              roleName: roleToDelete.name
            }
          }
        });

        return res.status(200).json({ message: 'Role deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}