/**
 * Test script to verify role-user mapping
 * This script checks if users are correctly associated with roles
 */

import * as dotenv from 'dotenv';
import { Client, Databases, Query } from 'node-appwrite';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

async function testRoleUserMapping() {
  console.log('🔍 Testing Role-User Mapping...\n');

  try {
    // Fetch all roles
    const rolesResponse = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
      [Query.orderAsc('$createdAt')]
    );

    console.log(`📋 Found ${rolesResponse.documents.length} roles:\n`);

    // Fetch all users
    const usersResponse = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!
    );

    console.log(`👥 Found ${usersResponse.documents.length} users:\n`);

    // Display user-role associations
    for (const user of usersResponse.documents) {
      const roleName = user.roleId 
        ? rolesResponse.documents.find(r => r.$id === user.roleId)?.name || 'Unknown Role'
        : 'No Role';
      
      console.log(`  • ${user.name || user.email}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Role ID: ${user.roleId || 'None'}`);
      console.log(`    Role Name: ${roleName}`);
      console.log('');
    }

    console.log('\n📊 Role User Counts:\n');

    // Count users for each role
    for (const role of rolesResponse.documents) {
      const usersWithRole = usersResponse.documents.filter(u => u.roleId === role.$id);
      
      console.log(`  • ${role.name}: ${usersWithRole.length} user(s)`);
      
      if (usersWithRole.length > 0) {
        usersWithRole.forEach(u => {
          console.log(`    - ${u.name || u.email}`);
        });
      }
      console.log('');
    }

    // Check for users without roles
    const usersWithoutRole = usersResponse.documents.filter(u => !u.roleId);
    if (usersWithoutRole.length > 0) {
      console.log(`\n⚠️  ${usersWithoutRole.length} user(s) without a role:`);
      usersWithoutRole.forEach(u => {
        console.log(`  - ${u.name || u.email}`);
      });
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Error testing role-user mapping:', error);
    process.exit(1);
  }
}

testRoleUserMapping();
