/**
 * Debug Script: Check if showOnMainPage attribute exists
 * 
 * Run with: npx tsx scripts/check-show-on-main-page-attribute.ts
 */

import { config } from 'dotenv';
import { Client, Databases } from 'node-appwrite';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function checkAttribute() {
  console.log('🔍 Checking showOnMainPage attribute in custom_fields collection\n');

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);

  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;

  try {
    // Get collection details
    const collection = await databases.getCollection(databaseId, customFieldsCollectionId);
    
    console.log('📋 Collection:', collection.name);
    console.log('📊 Total attributes:', collection.attributes.length);
    console.log('\n🔎 Looking for showOnMainPage attribute...\n');
    
    const showOnMainPageAttr = collection.attributes.find((attr: any) => attr.key === 'showOnMainPage');
    
    if (showOnMainPageAttr) {
      console.log('✅ showOnMainPage attribute EXISTS');
      console.log('   Type:', showOnMainPageAttr.type);
      console.log('   Required:', showOnMainPageAttr.required);
      console.log('   Default:', showOnMainPageAttr.default);
      console.log('   Status:', showOnMainPageAttr.status);
    } else {
      console.log('❌ showOnMainPage attribute DOES NOT EXIST');
      console.log('\n💡 This is the problem! The attribute needs to be created.');
      console.log('   Run: npx tsx scripts/add-show-on-main-page-attribute.ts');
    }
    
    console.log('\n📝 All attributes in collection:');
    collection.attributes.forEach((attr: any) => {
      console.log(`   - ${attr.key} (${attr.type})`);
    });
    
    // Also check a sample document
    console.log('\n📄 Checking sample custom field document...');
    const docs = await databases.listDocuments(databaseId, customFieldsCollectionId, []);
    
    if (docs.documents.length > 0) {
      const sampleDoc = docs.documents[0];
      console.log('\nSample document fields:');
      console.log('   - fieldName:', sampleDoc.fieldName);
      console.log('   - showOnMainPage:', sampleDoc.showOnMainPage);
      console.log('   - showOnMainPage type:', typeof sampleDoc.showOnMainPage);
    } else {
      console.log('   No documents found in collection');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkAttribute().catch(console.error);
