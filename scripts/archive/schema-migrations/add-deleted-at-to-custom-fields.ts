/**
 * Migration Script: Add deletedAt attribute to custom_fields collection
 * 
 * This script adds the deletedAt datetime attribute required for soft delete functionality.
 * Run this once before deploying the soft delete feature.
 * 
 * Usage:
 *   npx ts-node scripts/add-deleted-at-to-custom-fields.ts
 */

import { Client, Databases } from 'appwrite';

async function addDeletedAtAttribute() {
  // Initialize Appwrite client with admin credentials
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || ''); // Requires API key with admin permissions

  const databases = new Databases(client);

  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;

  console.log('Starting migration: Add deletedAt attribute to custom_fields collection');
  console.log(`Database ID: ${dbId}`);
  console.log(`Collection ID: ${customFieldsCollectionId}`);

  try {
    // Step 1: Add deletedAt datetime attribute
    console.log('\n[1/2] Creating deletedAt attribute...');
    await databases.createDatetimeAttribute(
      dbId,
      customFieldsCollectionId,
      'deletedAt',
      false,  // not required (for backward compatibility)
      undefined,  // no default value
      false   // not array
    );
    console.log('✅ deletedAt attribute created successfully');

    // Wait for attribute to be available (Appwrite processes attributes asynchronously)
    console.log('\n⏳ Waiting for attribute to be available (this may take 10-30 seconds)...');
    let attributeReady = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!attributeReady && attempts < maxAttempts) {
      try {
        const collection = await databases.getCollection(dbId, customFieldsCollectionId);
        const deletedAtAttr = collection.attributes.find((attr: any) => attr.key === 'deletedAt');
        
        if (deletedAtAttr && deletedAtAttr.status === 'available') {
          attributeReady = true;
          console.log('✅ Attribute is now available');
        } else {
          process.stdout.write('.');
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      } catch (error) {
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    if (!attributeReady) {
      console.log('\n⚠️  Attribute creation is still processing. Continue to step 2 manually later.');
      console.log('   Check Appwrite Console to verify attribute status before creating index.');
      return;
    }

    // Step 2: Create index on deletedAt for efficient filtering
    console.log('\n[2/2] Creating index on deletedAt...');
    await databases.createIndex(
      dbId,
      customFieldsCollectionId,
      'idx_deletedAt',
      'key',
      ['deletedAt'],
      ['ASC']
    );
    console.log('✅ Index created successfully');

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Deploy the updated API code with soft delete functionality');
    console.log('2. Test soft delete with a test custom field');
    console.log('3. Monitor logs for [CUSTOM_FIELD_DELETE] entries');
    console.log('4. (Optional) Set up periodic cleanup job for permanent deletion');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.code === 409) {
      console.log('\n⚠️  Attribute or index may already exist. Check Appwrite Console.');
    } else if (error.code === 401) {
      console.log('\n⚠️  Authentication failed. Ensure APPWRITE_API_KEY is set correctly.');
    } else {
      console.log('\nError details:', error);
    }
    
    process.exit(1);
  }
}

// Validate environment variables
function validateEnv() {
  const required = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    'NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID',
    'APPWRITE_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nEnsure these are set in your .env.local file');
    process.exit(1);
  }
}

// Run migration
validateEnv();
addDeletedAtAttribute().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
