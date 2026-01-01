/**
 * Migration Script: Convert Custom Field Array Format to Object Format
 * 
 * This script identifies and converts attendees with custom field values
 * stored in legacy array format to the current object format.
 * 
 * Array format (legacy):
 * [{"customFieldId": "id1", "value": "val1"}, {"customFieldId": "id2", "value": "val2"}]
 * 
 * Object format (current):
 * {"id1": "val1", "id2": "val2"}
 * 
 * Usage:
 *   npx tsx scripts/migrate-custom-field-format.ts          # Dry run (preview only)
 *   npx tsx scripts/migrate-custom-field-format.ts --apply  # Apply changes
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

const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;

interface MigrationResult {
  attendeeId: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  beforeFormat: 'array' | 'object' | 'invalid';
  afterFormat: 'object';
  fieldCount: number;
  success: boolean;
  error?: string;
}

async function migrateCustomFieldFormat(dryRun: boolean = true): Promise<void> {
  console.log('================================================================================');
  console.log('CUSTOM FIELD FORMAT MIGRATION');
  console.log('================================================================================');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (Preview Only)' : '✅ APPLY CHANGES'}`);
  console.log('');

  const results: MigrationResult[] = [];
  let totalAttendees = 0;
  let arrayFormatCount = 0;
  let objectFormatCount = 0;
  let invalidFormatCount = 0;
  let migratedCount = 0;
  let errorCount = 0;

  try {
    console.log('Fetching all attendees...');
    
    // Fetch all attendees (handle pagination if needed)
    let allAttendees: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await databases.listDocuments(
        dbId,
        attendeesCollectionId,
        [
          Query.limit(limit),
          Query.offset(offset)
        ]
      );

      allAttendees = allAttendees.concat(response.documents);
      offset += limit;
      hasMore = response.documents.length === limit;

      if (hasMore) {
        console.log(`  Fetched ${allAttendees.length} attendees so far...`);
      }
    }

    totalAttendees = allAttendees.length;
    console.log(`✅ Found ${totalAttendees} attendees\n`);

    console.log('Analyzing custom field data...\n');

    for (const attendee of allAttendees) {
      if (!attendee.customFieldValues) {
        continue; // Skip attendees without custom fields
      }

      try {
        const parsed = typeof attendee.customFieldValues === 'string'
          ? JSON.parse(attendee.customFieldValues)
          : attendee.customFieldValues;

        let format: 'array' | 'object' | 'invalid';
        let needsMigration = false;
        let convertedData: Record<string, any> | null = null;

        if (Array.isArray(parsed)) {
          format = 'array';
          arrayFormatCount++;
          needsMigration = true;

          // Convert array to object
          convertedData = {};
          parsed.forEach((item: any) => {
            if (item.customFieldId && item.value !== undefined) {
              convertedData![item.customFieldId] = item.value;
            }
          });

          const result: MigrationResult = {
            attendeeId: attendee.$id,
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            barcodeNumber: attendee.barcodeNumber,
            beforeFormat: 'array',
            afterFormat: 'object',
            fieldCount: Object.keys(convertedData).length,
            success: false
          };

          if (!dryRun && convertedData) {
            try {
              // Apply the migration
              await databases.updateDocument(
                dbId,
                attendeesCollectionId,
                attendee.$id,
                {
                  customFieldValues: JSON.stringify(convertedData)
                }
              );

              result.success = true;
              migratedCount++;
              console.log(`✅ Migrated: ${attendee.firstName} ${attendee.lastName} (Barcode: ${attendee.barcodeNumber})`);
              console.log(`   Fields: ${result.fieldCount}`);
            } catch (error: any) {
              result.success = false;
              result.error = error.message;
              errorCount++;
              console.error(`❌ Error migrating ${attendee.firstName} ${attendee.lastName}:`, error.message);
            }
          } else if (dryRun) {
            result.success = true; // Mark as success for dry run
            console.log(`🔍 Would migrate: ${attendee.firstName} ${attendee.lastName} (Barcode: ${attendee.barcodeNumber})`);
            console.log(`   Fields: ${result.fieldCount}`);
            console.log(`   Before: [{"customFieldId": "...", "value": "..."}]`);
            console.log(`   After:  {"fieldId": "value"}`);
          }

          results.push(result);

        } else if (typeof parsed === 'object' && parsed !== null) {
          format = 'object';
          objectFormatCount++;
          // Already in correct format, no migration needed
        } else {
          format = 'invalid';
          invalidFormatCount++;
          console.warn(`⚠️  Invalid format for ${attendee.firstName} ${attendee.lastName} (${attendee.barcodeNumber})`);
        }

      } catch (error: any) {
        invalidFormatCount++;
        console.error(`❌ Parse error for ${attendee.firstName} ${attendee.lastName}:`, error.message);
      }
    }

    // Print summary
    console.log('\n================================================================================');
    console.log('MIGRATION SUMMARY');
    console.log('================================================================================');
    console.log(`Total attendees: ${totalAttendees}`);
    console.log(`Attendees with custom fields: ${arrayFormatCount + objectFormatCount + invalidFormatCount}`);
    console.log('');
    console.log('Format breakdown:');
    console.log(`  ✅ Object format (correct): ${objectFormatCount}`);
    console.log(`  ⚠️  Array format (needs migration): ${arrayFormatCount}`);
    console.log(`  ❌ Invalid format: ${invalidFormatCount}`);
    console.log('');

    if (dryRun) {
      console.log('🔍 DRY RUN COMPLETE - No changes were made');
      console.log('');
      console.log('To apply these changes, run:');
      console.log('  npx tsx scripts/migrate-custom-field-format.ts --apply');
    } else {
      console.log('✅ MIGRATION COMPLETE');
      console.log(`  Successfully migrated: ${migratedCount}`);
      console.log(`  Errors: ${errorCount}`);
    }

    console.log('================================================================================\n');

    // Print detailed results if there were any migrations
    if (results.length > 0) {
      console.log('Detailed Results:');
      console.log('--------------------------------------------------------------------------------');
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.firstName} ${result.lastName} (Barcode: ${result.barcodeNumber})`);
        console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
        console.log(`   Fields: ${result.fieldCount}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      });
      console.log('================================================================================\n');
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const applyChanges = args.includes('--apply');

// Run migration
migrateCustomFieldFormat(!applyChanges)
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
