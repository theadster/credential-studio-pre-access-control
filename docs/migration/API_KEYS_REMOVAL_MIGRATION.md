---
title: "API Keys Removal Migration"
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 180
related_code: ["scripts/setup-appwrite.ts"]
---

# API Keys Removal Migration

## Overview

This migration removes API key storage from the database and moves them to environment variables for improved security.

**⚠️ ARCHITECTURAL CHANGE:** This migration moves from per-record credentials to global environment variables. This means all events/integrations share the same API credentials. If you need different credentials per event or integration instance, do not proceed with this migration.

## Changes Made

### 1. Database Schema Updates

#### Cloudinary Integration Table
**Removed columns:**
- `apiKey` - Moved to `CLOUDINARY_API_KEY` environment variable
- `apiSecret` - Moved to `CLOUDINARY_API_SECRET` environment variable

**Remaining columns:**
- `$id`, `eventSettingsId`, `version`, `enabled`
- `cloudName`, `uploadPreset`
- `autoOptimize`, `generateThumbnails`, `disableSkipCrop`, `cropAspectRatio`

#### Switchboard Integration Table
**Removed columns:**
- `apiKey` - Moved to `SWITCHBOARD_API_KEY` environment variable

**Remaining columns:**
- `$id`, `eventSettingsId`, `version`, `enabled`
- `apiEndpoint`, `authHeaderType`
- `requestBody`, `templateId`, `fieldMappings`

### 2. TypeScript Interface Updates

Updated interfaces in `src/lib/appwrite-integrations.ts`:

```typescript
export interface CloudinaryIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  cloudName: string;
  // SECURITY: API credentials removed from database schema
  // Use CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET environment variables
  uploadPreset: string;
  autoOptimize: boolean;
  generateThumbnails: boolean;
  disableSkipCrop: boolean;
  cropAspectRatio: string;
}

export interface SwitchboardIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  apiEndpoint: string;
  authHeaderType: string;
  // SECURITY: API key removed from database schema
  // Use SWITCHBOARD_API_KEY environment variable
  requestBody: string;
  templateId: string;
  fieldMappings: string;
}
```

### 3. Environment Variables

Added to `.env.local`:

```bash
# Integration API Credentials
# These credentials are stored securely in environment variables, NOT in the database
# Configure these for each integration you want to use

# Cloudinary Configuration
# Get these from your Cloudinary dashboard at https://cloudinary.com/console
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Switchboard Canvas Configuration
# Get your API key from Switchboard Canvas dashboard
SWITCHBOARD_API_KEY=
```

### 4. API Routes

The API routes in `src/pages/api/event-settings/index.ts` already have security comments indicating that API keys should not be stored in the database:

```typescript
// SECURITY: API credentials are NOT stored in database
// apiKey: updateData.cloudinaryApiKey,
// apiSecret: updateData.cloudinaryApiSecret,

// SECURITY: API key is NOT stored in database
// apiKey: updateData.switchboardApiKey,
```

## Migration Steps

### Step 1: Backup Current API Keys (If Needed)

If you have existing API keys in the database that you need to preserve:

1. Export them from the Appwrite console
2. Or query them via API before running the migration

### Step 2: Add Environment Variables

Add your API credentials to `.env.local`:

```bash
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
SWITCHBOARD_API_KEY=your_switchboard_api_key
```

### Step 3: Run Migration Script

Execute the migration script to remove the API key attributes from the database:

```bash
npm run remove-api-keys
```

Or directly:

```bash
tsx scripts/remove-api-key-attributes.ts
```

### Step 4: Restart Application

Restart your development server to load the new environment variables:

```bash
npm run dev
```

### Step 5: Update Code to Use Environment Variables

When implementing integration features, read API keys from environment variables:

```typescript
// Server-side code only
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;
const switchboardApiKey = process.env.SWITCHBOARD_API_KEY;
```

## Security Benefits

✅ **No credentials in database** - API keys are never stored in the database  
✅ **Server-side only** - Environment variables without `NEXT_PUBLIC_` prefix are only accessible server-side  
✅ **Easy rotation** - Update credentials without database migrations  
✅ **Environment-specific** - Different keys for dev/staging/production  
✅ **Version control safe** - `.env.local` is gitignored  
✅ **Audit trail** - Changes to environment variables are tracked separately  

## Limitations & Alternatives

### Current Limitation
This migration supports **only one set of credentials per integration type** (one Cloudinary account, one Switchboard account). All events share the same credentials.

### If You Need Per-Event Credentials

**Option 1: Keep API Keys in Database (Not Recommended)**
- Skip this migration
- Store API keys in the integration tables
- Implement encryption at rest in Appwrite
- Requires careful access control

**Option 2: Use Appwrite Secrets (Recommended)**
- Store credentials in Appwrite Secrets API instead of environment variables
- Allows per-event credential management
- Better audit trail and rotation capabilities
- Requires code changes to read from Appwrite Secrets

**Option 3: Multi-Tenant Environment Variables**
- Use environment variables with event identifiers (e.g., `CLOUDINARY_API_KEY_EVENT_1`)
- Requires code changes to select correct credentials per event
- More complex but maintains security benefits

## Rollback Plan

If you need to rollback this migration:

1. Re-add the columns to the tables using Appwrite console or API
2. Update the TypeScript interfaces to include the fields
3. Update the API routes to handle the fields
4. Migrate data from environment variables back to database (not recommended)

## Testing

After migration, verify:

1. ✅ Integration settings can be saved without API keys
2. ✅ Integration features work with environment variable credentials
3. ✅ No API key fields appear in API responses
4. ✅ TypeScript compilation succeeds
5. ✅ No runtime errors related to missing fields

## Notes

- The migration script is idempotent - safe to run multiple times
- Existing integration documents will continue to work (just without API key fields)
- The `version` field for optimistic locking is preserved
- All other integration settings remain in the database

## Related Files

- `src/lib/appwrite-integrations.ts` - TypeScript interfaces
- `src/pages/api/event-settings/index.ts` - API route handling
- `scripts/remove-api-key-attributes.ts` - Migration script
- `.env.local` - Environment variables
- `docs/migration/API_KEYS_REMOVAL_MIGRATION.md` - This document
