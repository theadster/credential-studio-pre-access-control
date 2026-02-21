/**
 * Add Notes custom field
 * 
 * Run with: npx tsx scripts/archive/pre-tablesdb/add-notes-field.ts
 */

import { config } from 'dotenv';
import { Client, Databases, Query, ID } from 'node-appwrite';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function addNotesField() {
  console.log('🚀 Adding Notes custom field\n');

  // Validate required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    'NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID',
    'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
    console.error('\nPlease ensure all required variables are set in .env.local');
    process.exit(1);
  }

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  const apiKey = process.env.APPWRITE_API_KEY!;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const customFieldsTableId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID!;
  const eventSettingsTableId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID!;

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);

  try {
    // Get event settings
    console.log('📋 Fetching event settings...');
    const eventSettingsResult = await databases.listDocuments(
      databaseId,
      eventSettingsTableId,
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
      customFieldsTableId,
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
      customFieldsTableId,
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
