/**
 * Clear Event Settings Table
 *
 * This script clears all rows from the Event Settings table.
 * Use this before running the consolidated migration if you need to
 * add new columns to the table.
 *
 * Usage: npx tsx src/scripts/clear-event-settings.ts
 */

import { Client, TablesDB, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_APPWRITE_ENDPOINT',
  'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
  'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID',
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

const appwriteClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const appwriteTablesDB = new TablesDB(appwriteClient);

// Table IDs
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const EVENT_SETTINGS_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID!;

// Helper function to log progress
function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[type];
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function clearEventSettings() {
  try {
    log('Clearing Event Settings rows...', 'info');

    let deleted = 0;
    let failed = 0;
    let totalRows = 0;
    const pageSize = 1000;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;

    // Paginate through all rows - always use offset=0 since rows shift after deletion
    let hasMoreRows = true;
    while (hasMoreRows) {
      const allRowsResponse = await appwriteTablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: EVENT_SETTINGS_TABLE_ID,
        queries: [Query.limit(pageSize), Query.offset(0)],
      });

      if (allRowsResponse.rows.length === 0) {
        hasMoreRows = false;
        break;
      }

      totalRows += allRowsResponse.rows.length;
      log(`Fetched batch of ${allRowsResponse.rows.length} rows`, 'info');

      // Delete all rows in this batch
      let batchFailed = 0;
      for (const row of allRowsResponse.rows) {
        try {
          await appwriteTablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: EVENT_SETTINGS_TABLE_ID, rowId: row.$id });
          deleted++;
          consecutiveFailures = 0;
          log(`Deleted row ${row.$id} (${deleted}/${totalRows})`, 'info');
        } catch (error: any) {
          failed++;
          batchFailed++;
          log(`Failed to delete row ${row.$id}: ${error.message}`, 'error');
        }
      }

      // If entire batch failed, increment consecutive failures counter
      if (batchFailed === allRowsResponse.rows.length) {
        consecutiveFailures++;
        if (consecutiveFailures >= maxConsecutiveFailures) {
          log(`Stopping: ${maxConsecutiveFailures} consecutive batches failed to delete. Check permissions.`, 'error');
          hasMoreRows = false;
        }
      } else {
        consecutiveFailures = 0;
      }
    }

    if (deleted === 0 && failed === 0) {
      log('Table is already empty', 'success');
      return;
    }

    log(`\n✅ Deletion complete!`, 'success');
    log(`   Deleted: ${deleted}`, 'success');
    if (failed > 0) {
      log(`   Failed: ${failed}`, 'warn');
    }
  } catch (error: any) {
    log(`Error clearing Event Settings: ${error.message}`, 'error');
    throw error;
  }
}

async function main() {
  log('🚀 Starting Event Settings Table Clear...', 'info');
  log('========================================\n', 'info');

  try {
    await clearEventSettings();
  } catch (error: any) {
    log(`\n❌ Operation failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main();
