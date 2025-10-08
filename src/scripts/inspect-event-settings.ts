/**
 * Inspect Event Settings Collection
 * 
 * This script shows what attributes currently exist in the Event Settings collection.
 * 
 * Usage: npx tsx src/scripts/inspect-event-settings.ts
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

async function inspectCollection() {
  try {
    console.log('🔍 Inspecting Event Settings Collection...\n');
    
    const collection = await appwriteDatabases.getCollection(DATABASE_ID, EVENT_SETTINGS_COLLECTION_ID);
    
    console.log('Collection Name:', collection.name);
    console.log('Collection ID:', collection.$id);
    console.log('Total Attributes:', collection.attributes.length);
    console.log('\n========================================');
    console.log('EXISTING ATTRIBUTES:');
    console.log('========================================\n');
    
    collection.attributes.forEach((attr: any, index: number) => {
      console.log(`${index + 1}. ${attr.key}`);
      console.log(`   Type: ${attr.type}`);
      console.log(`   Required: ${attr.required}`);
      if (attr.size) console.log(`   Size: ${attr.size}`);
      if (attr.default !== undefined) console.log(`   Default: ${attr.default}`);
      console.log('');
    });
    
    console.log('========================================\n');
    
    // Check for documents
    const docs = await appwriteDatabases.listDocuments(DATABASE_ID, EVENT_SETTINGS_COLLECTION_ID);
    console.log(`Documents in collection: ${docs.documents.length}\n`);
    
    if (docs.documents.length > 0) {
      console.log('Sample document structure:');
      console.log(JSON.stringify(docs.documents[0], null, 2));
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

inspectCollection();
