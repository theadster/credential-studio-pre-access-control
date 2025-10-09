#!/usr/bin/env tsx
/**
 * Migration Script: Remove API Key Attributes from Integration Collections
 * 
 * This script removes the API key attributes from the Cloudinary and Switchboard
 * integration collections for security purposes. API keys should be stored in
 * environment variables, not in the database.
 * 
 * Removes:
 * - cloudinary_integrations: apiKey, apiSecret
 * - switchboard_integrations: apiKey
 * 
 * Usage:
 *   npm run remove-api-keys
 *   or
 *   tsx scripts/remove-api-key-attributes.ts
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
  'NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID',
  'NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID',
  'APPWRITE_API_KEY'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const CLOUDINARY_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID!;
const SWITCHBOARD_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID!;

async function removeApiKeyAttributes() {
  console.log('🔒 Starting API Key Attribute Removal Migration...\n');

  try {
    // Remove Cloudinary API credentials
    console.log('📦 Removing Cloudinary API credentials...');
    
    try {
      await databases.deleteAttribute(DATABASE_ID, CLOUDINARY_COLLECTION_ID, 'apiKey');
      console.log('  ✅ Removed apiKey attribute from cloudinary_integrations');
    } catch (error: any) {
      if (error.code === 404) {
        console.log('  ℹ️  apiKey attribute not found (already removed)');
      } else {
        throw error;
      }
    }

    try {
      await databases.deleteAttribute(DATABASE_ID, CLOUDINARY_COLLECTION_ID, 'apiSecret');
      console.log('  ✅ Removed apiSecret attribute from cloudinary_integrations');
    } catch (error: any) {
      if (error.code === 404) {
        console.log('  ℹ️  apiSecret attribute not found (already removed)');
      } else {
        throw error;
      }
    }

    // Remove Switchboard API key
    console.log('\n📦 Removing Switchboard API key...');
    
    try {
      await databases.deleteAttribute(DATABASE_ID, SWITCHBOARD_COLLECTION_ID, 'apiKey');
      console.log('  ✅ Removed apiKey attribute from switchboard_integrations');
    } catch (error: any) {
      if (error.code === 404) {
        console.log('  ℹ️  apiKey attribute not found (already removed)');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Set CLOUDINARY_API_KEY in .env.local');
    console.log('  2. Set CLOUDINARY_API_SECRET in .env.local');
    console.log('  3. Set SWITCHBOARD_API_KEY in .env.local');
    console.log('  4. Update your code to read from environment variables');
    console.log('\n🔒 API credentials are now stored securely in environment variables!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
removeApiKeyAttributes();
