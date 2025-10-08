/**
 * Test script to diagnose Appwrite authentication issues
 * Run with: node scripts/test-appwrite-auth.js
 */

const { Client, Account, Databases, Query } = require('appwrite');
require('dotenv').config({ path: '.env.local' });

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
const usersCollectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || '';

console.log('=== Appwrite Authentication Test ===\n');
console.log('Configuration:');
console.log('- Endpoint:', endpoint);
console.log('- Project ID:', projectId);
console.log('- Database ID:', databaseId);
console.log('- Users Collection ID:', usersCollectionId);
console.log('');

async function testConnection() {
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId);

  const account = new Account(client);
  const databases = new Databases(client);

  try {
    console.log('1. Testing Appwrite connection...');
    // Try to get account (should fail if not logged in)
    try {
      const user = await account.get();
      console.log('✓ Already logged in as:', user.email);
      console.log('  User ID:', user.$id);
      console.log('  Name:', user.name);
      
      // Try to fetch user profile
      console.log('\n2. Testing user profile fetch...');
      try {
        const response = await databases.listDocuments(
          databaseId,
          usersCollectionId,
          [Query.equal('userId', user.$id)]
        );
        
        if (response.documents.length > 0) {
          console.log('✓ User profile found');
          console.log('  Profile ID:', response.documents[0].$id);
          console.log('  Email:', response.documents[0].email);
          console.log('  Role ID:', response.documents[0].roleId || 'none');
        } else {
          console.log('✗ User profile NOT found in database');
          console.log('  This could cause login issues!');
        }
      } catch (dbError) {
        console.log('✗ Failed to fetch user profile');
        console.log('  Error:', dbError.message);
        console.log('  Type:', dbError.type);
        console.log('  Code:', dbError.code);
      }
      
    } catch (authError) {
      if (authError.code === 401) {
        console.log('✓ Not logged in (expected)');
      } else {
        console.log('✗ Unexpected error:', authError.message);
      }
    }
    
    console.log('\n3. Testing database access...');
    try {
      const response = await databases.listDocuments(
        databaseId,
        usersCollectionId,
        [Query.limit(1)]
      );
      console.log('✓ Database accessible');
      console.log('  Total users:', response.total);
    } catch (dbError) {
      console.log('✗ Database access failed');
      console.log('  Error:', dbError.message);
      console.log('  Type:', dbError.type);
      console.log('  Code:', dbError.code);
      console.log('\n  Possible issues:');
      console.log('  - Collection permissions not set correctly');
      console.log('  - Database or collection ID is wrong');
      console.log('  - Collection does not exist');
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.log('✗ Fatal error:', error.message);
    console.log('  Type:', error.type);
    console.log('  Code:', error.code);
  }
}

testConnection().catch(console.error);
