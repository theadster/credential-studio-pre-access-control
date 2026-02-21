import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import { hasSizeProperty } from '../../../src/lib/appwriteTypeHelpers';

dotenv.config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

async function verifyNotesField() {
  try {
    console.log('🔍 Verifying notes field in attendees collection...\n');

    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const tableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID!;

    // Get collection attributes
    const collection = await databases.getCollection(databaseId, tableId);
    
    // Find the notes attribute
    const notesAttribute = collection.attributes.find((attr: any) => attr.key === 'notes');

    if (notesAttribute) {
      console.log('✅ Notes field exists!');
      console.log('   Type:', notesAttribute.type);
      if (hasSizeProperty(notesAttribute)) {
        console.log('   Size:', notesAttribute.size, 'characters');
      }
      console.log('   Required:', notesAttribute.required);
      console.log('   Status:', notesAttribute.status);
      console.log('\n✨ The notes field is ready to use!');
    } else {
      console.log('❌ Notes field not found in collection');
      console.log('\n📋 Available attributes:');
      collection.attributes.forEach((attr: any) => {
        console.log(`   - ${attr.key} (${attr.type})`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error verifying notes field:', error.message);
    process.exit(1);
  }
}

verifyNotesField();
