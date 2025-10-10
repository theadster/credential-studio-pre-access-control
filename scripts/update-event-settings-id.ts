#!/usr/bin/env tsx
/**
 * Update Event Settings ID Script
 * 
 * This script updates the eventSettingsId in all related collections to use
 * a proper Appwrite-generated ID instead of a hardcoded value.
 * 
 * What it does:
 * 1. Checks current event settings document
 * 2. Creates a new event settings document with Appwrite-generated ID
 * 3. Updates all custom fields to reference the new ID
 * 4. Updates all integration collections (Cloudinary, Switchboard, OneSimpleAPI)
 * 5. Deletes the old event settings document
 * 
 * Prerequisites:
 * - Appwrite project configured in .env.local
 * - Database and collections already created
 * 
 * Usage:
 * npx tsx scripts/update-event-settings-id.ts
 */

import { Client, Databases, ID, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const EVENT_SETTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;
const CUSTOM_FIELDS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
const CLOUDINARY_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID!;
const SWITCHBOARD_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID!;
const ONESIMPLEAPI_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID!;

interface EventSettings {
    $id: string;
    [key: string]: any;
}

async function main() {
    console.log('=== Event Settings ID Update Script ===\n');

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
        !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
        !process.env.APPWRITE_API_KEY) {
        console.error('❌ Missing required environment variables');
        process.exit(1);
    }

    try {
        // Step 1: Get current event settings
        console.log('Step 1: Checking current event settings...');
        const eventSettingsList = await databases.listDocuments(
            DATABASE_ID,
            EVENT_SETTINGS_COLLECTION_ID,
            [Query.limit(1)]
        );

        if (eventSettingsList.documents.length === 0) {
            console.log('⚠️  No event settings found. Creating a new one with Appwrite-generated ID...');

            const newEventSettings = await databases.createDocument(
                DATABASE_ID,
                EVENT_SETTINGS_COLLECTION_ID,
                ID.unique(),
                {
                    eventName: 'My Event',
                    barcodeType: 'numerical',
                    barcodeLength: 6,
                    enableSwitchboard: false
                }
            );

            console.log(`✅ Created new event settings with ID: ${newEventSettings.$id}`);
            console.log('\n✨ Done! No migration needed.');
            return;
        }

        const currentSettings = eventSettingsList.documents[0] as EventSettings;
        const oldId = currentSettings.$id;

        console.log(`   Current event settings ID: ${oldId}`);
        console.log('   Proceeding with migration to generate a fresh Appwrite ID...\n');

        // Step 2: Create new event settings with Appwrite-generated ID
        console.log('Step 2: Creating new event settings document...');

        // Copy all fields except $id and system fields
        const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...settingsData } = currentSettings;

        const newEventSettings = await databases.createDocument(
            DATABASE_ID,
            EVENT_SETTINGS_COLLECTION_ID,
            ID.unique(),
            settingsData
        );

        const newId = newEventSettings.$id;
        console.log(`   ✅ Created new event settings with ID: ${newId}\n`);

        // Step 3: Update custom fields
        console.log('Step 3: Updating custom fields...');
        const customFields = await databases.listDocuments(
            DATABASE_ID,
            CUSTOM_FIELDS_COLLECTION_ID,
            [Query.equal('eventSettingsId', oldId), Query.limit(100)]
        );

        console.log(`   Found ${customFields.documents.length} custom fields to update`);

        for (const field of customFields.documents) {
            await databases.updateDocument(
                DATABASE_ID,
                CUSTOM_FIELDS_COLLECTION_ID,
                field.$id,
                { eventSettingsId: newId }
            );
        }

        console.log(`   ✅ Updated ${customFields.documents.length} custom fields\n`);

        // Step 4: Update Cloudinary integration
        console.log('Step 4: Updating Cloudinary integration...');
        try {
            const cloudinaryDocs = await databases.listDocuments(
                DATABASE_ID,
                CLOUDINARY_COLLECTION_ID,
                [Query.equal('eventSettingsId', oldId), Query.limit(1)]
            );

            if (cloudinaryDocs.documents.length > 0) {
                await databases.updateDocument(
                    DATABASE_ID,
                    CLOUDINARY_COLLECTION_ID,
                    cloudinaryDocs.documents[0].$id,
                    { eventSettingsId: newId }
                );
                console.log('   ✅ Updated Cloudinary integration\n');
            } else {
                console.log('   ℹ️  No Cloudinary integration found\n');
            }
        } catch (error: any) {
            console.log(`   ⚠️  Cloudinary collection not found or error: ${error.message}\n`);
        }

        // Step 5: Update Switchboard integration
        console.log('Step 5: Updating Switchboard integration...');
        try {
            const switchboardDocs = await databases.listDocuments(
                DATABASE_ID,
                SWITCHBOARD_COLLECTION_ID,
                [Query.equal('eventSettingsId', oldId), Query.limit(1)]
            );

            if (switchboardDocs.documents.length > 0) {
                await databases.updateDocument(
                    DATABASE_ID,
                    SWITCHBOARD_COLLECTION_ID,
                    switchboardDocs.documents[0].$id,
                    { eventSettingsId: newId }
                );
                console.log('   ✅ Updated Switchboard integration\n');
            } else {
                console.log('   ℹ️  No Switchboard integration found\n');
            }
        } catch (error: any) {
            console.log(`   ⚠️  Switchboard collection not found or error: ${error.message}\n`);
        }

        // Step 6: Update OneSimpleAPI integration
        console.log('Step 6: Updating OneSimpleAPI integration...');
        try {
            const oneSimpleApiDocs = await databases.listDocuments(
                DATABASE_ID,
                ONESIMPLEAPI_COLLECTION_ID,
                [Query.equal('eventSettingsId', oldId), Query.limit(1)]
            );

            if (oneSimpleApiDocs.documents.length > 0) {
                await databases.updateDocument(
                    DATABASE_ID,
                    ONESIMPLEAPI_COLLECTION_ID,
                    oneSimpleApiDocs.documents[0].$id,
                    { eventSettingsId: newId }
                );
                console.log('   ✅ Updated OneSimpleAPI integration\n');
            } else {
                console.log('   ℹ️  No OneSimpleAPI integration found\n');
            }
        } catch (error: any) {
            console.log(`   ⚠️  OneSimpleAPI collection not found or error: ${error.message}\n`);
        }

        // Step 7: Delete old event settings
        console.log('Step 7: Deleting old event settings document...');
        await databases.deleteDocument(
            DATABASE_ID,
            EVENT_SETTINGS_COLLECTION_ID,
            oldId
        );
        console.log('   ✅ Deleted old event settings\n');

        console.log('='.repeat(60));
        console.log('✨ Migration completed successfully!');
        console.log('='.repeat(60));
        console.log(`Old event settings ID: ${oldId}`);
        console.log(`New event settings ID: ${newId}`);
        console.log('\nAll related records have been updated to use the new ID.');

    } catch (error: any) {
        console.error('\n❌ Error during migration:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        process.exit(1);
    }
}

main();
