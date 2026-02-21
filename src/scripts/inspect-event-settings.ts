/**
 * Inspect Event Settings Table
 *
 * This script shows what columns currently exist in the Event Settings table.
 *
 * Usage: npx tsx src/scripts/inspect-event-settings.ts
 */

import { Client, TablesDB } from 'node-appwrite';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Validate required environment variables
const requiredVars = [
  'NEXT_PUBLIC_APPWRITE_ENDPOINT',
  'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
  'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID',
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  process.exit(1);
}

const appwriteClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const appwriteTablesDB = new TablesDB(appwriteClient);

// Table IDs
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const EVENT_SETTINGS_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID!;

async function inspectTable() {
  try {
    console.log('🔍 Inspecting Event Settings Table...\n');

    const table = await appwriteTablesDB.getTable({ databaseId: DATABASE_ID, tableId: EVENT_SETTINGS_TABLE_ID });

    console.log('Table Name:', table.name);
    console.log('Table ID:', table.$id);

    const columns = (table as any).columns ?? [];
    console.log('Total Columns:', columns.length);
    console.log('\n========================================');
    console.log('EXISTING COLUMNS:');
    console.log('========================================\n');

    columns.forEach((col: any, index: number) => {
      console.log(`${index + 1}. ${col.key}`);
      console.log(`   Type: ${col.type}`);
      console.log(`   Required: ${col.required}`);
      if (col.size) console.log(`   Size: ${col.size}`);
      if (col.default !== undefined) console.log(`   Default: ${col.default}`);
      console.log('');
    });

    console.log('========================================\n');

    // Check for rows
    const rows = await appwriteTablesDB.listRows({ databaseId: DATABASE_ID, tableId: EVENT_SETTINGS_TABLE_ID });
    console.log(`Rows in table: ${rows.rows.length}\n`);

    if (rows.rows.length > 0) {
      console.log('Sample row structure:');
      console.log(JSON.stringify(rows.rows[0], null, 2));
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

inspectTable();
