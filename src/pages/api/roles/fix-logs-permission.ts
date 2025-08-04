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

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Get current user's role for permission checking
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true }
    });

    if (!currentUser || !currentUser.role) {
      return res.status(403).json({ error: 'User not found or no role assigned' });
    }

    // Only allow Super Administrators to run this fix
    if (currentUser.role.name !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrators can run this fix' });
    }

    // Find the Super Administrator role
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'Super Administrator' }
    });

    if (!superAdminRole) {
      return res.status(404).json({ error: 'Super Administrator role not found' });
    }

    // Check if logs delete permission is already present
    const currentPermissions = superAdminRole.permissions as any;
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

    const updatedRole = await prisma.role.update({
      where: { id: superAdminRole.id },
      data: {
        permissions: updatedPermissions
      }
    });

    // Log the fix action
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'update',
        details: { 
          type: 'role_permission_fix',
          roleId: updatedRole.id,
          roleName: updatedRole.name,
          addedPermission: 'logs:delete'
        }
      }
    });

    return res.status(200).json({
      message: 'Super Administrator role updated with logs delete permission',
      role: updatedRole,
      fixed: true
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}