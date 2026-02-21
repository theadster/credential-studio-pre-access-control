#!/usr/bin/env tsx
/**
 * Migration Script: Add defaultValue attribute to custom_fields collection
 * 
 * This script adds the defaultValue string attribute to existing custom_fields
 * collections. The defaultValue is used to pre-fill field values when creating
 * new attendees or importing records that don't have a value for this field.
 * 
 * Default value: null (no default) for backward compatibility
 * 
 * Prerequisites:
 * - Appwrite project with existing custom_fields collection
 * - Environment variables configured in .env.local
 * 
 * Usage:
 * npx tsx scripts/archive/pre-tablesdb/add-default-value-attribute.ts
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  try {
    console.log('Starting migration: Add defaultValue attribute...\n');

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
    if (!process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID is not set');
    }

    // Initialize client
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const tableId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID!;

    // Add defaultValue attribute
    console.log('Adding defaultValue attribute...');
    let attributeCreated = false;
    try {
      await databases.createStringAttribute(
        databaseId,
        tableId,
        'defaultValue',
        1000,   // max length - allows for longer default values like URLs or text
        false,  // not required
        undefined,  // no default value (null)
        false,   // not an array
      );
      console.log('✓ defaultValue attribute added successfully');
      attributeCreated = true;
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ defaultValue attribute already exists');
      } else {
        throw error;
      }
    }

    // Wait for attribute to become available if it was just created
    if (attributeCreated) {
      console.log('\nWaiting for attribute to become available...');
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max
      let attributeAvailable = false;
      
      while (attempts < maxAttempts) {
        try {
          const collection = await databases.getCollection(databaseId, tableId);
          const attr = collection.attributes.find((a: any) => a.key === 'defaultValue');
          
          if (attr && attr.status === 'available') {
            console.log('\n✓ Attribute is now available');
            attributeAvailable = true;
            break;
          }
          
          await new Promise<void>(resolve => { setTimeout(resolve, 1000); });
          attempts += 1;
          process.stdout.write('.');
        } catch (error) {
          console.error('\n✗ Error checking attribute status:', error);
          throw new Error('Failed to verify attribute availability');
        }
      }
      
      if (!attributeAvailable) {
        console.error('\n✗ Attribute did not become available within the timeout period');
        console.error(`  Waited ${maxAttempts} seconds. The attribute may still be processing.`);
        console.error('  Please check the Appwrite console and re-run this script if needed.');
        process.exit(1);
      }
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. All existing custom fields will have defaultValue = null (no default)');
    console.log('2. You can now set default values for custom fields in the Event Settings UI');
    console.log('3. Default values will be applied when:');
    console.log('   - Creating new attendees via the form');
    console.log('   - Importing attendees without values for those fields');

  } catch (error) {
    console.error('\n✗ Error during migration:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error in main:', err);
  process.exit(1);
});
