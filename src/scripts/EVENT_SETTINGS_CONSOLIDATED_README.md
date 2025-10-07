# Event Settings Consolidated Migration

## Problem

Appwrite has a limit on the number of attributes per collection. The Event Settings table has 38 fields, which exceeds this limit when trying to create individual attributes for each field.

**Error encountered:**
```
The maximum number or size of attributes for this collection has been reached.
```

## Solution: JSON Consolidation

This script consolidates related settings into JSON fields to reduce the attribute count from 38 to ~16 attributes.

### Data Structure

**Before (Attempted):** 38 separate attributes
**After (Consolidated):** 16 attributes storing 38 fields

#### Attribute Breakdown:

**Core Event Fields (9 attributes):**
- `eventName` (string)
- `eventDate` (datetime)
- `eventTime` (string)
- `eventLocation` (string)
- `timeZone` (string)
- `barcodeType` (string)
- `barcodeLength` (integer)
- `barcodeUnique` (boolean)
- `eventLogo` (string)

**Switchboard Fields (4 attributes):**
- `enableSwitchboard` (boolean)
- `switchboardApiKey` (string)
- `switchboardTemplateId` (string)
- `switchboardFieldMappings` (JSON string) - **Extended to include:**
  - Original field mappings
  - `apiEndpoint`
  - `authHeaderType`
  - `requestBody`

**Consolidated JSON Fields (3 attributes):**

1. **`cloudinaryConfig`** (JSON string) - Contains 9 Cloudinary settings:
   ```json
   {
     "enabled": false,
     "cloudName": "",
     "apiKey": "",
     "apiSecret": "",
     "uploadPreset": "",
     "autoOptimize": false,
     "generateThumbnails": false,
     "disableSkipCrop": false,
     "cropAspectRatio": "1"
   }
   ```

2. **`oneSimpleApiConfig`** (JSON string) - Contains 5 OneSimpleAPI settings:
   ```json
   {
     "enabled": false,
     "url": "",
     "formDataKey": "",
     "formDataValue": "",
     "recordTemplate": ""
   }
   ```

3. **`additionalSettings`** (JSON string) - Contains 6 miscellaneous settings:
   ```json
   {
     "forceFirstNameUppercase": false,
     "forceLastNameUppercase": false,
     "attendeeSortField": "lastName",
     "attendeeSortDirection": "asc",
     "bannerImageUrl": "",
     "signInBannerUrl": ""
   }
   ```

## Field Mapping Reference

| Prisma Field | Appwrite Location | Type |
|--------------|-------------------|------|
| **Core Fields** | | |
| eventName | eventName | string |
| eventDate | eventDate | datetime |
| eventTime | eventTime | string |
| eventLocation | eventLocation | string |
| timeZone | timeZone | string |
| barcodeType | barcodeType | string |
| barcodeLength | barcodeLength | integer |
| barcodeUnique | barcodeUnique | boolean |
| bannerImageUrl | eventLogo | string |
| **Cloudinary (in cloudinaryConfig JSON)** | | |
| cloudinaryEnabled | cloudinaryConfig.enabled | boolean |
| cloudinaryCloudName | cloudinaryConfig.cloudName | string |
| cloudinaryApiKey | cloudinaryConfig.apiKey | string |
| cloudinaryApiSecret | cloudinaryConfig.apiSecret | string |
| cloudinaryUploadPreset | cloudinaryConfig.uploadPreset | string |
| cloudinaryAutoOptimize | cloudinaryConfig.autoOptimize | boolean |
| cloudinaryGenerateThumbnails | cloudinaryConfig.generateThumbnails | boolean |
| cloudinaryDisableSkipCrop | cloudinaryConfig.disableSkipCrop | boolean |
| cloudinaryCropAspectRatio | cloudinaryConfig.cropAspectRatio | string |
| **Switchboard** | | |
| switchboardEnabled | enableSwitchboard | boolean |
| switchboardApiKey | switchboardApiKey | string |
| switchboardTemplateId | switchboardTemplateId | string |
| switchboardFieldMappings | switchboardFieldMappings (base) | JSON |
| switchboardApiEndpoint | switchboardFieldMappings.apiEndpoint | string |
| switchboardAuthHeaderType | switchboardFieldMappings.authHeaderType | string |
| switchboardRequestBody | switchboardFieldMappings.requestBody | string |
| **OneSimpleAPI (in oneSimpleApiConfig JSON)** | | |
| oneSimpleApiEnabled | oneSimpleApiConfig.enabled | boolean |
| oneSimpleApiUrl | oneSimpleApiConfig.url | string |
| oneSimpleApiFormDataKey | oneSimpleApiConfig.formDataKey | string |
| oneSimpleApiFormDataValue | oneSimpleApiConfig.formDataValue | string |
| oneSimpleApiRecordTemplate | oneSimpleApiConfig.recordTemplate | string |
| **Additional (in additionalSettings JSON)** | | |
| forceFirstNameUppercase | additionalSettings.forceFirstNameUppercase | boolean |
| forceLastNameUppercase | additionalSettings.forceLastNameUppercase | boolean |
| attendeeSortField | additionalSettings.attendeeSortField | string |
| attendeeSortDirection | additionalSettings.attendeeSortDirection | string |
| signInBannerUrl | additionalSettings.signInBannerUrl | string |

