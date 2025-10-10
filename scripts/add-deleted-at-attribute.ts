/**
 * Migration Script: Add deletedAt Attribute to Custom Fields Collection
 * 
 * This script adds the deletedAt attribute to the custom_fields collection
 * to support soft delete functionality.
 * 
 * Run with: npx tsx scripts/add-deleted-at-attribute.ts
 */

import { config } from 'dotenv';
import { Client, Databases } from 'node-appwrite';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function addDeletedAtAttribute() {
    console.log('🚀 Starting migration: Add deletedAt attribute to custom_fields collection\n');

    // Initialize Appwrite client
    const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
        .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);

    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;

    try {
        // Check if attribute already exists
        console.log('📋 Checking if deletedAt attribute already exists...');

        try {
            const collection = await databases.getCollection(databaseId, customFieldsCollectionId);
            const existingAttribute = collection.attributes.find((attr: any) => attr.key === 'deletedAt');

            if (existingAttribute) {
                console.log('✅ deletedAt attribute already exists');
                console.log('   Type:', existingAttribute.type);
                console.log('   Required:', existingAttribute.required);
                console.log('\n✨ Migration complete - no changes needed');
                return;
            }
        } catch (error) {
            console.log('⚠️  Could not check existing attributes, proceeding with creation...');
        }

        // Add deletedAt attribute
        console.log('➕ Adding deletedAt attribute to custom_fields collection...');

        await databases.createDatetimeAttribute(
            databaseId,
            customFieldsCollectionId,
            'deletedAt',
            false  // not required
        );

        console.log('✅ deletedAt attribute created successfully');
        console.log('   Type: datetime');
        console.log('   Required: false');
        console.log('   Default: null');

        console.log('\n⏳ Waiting for attribute to be available (this may take a moment)...');

        // Wait for attribute to be available
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            try {
                const collection = await databases.getCollection(databaseId, customFieldsCollectionId);
                const attribute = collection.attributes.find((attr: any) => attr.key === 'deletedAt');

                if (attribute && attribute.status === 'available') {
                    console.log('✅ Attribute is now available');
                    break;
                }

                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                attempts++;
                process.stdout.write('.');
            } catch (error) {
                console.log('\n⚠️  Error checking attribute status:', error);
                break;
            }
        }

        if (attempts >= maxAttempts) {
            console.log('\n⚠️  Timeout waiting for attribute to become available');
            console.log('   The attribute was created but may still be processing');
            console.log('   Please check the Appwrite console to verify');
        }

        console.log('\n✨ Migration complete!');
        console.log('\n📝 Next steps:');
        console.log('   1. Verify the attribute in Appwrite console');
        console.log('   2. Restart your development server');
        console.log('   3. Test the custom fields soft delete functionality');

    } catch (error: any) {
        console.error('\n❌ Migration failed:', error.message);

        if (error.code === 409) {
            console.log('\n💡 The attribute may already exist. Check the Appwrite console.');
        } else if (error.code === 401) {
            console.log('\n💡 Authentication failed. Check your APPWRITE_API_KEY in .env.local');
        } else {
            console.log('\n💡 Error details:', error);
        }

        process.exit(1);
    }
}

// Run the migration
addDeletedAtAttribute().catch(console.error);
