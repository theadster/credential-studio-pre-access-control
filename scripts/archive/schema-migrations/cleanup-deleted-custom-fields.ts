// @ts-nocheck
/**
 * ARCHIVED MIGRATION SCRIPT
 * 
 * This is an archived schema migration script that was used during the Appwrite migration.
 * It is kept for historical reference and should NOT be run again.
 * 
 * TypeScript checking is disabled because:
 * - This script was written for an older version of the Appwrite SDK
 * - SDK methods and type signatures may have changed since this migration was run
 * - The script is no longer actively maintained as the migration is complete
 * 
 * Original Purpose:
 * Cleanup Script: Purge soft-deleted custom fields and orphaned values
 * 
 * This script permanently deletes custom fields that have been soft-deleted
 * for more than 30 days, and removes orphaned values from attendee documents.
 * 
 * Features:
 * - Configurable retention period (default: 30 days)
 * - Batched processing to avoid timeouts
 * - Dry-run mode for testing
 * - Progress logging and error handling
 * - Idempotent (safe to run multiple times)
 * 
 * Usage:
 *   # Dry run (preview what would be deleted)
 *   npx ts-node scripts/cleanup-deleted-custom-fields.ts --dry-run
 * 
 *   # Actually delete (default: 30 days retention)
 *   npx ts-node scripts/cleanup-deleted-custom-fields.ts
 * 
 *   # Custom retention period (90 days)
 *   npx ts-node scripts/cleanup-deleted-custom-fields.ts --retention-days 90
 * 
 * Schedule with cron:
 *   # Run on the 1st of each month at 2 AM
 *   0 2 1 * * cd /path/to/app && npx ts-node scripts/cleanup-deleted-custom-fields.ts
 */

import { Client, Databases, Query } from 'node-appwrite';

interface CleanupOptions {
    dryRun: boolean;
    retentionDays: number;
}

interface CleanupStats {
    fieldsFound: number;
    fieldsDeleted: number;
    attendeesProcessed: number;
    valuesRemoved: number;
    errors: number;
}

async function cleanupDeletedFields(options: CleanupOptions, databases: Databases) {
    const { dryRun, retentionDays } = options;

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;

    const stats: CleanupStats = {
        fieldsFound: 0,
        fieldsDeleted: 0,
        attendeesProcessed: 0,
        valuesRemoved: 0,
        errors: 0
    };

    console.log('='.repeat(60));
    console.log('Custom Fields Cleanup Script');
    console.log('='.repeat(60));
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will delete data)'}`);
    console.log(`Retention Period: ${retentionDays} days`);
    console.log(`Database ID: ${dbId}`);
    console.log('='.repeat(60));
    console.log('');

    try {
        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const cutoffISO = cutoffDate.toISOString();

        console.log(`Finding fields deleted before: ${cutoffDate.toLocaleString()}`);
        console.log('');

        // Find soft-deleted fields older than retention period
        const deletedFields = await databases.listDocuments(
            dbId,
            customFieldsCollectionId,
            [
                Query.isNotNull('deletedAt'),
                Query.lessThan('deletedAt', cutoffISO),
                Query.limit(100)
            ]
        );

        stats.fieldsFound = deletedFields.documents.length;

        if (stats.fieldsFound === 0) {
            console.log('✅ No fields found for cleanup');
            return stats;
        }

        console.log(`Found ${stats.fieldsFound} field(s) to purge:\n`);

        // Process each deleted field
        for (const field of deletedFields.documents) {
            const fieldId = field.$id;
            const fieldName = field.fieldName;
            const internalFieldName = field.internalFieldName;
            const deletedAt = new Date(field.deletedAt);

            console.log(`📋 Field: ${fieldName} (${fieldId})`);
            console.log(`   Internal Name: ${internalFieldName}`);
            console.log(`   Deleted: ${deletedAt.toLocaleString()}`);
            console.log(`   Age: ${Math.floor((Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24))} days`);

            try {
                // Step 1: Remove orphaned values from attendees
                console.log(`   Cleaning orphaned values from attendees...`);

                let offset = 0;
                const batchSize = 100;
                let hasMore = true;
                let attendeesInBatch = 0;
                let valuesInBatch = 0;

                while (hasMore) {
                    const attendees = await databases.listDocuments(
                        dbId,
                        attendeesCollectionId,
                        [Query.limit(batchSize), Query.offset(offset)]
                    );

                    for (const attendee of attendees.documents) {
                        const customFieldValues = attendee.customFieldValues || {};

                        if (customFieldValues[internalFieldName]) {
                            attendeesInBatch++;
                            valuesInBatch++;

                            if (!dryRun) {
                                // Remove the orphaned field value
                                delete customFieldValues[internalFieldName];

                                await databases.updateDocument(
                                    dbId,
                                    attendeesCollectionId,
                                    attendee.$id,
                                    { customFieldValues }
                                );
                            }
                        }
                    }

                    hasMore = attendees.documents.length === batchSize;
                    offset += batchSize;
                    stats.attendeesProcessed += attendees.documents.length;

                    // Progress indicator
                    if (offset % 500 === 0) {
                        process.stdout.write('.');
                    }
                }

                if (valuesInBatch > 0) {
                    console.log(`   ${dryRun ? 'Would remove' : 'Removed'} ${valuesInBatch} orphaned value(s) from ${attendeesInBatch} attendee(s)`);
                    stats.valuesRemoved += valuesInBatch;
                } else {
                    console.log(`   No orphaned values found`);
                }

                // Step 2: Hard delete the field definition
                if (!dryRun) {
                    await databases.deleteDocument(dbId, customFieldsCollectionId, fieldId);
                    console.log(`   ✅ Field definition deleted`);
                    stats.fieldsDeleted++;
                } else {
                    console.log(`   Would delete field definition`);
                }

            } catch (error: any) {
                console.error(`   ❌ Error processing field: ${error.message}`);
                stats.errors++;
            }

            console.log('');
        }

        // Summary
        console.log('='.repeat(60));
        console.log('Cleanup Summary');
        console.log('='.repeat(60));
        console.log(`Fields found:           ${stats.fieldsFound}`);
        console.log(`Fields deleted:         ${stats.fieldsDeleted}`);
        console.log(`Attendees processed:    ${stats.attendeesProcessed}`);
        console.log(`Orphaned values removed: ${stats.valuesRemoved}`);
        console.log(`Errors:                 ${stats.errors}`);
        console.log('='.repeat(60));

        if (dryRun) {
            console.log('\n⚠️  This was a DRY RUN - no changes were made');
            console.log('Run without --dry-run to actually delete data');
        } else {
            console.log('\n✅ Cleanup completed successfully');
        }

        return stats;

    } catch (error: any) {
        console.error('\n❌ Cleanup failed:', error.message);
        console.error('Error details:', error);
        throw error;
    }
}