## Usage

```bash
npm run migrate:appwrite:event-settings-v2
```

Or directly:

```bash
npx tsx src/scripts/fix-event-settings-consolidated.ts
```

## What the Script Does

1. **Adds 8 new attributes** (only the ones that don't exist yet):
   - Core event fields (eventDate, eventTime, etc.)
   - Consolidated JSON fields (cloudinaryConfig, oneSimpleApiConfig, additionalSettings)

2. **Clears existing data** to ensure clean migration

3. **Migrates all data** with proper consolidation:
   - Groups related settings into JSON objects
   - Stringifies JSON for storage
   - Maintains all original data

## Code Changes Required

After migration, you'll need to update your application code to parse the JSON fields:

### Reading Event Settings

```typescript
// Before (Supabase/Prisma)
const cloudinaryEnabled = eventSettings.cloudinaryEnabled;
const cloudName = eventSettings.cloudinaryCloudName;

// After (Appwrite with consolidated fields)
const cloudinaryConfig = JSON.parse(eventSettings.cloudinaryConfig || '{}');
const cloudinaryEnabled = cloudinaryConfig.enabled;
const cloudName = cloudinaryConfig.cloudName;
```

### Example Helper Functions

```typescript
// Helper to get Cloudinary config
function getCloudinaryConfig(eventSettings: any) {
  return JSON.parse(eventSettings.cloudinaryConfig || '{}');
}

// Helper to get OneSimpleAPI config
function getOneSimpleApiConfig(eventSettings: any) {
  return JSON.parse(eventSettings.oneSimpleApiConfig || '{}');
}

// Helper to get additional settings
function getAdditionalSettings(eventSettings: any) {
  return JSON.parse(eventSettings.additionalSettings || '{}');
}

// Helper to get Switchboard extended config
function getSwitchboardConfig(eventSettings: any) {
  const baseConfig = JSON.parse(eventSettings.switchboardFieldMappings || '{}');
  return {
    enabled: eventSettings.enableSwitchboard,
    apiKey: eventSettings.switchboardApiKey,
    templateId: eventSettings.switchboardTemplateId,
    apiEndpoint: baseConfig.apiEndpoint || '',
    authHeaderType: baseConfig.authHeaderType || 'Bearer',
    requestBody: baseConfig.requestBody || '',
    fieldMappings: baseConfig, // Original mappings
  };
}
```

### Updating Event Settings

```typescript
// When updating Cloudinary settings
const cloudinaryConfig = JSON.parse(eventSettings.cloudinaryConfig || '{}');
cloudinaryConfig.enabled = true;
cloudinaryConfig.cloudName = 'my-cloud';

await appwriteDatabases.updateDocument(
  DATABASE_ID,
  COLLECTION_ID,
  documentId,
  {
    cloudinaryConfig: JSON.stringify(cloudinaryConfig)
  }
);
```

## Verification

After running the script:

1. **Check Appwrite Dashboard:**
   - Event Settings collection should have ~16 attributes
   - No "maximum attributes" errors

2. **Verify Data:**
   - Open a document in Appwrite dashboard
   - Check that JSON fields contain proper data
   - Verify core fields are populated

3. **Test in Application:**
   - Load event settings
   - Parse JSON fields
   - Verify all features work

## Advantages of This Approach

✅ **Works within Appwrite limits** - Only 16 attributes instead of 38
✅ **All data preserved** - No data loss, just reorganized
✅ **Logical grouping** - Related settings are grouped together
✅ **Easier to extend** - Can add more settings to JSON objects without hitting limits
✅ **Better organization** - Cloudinary settings in one place, etc.

## Disadvantages

⚠️ **Requires code changes** - Application must parse JSON fields
⚠️ **No direct querying** - Can't query on fields inside JSON (but rarely needed for settings)
⚠️ **Slightly more complex** - Need to parse/stringify JSON

## Migration Output Example

```
[2025-10-04T04:00:00.000Z] 📋 Adding consolidated JSON attributes...
[2025-10-04T04:00:01.000Z] ✅ Added attribute: eventDate
[2025-10-04T04:00:02.000Z] ✅ Added attribute: cloudinaryConfig
[2025-10-04T04:00:03.000Z] ✅ Added attribute: oneSimpleApiConfig
[2025-10-04T04:00:04.000Z] ✅ Added attribute: additionalSettings
...
[2025-10-04T04:00:10.000Z] 📋 Attribute creation summary: 8 added, 8 skipped, 0 failed

[2025-10-04T04:00:20.000Z] 📋 Clearing existing Event Settings documents...
[2025-10-04T04:00:21.000Z] ✅ Cleared 1 documents

[2025-10-04T04:00:21.000Z] 📋 Starting Event Settings data migration...
[2025-10-04T04:00:21.000Z] 📋 Found 1 event settings to migrate
[2025-10-04T04:00:22.000Z] ✅ ✅ Migrated: NETFLIX Tudum 2025
[2025-10-04T04:00:22.000Z] 📋    📦 Core Fields:
[2025-10-04T04:00:22.000Z] 📋       - Event Date: 2025-05-17T00:00:00.000Z
[2025-10-04T04:00:22.000Z] 📋       - Location: São Paulo, Brazil
[2025-10-04T04:00:22.000Z] 📋       - Barcode: numerical (8 digits)
[2025-10-04T04:00:22.000Z] 📋    📦 Cloudinary Config (JSON):
[2025-10-04T04:00:22.000Z] 📋       - Enabled: true
[2025-10-04T04:00:22.000Z] 📋       - Cloud Name: your-cloud-name
[2025-10-04T04:00:22.000Z] 📋    📦 Switchboard Config:
[2025-10-04T04:00:22.000Z] 📋       - Enabled: true
[2025-10-04T04:00:22.000Z] 📋       - Template ID: template-123
[2025-10-04T04:00:22.000Z] 📋    📦 OneSimpleAPI Config (JSON):
[2025-10-04T04:00:22.000Z] 📋       - Enabled: false
[2025-10-04T04:00:22.000Z] 📋    📦 Additional Settings (JSON):
[2025-10-04T04:00:22.000Z] 📋       - Sort Field: lastName
[2025-10-04T04:00:22.000Z] 📋       - Force Uppercase: false

========================================
MIGRATION SUMMARY
========================================
✅ Success: 1
❌ Failed: 0
========================================

🎉 Event Settings migration completed successfully!

📝 Data Structure:
   - Core fields: 9 separate attributes
   - Cloudinary: 1 JSON attribute (9 settings)
   - Switchboard: 4 attributes (3 in fieldMappings JSON)
   - OneSimpleAPI: 1 JSON attribute (5 settings)
   - Additional: 1 JSON attribute (6 settings)
   - Total: ~16 attributes storing 38 fields
```

## Next Steps

1. ✅ Run the migration script
2. 📝 Update application code to parse JSON fields (see examples above)
3. 🧪 Test all event settings features
4. 📚 Document the new structure for your team
5. 🚀 Deploy updated application code

## Rollback

If needed, you can rollback by:
1. Keeping Supabase active
2. Reverting application code
3. Clearing Appwrite Event Settings collection
4. Re-running original Supabase queries
