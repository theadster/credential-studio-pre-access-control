/**
 * Migration Script: Add Reports Permissions to Existing Roles
 *
 * This script adds the reports resource permissions to all existing roles
 * in the database. This is necessary after implementing the Saved Reports feature.
 *
 * Permissions added:
 * - Super Administrator: create, read, update, delete
 * - Event Manager: create, read, update, delete
 * - Registration Staff: create, read
 * - Viewer: read
 *
 * Usage: npx ts-node --esm scripts/add-reports-permissions.ts
 */

import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve('.env.local') });

/**
 * Validate required environment variables
 */
function validateEnvironment(): {
  endpoint: string;
  projectId: string;
  apiKey: string;
  databaseId: string;
  rolesCollectionId: string;
} {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const rolesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID || 'roles';

  const missing: string[] = [];
  if (!endpoint) missing.push('NEXT_PUBLIC_APPWRITE_ENDPOINT');
  if (!projectId) missing.push('NEXT_PUBLIC_APPWRITE_PROJECT_ID');
  if (!apiKey) missing.push('APPWRITE_API_KEY');
  if (!databaseId) missing.push('NEXT_PUBLIC_APPWRITE_DATABASE_ID');

  if (missing.length > 0) {
    console.error(
      `✗ Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}`,
    );
    process.exit(1);
  }

  return {
    endpoint: endpoint!,
    projectId: projectId!,
    apiKey: apiKey!,
    databaseId: databaseId!,
    rolesCollectionId,
  };
}

const { endpoint, projectId, apiKey, databaseId, rolesCollectionId } = validateEnvironment();

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

/**
 * Define reports permissions for each role
 */
const rolePermissionsMap: Record<string, Record<string, boolean>> = {
  'Super Administrator': {
    create: true,
    read: true,
    update: true,
    delete: true,
  },
  'Event Manager': {
    create: true,
    read: true,
    update: true,
    delete: true,
  },
  'Registration Staff': {
    create: true,
    read: true,
  },
  'Viewer': {
    read: true,
  },
};

/**
 * Default permissions for unrecognized roles (read-only)
 */
const defaultPermissions: Record<string, boolean> = {
  read: true,
};

async function addReportsPermissions() {
  try {
    console.log('Starting reports permissions migration...\n');

    // Fetch all roles with pagination
    const roles: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const rolesResponse = await databases.listDocuments(
        databaseId,
        rolesCollectionId,
        [Query.limit(limit), Query.offset(offset)],
      );

      roles.push(...rolesResponse.documents);
      offset += limit;
      hasMore = rolesResponse.documents.length === limit;
    }

    if (roles.length === 0) {
      console.log('No roles found in database');
      return;
    }

    console.log(`Found ${roles.length} role(s)\n`);

    for (const role of roles) {
      const roleName = role.name as string;
      const permissionsStr = role.permissions as string;

      // Parse existing permissions
      let permissions: Record<string, any>;
      try {
        permissions = JSON.parse(permissionsStr);
      } catch (e) {
        console.error(
          `✗ Failed to parse permissions for role "${roleName}". Skipping this role.\n` +
          `  Error: ${e instanceof Error ? e.message : String(e)}\n` +
          `  Permissions string: ${permissionsStr}`,
        );
        continue;
      }

      // Get reports permissions for this role
      let reportsPerms = rolePermissionsMap[roleName];

      if (!reportsPerms) {
        console.log(
          `⚠ Unrecognized role "${roleName}", applying default read-only permissions`
        );
        reportsPerms = defaultPermissions;
      }

      // Add reports permissions
      permissions.reports = reportsPerms;

      // Update the role
      try {
        await databases.updateDocument(
          databaseId,
          rolesCollectionId,
          role.$id,
          {
            permissions: JSON.stringify(permissions),
          },
        );

        console.log(`✓ Updated "${roleName}" with reports permissions:`);
        console.log(`  - create: ${reportsPerms.create || false}`);
        console.log(`  - read: ${reportsPerms.read || false}`);
        console.log(`  - update: ${reportsPerms.update || false}`);
        console.log(`  - delete: ${reportsPerms.delete || false}\n`);
      } catch (error: any) {
        console.error(`✗ Error updating role "${roleName}":`, error.message);
      }
    }

    console.log('Reports permissions migration completed!');
  } catch (error: any) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

addReportsPermissions();
