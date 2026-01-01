/**
 * Fix Access Control Defaults JSON Format
 * 
 * This script fixes malformed accessControlDefaults data in the event_settings collection.
 * The bug caused JSON strings to be stored with each character as a separate numeric key,
 * resulting in objects like: {"0":"{","1":"\"","2":"a",...}
 * 
 * This script:
 * 1. Fetches the event settings document
 * 2. Checks if accessControlDefaults is malformed
 * 3. Reconstructs the proper JSON string
 * 4. Updates the document with the corrected data
 */

import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const EVENT_SETTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

/**
 * Check if an object is a malformed stringified JSON
 * (has numeric keys like "0", "1", "2", etc.)
 */
function isMalformedStringifiedJson(value: any): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  const numericKeys = keys.filter(k => !isNaN(Number(k)));
  
  // If more than 50% of keys are numeric and there are more than 10 keys, it's likely malformed
  return numericKeys.length > 10 && numericKeys.length / keys.length > 0.5;
}

/**
 * Reconstruct a proper JSON string from a malformed object
 */
function reconstructJsonString(malformedObj: any): string {
  const keys = Object.keys(malformedObj)
    .filter(k => !isNaN(Number(k)))
    .sort((a, b) => Number(a) - Number(b));
  
  return keys.map(k => malformedObj[k]).join('');
}

/**
 * Extract the actual object properties from a malformed object
 * (properties that aren't numeric keys)
 */
function extractActualProperties(malformedObj: any): any {
  const result: any = {};
  
  for (const [key, value] of Object.entries(malformedObj)) {
    if (isNaN(Number(key))) {
      result[key] = value;
    }
  }
  
  return result;
}

async function fixAccessControlDefaults() {
  try {
    console.log('🔍 Fetching event settings...');
    
    // Fetch event settings
    const response = await databases.listDocuments(
      DATABASE_ID,
      EVENT_SETTINGS_COLLECTION_ID,
      [Query.limit(1)]
    );

    if (response.documents.length === 0) {
      console.log('❌ No event settings found');
      return;
    }

    const eventSettings = response.documents[0];
    console.log(`✅ Found event settings document: ${eventSettings.$id}`);

    // Check accessControlDefaults
    const accessControlDefaults = eventSettings.accessControlDefaults;

    if (!accessControlDefaults) {
      console.log('ℹ️  No accessControlDefaults field found');
      return;
    }

    console.log('\n📊 Current accessControlDefaults:');
    console.log(JSON.stringify(accessControlDefaults, null, 2));

    // If it's a string, try to parse it first
    let workingValue = accessControlDefaults;
    if (typeof accessControlDefaults === 'string') {
      try {
        workingValue = JSON.parse(accessControlDefaults);
        console.log('\n📝 Parsed string to object');
      } catch (error) {
        console.log('\n⚠️  accessControlDefaults is a string but not valid JSON');
      }
    }

    // Check if it's malformed
    if (!isMalformedStringifiedJson(workingValue)) {
      console.log('\n✅ accessControlDefaults is not malformed, no fix needed');
      return;
    }

    console.log('\n⚠️  Detected malformed accessControlDefaults!');

    // Reconstruct the JSON string
    const reconstructedString = reconstructJsonString(workingValue);
    console.log('\n🔧 Reconstructed JSON string:');
    console.log(reconstructedString);

    // Parse it to verify it's valid JSON
    let parsedDefaults: any;
    try {
      parsedDefaults = JSON.parse(reconstructedString);
      console.log('\n✅ Successfully parsed reconstructed JSON:');
      console.log(JSON.stringify(parsedDefaults, null, 2));
    } catch (error) {
      console.error('\n❌ Failed to parse reconstructed JSON:', error);
      
      // Try to extract actual properties instead
      console.log('\n🔧 Attempting to extract actual properties...');
      parsedDefaults = extractActualProperties(workingValue);
      console.log('Extracted properties:');
      console.log(JSON.stringify(parsedDefaults, null, 2));
    }

    // Stringify properly for storage
    const properJsonString = JSON.stringify(parsedDefaults);
    console.log('\n💾 Proper JSON string for storage:');
    console.log(properJsonString);

    // Update the document
    console.log('\n🔄 Updating event settings...');
    await databases.updateDocument(
      DATABASE_ID,
      EVENT_SETTINGS_COLLECTION_ID,
      eventSettings.$id,
      {
        accessControlDefaults: properJsonString
      }
    );

    console.log('✅ Successfully fixed accessControlDefaults!');

    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const updatedSettings = await databases.getDocument(
      DATABASE_ID,
      EVENT_SETTINGS_COLLECTION_ID,
      eventSettings.$id
    );

    console.log('\n📊 Updated accessControlDefaults:');
    console.log(JSON.stringify(updatedSettings.accessControlDefaults, null, 2));

    // Try to parse it to verify it's valid
    try {
      const parsed = JSON.parse(updatedSettings.accessControlDefaults as string);
      console.log('\n✅ Verification successful! Parsed value:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.error('\n❌ Verification failed - still malformed:', error);
    }

  } catch (error) {
    console.error('❌ Error fixing accessControlDefaults:', error);
    throw error;
  }
}

// Run the script
fixAccessControlDefaults()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
