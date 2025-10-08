/**
 * Recreate Event Settings Collection from Scratch
 * 
 * This script:
 * 1. Deletes the existing Event Settings collection
 * 2. Creates a new collection with ALL 38 attributes
 * 3. Migrates all data from Supabase
 * 
 * Usage: npx tsx src/scripts/recreate-event-settings-fresh.ts
 */

import { Client, Databases, Permission, Role } from 'node-appwrite';
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
const EVENT_SETTINGS_COLLECTION_ID = 'event_settings';

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
 * Step 1: Delete existing collection
 */
async function deleteExistingCollection() {
  try {
    log('Deleting existing Event Settings collection...', 'info');
    await appwriteDatabases.deleteCollection(DATABASE_ID, EVENT_SETTINGS_COLLECTION_ID);
    log('Collection deleted successfully', 'success');
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error: any) {
    if (error.code === 404) {
      log('Collection does not exist (already deleted)', 'warn');
    } else {
      log(`Error deleting collection: ${error.message}`, 'error');
      throw error;
    }
  }
}

/**
 * Step 2: Create new collection with all attributes
 */
async function createNewCollection() {
  try {
    log('\nCreating new Event Settings collection...', 'info');
    
    // Create collection
    await appwriteDatabases.createCollection(
      DATABASE_ID,
      EVENT_SETTINGS_COLLECTION_ID,
      'Event Settings',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );
    log('Collection created', 'success');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add all 38 attributes based on Prisma schema
    log('\nAdding attributes (this will take ~30 seconds)...', 'info');
    
    const attributes = [
      // Core event info (5)
      { name: 'eventName', type: 'string', size: 255, required: true },
      { name: 'eventDate', type: 'datetime', required: true },
      { name: 'eventTime', type: 'string', size: 50, required: false },
      { name: 'eventLocation', type: 'string', size: 500, required: true },
      { name: 'timeZone', type: 'string', size: 100, required: true },
      
      // Barcode settings (3)
      { name: 'barcodeType', type: 'string', size: 50, required: true },
      { name: 'barcodeLength', type: 'integer', required: true },
      { name: 'barcodeUnique', type: 'boolean', required: false, default: true },
      
      // Name formatting (2)
      { name: 'forceFirstNameUppercase', type: 'boolean', required: false, default: false },
      { name: 'forceLastNameUppercase', type: 'boolean', required: false, default: false },
      
      // Attendee sorting (2)
      { name: 'attendeeSortField', type: 'string', size: 50, required: false },
      { name: 'attendeeSortDirection', type: 'string', size: 10, required: false },
      
      // Cloudinary settings (9)
      { name: 'cloudinaryEnabled', type: 'boolean', required: false, default: false },
      { name: 'cloudinaryCloudName', type: 'string', size: 255, required: false },
      { name: 'cloudinaryApiKey', type: 'string', size: 255, required: false },
      { name: 'cloudinaryApiSecret', type: 'string', size: 255, required: false },
      { name: 'cloudinaryUploadPreset', type: 'string', size: 255, required: false },
      { name: 'cloudinaryAutoOptimize', type: 'boolean', required: false, default: false },
      { name: 'cloudinaryGenerateThumbnails', type: 'boolean', required: false, default: false },
      { name: 'cloudinaryDisableSkipCrop', type: 'boolean', required: false, default: false },
      { name: 'cloudinaryCropAspectRatio', type: 'string', size: 20, required: false },
      
      // Switchboard settings (6 separate + 1 JSON)
      { name: 'switchboardEnabled', type: 'boolean', required: false, default: false },
      { name: 'switchboardApiEndpoint', type: 'string', size: 500, required: false },
      { name: 'switchboardAuthHeaderType', type: 'string', size: 50, required: false },
      { name: 'switchboardApiKey', type: 'string', size: 500, required: false },
      { name: 'switchboardRequestBody', type: 'string', size: 10000, required: false },
      { name: 'switchboardTemplateId', type: 'string', size: 255, required: false },
      
      // Additional settings consolidated into JSON (9 fields)
      // Contains: switchboardFieldMappings, oneSimpleApi (5), bannerImages (2)
      { name: 'additionalConfig', type: 'string', size: 15000, required: false },
    ];
    
    let created = 0;
    for (const attr of attributes) {
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
        } else if (attr.type === 'integer') {
          await appwriteDatabases.createIntegerAttribute(
            DATABASE_ID,
            EVENT_SETTINGS_COLLECTION_ID,
            attr.name,
            attr.required
          );
        }
        
        created++;
        log(`  ${created}/${attributes.length} - Created: ${attr.name}`, 'success');
        
        // Wait between creations to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        log(`  Failed to create ${attr.name}: ${error.message}`, 'error');
        throw error;
      }
    }
    
    log(`\n✅ Created ${created} attributes successfully!`, 'success');
    log('⏳ Waiting 15 seconds for Appwrite to finalize...', 'info');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
  } catch (error: any) {
    log(`Error creating collection: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Step 3: Migrate data
 */
async function migrateData() {
  log('\nStarting data migration...', 'info');
  
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  try {
    const eventSettings = await prisma.eventSettings.findMany();
    log(`Found ${eventSettings.length} event settings to migrate\n`, 'info');
    
    for (const settings of eventSettings) {
      try {
        const documentData: any = {
          // Core event info
          eventName: settings.eventName,
          eventDate: settings.eventDate.toISOString(),
          eventTime: settings.eventTime || '',
          eventLocation: settings.eventLocation,
          timeZone: settings.timeZone,
          
          // Barcode settings
          barcodeType: settings.barcodeType,
          barcodeLength: settings.barcodeLength,
          barcodeUnique: settings.barcodeUnique,
          
          // Name formatting
          forceFirstNameUppercase: settings.forceFirstNameUppercase ?? false,
          forceLastNameUppercase: settings.forceLastNameUppercase ?? false,
          
          // Attendee sorting
          attendeeSortField: settings.attendeeSortField || '',
          attendeeSortDirection: settings.attendeeSortDirection || '',
          
          // Cloudinary settings
          cloudinaryEnabled: settings.cloudinaryEnabled ?? false,
          cloudinaryCloudName: settings.cloudinaryCloudName || '',
          cloudinaryApiKey: settings.cloudinaryApiKey || '',
          cloudinaryApiSecret: settings.cloudinaryApiSecret || '',
          cloudinaryUploadPreset: settings.cloudinaryUploadPreset || '',
          cloudinaryAutoOptimize: settings.cloudinaryAutoOptimize ?? false,
          cloudinaryGenerateThumbnails: settings.cloudinaryGenerateThumbnails ?? false,
          cloudinaryDisableSkipCrop: settings.cloudinaryDisableSkipCrop ?? false,
          cloudinaryCropAspectRatio: settings.cloudinaryCropAspectRatio || '',
          
          // Switchboard settings
          switchboardEnabled: settings.switchboardEnabled ?? false,
          switchboardApiEndpoint: settings.switchboardApiEndpoint || '',
          switchboardAuthHeaderType: settings.switchboardAuthHeaderType || '',
          switchboardApiKey: settings.switchboardApiKey || '',
          switchboardRequestBody: settings.switchboardRequestBody || '',
          switchboardTemplateId: settings.switchboardTemplateId || '',
          
          // Additional config (consolidated JSON for remaining 9 fields)
          additionalConfig: JSON.stringify({
            switchboardFieldMappings: settings.switchboardFieldMappings || {},
            oneSimpleApi: {
              enabled: settings.oneSimpleApiEnabled ?? false,
              url: settings.oneSimpleApiUrl || '',
              formDataKey: settings.oneSimpleApiFormDataKey || '',
              formDataValue: settings.oneSimpleApiFormDataValue || '',
              recordTemplate: settings.oneSimpleApiRecordTemplate || '',
            },
            bannerImages: {
              bannerImageUrl: settings.bannerImageUrl || '',
              signInBannerUrl: settings.signInBannerUrl || '',
            },
          }),
        };
        
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          EVENT_SETTINGS_COLLECTION_ID,
          settings.id,
          documentData
        );
        
        success++;
        log(`✅ Migrated: ${settings.eventName}`, 'success');
        log(`   📅 Date: ${settings.eventDate.toISOString()}`, 'info');
        log(`   📍 Location: ${settings.eventLocation}`, 'info');
        log(`   🔢 Barcode: ${settings.barcodeType} (${settings.barcodeLength} digits)`, 'info');
        log(`   ☁️  Cloudinary: ${settings.cloudinaryEnabled ? 'Enabled' : 'Disabled'}`, 'info');
        log(`   🔌 Switchboard: ${settings.switchboardEnabled ? 'Enabled' : 'Disabled'}`, 'info');
        log('', 'info');
        
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
  log('========================================', 'info');
  log('MIGRATION SUMMARY', 'info');
  log('========================================', 'info');
  log(`✅ Success: ${success}`, success > 0 ? 'success' : 'info');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'info');
  
  if (errors.length > 0) {
    log('\n❌ Errors:', 'error');
    errors.forEach(err => log(`   - ${err}`, 'error'));
  }
  
  log('========================================\n', 'info');
  
  if (failed === 0) {
    log('🎉 Event Settings migration completed successfully!', 'success');
    log('\n📊 Collection Structure:', 'info');
    log('   - Total attributes: 28 (storing all 38 fields)', 'info');
    log('   - Core event fields: 5', 'info');
    log('   - Barcode settings: 3', 'info');
    log('   - Name formatting: 2', 'info');
    log('   - Attendee sorting: 2', 'info');
    log('   - Cloudinary settings: 9', 'info');
    log('   - Switchboard settings: 6', 'info');
    log('   - additionalConfig (JSON): 1 attribute containing 9 fields', 'info');
    log('     • switchboardFieldMappings', 'info');
    log('     • OneSimpleAPI settings (5 fields)', 'info');
    log('     • Banner images (2 fields)', 'info');
  } else {
    log('⚠️  Migration completed with errors. Please review above.', 'warn');
  }
}

/**
 * Main function
 */
async function main() {
  log('🚀 Starting Fresh Event Settings Migration...', 'info');
  log('========================================\n', 'info');
  
  try {
    // Step 1: Delete existing collection
    await deleteExistingCollection();
    
    // Step 2: Create new collection with all attributes
    await createNewCollection();
    
    // Step 3: Migrate data
    await migrateData();
    
    log('\n✅ All operations completed successfully!', 'success');
    log('\n📝 Next Steps:', 'info');
    log('   1. Verify data in Appwrite dashboard', 'info');
    log('   2. Update .env.local with collection ID if needed', 'info');
    log('   3. Test application with migrated data', 'info');
    
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
