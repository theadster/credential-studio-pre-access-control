#!/usr/bin/env tsx
/**
 * Migration Script: Add Access Control Settings Attributes
 * 
 * This script adds the accessControlEnabled and accessControlTimeMode attributes
 * to the event_settings collection for the Access Control feature.
 * 
 * Attributes added:
 * - accessControlEnabled (boolean, default: false) - Enables/disables access control for the event
 * - accessControlTimeMode (enum: date_only/date_time, default: date_only) - Controls date interpretation
 * 
 * Requirements: 1.2, 1.3, 3.2, 3.3
 * 
 * Usage:
 * npx tsx scripts/add-access-control-settings.ts
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Wait for an attribute to become available (polling mechanism)
 * Appwrite creates attributes asynchronously, so we need to wait for them to be ready
 */
async function waitForAttribute(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  attributeKey: string,
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<boolean> {
  console.log(`  Waiting for attribute '${attributeKey}' to become available...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const collection = await databases.getCollection(databaseId, collectionId);
      const attr = collection.attributes?.find((a: any) => a.key === attributeKey);
      
      if (attr && attr.status === 'available') {
        console.log(`  ✓ Attribute '${attributeKey}' is now available`);
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
      process.stdout.write('.');
    } catch (error) {
      console.error(`  Error checking attribute status:`, error);
      return false;
    }
  }
  
  console.log(`\n  ✗ Timeout waiting for attribute '${attributeKey}' to be ready`);
  return false;
}

async function main() {
  try {
    console.log('Starting migration: Add Access Control Settings attributes...\n');

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
    if (!process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_DATABASE_ID is not set');
    }
    if (!process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID is not set');
    }

    // Initialize client
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);

    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const collectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

    console.log(`Database ID: ${databaseId}`);
    console.log(`Collection ID: ${collectionId}\n`);

    // Add accessControlEnabled attribute (boolean, default: false)
    console.log('1. Adding accessControlEnabled attribute...');
    let accessControlEnabledCreated = false;
    try {
      await databases.createBooleanAttribute(
        databaseId,
        collectionId,
        'accessControlEnabled',
        false,  // not required
        false   // default value = false (disabled by default)
      );
      console.log('   ✓ accessControlEnabled attribute created');
      console.log('     - Type: Boolean');
      console.log('     - Required: No');
      console.log('     - Default: false');
      accessControlEnabledCreated = true;
    } catch (error: any) {
      if (error.code === 409) {
        console.log('   ✓ accessControlEnabled attribute already exists');
      } else {
        throw error;
      }
    }

    // Wait for accessControlEnabled to be available if it was just created
    if (accessControlEnabledCreated) {
      await waitForAttribute(databases, databaseId, collectionId, 'accessControlEnabled');
    }

    // Add accessControlTimeMode attribute (enum: date_only/date_time, default: date_only)
    console.log('\n2. Adding accessControlTimeMode attribute...');
    let accessControlTimeModeCreated = false;
    try {
      await databases.createEnumAttribute(
        databaseId,
        collectionId,
        'accessControlTimeMode',
        ['date_only', 'date_time'],
        false,       // not required
        'date_only'  // default value
      );
      console.log('   ✓ accessControlTimeMode attribute created');
      console.log('     - Type: Enum');
      console.log('     - Values: date_only, date_time');
      console.log('     - Required: No');
      console.log('     - Default: date_only');
      accessControlTimeModeCreated = true;
    } catch (error: any) {
      if (error.code === 409) {
        console.log('   ✓ accessControlTimeMode attribute already exists');
      } else {
        throw error;
      }
    }

    // Wait for accessControlTimeMode to be available if it was just created
    if (accessControlTimeModeCreated) {
      await waitForAttribute(databases, databaseId, collectionId, 'accessControlTimeMode');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('\nAttributes added to event_settings collection:');
    console.log('  - accessControlEnabled (boolean, default: false)');
    console.log('  - accessControlTimeMode (enum: date_only/date_time, default: date_only)');
    console.log('\nNext steps:');
    console.log('1. Update EventSettings TypeScript interface (Task 2.1)');
    console.log('2. Update Event Settings API to handle new fields (Task 2.2)');
    console.log('3. Create AccessControlTab component (Task 5)');

  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

main();
