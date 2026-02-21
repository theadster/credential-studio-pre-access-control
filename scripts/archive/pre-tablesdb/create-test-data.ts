/**
 * Test Data Creation Script
 * 
 * This script helps create production-like test data in Appwrite
 * for manual testing purposes.
 * 
 * Usage: npx tsx scripts/archive/pre-tablesdb/create-test-data.ts
 */

import { Client, Databases, ID, Query } from 'node-appwrite';

// Configuration - will be validated in main()
let databases: Databases;

// Sample data generators
const firstNames = [
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa',
  'William', 'Jennifer', 'James', 'Mary', 'Christopher', 'Patricia', 'Daniel',
  'Linda', 'Matthew', 'Barbara', 'Anthony', 'Elizabeth', 'Mark', 'Susan',
  'Donald', 'Jessica', 'Steven', 'Karen', 'Paul', 'Nancy', 'Andrew', 'Betty'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker'
];

function generateBarcodeNumber(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a unique barcode number by checking against existing barcodes in the database
 * Implements a bounded retry loop to avoid infinite loops
 * 
 * @param maxAttempts Maximum number of attempts to generate a unique barcode (default: 20)
 * @returns A unique 6-digit barcode string
 * @throws Error if unable to generate unique barcode after maxAttempts
 */
async function getUniqueBarcodeNumber(
  databaseId: string,
  attendeesTableId: string,
  maxAttempts: number = 20
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateBarcodeNumber();

    try {
      // Check if barcode already exists in database
      const existingDocs = await databases.listDocuments(
        databaseId,
        attendeesTableId,
        [Query.equal('barcodeNumber', candidate)]
      );

      // If no documents found with this barcode, it's unique
      if (existingDocs.total === 0) {
        return candidate;
      }

      // Barcode collision detected, retry
      if (attempt < maxAttempts - 1) {
        console.log(`  Barcode collision detected (${candidate}), retrying... (attempt ${attempt + 1}/${maxAttempts})`);
      }
    } catch (error: any) {
      // If the error is not about the document not existing, throw it
      throw new Error(`Database check failed for barcode ${candidate}: ${error.message}`);
    }
  }

  throw new Error(`Failed to generate unique barcode after ${maxAttempts} attempts. Consider using a longer barcode format.`);
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function createTestAttendees(
  databaseId: string,
  attendeesTableId: string,
  count: number
) {
  console.log(`Creating ${count} test attendees...`);

  const created: string[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < count; i++) {
    try {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const barcodeNumber = await getUniqueBarcodeNumber(databaseId, attendeesTableId);

      const attendee = await databases.createDocument({
        databaseId: databaseId,
        collectionId: attendeesTableId,
        documentId: ID.unique(),
        data: {
          firstName,
          lastName,
          barcodeNumber,
          customFieldValues: JSON.stringify({}),
        }
      });

      created.push(attendee.$id);

      if ((i + 1) % 10 === 0) {
        console.log(`Created ${i + 1}/${count} attendees...`);
      }
    } catch (error: any) {
      errors.push({ index: i, error: error.message });
    }
  }

  console.log('\n=== Test Data Creation Summary ===');
  console.log(`Successfully created: ${created.length} attendees`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(({ index, error }) => {
      console.log(`  Attendee ${index}: ${error}`);
    });
  }
}

async function main() {
  console.log('=== CredentialStudio Test Data Creator ===\n');

  // Validate environment variables
  const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
  const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const ATTENDEES_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID;

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    console.error('Error: Missing required environment variables');
    console.error('Please ensure the following are set in .env.local:');
    console.error('  - NEXT_PUBLIC_APPWRITE_ENDPOINT');
    console.error('  - NEXT_PUBLIC_APPWRITE_PROJECT_ID');
    console.error('  - APPWRITE_API_KEY');
    process.exit(1);
  }

  // Check database and table configuration
  if (!DATABASE_ID || !ATTENDEES_TABLE_ID) {
    console.error('Error: Missing database configuration');
    console.error('Please ensure the following are set in .env.local:');
    console.error('  - NEXT_PUBLIC_APPWRITE_DATABASE_ID');
    console.error('  - NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID');
    process.exit(1);
  }

  // Initialize Appwrite client after validation
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT!)
    .setProject(APPWRITE_PROJECT_ID!)
    .setKey(APPWRITE_API_KEY!);

  databases = new Databases(client);

  // Get count from command line or use default
  const count = parseInt(process.argv[2]) || 100;

  console.log(`Configuration:`);
  console.log(`  Endpoint: ${APPWRITE_ENDPOINT}`);
  console.log(`  Project: ${APPWRITE_PROJECT_ID}`);
  console.log(`  Database: ${DATABASE_ID}`);
  console.log(`  Collection: ${ATTENDEES_TABLE_ID}`);
  console.log(`  Count: ${count}\n`);

  await createTestAttendees(DATABASE_ID, ATTENDEES_TABLE_ID, count);

  console.log('\nDone!');
}

main().catch(console.error);
