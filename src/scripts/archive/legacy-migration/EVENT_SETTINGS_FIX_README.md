# Event Settings Migration Fix

## Problem

The original Appwrite setup script only created 8 attributes for the Event Settings collection, but the Prisma schema has 38 fields. This caused the migration to fail with "Unknown attribute" errors.

## Solution

This script (`fix-event-settings-migration.ts`) performs a comprehensive fix:

### Step 1: Add Missing Attributes

Adds all 30 missing attributes to the Event Settings collection:

**Core Event Info:**
- `eventDate` (datetime) - The event date
- `eventTime` (string) - The event time
- `eventLocation` (string) - The event location
- `timeZone` (string) - The event timezone

**Barcode Settings:**
- `barcodeUnique` (boolean) - Whether barcodes must be unique

**Name Formatting:**
- `forceFirstNameUppercase` (boolean) - Force first names to uppercase
- `forceLastNameUppercase` (boolean) - Force last names to uppercase

**Attendee Sorting:**
- `attendeeSortField` (string) - Default sort field
- `attendeeSortDirection` (string) - Default sort direction (asc/desc)

**Cloudinary Integration (9 fields):**
- `cloudinaryEnabled` (boolean)
- `cloudinaryCloudName` (string)
- `cloudinaryApiKey` (string)
- `cloudinaryApiSecret` (string)
- `cloudinaryUploadPreset` (string)
- `cloudinaryAutoOptimize` (boolean)
- `cloudinaryGenerateThumbnails` (boolean)
- `cloudinaryDisableSkipCrop` (boolean)
- `cloudinaryCropAspectRatio` (string)

**Switchboard Integration (3 additional fields):**
- `switchboardApiEndpoint` (string)
- `switchboardAuthHeaderType` (string)
- `switchboardRequestBody` (string)

**OneSimpleAPI Integration (5 fields):**
- `oneSimpleApiEnabled` (boolean)
- `oneSimpleApiUrl` (string)
- `oneSimpleApiFormDataKey` (string)
- `oneSimpleApiFormDataValue` (string)
- `oneSimpleApiRecordTemplate` (string)

**Banner Images:**
- `signInBannerUrl` (string)

### Step 2: Clear Existing Data

Removes any existing Event Settings documents to avoid conflicts.

### Step 3: Migrate All Data

Migrates all Event Settings from Supabase to Appwrite with complete field mapping:

| Prisma Field | Appwrite Attribute | Notes |
|--------------|-------------------|-------|
| eventName | eventName | |
| eventDate | eventDate | Converted to ISO string |
| eventTime | eventTime | |
| eventLocation | eventLocation | |
| timeZone | timeZone | |
| barcodeType | barcodeType | |
| barcodeLength | barcodeLength | |
| barcodeUnique | barcodeUnique | |
| forceFirstNameUppercase | forceFirstNameUppercase | |
| forceLastNameUppercase | forceLastNameUppercase | |
| attendeeSortField | attendeeSortField | |
| attendeeSortDirection | attendeeSortDirection | |
| cloudinaryEnabled | cloudinaryEnabled | |
| cloudinaryCloudName | cloudinaryCloudName | |
| cloudinaryApiKey | cloudinaryApiKey | |
| cloudinaryApiSecret | cloudinaryApiSecret | |
| cloudinaryUploadPreset | cloudinaryUploadPreset | |
| cloudinaryAutoOptimize | cloudinaryAutoOptimize | |
| cloudinaryGenerateThumbnails | cloudinaryGenerateThumbnails | |
| cloudinaryDisableSkipCrop | cloudinaryDisableSkipCrop | |
| cloudinaryCropAspectRatio | cloudinaryCropAspectRatio | |
| switchboardEnabled | enableSwitchboard | Name changed |
| switchboardApiEndpoint | switchboardApiEndpoint | |
| switchboardAuthHeaderType | switchboardAuthHeaderType | |
| switchboardApiKey | switchboardApiKey | |
| switchboardRequestBody | switchboardRequestBody | |
| switchboardTemplateId | switchboardTemplateId | |
| switchboardFieldMappings | switchboardFieldMappings | JSON stringified |
| oneSimpleApiEnabled | oneSimpleApiEnabled | |
| oneSimpleApiUrl | oneSimpleApiUrl | |
| oneSimpleApiFormDataKey | oneSimpleApiFormDataKey | |
| oneSimpleApiFormDataValue | oneSimpleApiFormDataValue | |
| oneSimpleApiRecordTemplate | oneSimpleApiRecordTemplate | |
| bannerImageUrl | eventLogo | Name changed |
| signInBannerUrl | signInBannerUrl | |

