/**
 * Diagnostic script to identify server errors
 * Run with: npx ts-node scripts/diagnose-server-error.ts
 */

// Check environment variables
console.log('=== Environment Variables Check ===');
const requiredEnvVars = [
  'NEXT_PUBLIC_APPWRITE_ENDPOINT',
  'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
  'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
  'NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID',
  'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID',
  'NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID',
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
  const { createAdminClient } = require('../src/lib/appwrite');
  const client = createAdminClient();
  console.log('✅ Appwrite admin client created successfully');
  
  // Try to get databases
  const { databases } = client;
  console.log('✅ Databases instance obtained');
  
} catch (error) {
  console.log('❌ Error creating Appwrite client:', error);
}

console.log('\n=== Diagnosis Complete ===');
