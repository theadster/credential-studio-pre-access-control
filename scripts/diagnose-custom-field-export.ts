/**
 * Diagnostic Script: Custom Field Export Issue
 * 
 * This script helps diagnose why custom field values aren't exporting for specific attendees.
 * Run with: npx ts-node scripts/diagnose-custom-field-export.ts
 */

import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);

const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;

async function diagnoseAttendee(barcode: string) {
  console.log('='.repeat(80));
  console.log(`DIAGNOSING ATTENDEE WITH BARCODE: ${barcode}`);
  console.log('='.repeat(80));
  console.log();

  try {
    // Find attendee by barcode
    console.log(`1. Searching for attendee with barcode ${barcode}...`);
    const attendeeResult = await databases.listDocuments(
      dbId,
      attendeesCollectionId,
      [Query.equal('barcodeNumber', barcode), Query.limit(1)]
    );

    if (attendeeResult.documents.length === 0) {
      console.log(`❌ Attendee not found with barcode ${barcode}`);
      return null;
    }

    const attendee = attendeeResult.documents[0];
    console.log('✅ Found attendee:', attendee.firstName, attendee.lastName);
    console.log('   Attendee ID:', attendee.$id);
    console.log();

    // Check customFieldValues
    console.log('2. Checking customFieldValues...');
    console.log('   Type:', typeof attendee.customFieldValues);
    console.log('   Raw value:', attendee.customFieldValues);
    console.log();

    // Parse customFieldValues
    let parsedValues: Record<string, any> = {};
    if (attendee.customFieldValues) {
      try {
        if (typeof attendee.customFieldValues === 'string') {
          parsedValues = JSON.parse(attendee.customFieldValues);
          console.log('✅ Successfully parsed customFieldValues (was string)');
        } else if (typeof attendee.customFieldValues === 'object') {
          parsedValues = attendee.customFieldValues;
          console.log('✅ customFieldValues is already an object');
        }
        console.log('   Parsed values:', JSON.stringify(parsedValues, null, 2));
        console.log('   Number of fields:', Object.keys(parsedValues).length);
      } catch (error) {
        console.log('❌ Failed to parse customFieldValues:', error);
      }
    } else {
      console.log('⚠️  customFieldValues is null/undefined');
    }
    console.log();

    // Fetch all custom fields
    console.log('3. Fetching custom field definitions...');
    const customFieldsResult = await databases.listDocuments(
      dbId,
      customFieldsCollectionId,
      [Query.limit(100)]
    );
    console.log('✅ Found', customFieldsResult.documents.length, 'custom fields');
    console.log();

    // Match custom field values with definitions
    console.log('4. Matching values with field definitions...');
    console.log('-'.repeat(80));
    
    for (const customField of customFieldsResult.documents) {
      const fieldId = customField.$id;
      const fieldName = customField.fieldName;
      const fieldType = customField.fieldType;
      const value = parsedValues[fieldId];
      
      console.log(`Field: ${fieldName} (${fieldType})`);
      console.log(`  ID: ${fieldId}`);
      console.log(`  Value: ${value !== undefined ? JSON.stringify(value) : '(not set)'}`);
      console.log(`  Has value: ${value !== undefined && value !== null && value !== ''}`);
      console.log();
    }
    console.log('-'.repeat(80));
    console.log();

    // Check for field ID mismatches
    console.log('5. Checking for field ID mismatches...');
    const definedFieldIds = new Set(customFieldsResult.documents.map(cf => cf.$id));
    const valueFieldIds = Object.keys(parsedValues);
    
    const orphanedValues = valueFieldIds.filter(id => !definedFieldIds.has(id));
    const missingValues = Array.from(definedFieldIds).filter(id => !valueFieldIds.includes(id));
    
    if (orphanedValues.length > 0) {
      console.log('⚠️  Found values for non-existent fields (orphaned):');
      orphanedValues.forEach(id => {
        console.log(`   - ${id}: ${parsedValues[id]}`);
      });
    } else {
      console.log('✅ No orphaned values found');
    }
    console.log();
    
    if (missingValues.length > 0) {
      console.log('⚠️  Found fields without values:');
      const missingFields = customFieldsResult.documents.filter(cf => missingValues.includes(cf.$id));
      missingFields.forEach(cf => {
        console.log(`   - ${cf.fieldName} (${cf.$id})`);
      });
    } else {
      console.log('✅ All fields have values');
    }
    console.log();

    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log('Attendee:', attendee.firstName, attendee.lastName);
    console.log('Barcode:', attendee.barcodeNumber);
    console.log('Custom field values stored:', Object.keys(parsedValues).length);
    console.log('Custom field definitions:', customFieldsResult.documents.length);
    console.log('Fields with values:', valueFieldIds.filter(id => definedFieldIds.has(id)).length);
    console.log('Orphaned values:', orphanedValues.length);
    console.log('Missing values:', missingValues.length);
    console.log('='.repeat(80));
    console.log();

    return {
      attendee,
      parsedValues,
      orphanedValues,
      missingValues,
      hasIssues: orphanedValues.length > 0 || Object.keys(parsedValues).length === 0
    };

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    return null;
  }
}

