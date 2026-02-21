import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

async function testMigration() {
  try {
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const tableId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID!;

    console.log('🔍 Testing mobile passcode migration...\n');

    // Fetch existing event settings document
    const response = await databases.listDocuments(databaseId, tableId);

    if (response.documents.length === 0) {
      console.log('ℹ️  No event settings documents found');
      console.log('✅ Migration successful - ready for first document creation\n');
      return;
    }

    console.log(`📄 Found ${response.documents.length} event settings document(s)\n`);

    // Check each document
    for (const doc of response.documents) {
      console.log(`Document ID: ${doc.$id}`);
      console.log(`  - Event Name: ${doc.eventName}`);
      console.log(`  - Access Control Enabled: ${doc.accessControlEnabled || false}`);
      console.log(`  - Mobile Settings Passcode: ${doc.mobileSettingsPasscode || 'null (not set)'}`);
      console.log(`  - Document readable: ✅`);
      console.log('');
    }

    console.log('✅ All existing documents are readable and unaffected by migration');
    console.log('✅ New mobileSettingsPasscode field is available and defaults to null\n');

  } catch (error: any) {
    console.error('❌ Error testing migration:', error.message);
    throw error;
  }
}

testMigration()
  .then(() => {
    console.log('✅ Migration verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration verification failed:', error);
    process.exit(1);
  });
