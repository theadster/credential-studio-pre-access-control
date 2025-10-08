/**
 * List all collections in the Appwrite database
 * Run with: node scripts/list-collections.js
 */

const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

async function listCollections() {
  try {
    console.log('=== Appwrite Collections ===\n');
    console.log('Database ID:', DATABASE_ID);
    console.log('');

    const response = await databases.listCollections(DATABASE_ID);
    
    console.log(`Found ${response.total} collections:\n`);
    
    response.collections.forEach((collection, index) => {
      console.log(`${index + 1}. ${collection.name}`);
      console.log(`   ID: ${collection.$id}`);
      console.log(`   Enabled: ${collection.enabled}`);
      console.log(`   Permissions: ${JSON.stringify(collection.$permissions)}`);
      console.log('');
    });
    
    console.log('Environment Variables:');
    console.log('NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID:', process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID);
    console.log('');
    
    // Check if users collection exists
    const usersCollection = response.collections.find(c => c.$id === 'users');
    if (usersCollection) {
      console.log('✓ Users collection found!');
    } else {
      console.log('✗ Users collection NOT found!');
      console.log('  Available collection IDs:', response.collections.map(c => c.$id).join(', '));
    }
    
  } catch (error) {
    console.error('✗ Error listing collections:', error.message);
    console.error('Type:', error.type);
    console.error('Code:', error.code);
    
    if (error.code === 404) {
      console.log('\nThe database does not exist. Run: npx tsx scripts/setup-appwrite.ts');
    }
  }
}

listCollections();
