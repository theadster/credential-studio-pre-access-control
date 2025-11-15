// @ts-nocheck
/**
 * ARCHIVED LEGACY MIGRATION SCRIPT
 * 
 * This script is archived and no longer maintained. It was used during the
 * migration from Prisma/Supabase to Appwrite and imports @prisma/client
 * which is no longer part of this project.
 * 
 * DO NOT USE THIS SCRIPT. It is kept for historical reference only.
 * 
 * Original Purpose: Complete Event Settings Migration
 * - Added ALL missing attributes and migrated data properly
 * - Based on inspection, the collection only has 8 attributes and needs
 *   the core attributes from the original setup plus our consolidated ones
 * 
 * Original Usage: npx tsx src/scripts/complete-event-settings-migration.ts
 */

import { Client, Databases } from 'node-appwrite';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_APPWRITE_ENDPOINT',
  'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
  'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID',
] as const;

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease ensure all required variables are set in .env.local');
  process.exit(1);
}

// Now we can safely use these as strings
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID as string;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY as string;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string;
const EVENT_SETTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID as string;

const prisma = new PrismaClient();

const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const appwriteDatabases = new Databases(appwriteClient);

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
 * Clear existing Event Settings documents
 */
async function clearEventSettings() {
  try {
    log('Clearing existing Event Settings documents...', 'info');
    const response = await appwriteDatabases.listDocuments(DATABASE_ID, EVENT_SETTINGS_COLLECTION_ID);

    for (const doc of response.documents) {
      try {
        await appwriteDatabases.deleteDocument(DATABASE_ID, EVENT_SETTINGS_COLLECTION_ID, doc.$id);
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
 * Add ALL missing attributes
 */
async function addMissingAttributes() {
  log('Adding missing attributes to Event Settings collection...', 'info');

  // Based on inspection, we need to add these core attributes that are missing
  const attributesToAdd = [
    // Core attributes from original setup (missing)
    { name: 'eventName', type: 'string', size: 255, required: false },
    { name: 'eventLogo', type: 'string', size: 1000, required: false },
    { name: 'barcodeType', type: 'string', size: 50, required: false },
    { name: 'barcodeLength', type: 'integer', required: false },
    { name: 'enableSwitchboard', type: 'boolean', required: false, default: false },
    { name: 'switchboardApiKey', type: 'string', size: 500, required: false },
    { name: 'switchboardTemplateId', type: 'string', size: 255, required: false },
    { name: 'switchboardFieldMappings', type: 'string', size: 10000, required: false },
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
      } else if (attr.type === 'integer') {
        await appwriteDatabases.createIntegerAttribute(
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
  }

  if (added > 0) {
    log('\n⏳ Waiting 15 seconds for Appwrite to process new attributes...', 'info');
    await new Promise(resolve => setTimeout(resolve, 15000));
  }

  // Verify all required attributes exist
  try {
    log('\n🔍 Verifying all required attributes...', 'info');
    const collection = await appwriteDatabases.getCollection(DATABASE_ID, EVENT_SETTINGS_COLLECTION_ID);
    const attributeNames = collection.attributes.map((attr: any) => attr.key);

    const requiredAttributes = [
      // Original 8 that exist
      'eventDate', 'eventTime', 'eventLocation', 'timeZone', 'barcodeUnique',
      'cloudinaryConfig', 'oneSimpleApiConfig', 'additionalSettings',
      // New 8 we just added
      'eventName', 'eventLogo', 'barcodeType', 'barcodeLength',
      'enableSwitchboard', 'switchboardApiKey', 'switchboardTemplateId', 'switchboardFieldMappings'
    ];

    const missingAttributes = requiredAttributes.filter(attr => !attributeNames.includes(attr));

    if (missingAttributes.length > 0) {
      log(`❌ Missing attributes: ${missingAttributes.join(', ')}`, 'error');
      throw new Error(`Missing required attributes: ${missingAttributes.join(', ')}`);
    }

    log(`✅ All ${requiredAttributes.length} required attributes verified!`, 'success');
    log(`   Total attributes in collection: ${attributeNames.length}`, 'info');
  } catch (error: any) {
    if (error.message.includes('Missing required attributes')) {
      throw error;
    }
    log(`⚠️  Could not verify attributes: ${error.message}`, 'warn');
  }
}

/**
 * Migrate Event Settings with all fields
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
          forceLastNameUppercase: settings.forceLastNameUppercase ?? false,
          attendeeSortField: settings.attendeeSortField || 'lastName',
          attendeeSortDirection: settings.attendeeSortDirection || 'asc',
          bannerImageUrl: settings.bannerImageUrl || '',
          signInBannerUrl: settings.signInBannerUrl || '',
        };

        // Prepare the document data with ALL attributes
        const documentData: any = {
          // Core event info
          eventName: settings.eventName || '',
          eventDate: settings.eventDate.toISOString(),
          eventTime: settings.eventTime || '',
          eventLocation: settings.eventLocation || '',
          timeZone: settings.timeZone || '',
          eventLogo: settings.bannerImageUrl || '',

          // Barcode settings
          barcodeType: settings.barcodeType || 'numerical',
          barcodeLength: settings.barcodeLength || 6,
          barcodeUnique: settings.barcodeUnique ?? true,

          // Switchboard settings
          enableSwitchboard: settings.switchboardEnabled ?? false,
          switchboardApiKey: settings.switchboardApiKey || '',
          switchboardTemplateId: settings.switchboardTemplateId || '',
          switchboardFieldMappings: (() => {
            // Parse existing field mappings safely
            let existingMappings = {};

            if (settings.switchboardFieldMappings) {
              if (typeof settings.switchboardFieldMappings === 'string') {
                // It's already a JSON string from Prisma, parse it
                try {
                  existingMappings = JSON.parse(settings.switchboardFieldMappings);
                } catch (error) {
                  log(`⚠️  Failed to parse switchboardFieldMappings for ${settings.eventName}, using empty object`, 'warn');
                  existingMappings = {};
                }
              } else if (typeof settings.switchboardFieldMappings === 'object') {
                // It's an object, use it directly
                existingMappings = settings.switchboardFieldMappings;
              }
            }

            // Merge with additional properties and stringify
            return JSON.stringify({
              ...existingMappings,
              apiEndpoint: settings.switchboardApiEndpoint || '',
              authHeaderType: settings.switchboardAuthHeaderType || 'Bearer',
              requestBody: settings.switchboardRequestBody || '',
            });
          })(),

          // Consolidated JSON fields
          cloudinaryConfig: JSON.stringify(cloudinaryConfig),
          oneSimpleApiConfig: JSON.stringify(oneSimpleApiConfig),
          additionalSettings: JSON.stringify(additionalSettings),
        };

        try {
          await appwriteDatabases.createDocument(
            DATABASE_ID,
            EVENT_SETTINGS_COLLECTION_ID,
            settings.id,
            documentData
          );
        } catch (error: any) {
          if (error.code === 409) {
            // Document already exists, try to update
            await appwriteDatabases.updateDocument(
              DATABASE_ID,
              EVENT_SETTINGS_COLLECTION_ID,
              settings.id,
              documentData
            );
          } else {
            throw error;
          }
        }

        success++;
        log(`✅ Migrated: ${settings.eventName}`, 'success');
        log(`   Event: ${settings.eventName} on ${settings.eventDate.toISOString()}`, 'info');
        log(`   Location: ${settings.eventLocation}`, 'info');
        log(`   Barcode: ${settings.barcodeType} (${settings.barcodeLength} digits)`, 'info');
        log(`   Cloudinary: ${cloudinaryConfig.enabled ? 'Enabled' : 'Disabled'}`, 'info');
        log(`   Switchboard: ${settings.switchboardEnabled ? 'Enabled' : 'Disabled'}`, 'info');

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
    log('\n📊 Final Structure:', 'info');
    log('   - Total attributes: 16', 'info');
    log('   - Core fields: 8 (eventName, eventDate, etc.)', 'info');
    log('   - Barcode fields: 3', 'info');
    log('   - Switchboard fields: 4', 'info');
    log('   - Consolidated JSON: 3 (Cloudinary, OneSimpleAPI, Additional)', 'info');
  } else {
    log('⚠️  Migration completed with errors. Please review above.', 'warn');
  }
}

/**
 * Main function
 */
async function main() {
  log('🚀 Starting Complete Event Settings Migration...', 'info');
  log('========================================\n', 'info');

  try {
    // Step 1: Clear existing data
    await clearEventSettings();

    // Step 2: Add missing core attributes
    await addMissingAttributes();

    // Step 3: Migrate all data
    await migrateEventSettings();

    log('\n✅ All operations completed!', 'success');
    log('\n📚 Next Steps:', 'info');
    log('   1. Verify data in Appwrite dashboard', 'info');
    log('   2. Update application code to parse JSON fields', 'info');
    log('   3. Test all event settings features', 'info');

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
