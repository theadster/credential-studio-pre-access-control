#!/usr/bin/env tsx
/**
 * Migration Script: Add showOnMainPage attribute to custom_fields collection
 * 
 * This script adds the showOnMainPage boolean attribute to existing custom_fields
 * collections and creates an index for performance optimization.
 * 
 * Prerequisites:
 * - Appwrite project with existing custom_fields collection
 * - Environment variables configured in .env.local
 * 
 * Usage:
 * npx tsx scripts/add-show-on-main-page-attribute.ts
 */

import { Client, Databases, IndexType } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  try {
    console.log('Starting migration: Add showOnMainPage attribute...\n');

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

    // Add showOnMainPage attribute
    console.log('Adding showOnMainPage attribute...');
    let attributeCreated = false;
    try {
      await databases.createBooleanAttribute(
        databaseId,
        collectionId,
        'showOnMainPage',
        false,  // not required
        true    // default value = true (visible)
      );
      console.log('✓ showOnMainPage attribute added successfully');
      attributeCreated = true;
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ showOnMainPage attribute already exists');
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
          const attr = collection.attributes.find((a: any) => a.key === 'showOnMainPage');
          
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

    // Create index for performance
    console.log('\nCreating index for showOnMainPage...');
    try {
      await databases.createIndex(
        databaseId,
        collectionId,
        'showOnMainPage_idx',
        IndexType.Key,
        ['showOnMainPage']
      );
      console.log('✓ Index created successfully');
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Index already exists');
      } else if (error.type === 'attribute_not_available') {
        console.log('⚠ Attribute not yet available. Please run this script again in a few moments to create the index.');
      } else {
        throw error;
      }
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. All existing custom fields will default to showOnMainPage = true (visible)');
    console.log('2. New custom fields will automatically have showOnMainPage = true');
    console.log('3. You can now toggle visibility in the Event Settings UI');

  } catch (error) {
    console.error('\n✗ Error during migration:', error);
    process.exit(1);
  }
}

main();
