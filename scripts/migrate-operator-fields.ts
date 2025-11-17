#!/usr/bin/env tsx
/**
 * Migration Script for Operator-Managed Fields
 * 
 * This script initializes the new operator-managed fields for existing attendees:
 * - credentialCount: Set based on whether credentialGeneratedAt exists
 * - photoUploadCount: Set based on whether photoUrl exists
 * - viewCount: Initialize to 0 for all attendees
 * - lastCredentialGenerated: Copy from credentialGeneratedAt if exists
 * - lastPhotoUploaded: Set to null (will be populated on next upload)
 * 
 * Prerequisites:
 * - Appwrite project with attendees collection
 * - New operator-managed attributes already created via setup-appwrite.ts
 * - Environment variables configured in .env.local
 * 
 * Usage:
 * npx tsx scripts/migrate-operator-fields.ts
 */

import { Client, Databases, Query, Models } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface Attendee extends Models.Document {
  credentialGeneratedAt?: string;
  photoUrl?: string;
  credentialCount?: number;
  photoUploadCount?: number;
  viewCount?: number;
  lastCredentialGenerated?: string;
  lastPhotoUploaded?: string;
}

async function migrateOperatorFields() {
  try {
    console.log('Starting migration of operator-managed fields...\n');

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
    if (!process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_DATABASE_ID is not set');
    }
    if (!process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID is not set');
    }

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const collectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;

    // Fetch all attendees in batches
    let offset = 0;
    const limit = 100;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let hasMore = true;

    console.log('Fetching attendees...');

    while (hasMore) {
      const response = await databases.listDocuments<Attendee>(
        databaseId,
        collectionId,
        [
          Query.limit(limit),
          Query.offset(offset)
        ]
      );

      const attendees = response.documents;
      hasMore = attendees.length === limit;
      offset += limit;

      console.log(`Processing batch: ${attendees.length} attendees (offset: ${offset - limit})`);

      for (const attendee of attendees) {
        try {
          // Determine values for operator-managed fields
          const credentialCount = attendee.credentialGeneratedAt ? 1 : 0;
          const photoUploadCount = attendee.photoUrl ? 1 : 0;
          const viewCount = 0; // Initialize to 0
          const lastCredentialGenerated = attendee.credentialGeneratedAt || null;
          const lastPhotoUploaded = null; // Will be set on next upload

          // Only update if fields are not already set (check for null or undefined)
          // Include both count fields and timestamp fields to avoid silently skipping timestamps
          const needsUpdate = 
            attendee.credentialCount == null ||
            attendee.photoUploadCount == null ||
            attendee.viewCount == null ||
            attendee.lastCredentialGenerated == null ||
            attendee.lastPhotoUploaded == null;

          if (needsUpdate) {
            await databases.updateDocument(
              databaseId,
              collectionId,
              attendee.$id,
              {
                credentialCount,
                photoUploadCount,
                viewCount,
                lastCredentialGenerated,
                lastPhotoUploaded
              }
            );
            totalUpdated++;
          }

          totalProcessed++;

          if (totalProcessed % 50 === 0) {
            console.log(`  Processed ${totalProcessed} attendees...`);
          }
        } catch (error) {
          console.error(`  ✗ Error updating attendee ${attendee.$id}:`, error);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Migration Complete!');
    console.log('='.repeat(80));
    console.log(`Total attendees processed: ${totalProcessed}`);
    console.log(`Total attendees updated: ${totalUpdated}`);
    console.log(`Attendees skipped (already migrated): ${totalProcessed - totalUpdated}`);
    console.log('='.repeat(80));

    // Verify migration
    console.log('\nVerifying migration...');
    const verifyResponse = await databases.listDocuments<Attendee>(
      databaseId,
      collectionId,
      [Query.limit(5)]
    );

    console.log('\nSample of migrated attendees:');
    verifyResponse.documents.forEach((attendee, index) => {
      console.log(`\nAttendee ${index + 1}:`);
      console.log(`  ID: ${attendee.$id}`);
      console.log(`  credentialCount: ${attendee.credentialCount}`);
      console.log(`  photoUploadCount: ${attendee.photoUploadCount}`);
      console.log(`  viewCount: ${attendee.viewCount}`);
      console.log(`  lastCredentialGenerated: ${attendee.lastCredentialGenerated || 'null'}`);
      console.log(`  lastPhotoUploaded: ${attendee.lastPhotoUploaded || 'null'}`);
    });

    console.log('\n✓ Migration completed successfully!');

  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

migrateOperatorFields();
