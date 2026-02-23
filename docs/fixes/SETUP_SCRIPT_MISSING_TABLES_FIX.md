---
title: Setup Script Missing Tables Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - scripts/setup-appwrite.ts
  - src/pages/api/access-control/[attendeeId].ts
  - src/pages/api/approval-profiles/index.ts
  - src/lib/appwrite-integrations.ts
---

# Setup Script Missing Tables Fix

## Problem

The Appwrite setup script (`scripts/setup-appwrite.ts`) was missing 5 table definitions that were already being used throughout the codebase. This caused database initialization to be incomplete, requiring manual table creation in the Appwrite console.

**Missing production tables:**
1. `access_control` - Access control rules per attendee
2. `approval_profiles` - Approval profile configurations
3. `cloudinary` - Cloudinary integration settings
4. `switchboard` - Switchboard credential printing settings
5. `onesimpleapi` - OneSimpleAPI integration settings

## Solution

Added complete table creation functions for all 5 missing production tables to the setup script with:

- Proper schema definitions matching actual usage in the codebase
- Appropriate column types and sizes
- Unique indexes where needed
- Default values using `xdefault` (TablesDB API compliant)
- Proper permissions for each table
- Error handling for existing tables (409 conflict handling)

## Changes Made

### Updated Files
- `scripts/setup-appwrite.ts`
  - Added 5 new table IDs to `TABLES` constant
  - Added `createAccessControlTable()` function
  - Added `createApprovalProfilesTable()` function
  - Added `createCloudinaryTable()` function
  - Added `createSwitchboardTable()` function
  - Added `createOneSimpleApiTable()` function
  - Updated `printEnvironmentVariables()` to include all 15 table IDs
  - Updated `main()` to call all new table creation functions

### Table Schemas

#### access_control
- `attendeeId` (varchar, 255, required, unique)
- `accessEnabled` (boolean, default: true)
- `validFrom` (varchar, 255, optional)
- `validUntil` (varchar, 255, optional)

#### approval_profiles
- `name` (varchar, 100, required, unique)
- `description` (varchar, 1000, optional)
- `version` (integer, default: 1)
- `rules` (varchar, 16381, required) - JSON string
- `isDeleted` (boolean, default: false)

#### cloudinary
- `eventSettingsId` (varchar, 255, required, unique)
- `version` (integer, default: 1)
- `enabled` (boolean, default: false)
- `cloudName` (varchar, 255, optional)
- `uploadPreset` (varchar, 255, optional)
- `autoOptimize` (boolean, default: true)
- `generateThumbnails` (boolean, default: true)
- `disableSkipCrop` (boolean, default: false)
- `cropAspectRatio` (varchar, 50, optional)

#### switchboard
- `eventSettingsId` (varchar, 255, required, unique)
- `version` (integer, default: 1)
- `enabled` (boolean, default: false)
- `apiEndpoint` (varchar, 500, optional)
- `authHeaderType` (varchar, 50, optional)
- `requestBody` (varchar, 5000, optional)
- `templateId` (varchar, 255, optional)
- `fieldMappings` (varchar, 5000, optional) - JSON string

#### onesimpleapi
- `eventSettingsId` (varchar, 255, required, unique)
- `version` (integer, default: 1)
- `enabled` (boolean, default: false)
- `url` (varchar, 500, optional)
- `formDataKey` (varchar, 255, optional)
- `formDataValue` (varchar, 255, optional)
- `recordTemplate` (varchar, 5000, optional)

## Impact

- **Before:** Running setup script created only 10 tables; 5 tables had to be created manually
- **After:** Running setup script creates all 15 production tables automatically
- **Backward Compatible:** Script handles existing tables gracefully (409 conflict handling)
- **No Breaking Changes:** All table schemas match existing usage patterns
- **Minimal Setup:** Only production tables included (no test/unused tables)

## Testing

The setup script can be tested with:

```bash
npx tsx scripts/setup-appwrite.ts
```

The script will:
1. Create the database if it doesn't exist
2. Create all 15 production tables (skipping any that already exist)
3. Output all required environment variables

## Related Code

- Access control API: `src/pages/api/access-control/[attendeeId].ts`
- Approval profiles API: `src/pages/api/approval-profiles/index.ts`
- Integration management: `src/lib/appwrite-integrations.ts`
- Mobile sync: `src/pages/api/mobile/sync/`

## TablesDB API Compliance

All table creation code follows the TablesDB API standard with:
- Named object parameters (no positional parameters)
- `tableId` instead of `collectionId`
- `rowId` instead of `documentId`
- `xdefault` for default values (not `default`)
