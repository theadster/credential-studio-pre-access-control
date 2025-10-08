/**
 * Test Data Creation Script
 * 
 * This script helps create production-like test data in Appwrite
 * for manual testing purposes.
 * 
 * Usage: node scripts/create-test-data.ts
 */

import { Client, Databases, ID, Query } from 'appwrite';

// Configuration
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY!;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ATTENDEES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

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

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function createTestAttendees(count: number) {
  console.log(`Creating ${count} test attendees...`);
  
  const created: string[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < count; i++) {
    try {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const barcodeNumber = generateBarcodeNumber();

      const attendee = await databases.createDocument(
        DATABASE_ID,
        ATTENDEES_COLLECTION_ID,
        ID.unique(),
        {
          firstName,
          lastName,
          barcodeNumber,
          customFieldValues: JSON.stringify({}),
        }
      );

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
  
  // Check environment variables
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    console.error('Error: Missing required environment variables');
    console.error('Please ensure the following are set in .env.local:');
    console.error('  - NEXT_PUBLIC_APPWRITE_ENDPOINT');
    console.error('  - NEXT_PUBLIC_APPWRITE_PROJECT_ID');
    console.error('  - APPWRITE_API_KEY');
    process.exit(1);
  }

  // Get count from command line or use default
  const count = parseInt(process.argv[2]) || 100;
  
  console.log(`Configuration:`);
  console.log(`  Endpoint: ${APPWRITE_ENDPOINT}`);
  console.log(`  Project: ${APPWRITE_PROJECT_ID}`);
  console.log(`  Database: ${DATABASE_ID}`);
  console.log(`  Collection: ${ATTENDEES_COLLECTION_ID}`);
  console.log(`  Count: ${count}\n`);

  await createTestAttendees(count);
  
  console.log('\nDone!');
}

main().catch(console.error);