**Total: 35 fields migrated** (38 Prisma fields minus 3 system fields: id, createdAt, updatedAt)

## Usage

```bash
npm run migrate:appwrite:event-settings
```

Or directly:

```bash
npx tsx src/scripts/fix-event-settings-migration.ts
```

## What to Expect

The script will:

1. **Add attributes** (takes ~30 seconds with rate limiting)
   - Shows success/skip/fail for each attribute
   - Waits 10 seconds after completion for Appwrite to process

2. **Clear existing data**
   - Removes any partial/incorrect data

3. **Migrate data**
   - Shows detailed progress for each event setting
   - Displays key field values for verification
   - Provides a summary report

## Output Example

```
[2025-10-04T03:30:00.000Z] 📋 Adding missing attributes to Event Settings collection...
[2025-10-04T03:30:01.000Z] ✅ Added attribute: eventDate
[2025-10-04T03:30:02.000Z] ✅ Added attribute: eventTime
...
[2025-10-04T03:30:35.000Z] 📋 Attribute creation summary: 30 added, 0 skipped, 0 failed
[2025-10-04T03:30:35.000Z] 📋 ⏳ Waiting 10 seconds for Appwrite to process new attributes...

[2025-10-04T03:30:45.000Z] 📋 Clearing existing Event Settings documents...
[2025-10-04T03:30:46.000Z] ✅ Cleared 1 documents

[2025-10-04T03:30:46.000Z] 📋 Starting Event Settings data migration...
[2025-10-04T03:30:46.000Z] 📋 Found 1 event settings to migrate
[2025-10-04T03:30:47.000Z] ✅ ✅ Migrated: NETFLIX Tudum 2025
[2025-10-04T03:30:47.000Z] 📋    - Event Date: 2025-05-17T00:00:00.000Z
[2025-10-04T03:30:47.000Z] 📋    - Location: São Paulo, Brazil
[2025-10-04T03:30:47.000Z] 📋    - Barcode: numerical (8 digits)
[2025-10-04T03:30:47.000Z] 📋    - Cloudinary: Enabled
[2025-10-04T03:30:47.000Z] 📋    - Switchboard: Enabled

========================================
MIGRATION SUMMARY
========================================
✅ Success: 1
❌ Failed: 0
========================================

🎉 Event Settings migration completed successfully!
```

## Verification

After running the script:

1. **Check Appwrite Dashboard**
   - Go to your Event Settings collection
   - Verify all 35+ attributes are present
   - Check that data is populated correctly

2. **Verify Field Count**
   - Should see ~35 attributes (excluding system fields)
   - All fields should have appropriate types

3. **Test Application**
   - Load event settings in your app
   - Verify all features work (Cloudinary, Switchboard, etc.)

## Troubleshooting

### "Attribute already exists" warnings
- This is normal if re-running the script
- The script will skip existing attributes

### Rate limiting errors
- The script includes 500ms delays between attribute creations
- If you still hit limits, increase the delay in the code

### Migration fails after adding attributes
- Wait longer than 10 seconds for Appwrite to process
- Try running the migration step separately

## Important Notes

⚠️ **This script clears existing Event Settings data** before migrating. Make sure you have a backup.

✅ **All 35 data fields are migrated** - This is a complete migration of the Event Settings table.

✅ **Idempotent attribute creation** - Safe to re-run if it fails partway through.

## Next Steps

After successful migration:

1. Verify data in Appwrite dashboard
2. Test all event settings features in your application
3. Proceed with migrating other tables if needed
4. Update your application code to use Appwrite instead of Supabase
