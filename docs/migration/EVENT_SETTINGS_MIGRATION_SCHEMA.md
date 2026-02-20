---
title: "Event Settings Migration Schema"
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 180
related_code: ["scripts/setup-appwrite.ts"]
---

# Event Settings Migration Schema

## Overview

This document defines the **single, canonical schema** for Event Settings migration to Appwrite. Both migration scripts use this exact schema to ensure data consistency.

## ⚠️ SECURITY: Credential Encryption

**CRITICAL:** Sensitive credentials (`cloudinaryApiKey`, `cloudinaryApiSecret`, `switchboardApiKey`) MUST be encrypted before storing in the database. Do NOT store these in plaintext.

**Before JSON.stringify:**
```typescript
// WRONG - Do not do this
const data = {
  cloudinaryApiKey: 'abc123',  // ❌ Plaintext
  cloudinaryApiSecret: 'secret123'  // ❌ Plaintext
};
const json = JSON.stringify(data);  // ❌ Stores plaintext

// CORRECT - Encrypt first
import { encrypt } from '@/lib/encryption';
const data = {
  cloudinaryApiKey: encrypt('abc123'),  // ✅ Encrypted
  cloudinaryApiSecret: encrypt('secret123')  // ✅ Encrypted
};
const json = JSON.stringify(data);  // ✅ Stores encrypted values
```

**Recommended approach:**
1. Store credentials in environment variables only
2. Never persist raw API keys to database
3. Use Appwrite Encryption or similar for any stored credentials
4. Decrypt only when needed for API calls

## Migration Scripts

### 1. `complete-event-settings-migration.ts` (Full Setup)
**Purpose:** Complete migration with attribute creation and data migration  
**Use when:** 
- First-time setup
- Table columns are missing or incomplete
- Need to rebuild the entire Event Settings table

**What it does:**
1. Clears existing Event Settings rows
2. Creates missing columns in the table
3. Migrates all data from Prisma to Appwrite

### 2. `migrate-event-and-log-settings.ts` (Data Only)
**Purpose:** Selective data migration for Event Settings and Log Settings  
**Use when:**
- Columns already exist in the table
- Need to re-migrate data without recreating columns
- Migrating both Event Settings and Log Settings together

**What it does:**
1. Clears existing rows
2. Migrates data (assumes columns exist)
3. Also migrates Log Settings

## Canonical Schema (16 Columns)

Both scripts produce **identical** Event Settings rows with these columns:

### Core Event Information (6 columns)
```typescript
{
  eventName: string,           // Event name
  eventDate: string,           // ISO 8601 date string
  eventTime: string,           // Time string
  eventLocation: string,       // Location description
  timeZone: string,            // Timezone (e.g., "UTC", "America/New_York")
  eventLogo: string            // URL to event logo/banner
}
```

### Barcode Settings (3 columns)
```typescript
{
  barcodeType: string,         // "numerical" or "alphanumerical"
  barcodeLength: number,       // Length of barcode (e.g., 6)
  barcodeUnique: boolean       // Whether barcodes must be unique
}
```

### Switchboard Integration (4 columns)
```typescript
{
  enableSwitchboard: boolean,        // Enable Switchboard printing
  switchboardApiKey: string,         // API key for Switchboard (ENCRYPT before storing)
  switchboardTemplateId: string,     // Template ID for printing
  switchboardFieldMappings: string   // JSON string with field mappings
}
```

**⚠️ SECURITY:** `switchboardApiKey` contains sensitive credentials. Store encrypted in production using Appwrite Encryption or environment variables.

**Switchboard Field Mappings Structure:**
```typescript
// Stored as JSON string
{
  // Original field mappings from Prisma
  ...switchboardFieldMappings,
  // Additional fields
  apiEndpoint: string,
  authHeaderType: string,
  requestBody: string
}
```

### Consolidated JSON Fields (3 columns)

#### 1. `cloudinaryConfig` (JSON string)
```typescript
{
  enabled: boolean,
  cloudName: string,
  apiKey: string,              // ENCRYPT before storing
  apiSecret: string,           // ENCRYPT before storing
  uploadPreset: string,
  autoOptimize: boolean,
  generateThumbnails: boolean,
  disableSkipCrop: boolean,
  cropAspectRatio: string
}
```

**⚠️ SECURITY:** `apiKey` and `apiSecret` are sensitive credentials. Encrypt before storing in production.

#### 2. `oneSimpleApiConfig` (JSON string)
```typescript
{
  enabled: boolean,
  url: string,
  formDataKey: string,
  formDataValue: string,
  recordTemplate: string
}
```

#### 3. `additionalSettings` (JSON string)
```typescript
{
  forceFirstNameUppercase: boolean,
  forceLastNameUppercase: boolean,
  attendeeSortField: string,
  attendeeSortDirection: string,
  bannerImageUrl: string,
  signInBannerUrl: string
}
```

## Data Mapping from Prisma

