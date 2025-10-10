import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);

async function resetLogSettingsDocument() {
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const collectionId = process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID!;

  console.log('Resetting log settings document...');

  try {
    // Get existing log settings documents
    const result = await databases.listDocuments(
      databaseId,
      collectionId,
      [Query.limit(100)]
    );

    console.log(`Found ${result.documents.length} existing document(s)`);

    // Delete all existing documents
    for (const doc of result.documents) {
      console.log(`Deleting document ${doc.$id}...`);
      await databases.deleteDocument(databaseId, collectionId, doc.$id);
      console.log(`✓ Deleted document ${doc.$id}`);
    }

    console.log('\n✓ All old log settings documents deleted!');
    console.log('\nThe API will automatically create a new document with default values');
    console.log('when you next access the Log Settings page.');
    
  } catch (error: any) {
    console.error('Error:', error.message);
    throw error;
  }
}

resetLogSettingsDocument()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to reset log settings:', error);
    process.exit(1);
  });
