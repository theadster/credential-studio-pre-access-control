#!/usr/bin/env tsx
/**
 * Appwrite Setup Verification Script
 *
 * This script verifies that all tables and columns are properly configured.
 */

import { Client, TablesDB } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Validate required environment variables
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const missingVars: string[] = [];
const invalidVars: string[] = [];

if (!endpoint) missingVars.push('NEXT_PUBLIC_APPWRITE_ENDPOINT');
else if (!/^https?:\/\/.+/.test(endpoint)) invalidVars.push('NEXT_PUBLIC_APPWRITE_ENDPOINT (invalid URL format)');

if (!projectId) missingVars.push('NEXT_PUBLIC_APPWRITE_PROJECT_ID');
else if (projectId.length === 0) invalidVars.push('NEXT_PUBLIC_APPWRITE_PROJECT_ID (empty value)');

if (!apiKey) missingVars.push('APPWRITE_API_KEY');
else if (apiKey.length === 0) invalidVars.push('APPWRITE_API_KEY (empty value)');

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease ensure these variables are set in your .env.local file.');
  process.exit(1);
}

if (invalidVars.length > 0) {
  console.error('❌ Invalid environment variable values:');
  invalidVars.forEach(varName => console.error(`   - ${varName}`));
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint as string)
  .setProject(projectId as string)
  .setKey(apiKey as string);

const tablesDB = new TablesDB(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'credentialstudio';

async function verifySetup() {
  console.log('Verifying Appwrite setup...\n');

  try {
    // Verify database exists
    console.log('✓ Checking database...');
    const database = await tablesDB.getDatabase({ databaseId: DATABASE_ID });
    console.log(`  Database: ${database.name} (${database.$id})`);

    // List all tables
    console.log('\n✓ Checking tables...');
    const tables = await tablesDB.listTables({ databaseId: DATABASE_ID });

    console.log(`  Found ${tables.total} tables:\n`);

    for (const table of tables.tables) {
      console.log(`  📁 ${table.name} (${table.$id})`);
      console.log(`     Columns: ${(table as any).columns?.length ?? 0}`);
      console.log(`     Indexes: ${(table as any).indexes?.length ?? 0}`);

      // List columns
      const columns = (table as any).columns ?? [];
      if (columns.length > 0) {
        console.log('     Columns:');
        for (const col of columns) {
          const required = col.required ? '(required)' : '(optional)';
          console.log(`       - ${col.key}: ${col.type} ${required}`);
        }
      }

      // List indexes
      const indexes = (table as any).indexes ?? [];
      if (indexes.length > 0) {
        console.log('     Indexes:');
        for (const index of indexes) {
          const attributes = Array.isArray(index.attributes) ? index.attributes.join(', ') : 'unknown';
          console.log(`       - ${index.key}: ${index.type} on [${attributes}]`);
        }
      }

      console.log('');
    }

    // Verify all expected tables exist
    const expectedTables = [
      'users',
      'roles',
      'attendees',
      'custom_fields',
      'event_settings',
      'logs',
      'log_settings',
      'invitations',
    ];

    const foundTableIds = tables.tables.map(t => t.$id);
    const missingTables = expectedTables.filter(id => !foundTableIds.includes(id));

    if (missingTables.length > 0) {
      console.log('⚠️  Missing tables:');
      missingTables.forEach(id => console.log(`   - ${id}`));
    } else {
      console.log('✅ All expected tables are present!');
    }

    console.log('\n✓ Verification complete!');

  } catch (error: any) {
    console.error('✗ Verification failed:', error.message);
    process.exit(1);
  }
}

verifySetup();
