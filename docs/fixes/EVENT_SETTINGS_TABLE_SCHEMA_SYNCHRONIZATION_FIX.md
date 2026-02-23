---
title: Event Settings Table Schema Synchronization Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-02-22
review_interval_days: 90
related_code:
  - scripts/setup-appwrite.ts
  - src/pages/api/attendees/bulk-export-pdf.ts
  - src/pages/api/access-control/[attendeeId].ts
  - src/pages/api/mobile/event-info.ts
---

## Updates

**2025-02-22 (Latest):** Fixed column requirement constraints:
- `timeZone`: Kept as `required: true` (no default value) - must be provided when creating event settings
- `customFieldColumns`: Changed to `required: false` with `xdefault: 7` - optional with sensible default

# Event Settings Table Schema Synchronization Fix

## Overview

Fixed critical schema discrepancy in the `event_settings` table where the setup script was missing 9 columns that were actively used in the application. The setup script now correctly creates all 19 required columns. Additionally, removed 19 deprecated columns (Switchboard, OneSimpleAPI, Cloudinary integration fields, and the unused `eventLogo` column) that were moved to dedicated integration tables or are no longer needed.

## Problem

The `createEventSettingsTable()` function in `scripts/setup-appwrite.ts` was only creating 9 columns:
- `eventName`
- `eventLogo`
- `barcodeType`
- `barcodeLength`
- `enableSwitchboard`
- `switchboardApiKey`
- `switchboardTemplateId`
- `switchboardFieldMappings`
- `customFieldColumns`

However, the actual database had 24 columns, and the API code was using 15 additional columns that weren't defined in the setup script.

## Root Cause

The setup script was incomplete and didn't reflect the full set of event configuration options used throughout the application. Multiple API endpoints were referencing event_settings columns that weren't being created by the setup script.

## Solution

Updated `createEventSettingsTable()` to create all required columns with appropriate types and defaults. Additionally, removed 19 deprecated columns that were moved to dedicated integration tables or are no longer used.

### Deprecated Columns Removed (19 columns)

These columns were moved to dedicated integration tables or are unused legacy columns:

**Switchboard Integration (4 columns) → Moved to `switchboard` table**
- `enableSwitchboard` → `switchboard.enabled`
- `switchboardApiKey` → Not stored in DB (uses environment variable for security)
- `switchboardTemplateId` → `switchboard.templateId`
- `switchboardFieldMappings` → `switchboard.fieldMappings`

**OneSimpleAPI Integration (5 columns) → Moved to `onesimpleapi` table**
- `oneSimpleApiEnabled` → `onesimpleapi.enabled`
- `oneSimpleApiUrl` → `onesimpleapi.url`
- `oneSimpleApiFormDataKey` → `onesimpleapi.formDataKey`
- `oneSimpleApiFormDataValue` → `onesimpleapi.formDataValue`
- `oneSimpleApiRecordTemplate` → `onesimpleapi.recordTemplate`

**Cloudinary Integration (9 columns) → Moved to `cloudinary` table**
- `cloudinaryEnabled` → `cloudinary.enabled`
- `cloudinaryCloudName` → `cloudinary.cloudName`
- `cloudinaryApiKey` → Not stored in DB (uses environment variable for security)
- `cloudinaryApiSecret` → Not stored in DB (uses environment variable for security)
- `cloudinaryUploadPreset` → `cloudinary.uploadPreset`
- `cloudinaryAutoOptimize` → `cloudinary.autoOptimize`
- `cloudinaryGenerateThumbnails` → `cloudinary.generateThumbnails`
- `cloudinaryDisableSkipCrop` → `cloudinary.disableSkipCrop`
- `cloudinaryCropAspectRatio` → `cloudinary.cropAspectRatio`

**Legacy/Unused Columns (1 column)**
- `eventLogo` → Unused legacy column (application uses `bannerImageUrl` instead)

**Evidence:** In `src/pages/api/event-settings/index.ts` (lines 1150-1170), Switchboard/OneSimpleAPI/Cloudinary fields are explicitly excluded from event_settings updates with the comment "Exclude all Cloudinary/Switchboard/OneSimpleAPI integration fields". The API extracts them into separate objects that get saved to their respective integration tables. The `eventLogo` column was never referenced in active code.

### Columns Added (15 new columns)

**Event Information (4 columns)**
- `eventDate` (DateTime) - Event date
- `eventTime` (Varchar, 50) - Event time
- `eventLocation` (Varchar, 500) - Event location
- `timeZone` (Varchar, 100, default: 'UTC') - Timezone for event

**Access Control (1 column)**
- `accessControlTimeMode` (Varchar, 50, default: 'date_only') - Time mode for access control (date_only or date_time)

**Mobile Settings (1 column)**
- `mobileSettingsPasscode` (Varchar, 255) - Passcode for mobile app access

### Complete Column List (19 total)

