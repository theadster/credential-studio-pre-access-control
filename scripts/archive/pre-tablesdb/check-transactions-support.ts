#!/usr/bin/env tsx
/**
 * Check Transactions API Support
 * 
 * This script checks if the current Appwrite SDK version supports
 * the Transactions API (TablesDB).
 */

import { Client } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkTransactionsSupport() {
  console.log('Checking Appwrite Transactions API support...\n');
  console.log('='.repeat(80));

  // Check SDK version
  const packageJson = require(path.resolve(process.cwd(), 'package.json'));

  // Safely read versions with fallbacks
  const appwriteVersion = (packageJson.dependencies && packageJson.dependencies.appwrite) || 'unknown';
  const nodeAppwriteVersion =
    (packageJson.devDependencies && packageJson.devDependencies['node-appwrite']) ||
    (packageJson.dependencies && packageJson.dependencies['node-appwrite']) ||
    'unknown';

  console.log('\nSDK Versions:');
  console.log(`  - appwrite (client): ${appwriteVersion}`);
  console.log(`  - node-appwrite (server): ${nodeAppwriteVersion}`);

  // Check if TablesDB class exists
  console.log('\n' + '='.repeat(80));
  console.log('\nTablesDB Class Check:');
  const { TablesDB, Databases } = require('node-appwrite');
  console.log(`  - TablesDB class exists: ${typeof TablesDB !== 'undefined' ? '✓ Yes' : '✗ No'}`);

  if (typeof TablesDB === 'undefined') {
    console.log('\n❌ TablesDB service is not available in this SDK version');
    console.log('\nCurrent behavior: Falling back to legacy sequential API');
    return;
  }

  // Check if bulk operation methods exist
  console.log('\nTablesDB Bulk Operation Methods Check:');
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

  const tablesDB = new TablesDB(client);
  const databases = new Databases(client);

  const methods = [
    'upsertRows',
    'deleteRows',
    'createRows'
  ];

  let allMethodsExist = true;
  for (const method of methods) {
    const exists = typeof (tablesDB as any)[method] === 'function';
    console.log(`  - tablesDB.${method}: ${exists ? '✓ Available' : '✗ Not available'}`);
    if (!exists) allMethodsExist = false;
  }

  // Check if standard CRUD methods exist (used for audit logs and fallback)
  console.log('\nStandard Databases CRUD Methods:');
  const crudMethods = [
    'createDocument',
    'updateDocument',
    'deleteDocument'
  ];

  for (const method of crudMethods) {
    const exists = typeof (databases as any)[method] === 'function';
    console.log(`  - databases.${method}: ${exists ? '✓ Available' : '✗ Not available'}`);
    if (!exists) allMethodsExist = false;
  }

  console.log('\n' + '='.repeat(80));

  if (allMethodsExist) {
    console.log('\n✅ Transactions API is fully supported!');
    console.log('\n✓ Current implementation uses TablesDB (supported)');
    console.log('\nTablesDB provides atomic bulk operations:');
    console.log('  - bulkEditWithFallback() uses TablesDB.upsertRows()');
    console.log('  - bulkDeleteWithFallback() uses TablesDB.deleteRows()');
    console.log('  - bulkImportWithFallback() uses TablesDB.createRows()');
    console.log('\nSee docs/fixes/TABLESDB_BULK_OPERATIONS_WORKING.md for:');
    console.log('  - Implementation details');
    console.log('  - Atomic operation guarantees');
    console.log('  - Testing results');
  } else {
    console.log('\n⚠️  Transactions API methods are not available');
    console.log('\nCurrent behavior:');
    console.log('  - Bulk operations fall back to sequential API calls');
    console.log('  - Each record is updated individually');
    console.log('  - No atomic transactions');
    console.log('\nPossible reasons:');
    console.log('  1. SDK version doesn\'t support transactions yet');
    console.log('  2. Appwrite server version is too old');
    console.log('  3. Using self-hosted Appwrite (transactions may not be available)');
    console.log('\nTo enable Transactions API:');
    console.log('  1. Ensure you\'re on Appwrite Cloud');
    console.log('  2. Update to latest SDK: npm install appwrite@latest node-appwrite@latest');
    console.log('  3. Check Appwrite Console for server version');
  }

  console.log('\n' + '='.repeat(80));
  console.log('\nHow to verify in your app:');
  console.log('  1. Open browser DevTools Console');
  console.log('  2. Perform a bulk edit operation');
  console.log('  3. Check Network tab for the API response');
  console.log('  4. Look for "usedTransactions" field in the response');
  console.log('     - true = Using Transactions API ✓');
  console.log('     - false = Using legacy sequential API');
  console.log('\n' + '='.repeat(80));
}

checkTransactionsSupport().catch(console.error);
