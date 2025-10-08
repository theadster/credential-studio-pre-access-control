import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';

const DEFAULT_ROLES = [
  {
    name: 'Super Administrator',
    description: 'Full system access with all permissions including user management and system configuration',
    permissions: {
      attendees: { create: true, read: true, update: true, delete: true, print: true, export: true, import: true, bulkEdit: true, bulkDelete: true, bulkGenerateCredentials: true, bulkGeneratePDFs: true },
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
      attendees: { create: true, read: true, update: true, delete: true, print: true, export: true, import: true, bulkEdit: true, bulkDelete: true, bulkGenerateCredentials: true, bulkGeneratePDFs: true },
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
      attendees: { create: true, read: true, update: true, delete: false, print: true, export: false, import: false, bulkEdit: false, bulkDelete: false, bulkGenerateCredentials: true, bulkGeneratePDFs: true },
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
      attendees: { create: false, read: true, update: false, delete: false, print: false, export: false, import: false, bulkEdit: false, bulkDelete: false, bulkGenerateCredentials: false, bulkGeneratePDFs: false },
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
  try {
    // Create session client
    const { account, databases } = createSessionClient(req);
    
    // Verify authentication
    const user = await account.get();

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    // Check if roles already exist
    const existingRoles = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
      [Query.limit(1)]
    );
    
    if (existingRoles.total > 0) {
      return res.status(400).json({ error: 'Roles already initialized' });
    }

    // Create the default roles
    const createdRoles: any[] = [];
    for (const roleData of DEFAULT_ROLES) {
      const role = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
        ID.unique(),
        {
          name: roleData.name,
          description: roleData.description,
          permissions: JSON.stringify(roleData.permissions)
        }
      );
      createdRoles.push(role);
    }

    // Log the initialization action
    try {
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
        ID.unique(),
        {
          userId: user.$id,
          action: 'create',
          details: JSON.stringify({ 
            type: 'roles_initialization',
            rolesCreated: createdRoles.map((r: any) => r.name)
          })
        }
      );
    } catch (logError) {
      console.error('Error creating log:', logError);
      // Continue even if logging fails
    }

    return res.status(201).json({
      message: 'Roles initialized successfully',
      roles: createdRoles
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