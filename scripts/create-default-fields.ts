/**
 * Create missing default custom fields
 * 
 * Run with: npx tsx scripts/create-default-fields.ts
 */

import { config } from 'dotenv';
import { Client, Databases, Query, ID } from 'node-appwrite';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function createDefaultFields() {
  console.log('🚀 Creating missing default custom fields\n');

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);

  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
  const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

  try {
    // Get event settings
    const eventSettingsResult = await databases.listDocuments(
      databaseId,
      eventSettingsCollectionId,
      [Query.limit(1)]
    );

    if (eventSettingsResult.documents.length === 0) {
      console.log('❌ No event settings found. Please create event settings first.');
      process.exit(1);
    }

    const eventSettings = eventSettingsResult.documents[0];
    console.log('✅ Found event settings:', eventSettings.$id);

    // Get existing custom fields
    const existingFields = await databases.listDocuments(
      databaseId,
      customFieldsCollectionId,
      [Query.orderAsc('order'), Query.limit(100)]
    );

    console.log(`📊 Existing custom fields: ${existingFields.documents.length}\n`);

    // Check for Credential Type
    const credentialTypeExists = existingFields.documents.some(
      (field: any) => field.internalFieldName === 'credential_type' || field.fieldName === 'Credential Type'
    );

    // Check for Notes
    const notesExists = existingFields.documents.some(
      (field: any) => field.internalFieldName === 'notes' || field.fieldName === 'Notes'
    );

    let created = 0;

    // Create Credential Type if missing
    if (!credentialTypeExists) {
      console.log('➕ Creating Credential Type field...');
      
      await databases.createDocument(
        databaseId,
        customFieldsCollectionId,
        ID.unique(),
        {
          eventSettingsId: eventSettings.$id,
          fieldName: 'Credential Type',
          internalFieldName: 'credential_type',
          fieldType: 'select',
          fieldOptions: JSON.stringify({ options: [] }), // Empty options - to be configured by admin
          required: false,
          order: 1,
          showOnMainPage: true,
          version: 0
        }
      );
      
      console.log('✅ Credential Type field created');
      created++;
    } else {
      console.log('ℹ️  Credential Type field already exists');
    }

    // Create Notes if missing
    if (!notesExists) {
      console.log('➕ Creating Notes field...');
      
      // Find the highest order number
      const maxOrder = existingFields.documents.reduce(
        (max: number, field: any) => Math.max(max, field.order || 0),
        0
      );
      
      await databases.createDocument(
        databaseId,
        customFieldsCollectionId,
        ID.unique(),
        {
          eventSettingsId: eventSettings.$id,
          fieldName: 'Notes',
          internalFieldName: 'notes',
          fieldType: 'textarea',
          fieldOptions: null,
          required: false,
          order: maxOrder + 1, // Add at the end
          showOnMainPage: true,
          version: 0
        }
      );
      
      console.log('✅ Notes field created');
      created++;
    } else {
      console.log('ℹ️  Notes field already exists');
    }

    if (created === 0) {
      console.log('\n✨ All default fields already exist. Nothing to do!');
    } else {
      console.log(`\n✨ Successfully created ${created} default field(s)!`);
      console.log('\n📝 Next steps:');
      console.log('   1. Refresh your browser');
      console.log('   2. Check the Event Settings to see the new fields');
      console.log('   3. Configure Credential Type options if needed');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

createDefaultFields().catch(console.error);
