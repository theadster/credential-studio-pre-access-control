/**
 * Event Settings Migration with Consolidated JSON Fields
 * 
 * This script consolidates related settings into JSON fields to work around
 * Appwrite's attribute limit per collection.
 * 
 * Strategy:
 * - Core fields remain separate (eventName, eventDate, etc.)
 * - Cloudinary settings -> cloudinaryConfig (JSON)
 * - Switchboard settings -> switchboardConfig (JSON)
 * - OneSimpleAPI settings -> oneSimpleApiConfig (JSON)
 * - Other settings -> additionalSettings (JSON)
 * 
 * Usage: npx tsx src/scripts/fix-event-settings-consolidated.ts
 */

import { Client, Databases } from 'node-appwrite';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

const appwriteClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const appwriteDatabases = new Databases(appwriteClient);

// Collection IDs
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const EVENT_SETTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

// Configuration for attribute readiness polling
const ATTRIBUTE_READY_TIMEOUT = parseInt(process.env.APPWRITE_ATTRIBUTE_READY_TIMEOUT || '60000', 10); // Default: 60 seconds
const ATTRIBUTE_READY_INITIAL_DELAY = parseInt(process.env.APPWRITE_ATTRIBUTE_READY_INITIAL_DELAY || '2000', 10); // Default: 2 seconds
const ATTRIBUTE_READY_MAX_ATTEMPTS = parseInt(process.env.APPWRITE_ATTRIBUTE_READY_MAX_ATTEMPTS || '20', 10); // Default: 20 attempts

// Helper function to log progress
function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[type];
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * Wait for attributes to be ready with exponential backoff
 * Polls Appwrite to confirm all required attributes exist before proceeding
 */
async function waitForAttributesReady() {
  const requiredAttributes = [
    'eventDate', 'eventTime', 'eventLocation', 'timeZone', 'barcodeUnique',
    'cloudinaryConfig', 'oneSimpleApiConfig', 'additionalSettings'
  ];

  log(`\n⏳ Waiting for attributes to be ready (timeout: ${ATTRIBUTE_READY_TIMEOUT}ms, max attempts: ${ATTRIBUTE_READY_MAX_ATTEMPTS})...`, 'info');
  log(`   Required attributes: ${requiredAttributes.join(', ')}`, 'info');

  let attempt = 0;
  let delay = ATTRIBUTE_READY_INITIAL_DELAY;
  const startTime = Date.now();

  while (attempt < ATTRIBUTE_READY_MAX_ATTEMPTS) {
    attempt++;
    const elapsed = Date.now() - startTime;

    // Check if we've exceeded the timeout
    if (elapsed > ATTRIBUTE_READY_TIMEOUT) {
      log(`❌ Timeout exceeded (${elapsed}ms). Attributes not ready after ${attempt} attempts.`, 'error');
      throw new Error(`Attribute readiness timeout after ${elapsed}ms and ${attempt} attempts`);
    }

    try {
      log(`   Attempt ${attempt}/${ATTRIBUTE_READY_MAX_ATTEMPTS} (elapsed: ${elapsed}ms, delay: ${delay}ms)...`, 'info');
      
      const collection = await appwriteDatabases.getCollection(DATABASE_ID, EVENT_SETTINGS_COLLECTION_ID);
      const attributeNames = collection.attributes.map((attr: any) => attr.key);
      
      const missingAttributes = requiredAttributes.filter(attr => !attributeNames.includes(attr));
      
      if (missingAttributes.length === 0) {
        log(`✅ All ${requiredAttributes.length} attributes are ready! (took ${elapsed}ms, ${attempt} attempts)`, 'success');
        return;
      }
      
      log(`   ⏳ Still waiting for ${missingAttributes.length} attributes: ${missingAttributes.join(', ')}`, 'warn');
      log(`   📊 Found ${attributeNames.length} attributes so far`, 'info');
      
    } catch (error: any) {
      log(`   ⚠️  Error checking attributes (attempt ${attempt}): ${error.message}`, 'warn');
    }

    // Wait with exponential backoff (capped at 10 seconds)
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, 10000);
  }

  // If we get here, we've exhausted all attempts
  log(`❌ Failed to verify attributes after ${attempt} attempts and ${Date.now() - startTime}ms`, 'error');
  throw new Error(`Attributes not ready after ${attempt} attempts. Please check Appwrite dashboard.`);
}

/**
 * Add consolidated JSON attributes
 */
