/**
 * Verify Boolean Custom Field Format Script
 * 
 * This script verifies that all boolean custom field values in the database
 * are in the correct 'yes'/'no' format (not 'true'/'false').
 * 
 * Use this to:
 * 1. Check if migration is needed
 * 2. Verify migration was successful
 * 3. Monitor data integrity
 * 
 * Run with: node scripts/verify-boolean-field-format.ts
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
const ATTENDEES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
const CUSTOM_FIELDS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;

interface CustomField {
  $id: string;
  fieldName: string;
  internalFieldName: string;
  fieldType: string;
}

interface CustomFieldValue {
  customFieldId: string;
  value: string;
}

interface Attendee {
  $id: string;
  firstName: string;
  lastName: string;
  customFieldValues: string | CustomFieldValue[] | Record<string, string>;  // Can be JSON string, array, or object
}

async function verifyBooleanFieldFormat() {
  console.log('🔍 Verifying boolean field format...\n');

  try {
    // Step 1: Get all boolean custom fields
    console.log('📋 Fetching boolean custom fields...');
    const customFieldsResponse = await databases.listDocuments(
      DATABASE_ID,
      CUSTOM_FIELDS_COLLECTION_ID,
      [Query.equal('fieldType', 'boolean')]
    );

    const booleanFields = customFieldsResponse.documents as unknown as CustomField[];
    console.log(`✅ Found ${booleanFields.length} boolean custom fields\n`);

    if (booleanFields.length === 0) {
      console.log('ℹ️  No boolean fields found. Nothing to verify.');
      return;
    }

    // Display boolean fields
    console.log('Boolean fields:');
    booleanFields.forEach(field => {
      console.log(`  - ${field.fieldName} (${field.internalFieldName})`);
    });
    console.log('');

    // Step 2: Get all attendees
    console.log('👥 Fetching all attendees...');
    let allAttendees: Attendee[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await databases.listDocuments(
        DATABASE_ID,
        ATTENDEES_COLLECTION_ID,
        [Query.limit(limit), Query.offset(offset)]
      );

      allAttendees = allAttendees.concat(response.documents as unknown as Attendee[]);
      offset += limit;
      hasMore = response.documents.length === limit;

      console.log(`  Fetched ${allAttendees.length} attendees so far...`);
    }

    console.log(`✅ Total attendees: ${allAttendees.length}\n`);

    // Step 3: Analyze boolean field values
    console.log('🔍 Analyzing boolean field values...\n');

    const booleanFieldIds = new Set(booleanFields.map(f => f.$id));
    const stats = {
      totalBooleanValues: 0,
      correctFormat: 0,      // 'yes' or 'no'
      corruptedFormat: 0,    // 'true' or 'false'
      invalidFormat: 0,      // anything else
      emptyValues: 0
    };

    const corruptedRecords: Array<{
      attendee: string;
      field: string;
      value: string;
    }> = [];

    const invalidRecords: Array<{
      attendee: string;
      field: string;
      value: string;
    }> = [];

    for (const attendee of allAttendees) {
      // CRITICAL: customFieldValues can be stored as:
      // 1. JSON string (most common in Appwrite)
      // 2. Object/Record (key-value pairs)
      // 3. Array of { customFieldId, value }
      let customFieldValues: Record<string, string> = {};

      if (typeof attendee.customFieldValues === 'string') {
        try {
          const parsed = JSON.parse(attendee.customFieldValues);
          // Handle both object and array formats
          if (Array.isArray(parsed)) {
            // Convert array to object
            customFieldValues = parsed.reduce((acc, cfv) => {
              acc[cfv.customFieldId] = cfv.value;
              return acc;
            }, {} as Record<string, string>);
          } else {
            customFieldValues = parsed;
          }
        } catch (e) {
          // Skip attendees with invalid JSON
          continue;
        }
      } else if (Array.isArray(attendee.customFieldValues)) {
        // Convert array to object
        customFieldValues = attendee.customFieldValues.reduce((acc, cfv) => {
          acc[cfv.customFieldId] = cfv.value;
          return acc;
        }, {} as Record<string, string>);
      } else if (typeof attendee.customFieldValues === 'object') {
        customFieldValues = attendee.customFieldValues as Record<string, string>;
      }

      for (const [fieldId, value] of Object.entries(customFieldValues)) {
        if (booleanFieldIds.has(fieldId)) {
          stats.totalBooleanValues++;

          const field = booleanFields.find(f => f.$id === fieldId);
          const fieldName = field?.fieldName || fieldId;

          if (!value || value === '') {
            stats.emptyValues++;
          } else if (value === 'yes' || value === 'no') {
            stats.correctFormat++;
          } else if (value === 'true' || value === 'false') {
            stats.corruptedFormat++;
            corruptedRecords.push({
              attendee: `${attendee.firstName} ${attendee.lastName}`,
              field: fieldName,
              value: value
            });
          } else {
            stats.invalidFormat++;
            invalidRecords.push({
              attendee: `${attendee.firstName} ${attendee.lastName}`,
              field: fieldName,
              value: value
            });
          }
        }
      }
    }

    // Display results
    console.log('='.repeat(60));
    console.log('📊 Verification Results');
    console.log('='.repeat(60));
    console.log(`Total boolean field values: ${stats.totalBooleanValues}`);
    console.log(`✅ Correct format (yes/no): ${stats.correctFormat}`);
    console.log(`⚠️  Corrupted format (true/false): ${stats.corruptedFormat}`);
    console.log(`❌ Invalid format (other): ${stats.invalidFormat}`);
    console.log(`ℹ️  Empty values: ${stats.emptyValues}`);
    console.log('='.repeat(60));

    // Show corrupted records
    if (corruptedRecords.length > 0) {
      console.log('\n⚠️  CORRUPTED RECORDS (true/false format):');
      console.log('-'.repeat(60));
      corruptedRecords.forEach(record => {
        console.log(`  ${record.attendee} - ${record.field}: "${record.value}"`);
      });
      console.log('\n🔧 Run fix-boolean-field-values.ts to correct these records.');
    }

    // Show invalid records
    if (invalidRecords.length > 0) {
      console.log('\n❌ INVALID RECORDS (unexpected format):');
      console.log('-'.repeat(60));
      invalidRecords.forEach(record => {
        console.log(`  ${record.attendee} - ${record.field}: "${record.value}"`);
      });
      console.log('\n⚠️  These records have unexpected values and may need manual review.');
    }

    // Final status
    console.log('\n' + '='.repeat(60));
    if (stats.corruptedFormat === 0 && stats.invalidFormat === 0) {
      console.log('✅ ALL BOOLEAN FIELDS ARE IN CORRECT FORMAT!');
      console.log('   Database integrity verified.');
    } else if (stats.corruptedFormat > 0) {
      console.log('⚠️  MIGRATION NEEDED!');
      console.log(`   ${stats.corruptedFormat} values need to be converted from true/false to yes/no.`);
      console.log('   Run: node scripts/fix-boolean-field-values.ts');
    } else {
      console.log('❌ MANUAL REVIEW NEEDED!');
      console.log(`   ${stats.invalidFormat} values have unexpected formats.`);
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run the verification
verifyBooleanFieldFormat()
  .then(() => {
    console.log('\n✨ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
