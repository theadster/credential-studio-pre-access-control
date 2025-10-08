/**
 * Fix users collection permissions to allow profile creation during login
 * Run with: node scripts/fix-users-collection-permissions.js
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

async function fixPermissions() {
  try {
    console.log('Fixing users collection permissions...\n');
    console.log('Database ID:', DATABASE_ID);
    console.log('Collection ID:', USERS_COLLECTION_ID);
    console.log('');

    // Update collection permissions to allow anyone to create user profiles
    // This is necessary because profile creation happens during login
    // before the user is fully authenticated
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
      false, // not enabled (collection is enabled by default)
      false  // not document security
    );

    console.log('✓ Permissions updated successfully!');
    console.log('');
    console.log('New permissions:');
    console.log('- Read: Any (including unauthenticated)');
    console.log('- Create: Any (allows profile creation during login)');
    console.log('- Update: Users (authenticated users only)');
    console.log('- Delete: Users (authenticated users only)');
    console.log('');
    console.log('You should now be able to log in successfully!');
    
  } catch (error) {
    console.error('✗ Error fixing permissions:', error.message);
    console.error('Type:', error.type);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

fixPermissions();
