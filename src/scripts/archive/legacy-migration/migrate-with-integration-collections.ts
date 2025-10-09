/**
 * Event Settings Migration with Separate Integration Collections
 * 
 * LEGACY MIGRATION SCRIPT - REFERENCE ONLY
 * 
 * This script was used for one-time migration from Prisma to Appwrite.
 * It creates a normalized database structure:
 * - event_settings: Core event fields only
 * - cloudinary_integrations: All Cloudinary settings
 * - switchboard_integrations: All Switchboard settings
 * - onesimpleapi_integrations: All OneSimpleAPI settings
 * 
 * NOTE: Prisma dependency has been removed. This script is kept as a reference
 * for the database schema and migration logic. If you need to run a migration,
 * you'll need to adapt the data source section.
 * 
 * Usage: npx tsx src/scripts/migrate-with-integration-collections.ts
 */

import { Client, Databases, Permission, Role, ID } from 'node-appwrite';
// import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// const prisma = new PrismaClient();

const appwriteClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const appwriteDatabases = new Databases(appwriteClient);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

const COLLECTION_IDS = {
  eventSettings: 'event_settings',
  cloudinary: 'cloudinary_integrations',
  switchboard: 'switchboard_integrations',
  oneSimpleApi: 'onesimpleapi_integrations',
};

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = { info: '📋', success: '✅', error: '❌', warn: '⚠️' }[type];
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function deleteCollection(collectionId: string, name: string) {
  try {
    await appwriteDatabases.deleteCollection(DATABASE_ID, collectionId);
    log(`Deleted ${name} collection`, 'success');
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error: any) {
    if (error.code === 404) {
      log(`${name} collection doesn't exist (OK)`, 'warn');
    } else {
      throw error;
    }
  }
}

async function createEventSettingsCollection() {
  log('\nCreating Event Settings collection (core fields only)...', 'info');

  await appwriteDatabases.createCollection(
    DATABASE_ID,
    COLLECTION_IDS.eventSettings,
    'Event Settings',
    [Permission.read(Role.any()), Permission.create(Role.users()), Permission.update(Role.users()), Permission.delete(Role.users())]
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  const attributes = [
    { name: 'eventName', type: 'string', size: 255, required: true },
    { name: 'eventDate', type: 'datetime', required: true },
    { name: 'eventTime', type: 'string', size: 50, required: false },
    { name: 'eventLocation', type: 'string', size: 500, required: true },
    { name: 'timeZone', type: 'string', size: 100, required: true },
    { name: 'barcodeType', type: 'string', size: 50, required: true },
    { name: 'barcodeLength', type: 'integer', required: true },
    { name: 'barcodeUnique', type: 'boolean', required: false, default: true },
    { name: 'forceFirstNameUppercase', type: 'boolean', required: false, default: false },
    { name: 'forceLastNameUppercase', type: 'boolean', required: false, default: false },
    { name: 'attendeeSortField', type: 'string', size: 50, required: false },
    { name: 'attendeeSortDirection', type: 'string', size: 10, required: false },
    { name: 'bannerImageUrl', type: 'string', size: 1000, required: false },
    { name: 'signInBannerUrl', type: 'string', size: 1000, required: false },
  ];

  await Promise.all(
    attributes.map(async (attr) => {
      try {
        if (attr.type === 'string') {
          await appwriteDatabases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.eventSettings, attr.name, attr.size!, attr.required);
        } else if (attr.type === 'boolean') {
          await appwriteDatabases.createBooleanAttribute(DATABASE_ID, COLLECTION_IDS.eventSettings, attr.name, attr.required, attr.default);
        } else if (attr.type === 'datetime') {
          await appwriteDatabases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.eventSettings, attr.name, attr.required);
        } else if (attr.type === 'integer') {
          await appwriteDatabases.createIntegerAttribute(DATABASE_ID, COLLECTION_IDS.eventSettings, attr.name, attr.required);
        }
        log(`  Created: ${attr.name}`, 'success');
      } catch (error: any) {
        log(`  Failed to create ${attr.name}: ${error.message}`, 'error');
        throw error;
      }
    })
  );

  log(`✅ Event Settings collection created (${attributes.length} attributes)`, 'success');
}

