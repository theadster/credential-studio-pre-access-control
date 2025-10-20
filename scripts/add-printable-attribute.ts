#!/usr/bin/env tsx
/**
 * Migration Script: Add printable attribute to custom_fields collection
 * 
 * This script adds the printable boolean attribute to existing custom_fields
 * collections. The printable flag indicates whether changes to this field
 * should mark an attendee's credential as OUTDATED and require reprinting.
 * 
 * Default value: false (non-printable) for backward compatibility
 * 
 * Prerequisites:
 * - Appwrite project with existing custom_fields collection
 * - Environment variables configured in .env.local
 * 
 * Usage:
 * npx tsx scripts/add-printable-attribute.ts
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  try {
    console.log('Starting migration: Add printable attribute...\n');

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
    if (!process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID is not set');
    }

    // Initialize client
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const collectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;

    // Add printable attribute
    console.log('Adding printable attribute...');
    let attributeCreated = false;
    try {
      await databases.createBooleanAttribute(
        databaseId,
        collectionId,
        'printable',
        false,  // not required
        false   // default value = false (non-printable for backward compatibility)
      );
      console.log('✓ printable attribute added successfully');
      attributeCreated = true;
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ printable attribute already exists');
      } else {
        throw error;
      }
    }

    // Wait for attribute to become available if it was just created
    if (attributeCreated) {
      console.log('\nWaiting for attribute to become available...');
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max
      
      while (attempts < maxAttempts) {
        try {
          const collection = await databases.getCollection(databaseId, collectionId);
          const attr = collection.attributes.find((a: any) => a.key === 'printable');
          
          if (attr && attr.status === 'available') {
            console.log('✓ Attribute is now available');
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
          process.stdout.write('.');
        } catch (error) {
          console.error('Error checking attribute status:', error);
          break;
        }
      }
      console.log('');
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. All existing custom fields will default to printable = false (non-printable)');
    console.log('2. New custom fields will automatically have printable = false');
    console.log('3. You can now mark fields as printable in the Event Settings UI');
    console.log('4. Only changes to printable fields will mark credentials as OUTDATED');

  } catch (error) {
    console.error('\n✗ Error during migration:', error);
    process.exit(1);
  }
}

main();
