#!/usr/bin/env tsx
/**
 * Rollback Script: Remove Full-Text Search Index from customFieldValues
 * 
 * This script removes the full-text search index that was causing performance issues.
 * The index wasn't being utilized because the dashboard fetches all attendees
 * and filters them client-side, making the index unnecessary overhead.
 * 
 * Usage:
 * npx tsx scripts/remove-custom-field-values-index.ts
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function removeCustomFieldValuesIndex() {
  console.log('🚀 Starting rollback: Remove full-text search index from customFieldValues\n');

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

    // Check if the index exists
    console.log('🔍 Checking for existing index...');
    try {
      const collection = await databases.getCollection(databaseId, attendeesCollectionId);
      const existingIndexes = collection.indexes || [];
      
      const customFieldValuesIndex = existingIndexes.find(
        (idx: any) => idx.key === 'customFieldValues_fulltext_idx'
      );

      if (!customFieldValuesIndex) {
        console.log('✓ Index does not exist - nothing to remove');
        console.log('\n✅ Rollback complete - no changes needed\n');
        return;
      }

      console.log('   Found index to remove:');
      console.log('   Index key:', customFieldValuesIndex.key);
      console.log('   Index type:', customFieldValuesIndex.type);
      console.log('   Attributes:', customFieldValuesIndex.attributes);
      console.log();
    } catch (error: any) {
      console.error('✗ Error checking collection:', error.message);
      throw error;
    }

    // Remove the full-text search index
    console.log('➖ Removing full-text search index from customFieldValues...');
    try {
      await databases.deleteIndex(
        databaseId,
        attendeesCollectionId,
        'customFieldValues_fulltext_idx'
      );
      console.log('✓ Full-text search index removed successfully\n');
    } catch (error: any) {
      if (error.code === 404) {
        console.log('✓ Index already removed (not found)\n');
      } else {
        console.error('✗ Error removing index:', error.message);
        throw error;
      }
    }

    // Verify the index was removed
    console.log('🔍 Verifying index removal...');
    const collection = await databases.getCollection(databaseId, attendeesCollectionId);
    const indexes = collection.indexes || [];
    
    const removedIndex = indexes.find(
      (idx: any) => idx.key === 'customFieldValues_fulltext_idx'
    );

    if (!removedIndex) {
      console.log('✓ Index successfully removed and verified');
    } else {
      console.warn('⚠ Warning: Index still appears in collection metadata');
      console.warn('   This may be due to deletion delay. Check Appwrite console.');
    }

    console.log('\n✅ Rollback completed successfully!\n');
    console.log('📝 Result:');
    console.log('   - Full-text index removed from customFieldValues');
    console.log('   - Performance should return to normal');
    console.log('   - Custom field search will continue to work via client-side filtering\n');

  } catch (error: any) {
    console.error('\n❌ Rollback failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

// Run the rollback
removeCustomFieldValuesIndex();
