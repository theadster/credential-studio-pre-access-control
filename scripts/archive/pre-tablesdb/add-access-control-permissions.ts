import { Client, Databases, Query } from 'node-appwrite';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Migration script to add access control permissions to existing roles
 * This script adds the following permissions to all existing roles:
 * - accessControl: { read, write }
 * - approvalProfiles: { read, write, delete }
 * - scanLogs: { read, export }
 * 
 * Run with: npx ts-node scripts/add-access-control-permissions.ts
 */

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'http://localhost/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);

async function addAccessControlPermissions() {
  try {
    console.log('Starting migration: Adding access control permissions to existing roles...\n');

    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    const rolesTableId = process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID;

    if (!databaseId || !rolesTableId) {
      throw new Error('Missing required environment variables');
    }

    // Fetch all roles
    const rolesResponse = await databases.listDocuments(
      databaseId,
      rolesTableId,
      [Query.limit(100)]
    );

    console.log(`Found ${rolesResponse.documents.length} roles to update\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const role of rolesResponse.documents) {
      try {
        // Parse existing permissions
        let permissions: any = {};
        if (typeof role.permissions === 'string') {
          permissions = JSON.parse(role.permissions);
        } else {
          permissions = role.permissions || {};
        }

        // Check if access control permissions already exist
        if (permissions?.accessControl && permissions?.approvalProfiles && permissions?.scanLogs) {
          console.log(`✓ Skipped "${role.name}" - already has access control permissions`);
          skippedCount++;
          continue;
        }

        // Add missing permissions based on role type
        const updatedPermissions: any = {
          ...permissions,
          accessControl: permissions?.accessControl || { read: false, write: false },
          approvalProfiles: permissions?.approvalProfiles || { read: false, write: false, delete: false },
          scanLogs: permissions?.scanLogs || { read: false, export: false }
        };

        // Set permissions based on role name
        if (role.name === 'Super Administrator') {
          updatedPermissions.accessControl = { read: true, write: true };
          updatedPermissions.approvalProfiles = { read: true, write: true, delete: true };
          updatedPermissions.scanLogs = { read: true, export: true };
        } else if (role.name === 'Event Manager') {
          updatedPermissions.accessControl = { read: true, write: true };
          updatedPermissions.approvalProfiles = { read: true, write: true, delete: true };
          updatedPermissions.scanLogs = { read: true, export: true };
        } else if (role.name === 'Registration Staff') {
          updatedPermissions.accessControl = { read: true, write: true };
          updatedPermissions.approvalProfiles = { read: true, write: false, delete: false };
          updatedPermissions.scanLogs = { read: true, export: false };
        } else if (role.name === 'Viewer') {
          updatedPermissions.accessControl = { read: true, write: false };
          updatedPermissions.approvalProfiles = { read: true, write: false, delete: false };
          updatedPermissions.scanLogs = { read: true, export: false };
        }

        // Update the role
        await databases.updateDocument(
          databaseId,
          rolesTableId,
          role.$id,
          {
            permissions: JSON.stringify(updatedPermissions)
          }
        );

        console.log(`✓ Updated "${role.name}" with access control permissions`);
        updatedCount++;
      } catch (error) {
        console.error(`✗ Failed to update role "${role.name}":`, error);
      }
    }

    console.log(`\n✓ Migration complete!`);
    console.log(`  - Updated: ${updatedCount} roles`);
    console.log(`  - Skipped: ${skippedCount} roles`);
    console.log(`\nAccess Control tab is now available for users with appropriate permissions.`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addAccessControlPermissions();
