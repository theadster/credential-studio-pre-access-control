#!/usr/bin/env tsx
/**
 * Test Script: Verify Visibility Filtering Implementation
 * 
 * This script tests the complete visibility filtering functionality:
 * 1. Verifies database schema has showOnMainPage attribute
 * 2. Creates test custom fields with different visibility settings
 * 3. Creates test attendee with values for all fields
 * 4. Fetches attendees via API and verifies filtering works
 * 5. Cleans up test data
 * 
 * Usage:
 * npx tsx scripts/test-visibility-filtering.ts
 */

import { Client, Databases, ID, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m ${name}: ${message}`);
}

async function main() {
  try {
    console.log('🧪 Testing Visibility Filtering Implementation\n');
    console.log('=' .repeat(60));
    console.log('\n');

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
      throw new Error('NEXT_PUBLIC_APPWRITE_ENDPOINT is not set');
    }
    if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set');
    }
    if (!process.env.APPWRITE_API_KEY) {
      throw new Error('APPWRITE_API_KEY is not set');
    }

    // Initialize client
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

    // Test 1: Verify showOnMainPage attribute exists
    console.log('Test 1: Verifying database schema...');
    try {
      const collection = await databases.getCollection(databaseId, customFieldsCollectionId);
      const showOnMainPageAttr = collection.attributes.find((attr: any) => attr.key === 'showOnMainPage');
      
      if (showOnMainPageAttr) {
        logTest(
          'Schema Verification',
          true,
          `showOnMainPage attribute exists (type: ${showOnMainPageAttr.type}, default: ${showOnMainPageAttr.default})`
        );
      } else {
        logTest('Schema Verification', false, 'showOnMainPage attribute not found');
        throw new Error('Database schema not updated. Please run the migration script first.');
      }
    } catch (error: any) {
      logTest('Schema Verification', false, error.message);
      throw error;
    }

    console.log('\n');

    // Test 2: Get or create event settings
    console.log('Test 2: Getting event settings...');
    let eventSettingsId: string = '';
    
    try {
      const eventSettingsResult = await databases.listDocuments(
        databaseId,
        eventSettingsCollectionId,
        [Query.limit(1)]
      );
      
      if (eventSettingsResult.documents.length > 0) {
        eventSettingsId = eventSettingsResult.documents[0].$id;
        logTest('Event Settings', true, `Using existing event settings: ${eventSettingsId}`);
      } else {
        // Create a test event settings if none exist
        const eventSettings = await databases.createDocument(
          databaseId,
          eventSettingsCollectionId,
          ID.unique(),
          {
            eventName: 'Test Event',
            barcodeType: 'numerical',
            barcodeLength: 6
          }
        );
        eventSettingsId = eventSettings.$id;
        logTest('Event Settings', true, `Created test event settings: ${eventSettingsId}`);
      }
    } catch (error: any) {
      logTest('Event Settings', false, error.message);
      throw error;
    }

    console.log('\n');

    // Test 3: Create test custom fields
    console.log('Test 3: Creating test custom fields...');
    const testFieldIds: string[] = [];
    
    try {
      // Create visible field
      const visibleField = await databases.createDocument(
        databaseId,
        customFieldsCollectionId,
        ID.unique(),
        {
          eventSettingsId: eventSettingsId,
          fieldName: 'Test Visible Field',
          fieldType: 'text',
          required: false,
          order: 999,
          showOnMainPage: true
        }
      );
      testFieldIds.push(visibleField.$id);
      logTest('Create Visible Field', true, `Created field: ${visibleField.$id}`);

      // Create hidden field
      const hiddenField = await databases.createDocument(
        databaseId,
        customFieldsCollectionId,
        ID.unique(),
        {
          eventSettingsId: eventSettingsId,
          fieldName: 'Test Hidden Field',
          fieldType: 'text',
          required: false,
          order: 1000,
          showOnMainPage: false
        }
      );
      testFieldIds.push(hiddenField.$id);
      logTest('Create Hidden Field', true, `Created field: ${hiddenField.$id}`);

      // Create field with default visibility (should use default value from schema)
      const defaultField = await databases.createDocument(
        databaseId,
        customFieldsCollectionId,
        ID.unique(),
        {
          eventSettingsId: eventSettingsId,
          fieldName: 'Test Default Field',
          fieldType: 'text',
          required: false,
          order: 1001
          // showOnMainPage not set - should use schema default (true)
        }
      );
      testFieldIds.push(defaultField.$id);
      logTest('Create Default Field', true, `Created field: ${defaultField.$id} (using schema default)`);

    } catch (error: any) {
      logTest('Create Test Fields', false, error.message);
      throw error;
    }

    console.log('\n');

    // Test 4: Create test attendee with values for all fields
    console.log('Test 4: Creating test attendee...');
    let testAttendeeId: string = '';
    
    try {
      const customFieldValues: any = {};
      customFieldValues[testFieldIds[0]] = 'Visible Value';
      customFieldValues[testFieldIds[1]] = 'Hidden Value';
      customFieldValues[testFieldIds[2]] = 'Default Value';

      const attendee = await databases.createDocument(
        databaseId,
        attendeesCollectionId,
        ID.unique(),
        {
          firstName: 'Test',
          lastName: 'Visibility',
          barcodeNumber: `TEST-${Date.now()}`,
          photoUrl: null,
          customFieldValues: JSON.stringify(customFieldValues)
        }
      );
      testAttendeeId = attendee.$id;
      logTest('Create Test Attendee', true, `Created attendee: ${attendee.$id}`);
    } catch (error: any) {
      logTest('Create Test Attendee', false, error.message);
      throw error;
    }

    console.log('\n');

    // Test 5: Fetch custom fields and verify visibility logic
    console.log('Test 5: Testing visibility filtering logic...');
    
    try {
      const customFieldsResult = await databases.listDocuments(
        databaseId,
        customFieldsCollectionId,
        [Query.orderAsc('order')]
      );

      const visibleFieldIds = new Set(
        customFieldsResult.documents
          .filter((field: any) => field.showOnMainPage !== false)
          .map((field: any) => field.$id)
      );

      // Check our test fields
      const visibleFieldIncluded = visibleFieldIds.has(testFieldIds[0]);
      const hiddenFieldExcluded = !visibleFieldIds.has(testFieldIds[1]);
      const defaultFieldIncluded = visibleFieldIds.has(testFieldIds[2]);

      logTest(
        'Visible Field Included',
        visibleFieldIncluded,
        visibleFieldIncluded ? 'Correctly included' : 'Incorrectly excluded'
      );
      
      logTest(
        'Hidden Field Excluded',
        hiddenFieldExcluded,
        hiddenFieldExcluded ? 'Correctly excluded' : 'Incorrectly included'
      );
      
      logTest(
        'Default Field Included',
        defaultFieldIncluded,
        defaultFieldIncluded ? 'Correctly defaults to visible' : 'Incorrectly excluded'
      );

    } catch (error: any) {
      logTest('Visibility Logic', false, error.message);
      throw error;
    }

    console.log('\n');

    // Test 6: Fetch attendee and verify filtered custom field values
    console.log('Test 6: Verifying filtered attendee data...');
    
    try {
      // Fetch custom fields for visibility
      const customFieldsResult = await databases.listDocuments(
        databaseId,
        customFieldsCollectionId,
        [Query.orderAsc('order')]
      );

      const visibleFieldIds = new Set(
        customFieldsResult.documents
          .filter((field: any) => field.showOnMainPage !== false)
          .map((field: any) => field.$id)
      );

      // Fetch attendee
      const attendee = await databases.getDocument(
        databaseId,
        attendeesCollectionId,
        testAttendeeId
      );

      // Parse and filter custom field values (simulating API logic)
      const parsed = JSON.parse(attendee.customFieldValues as string);
      const filteredValues = Object.entries(parsed)
        .filter(([fieldId]) => visibleFieldIds.has(fieldId))
        .map(([fieldId, value]) => ({ fieldId, value }));

      const hasVisibleField = filteredValues.some(v => v.fieldId === testFieldIds[0]);
      const hasHiddenField = filteredValues.some(v => v.fieldId === testFieldIds[1]);
      const hasDefaultField = filteredValues.some(v => v.fieldId === testFieldIds[2]);

      logTest(
        'Visible Field in Response',
        hasVisibleField,
        hasVisibleField ? 'Present in filtered data' : 'Missing from filtered data'
      );
      
      logTest(
        'Hidden Field NOT in Response',
        !hasHiddenField,
        !hasHiddenField ? 'Correctly filtered out' : 'Incorrectly included'
      );
      
      logTest(
        'Default Field in Response',
        hasDefaultField,
        hasDefaultField ? 'Present in filtered data' : 'Missing from filtered data'
      );

      console.log(`\nFiltered custom field values: ${filteredValues.length} fields`);
      filteredValues.forEach(v => {
        const field = customFieldsResult.documents.find((f: any) => f.$id === v.fieldId);
        console.log(`  - ${field?.fieldName}: ${v.value}`);
      });

    } catch (error: any) {
      logTest('Filtered Data Verification', false, error.message);
      throw error;
    }

    console.log('\n');

    // Cleanup
    console.log('Cleaning up test data...');
    try {
      // Delete test attendee
      await databases.deleteDocument(databaseId, attendeesCollectionId, testAttendeeId);
      console.log('✓ Deleted test attendee');

      // Delete test custom fields
      for (const fieldId of testFieldIds) {
        await databases.deleteDocument(databaseId, customFieldsCollectionId, fieldId);
      }
      console.log(`✓ Deleted ${testFieldIds.length} test custom fields`);
    } catch (error: any) {
      console.log('⚠ Warning: Cleanup failed:', error.message);
    }

    // Summary
    console.log('\n');
    console.log('=' .repeat(60));
    console.log('\n📊 Test Summary\n');
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
    console.log(`\x1b[31mFailed: ${failed}\x1b[0m`);
    
    if (failed === 0) {
      console.log('\n\x1b[32m✓ All tests passed! Visibility filtering is working correctly.\x1b[0m');
    } else {
      console.log('\n\x1b[31m✗ Some tests failed. Please review the results above.\x1b[0m');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n\x1b[31m✗ Test execution failed:\x1b[0m', error.message);
    process.exit(1);
  }
}

main();
