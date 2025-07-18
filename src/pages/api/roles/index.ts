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
        const roles = await prisma.role.findMany({
          include: {
            _count: {
              select: {
                users: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        // Log the view action
        await prisma.log.create({
          data: {
            userId: user.id,
            action: 'view',
            details: { type: 'roles_list', count: roles.length }
          }
        });

        return res.status(200).json(roles);

      case 'POST':
        const { name, description, permissions } = req.body;

        if (!name || !permissions) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if role name already exists
        const existingRole = await prisma.role.findUnique({
          where: { name }
        });

        if (existingRole) {
          return res.status(400).json({ error: 'Role name already exists' });
        }

        const newRole = await prisma.role.create({
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

        // Log the create action
        await prisma.log.create({
          data: {
            userId: user.id,
            action: 'create',
            details: { 
              type: 'role',
              roleName: newRole.name,
              permissions: Object.keys(permissions)
            }
          }
        });

        return res.status(201).json(newRole);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}