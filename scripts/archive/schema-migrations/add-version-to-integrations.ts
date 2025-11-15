#!/usr/bin/env tsx
/**
 * Add Version Attribute to Integration Collections
 * 
 * This script adds the version attribute (integer, not required, default: 1)
 * to the three integration collections:
 * - Cloudinary
 * - Switchboard
 * - OneSimpleAPI
 * 
 * This is required for implementing optimistic locking to prevent
 * race conditions during concurrent updates.
 * 
 * Prerequisites:
 * - Appwrite project with integration collections already created
 * - Environment variables configured in .env.local
 * - npm install appwrite node-appwrite
 * 
 * Usage:
 * npx tsx scripts/add-version-to-integrations.ts
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { hasDefaultProperty } from '../../../src/lib/appwriteTypeHelpers';

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

/**
 * Add version attribute to a collection
 */
async function addVersionAttribute(collectionId: string, collectionName: string): Promise<void> {
  try {
    console.log(`\nAdding version attribute to ${collectionName} collection...`);
    
    await databases.createIntegerAttribute(
      DATABASE_ID,
      collectionId,
      'version',
      false, // not required (so we can set default)
      undefined, // min (no minimum)
      undefined, // max (no maximum)
      1 // default value
    );
    
    console.log(`✓ Version attribute added to ${collectionName} collection`);
    console.log(`  - Type: integer`);
    console.log(`  - Required: false (optional with default)`);
    console.log(`  - Default: 1`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`✓ Version attribute already exists in ${collectionName} collection`);
    } else {
      console.error(`✗ Error adding version attribute to ${collectionName}:`, error.message);
      throw error;
    }
  }
}

/**
 * Verify the attribute was created successfully
 */
async function verifyAttribute(collectionId: string, collectionName: string): Promise<void> {
  try {
    console.log(`Verifying version attribute in ${collectionName} collection...`);
    
    const collection = await databases.getCollection(DATABASE_ID, collectionId);
    const versionAttr = collection.attributes.find((attr: any) => attr.key === 'version');
    
    if (versionAttr) {
      console.log(`✓ Verified: version attribute exists in ${collectionName}`);
      console.log(`  - Type: ${versionAttr.type}`);
      console.log(`  - Required: ${versionAttr.required}`);
      if (hasDefaultProperty(versionAttr)) {
        console.log(`  - Default: ${versionAttr.default}`);
      }
    } else {
      console.log(`✗ Warning: version attribute not found in ${collectionName}`);
    }
  } catch (error: any) {
    console.error(`✗ Error verifying ${collectionName}:`, error.message);
  }
}

async function main() {
  try {
    console.log('Starting version attribute addition to integration collections...\n');
    
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

    // Add version attribute to all collections
    for (const collection of COLLECTIONS) {
      await addVersionAttribute(collection.id, collection.name);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Verifying attributes...');
    console.log('='.repeat(80));

    // Verify all attributes
    for (const collection of COLLECTIONS) {
      await verifyAttribute(collection.id, collection.name);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✓ Version attributes added successfully to all integration collections!');
    console.log('='.repeat(80));
    
    console.log('\nNext steps:');
    console.log('1. Verify the attributes in the Appwrite Console');
    console.log('2. Run the migration script to add version=1 to existing documents');
    console.log('3. Test the optimistic locking implementation');
    
  } catch (error) {
    console.error('\n✗ Error during setup:', error);
    process.exit(1);
  }
}

main();
