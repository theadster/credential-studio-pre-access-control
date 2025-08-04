import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

const DEFAULT_ROLES = [
  {
    name: 'Super Administrator',
    description: 'Full system access with all permissions including user management and system configuration',
    permissions: {
      attendees: { create: true, read: true, update: true, delete: true, print: true, export: true, import: true },
      users: { create: true, read: true, update: true, delete: true },
      roles: { create: true, read: true, update: true, delete: true },
      eventSettings: { create: true, read: true, update: true, delete: true },
      customFields: { create: true, read: true, update: true, delete: true },
      logs: { read: true, delete: true, export: true, configure: true },
      system: { configure: true, backup: true, restore: true }
    }
  },
  {
    name: 'Event Manager',
    description: 'Full event management access including attendees, settings, and printing',
    permissions: {
      attendees: { create: true, read: true, update: true, delete: true, print: true, export: true, import: true },
      users: { read: true },
      roles: { read: true },
      eventSettings: { create: true, read: true, update: true, delete: false },
      customFields: { create: true, read: true, update: true, delete: true },
      logs: { read: true, export: true, configure: false },
      system: { configure: false, backup: false, restore: false }
    }
  },
  {
    name: 'Registration Staff',
    description: 'Attendee management and credential printing access',
    permissions: {
      attendees: { create: true, read: true, update: true, delete: false, print: true, export: false, import: false },
      users: { read: false },
      roles: { read: false },
      eventSettings: { create: false, read: true, update: false, delete: false },
      customFields: { create: false, read: true, update: false, delete: false },
      logs: { read: false, export: false, configure: false },
      system: { configure: false, backup: false, restore: false }
    }
  },
  {
    name: 'Viewer',
    description: 'Read-only access to attendee information',
    permissions: {
      attendees: { create: false, read: true, update: false, delete: false, print: false, export: false, import: false },
      users: { read: false },
      roles: { read: false },
      eventSettings: { create: false, read: true, update: false, delete: false },
      customFields: { create: false, read: true, update: false, delete: false },
      logs: { read: false, export: false, configure: false },
      system: { configure: false, backup: false, restore: false }
    }
  }
];

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
    // Check if roles already exist
    const existingRoles = await prisma.role.findMany();
    
    if (existingRoles.length > 0) {
      return res.status(400).json({ error: 'Roles already initialized' });
    }

    // Create the default roles
    const createdRoles: any[] = [];
    for (const roleData of DEFAULT_ROLES) {
      const role = await prisma.role.create({
        data: roleData
      });
      createdRoles.push(role);
    }

    // Log the initialization action (defensive check)
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    
    if (existingUser) {
      await prisma.log.create({
        data: {
          userId: user.id,
          action: 'create',
          details: { 
            type: 'roles_initialization',
            rolesCreated: createdRoles.map((r: any) => r.name)
          }
        }
      });
    }

    return res.status(201).json({
      message: 'Roles initialized successfully',
      roles: createdRoles
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}