async function scanAllAttendees() {
  console.log('='.repeat(80));
  console.log('SCANNING ALL ATTENDEES FOR CUSTOM FIELD ISSUES');
  console.log('='.repeat(80));
  console.log();

  try {
    console.log('Fetching all attendees...');
    let allAttendees: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await databases.listDocuments(
        dbId,
        attendeesCollectionId,
        [Query.limit(limit), Query.offset(offset)]
      );
      allAttendees = allAttendees.concat(result.documents);
      offset += limit;
      hasMore = result.documents.length === limit;
    }

    console.log(`✅ Found ${allAttendees.length} attendees`);
    console.log();

    // Fetch custom field definitions
    const customFieldsResult = await databases.listDocuments(
      dbId,
      customFieldsCollectionId,
      [Query.limit(100)]
    );
    const definedFieldIds = new Set(customFieldsResult.documents.map((cf: any) => cf.$id));

    console.log('Analyzing custom field data...');
    console.log();

    const issues: any[] = [];

    for (const attendee of allAttendees) {
      let parsedValues: Record<string, any> = {};
      let hasParsingError = false;
      let isArrayFormat = false;

      if (attendee.customFieldValues) {
        try {
          if (typeof attendee.customFieldValues === 'string') {
            parsedValues = JSON.parse(attendee.customFieldValues);
          } else if (Array.isArray(attendee.customFieldValues)) {
            isArrayFormat = true;
            parsedValues = attendee.customFieldValues.reduce((acc: Record<string, any>, item: any) => {
              if (item.customFieldId) {
                acc[item.customFieldId] = item.value;
              }
              return acc;
            }, {});
          } else if (typeof attendee.customFieldValues === 'object') {
            parsedValues = attendee.customFieldValues;
          }
        } catch (error) {
          hasParsingError = true;
        }
      }

      const valueFieldIds = Object.keys(parsedValues);
      const orphanedValues = valueFieldIds.filter(id => !definedFieldIds.has(id));

      if (hasParsingError || orphanedValues.length > 0 || isArrayFormat) {
        issues.push({
          name: `${attendee.firstName} ${attendee.lastName}`,
          barcode: attendee.barcodeNumber,
          id: attendee.$id,
          hasParsingError,
          isArrayFormat,
          orphanedCount: orphanedValues.length,
          orphanedIds: orphanedValues,
          totalValues: valueFieldIds.length
        });
      }
    }

    console.log('='.repeat(80));
    console.log('SCAN RESULTS');
    console.log('='.repeat(80));
    console.log(`Total attendees: ${allAttendees.length}`);
    console.log(`Attendees with issues: ${issues.length}`);
    console.log();

    if (issues.length > 0) {
      console.log('ATTENDEES WITH ISSUES:');
      console.log('-'.repeat(80));
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.name} (Barcode: ${issue.barcode})`);
        if (issue.hasParsingError) {
          console.log('   ❌ Parsing error');
        }
        if (issue.isArrayFormat) {
          console.log('   ⚠️  Using array format (should be object)');
        }
        if (issue.orphanedCount > 0) {
          console.log(`   ⚠️  ${issue.orphanedCount} orphaned field(s): ${issue.orphanedIds.join(', ')}`);
        }
        console.log(`   Total values: ${issue.totalValues}`);
        console.log();
      });
    } else {
      console.log('✅ No issues found!');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during scan:', error);
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (command === 'scan') {
  scanAllAttendees();
} else if (command && command !== 'scan') {
  // Treat as barcode
  diagnoseAttendee(command);
} else {
  // Default: diagnose Vincent Coleman
  diagnoseAttendee('4459961');
}
