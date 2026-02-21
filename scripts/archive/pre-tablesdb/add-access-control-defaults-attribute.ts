#!/usr/bin/env tsx
/**
 * Migration Script: Add accessControlDefaults attribute to event_settings collection
 * 
 * This script adds a new String attribute to store access control default values
 * as a JSON string in the event_settings collection.
 * 
 * Usage:
 * npx tsx scripts/archive/pre-tablesdb/add-access-control-defaults-attribute.ts
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  // Validate environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);

  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID!;

  try {
    console.log('Adding accessControlDefaults attribute to event_settings collection...');
    
    // Create a String attribute to store the JSON-stringified accessControlDefaults object
    // Size: 1000 characters should be enough for the defaults object
    // Required: false (optional field)
    // Default: undefined (no default value)
    await databases.createStringAttribute(
      databaseId,
      tableId,
      'accessControlDefaults',
      1000,
      false, // not required
      undefined,  // default value
      false  // not an array
    );

    console.log('✓ Successfully added accessControlDefaults attribute');
    console.log('  - Type: String (stores JSON)');
    console.log('  - Size: 1000 characters');
    console.log('  - Required: false');
    console.log('  - Default: undefined');
    
    // Wait for attribute to be ready
    console.log('\nWaiting for attribute to be available...');
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        await databases.getAttribute(databaseId, tableId, 'accessControlDefaults');
        console.log('✓ Attribute is now available and ready to use');
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.warn('⚠ Attribute created but may still be processing. Please wait a moment before using it.');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nYou can now save access control default values in Event Settings.');
    
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Attribute already exists');
    } else {
      console.error('❌ Error adding attribute:', error.message);
      console.error('Full error:', error);
      process.exit(1);
    }
  }
}

main().catch(console.error);
