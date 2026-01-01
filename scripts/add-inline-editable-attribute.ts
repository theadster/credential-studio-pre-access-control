#!/usr/bin/env tsx
/**
 * Migration Script: Add inlineEditable Attribute to Custom Fields
 * 
 * This script adds the 'inlineEditable' boolean attribute to the custom_fields collection.
 * This attribute allows checkbox fields to be edited directly on the main attendees page.
 * 
 * Usage:
 * npx tsx scripts/add-inline-editable-attribute.ts
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DATABASE_ID = 'credentialstudio';
const CUSTOM_FIELDS_COLLECTION_ID = 'custom_fields';

async function main() {
  // Validate environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);

  try {
    console.log('🔄 Adding inlineEditable attribute to custom_fields collection...');

    // Add the inlineEditable boolean attribute
    // Default value: false (not inline editable by default)
    // Required: false (optional field)
    await databases.createBooleanAttribute(
      DATABASE_ID,
      CUSTOM_FIELDS_COLLECTION_ID,
      'inlineEditable',
      false, // required
      false  // default value
    );

    console.log('✅ Successfully added inlineEditable attribute');
    console.log('');
    console.log('📝 Attribute Details:');
    console.log('   - Name: inlineEditable');
    console.log('   - Type: Boolean');
    console.log('   - Required: false');
    console.log('   - Default: false');
    console.log('');
    console.log('ℹ️  This attribute allows checkbox fields to be edited directly on the main attendees page.');
    console.log('   When enabled, users can check/uncheck the field without opening the edit dialog.');

  } catch (error: any) {
    if (error.code === 409) {
      console.log('✅ inlineEditable attribute already exists');
    } else {
      console.error('❌ Error adding attribute:', error.message);
      process.exit(1);
    }
  }
}

main();
