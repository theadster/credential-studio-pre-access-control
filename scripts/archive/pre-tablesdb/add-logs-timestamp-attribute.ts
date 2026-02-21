import { Client, Databases, IndexType } from 'node-appwrite';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Wait for an attribute to be available (polling mechanism)
 * Appwrite creates attributes asynchronously, so we need to wait for them to be ready
 */
async function waitForAttribute(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  attributeKey: string,
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await databases.getAttribute(databaseId, collectionId, attributeKey);
      console.log(`  ✓ Attribute '${attributeKey}' is ready`);
      return;
    } catch (error: any) {
      if (attempt === maxAttempts) {
        throw new Error(`Timeout waiting for attribute '${attributeKey}' to be ready`);
      }
      // Attribute not ready yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

async function addTimestampAttribute() {
  // Validate environment variables
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  const apiKey = process.env.APPWRITE_API_KEY!;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!;

  if (!endpoint || !projectId || !apiKey || !databaseId || !logsTableId) {
    console.error('❌ Missing required environment variables:');
    if (!endpoint) console.error('  - NEXT_PUBLIC_APPWRITE_ENDPOINT');
    if (!projectId) console.error('  - NEXT_PUBLIC_APPWRITE_PROJECT_ID');
    if (!apiKey) console.error('  - APPWRITE_API_KEY');
    if (!databaseId) console.error('  - NEXT_PUBLIC_APPWRITE_DATABASE_ID');
    if (!logsTableId) console.error('  - NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID');
    process.exit(1);
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);

  console.log('🚀 Adding timestamp attribute to logs collection...');
  console.log(`📊 Database: ${databaseId}`);
  console.log(`📊 Collection: ${logsTableId}`);
  console.log('');

  try {
    // Check if attribute already exists
    try {
      await databases.getAttribute(databaseId, logsTableId, 'timestamp');
      console.log('✓ Timestamp attribute already exists');
      console.log('');
      console.log('No action needed. You can now run the migration script.');
      return;
    } catch (error: any) {
      if (error.code !== 404) {
        throw error;
      }
      // Attribute doesn't exist, continue to create it
    }

    // Create the timestamp attribute
    console.log('Creating timestamp attribute...');
    await databases.createDatetimeAttribute(
      databaseId,
      logsTableId,
      'timestamp',
      false // not required, can be null
    );

    // Wait for attribute to be ready
    await waitForAttribute(databases, databaseId, logsTableId, 'timestamp');

    // Create index for timestamp
    console.log('Creating timestamp index...');
    try {
      await databases.createIndex(
        databaseId,
        logsTableId,
        'timestamp_idx',
        IndexType.Key,
        ['timestamp']
      );
      console.log('✓ Timestamp index created');
    } catch (error: any) {
      if (error.code === 409) {
        console.log('✓ Timestamp index already exists');
      } else {
        console.warn('⚠ Warning: Could not create index:', error.message);
        console.log('  (This is not critical - the attribute was created successfully)');
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Timestamp Attribute Added Successfully!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Next step:');
    console.log('Run the migration script to backfill existing logs:');
    console.log('  npx tsx scripts/migrate-log-timestamps.ts');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ Failed to Add Timestamp Attribute!');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('');
    console.error('Please check:');
    console.error('1. Your Appwrite API key has sufficient permissions');
    console.error('2. The database and collection IDs are correct');
    console.error('3. The Appwrite instance is accessible');
    console.error('═══════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

// Run the script
addTimestampAttribute().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
