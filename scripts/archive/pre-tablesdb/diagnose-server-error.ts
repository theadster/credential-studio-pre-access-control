/**
 * Diagnostic script to identify server errors
 * Run with: npx ts-node scripts/archive/pre-tablesdb/diagnose-server-error.ts
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Check environment variables
console.log('=== Environment Variables Check ===');
const requiredEnvVars = [
  'NEXT_PUBLIC_APPWRITE_ENDPOINT',
  'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
  'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
  'NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID',
  'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID',
  'NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID',
  'APPWRITE_API_KEY',
];

let missingVars = [];
for (const varName of requiredEnvVars) {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: MISSING`);
    missingVars.push(varName);
  } else {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  }
}

if (missingVars.length > 0) {
  console.log('\n⚠️  Missing environment variables:', missingVars.join(', '));
  console.log('Please check your .env.local file');
} else {
  console.log('\n✅ All required environment variables are set');
}

// Try to import and test Appwrite connection
console.log('\n=== Appwrite Connection Test ===');
try {
  const appwritePath = path.resolve(process.cwd(), 'src/lib/appwrite');
  const { createAdminClient } = require(appwritePath);
  const client = createAdminClient();
  console.log('✅ Appwrite admin client created successfully');
  
  // Try to get tablesDB
  const { tablesDB } = client;
  console.log('✅ TablesDB instance obtained');
  
} catch (error) {
  console.log('❌ Error creating Appwrite client:', error);
}

console.log('\n=== Diagnosis Complete ===');
