---
title: Mobile Scan Logs Result Field Error
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/pages/api/mobile/scan-logs.ts
  - src/types/scanLog.ts
  - scripts/setup-appwrite.ts
---

# Mobile Scan Logs Result Field Error

## Problem

The iOS mobile app is receiving an error when uploading scan logs:

```
Error: DB Insert Error: Invalid document structure: Unknown attribute: "result"
```

The error occurs even though:
- The `result` column exists in the database (verified via schema check)
- The backend API endpoint includes the `result` field in the data object
- The TypeScript types define `result` as a required field

## Root Cause Analysis

The error "Unknown attribute: result" from Appwrite indicates one of these issues:

### 1. Backend Server Using Old Appwrite API (Most Likely)
The mobile app is configured to use `https://mobile-test.credential.studio/api` as its backend. This backend server may be:
- Running an older version of the code that uses the old Appwrite Databases API (`databases.createDocument`)
- Not using the TablesDB API with named parameters
- Pointing to a different Appwrite project or database with a different schema

### 2. Backend Database Schema Mismatch
The backend server might be:
- Connected to a different Appwrite project
- Using a different database ID
- Using a different table ID for scan_logs
- Having a scan_logs table without the `result` column

### 3. Appwrite SDK Version Mismatch
The backend might be using an older version of the Appwrite SDK that doesn't support TablesDB.

## Verification Steps

### Step 1: Verify Local Database Schema
✅ **CONFIRMED** - The local database has the `result` column:
```
Columns in scan_logs table:
  - attendeeId (string, required: false)
  - barcodeScanned (string, required: true)
  - result (string, required: true)  ← EXISTS
  - denialReason (string, required: false)
  - profileId (string, required: false)
  - profileVersion (integer, required: false)
  - deviceId (string, required: true)
  - operatorId (string, required: true)
  - scannedAt (datetime, required: true)
  - uploadedAt (datetime, required: false)
  - localId (string, required: true)
  - attendeeFirstName (varchar, required: false)
  - attendeeLastName (varchar, required: false)
  - attendeePhotoUrl (varchar, required: false)
```

### Step 2: Verify Backend Code
The main app's scan logs endpoint (`src/pages/api/mobile/scan-logs.ts`) is correct:
- Uses TablesDB API with named parameters ✓
- Includes `result` field in data object ✓
- Uses proper error handling ✓

### Step 3: Check Backend Deployment
The issue is likely that the deployed backend at `https://mobile-test.credential.studio/api` is:
- Running an older version of the code
- Using a different Appwrite project
- Using the old Databases API

## Solution

### For Development/Testing
If testing locally, ensure the mobile app is configured to use the local backend:
```
endpoint: "http://localhost:3000/api"  (or your local dev server)
```

### For Production Backend
The backend server at `https://mobile-test.credential.studio/api` needs to be:

1. **Updated to latest code** - Deploy the latest version that uses TablesDB API
2. **Verify Appwrite configuration** - Ensure it's using the correct:
   - Appwrite endpoint
   - Project ID
   - Database ID
   - Table IDs
3. **Verify Appwrite SDK version** - Ensure it's using `appwrite@^22.4.0` or later
4. **Run setup script** - Execute the setup script on the backend's Appwrite instance:
   ```bash
   npx tsx scripts/setup-appwrite.ts
   ```

### Code Verification
The backend code is already correct. The issue is deployment/configuration:

**Backend Scan Logs Endpoint** (`src/pages/api/mobile/scan-logs.ts`):
- ✓ Uses `tablesDB.createRow()` with named parameters
- ✓ Includes `result: log.result` in data object
- ✓ Validates `result` field via Zod schema
- ✓ Handles errors properly

**Type Definitions** (`src/types/scanLog.ts`):
- ✓ Defines `result: ScanResult` as required field
- ✓ Validates `result` enum: `['approved', 'denied']`
- ✓ Enforces denial reason for denied scans

**Database Schema** (`scripts/setup-appwrite.ts`):
- ✓ Creates `result` column as varchar(50), required
- ✓ Creates index on `result` column for queries
- ✓ Handles existing tables gracefully

## Testing

### Local Testing
1. Ensure mobile app is configured to use local backend
2. Run setup script: `npx tsx scripts/setup-appwrite.ts`
3. Test scan log upload from mobile app
4. Verify logs appear in Appwrite console

### Production Testing
1. Verify backend deployment has latest code
2. Verify backend Appwrite configuration matches local
3. Run setup script on backend's Appwrite instance
4. Test scan log upload from mobile app
5. Monitor backend logs for errors

## Related Issues

- **Setup Script Missing Tables**: Fixed in SETUP_SCRIPT_MISSING_TABLES_FIX.md
- **Appwrite TablesDB API**: See appwrite-tablesdb-api.md for API standards
- **Mobile API Integration**: See .kiro/specs/mobile-access-control/design.md

## Next Steps

1. Identify which Appwrite project the backend is using
2. Verify the backend has the latest code deployed
3. Run the setup script on the backend's Appwrite instance
4. Test mobile app scan log upload
5. Monitor backend logs for any remaining errors

