#!/usr/bin/env tsx
/**
 * Fix Custom Fields Index
 * 
 * This script adds the missing fieldOrder_idx to the custom_fields collection.
 * The index creation failed during initial setup due to timing issues.
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'credentialstudio';
const CUSTOM_FIELDS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID || 'custom_fields';

async function fixIndex() {
  try {
    console.log('Adding missing index to custom_fields collection...\n');
    
    // Try to create the index
    await databases.createIndex(
      DATABASE_ID,
      CUSTOM_FIELDS_COLLECTION_ID,
      'order_idx',
      'key',
      ['order']
    );
    
    console.log('✓ Index created successfully!');
    console.log('  Index: order_idx');
    console.log('  Type: key');
    console.log('  Attributes: [order]');
    
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Index already exists');
    } else {
      console.error('✗ Failed to create index:', error.message);
      console.error('\nYou can create this index manually in the Appwrite Console:');
      console.error('1. Go to Databases → credentialstudio → custom_fields');
      console.error('2. Click "Indexes" tab');
      console.error('3. Click "Create Index"');
      console.error('4. Key: order_idx');
      console.error('5. Type: key');
      console.error('6. Attributes: order');
      process.exit(1);
    }
  }
}

fixIndex();