async function createCloudinaryCollection() {
  log('\nCreating Cloudinary Integrations collection...', 'info');

  await appwriteDatabases.createCollection(
    DATABASE_ID,
    COLLECTION_IDS.cloudinary,
    'Cloudinary Integrations',
    [Permission.read(Role.any()), Permission.create(Role.users()), Permission.update(Role.users()), Permission.delete(Role.users())]
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  const attributes = [
    { name: 'eventSettingsId', type: 'string', size: 255, required: true },
    { name: 'enabled', type: 'boolean', required: false, default: false },
    { name: 'cloudName', type: 'string', size: 255, required: false },
    // SECURITY: API credentials should NOT be stored in the database
    // Instead, use environment variables or Appwrite Functions environment variables
    // { name: 'apiKey', type: 'string', size: 255, required: false },
    // { name: 'apiSecret', type: 'string', size: 255, required: false },
    { name: 'uploadPreset', type: 'string', size: 255, required: false },
    { name: 'autoOptimize', type: 'boolean', required: false, default: false },
    { name: 'generateThumbnails', type: 'boolean', required: false, default: false },
    { name: 'disableSkipCrop', type: 'boolean', required: false, default: false },
    { name: 'cropAspectRatio', type: 'string', size: 20, required: false },
  ];

  await Promise.all(
    attributes.map(async (attr) => {
      try {
        if (attr.type === 'string') {
          await appwriteDatabases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.cloudinary, attr.name, attr.size!, attr.required);
        } else if (attr.type === 'boolean') {
          await appwriteDatabases.createBooleanAttribute(DATABASE_ID, COLLECTION_IDS.cloudinary, attr.name, attr.required, attr.default);
        }
        log(`  Created: ${attr.name}`, 'success');
      } catch (error: any) {
        log(`  Failed to create ${attr.name}: ${error.message}`, 'error');
        throw error;
      }
    })
  );

  log(`✅ Cloudinary collection created (${attributes.length} attributes)`, 'success');
}

async function createSwitchboardCollection() {
  log('\nCreating Switchboard Integrations collection...', 'info');

  await appwriteDatabases.createCollection(
    DATABASE_ID,
    COLLECTION_IDS.switchboard,
    'Switchboard Integrations',
    [Permission.read(Role.any()), Permission.create(Role.users()), Permission.update(Role.users()), Permission.delete(Role.users())]
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  const attributes = [
    { name: 'eventSettingsId', type: 'string', size: 255, required: true },
    { name: 'enabled', type: 'boolean', required: false, default: false },
    { name: 'apiEndpoint', type: 'string', size: 500, required: false },
    { name: 'authHeaderType', type: 'string', size: 50, required: false },
    // SECURITY: API keys should NOT be stored in the database
    // Instead, use environment variables or Appwrite Functions environment variables
    // { name: 'apiKey', type: 'string', size: 500, required: false },
    { name: 'requestBody', type: 'string', size: 3000, required: false },
    { name: 'templateId', type: 'string', size: 255, required: false },
    { name: 'fieldMappings', type: 'string', size: 10000, required: false },
  ];

  await Promise.all(
    attributes.map(async (attr) => {
      try {
        if (attr.type === 'string') {
          await appwriteDatabases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.switchboard, attr.name, attr.size!, attr.required);
        } else if (attr.type === 'boolean') {
          await appwriteDatabases.createBooleanAttribute(DATABASE_ID, COLLECTION_IDS.switchboard, attr.name, attr.required, attr.default);
        }
        log(`  Created: ${attr.name}`, 'success');
      } catch (error: any) {
        log(`  Failed to create ${attr.name}: ${error.message}`, 'error');
        throw error;
      }
    })
  );

  log(`✅ Switchboard collection created (${attributes.length} attributes)`, 'success');
}

async function createOneSimpleApiCollection() {
  log('\nCreating OneSimpleAPI Integrations collection...', 'info');

  await appwriteDatabases.createCollection(
    DATABASE_ID,
    COLLECTION_IDS.oneSimpleApi,
    'OneSimpleAPI Integrations',
    [Permission.read(Role.any()), Permission.create(Role.users()), Permission.update(Role.users()), Permission.delete(Role.users())]
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  const attributes = [
    { name: 'eventSettingsId', type: 'string', size: 255, required: true },
    { name: 'enabled', type: 'boolean', required: false, default: false },
    { name: 'url', type: 'string', size: 500, required: false },
    { name: 'formDataKey', type: 'string', size: 255, required: false },
    { name: 'formDataValue', type: 'string', size: 5000, required: false },
    { name: 'recordTemplate', type: 'string', size: 10000, required: false },
  ];

  await Promise.all(
    attributes.map(async (attr) => {
      try {
        if (attr.type === 'string') {
          await appwriteDatabases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.oneSimpleApi, attr.name, attr.size!, attr.required);
        } else if (attr.type === 'boolean') {
          await appwriteDatabases.createBooleanAttribute(DATABASE_ID, COLLECTION_IDS.oneSimpleApi, attr.name, attr.required, attr.default);
        }
        log(`  Created: ${attr.name}`, 'success');
      } catch (error: any) {
        log(`  Failed to create ${attr.name}: ${error.message}`, 'error');
        throw error;
      }
    })
  );

  log(`✅ OneSimpleAPI collection created (${attributes.length} attributes)`, 'success');
}

