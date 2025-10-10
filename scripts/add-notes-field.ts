/**
 * Add Notes custom field
 * 
 * Run with: npx tsx scripts/add-notes-field.ts
 */

import { config } from 'dotenv';
import { Client, Databases, Query, ID } from 'node-appwrite';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function addNotesField() {
  console.log('🚀 Adding Notes custom field\n');

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
    console.log('📋 Fetching event settings...');
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
    console.log('\n📊 Checking existing custom fields...');
    const existingFields = await databases.listDocuments(
      databaseId,
      customFieldsCollectionId,
      [Query.orderAsc('order'), Query.limit(100)]
    );

    console.log(`   Found ${existingFields.documents.length} existing fields`);

    // Check if Notes field already exists
    const notesExists = existingFields.documents.some(
      (field: any) => field.internalFieldName === 'notes' || field.fieldName === 'Notes'
    );

    if (notesExists) {
      console.log('\n✅ Notes field already exists. Nothing to do!');
      process.exit(0);
    }

    // Find the highest order number to add at the end
    const maxOrder = existingFields.documents.reduce(
      (max: number, field: any) => Math.max(max, field.order || 0),
      0
    );

    console.log(`\n➕ Creating Notes field (order: ${maxOrder + 1})...`);
    
    const notesField = await databases.createDocument(
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
        order: maxOrder + 1,
        showOnMainPage: true
      }
    );

    console.log('✅ Notes field created successfully!');
    console.log('\n📝 Field details:');
    console.log('   ID:', notesField.$id);
    console.log('   Name:', notesField.fieldName);
    console.log('   Type:', notesField.fieldType);
    console.log('   Order:', notesField.order);
    console.log('   Visible on main page:', notesField.showOnMainPage);

    console.log('\n✨ Done! Next steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. The Notes field will appear in:');
    console.log('      - Event Settings (Custom Fields section)');
    console.log('      - Attendee create/edit forms');
    console.log('      - Main attendees page (under each attendee name)');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    process.exit(1);
  }
}

addNotesField().catch(console.error);
