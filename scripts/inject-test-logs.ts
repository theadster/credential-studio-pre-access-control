/**
 * Test Script: Inject 1000 Log Entries
 * 
 * This script creates 1000 test log entries with random actions and dates
 * between October 1, 2025 and October 6, 2025 for testing the delete logs functionality.
 * 
 * Usage:
 *   npx tsx scripts/inject-test-logs.ts
 */

import { config } from 'dotenv';
import { Client, Databases, ID } from 'node-appwrite';
import {
  createAttendeeLogDetails,
  createUserLogDetails,
  createRoleLogDetails,
  createAuthLogDetails,
  createExportLogDetails,
  createImportLogDetails,
  createSystemLogDetails
} from '../src/lib/logFormatting';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

// Set API key for admin access
const apiKey = process.env.APPWRITE_API_KEY;
if (!apiKey) {
  console.error('Error: APPWRITE_API_KEY environment variable is required');
  process.exit(1);
}
client.setKey(apiKey);

const databases = new Databases(client);

// Configuration
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const LOGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;
const ATTENDEES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;

// Test data
const LOG_ACTIONS = [
  'create',
  'update',
  'delete',
  'view',
  'print',
  'login',
  'logout',
  'export',
  'import',
  'delete_logs'
];

// Sample data for generating realistic log details
const SAMPLE_FIRST_NAMES = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
const SAMPLE_LAST_NAMES = ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez'];
const SAMPLE_COMPANIES = ['Acme Corp', 'Tech Solutions', 'Global Industries', 'Innovation Labs', 'Digital Ventures'];
const SAMPLE_ROLES = ['Administrator', 'Event Manager', 'Registration Staff', 'Security', 'Viewer'];

/**
 * Generate realistic log details using the formatting utility
 */
function generateLogDetails(action: string, attendees: any[], users: any[]) {
  const firstName = getRandomItem(SAMPLE_FIRST_NAMES);
  const lastName = getRandomItem(SAMPLE_LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const barcodeNumber = `EVT${Math.floor(10000 + Math.random() * 90000)}`;

  switch (action) {
    case 'create':
      if (Math.random() > 0.3) {
        // Attendee create
        return createAttendeeLogDetails('create', {
          firstName,
          lastName,
          barcodeNumber
        });
      } else if (Math.random() > 0.5) {
        // User create
        return createUserLogDetails('create', {
          name: fullName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
        }, {
          role: getRandomItem(SAMPLE_ROLES)
        });
      } else {
        // Role create
        return createRoleLogDetails('create', {
          name: getRandomItem(SAMPLE_ROLES)
        }, {
          description: 'Test role for demonstration'
        });
      }

    case 'update':
      if (Math.random() > 0.3) {
        // Attendee update
        const changes = ['firstName', 'email', 'company', 'jobTitle', 'phone'].slice(0, Math.floor(Math.random() * 3) + 1);
        return createAttendeeLogDetails('update', {
          firstName,
          lastName,
          barcodeNumber
        }, { changes });
      } else {
        // User update
        const changes = ['name', 'email', 'role'].slice(0, Math.floor(Math.random() * 2) + 1);
        return createUserLogDetails('update', {
          name: fullName,
          email: `${firstName.toLowerCase()}@example.com`
        }, { changes });
      }

    case 'delete':
      if (Math.random() > 0.5) {
        // Attendee delete
        return createAttendeeLogDetails('delete', {
          firstName,
          lastName,
          barcodeNumber
        });
      } else {
        // User delete
        return createUserLogDetails('delete', {
          name: fullName,
          email: `${firstName.toLowerCase()}@example.com`
        });
      }

    case 'view':
      // Attendee view
      return createAttendeeLogDetails('view', {
        firstName,
        lastName,
        barcodeNumber
      });

    case 'print':
      // Print badge
      return createAttendeeLogDetails('print', {
        firstName,
        lastName,
        barcodeNumber
      });

    case 'login':
      return createAuthLogDetails('login');

    case 'logout':
      return createAuthLogDetails('logout');

    case 'export':
      const exportType = Math.random() > 0.5 ? 'attendees' : 'logs';
      const count = Math.floor(Math.random() * 500) + 50;
      return createExportLogDetails(
        exportType as 'attendees' | 'logs',
        'csv',
        count,
        { filename: `${exportType}_export_${new Date().toISOString().split('T')[0]}.csv` }
      );

    case 'import':
      const importCount = Math.floor(Math.random() * 200) + 20;
      const names = Array.from({ length: Math.min(5, importCount) }, () =>
        `${getRandomItem(SAMPLE_FIRST_NAMES)} ${getRandomItem(SAMPLE_LAST_NAMES)}`
      );
      return createImportLogDetails('attendees', importCount, {
        filename: `attendees_import_${new Date().toISOString().split('T')[0]}.csv`,
        names
      });

    case 'delete_logs':
      const deletedCount = Math.floor(Math.random() * 1000) + 100;
      return createSystemLogDetails(
        'delete_logs',
        `Deleted ${deletedCount} logs`,
        { deletedCount }
      );

    default:
      return createSystemLogDetails(action, `Performed ${action} action`);
  }
}

/**
 * Generate a random date between October 1, 2025 and October 6, 2025
 */
function getRandomDate(): Date {
  const start = new Date('2025-10-01T00:00:00Z');
  const end = new Date('2025-10-06T23:59:59Z');
  const timestamp = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(timestamp);
}

/**
 * Get a random item from an array
 */
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Fetch existing users and attendees for realistic log entries
 */
async function fetchExistingData() {
  console.log('Fetching existing users and attendees...');

  try {
    const usersResponse = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      []
    );

    const attendeesResponse = await databases.listDocuments(
      DATABASE_ID,
      ATTENDEES_COLLECTION_ID,
      []
    );

    return {
      users: usersResponse.documents.map(doc => doc.userId),
      attendees: attendeesResponse.documents.map(doc => doc.$id)
    };
  } catch (error) {
    console.error('Error fetching existing data:', error);
    return { users: [], attendees: [] };
  }
}

