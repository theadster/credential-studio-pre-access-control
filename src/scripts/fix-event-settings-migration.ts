/**
 * Fix Event Settings Collection and Migration
 * 
 * This script:
 * 1. Adds all missing attributes to the Event Settings collection
 * 2. Migrates all Event Settings data from Supabase to Appwrite
 * 
 * Usage: npx tsx src/scripts/fix-event-settings-migration.ts
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
 * Add missing attributes to Event Settings collection
 */
async function addMissingAttributes() {
  log('Adding missing attributes to Event Settings collection...', 'info');
  
  const attributesToAdd = [
    // Core event info
    { name: 'eventDate', type: 'datetime', required: false },
    { name: 'eventTime', type: 'string', size: 50, required: false },
    { name: 'eventLocation', type: 'string', size: 500, required: false },
    { name: 'timeZone', type: 'string', size: 100, required: false },
    
    // Barcode settings (barcodeType and barcodeLength already exist)
    { name: 'barcodeUnique', type: 'boolean', required: false, default: true },
    
    // Name formatting
    { name: 'forceFirstNameUppercase', type: 'boolean', required: false, default: false },
    { name: 'forceLastNameUppercase', type: 'boolean', required: false, default: false },
    
    // Attendee sorting
    { name: 'attendeeSortField', type: 'string', size: 50, required: false },
    { name: 'attendeeSortDirection', type: 'string', size: 10, required: false },
    
    // Cloudinary settings
    { name: 'cloudinaryEnabled', type: 'boolean', required: false, default: false },
    { name: 'cloudinaryCloudName', type: 'string', size: 255, required: false },
    { name: 'cloudinaryApiKey', type: 'string', size: 255, required: false },
    { name: 'cloudinaryApiSecret', type: 'string', size: 255, required: false },
    { name: 'cloudinaryUploadPreset', type: 'string', size: 255, required: false },
    { name: 'cloudinaryAutoOptimize', type: 'boolean', required: false, default: false },
    { name: 'cloudinaryGenerateThumbnails', type: 'boolean', required: false, default: false },
    { name: 'cloudinaryDisableSkipCrop', type: 'boolean', required: false, default: false },
    { name: 'cloudinaryCropAspectRatio', type: 'string', size: 20, required: false },
    
    // Switchboard settings (some already exist)
    { name: 'switchboardApiEndpoint', type: 'string', size: 500, required: false },
    { name: 'switchboardAuthHeaderType', type: 'string', size: 50, required: false },
    { name: 'switchboardRequestBody', type: 'string', size: 10000, required: false },
    
    // OneSimpleAPI settings
    { name: 'oneSimpleApiEnabled', type: 'boolean', required: false, default: false },
    { name: 'oneSimpleApiUrl', type: 'string', size: 500, required: false },
    { name: 'oneSimpleApiFormDataKey', type: 'string', size: 255, required: false },
    { name: 'oneSimpleApiFormDataValue', type: 'string', size: 255, required: false },
    { name: 'oneSimpleApiRecordTemplate', type: 'string', size: 10000, required: false },
    
    // Banner images
    { name: 'signInBannerUrl', type: 'string', size: 1000, required: false },
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
      
      // Wait a bit between attribute creations to avoid rate limiting
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
  
  if (added > 0) {
    log('\n⏳ Waiting 10 seconds for Appwrite to process new attributes...', 'info');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
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
 * Migrate Event Settings data
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
        // Prepare the document data with all fields
        const documentData: any = {
          // Core event info
          eventName: settings.eventName || '',
          eventDate: settings.eventDate.toISOString(),
          eventTime: settings.eventTime || '',
          eventLocation: settings.eventLocation || '',
          timeZone: settings.timeZone || '',
          
          // Barcode settings
          barcodeType: settings.barcodeType || 'numerical',
          barcodeLength: settings.barcodeLength || 6,
          barcodeUnique: settings.barcodeUnique ?? true,
          
          // Name formatting
          forceFirstNameUppercase: settings.forceFirstNameUppercase ?? false,
          forceLastNameUppercase: settings.forceLastNameUppercase ?? false,
          
          // Attendee sorting
          attendeeSortField: settings.attendeeSortField || 'lastName',
          attendeeSortDirection: settings.attendeeSortDirection || 'asc',
          
          // Cloudinary settings
          cloudinaryEnabled: settings.cloudinaryEnabled ?? false,
          cloudinaryCloudName: settings.cloudinaryCloudName || '',
          cloudinaryApiKey: settings.cloudinaryApiKey || '',
          cloudinaryApiSecret: settings.cloudinaryApiSecret || '',
          cloudinaryUploadPreset: settings.cloudinaryUploadPreset || '',
          cloudinaryAutoOptimize: settings.cloudinaryAutoOptimize ?? false,
          cloudinaryGenerateThumbnails: settings.cloudinaryGenerateThumbnails ?? false,
          cloudinaryDisableSkipCrop: settings.cloudinaryDisableSkipCrop ?? false,
          cloudinaryCropAspectRatio: settings.cloudinaryCropAspectRatio || '1',
          
          // Switchboard settings
          enableSwitchboard: settings.switchboardEnabled ?? false,
          switchboardApiEndpoint: settings.switchboardApiEndpoint || '',
          switchboardAuthHeaderType: settings.switchboardAuthHeaderType || 'Bearer',
          switchboardApiKey: settings.switchboardApiKey || '',
          switchboardRequestBody: settings.switchboardRequestBody || '',
          switchboardTemplateId: settings.switchboardTemplateId || '',
          switchboardFieldMappings: settings.switchboardFieldMappings 
            ? JSON.stringify(settings.switchboardFieldMappings) 
            : '{}',
          
          // OneSimpleAPI settings
          oneSimpleApiEnabled: settings.oneSimpleApiEnabled ?? false,
          oneSimpleApiUrl: settings.oneSimpleApiUrl || '',
          oneSimpleApiFormDataKey: settings.oneSimpleApiFormDataKey || '',
          oneSimpleApiFormDataValue: settings.oneSimpleApiFormDataValue || '',
          oneSimpleApiRecordTemplate: settings.oneSimpleApiRecordTemplate || '',
          
          // Banner images
          eventLogo: settings.bannerImageUrl || '',
          signInBannerUrl: settings.signInBannerUrl || '',
        };
        
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          EVENT_SETTINGS_COLLECTION_ID,
          settings.id,
          documentData
        );
        
        success++;
        log(`✅ Migrated: ${settings.eventName}`, 'success');
        
        // Log all the fields being migrated for verification
        log(`   - Event Date: ${settings.eventDate.toISOString()}`, 'info');
        log(`   - Location: ${settings.eventLocation}`, 'info');
        log(`   - Barcode: ${settings.barcodeType} (${settings.barcodeLength} digits)`, 'info');
        log(`   - Cloudinary: ${settings.cloudinaryEnabled ? 'Enabled' : 'Disabled'}`, 'info');
        log(`   - Switchboard: ${settings.switchboardEnabled ? 'Enabled' : 'Disabled'}`, 'info');
        
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
  } else {
    log('⚠️  Migration completed with errors. Please review above.', 'warn');
  }
}

/**
 * Main function
 */
async function main() {
  log('🚀 Starting Event Settings Fix and Migration...', 'info');
  log('========================================\n', 'info');
  
  try {
    // Step 1: Add missing attributes
    await addMissingAttributes();
    
    // Step 2: Clear existing data
    await clearEventSettings();
    
    // Step 3: Migrate data
    await migrateEventSettings();
    
    log('\n✅ All operations completed!', 'success');
    log('\nNext steps:', 'info');
    log('1. Verify data in Appwrite dashboard', 'info');
    log('2. Check that all 38 fields are present', 'info');
    log('3. Test the application with the migrated data', 'info');
    
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
