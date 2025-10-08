/**
 * Enable the users collection
 * Run with: node scripts/enable-users-collection.js
 */

const { Client, Databases, Permission, Role } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID;

async function enableCollection() {
  try {
    console.log('Enabling users collection...\n');
    console.log('Database ID:', DATABASE_ID);
    console.log('Collection ID:', USERS_COLLECTION_ID);
    console.log('');

    // Update collection to enable it and set correct permissions
    await databases.updateCollection(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'Users',
      [
        Permission.read(Role.any()),      // Anyone can read
        Permission.create(Role.any()),    // Anyone can create (needed for login)
        Permission.update(Role.users()),  // Only authenticated users can update
        Permission.delete(Role.users()),  // Only authenticated users can delete
      ],
      true,  // ENABLE the collection
      false  // not document security
    );

    console.log('✓ Users collection enabled successfully!');
    console.log('');
    console.log('Collection settings:');
    console.log('- Enabled: true');
    console.log('- Read: Any (including unauthenticated)');
    console.log('- Create: Any (allows profile creation during login)');
    console.log('- Update: Users (authenticated users only)');
    console.log('- Delete: Users (authenticated users only)');
    console.log('');
    console.log('You should now be able to log in successfully!');
    
  } catch (error) {
    console.error('✗ Error enabling collection:', error.message);
    console.error('Type:', error.type);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

enableCollection();
