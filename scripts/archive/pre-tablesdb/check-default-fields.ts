/**
 * Check if default custom fields exist
 * 
 * Run with: npx tsx scripts/archive/pre-tablesdb/check-default-fields.ts
 */

import { config } from 'dotenv';
import { Client, Databases, Query } from 'node-appwrite';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function checkDefaultFields() {
  console.log('🔍 Checking for default custom fields\n');

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);

  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const customFieldsTableId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID!;

  try {
    // Get all custom fields
    const result = await databases.listDocuments(
      databaseId,
      customFieldsTableId,
      [Query.orderAsc('order'), Query.limit(100)]
    );

    console.log(`📊 Total custom fields: ${result.documents.length}\n`);

    if (result.documents.length === 0) {
      console.log('❌ No custom fields found!');
      console.log('\n💡 The default fields (Credential Type and Notes) were never created.');
      console.log('   This should have happened automatically when event settings were first created.');
      console.log('\n📝 To create them now, run:');
      console.log('   npx tsx scripts/create-default-fields.ts');
      return;
    }

    // Check for default fields
    const credentialTypeField = result.documents.find(
      (field: any) => field.internalFieldName === 'credential_type' || field.fieldName === 'Credential Type'
    );
    
    const notesField = result.documents.find(
      (field: any) => field.internalFieldName === 'notes' || field.fieldName === 'Notes'
    );

    console.log('🔎 Looking for default fields:\n');
    
    if (credentialTypeField) {
      console.log('✅ Credential Type field EXISTS');
      console.log('   ID:', credentialTypeField.$id);
      console.log('   Type:', credentialTypeField.fieldType);
      console.log('   Order:', credentialTypeField.order);
      console.log('   Visible:', credentialTypeField.showOnMainPage);
      console.log('   Options:', credentialTypeField.fieldOptions);
    } else {
      console.log('❌ Credential Type field MISSING');
    }
    
    console.log('');
    
    if (notesField) {
      console.log('✅ Notes field EXISTS');
      console.log('   ID:', notesField.$id);
      console.log('   Type:', notesField.fieldType);
      console.log('   Order:', notesField.order);
      console.log('   Visible:', notesField.showOnMainPage);
    } else {
      console.log('❌ Notes field MISSING');
    }

    console.log('\n📋 All custom fields:');
    result.documents.forEach((field: any, index: number) => {
      console.log(`   ${index + 1}. ${field.fieldName} (${field.fieldType}) - Order: ${field.order}`);
    });

    if (!credentialTypeField || !notesField) {
      console.log('\n💡 To create the missing default fields, run:');
      console.log('   npx tsx scripts/create-default-fields.ts');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkDefaultFields().catch(console.error);
