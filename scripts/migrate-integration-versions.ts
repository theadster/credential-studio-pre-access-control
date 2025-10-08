#!/usr/bin/env tsx
/**
 * Migration Script: Add version field to existing integration documents
 * 
 * This script iterates over all existing integration documents in the three
 * integration collections (Cloudinary, Switchboard, OneSimpleAPI) and adds
 * version=1 to any documents that don't have a version field.
 * 
 * This is required after adding the version attribute to support optimistic
 * locking for concurrent updates.
 * 
 * Prerequisites:
 * - Version attribute must be added to collections first (run add-version-to-integrations.ts)
 * - Appwrite project with integration collections already created
 * - Environment variables configured in .env.local
 * - npm install appwrite node-appwrite
 * 
 * Usage:
 * npx tsx scripts/migrate-integration-versions.ts
 */

import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

// Database and Collection IDs
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const CLOUDINARY_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID!;
const SWITCHBOARD_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID!;
const ONESIMPLEAPI_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID!;

interface CollectionInfo {
  id: string;
  name: string;
}

const COLLECTIONS: CollectionInfo[] = [
  { id: CLOUDINARY_COLLECTION_ID, name: 'Cloudinary' },
  { id: SWITCHBOARD_COLLECTION_ID, name: 'Switchboard' },
  { id: ONESIMPLEAPI_COLLECTION_ID, name: 'OneSimpleAPI' },
];

interface MigrationStats {
  total: number;
  updated: number;
  alreadyHadVersion: number;
  errors: number;
}

/**
 * Migrate documents in a single collection
 */
async function migrateCollection(
  collectionId: string,
  collectionName: string
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    updated: 0,
    alreadyHadVersion: 0,
    errors: 0,
  };

  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Migrating ${collectionName} collection...`);
    console.log('='.repeat(80));

    // Fetch all documents in the collection
    let allDocuments: any[] = [];
    let hasMore = true;
    let offset = 0;
    const limit = 100;

    while (hasMore) {
      const response = await databases.listDocuments(
        DATABASE_ID,
        collectionId,
        [Query.limit(limit), Query.offset(offset)]
      );

      allDocuments = allDocuments.concat(response.documents);
      stats.total = response.total;

      console.log(`Fetched ${allDocuments.length} of ${response.total} documents...`);

      hasMore = allDocuments.length < response.total;
      offset += limit;
    }

    console.log(`\nTotal documents found: ${stats.total}`);

    if (stats.total === 0) {
      console.log(`No documents to migrate in ${collectionName} collection.`);
      return stats;
    }

    // Process each document
    for (const doc of allDocuments) {
      try {
        // Check if version field exists and has a value
        if (doc.version !== undefined && doc.version !== null) {
          stats.alreadyHadVersion++;
          console.log(`  ✓ Document ${doc.$id} already has version: ${doc.version}`);
          continue;
        }

        // Update document to add version=1
        await databases.updateDocument(
          DATABASE_ID,
          collectionId,
          doc.$id,
          { version: 1 }
        );

        stats.updated++;
        console.log(`  ✓ Updated document ${doc.$id} with version=1`);
      } catch (error: any) {
        stats.errors++;
        console.error(`  ✗ Error updating document ${doc.$id}:`, error.message);
      }
    }

    console.log(`\n${collectionName} Migration Summary:`);
    console.log(`  Total documents: ${stats.total}`);
    console.log(`  Already had version: ${stats.alreadyHadVersion}`);
    console.log(`  Updated with version=1: ${stats.updated}`);
    console.log(`  Errors: ${stats.errors}`);

    return stats;
  } catch (error: any) {
    console.error(`\n✗ Error migrating ${collectionName} collection:`, error.message);
    throw error;
  }
}

/**
 * Verify migration results
 */
async function verifyMigration(
  collectionId: string,
  collectionName: string
): Promise<void> {
  try {
    console.log(`\nVerifying ${collectionName} migration...`);

    // Fetch all documents
    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionId,
      [Query.limit(100)]
    );

    let documentsWithoutVersion = 0;
    let documentsWithVersion = 0;

    for (const doc of response.documents) {
      if (doc.version === undefined || doc.version === null) {
        documentsWithoutVersion++;
        console.log(`  ✗ Document ${doc.$id} still missing version field`);
      } else {
        documentsWithVersion++;
      }
    }

    console.log(`\n${collectionName} Verification:`);
    console.log(`  Documents with version: ${documentsWithVersion}`);
    console.log(`  Documents without version: ${documentsWithoutVersion}`);

    if (documentsWithoutVersion === 0) {
      console.log(`  ✓ All documents have version field!`);
    } else {
      console.log(`  ✗ Warning: ${documentsWithoutVersion} documents still missing version`);
    }
  } catch (error: any) {
    console.error(`✗ Error verifying ${collectionName}:`, error.message);
  }
}

async function main() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('Integration Version Migration Script');
    console.log('='.repeat(80));
    console.log('\nThis script will add version=1 to all integration documents');
    console.log('that do not currently have a version field.\n');

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
    if (!CLOUDINARY_COLLECTION_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID is not set');
    }
    if (!SWITCHBOARD_COLLECTION_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID is not set');
    }
    if (!ONESIMPLEAPI_COLLECTION_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID is not set');
    }

    console.log('Environment variables validated ✓');
    console.log(`Database ID: ${DATABASE_ID}`);
    console.log(`Cloudinary Collection ID: ${CLOUDINARY_COLLECTION_ID}`);
    console.log(`Switchboard Collection ID: ${SWITCHBOARD_COLLECTION_ID}`);
    console.log(`OneSimpleAPI Collection ID: ${ONESIMPLEAPI_COLLECTION_ID}`);

    // Track overall statistics
    const overallStats: MigrationStats = {
      total: 0,
      updated: 0,
      alreadyHadVersion: 0,
      errors: 0,
    };

    // Migrate all collections
    for (const collection of COLLECTIONS) {
      const stats = await migrateCollection(collection.id, collection.name);
      overallStats.total += stats.total;
      overallStats.updated += stats.updated;
      overallStats.alreadyHadVersion += stats.alreadyHadVersion;
      overallStats.errors += stats.errors;
    }

    console.log('\n' + '='.repeat(80));
    console.log('Verifying Migration Results...');
    console.log('='.repeat(80));

    // Verify all collections
    for (const collection of COLLECTIONS) {
      await verifyMigration(collection.id, collection.name);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Overall Migration Summary');
    console.log('='.repeat(80));
    console.log(`Total documents across all collections: ${overallStats.total}`);
    console.log(`Documents already had version: ${overallStats.alreadyHadVersion}`);
    console.log(`Documents updated with version=1: ${overallStats.updated}`);
    console.log(`Errors encountered: ${overallStats.errors}`);

    if (overallStats.errors === 0) {
      console.log('\n✓ Migration completed successfully!');
    } else {
      console.log(`\n⚠ Migration completed with ${overallStats.errors} errors.`);
      console.log('Please review the errors above and retry if necessary.');
    }

    console.log('\nNext steps:');
    console.log('1. Verify the migration results in the Appwrite Console');
    console.log('2. Test the optimistic locking implementation');
    console.log('3. Monitor for any version conflicts in production');
  } catch (error) {
    console.error('\n✗ Error during migration:', error);
    process.exit(1);
  }
}

main();