| # | Column Key | Type | Size | Required | Default |
|---|---|---|---|---|---|
| 1 | `eventName` | Varchar | 255 | false | (none) |
| 2 | `eventDate` | DateTime | N/A | false | (none) |
| 3 | `eventTime` | Varchar | 50 | false | (none) |
| 4 | `eventLocation` | Varchar | 500 | false | (none) |
| 5 | `timeZone` | Varchar | 100 | true | (none) |
| 6 | `accessControlTimeMode` | Varchar | 50 | false | `'date_only'` |
| 7 | `mobileSettingsPasscode` | Varchar | 255 | false | (none) |
| 8 | `barcodeType` | Varchar | 50 | false | (none) |
| 9 | `barcodeLength` | Integer | N/A | false | (none) |
| 10 | `barcodeUnique` | Boolean | N/A | false | `true` |
| 11 | `forceFirstNameUppercase` | Boolean | N/A | false | `false` |
| 12 | `forceLastNameUppercase` | Boolean | N/A | false | `false` |
| 13 | `attendeeSortField` | Varchar | 50 | false | `'lastName'` |
| 14 | `attendeeSortDirection` | Varchar | 10 | false | `'asc'` |
| 15 | `bannerImageUrl` | Varchar | 1000 | false | (none) |
| 16 | `signInBannerUrl` | Varchar | 1000 | false | (none) |
| 17 | `accessControlEnabled` | Boolean | N/A | false | `false` |
| 18 | `accessControlDefaults` | Varchar | 5000 | false | (none) |
| 19 | `customFieldColumns` | Integer | N/A | false | `7` |

### Column Categories

**Event Details (4 columns):** eventName, eventDate, eventTime, eventLocation
**Timezone & Access (2 columns):** timeZone, accessControlTimeMode
**Mobile Settings (1 column):** mobileSettingsPasscode
**Barcode Configuration (3 columns):** barcodeType, barcodeLength, barcodeUnique
**Name Formatting (2 columns):** forceFirstNameUppercase, forceLastNameUppercase
**Attendee Sorting (2 columns):** attendeeSortField, attendeeSortDirection
**Banner Images (2 columns):** bannerImageUrl, signInBannerUrl
**Access Control (2 columns):** accessControlEnabled, accessControlDefaults
**Custom Fields (1 column):** customFieldColumns

## TablesDB API Compliance

All changes follow the TablesDB API standard with zero tolerance enforcement:

- ✅ Uses named object parameters: `{ databaseId, tableId, key, required, xdefault }`
- ✅ Uses `xdefault` instead of `default` (reserved keyword)
- ✅ Uses `createColumnIfMissing()` helper for idempotent column creation
- ✅ Handles both first-time table creation and existing tables

## API Usage

The following API endpoints use event_settings columns:

1. **src/pages/api/attendees/bulk-export-pdf.ts**
   - Uses: eventName, eventDate, eventTime, eventLocation

2. **src/pages/api/access-control/[attendeeId].ts**
   - Uses: accessControlTimeMode, timeZone

3. **src/pages/api/mobile/event-info.ts**
   - Uses: eventName, eventDate, eventLocation, eventTime, timeZone, mobileSettingsPasscode

## Validation

Setup script executed successfully with all 19 columns confirmed:
```
Creating event_settings table...
✓ Event settings table already exists
  Found 19 existing columns
  ✓ Column 'eventName' already exists
  ✓ Column 'eventDate' already exists
  ... (all 19 columns verified)
✓ Event settings table setup complete
```

### Column Requirement Constraint Fix

**Issue:** Initial implementation had `customFieldColumns` marked as `required: true` with a default value, which violates Appwrite TablesDB constraint: cannot set default value for required columns.

**Solution:** 
- `timeZone`: Kept as `required: true` (no default) - ensures timezone is always specified
- `customFieldColumns`: Changed to `required: false` with `xdefault: 7` - provides sensible default while allowing optional specification

## Files Modified

1. **scripts/setup-appwrite.ts**
   - Updated `createEventSettingsTable()` function
   - Added all 15 missing columns with correct types and defaults
   - Fixed column requirement constraints for `timeZone` and `customFieldColumns`
   - Organized columns by category with comments

## Impact

- ✅ Setup script now matches actual database schema (19 core columns)
- ✅ All 9 missing columns added (barcodeUnique, forceFirstNameUppercase, forceLastNameUppercase, attendeeSortField, attendeeSortDirection, bannerImageUrl, signInBannerUrl, accessControlEnabled, accessControlDefaults)
- ✅ Deprecated integration columns removed (19 columns moved to dedicated tables or unused)
- ✅ All event configuration options are properly persisted
- ✅ Integration data properly separated into dedicated tables (switchboard, cloudinary, onesimpleapi)
- ✅ Unused legacy columns removed (eventLogo)
- ✅ API code can reliably access all expected columns
- ✅ Idempotent setup: can be run multiple times safely
- ✅ Supports both new deployments and existing databases
- ✅ Cleaner schema with better separation of concerns

## Testing

Run the setup script to verify:
```bash
npm run setup:appwrite
```

Expected output should show all 19 columns in the event_settings table and confirm that the switchboard, cloudinary, and onesimpleapi tables are properly created with their dedicated columns.