async function addConsolidatedAttributes() {
  log('Adding consolidated JSON attributes to Event Settings collection...', 'info');
  
  // Verify collection is empty before adding attributes
  try {
    const response = await appwriteDatabases.listDocuments(DATABASE_ID, EVENT_SETTINGS_COLLECTION_ID);
    if (response.documents.length > 0) {
      log(`⚠️  Collection has ${response.documents.length} documents. Appwrite requires empty collection to add attributes.`, 'error');
      throw new Error('Collection must be empty before adding attributes. Please clear the collection first.');
    }
    log('✅ Collection is empty, proceeding with attribute creation', 'success');
  } catch (error: any) {
    if (error.message.includes('Collection must be empty')) {
      throw error;
    }
    log(`⚠️  Could not verify collection is empty: ${error.message}`, 'warn');
  }
  
  const attributesToAdd = [
    // Core event fields
    { name: 'eventDate', type: 'datetime', required: false },
    { name: 'eventTime', type: 'string', size: 50, required: false },
    { name: 'eventLocation', type: 'string', size: 500, required: false },
    { name: 'timeZone', type: 'string', size: 100, required: false },
    { name: 'barcodeUnique', type: 'boolean', required: false, default: true },
    
    // Consolidated JSON fields
    { name: 'cloudinaryConfig', type: 'string', size: 5000, required: false },
    { name: 'oneSimpleApiConfig', type: 'string', size: 5000, required: false },
    { name: 'additionalSettings', type: 'string', size: 5000, required: false },
  ];
  
  let added = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const attr of attributesToAdd) {
    try {
      if (attr.type === 'string') {
        await appwriteDatabases.createStringAttribute(
          DATABASE_ID,
          EVENT_SETTINGS_COLLECTION_ID,
          attr.name,
          attr.size!,
          attr.required
        );
      } else if (attr.type === 'boolean') {
        await appwriteDatabases.createBooleanAttribute(
          DATABASE_ID,
          EVENT_SETTINGS_COLLECTION_ID,
          attr.name,
          attr.required,
          attr.default
        );
      } else if (attr.type === 'datetime') {
        await appwriteDatabases.createDatetimeAttribute(
          DATABASE_ID,
          EVENT_SETTINGS_COLLECTION_ID,
          attr.name,
          attr.required
        );
      }
      
      added++;
      log(`Added attribute: ${attr.name}`, 'success');
      
      // Wait between attribute creations
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      if (error.code === 409) {
        skipped++;
        log(`Attribute ${attr.name} already exists, skipping`, 'warn');
      } else {
        failed++;
        log(`Failed to add attribute ${attr.name}: ${error.message}`, 'error');
      }
    }
  }
  
  log(`\nAttribute creation summary: ${added} added, ${skipped} skipped, ${failed} failed`, 'info');
  
  if (failed > 0) {
    log('\n⚠️  Some attributes failed to create. This may cause migration errors.', 'warn');
    log('⚠️  Please check the errors above and ensure the collection is empty.', 'warn');
  }
  
  if (added > 0) {
    await waitForAttributesReady();
  }
  
  // Verify attributes were created
  try {
    log('\n🔍 Verifying attributes were created...', 'info');
    const collection = await appwriteDatabases.getCollection(DATABASE_ID, EVENT_SETTINGS_COLLECTION_ID);
    const attributeNames = collection.attributes.map((attr: any) => attr.key);
    
    const requiredAttributes = [
      'eventDate', 'eventTime', 'eventLocation', 'timeZone', 'barcodeUnique',
      'cloudinaryConfig', 'oneSimpleApiConfig', 'additionalSettings'
    ];
    
    const missingAttributes = requiredAttributes.filter(attr => !attributeNames.includes(attr));
    
    if (missingAttributes.length > 0) {
      log(`❌ Missing attributes: ${missingAttributes.join(', ')}`, 'error');
      log('❌ Cannot proceed with migration. Please ensure collection is empty and try again.', 'error');
      throw new Error(`Missing required attributes: ${missingAttributes.join(', ')}`);
    }
    
    log(`✅ All required attributes verified (${attributeNames.length} total attributes)`, 'success');
  } catch (error: any) {
    if (error.message.includes('Missing required attributes')) {
      throw error;
    }
    log(`⚠️  Could not verify attributes: ${error.message}`, 'warn');
  }
}

/**
 * Clear existing Event Settings documents
 */
