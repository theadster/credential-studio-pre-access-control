#!/usr/bin/env tsx
/**
 * Fix Custom Fields Index
 * 
 * This script adds the missing fieldOrder_idx to the custom_fields collection.
 * The index creation failed during initial setup due to timing issues.
 */

import { Client, Databases, IndexType } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_APPWRITE_ENDPOINT',
  'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY'
];

const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`   - ${key}`));
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'credentialstudio';
const CUSTOM_FIELDS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID ||
  'custom_fields';

async function fixIndex() {
  try {
    console.log('Adding missing index to custom_fields collection...\n');

    // Try to create the index (regular ascending index on 'order' field)
    await databases.createIndex(
      DATABASE_ID,
      CUSTOM_FIELDS_COLLECTION_ID,
      'order_idx',
      IndexType.Key,
      ['order']
    );

    console.log('✓ Index created successfully!');
    console.log('  Index: order_idx');
    console.log('  Type: key');
    console.log('  Attributes: [order]');

  } catch (error: any) {
    // Handle index already exists (success case)
    if (error.code === 409 || error.message?.includes('already exists')) {
      console.log('✓ Index already exists');
      return;
    }

    // Network/Connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('❌ Cannot reach Appwrite server');
      console.error('   Error:', error.message);
      console.error('\n📋 Next steps:');
      console.error('   1. Check your network connection');
      console.error('   2. Verify NEXT_PUBLIC_APPWRITE_ENDPOINT in .env.local');
      console.error('   3. Ensure Appwrite server is running and accessible');
      console.error(`   4. Current endpoint: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}`);
      process.exit(2);
    }

    // Authentication errors
    if (error.code === 401 || error.status === 401) {
      console.error('❌ Authentication failed');
      console.error('   Error:', error.message);
      console.error('\n📋 Next steps:');
      console.error('   1. Verify APPWRITE_API_KEY in .env.local is correct');
      console.error('   2. Check the API key has not expired');
      console.error('   3. Generate a new API key in Appwrite Console if needed');
      console.error('   4. Ensure the API key has "databases.write" scope');
      process.exit(3);
    }

    // Authorization/Permission errors
    if (error.code === 403 || error.status === 403) {
      console.error('❌ Permission denied');
      console.error('   Error:', error.message);
      console.error('\n📋 Next steps:');
      console.error('   1. Verify your API key has sufficient permissions');
      console.error('   2. Required scopes: databases.write, collections.write');
      console.error('   3. Generate a new API key with proper scopes in Appwrite Console');
      process.exit(3);
    }

    // Collection/Database not found
    if (error.code === 404 || error.status === 404 || error.message?.includes('not found')) {
      console.error('❌ Collection or database not found');
      console.error('   Error:', error.message);
      console.error('\n📋 Next steps:');
      console.error('   1. Verify database ID in .env.local:');
      console.error(`      Current: ${DATABASE_ID}`);
      console.error('   2. Verify collection ID in .env.local:');
      console.error(`      Current: ${CUSTOM_FIELDS_COLLECTION_ID}`);
      console.error('   3. Run setup script first: npm run setup:appwrite');
      console.error('   4. Check Appwrite Console to confirm database and collection exist');
      console.error('\n   Or create the index manually in Appwrite Console:');
      console.error('   1. Go to Databases → credentialstudio → custom_fields');
      console.error('   2. Click "Indexes" tab');
      console.error('   3. Click "Create Index"');
      console.error('   4. Key: order_idx');
      console.error('   5. Type: key');
      console.error('   6. Attributes: order');
      process.exit(4);
    }

    // Rate limiting
    if (error.code === 429 || error.status === 429) {
      console.error('❌ Rate limit exceeded');
      console.error('   Error:', error.message);
      console.error('\n📋 Next steps:');
      console.error('   1. Wait a few moments and try again');
      console.error('   2. Check your Appwrite plan limits');
      console.error('   3. Consider upgrading your plan if hitting limits frequently');
      process.exit(5);
    }

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) {
      console.error('❌ Appwrite server error');
      console.error('   Error:', error.message);
      console.error('   Status:', error.status);
      console.error('\n📋 Next steps:');
      console.error('   1. Check Appwrite server status');
      console.error('   2. Wait a few moments and try again');
      console.error('   3. Check Appwrite logs for more details');
      console.error('   4. Contact Appwrite support if issue persists');
      process.exit(6);
    }

    // Generic/Unknown errors
    console.error('❌ Failed to create index');
    console.error('   Error:', error.message);
    if (error.code) console.error('   Code:', error.code);
    if (error.status) console.error('   Status:', error.status);
    console.error('\n📋 You can create this index manually in Appwrite Console:');
    console.error('   1. Go to Databases → credentialstudio → custom_fields');
    console.error('   2. Click "Indexes" tab');
    console.error('   3. Click "Create Index"');
    console.error('   4. Key: order_idx');
    console.error('   5. Type: key');
    console.error('   6. Attributes: order');
    console.error('\n   Full error details:');
    console.error('   ', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

fixIndex();