### Direct Mappings
| Prisma Field | Appwrite Attribute | Notes |
|--------------|-------------------|-------|
| `eventName` | `eventName` | Direct |
| `eventDate` | `eventDate` | Converted to ISO string |
| `eventTime` | `eventTime` | Direct |
| `eventLocation` | `eventLocation` | Direct |
| `timeZone` | `timeZone` | Direct |
| `bannerImageUrl` | `eventLogo` | **Field name change** |
| `barcodeType` | `barcodeType` | Direct |
| `barcodeLength` | `barcodeLength` | Direct |
| `barcodeUnique` | `barcodeUnique` | Direct |
| `switchboardEnabled` | `enableSwitchboard` | **Field name change** |
| `switchboardApiKey` | `switchboardApiKey` | Direct |
| `switchboardTemplateId` | `switchboardTemplateId` | Direct |

### Consolidated Mappings

**Cloudinary fields** → `cloudinaryConfig` (JSON):
- `cloudinaryEnabled` → `enabled`
- `cloudinaryCloudName` → `cloudName`
- `cloudinaryApiKey` → `apiKey`
- `cloudinaryApiSecret` → `apiSecret`
- `cloudinaryUploadPreset` → `uploadPreset`
- `cloudinaryAutoOptimize` → `autoOptimize`
- `cloudinaryGenerateThumbnails` → `generateThumbnails`
- `cloudinaryDisableSkipCrop` → `disableSkipCrop`
- `cloudinaryCropAspectRatio` → `cropAspectRatio`

**OneSimpleAPI fields** → `oneSimpleApiConfig` (JSON):
- `oneSimpleApiEnabled` → `enabled`
- `oneSimpleApiUrl` → `url`
- `oneSimpleApiFormDataKey` → `formDataKey`
- `oneSimpleApiFormDataValue` → `formDataValue`
- `oneSimpleApiRecordTemplate` → `recordTemplate`

**Additional fields** → `additionalSettings` (JSON):
- `forceFirstNameUppercase` → `forceFirstNameUppercase`
- `forceLastNameUppercase` → `forceLastNameUppercase`
- `attendeeSortField` → `attendeeSortField`
- `attendeeSortDirection` → `attendeeSortDirection`
- `bannerImageUrl` → `bannerImageUrl`
- `signInBannerUrl` → `signInBannerUrl`

**Switchboard mappings** → `switchboardFieldMappings` (JSON):
- `switchboardFieldMappings` (object) → spread into JSON
- `switchboardApiEndpoint` → `apiEndpoint`
- `switchboardAuthHeaderType` → `authHeaderType`
- `switchboardRequestBody` → `requestBody`

## Important Notes

### JSON Stringification
All consolidated JSON fields **MUST** be stringified before storing in Appwrite:
```typescript
cloudinaryConfig: JSON.stringify(cloudinaryConfig)
```

### Default Values
- `eventDate`: Falls back to `new Date().toISOString()` if missing
- `barcodeType`: Defaults to `'numerical'`
- `barcodeLength`: Defaults to `6`
- `barcodeUnique`: Defaults to `true`
- `timeZone`: Defaults to `'UTC'`
- Boolean fields: Default to `false`
- String fields: Default to `''` (empty string)

### Field Name Changes
Two fields have different names in Appwrite:
1. `bannerImageUrl` (Prisma) → `eventLogo` (Appwrite)
2. `switchboardEnabled` (Prisma) → `enableSwitchboard` (Appwrite)

## Application Code Updates

When reading Event Settings from Appwrite, parse the JSON fields:

```typescript
const eventSettings = await tablesDB.getRow(
  DATABASE_ID,
  EVENT_SETTINGS_TABLE_ID,
  rowId
);

// Parse JSON fields
const cloudinaryConfig = JSON.parse(eventSettings.cloudinaryConfig);
const oneSimpleApiConfig = JSON.parse(eventSettings.oneSimpleApiConfig);
const additionalSettings = JSON.parse(eventSettings.additionalSettings);
const switchboardFieldMappings = JSON.parse(eventSettings.switchboardFieldMappings);
```

## Verification

After migration, verify the schema:

```bash
# Run complete migration (includes attribute creation)
npx tsx src/scripts/complete-event-settings-migration.ts

# Or run data-only migration (assumes attributes exist)
npx tsx src/scripts/migrate-event-and-log-settings.ts

# Verify setup
npx tsx scripts/verify-appwrite-setup.ts
```

Check in Appwrite Dashboard:
1. Navigate to Event Settings table
2. Verify 16 columns exist
3. Check a row to ensure JSON fields are properly stringified
4. Verify all data migrated correctly

## Schema Consistency

Both migration scripts produce **identical** schemas. The only difference is:
- `complete-event-settings-migration.ts` creates columns if missing
- `migrate-event-and-log-settings.ts` assumes columns already exist

**Always use the same schema** - never modify one script without updating the other.
