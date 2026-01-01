/**
 * Diagnostic Script: Analyze Custom Field Key Formats
 * 
 * This script examines attendee custom field values to identify:
 * 1. Records with numerical keys (e.g., {"0": "value", "1": "value"})
 * 2. Records with proper field IDs (e.g., {"fieldId123": "value"})
 * 3. Records with array format (legacy)
 * 
 * Usage:
 *   npx tsx scripts/diagnose-custom-field-keys.ts
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
const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;

interface DiagnosticResult {
  attendeeId: string;
  name: string;
  barcodeNumber: string;
  format: 'array' | 'object-numerical' | 'object-proper' | 'invalid' | 'empty';
  keys: string[];
  sampleData: any;
}

async function diagnoseCustomFieldKeys(): Promise<void> {
  console.log('================================================================================');
  console.log('CUSTOM FIELD KEY FORMAT DIAGNOSTIC');
  console.log('================================================================================\n');

  try {
    // First, fetch all custom field definitions to know what proper IDs look like
    console.log('Fetching custom field definitions...');
    const customFieldsResponse = await databases.listDocuments(
      dbId,
      customFieldsCollectionId,
      [Query.limit(100)],
    );

    const validFieldIds = new Set(customFieldsResponse.documents.map(f => f.$id));
    console.log(`✅ Found ${validFieldIds.size} custom field definitions`);
    console.log(`Valid field IDs: ${Array.from(validFieldIds).join(', ')}\n`);

    // Fetch all attendees
    console.log('Fetching all attendees...');
    let allAttendees: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await databases.listDocuments(
        dbId,
        attendeesCollectionId,
        [Query.limit(limit), Query.offset(offset)],
      );

      allAttendees = allAttendees.concat(response.documents);
      offset += limit;
      hasMore = response.documents.length === limit;
    }

    console.log(`✅ Found ${allAttendees.length} attendees\n`);

    const results: DiagnosticResult[] = [];
    const categoryCounts = {
      array: 0,
      'object-numerical': 0,
      'object-proper': 0,
      invalid: 0,
      empty: 0,
    };

    console.log('Analyzing custom field data...\n');

    for (const attendee of allAttendees) {
      if (!attendee.customFieldValues) {
        categoryCounts.empty += 1;
        continue;
      }

      try {
        const parsed = typeof attendee.customFieldValues === 'string'
          ? JSON.parse(attendee.customFieldValues)
          : attendee.customFieldValues;

        let format: DiagnosticResult['format'];
        let keys: string[] = [];

        if (Array.isArray(parsed)) {
          format = 'array';
          keys = parsed.map((item: any) => item.customFieldId || 'unknown');
          categoryCounts.array += 1;
        } else if (typeof parsed === 'object' && parsed !== null) {
          keys = Object.keys(parsed);
          
          // Check if keys are numerical (0, 1, 2, etc.)
          const hasNumericalKeys = keys.some(key => /^\d+$/.test(key));
          const hasProperIds = keys.some(key => validFieldIds.has(key));

          if (hasNumericalKeys) {
            format = 'object-numerical';
            categoryCounts['object-numerical'] += 1;
          } else if (hasProperIds || keys.length === 0) {
            format = 'object-proper';
            categoryCounts['object-proper'] += 1;
          } else {
            // Keys exist but don't match known field IDs - might be orphaned
            format = 'object-proper'; // Still object format, just unknown IDs
            categoryCounts['object-proper'] += 1;
          }
        } else {
          format = 'invalid';
          categoryCounts.invalid += 1;
        }

        results.push({
          attendeeId: attendee.$id,
          name: `${attendee.firstName} ${attendee.lastName}`,
          barcodeNumber: attendee.barcodeNumber,
          format,
          keys,
          sampleData: parsed,
        });

      } catch (error: any) {
        categoryCounts.invalid += 1;
        results.push({
          attendeeId: attendee.$id,
          name: `${attendee.firstName} ${attendee.lastName}`,
          barcodeNumber: attendee.barcodeNumber,
          format: 'invalid',
          keys: [],
          sampleData: null,
        });
      }
    }

    // Print summary
    console.log('================================================================================');
    console.log('DIAGNOSTIC SUMMARY');
    console.log('================================================================================');
    console.log(`Total attendees: ${allAttendees.length}`);
    console.log(`Attendees with custom field data: ${allAttendees.length - categoryCounts.empty}`);
    console.log('');
    console.log('Format breakdown:');
    console.log(`  ✅ Object with proper field IDs: ${categoryCounts['object-proper']}`);
    console.log(`  ⚠️  Object with numerical keys: ${categoryCounts['object-numerical']}`);
    console.log(`  ⚠️  Array format (legacy): ${categoryCounts.array}`);
    console.log(`  ❌ Invalid format: ${categoryCounts.invalid}`);
    console.log(`  ⚪ No custom fields: ${categoryCounts.empty}`);
    console.log('================================================================================\n');

    // Show examples of problematic records
    if (categoryCounts['object-numerical'] > 0) {
      console.log('RECORDS WITH NUMERICAL KEYS (Sample):');
      console.log('--------------------------------------------------------------------------------');
      const numericalExamples = results
        .filter(r => r.format === 'object-numerical')
        .slice(0, 5);

      numericalExamples.forEach((result, index) => {
        console.log(`${index + 1}. ${result.name} (Barcode: ${result.barcodeNumber})`);
        console.log(`   Keys: ${result.keys.join(', ')}`);
        console.log(`   Data: ${JSON.stringify(result.sampleData)}`);
        console.log('');
      });
      console.log('================================================================================\n');
    }

    if (categoryCounts.array > 0) {
      console.log('RECORDS WITH ARRAY FORMAT (Sample):');
      console.log('--------------------------------------------------------------------------------');
      const arrayExamples = results
        .filter(r => r.format === 'array')
        .slice(0, 5);

      arrayExamples.forEach((result, index) => {
        console.log(`${index + 1}. ${result.name} (Barcode: ${result.barcodeNumber})`);
        console.log(`   Data: ${JSON.stringify(result.sampleData)}`);
        console.log('');
      });
      console.log('================================================================================\n');
    }

    // Export full results to JSON for further analysis
    const fs = require('fs');
    const outputPath = 'custom-field-diagnostic-results.json';
    fs.writeFileSync(outputPath, JSON.stringify({
      summary: categoryCounts,
      validFieldIds: Array.from(validFieldIds),
      results: results,
    }, null, 2));

    console.log(`📄 Full diagnostic results saved to: ${outputPath}\n`);

  } catch (error: any) {
    console.error('❌ Diagnostic failed:', error);
    throw error;
  }
}

diagnoseCustomFieldKeys()
  .then(() => {
    console.log('Diagnostic completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Diagnostic failed:', error);
    process.exit(1);
  });