async function clearEventSettings() {
  // Check for confirmation flag
  if (!process.env.CONFIRM_CLEAR && !process.argv.includes('--confirm')) {
    log(
      '⚠️  Skipping document clearing. Use --confirm flag or set CONFIRM_CLEAR=true to proceed.',
      'warn'
    );
    return;
  }

  try {
    log('Clearing existing Event Settings documents...', 'info');
    const response = await appwriteDatabases.listDocuments(
      DATABASE_ID,
      EVENT_SETTINGS_COLLECTION_ID
    );

    // Dry-run mode: report how many would be deleted, but don't actually delete
    if (process.argv.includes('--dry-run')) {
      log(
        `Would delete ${response.documents.length} documents (dry-run mode)`,
        'info'
      );
      return;
    }

    for (const doc of response.documents) {
      try {
        await appwriteDatabases.deleteDocument(
          DATABASE_ID,
          EVENT_SETTINGS_COLLECTION_ID,
          doc.$id
        );
      } catch (error: any) {
        log(`Failed to delete document ${doc.$id}: ${error.message}`, 'warn');
      }
    }

    log(`Cleared ${response.documents.length} documents`, 'success');
  } catch (error: any) {
    log(`Error clearing Event Settings: ${error.message}`, 'error');
  }
}

/**
 * Migrate Event Settings with consolidated JSON fields
 */
