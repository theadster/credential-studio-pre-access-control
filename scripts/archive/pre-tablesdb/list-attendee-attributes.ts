/**
 * List all attributes in the attendees collection
 * 
 * Run with: npx tsx scripts/archive/pre-tablesdb/list-attendee-attributes.ts
 */

import { config } from 'dotenv';
import { Client, Databases } from 'node-appwrite';

config({ path: '.env.local' });

async function listAttributes() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const attendeesTableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID!;

  try {
    const collection = await databases.getCollection(databaseId, attendeesTableId);
    
    console.log('📊 Attendees Collection Attributes\n');
    console.log(`Total attributes: ${collection.attributes.length}`);
    console.log(`Collection: ${collection.name}\n`);
    
    console.log('Attributes:');
    collection.attributes.forEach((attr: any, index: number) => {
      console.log(`${index + 1}. ${attr.key}`);
      console.log(`   Type: ${attr.type}`);
      console.log(`   Required: ${attr.required}`);
      if (attr.size) console.log(`   Size: ${attr.size}`);
      if (attr.array) console.log(`   Array: ${attr.array}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

listAttributes();
