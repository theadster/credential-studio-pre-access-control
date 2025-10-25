#!/usr/bin/env tsx
/**
 * Help Center Cleanup Script
 * 
 * This script removes all Help Center-related database changes from Appwrite.
 * Run this after rolling back Help Center code changes to clean up the database.
 * 
 * Prerequisites:
 * - Appwrite project with API key
 * - Environment variables configured in .env.local
 * 
 * Usage:
 * npx tsx scripts/cleanup-help-center.ts
 */

import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

// Possible Help Center collection IDs
const HELP_CENTER_COLLECTIONS = [
    'help_center_articles',
    'help_articles',
    'help_center',
    'articles',
    'faq',
    'help_categories',
    'help_center_categories',
];

async function deleteCollection(collectionId: string) {
    try {
        console.log(`Attempting to delete collection: ${collectionId}...`);
        await databases.deleteCollection(DATABASE_ID, collectionId);
        console.log(`✓ Deleted collection: ${collectionId}`);
        return true;
    } catch (error: any) {
        if (error.code === 404) {
            console.log(`  Collection ${collectionId} does not exist (skipping)`);
            return false;
        }
        console.error(`✗ Error deleting collection ${collectionId}:`, error.message);
        return false;
    }
}

async function listAllCollections() {
    try {
        console.log('\nListing all collections in database...');
        const collections = await databases.listCollections(DATABASE_ID);

        console.log(`\nFound ${collections.total} collections:`);
        collections.collections.forEach((col) => {
            console.log(`  - ${col.$id} (${col.name})`);
        });

        return collections.collections;
    } catch (error: any) {
        console.error('✗ Error listing collections:', error.message);
        return [];
    }
}

async function deleteHelpCenterAttributes() {
    try {
        console.log('\nChecking for Help Center attributes in existing collections...');

        // Check common collections for Help Center-related attributes
        const collectionsToCheck = [
            process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
            process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID,
            process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID,
        ].filter(Boolean);

        for (const collectionId of collectionsToCheck) {
            try {
                const collection = await databases.getCollection(DATABASE_ID, collectionId!);

                // Look for Help Center-related attributes
                const helpCenterAttrs = collection.attributes.filter((attr: any) =>
                    attr.key.toLowerCase().includes('help') ||
                    attr.key.toLowerCase().includes('article') ||
                    attr.key.toLowerCase().includes('faq')
                );

                if (helpCenterAttrs.length > 0) {
                    console.log(`\nFound Help Center attributes in ${collectionId}:`);
                    for (const attr of helpCenterAttrs) {
                        console.log(`  - ${attr.key} (${attr.type})`);
                        try {
                            await databases.deleteAttribute(DATABASE_ID, collectionId!, attr.key);
                            console.log(`    ✓ Deleted attribute: ${attr.key}`);
                        } catch (error: any) {
                            console.error(`    ✗ Error deleting attribute ${attr.key}:`, error.message);
                        }
                    }
                }
            } catch (error: any) {
                if (error.code !== 404) {
                    console.error(`  Error checking collection ${collectionId}:`, error.message);
                }
            }
        }
    } catch (error: any) {
        console.error('✗ Error checking attributes:', error.message);
    }
}

async function deleteHelpCenterPermissions() {
    try {
        console.log('\nChecking roles for Help Center permissions...');

        const rolesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID;
        if (!rolesCollectionId) {
            console.log('  Roles collection ID not found, skipping...');
            return;
        }

        const roles = await databases.listDocuments(DATABASE_ID, rolesCollectionId);

        let updatedCount = 0;
        for (const role of roles.documents) {
            try {
                const permissions = JSON.parse(role.permissions || '{}');
                let modified = false;

                // Remove Help Center-related permissions
                const keysToRemove = Object.keys(permissions).filter(key =>
                    key.toLowerCase().includes('help') ||
                    key.toLowerCase().includes('article') ||
                    key.toLowerCase().includes('faq')
                );

                if (keysToRemove.length > 0) {
                    console.log(`\n  Found Help Center permissions in role "${role.name}":`);
                    keysToRemove.forEach(key => {
                        console.log(`    - ${key}`);
                        delete permissions[key];
                        modified = true;
                    });

                    if (modified) {
                        await databases.updateDocument(
                            DATABASE_ID,
                            rolesCollectionId,
                            role.$id,
                            { permissions: JSON.stringify(permissions) }
                        );
                        console.log(`    ✓ Updated role: ${role.name}`);
                        updatedCount++;
                    }
                }
            } catch (error: any) {
                console.error(`  ✗ Error updating role ${role.name}:`, error.message);
            }
        }

        if (updatedCount === 0) {
            console.log('  No Help Center permissions found in roles');
        } else {
            console.log(`\n✓ Updated ${updatedCount} role(s)`);
        }
    } catch (error: any) {
        console.error('✗ Error checking role permissions:', error.message);
    }
}

async function main() {
    try {
        console.log('Starting Help Center cleanup...\n');
        console.log('='.repeat(80));

        // Validate environment variables
        if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
            throw new Error('NEXT_PUBLIC_APPWRITE_ENDPOINT is not set');
        }
        if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
            throw new Error('NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set');
        }
        if (!process.env.APPWRITE_API_KEY) {
            throw new Error('APPWRITE_API_KEY is not set');
        }
        if (!DATABASE_ID) {
            throw new Error('NEXT_PUBLIC_APPWRITE_DATABASE_ID is not set');
        }

        // Step 1: List all collections to see what exists
        const allCollections = await listAllCollections();

        // Step 2: Try to delete known Help Center collections
        console.log('\n' + '='.repeat(80));
        console.log('Attempting to delete Help Center collections...');
        console.log('='.repeat(80));

        let deletedCount = 0;
        for (const collectionId of HELP_CENTER_COLLECTIONS) {
            const deleted = await deleteCollection(collectionId);
            if (deleted) deletedCount++;
        }

        // Also check for any collections with "help" in the name from the list
        const helpCollections = allCollections.filter(col =>
            col.$id.toLowerCase().includes('help') ||
            col.name.toLowerCase().includes('help') ||
            col.$id.toLowerCase().includes('article') ||
            col.name.toLowerCase().includes('article')
        );

        if (helpCollections.length > 0) {
            console.log('\nFound additional Help Center-related collections:');
            for (const col of helpCollections) {
                if (!HELP_CENTER_COLLECTIONS.includes(col.$id)) {
                    const deleted = await deleteCollection(col.$id);
                    if (deleted) deletedCount++;
                }
            }
        }

        // Step 3: Remove Help Center attributes from existing collections
        console.log('\n' + '='.repeat(80));
        await deleteHelpCenterAttributes();

        // Step 4: Remove Help Center permissions from roles
        console.log('\n' + '='.repeat(80));
        await deleteHelpCenterPermissions();

        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('CLEANUP COMPLETE!');
        console.log('='.repeat(80));
        console.log(`\nSummary:`);
        console.log(`  - Deleted ${deletedCount} Help Center collection(s)`);
        console.log(`  - Checked and cleaned attributes in existing collections`);
        console.log(`  - Checked and cleaned Help Center permissions from roles`);

        console.log('\nNext steps:');
        console.log('1. Verify the cleanup by checking your Appwrite Console');
        console.log('2. Remove any Help Center-related environment variables from .env.local');
        console.log('3. Clear your browser cache and local storage');
        console.log('4. Restart your development server');

    } catch (error: any) {
        console.error('\n✗ Error during cleanup:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

main();