/**
 * Create a single log entry
 */
async function createLogEntry(
  userId: string,
  attendeeId: string | null,
  action: string,
  logDetails: any,
  createdAt: Date
): Promise<boolean> {
  try {
    // Note: Appwrite doesn't allow setting $createdAt directly via API
    // We'll create the document and it will use the current timestamp
    // For testing purposes, we'll include the intended date in the details
    await databases.createDocument(
      DATABASE_ID,
      LOGS_COLLECTION_ID,
      ID.unique(),
      {
        userId,
        attendeeId,
        action,
        details: JSON.stringify({
          ...logDetails,
          testDate: createdAt.toISOString() // Store intended date for reference
        })
      }
    );
    return true;
  } catch (error: any) {
    console.error(`Error creating log entry: ${error.message}`);
    return false;
  }
}

/**
 * Main function to inject test logs
 */
async function injectTestLogs() {
  console.log('🚀 Starting test log injection...\n');

  // Fetch existing data
  const { users, attendees } = await fetchExistingData();

  if (users.length === 0) {
    console.error('❌ No users found in database. Please create at least one user first.');
    process.exit(1);
  }

  console.log(`Found ${users.length} users and ${attendees.length} attendees\n`);

  // Generate and insert logs
  const totalLogs = 1000;
  let successCount = 0;
  let failCount = 0;

  console.log(`Creating ${totalLogs} test log entries...`);
  console.log('Date range: October 1, 2025 - October 6, 2025\n');

  // Create logs in batches to avoid overwhelming the API
  const batchSize = 10;
  const delayBetweenBatches = 500; // 500ms delay between batches

  for (let i = 0; i < totalLogs; i += batchSize) {
    const batchPromises = [];
    const batchEnd = Math.min(i + batchSize, totalLogs);

    for (let j = i; j < batchEnd; j++) {
      // Generate random log data
      const action = getRandomItem(LOG_ACTIONS);
      const userId = getRandomItem(users);
      const attendeeId = attendees.length > 0 && Math.random() > 0.5
        ? getRandomItem(attendees)
        : null;
      const createdAt = getRandomDate();

      // Generate realistic log details using the formatting utility
      const logDetails = generateLogDetails(action, attendees, users);

      batchPromises.push(
        createLogEntry(userId, attendeeId, action, logDetails, createdAt)
      );
    }

    // Wait for batch to complete
    const results = await Promise.all(batchPromises);
    successCount += results.filter(r => r).length;
    failCount += results.filter(r => !r).length;

    // Progress indicator
    const progress = Math.round((batchEnd / totalLogs) * 100);
    process.stdout.write(`\rProgress: ${progress}% (${batchEnd}/${totalLogs}) - Success: ${successCount}, Failed: ${failCount}`);

    // Delay between batches to avoid rate limiting
    if (batchEnd < totalLogs) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  console.log('\n\n✅ Test log injection complete!');
  console.log(`\nResults:`);
  console.log(`  - Successfully created: ${successCount} logs`);
  console.log(`  - Failed: ${failCount} logs`);
  console.log(`\n📝 Note: Logs are created with current timestamps.`);
  console.log(`   The intended test dates (Oct 1-6, 2025) are stored in the details field.`);
  console.log(`\n🧪 You can now test the delete logs functionality!`);
}

// Run the script
injectTestLogs()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
