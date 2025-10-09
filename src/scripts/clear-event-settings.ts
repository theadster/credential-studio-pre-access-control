/**
 * Clear Event Settings Collection
 * 
 * This script clears all documents from the Event Settings collection.
 * Use this before running the consolidated migration if you need to
 * add new attributes to the collection.
 * 
 * Usage: npx tsx src/scripts/clear-event-settings.ts
 */

import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_APPWRITE_ENDPOINT',
  'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
  'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID',
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

const appwriteClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const appwriteDatabases = new Databases(appwriteClient);

// Collection IDs
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const EVENT_SETTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

// Helper function to log progress
function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[type];
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function clearEventSettings() {
  try {
    log('Fetching Event Settings documents...', 'info');

    let allDocuments: any[] = [];
    let hasMore = true;
    let offset = 0;
    const limit = 100;

    while (hasMore) {
      const response = await appwriteDatabases.listDocuments(
        DATABASE_ID,
        EVENT_SETTINGS_COLLECTION_ID,
        [Query.limit(limit), Query.offset(offset)]
      );
      allDocuments = allDocuments.concat(response.documents);
      hasMore = allDocuments.length < response.total;
      offset += limit;
    }

    if (allDocuments.length === 0) {
      log('Collection is already empty', 'success');
      return;
    }

    log(`Found ${allDocuments.length} documents to delete`, 'info');

    let deleted = 0;
    let failed = 0;

    for (const doc of allDocuments) {
      try {
        await appwriteDatabases.deleteDocument(DATABASE_ID, EVENT_SETTINGS_COLLECTION_ID, doc.$id);
        deleted++;
        log(`Deleted document ${doc.$id} (${deleted}/${allDocuments.length})`, 'info');
      } catch (error: any) {
        failed++;
        log(`Failed to delete document ${doc.$id}: ${error.message}`, 'error');
      }
    }

    log(`\n✅ Deletion complete!`, 'success');
    log(`   Deleted: ${deleted}`, 'success');
    if (failed > 0) {
      log(`   Failed: ${failed}`, 'warn');
    }
  } catch (error: any) {
    log(`Error clearing Event Settings: ${error.message}`, 'error');
    throw error;
  }
}

async function main() {
  log('🚀 Starting Event Settings Collection Clear...', 'info');
  log('========================================\n', 'info');

  try {
    await clearEventSettings();
  } catch (error: any) {
    log(`\n❌ Operation failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main();