// Parse command line arguments
function parseArgs(): CleanupOptions {
    const args = process.argv.slice(2);
    const options: CleanupOptions = {
        dryRun: false,
        retentionDays: 30
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg === '--retention-days') {
            const days = parseInt(args[i + 1], 10);
            if (isNaN(days) || days < 1) {
                console.error('❌ Invalid retention days. Must be a positive number.');
                process.exit(1);
            }
            options.retentionDays = days;
            i++; // Skip next arg
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
Usage: npx ts-node scripts/cleanup-deleted-custom-fields.ts [options]

Options:
  --dry-run              Preview what would be deleted without making changes
  --retention-days N     Only delete fields older than N days (default: 30)
  --help, -h             Show this help message

Examples:
  # Dry run (preview)
  npx ts-node scripts/cleanup-deleted-custom-fields.ts --dry-run

  # Delete fields older than 30 days (default)
  npx ts-node scripts/cleanup-deleted-custom-fields.ts

  # Delete fields older than 90 days
  npx ts-node scripts/cleanup-deleted-custom-fields.ts --retention-days 90

Schedule with cron:
  # Run monthly on the 1st at 2 AM
  0 2 1 * * cd /path/to/app && npx ts-node scripts/cleanup-deleted-custom-fields.ts
      `);
            process.exit(0);
        } else {
            console.error(`❌ Unknown argument: ${arg}`);
            console.error('Use --help for usage information');
            process.exit(1);
        }
    }

    return options;
}

// Validate environment variables
function validateEnv() {
    const required = [
        'NEXT_PUBLIC_APPWRITE_ENDPOINT',
        'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
        'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
        'NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID',
        'NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID',
        'APPWRITE_API_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\nEnsure these are set in your .env.local file');
        process.exit(1);
    }
}

// Main execution
async function main() {
    validateEnv();
    const options = parseArgs();

    // Initialize Appwrite client with admin credentials after validation
    const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
        .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);

    try {
        const stats = await cleanupDeletedFields(options, databases);
        process.exit(stats.errors > 0 ? 1 : 0);
    } catch (error) {
        console.error('Unexpected error:', error);
        process.exit(1);
    }
}

main();
