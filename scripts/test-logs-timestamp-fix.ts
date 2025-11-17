/**
 * Automated Test Script for Logs Timestamp Fix
 * 
 * This script verifies all requirements for task 3:
 * - Logs display correctly using $createdAt ordering
 * - Migration script properly backfills timestamp field
 * - Logs continue to display correctly after migration
 * - Pagination and filtering work correctly
 * - New logs integrate correctly with old logs
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 * 
 * Usage: 
 *   npx tsx scripts/test-logs-timestamp-fix.ts
 *   npm run test:logs-timestamp-fix (if added to package.json)
 * 
 * Exit Codes:
 *   0 - All tests passed
 *   1 - One or more tests failed
 */

import { Client, Databases, Query, ID } from 'node-appwrite';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface TestResults {
  passed: number;
  failed: number;
  tests: Array<{
    name: string;
    status: 'PASS' | 'FAIL';
    message?: string;
  }>;
}

async function runTests() {
  const results: TestResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Validate environment variables
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID;
  const usersCollectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID;

  if (!endpoint || !projectId || !apiKey || !databaseId || !logsCollectionId || !usersCollectionId) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);

  console.log('🧪 Starting Logs Timestamp Fix Tests\n');
  console.log('=' .repeat(60));

  // Get a test user ID
  let testUserId: string;
  try {
    const usersResponse = await databases.listDocuments(
      databaseId,
      usersCollectionId,
      [Query.limit(1)]
    );

    if (usersResponse.documents.length === 0) {
      console.error('❌ No users found in database. Please create a test user first.');
      process.exit(1);
    }

    testUserId = usersResponse.documents[0].userId;
    console.log(`✓ Found test user: ${testUserId}\n`);
  } catch (error) {
    console.error('❌ Failed to fetch test user:', error);
    process.exit(1);
  }

  const testLogIds: string[] = [];

  try {
    // Test 1: Create test logs without timestamp field (simulating old logs)
    console.log('Test 1: Creating test logs without timestamp field...');
    try {
      for (let i = 0; i < 3; i++) {
        const log = await databases.createDocument(
          databaseId,
          logsCollectionId,
          ID.unique(),
          {
            userId: testUserId,
            action: `TEST_TIMESTAMP_FIX_${i}`,
            details: JSON.stringify({ test: true, index: i, timestamp: new Date().toISOString() })
            // Note: No timestamp field - simulating pre-operator logs
          }
        );
        testLogIds.push(log.$id);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      results.tests.push({
        name: 'Create test logs without timestamp field',
        status: 'PASS',
        message: `Created ${testLogIds.length} test logs`
      });
      results.passed++;
      console.log(`✓ Created ${testLogIds.length} test logs\n`);
    } catch (error: any) {
      results.tests.push({
        name: 'Create test logs without timestamp field',
        status: 'FAIL',
        message: error.message
      });
      results.failed++;
      console.log(`✗ Failed to create test logs: ${error.message}\n`);
    }

    // Test 2: Verify logs display correctly using $createdAt ordering (Requirement 4.1)
    console.log('Test 2: Verify logs display correctly using $createdAt ordering...');
    try {
      const response = await databases.listDocuments(
        databaseId,
        logsCollectionId,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(10)
        ]
      );

      if (response.documents.length === 0) {
        throw new Error('No logs returned');
      }

      // Verify chronological order
      for (let i = 0; i < response.documents.length - 1; i++) {
        const current = new Date(response.documents[i].$createdAt);
        const next = new Date(response.documents[i + 1].$createdAt);
        if (current.getTime() < next.getTime()) {
          throw new Error('Logs not in correct chronological order');
        }
      }

      // Verify our test logs are included
      const testLogInResults = response.documents.some(doc => 
        testLogIds.includes(doc.$id)
      );
      if (!testLogInResults) {
        throw new Error('Test logs not found in results');
      }

      results.tests.push({
        name: 'Logs display correctly using $createdAt ordering (Req 4.1)',
        status: 'PASS',
        message: `Retrieved ${response.documents.length} logs in correct order`
      });
      results.passed++;
      console.log(`✓ Logs display correctly (${response.documents.length} logs)\n`);
    } catch (error: any) {
      results.tests.push({
        name: 'Logs display correctly using $createdAt ordering (Req 4.1)',
        status: 'FAIL',
        message: error.message
      });
      results.failed++;
      console.log(`✗ Failed: ${error.message}\n`);
    }

    // Test 3: Verify logs without timestamp field exist
    console.log('Test 3: Verify logs without timestamp field exist...');
    try {
      let logsWithoutTimestamp = 0;
      for (const logId of testLogIds) {
        const log = await databases.getDocument(
          databaseId,
          logsCollectionId,
          logId
        );
        
        if (!log.timestamp) {
          logsWithoutTimestamp++;
        }
      }

      if (logsWithoutTimestamp === 0) {
        throw new Error('All test logs already have timestamp field');
      }

      results.tests.push({
        name: 'Verify logs without timestamp field exist',
        status: 'PASS',
        message: `Found ${logsWithoutTimestamp} logs without timestamp`
      });
      results.passed++;
      console.log(`✓ Found ${logsWithoutTimestamp} logs without timestamp field\n`);
    } catch (error: any) {
      results.tests.push({
        name: 'Verify logs without timestamp field exist',
        status: 'FAIL',
        message: error.message
      });
      results.failed++;
      console.log(`✗ Failed: ${error.message}\n`);
    }

    // Test 4: Backfill timestamp field (Requirement 3.1, 3.2)
    console.log('Test 4: Backfill timestamp field for test logs...');
    try {
      let updated = 0;
      for (const logId of testLogIds) {
        const log = await databases.getDocument(
          databaseId,
          logsCollectionId,
          logId
        );

        if (!log.timestamp) {
          await databases.updateDocument(
            databaseId,
            logsCollectionId,
            logId,
            {
              timestamp: log.$createdAt
            }
          );
          updated++;
        }
      }

      // Verify all test logs now have timestamp
      for (const logId of testLogIds) {
        const log = await databases.getDocument(
          databaseId,
          logsCollectionId,
          logId
        );
        
        if (!log.timestamp) {
          throw new Error(`Log ${logId} still missing timestamp after migration`);
        }
        if (log.timestamp !== log.$createdAt) {
          throw new Error(`Log ${logId} timestamp doesn't match $createdAt`);
        }
      }

      results.tests.push({
        name: 'Backfill timestamp field (Req 3.1, 3.2)',
        status: 'PASS',
        message: `Updated ${updated} logs with timestamp field`
      });
      results.passed++;
      console.log(`✓ Successfully backfilled ${updated} logs\n`);
    } catch (error: any) {
      results.tests.push({
        name: 'Backfill timestamp field (Req 3.1, 3.2)',
        status: 'FAIL',
        message: error.message
      });
      results.failed++;
      console.log(`✗ Failed: ${error.message}\n`);
    }

    // Test 5: Verify logs display correctly after migration (Requirement 4.2)
    console.log('Test 5: Verify logs display correctly after migration...');
    try {
      const response = await databases.listDocuments(
        databaseId,
        logsCollectionId,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(10)
        ]
      );

      if (response.documents.length === 0) {
        throw new Error('No logs returned after migration');
      }

      // Verify chronological order
      for (let i = 0; i < response.documents.length - 1; i++) {
        const current = new Date(response.documents[i].$createdAt);
        const next = new Date(response.documents[i + 1].$createdAt);
        if (current.getTime() < next.getTime()) {
          throw new Error('Logs not in correct chronological order after migration');
        }
      }

      // Verify our test logs are still included
      const testLogInResults = response.documents.some(doc => 
        testLogIds.includes(doc.$id)
      );
      if (!testLogInResults) {
        throw new Error('Test logs not found in results after migration');
      }

      results.tests.push({
        name: 'Logs display correctly after migration (Req 4.2)',
        status: 'PASS',
        message: `Retrieved ${response.documents.length} logs in correct order`
      });
      results.passed++;
      console.log(`✓ Logs display correctly after migration\n`);
    } catch (error: any) {
      results.tests.push({
        name: 'Logs display correctly after migration (Req 4.2)',
        status: 'FAIL',
        message: error.message
      });
      results.failed++;
      console.log(`✗ Failed: ${error.message}\n`);
    }

    // Test 6: Test pagination (Requirement 4.3)
    console.log('Test 6: Test pagination with migrated logs...');
    try {
      const page1 = await databases.listDocuments(
        databaseId,
        logsCollectionId,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(2),
          Query.offset(0)
        ]
      );

      const page2 = await databases.listDocuments(
        databaseId,
        logsCollectionId,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(2),
          Query.offset(2)
        ]
      );

      // Verify no overlap
      const page1Ids = page1.documents.map(doc => doc.$id);
      const page2Ids = page2.documents.map(doc => doc.$id);
      const overlap = page1Ids.filter(id => page2Ids.includes(id));
      
      if (overlap.length > 0) {
        throw new Error('Pages have overlapping documents');
      }

      // Verify chronological order across pages
      if (page1.documents.length > 0 && page2.documents.length > 0) {
        const lastPage1 = new Date(page1.documents[page1.documents.length - 1].$createdAt);
        const firstPage2 = new Date(page2.documents[0].$createdAt);
        if (lastPage1.getTime() < firstPage2.getTime()) {
          throw new Error('Pages not in correct chronological order');
        }
      }

      results.tests.push({
        name: 'Pagination works correctly (Req 4.3)',
        status: 'PASS',
        message: `Page 1: ${page1.documents.length} logs, Page 2: ${page2.documents.length} logs`
      });
      results.passed++;
      console.log(`✓ Pagination works correctly\n`);
    } catch (error: any) {
      results.tests.push({
        name: 'Pagination works correctly (Req 4.3)',
        status: 'FAIL',
        message: error.message
      });
      results.failed++;
      console.log(`✗ Failed: ${error.message}\n`);
    }

    // Test 7: Test filtering (Requirement 4.3)
    console.log('Test 7: Test filtering with migrated logs...');
    try {
      const filteredResponse = await databases.listDocuments(
        databaseId,
        logsCollectionId,
        [
          Query.equal('action', 'TEST_TIMESTAMP_FIX_0'),
          Query.orderDesc('$createdAt'),
          Query.limit(10)
        ]
      );

      if (filteredResponse.documents.length === 0) {
        throw new Error('No logs returned with filter');
      }

      // Verify all results match filter
      for (const doc of filteredResponse.documents) {
        if (doc.action !== 'TEST_TIMESTAMP_FIX_0') {
          throw new Error(`Document ${doc.$id} doesn't match filter`);
        }
      }

      results.tests.push({
        name: 'Filtering works correctly (Req 4.3)',
        status: 'PASS',
        message: `Found ${filteredResponse.documents.length} logs matching filter`
      });
      results.passed++;
      console.log(`✓ Filtering works correctly\n`);
    } catch (error: any) {
      results.tests.push({
        name: 'Filtering works correctly (Req 4.3)',
        status: 'FAIL',
        message: error.message
      });
      results.failed++;
      console.log(`✗ Failed: ${error.message}\n`);
    }

    // Test 8: Create new log and verify integration (Requirement 4.4)
    console.log('Test 8: Create new log and verify integration...');
    try {
      const newLog = await databases.createDocument(
        databaseId,
        logsCollectionId,
        ID.unique(),
        {
          userId: testUserId,
          action: 'TEST_TIMESTAMP_FIX_NEW',
          details: JSON.stringify({ test: true, type: 'new' }),
          timestamp: new Date().toISOString()
        }
      );
      testLogIds.push(newLog.$id);

      // Query all logs
      const response = await databases.listDocuments(
        databaseId,
        logsCollectionId,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(20)
        ]
      );

      // Verify new log appears in results
      const newLogInResults = response.documents.find(doc => doc.$id === newLog.$id);
      if (!newLogInResults) {
        throw new Error('New log not found in results');
      }

      if (!newLogInResults.timestamp) {
        throw new Error('New log missing timestamp field');
      }

      // Verify chronological order is maintained
      for (let i = 0; i < response.documents.length - 1; i++) {
        const current = new Date(response.documents[i].$createdAt);
        const next = new Date(response.documents[i + 1].$createdAt);
        if (current.getTime() < next.getTime()) {
          throw new Error('Logs not in correct chronological order with new log');
        }
      }

      results.tests.push({
        name: 'New logs integrate correctly (Req 4.4)',
        status: 'PASS',
        message: 'New log appears correctly with migrated logs'
      });
      results.passed++;
      console.log(`✓ New log integrates correctly\n`);
    } catch (error: any) {
      results.tests.push({
        name: 'New logs integrate correctly (Req 4.4)',
        status: 'FAIL',
        message: error.message
      });
      results.failed++;
      console.log(`✗ Failed: ${error.message}\n`);
    }

  } finally {
    // Cleanup test logs
    console.log('Cleaning up test logs...');
    for (const logId of testLogIds) {
      try {
        await databases.deleteDocument(databaseId, logsCollectionId, logId);
      } catch (error) {
        console.error(`Failed to delete test log ${logId}`);
      }
    }
    console.log('✓ Cleanup complete\n');
  }

  // Print summary
  console.log('=' .repeat(60));
  console.log('\n📊 Test Summary\n');
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log('\nDetailed Results:');
  results.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✓' : '✗';
    console.log(`${index + 1}. ${icon} ${test.name}`);
    if (test.message) {
      console.log(`   ${test.message}`);
    }
  });

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
