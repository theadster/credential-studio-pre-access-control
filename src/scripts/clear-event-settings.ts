/**
 * Clear Event Settings Collection
 * 
 * This script clears all documents from the Event Settings collection.
 * Use this before running the consolidated migration if you need to
 * add new attributes to the collection.
 * 
 * Usage: npx tsx src/scripts/clear-event-settings.ts
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

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
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function clearEventSettings() {
  try {
    log('Fetching Event Settings documents...', 'info');
    const response = await appwriteDatabases.listDocuments(DATABASE_ID, EVENT_SETTINGS_COLLECTION_ID);
    
    if (response.documents.length === 0) {
      log('Collection is already empty', 'success');
      return;
    }
    
    log(`Found ${response.documents.length} documents to delete`, 'info');
    
    let deleted = 0;
    let failed = 0;
    
    for (const doc of response.documents) {
      try {
        await appwriteDatabases.deleteDocument(DATABASE_ID, EVENT_SETTINGS_COLLECTION_ID, doc.$id);
        deleted++;
        log(`Deleted document: ${doc.$id}`, 'success');
      } catch (error: any) {
        failed++;
        log(`Failed to delete document ${doc.$id}: ${error.message}`, 'error');
      }
    }
    
    log('\n========================================', 'info');
    log('DELETION SUMMARY', 'info');
    log('========================================', 'info');
    log(`✅ Deleted: ${deleted}`, 'success');
    log(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    log('========================================\n', 'info');
    
    if (failed === 0) {
      log('🎉 Event Settings collection cleared successfully!', 'success');
      log('\nYou can now run the consolidated migration:', 'info');
      log('npm run migrate:appwrite:event-settings-v2', 'info');
    } else {
      log('⚠️  Some documents failed to delete. Please review errors above.', 'warn');
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
