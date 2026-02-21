/**
 * Migration Script: Convert Access Control Date Fields to String
 * 
 * This script migrates the validFrom and validUntil fields from DateTime to String attributes
 * in the access_control collection. This is necessary because DateTime attributes automatically
 * convert values to UTC, which causes timezone shifts when users enter specific dates/times.
 * 
 * By storing as strings, we preserve the exact value the user entered without any conversion.
 * 
 * Usage: npx ts-node --esm scripts/migrate-access-control-dates-to-string.ts
 */

import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Validate required environment variables
const NEXT_PUBLIC_APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const NEXT_PUBLIC_APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const NEXT_PUBLIC_APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

const missingVars = [];
if (!NEXT_PUBLIC_APPWRITE_ENDPOINT) missingVars.push('NEXT_PUBLIC_APPWRITE_ENDPOINT');
if (!NEXT_PUBLIC_APPWRITE_PROJECT_ID) missingVars.push('NEXT_PUBLIC_APPWRITE_PROJECT_ID');
if (!APPWRITE_API_KEY) missingVars.push('APPWRITE_API_KEY');
if (!NEXT_PUBLIC_APPWRITE_DATABASE_ID) missingVars.push('NEXT_PUBLIC_APPWRITE_DATABASE_ID');

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  process.exit(1);
}

const client = new Client()
  .setEndpoint(NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

const COLLECTIONS = {
  ACCESS_CONTROL: process.env.NEXT_PUBLIC_APPWRITE_ACCESS_CONTROL_TABLE_ID || 'access_control',
};

async function migrateAccessControlDates() {
  try {
    const dbId = NEXT_PUBLIC_APPWRITE_DATABASE_ID;

    console.log('Starting migration: Converting access control date fields to string...');
    console.log(`Database ID: ${dbId}`);
    console.log(`Collection ID: ${COLLECTIONS.ACCESS_CONTROL}`);

    // Step 1: Fetch all existing access control records
    console.log('\nStep 1: Fetching existing access control records...');
    const allRecords: any[] = [];
    let offset = 0;
    const pageSize = 100;

    while (true) {
      const result = await databases.listDocuments(
        dbId,
        COLLECTIONS.ACCESS_CONTROL,
        [Query.limit(pageSize), Query.offset(offset)]
      );

      allRecords.push(...result.documents);

      if (result.documents.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    console.log(`✓ Found ${allRecords.length} access control records`);

    // Step 2: Delete the old attributes
    console.log('\nStep 2: Deleting old DateTime attributes...');
    try {
      await databases.deleteAttribute(dbId, COLLECTIONS.ACCESS_CONTROL, 'validFrom');
      console.log('✓ Deleted validFrom attribute');
    } catch (error: any) {
      if (error.code !== 404) {
        console.warn('Warning deleting validFrom:', error.message);
      } else {
        console.log('✓ validFrom attribute already deleted or doesn\'t exist');
      }
    }

    try {
      await databases.deleteAttribute(dbId, COLLECTIONS.ACCESS_CONTROL, 'validUntil');
      console.log('✓ Deleted validUntil attribute');
    } catch (error: any) {
      if (error.code !== 404) {
        console.warn('Warning deleting validUntil:', error.message);
      } else {
        console.log('✓ validUntil attribute already deleted or doesn\'t exist');
      }
    }

    // Step 3: Create new String attributes
    console.log('\nStep 3: Creating new String attributes...');
    await databases.createStringAttribute(
      dbId,
      COLLECTIONS.ACCESS_CONTROL,
      'validFrom',
      255,
      false
    );
    console.log('✓ Created validFrom as String attribute');

    await databases.createStringAttribute(
      dbId,
      COLLECTIONS.ACCESS_CONTROL,
      'validUntil',
      255,
      false
    );
    console.log('✓ Created validUntil as String attribute');

    // Step 3.5: Poll until attributes are available
    console.log('\nStep 3.5: Waiting for attributes to become available...');
    const maxAttempts = 30;
    const delayMs = 1000;
    let validFromAvailable = false;
    let validUntilAvailable = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const attributes = await databases.listAttributes(dbId, COLLECTIONS.ACCESS_CONTROL);
        
        validFromAvailable = attributes.attributes.some(
          (attr: any) => attr.key === 'validFrom' && attr.status === 'available'
        );
        validUntilAvailable = attributes.attributes.some(
          (attr: any) => attr.key === 'validUntil' && attr.status === 'available'
        );

        if (validFromAvailable && validUntilAvailable) {
          console.log('✓ Both attributes are now available');
          break;
        }

        if (attempt < maxAttempts - 1) {
          console.log(`  Waiting for attributes... (attempt ${attempt + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error: any) {
        console.warn(`  Warning checking attribute status: ${error.message}`);
      }
    }

    if (!validFromAvailable || !validUntilAvailable) {
      console.error('❌ Timeout waiting for attributes to become available');
      console.error('   validFrom available:', validFromAvailable);
      console.error('   validUntil available:', validUntilAvailable);
      process.exit(1);
    }

    // Step 4: Re-insert the records with converted values
    console.log('\nStep 4: Re-inserting records with converted values...');
    let updatedCount = 0;
    for (const record of allRecords) {
      try {
        // Convert DateTime values to string format
        const updateData: any = {};

        if (record.validFrom) {
          // Extract just the date-time portion without timezone
          // DateTime format from Appwrite is ISO string like "2025-12-01T14:30:00.000Z"
          // We want to store it as a UTC date-time string like "2025-12-01T14:30"
          const dateObj = new Date(record.validFrom);
          const year = dateObj.getUTCFullYear();
          const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getUTCDate()).padStart(2, '0');
          const hours = String(dateObj.getUTCHours()).padStart(2, '0');
          const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
          updateData.validFrom = `${year}-${month}-${day}T${hours}:${minutes}`;
          console.log(`  Converting validFrom: ${record.validFrom} → ${updateData.validFrom}`);
        }

        if (record.validUntil) {
          // Same conversion for validUntil
          const dateObj = new Date(record.validUntil);
          const year = dateObj.getUTCFullYear();
          const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getUTCDate()).padStart(2, '0');
          const hours = String(dateObj.getUTCHours()).padStart(2, '0');
          const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
          updateData.validUntil = `${year}-${month}-${day}T${hours}:${minutes}`;
          console.log(`  Converting validUntil: ${record.validUntil} → ${updateData.validUntil}`);
        }

        if (Object.keys(updateData).length > 0) {
          await databases.updateDocument(
            dbId,
            COLLECTIONS.ACCESS_CONTROL,
            record.$id,
            updateData
          );
          updatedCount++;
          console.log(`✓ Updated record ${record.$id}`);
        }
      } catch (error: any) {
        console.error(`✗ Error updating record ${record.$id}:`, error.message);
      }
    }

    console.log(`\n✓ Migration completed successfully!`);
    console.log(`  - Total records processed: ${allRecords.length}`);
    console.log(`  - Records updated: ${updatedCount}`);
    console.log('\nNote: Existing DateTime values have been converted to UTC time strings.');
    console.log('Going forward, new values will be stored as-is without timezone conversion.');
  } catch (error: any) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrateAccessControlDates();