async function migrateEventSettings() {
  log('\nStarting Event Settings data migration...', 'info');
  
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  try {
    const eventSettings = await prisma.eventSettings.findMany();
    log(`Found ${eventSettings.length} event settings to migrate`, 'info');
    
    for (const settings of eventSettings) {
      try {
        // Consolidate Cloudinary settings into JSON
        const cloudinaryConfig = {
          enabled: settings.cloudinaryEnabled ?? false,
          cloudName: settings.cloudinaryCloudName || '',
          apiKey: settings.cloudinaryApiKey || '',
          apiSecret: settings.cloudinaryApiSecret || '',
          uploadPreset: settings.cloudinaryUploadPreset || '',
          autoOptimize: settings.cloudinaryAutoOptimize ?? false,
          generateThumbnails: settings.cloudinaryGenerateThumbnails ?? false,
          disableSkipCrop: settings.cloudinaryDisableSkipCrop ?? false,
          cropAspectRatio: settings.cloudinaryCropAspectRatio || '1',
        };
        
        // Consolidate OneSimpleAPI settings into JSON
        const oneSimpleApiConfig = {
          enabled: settings.oneSimpleApiEnabled ?? false,
          url: settings.oneSimpleApiUrl || '',
          formDataKey: settings.oneSimpleApiFormDataKey || '',
          formDataValue: settings.oneSimpleApiFormDataValue || '',
          recordTemplate: settings.oneSimpleApiRecordTemplate || '',
        };
        
        // Consolidate additional settings into JSON
        const additionalSettings = {
          forceFirstNameUppercase: settings.forceFirstNameUppercase ?? false,
        };
        
        const documentData: any = {
          // Core event info
          eventName: settings.eventName || '',
          eventDate: settings.eventDate.toISOString(),
          eventTime: settings.eventTime || '',
          eventLocation: settings.eventLocation || '',
          timeZone: settings.timeZone || '',
          barcodeUnique: settings.barcodeUnique ?? true,
          
          // Switchboard settings (keep existing attributes + add missing to fieldMappings)
          enableSwitchboard: settings.switchboardEnabled ?? false,
          switchboardApiKey: settings.switchboardApiKey || '',
          switchboardTemplateId: settings.switchboardTemplateId || '',
          switchboardFieldMappings: JSON.stringify({
            ...(typeof settings.switchboardFieldMappings === 'object' && settings.switchboardFieldMappings !== null 
              ? settings.switchboardFieldMappings 
              : {}),
            apiEndpoint: settings.switchboardApiEndpoint || '',
            authHeaderType: settings.switchboardAuthHeaderType || 'Bearer',
            requestBody: settings.switchboardRequestBody || '',
          }),
          
          // Consolidated JSON fields
          cloudinaryConfig: JSON.stringify(cloudinaryConfig),
          oneSimpleApiConfig: JSON.stringify(oneSimpleApiConfig),
          additionalSettings: JSON.stringify(additionalSettings),
          
          // Keep eventLogo as is
          eventLogo: settings.bannerImageUrl || '',
        };
        
        try {
          await appwriteDatabases.createDocument(
            DATABASE_ID,
            EVENT_SETTINGS_COLLECTION_ID,
            settings.id,
            documentData
          );
        } catch (error: any) {
          // If document ID already exists, try with a new ID
          if (
            error.code === 409 &&
            error.message.includes('Document with the requested ID already exists')
          ) {
            log(`Document ${settings.id} already exists, creating with new ID`, 'warn');
            await appwriteDatabases.createDocument(
              DATABASE_ID,
              EVENT_SETTINGS_COLLECTION_ID,
              'unique()', // Let Appwrite generate a unique ID
              documentData
            );
          } else {
            throw error;
          }
        }
        
        success++;
        log(`✅ Migrated: ${settings.eventName}`, 'success');
        
        // Log consolidated data for verification
        log(`   📦 Core Fields:`, 'info');
        log(`      - Event Date: ${settings.eventDate.toISOString()}`, 'info');
        log(`      - Location: ${settings.eventLocation}`, 'info');
        
        log(`   📦 Cloudinary Config (JSON):`, 'info');
        log(`      - Enabled: ${cloudinaryConfig.enabled}`, 'info');
        log(`      - Cloud Name: ${cloudinaryConfig.cloudName}`, 'info');
        
        log(`   📦 Switchboard Config:`, 'info');
        log(`      - Enabled: ${settings.switchboardEnabled}`, 'info');
        log(`      - Template ID: ${settings.switchboardTemplateId}`, 'info');
        
        log(`   📦 OneSimpleAPI Config (JSON):`, 'info');
        log(`      - Enabled: ${oneSimpleApiConfig.enabled}`, 'info');
        
        log(`   📦 Additional Settings (JSON):`, 'info');
        log(`      - Force Uppercase: ${additionalSettings.forceFirstNameUppercase}`, 'info');
        
      } catch (error: any) {
        failed++;
        const errorMsg = `${settings.eventName}: ${error.message}`;
        errors.push(errorMsg);
        log(`❌ Failed: ${errorMsg}`, 'error');
      }
    }
    
  } catch (error: any) {
    log(`Fatal error in migration: ${error.message}`, 'error');
    throw error;
  }
  
  // Summary
  log('\n========================================', 'info');
  log('MIGRATION SUMMARY', 'info');
  log('========================================', 'info');
  log(`✅ Success: ${success}`, success > 0 ? 'success' : 'info');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'info');
  
  if (errors.length > 0) {
    log('\nErrors:', 'error');
    errors.forEach(err => log(`  - ${err}`, 'error'));
  }
  
  log('========================================\n', 'info');
  
  if (failed === 0) {
    log('🎉 Event Settings migration completed successfully!', 'success');
    log('\n📝 Data Structure:', 'info');
    log('   - Core fields: 9 separate attributes', 'info');
    log('   - Cloudinary: 1 JSON attribute (9 settings)', 'info');
    log('   - Switchboard: 4 attributes (3 in fieldMappings JSON)', 'info');
    log('   - OneSimpleAPI: 1 JSON attribute (5 settings)', 'info');
    log('   - Additional: 1 JSON attribute (6 settings)', 'info');
    log('   - Total: ~16 attributes storing 38 fields', 'info');
  } else {
    log('⚠️  Migration completed with errors. Please review above.', 'warn');
  }
}

/**
 * Main function
 */
async function main() {
  log('🚀 Starting Event Settings Consolidated Migration...', 'info');
  log('========================================\n', 'info');
  
  try {
    // Step 1: Clear existing data FIRST (required before adding attributes)
    await clearEventSettings();
    
    // Step 2: Add consolidated attributes
    await addConsolidatedAttributes();
    
    // Step 3: Migrate data with consolidation
    await migrateEventSettings();
    
    log('\n✅ All operations completed!', 'success');
    log('\n📚 Important Notes:', 'info');
    log('   - Cloudinary settings are in cloudinaryConfig JSON field', 'info');
    log('   - OneSimpleAPI settings are in oneSimpleApiConfig JSON field', 'info');
    log('   - Additional settings are in additionalSettings JSON field', 'info');
    log('   - Switchboard extra settings are in switchboardFieldMappings JSON', 'info');
    log('\n🔧 Next Steps:', 'info');
    log('   1. Update your application code to parse JSON fields', 'info');
    log('   2. Verify data in Appwrite dashboard', 'info');
    log('   3. Test all features with the new structure', 'info');
    
  } catch (error: any) {
    log(`\n❌ Operation failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