async function migrateData() {
  log('\n⏳ Waiting 15 seconds for Appwrite to finalize collections...', 'info');
  await new Promise(resolve => setTimeout(resolve, 15000));

  log('\nStarting data migration...', 'info');

  // NOTE: Prisma has been removed. If you need to migrate data, replace this with your data source.
  // Example: Read from JSON file, API, or another database
  const eventSettings: any[] = [];
  // const eventSettings = await prisma.eventSettings.findMany();

  if (eventSettings.length === 0) {
    log('⚠️  No data to migrate. This is expected if Prisma has been removed.', 'warn');
    log('   If you need to migrate data, update the migrateData() function with your data source.', 'info');
    return;
  }

  log(`Found ${eventSettings.length} event settings to migrate\n`, 'info');

  let success = 0;
  let failed = 0;

  for (const settings of eventSettings) {
    try {
      // 1. Create Event Settings document
      await appwriteDatabases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.eventSettings,
        settings.id,
        {
          eventName: settings.eventName,
          eventDate: settings.eventDate.toISOString(),
          eventTime: settings.eventTime || '',
          eventLocation: settings.eventLocation,
          timeZone: settings.timeZone,
          barcodeType: settings.barcodeType,
          barcodeLength: settings.barcodeLength,
          barcodeUnique: settings.barcodeUnique,
          forceFirstNameUppercase: settings.forceFirstNameUppercase ?? false,
          forceLastNameUppercase: settings.forceLastNameUppercase ?? false,
          attendeeSortField: settings.attendeeSortField || '',
          attendeeSortDirection: settings.attendeeSortDirection || '',
          bannerImageUrl: settings.bannerImageUrl || '',
          signInBannerUrl: settings.signInBannerUrl || '',
        }
      );

      // 2. Create Cloudinary Integration document (only if configured)
      // SECURITY NOTE: API credentials are NOT migrated to the database
      // They must be configured as environment variables instead
      const hasCloudinaryConfig = settings.cloudinaryEnabled === true ||
        settings.cloudinaryCloudName ||
        settings.cloudinaryApiKey ||
        settings.cloudinaryApiSecret ||
        settings.cloudinaryUploadPreset ||
        settings.cloudinaryCropAspectRatio;

      if (hasCloudinaryConfig) {
        await appwriteDatabases.createDocument(
          DATABASE_ID,
          COLLECTION_IDS.cloudinary,
          ID.unique(),
          {
            eventSettingsId: settings.id,
            enabled: settings.cloudinaryEnabled ?? false,
            cloudName: settings.cloudinaryCloudName || '',
            // apiKey and apiSecret are intentionally omitted for security
            uploadPreset: settings.cloudinaryUploadPreset || '',
            autoOptimize: settings.cloudinaryAutoOptimize ?? false,
            generateThumbnails: settings.cloudinaryGenerateThumbnails ?? false,
            disableSkipCrop: settings.cloudinaryDisableSkipCrop ?? false,
            cropAspectRatio: settings.cloudinaryCropAspectRatio || '',
          }
        );

        // Log if credentials exist that need to be manually configured
        if (settings.cloudinaryApiKey || settings.cloudinaryApiSecret) {
          log(`   ⚠️  Cloudinary credentials detected for "${settings.eventName}" - must be configured as environment variables`, 'warn');
        }
      }

      // 3. Create Switchboard Integration document
      // SECURITY NOTE: API key is NOT migrated to the database
      // It must be configured as an environment variable instead
      await appwriteDatabases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.switchboard,
        ID.unique(),
        {
          eventSettingsId: settings.id,
          enabled: settings.switchboardEnabled ?? false,
          apiEndpoint: settings.switchboardApiEndpoint || '',
          authHeaderType: settings.switchboardAuthHeaderType || '',
          // apiKey is intentionally omitted for security
          requestBody: settings.switchboardRequestBody || '',
          templateId: settings.switchboardTemplateId || '',
          fieldMappings: settings.switchboardFieldMappings ? JSON.stringify(settings.switchboardFieldMappings) : '',
        }
      );

      // Log if API key exists that needs to be manually configured
      if (settings.switchboardApiKey) {
        log(`   ⚠️  Switchboard API key detected for "${settings.eventName}" - must be configured as environment variable`, 'warn');
      }

      // 4. Create OneSimpleAPI Integration document
      await appwriteDatabases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.oneSimpleApi,
        ID.unique(),
        {
          eventSettingsId: settings.id,
          enabled: settings.oneSimpleApiEnabled ?? false,
          url: settings.oneSimpleApiUrl || '',
          formDataKey: settings.oneSimpleApiFormDataKey || '',
          formDataValue: settings.oneSimpleApiFormDataValue || '',
          recordTemplate: settings.oneSimpleApiRecordTemplate || '',
        }
      );

      success++;
      log(`✅ Migrated: ${settings.eventName}`, 'success');
      log(`   📅 Event Settings + 3 Integration records created`, 'info');

    } catch (error: any) {
      failed++;
      log(`❌ Failed: ${settings.eventName} - ${error.message}`, 'error');
    }
  }

  log('\n========================================', 'info');
  log('MIGRATION SUMMARY', 'info');
  log('========================================', 'info');
  log(`✅ Success: ${success} event settings`, 'success');
  log(`   Total documents created: ${success * 4}`, 'info');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'info');
  log('========================================\n', 'info');

  if (failed === 0) {
    log('🎉 Migration completed successfully!', 'success');
  }
}

