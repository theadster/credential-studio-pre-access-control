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

        // Log the view action
        await prisma.log.create({
          data: {
            userId: user.id,
            action: 'view',
            details: { type: 'users_list', count: users.length }
          }
        });

        return res.status(200).json(users);

      case 'POST':
        const { email, name, roleId } = req.body;

        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user already exists
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

        // Note: This creates a user record in our database, but doesn't create
        // an actual Supabase auth user. In a real implementation, you'd want to
        // invite the user via Supabase Auth or handle user creation differently.
        const newUser = await prisma.user.create({
          data: {
            id: `temp_${Date.now()}`, // Temporary ID until Supabase user is created
            email,
            name,
            roleId
          },
          include: {
            role: true
          }
        });

        // Log the create action
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

        return res.status(201).json(newUser);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}