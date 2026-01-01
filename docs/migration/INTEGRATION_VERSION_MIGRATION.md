---
title: "Integration Version Migration"
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 180
related_code: ["scripts/setup-appwrite.ts"]
---

# Integration Version Migration Guide

This guide explains how to migrate existing integration documents to support optimistic locking with version fields.

## Overview

The optimistic locking implementation requires all integration documents to have a `version` field. This migration process consists of two steps:

1. **Add version attribute to collections** - Adds the version field schema to the database
2. **Migrate existing documents** - Updates existing documents to include version=1

## Prerequisites

- Appwrite project with integration collections already created
- Environment variables configured in `.env.local`
- Node.js 20.x or higher
- `node-appwrite` package installed (already in devDependencies)

## Required Environment Variables

Ensure these are set in your `.env.local` file:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID=cloudinary-collection-id
NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID=switchboard-collection-id
NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID=onesimpleapi-collection-id
```

## Migration Steps

### Step 1: Add Version Attribute to Collections

This step adds the `version` attribute (integer, default: 1) to all three integration collections.

```bash
npx tsx scripts/add-version-to-integrations.ts
```

**What it does:**
- Adds `version` attribute to Cloudinary collection
- Adds `version` attribute to Switchboard collection
- Adds `version` attribute to OneSimpleAPI collection
- Verifies the attributes were created successfully

**Expected output:**
```
Adding version attribute to Cloudinary collection...
✓ Version attribute added to Cloudinary collection
  - Type: integer
  - Required: false (optional with default)
  - Default: 1

Adding version attribute to Switchboard collection...
✓ Version attribute added to Switchboard collection
  ...

✓ Version attributes added successfully to all integration collections!
```

**Note:** If you run this script multiple times, it will detect existing attributes and skip them.

### Step 2: Migrate Existing Documents

This step updates all existing integration documents to add `version=1` if they don't already have a version field.

```bash
npx tsx scripts/migrate-integration-versions.ts
```

**What it does:**
- Fetches all documents from each integration collection
- Checks if each document has a version field
- Updates documents without version to set `version=1`
- Logs progress and results for each collection
- Verifies migration results

**Expected output:**
```
Integration Version Migration Script
================================================================================

Migrating Cloudinary collection...
================================================================================
Fetched 5 of 5 documents...
Total documents found: 5

  ✓ Updated document 67abc123... with version=1
  ✓ Updated document 67abc456... with version=1
  ...

Cloudinary Migration Summary:
  Total documents: 5
  Already had version: 0
  Updated with version=1: 5
  Errors: 0

Overall Migration Summary
================================================================================
Total documents across all collections: 15
Documents already had version: 0
Documents updated with version=1: 15
Errors encountered: 0

✓ Migration completed successfully!
```

## Verification

After running both scripts, verify the migration in the Appwrite Console:

1. Navigate to your Appwrite project
2. Go to Databases → Your Database → Collections
3. Check each integration collection (Cloudinary, Switchboard, OneSimpleAPI)
4. Verify the `version` attribute exists in the schema
5. View some documents to confirm they have `version: 1`

## Troubleshooting

### Error: "APPWRITE_API_KEY is not set"

Make sure you have a valid API key in your `.env.local` file. You can create one in the Appwrite Console under Settings → API Keys.

### Error: "Version attribute already exists"

This is normal if you've run the attribute creation script before. The script will skip existing attributes and continue.

### Error: "Document update failed"

Check that:
- Your API key has write permissions
- The collections exist and are accessible
- The database ID is correct

### Some documents still missing version

If the verification shows documents without version:
1. Check the error messages in the migration output
2. Verify your API key has update permissions
3. Re-run the migration script

## Rollback

If you need to rollback the migration:

1. **Remove version attribute** (optional):
   - Go to Appwrite Console → Database → Collection → Attributes
   - Delete the `version` attribute from each collection
   - Note: This will also remove version values from all documents

2. **Code rollback**:
   - The code is backward compatible
   - If `expectedVersion` is not provided, version checking is skipped
   - Existing code will continue to work without changes

## Testing

After migration, test the optimistic locking:

1. **Test version increment:**
   ```typescript
   // First update
   const integration = await updateCloudinaryIntegration(databases, eventId, data);
   console.log(integration.version); // Should be 2 (incremented from 1)
   
   // Second update
   const updated = await updateCloudinaryIntegration(databases, eventId, data);
   console.log(updated.version); // Should be 3
   ```

2. **Test conflict detection:**
   ```typescript
   // This should throw IntegrationConflictError
   await updateCloudinaryIntegration(databases, eventId, data, 1); // Wrong version
   ```

3. **Test backward compatibility:**
   ```typescript
   // This should work without version checking
   await updateCloudinaryIntegration(databases, eventId, data); // No expectedVersion
   ```

## Next Steps

1. ✅ Run attribute creation script
2. ✅ Run document migration script
3. ✅ Verify in Appwrite Console
4. ✅ Test optimistic locking implementation
5. ✅ Update API routes to handle IntegrationConflictError
6. ✅ Monitor for version conflicts in production

## Support

If you encounter issues:
1. Check the script output for specific error messages
2. Verify all environment variables are set correctly
3. Ensure your API key has the necessary permissions
4. Review the Appwrite Console for collection and document state
