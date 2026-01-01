#!/usr/bin/env tsx
/**
 * Migration Script: Add Full-Text Search Index to customFieldValues
 * 
 * This script adds a full-text search index to the customFieldValues attribute
 * in the attendees collection, enabling efficient searching of custom field content.
 * 
 * Why this is needed:
 * - Custom fields are stored as JSON in the customFieldValues string field
 * - Without an index, searching requires fetching all attendees and filtering in-memory
 * - A full-text index allows Appwrite to search within the JSON content efficiently
 * 
 * Prerequisites:
 * - Appwrite project with existing attendees collection
 * - Environment variables configured in .env.local
 * 
 * Usage:
 * npx tsx scripts/add-custom-field-values-index.ts
 */

import { Client, Databases, IndexType } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function addCustomFieldValuesIndex() {
  console.log('🚀 Starting migration: Add full-text search index to customFieldValues\n');

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
  if (!process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID) {
    throw new Error('NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID is not set');
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;

  try {
    console.log('📋 Configuration:');
    console.log(`   Database ID: ${databaseId}`);
    console.log(`   Collection ID: ${attendeesCollectionId}\n`);

    // Check if the index already exists
    console.log('🔍 Checking for existing indexes...');
    try {
      const collection = await databases.getCollection(databaseId, attendeesCollectionId);
      const existingIndexes = collection.indexes || [];
      
      const customFieldValuesIndex = existingIndexes.find(
        (idx: any) => idx.key === 'customFieldValues_fulltext_idx'
      );

      if (customFieldValuesIndex) {
        console.log('✓ Full-text index on customFieldValues already exists');
        console.log('   Index key:', customFieldValuesIndex.key);
        console.log('   Index type:', customFieldValuesIndex.type);
        console.log('   Attributes:', customFieldValuesIndex.attributes);
        console.log('\n✅ Migration complete - no changes needed\n');
        return;
      }

      console.log('   No existing full-text index found on customFieldValues\n');
    } catch (error: any) {
      console.error('✗ Error checking collection:', error.message);
      throw error;
    }

    // Create the full-text search index
    console.log('➕ Creating full-text search index on customFieldValues...');
    try {
      await databases.createIndex(
        databaseId,
        attendeesCollectionId,
        'customFieldValues_fulltext_idx',
        IndexType.Fulltext,
        ['customFieldValues']
      );
      console.log('✓ Full-text search index created successfully\n');
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Index already exists (created by another process)\n');
      } else {
        console.error('✗ Error creating index:', error.message);
        throw error;
      }
    }

    // Verify the index was created
    console.log('🔍 Verifying index creation...');
    const collection = await databases.getCollection(databaseId, attendeesCollectionId);
    const indexes = collection.indexes || [];
    
    const newIndex = indexes.find(
      (idx: any) => idx.key === 'customFieldValues_fulltext_idx'
    );

    if (newIndex) {
      console.log('✓ Index verified successfully');
      console.log('   Index key:', newIndex.key);
      console.log('   Index type:', newIndex.type);
      console.log('   Attributes:', newIndex.attributes);
      console.log('   Status:', newIndex.status || 'available');
    } else {
      console.warn('⚠ Warning: Index was created but not found in collection metadata');
      console.warn('   This may be due to indexing delay. Check Appwrite console.');
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. The index may take a few moments to build for existing data');
    console.log('   2. You can now use Query.search() on customFieldValues in API queries');
    console.log('   3. Update the API to use database-level filtering instead of in-memory filtering\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

// Run the migration
addCustomFieldValuesIndex();
