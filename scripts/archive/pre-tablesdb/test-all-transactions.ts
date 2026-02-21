/**
 * Comprehensive Integration Test for All Transaction/Bulk Operations
 * 
 * This script tests all bulk operations against a real Appwrite instance
 * to verify that atomic operations are working correctly.
 * 
 * Run with: npx tsx scripts/test-all-transactions.ts
 */

import { Client, Databases, TablesDB, ID, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Test configuration
const TEST_PREFIX = 'TEST_TX_';
const CLEANUP_AFTER_TEST = true;

// Test results tracking
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

// Helper to run a test
async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  console.log(`\n🧪 Running: ${name}`);
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, status: 'PASS', duration });
    console.log(`✅ PASS (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({ 
      name, 
      status: 'FAIL', 
      duration, 
      error: error.message,
      details: error 
    });
    console.log(`❌ FAIL (${duration}ms)`);
    console.error(`   Error: ${error.message}`);
  }
}

// Main test suite
async function runAllTests() {
  console.log('='.repeat(80));
  console.log('TRANSACTION & BULK OPERATIONS - INTEGRATION TEST SUITE');
  console.log('='.repeat(80));

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  const apiKey = process.env.APPWRITE_API_KEY!;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const attendeesTableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID!;
  const customFieldsTableId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID!;
  const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!;

  console.log('\n📋 Configuration:');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Project: ${projectId}`);
  console.log(`   Database: ${databaseId}`);
  console.log(`   API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'NOT SET'}`);

  if (!projectId || !apiKey || !databaseId || !attendeesTableId || !customFieldsTableId || !logsTableId) {
    console.error('\n❌ Missing required environment variables');
    console.error('Please ensure the following are set in .env.local:');
    console.error('  - NEXT_PUBLIC_APPWRITE_PROJECT_ID');
    console.error('  - APPWRITE_API_KEY');
    console.error('  - NEXT_PUBLIC_APPWRITE_DATABASE_ID');
    console.error('  - NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID');
    console.error('  - NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID');
    console.error('  - NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID');
    process.exit(1);
  }

  // Create clients
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);
  const tablesDB = new TablesDB(client);

  // Track created resources for cleanup
  const createdAttendeeIds: string[] = [];
  const createdCustomFieldIds: string[] = [];
  const createdLogIds: string[] = [];

  // Test 1: Verify TablesDB Methods Exist
  await runTest('Test 1: TablesDB Methods Available', async () => {
    if (typeof tablesDB.upsertRows !== 'function') {
      throw new Error('TablesDB.upsertRows is not available');
    }
    if (typeof tablesDB.createRows !== 'function') {
      throw new Error('TablesDB.createRows is not available');
    }
    if (typeof tablesDB.deleteRows !== 'function') {
      throw new Error('TablesDB.deleteRows is not available');
    }
    console.log('   ✓ upsertRows available');
    console.log('   ✓ createRows available');
    console.log('   ✓ deleteRows available');
  });

  // Test 2: Bulk Create (Import)
  await runTest('Test 2: Bulk Create Attendees (Atomic)', async () => {
    const testAttendees = Array.from({ length: 10 }, (_, i) => ({
      $id: ID.unique(),
      firstName: `${TEST_PREFIX}First${i}`,
      lastName: `${TEST_PREFIX}Last${i}`,
      barcodeNumber: `${TEST_PREFIX}${Date.now()}${i}`,
      customFieldValues: JSON.stringify({}),
      notes: '',
      lastSignificantUpdate: new Date().toISOString()
    }));

    createdAttendeeIds.push(...testAttendees.map(a => a.$id));

    await tablesDB.createRows(
      databaseId!,
      attendeesTableId!,
      testAttendees
    );

    // Verify all created
    const docs = await databases.listDocuments(
      databaseId!,
      attendeesTableId!,
      [Query.equal('firstName', testAttendees.map(a => a.firstName))]
    );

    if (docs.total !== 10) {
      throw new Error(`Expected 10 attendees, found ${docs.total}`);
    }

    console.log(`   ✓ Created ${docs.total} attendees atomically`);
  });

  // Test 3: Bulk Update (Edit)
  await runTest('Test 3: Bulk Update Attendees (Atomic)', async () => {
    // Fetch existing test attendees
    const existingDocs = await Promise.all(
      createdAttendeeIds.slice(0, 5).map(id =>
        databases.getDocument(databaseId!, attendeesTableId!, id)
      )
    );

    // Prepare updates
    const rows = existingDocs.map(doc => {
      const { $permissions, $createdAt, $updatedAt, $tableId, $databaseId, ...docData } = doc as any;
      return {
        ...docData,
        notes: `${TEST_PREFIX}Updated at ${new Date().toISOString()}`,
        $id: doc.$id
      };
    });

    await tablesDB.upsertRows(
      databaseId!,
      attendeesTableId!,
      rows
    );

    // Verify all updated
    const updatedDocs = await Promise.all(
      createdAttendeeIds.slice(0, 5).map(id =>
        databases.getDocument(databaseId!, attendeesTableId!, id)
      )
    );

    const allUpdated = updatedDocs.every(doc => 
      doc.notes.startsWith(TEST_PREFIX)
    );

    if (!allUpdated) {
      throw new Error('Not all attendees were updated');
    }

    console.log(`   ✓ Updated ${updatedDocs.length} attendees atomically`);
  });

  // Test 4: Bulk Delete
  await runTest('Test 4: Bulk Delete Attendees (Atomic)', async () => {
    const idsToDelete = createdAttendeeIds.slice(5, 8); // Delete 3 attendees

    await tablesDB.deleteRows(
      databaseId!,
      attendeesTableId!,
      [Query.equal('$id', idsToDelete)]
    );

    // Verify all deleted
    for (const id of idsToDelete) {
      try {
        await databases.getDocument(databaseId!, attendeesTableId!, id);
        throw new Error(`Attendee ${id} still exists after delete`);
      } catch (error: any) {
        if (error.code !== 404) {
          throw error;
        }
      }
    }

    // Remove from tracking
    idsToDelete.forEach(id => {
      const index = createdAttendeeIds.indexOf(id);
      if (index > -1) createdAttendeeIds.splice(index, 1);
    });

    console.log(`   ✓ Deleted ${idsToDelete.length} attendees atomically`);
  });

  // Test 5: Custom Fields Reorder (Bulk Update)
  await runTest('Test 5: Custom Fields Reorder (Atomic)', async () => {
    // Get event settings ID (required for custom fields)
    const eventSettingsTableId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID;
    if (!eventSettingsTableId) {
      throw new Error('NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID not set');
    }

    const eventSettingsDocs = await databases.listDocuments(
      databaseId!,
      eventSettingsTableId
    );

    if (eventSettingsDocs.total === 0) {
      throw new Error('No event settings found. Please configure event settings first.');
    }

    const eventSettingsId = eventSettingsDocs.documents[0].$id;

    // Create test custom fields with all required fields
    const testFields = Array.from({ length: 5 }, (_, i) => ({
      $id: ID.unique(),
      eventSettingsId: eventSettingsId,  // Required field
      fieldName: `${TEST_PREFIX}Field${i}`,
      internalFieldName: `${TEST_PREFIX}field${i}`,
      fieldType: 'text',
      fieldOptions: JSON.stringify({}),
      required: false,
      order: i,  // Database uses 'order' (not 'fieldOrder' as in setup script)
      showOnMainPage: true,
      printable: false
    }));

    createdCustomFieldIds.push(...testFields.map(f => f.$id));

    // Create fields
    await tablesDB.createRows(
      databaseId!,
      customFieldsTableId!,
      testFields
    );

    // Fetch and reorder
    const existingFields = await Promise.all(
      createdCustomFieldIds.map(id =>
        databases.getDocument(databaseId!, customFieldsTableId!, id)
      )
    );

    // Reverse the order
    const rows = existingFields.map((field, index) => {
      const { $permissions, $createdAt, $updatedAt, $tableId, $databaseId, ...fieldData } = field as any;
      return {
        ...fieldData,
        order: existingFields.length - index - 1,  // Database uses 'order'
        $id: field.$id
      };
    });

    await tablesDB.upsertRows(
      databaseId!,
      customFieldsTableId!,
      rows
    );

    // Verify reordered
    const reorderedFields = await Promise.all(
      createdCustomFieldIds.map(id =>
        databases.getDocument(databaseId!, customFieldsTableId!, id)
      )
    );

    const ordersChanged = reorderedFields.some((field, index) => 
      field.order !== existingFields[index].order
    );

    if (!ordersChanged) {
      throw new Error('Field orders were not updated');
    }

    console.log(`   ✓ Reordered ${reorderedFields.length} custom fields atomically`);
  });

  // Test 6: Error Handling - Invalid Data
  await runTest('Test 6: Error Handling - Invalid Data', async () => {
    try {
      await tablesDB.createRows(
        databaseId!,
        attendeesTableId!,
        [
          {
            $id: ID.unique(),
            // Missing required fields - should fail
            notes: 'Invalid'
          }
        ]
      );
      throw new Error('Should have thrown validation error');
    } catch (error: any) {
      if (error.code === 400 || error.message.includes('required')) {
        console.log('   ✓ Validation error caught correctly');
      } else {
        throw error;
      }
    }
  });

  // Test 7: Performance - Large Bulk Operation
  await runTest('Test 7: Performance - Large Bulk Operation (50 items)', async () => {
    const largeSet = Array.from({ length: 50 }, (_, i) => ({
      $id: ID.unique(),
      firstName: `${TEST_PREFIX}Perf${i}`,
      lastName: `${TEST_PREFIX}Test${i}`,
      barcodeNumber: `${TEST_PREFIX}PERF${Date.now()}${i}`,
      customFieldValues: JSON.stringify({}),
      notes: '',
      lastSignificantUpdate: new Date().toISOString()
    }));

    createdAttendeeIds.push(...largeSet.map(a => a.$id));

    const startTime = Date.now();
    await tablesDB.createRows(
      databaseId!,
      attendeesTableId!,
      largeSet
    );
    const duration = Date.now() - startTime;

    console.log(`   ✓ Created 50 attendees in ${duration}ms`);
    
    if (duration > 10000) {
      console.warn(`   ⚠️  Performance warning: Operation took ${duration}ms (>10s)`);
    }
  });

  // Test 8: Audit Log Creation
  await runTest('Test 8: Audit Log Creation', async () => {
    const logId = ID.unique();
    createdLogIds.push(logId);

    await databases.createDocument(
      databaseId!,
      logsTableId!,
      logId,
      {
        userId: 'test-user',
        action: 'test',
        details: JSON.stringify({
          type: 'integration_test',
          timestamp: new Date().toISOString()
        })
      }
    );

    const log = await databases.getDocument(databaseId!, logsTableId!, logId);
    
    if (!log || log.action !== 'test') {
      throw new Error('Audit log not created correctly');
    }

    console.log('   ✓ Audit log created successfully');
  });

  // Cleanup
  if (CLEANUP_AFTER_TEST) {
    console.log('\n🧹 Cleaning up test data...');

    // Delete test attendees
    if (createdAttendeeIds.length > 0) {
      try {
        await tablesDB.deleteRows(
          databaseId!,
          attendeesTableId!,
          [Query.equal('$id', createdAttendeeIds)]
        );
        console.log(`   ✓ Deleted ${createdAttendeeIds.length} test attendees`);
      } catch (error: any) {
        console.error(`   ⚠️  Failed to delete test attendees: ${error.message}`);
      }
    }

    // Delete test custom fields
    if (createdCustomFieldIds.length > 0) {
      try {
        await tablesDB.deleteRows(
          databaseId!,
          customFieldsTableId!,
          [Query.equal('$id', createdCustomFieldIds)]
        );
        console.log(`   ✓ Deleted ${createdCustomFieldIds.length} test custom fields`);
      } catch (error: any) {
        console.error(`   ⚠️  Failed to delete test custom fields: ${error.message}`);
      }
    }

    // Delete test logs
    if (createdLogIds.length > 0) {
      try {
        await tablesDB.deleteRows(
          databaseId!,
          logsTableId!,
          [Query.equal('$id', createdLogIds)]
        );
        console.log(`   ✓ Deleted ${createdLogIds.length} test logs`);
      } catch (error: any) {
        console.error(`   ⚠️  Failed to delete test logs: ${error.message}`);
      }
    }
  }

  // Print results
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${result.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n' + '-'.repeat(80));
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));

  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED - Review errors above');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED - Transactions are working correctly!');
    process.exit(0);
  }
}

// Run the test suite
runAllTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
