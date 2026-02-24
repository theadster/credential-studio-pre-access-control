import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';

/**
 * Represents a successfully created role with Appwrite document metadata
 */
interface CreatedRoleResult {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  description: string;
  permissions: string;
  [key: string]: any; // Allow additional Appwrite metadata fields
}

/**
 * Represents a failed role creation attempt
 */
interface FailedRoleResult {
  name: string;
  error: string;
}

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
      system: { configure: true, backup: true, restore: true },
      accessControl: { read: true, write: true },
      approvalProfiles: { read: true, write: true, delete: true },
      scanLogs: { read: true, export: true },
      reports: { create: true, read: true, update: true, delete: true }
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
      system: { configure: false, backup: false, restore: false },
      accessControl: { read: true, write: true },
      approvalProfiles: { read: true, write: true, delete: true },
      scanLogs: { read: true, export: true },
      reports: { create: true, read: true, update: true, delete: true }
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
      system: { configure: false, backup: false, restore: false },
      accessControl: { read: true, write: true },
      approvalProfiles: { read: true, write: false, delete: false },
      scanLogs: { read: true, export: false },
      reports: { create: true, read: true, update: true, delete: false }
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
      system: { configure: false, backup: false, restore: false },
      accessControl: { read: true, write: false },
      approvalProfiles: { read: true, write: false, delete: false },
      scanLogs: { read: true, export: false },
      reports: { create: false, read: true, update: false, delete: false }
    }
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method first to prevent information leakage
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Create session client
    const { account, tablesDB } = createSessionClient(req);

    // Verify authentication
    const user = await account.get();

    // Check if user is authorized to initialize roles
    const userDocs = await tablesDB.listRows({
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID!,
      queries: [Query.equal('userId', user.$id)]
    });

    if (userDocs.rows.length === 0 || !userDocs.rows[0].roleId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const userRole = await tablesDB.getRow({
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
      rowId: userDocs.rows[0].roleId
    });

    if (userRole.name !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrators can initialize roles' });
    }

    // Check if roles already exist
    const existingRoles = await tablesDB.listRows({
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
      queries: [Query.limit(1)]
    });

    if (existingRoles.total > 0) {
      return res.status(400).json({ error: 'Roles already initialized' });
    }

    // Create the default roles
    const createdRoles: CreatedRoleResult[] = [];
    const failedRoles: FailedRoleResult[] = [];

    for (const roleData of DEFAULT_ROLES) {
      try {
        const role = await tablesDB.createRow({
          databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
          rowId: ID.unique(),
          data: {
            name: roleData.name,
            description: roleData.description,
            permissions: JSON.stringify(roleData.permissions)
          }
        });
        createdRoles.push(role as unknown as CreatedRoleResult);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failedRoles.push({ name: roleData.name, error: errorMessage });
      }
    }

    if (failedRoles.length > 0) {
      return res.status(207).json({
        message: 'Roles partially initialized',
        created: createdRoles,
        failed: failedRoles
      });
    }

    // Log the initialization action
    try {
      await tablesDB.createRow({
        databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!,
        rowId: ID.unique(),
        data: {
          userId: user.$id,
          action: 'create',
          details: JSON.stringify({
            type: 'roles_initialization',
            rolesCreated: createdRoles.map((r) => r.name)
          })
        }
      });
    } catch (logError: unknown) {
      const errorMessage = logError instanceof Error ? logError.message : 'Unknown error';
      console.error('Error creating log:', errorMessage);
      // Continue even if logging fails
    }

    return res.status(201).json({
      message: 'Roles initialized successfully',
      roles: createdRoles
    });

  } catch (error: unknown) {
    console.error('API Error:', error);

    // Handle Appwrite-specific errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}