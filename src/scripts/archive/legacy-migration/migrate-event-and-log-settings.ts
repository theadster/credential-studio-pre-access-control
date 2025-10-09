/**
 * Selective Migration Script: Event Settings and Log Settings
 * 
 * This script migrates only Event Settings and Log Settings collections
 * with the correct attribute mappings for Appwrite.
 * 
 * SCHEMA: Uses the same consolidated schema as complete-event-settings-migration.ts
 * - 16 total attributes for Event Settings
 * - Core fields: eventName, eventDate, eventTime, eventLocation, timeZone, eventLogo
 * - Barcode: barcodeType, barcodeLength, barcodeUnique
 * - Switchboard: enableSwitchboard, switchboardApiKey, switchboardTemplateId, switchboardFieldMappings
 * - Consolidated JSON: cloudinaryConfig, oneSimpleApiConfig, additionalSettings
 * 
 * NOTE: This script assumes all attributes already exist in the collection.
 * If attributes are missing, run complete-event-settings-migration.ts first.
 * 
 * Usage: npx tsx src/scripts/migrate-event-and-log-settings.ts
 */

import { Client, Databases, ID, Query } from 'node-appwrite';
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
const COLLECTIONS = {
  eventSettings: process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!,
  logSettings: process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID!,
};

// Migration statistics
interface MigrationStats {
  eventSettings: { success: number; failed: number; errors: string[] };
  logSettings: { success: number; failed: number; errors: string[] };
}

const stats: MigrationStats = {
  eventSettings: { success: 0, failed: 0, errors: [] },
  logSettings: { success: 0, failed: 0, errors: [] },
};

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

// Helper function to handle errors
function handleError(category: keyof MigrationStats, error: any, context: string) {
  const errorMessage = `${context}: ${error.message || error}`;
  stats[category].failed++;
  stats[category].errors.push(errorMessage);
  log(errorMessage, 'error');
}

/**
 * Delete existing documents from a collection
 */
async function clearCollection(collectionId: string, collectionName: string) {
  try {
    log(`Clearing existing ${collectionName}...`, 'info');
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await appwriteDatabases.listDocuments(
        DATABASE_ID,
        collectionId,
        [Query.limit(100)]
      );

      for (const doc of response.documents) {
        try {
          await appwriteDatabases.deleteDocument(
            DATABASE_ID,
            collectionId,
            doc.$id
          );
          totalDeleted++;
        } catch (error: any) {
          log(
            `Failed to delete document ${doc.$id}: ${error.message}`,
            'warn'
          );
        }
      }

      hasMore = response.documents.length === 100;
    }

    log(`Cleared ${totalDeleted} documents from ${collectionName}`, 'success');
  } catch (error: any) {
    log(`Error clearing ${collectionName}: ${error.message}`, 'error');
  }
}

/**
 * Migrate Event Settings
 * Maps Prisma schema to Appwrite attributes with complete field mapping:
 * Core fields: eventName, eventDate, eventTime, eventLocation, timeZone, eventLogo
 * Barcode: barcodeType, barcodeLength, barcodeUnique
 * Switchboard: enableSwitchboard, switchboardApiKey, switchboardTemplateId, switchboardFieldMappings
 * Consolidated JSON: cloudinaryConfig, oneSimpleApiConfig, additionalSettings
 */
