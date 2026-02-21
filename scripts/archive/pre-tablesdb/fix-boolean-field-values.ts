/**
 * Fix Boolean Custom Field Values Migration Script
 * 
 * This script fixes corrupted boolean custom field values that were stored as 'true'/'false'
 * instead of the correct 'yes'/'no' format. This corruption occurred due to a bug in the
 * CustomFieldInput Switch component.
 * 
 * The script:
 * 1. Identifies all boolean custom fields
 * 2. Finds attendees with 'true'/'false' values in those fields
 * 3. Converts 'true' -> 'yes' and 'false' -> 'no'
 * 4. Updates the database with corrected values
 * 
 * NOTE: This is a legacy pre-TablesDB script that uses the old Databases API.
 * 
 * Run with: node scripts/archive/pre-tablesdb/fix-boolean-field-values.ts
 */

import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Validate required environment variables
const NEXT_PUBLIC_APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const NEXT_PUBLIC_APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const NEXT_PUBLIC_APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID;
const NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID;

const missingVars = [];
if (!NEXT_PUBLIC_APPWRITE_ENDPOINT) missingVars.push('NEXT_PUBLIC_APPWRITE_ENDPOINT');
if (!NEXT_PUBLIC_APPWRITE_PROJECT_ID) missingVars.push('NEXT_PUBLIC_APPWRITE_PROJECT_ID');
if (!APPWRITE_API_KEY) missingVars.push('APPWRITE_API_KEY');
if (!NEXT_PUBLIC_APPWRITE_DATABASE_ID) missingVars.push('NEXT_PUBLIC_APPWRITE_DATABASE_ID');
if (!NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID) missingVars.push('NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID');
if (!NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) missingVars.push('NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID');

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  process.exit(1);
}

const client = new Client()
  .setEndpoint(NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(APPWRITE_API_KEY!);

const databases = new Databases(client);

const DATABASE_ID = NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const ATTENDEES_TABLE_ID = NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID;
const CUSTOM_FIELDS_TABLE_ID = NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID;

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

async function fixBooleanFieldValues() {
  console.log('🔍 Starting boolean field value migration...\n');

  try {
    // Step 1: Get all boolean custom fields
    console.log('📋 Fetching boolean custom fields...');
    const customFieldsResponse = await databases.listDocuments(
      DATABASE_ID,
      CUSTOM_FIELDS_TABLE_ID,
      [Query.equal('fieldType', 'boolean')]
    );

    const booleanFields = customFieldsResponse.documents as unknown as CustomField[];
    console.log(`✅ Found ${booleanFields.length} boolean custom fields\n`);

    if (booleanFields.length === 0) {
      console.log('ℹ️  No boolean fields found. Nothing to migrate.');
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
        ATTENDEES_TABLE_ID,
        [Query.limit(limit), Query.offset(offset)]
      );

      allAttendees = allAttendees.concat(response.documents as unknown as Attendee[]);
      offset += limit;
      hasMore = response.documents.length === limit;

      console.log(`  Fetched ${allAttendees.length} attendees so far...`);
    }

    console.log(`✅ Total attendees: ${allAttendees.length}\n`);

    // Step 3: Find and fix corrupted values
    console.log('🔧 Analyzing and fixing corrupted boolean values...\n');

    let fixedCount = 0;
    let errorCount = 0;
    const booleanFieldIds = new Set(booleanFields.map(f => f.$id));

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
          console.error(`  ❌ Error parsing customFieldValues for ${attendee.firstName} ${attendee.lastName}`);
          continue;
        }
      } else if (Array.isArray(attendee.customFieldValues)) {
        // Convert array to object
        customFieldValues = attendee.customFieldValues.reduce((acc, cfv) => {
          acc[cfv.customFieldId] = cfv.value;
          return acc;
        }, {} as Record<string, string>);
      } else if (attendee.customFieldValues !== null && typeof attendee.customFieldValues === 'object') {
        customFieldValues = attendee.customFieldValues as Record<string, string>;
      }

      let needsUpdate = false;
      const updatedValues: Record<string, string> = {};

      // Check each custom field value
      for (const [fieldId, value] of Object.entries(customFieldValues)) {
        // Only process if it's a boolean field
        if (booleanFieldIds.has(fieldId)) {
          // Check if value is corrupted (true/false instead of yes/no)
          if (value === 'true') {
            updatedValues[fieldId] = 'yes';
            needsUpdate = true;
            console.log(`  ⚠️  ${attendee.firstName} ${attendee.lastName}: Converting 'true' -> 'yes' for field ${fieldId}`);
          } else if (value === 'false') {
            updatedValues[fieldId] = 'no';
            needsUpdate = true;
            console.log(`  ⚠️  ${attendee.firstName} ${attendee.lastName}: Converting 'false' -> 'no' for field ${fieldId}`);
          } else {
            updatedValues[fieldId] = value;  // Keep existing value
          }
        } else {
          updatedValues[fieldId] = value;  // Keep non-boolean fields unchanged
        }
      }

      // Update if needed
      if (needsUpdate) {
        try {
          // Store back as JSON string to match Appwrite format
          await databases.updateDocument(
            DATABASE_ID,
            ATTENDEES_TABLE_ID,
            attendee.$id,
            { customFieldValues: JSON.stringify(updatedValues) }
          );
          fixedCount++;
          console.log(`  ✅ Fixed attendee: ${attendee.firstName} ${attendee.lastName}`);
        } catch (error) {
          errorCount++;
          console.error(`  ❌ Error fixing attendee ${attendee.firstName} ${attendee.lastName}:`, error);
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total attendees processed: ${allAttendees.length}`);
    console.log(`Attendees fixed: ${fixedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(60));

    if (fixedCount > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('   All boolean field values have been converted from true/false to yes/no.');
    } else {
      console.log('\nℹ️  No corrupted values found. Database is already in correct format.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixBooleanFieldValues()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
