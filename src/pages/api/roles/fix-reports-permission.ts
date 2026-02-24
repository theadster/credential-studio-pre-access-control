/**
 * Fix Reports Permission API
 *
 * One-time migration endpoint to add `reports` permissions to all existing roles
 * that were created before the reports feature was added.
 *
 * Only callable by Super Administrators.
 */

import { NextApiResponse } from 'next';
import { Query } from 'node-appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { createSessionClient } from '@/lib/appwrite';

const REPORTS_PERMISSIONS_BY_ROLE: Record<string, object> = {
  'Super Administrator': { create: true, read: true, update: true, delete: true },
  'Event Manager':       { create: true, read: true, update: true, delete: true },
  'Registration Staff':  { create: true, read: true, update: true, delete: false },
  'Viewer':              { create: false, read: true, update: false, delete: false },
};

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { userProfile } = req;
  const currentUserRole = userProfile.role;

  if (currentUserRole?.name !== 'Super Administrator') {
    return res.status(403).json({ error: 'Only Super Administrators can run this fix' });
  }

  const { tablesDB } = createSessionClient(req);
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const rolesTableId = process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID;

  if (!databaseId || !rolesTableId) {
    return res.status(500).json({ 
      error: 'Missing required environment variables: NEXT_PUBLIC_APPWRITE_DATABASE_ID or NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID' 
    });
  }

  try {
    let allRoles: any[] = [];
    let offset = 0;
    const pageSize = 100;
    let hasMore = true;

    // Fetch all roles with pagination
    while (hasMore) {
      const rolesResponse = await tablesDB.listRows({
        databaseId,
        tableId: rolesTableId,
        queries: [Query.limit(pageSize), Query.offset(offset)],
      });

      allRoles = allRoles.concat(rolesResponse.rows);
      hasMore = rolesResponse.rows.length === pageSize;
      offset += pageSize;
    }

    const results: { role: string; status: string; alreadyHad?: boolean }[] = [];

    for (const roleDoc of allRoles) {
      let permissions: Record<string, any> = {};
      try {
        permissions = typeof roleDoc.permissions === 'string'
          ? JSON.parse(roleDoc.permissions)
          : roleDoc.permissions ?? {};
      } catch {
        permissions = {};
      }

      // Skip if reports permissions already present
      if (permissions.reports?.read !== undefined) {
        results.push({ role: roleDoc.name, status: 'skipped', alreadyHad: true });
        continue;
      }

      const reportsPerms = REPORTS_PERMISSIONS_BY_ROLE[roleDoc.name] ?? { create: false, read: false, update: false, delete: false };
      permissions.reports = reportsPerms;

      await tablesDB.updateRow({
        databaseId,
        tableId: rolesTableId,
        rowId: roleDoc.$id,
        data: { permissions: JSON.stringify(permissions) },
      });

      results.push({ role: roleDoc.name, status: 'updated' });
    }

    return res.status(200).json({ message: 'Reports permissions fix complete', results, totalRolesProcessed: allRoles.length });
  } catch (error: any) {
    console.error('[fix-reports-permission] Error:', error);
    return res.status(500).json({ error: 'Failed to fix reports permissions' });
  }
});