async function migrateEventSettings() {
  log('Starting Event Settings migration...', 'info');
  
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

        // Prepare complete document data with all required fields
        const documentData: any = {
          // Core event info
          eventName: settings.eventName || '',
          eventDate: settings.eventDate ? settings.eventDate.toISOString() : new Date().toISOString(),
          eventTime: settings.eventTime || '',
          eventLocation: settings.eventLocation || '',
          timeZone: settings.timeZone || 'UTC',
          eventLogo: settings.bannerImageUrl || '',

          // Barcode settings
          barcodeType: settings.barcodeType || 'numerical',
          barcodeLength: settings.barcodeLength || 6,
          barcodeUnique: settings.barcodeUnique ?? true,

          // Switchboard settings
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

          // Consolidated JSON fields (must be stringified for Appwrite)
          cloudinaryConfig: JSON.stringify(cloudinaryConfig),
          oneSimpleApiConfig: JSON.stringify(oneSimpleApiConfig),
          additionalSettings: JSON.stringify(additionalSettings),
        };

        await appwriteDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.eventSettings,
          settings.id,
          documentData
        );
        
        stats.eventSettings.success++;
        log(`Migrated event settings: ${settings.eventName}`, 'success');
      } catch (error: any) {
        handleError('eventSettings', error, `Event settings ${settings.eventName}`);
      }
    }
    
    log(`Event Settings migration completed: ${stats.eventSettings.success} success, ${stats.eventSettings.failed} failed`, 'info');
  } catch (error: any) {
    log(`Fatal error in event settings migration: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Migrate Log Settings
 * Maps Prisma schema to Appwrite attributes:
 * - authLogin -> logUserLogin
 * - authLogout -> logUserLogout
 * - attendeeCreate -> logAttendeeCreate
 * - attendeeUpdate -> logAttendeeUpdate
 * - attendeeDelete -> logAttendeeDelete
 * - credentialGenerate -> logCredentialGenerate
 */
async function migrateLogSettings() {
  log('Starting Log Settings migration...', 'info');
  
  try {
    const logSettings = await prisma.logSettings.findMany();
    log(`Found ${logSettings.length} log settings to migrate`, 'info');
    
    for (const settings of logSettings) {
      try {
        // Map to Appwrite attributes (only the ones that exist in Appwrite)
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.logSettings,
          settings.id,
          {
            logUserLogin: settings.authLogin,
            logUserLogout: settings.authLogout,
            logAttendeeCreate: settings.attendeeCreate,
            logAttendeeUpdate: settings.attendeeUpdate,
            logAttendeeDelete: settings.attendeeDelete,
            logCredentialGenerate: settings.credentialGenerate,
          }
        );
        
        stats.logSettings.success++;
        log(`Migrated log settings`, 'success');
      } catch (error: any) {
        handleError('logSettings', error, `Log settings ${settings.id}`);
      }
    }
    
    log(`Log Settings migration completed: ${stats.logSettings.success} success, ${stats.logSettings.failed} failed`, 'info');
  } catch (error: any) {
    log(`Fatal error in log settings migration: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Generate migration summary report
 */
function generateReport() {
  log('\n========================================', 'info');
  log('MIGRATION SUMMARY REPORT', 'info');
  log('========================================\n', 'info');
  
  const categories: Array<keyof MigrationStats> = ['eventSettings', 'logSettings'];
  
  const categoryLabels: Record<keyof MigrationStats, string> = {
    eventSettings: 'Event Settings',
    logSettings: 'Log Settings',
  };
  
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (const category of categories) {
    const stat = stats[category];
    totalSuccess += stat.success;
    totalFailed += stat.failed;
    
    const status = stat.failed === 0 ? '✅' : stat.success > 0 ? '⚠️' : '❌';
    log(`${status} ${categoryLabels[category]}: ${stat.success} success, ${stat.failed} failed`, 'info');
    
    if (stat.errors.length > 0) {
      stat.errors.forEach(error => log(`   - ${error}`, 'error'));
    }
  }
  
  log('\n========================================', 'info');
  log(`TOTAL: ${totalSuccess} success, ${totalFailed} failed`, totalFailed === 0 ? 'success' : 'warn');
  log('========================================\n', 'info');
  
  if (totalFailed === 0) {
    log('🎉 Migration completed successfully!', 'success');
  } else {
    log('⚠️  Migration completed with some errors. Please review the errors above.', 'warn');
  }
}

/**
 * Main migration function
 */
async function main() {
  log('🚀 Starting selective migration for Event Settings and Log Settings...', 'info');
  log('========================================\n', 'info');
  
  try {
    // Clear existing data
    await clearCollection(COLLECTIONS.eventSettings, 'Event Settings');
    await clearCollection(COLLECTIONS.logSettings, 'Log Settings');
    
    // Run migrations
    await migrateEventSettings();
    await migrateLogSettings();
    
    // Generate report
    generateReport();
  } catch (error: any) {
    log(`\n❌ Migration failed with fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    await prisma.$disconnect();
  }
}

// Run migration
main();