async function updateEnvFile() {
  log('\n📝 Environment Variables to Add:', 'info');
  log('Add these to your .env.local file:\n', 'info');
  log(`NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID=${COLLECTION_IDS.cloudinary}`, 'info');
  log(`NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID=${COLLECTION_IDS.switchboard}`, 'info');
  log(`NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID=${COLLECTION_IDS.oneSimpleApi}`, 'info');

  log('\n🔐 SECURITY: API Credentials Configuration', 'warn');
  log('========================================', 'warn');
  log('API credentials are NO LONGER stored in the database for security.', 'warn');
  log('Configure integration credentials using one of these methods:\n', 'warn');
  log('Option 1: Environment Variables (Recommended for single-tenant)', 'info');
  log('  # Cloudinary', 'info');
  log('  CLOUDINARY_CLOUD_NAME=your-cloud-name', 'info');
  log('  CLOUDINARY_API_KEY=your-api-key', 'info');
  log('  CLOUDINARY_API_SECRET=your-api-secret', 'info');
  log('  # Switchboard', 'info');
  log('  SWITCHBOARD_API_KEY=your-switchboard-key\n', 'info');
  log('Option 2: Appwrite Functions Environment Variables (Multi-tenant)', 'info');
  log('  Configure per-function environment variables in Appwrite Console', 'info');
  log('  Store credentials securely in Appwrite Functions settings\n', 'info');
  log('Option 3: External Secrets Manager (Enterprise)', 'info');
  log('  Use AWS Secrets Manager, HashiCorp Vault, or similar', 'info');
  log('  Fetch secrets at runtime using secure API calls\n', 'info');
  log('⚠️  NEVER commit credentials to version control!', 'error');
  log('========================================\n', 'warn');
}

async function main() {
  log('🚀 Starting Event Settings Migration with Integration Collections...', 'info');
  log('========================================\n', 'info');

  try {
    // Step 1: Delete existing collections
    log('Step 1: Deleting existing collections...', 'info');
    await deleteCollection(COLLECTION_IDS.eventSettings, 'Event Settings');
    await deleteCollection(COLLECTION_IDS.cloudinary, 'Cloudinary');
    await deleteCollection(COLLECTION_IDS.switchboard, 'Switchboard');
    await deleteCollection(COLLECTION_IDS.oneSimpleApi, 'OneSimpleAPI');

    // Step 2: Create new collections
    log('\nStep 2: Creating new collections...', 'info');
    await createEventSettingsCollection();
    await createCloudinaryCollection();
    await createSwitchboardCollection();
    await createOneSimpleApiCollection();

    // Step 3: Migrate data
    log('\nStep 3: Migrating data...', 'info');
    await migrateData();

    // Step 4: Show env variables
    await updateEnvFile();

    log('\n✅ All operations completed!', 'success');
    log('\n📚 Next Steps:', 'info');
    log('   1. Add the collection ID environment variables above to .env.local', 'info');
    log('   2. Configure API credentials securely (see security notes above)', 'info');
    log('   3. Update application code to read credentials from environment variables', 'info');
    log('   4. Update application code to query integration collections', 'info');
    log('   5. Test all integration features', 'info');
    log('   6. Review docs/migration/INTEGRATION_SECRETS_MIGRATION.md for details', 'info');

  } catch (error: any) {
    log(`\n❌ Operation failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    // await prisma.$disconnect();
    log('Migration script completed.', 'info');
  }
}

main();
