/**
 * Migration Script: Add notes field to Attendees Collection
 * 
 * This script adds a permanent notes field to the attendees collection.
 * This is a standard field (like firstName, lastName) not a custom field.
 * 
 * Run with: npx tsx scripts/add-notes-to-attendees.ts
 */

import { config } from 'dotenv';
import { Client, Databases } from 'node-appwrite';
import { hasSizeProperty } from '../src/lib/appwriteTypeHelpers';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function addNotesField() {
  console.log('🚀 Starting migration: Add notes field to attendees collection\n');

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);

  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;

  try {
    // Check if attribute already exists
    console.log('📋 Checking if notes attribute already exists...');
    
    try {
      const collection = await databases.getCollection(databaseId, attendeesCollectionId);
      const existingAttribute = collection.attributes.find((attr: any) => attr.key === 'notes');
      
      if (existingAttribute) {
        console.log('✅ notes attribute already exists');
        console.log('   Type:', existingAttribute.type);
        console.log('   Required:', existingAttribute.required);
        if (hasSizeProperty(existingAttribute)) {
          console.log('   Size:', existingAttribute.size);
        }
        console.log('\n✨ Migration complete - no changes needed');
        return;
      }
    } catch (error) {
      console.log('⚠️  Could not check existing attributes, proceeding with creation...');
    }

    // Add notes attribute as a text field (large size for multi-line notes)
    console.log('➕ Adding notes attribute to attendees collection...');
    
    await databases.createStringAttribute(
      databaseId,
      attendeesCollectionId,
      'notes',
      2000,  // Max size: 2,000 characters
      false   // not required
    );

    console.log('✅ notes attribute created successfully');
    console.log('   Type: string');
    console.log('   Size: 2,000 characters');
    console.log('   Required: false');
    
    console.log('\n⏳ Waiting for attribute to be available (this may take a moment)...');
    
    // Wait for attribute to be available
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        const collection = await databases.getCollection(databaseId, attendeesCollectionId);
        const attribute = collection.attributes.find((attr: any) => attr.key === 'notes');
        
        if (attribute && attribute.status === 'available') {
          console.log('✅ Attribute is now available');
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        attempts++;
        process.stdout.write('.');
      } catch (error) {
        console.log('\n⚠️  Error checking attribute status:', error);
        break;
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('\n⚠️  Timeout waiting for attribute to become available');
      console.log('   The attribute was created but may still be processing');
      console.log('   Please check the Appwrite console to verify');
    }

    console.log('\n✨ Migration complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. The notes field is now available in the database');
    console.log('   2. Update the AttendeeForm component to include the notes field');
    console.log('   3. Restart your development server');
    console.log('   4. Test creating/editing attendees with notes');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.code === 409) {
      console.log('\n💡 The attribute may already exist. Check the Appwrite console.');
    } else if (error.code === 401) {
      console.log('\n💡 Authentication failed. Check your APPWRITE_API_KEY in .env.local');
    } else {
      console.log('\n💡 Error details:', error);
    }
    
    process.exit(1);
  }
}

// Run the migration
addNotesField().catch(console.error);
