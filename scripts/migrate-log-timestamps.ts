import { Client, TablesDB, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface MigrationStats {
  totalProcessed: number;
  totalUpdated: number;
  totalSkipped: number;
  totalFailed: number;
  failedIds: string[];
}

async function migrateLogTimestamps() {
  // Validate environment variables
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID;

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

  const tablesDB = new TablesDB(client);

  const stats: MigrationStats = {
    totalProcessed: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    totalFailed: 0,
    failedIds: []
  };

  let offset = 0;
  const limit = 100;

  console.log('🚀 Starting log timestamp migration...');
  console.log(`📊 Database: ${databaseId}`);
  console.log(`📊 Table: ${logsTableId}`);
  console.log(`📊 Batch size: ${limit}`);
  console.log('');

  try {
    while (true) {
      // Fetch logs in batches
      const response = await tablesDB.listRows(
        databaseId,
        logsTableId,
        [
          Query.limit(limit),
          Query.offset(offset),
          Query.orderDesc('$createdAt')
        ]
      );

      if (response.rows.length === 0) {
        break;
      }

      console.log(`📦 Processing batch: ${offset + 1} to ${offset + response.rows.length}`);

      // Process each log
      for (const log of response.rows) {
        stats.totalProcessed++;

        // Check if timestamp is missing or null (only null/undefined, not falsy values like "" or 0)
        if (log.timestamp == null) {
          try {
            // Update timestamp to match $createdAt
            await tablesDB.updateRow(
              databaseId,
              logsTableId,
              log.$id,
              {
                timestamp: log.$createdAt
              }
            );
            stats.totalUpdated++;
            console.log(`  ✓ Updated log ${log.$id} (${stats.totalUpdated} updated)`);
          } catch (error) {
            stats.totalFailed++;
            stats.failedIds.push(log.$id);
            console.error(`  ✗ Failed to update log ${log.$id}:`, error instanceof Error ? error.message : 'Unknown error');
          }
        } else {
          stats.totalSkipped++;
          console.log(`  ⊘ Skipped log ${log.$id} (already has timestamp)`);
        }
      }

      console.log(`📊 Progress: ${stats.totalProcessed} processed, ${stats.totalUpdated} updated, ${stats.totalSkipped} skipped, ${stats.totalFailed} failed`);
      console.log('');

      offset += limit;

      // Break if we've processed all documents
      if (response.rows.length < limit) {
        break;
      }
    }

    // Print final summary
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Migration Complete!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Total logs processed: ${stats.totalProcessed}`);
    console.log(`✓  Total logs updated: ${stats.totalUpdated}`);
    console.log(`⊘  Total logs skipped: ${stats.totalSkipped}`);
    console.log(`✗  Total logs failed: ${stats.totalFailed}`);
    
    if (stats.failedIds.length > 0) {
      console.log('');
      console.log('❌ Failed log IDs:');
      stats.failedIds.forEach(id => console.log(`  - ${id}`));
    }
    
    console.log('═══════════════════════════════════════════════════════════');

    // Exit with error code if there were failures
    if (stats.totalFailed > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ Migration Failed!');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('');
    console.error('📊 Stats at time of failure:');
    console.error(`  - Total processed: ${stats.totalProcessed}`);
    console.error(`  - Total updated: ${stats.totalUpdated}`);
    console.error(`  - Total skipped: ${stats.totalSkipped}`);
    console.error(`  - Total failed: ${stats.totalFailed}`);
    console.error('═══════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

// Run the migration
migrateLogTimestamps().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
