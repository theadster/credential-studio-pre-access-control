/**
 * Selective Migration Script: Event Settings and Log Settings
 * 
 * This script migrates only Event Settings and Log Settings collections
 * with the correct attribute mappings for Appwrite.
 * 
 * Usage: npx tsx src/scripts/migrate-event-and-log-settings.ts
 */

import { Client, Databases, ID } from 'node-appwrite';
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
    const response = await appwriteDatabases.listDocuments(DATABASE_ID, collectionId);
    
    for (const doc of response.documents) {
      try {
        await appwriteDatabases.deleteDocument(DATABASE_ID, collectionId, doc.$id);
      } catch (error: any) {
        log(`Failed to delete document ${doc.$id}: ${error.message}`, 'warn');
      }
    }
    
    log(`Cleared ${response.documents.length} documents from ${collectionName}`, 'success');
  } catch (error: any) {
    log(`Error clearing ${collectionName}: ${error.message}`, 'error');
  }
}

/**
 * Migrate Event Settings
 * Maps Prisma schema to Appwrite attributes:
 * - eventName -> eventName
 * - barcodeType -> barcodeType
 * - barcodeLength -> barcodeLength
 * - switchboardEnabled -> enableSwitchboard
 * - switchboardApiKey -> switchboardApiKey
 * - switchboardTemplateId -> switchboardTemplateId
 * - switchboardFieldMappings -> switchboardFieldMappings
 * - bannerImageUrl -> eventLogo
 */
async function migrateEventSettings() {
  log('Starting Event Settings migration...', 'info');
  
  try {
    const eventSettings = await prisma.eventSettings.findMany();
    log(`Found ${eventSettings.length} event settings to migrate`, 'info');
    
    for (const settings of eventSettings) {
      try {
        // Map to Appwrite attributes (only the ones that exist in Appwrite)
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.eventSettings,
          settings.id,
          {
            eventName: settings.eventName || '',
            eventLogo: settings.bannerImageUrl || '',
            barcodeType: settings.barcodeType || 'numerical',
            barcodeLength: settings.barcodeLength || 6,
            enableSwitchboard: settings.switchboardEnabled || false,
            switchboardApiKey: settings.switchboardApiKey || '',
            switchboardTemplateId: settings.switchboardTemplateId || '',
            switchboardFieldMappings: settings.switchboardFieldMappings 
              ? JSON.stringify(settings.switchboardFieldMappings) 
              : '{}',
          }
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
