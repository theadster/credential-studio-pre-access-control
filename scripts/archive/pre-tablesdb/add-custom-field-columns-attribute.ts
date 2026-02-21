#!/usr/bin/env tsx
/**
 * Migration Script: Add customFieldColumns Attribute
 * 
 * This script adds the customFieldColumns attribute to the event_settings collection.
 * This attribute controls how many columns of custom fields are displayed on the
 * attendees page before wrapping to the next line.
 * 
 * Default value: 7 (maintains current behavior)
 * Range: 3-10 columns
 * 
 * Usage:
 * npx tsx scripts/archive/pre-tablesdb/add-custom-field-columns-attribute.ts
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
if (result.error && !process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
  console.warn('⚠️  .env.local not found. Ensure environment variables are set.');
}

async function main() {
  try {
    console.log('Starting migration: Add customFieldColumns attribute...\n');

    // Validate environment variables
    const requiredVars = [
      'NEXT_PUBLIC_APPWRITE_ENDPOINT',
      'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
      'APPWRITE_API_KEY',
      'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
      'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID',
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Initialize client
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);

    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const tableId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID!;

    console.log('Adding customFieldColumns attribute...');

    try {
      await databases.createIntegerAttribute(
        databaseId,
        tableId,
        'customFieldColumns',
        false, // not required
        3,     // min value
        10,    // max value
        7      // default value (maintains current behavior)
      );
      console.log('✓ customFieldColumns attribute added successfully');
      console.log('  - Type: Integer');
      console.log('  - Required: No');
      console.log('  - Default: 7 (current behavior)');
      console.log('  - Range: 3-10');
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ customFieldColumns attribute already exists');
      } else {
        throw error;
      }
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart your development server');
    console.log('2. Go to Event Settings > General tab');
    console.log('3. Configure the "Custom Field Columns" setting');
    console.log('4. The attendees page will now use your configured column count');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
