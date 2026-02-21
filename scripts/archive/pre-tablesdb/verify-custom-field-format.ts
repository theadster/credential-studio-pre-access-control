/**
 * Verification Script: Custom Field Format Validation
 * 
 * This script verifies that all attendee custom field values are in the correct object format
 * and identifies any records that still have legacy array format or numerical keys.
 * 
 * Usage:
 *   npx tsx scripts/archive/pre-tablesdb/verify-custom-field-format.ts
 */

import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const attendeesTableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID!;
const customFieldsTableId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID!;

async function verifyCustomFieldFormat(): Promise<void> {
  console.log('================================================================================');
  console.log('CUSTOM FIELD FORMAT VERIFICATION');
  console.log('================================================================================\n');

  try {
    // Fetch valid field IDs
    const customFieldsResponse = await databases.listDocuments(
      dbId,
      customFieldsTableId,
      [Query.limit(100)]
    );

    const validFieldIds = new Set(customFieldsResponse.documents.map(f => f.$id));
    console.log(`✅ Found ${validFieldIds.size} custom field definitions\n`);

    // Fetch all attendees
    console.log('Fetching all attendees...');
    let allAttendees: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await databases.listDocuments(
        dbId,
        attendeesTableId,
        [Query.limit(limit), Query.offset(offset)]
      );

      allAttendees = allAttendees.concat(response.documents);
      offset += limit;
      hasMore = response.documents.length === limit;
    }

    console.log(`✅ Found ${allAttendees.length} attendees\n`);

    let validCount = 0;
    let arrayFormatCount = 0;
    let numericalKeysCount = 0;
    let invalidCount = 0;
    let emptyCount = 0;

    const issues: Array<{ attendeeId: string; name: string; issue: string }> = [];

    for (const attendee of allAttendees) {
      if (!attendee.customFieldValues) {
        emptyCount++;
        continue;
      }

      try {
        const parsed = typeof attendee.customFieldValues === 'string'
          ? JSON.parse(attendee.customFieldValues)
          : attendee.customFieldValues;

        if (Array.isArray(parsed)) {
          arrayFormatCount++;
          issues.push({
            attendeeId: attendee.$id,
            name: `${attendee.firstName} ${attendee.lastName}`,
            issue: 'Array format (legacy)'
          });
        } else if (typeof parsed === 'object' && parsed !== null) {
          const keys = Object.keys(parsed);
          const hasNumericalKeys = keys.some(key => /^\d+$/.test(key));

          if (hasNumericalKeys) {
            numericalKeysCount++;
            issues.push({
              attendeeId: attendee.$id,
              name: `${attendee.firstName} ${attendee.lastName}`,
              issue: `Numerical keys: ${keys.join(', ')}`
            });
          } else {
            validCount++;
          }
        } else {
          invalidCount++;
          issues.push({
            attendeeId: attendee.$id,
            name: `${attendee.firstName} ${attendee.lastName}`,
            issue: 'Invalid format'
          });
        }
      } catch (error: any) {
        invalidCount++;
        issues.push({
          attendeeId: attendee.$id,
          name: `${attendee.firstName} ${attendee.lastName}`,
          issue: `Parse error: ${error.message}`
        });
      }
    }

    // Print results
    console.log('================================================================================');
    console.log('VERIFICATION RESULTS');
    console.log('================================================================================');
    console.log(`Total attendees: ${allAttendees.length}`);
    console.log(`Attendees with custom fields: ${allAttendees.length - emptyCount}`);
    console.log('');
    console.log('Format breakdown:');
    console.log(`  ✅ Valid object format: ${validCount}`);
    console.log(`  ⚠️  Array format (legacy): ${arrayFormatCount}`);
    console.log(`  ⚠️  Numerical keys: ${numericalKeysCount}`);
    console.log(`  ❌ Invalid format: ${invalidCount}`);
    console.log(`  ⚪ No custom fields: ${emptyCount}`);
    console.log('================================================================================\n');

    if (issues.length > 0) {
      console.log('⚠️  ISSUES FOUND:');
      console.log('--------------------------------------------------------------------------------');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.name} (ID: ${issue.attendeeId})`);
        console.log(`   Issue: ${issue.issue}`);
      });
      console.log('================================================================================\n');
      console.log('❌ VERIFICATION FAILED - Issues found');
      console.log('');
      console.log('To fix these issues, run:');
      console.log('  npx tsx scripts/migrate-custom-field-format.ts --apply');
      process.exit(1);
    } else {
      console.log('✅ VERIFICATION PASSED - All custom field values are in correct format');
      process.exit(0);
    }

  } catch (error: any) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyCustomFieldFormat();
