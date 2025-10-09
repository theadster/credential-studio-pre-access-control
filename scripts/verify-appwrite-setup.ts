#!/usr/bin/env tsx
/**
 * Appwrite Setup Verification Script
 * 
 * This script verifies that all collections and attributes are properly configured.
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Validate required environment variables
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const missingVars: string[] = [];
if (!endpoint) missingVars.push('NEXT_PUBLIC_APPWRITE_ENDPOINT');
if (!projectId) missingVars.push('NEXT_PUBLIC_APPWRITE_PROJECT_ID');
if (!apiKey) missingVars.push('APPWRITE_API_KEY');

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease ensure these variables are set in your .env.local file.');
  process.exit(1);
}

// TypeScript now knows these are defined after the validation check
const client = new Client()
  .setEndpoint(endpoint as string)
  .setProject(projectId as string)
  .setKey(apiKey as string);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'credentialstudio';

async function verifySetup() {
  console.log('Verifying Appwrite setup...\n');

  try {
    // Verify database exists
    console.log('✓ Checking database...');
    const database = await databases.get(DATABASE_ID);
    console.log(`  Database: ${database.name} (${database.$id})`);

    // List all collections
    console.log('\n✓ Checking collections...');
    const collections = await databases.listCollections(DATABASE_ID);

    console.log(`  Found ${collections.total} collections:\n`);

    for (const collection of collections.collections) {
      console.log(`  📁 ${collection.name} (${collection.$id})`);
      console.log(`     Attributes: ${collection.attributes.length}`);
      console.log(`     Indexes: ${collection.indexes.length}`);

      // List attributes
      if (collection.attributes.length > 0) {
        console.log('     Attributes:');
        for (const attr of collection.attributes) {
          const required = attr.required ? '(required)' : '(optional)';
          console.log(`       - ${attr.key}: ${attr.type} ${required}`);
        }
      }

      // List indexes
      if (collection.indexes.length > 0) {
        console.log('     Indexes:');
        for (const index of collection.indexes) {
          console.log(`       - ${index.key}: ${index.type} on [${index.attributes.join(', ')}]`);
        }
      }

      console.log('');
    }

    // Verify all expected collections exist
    const expectedCollections = [
      'users',
      'roles',
      'attendees',
      'custom_fields',
      'event_settings',
      'logs',
      'log_settings',
      'invitations'
    ];

    const foundCollectionIds = collections.collections.map(c => c.$id);
    const missingCollections = expectedCollections.filter(id => !foundCollectionIds.includes(id));

    if (missingCollections.length > 0) {
      console.log('⚠️  Missing collections:');
      missingCollections.forEach(id => console.log(`   - ${id}`));
    } else {
      console.log('✅ All expected collections are present!');
    }

    console.log('\n✓ Verification complete!');

  } catch (error: any) {
    console.error('✗ Verification failed:', error.message);
    process.exit(1);
  }
}

verifySetup();
