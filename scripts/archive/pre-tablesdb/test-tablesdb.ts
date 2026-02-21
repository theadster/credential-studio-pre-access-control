/**
 * Test script to verify TablesDB availability and functionality
 */

import { Client, Databases, TablesDB } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testTablesDB() {
  console.log('=== Testing TablesDB Availability ===\n');

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const attendeesTableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID;

  console.log('Configuration:');
  console.log('- Endpoint:', endpoint);
  console.log('- Project ID:', projectId);
  console.log('- Database ID:', databaseId);
  console.log('- Collection ID:', attendeesTableId);
  console.log('- API Key:', apiKey ? '***' + apiKey.slice(-4) : 'NOT SET');
  console.log();

  if (!projectId || !apiKey || !databaseId || !attendeesTableId) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  // Create admin client
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);
  const tablesDB = new TablesDB(client);

  try {
    // Test 1: Check if database exists using regular Databases API
    console.log('Test 1: Checking database with Databases API...');
    const db = await databases.get(databaseId);
    console.log('✅ Database found:', db.name);
    console.log();

    // Test 2: Check if collection exists
    console.log('Test 2: Checking collection...');
    const collection = await databases.getCollection(databaseId, attendeesTableId);
    console.log('✅ Collection found:', collection.name);
    console.log();

    // Test 3: Try to list documents using regular API
    console.log('Test 3: Listing documents with Databases API...');
    const docs = await databases.listDocuments(databaseId, attendeesTableId, []);
    console.log(`✅ Found ${docs.total} documents`);
    console.log();

    // Test 4: Check TablesDB methods availability
    console.log('Test 4: Checking TablesDB methods...');
    console.log('- upsertRows:', typeof tablesDB.upsertRows);
    console.log('- createRows:', typeof tablesDB.createRows);
    console.log('- deleteRows:', typeof tablesDB.deleteRows);
    console.log('- updateRows:', typeof tablesDB.updateRows);
    console.log();

    // Test 5: Try a simple TablesDB operation (if we have documents)
    if (docs.total > 0) {
      console.log('Test 5: Attempting TablesDB upsertRows with existing document...');
      const testDoc = docs.documents[0];
      console.log('Using document ID:', testDoc.$id);
      
      try {
        const result = await tablesDB.upsertRows(
          databaseId,
          attendeesTableId,
          [
            {
              $id: testDoc.$id,
              // Don't change any data, just test the API
            }
          ]
        );
        console.log('✅ TablesDB upsertRows succeeded!');
        console.log('Result:', result);
      } catch (error: any) {
        console.error('❌ TablesDB upsertRows failed:', error.message);
        console.error('Error code:', error.code);
        console.error('Error type:', error.type);
        console.error('Full error:', error);
      }
    } else {
      console.log('⚠️  No documents found, skipping TablesDB test');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error type:', error.type);
    process.exit(1);
  }
}

testTablesDB().catch(console.error);
