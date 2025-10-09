# Event Settings Migration Schema

## Overview

This document defines the **single, canonical schema** for Event Settings migration to Appwrite. Both migration scripts use this exact schema to ensure data consistency.

## Migration Scripts

### 1. `complete-event-settings-migration.ts` (Full Setup)
**Purpose:** Complete migration with attribute creation and data migration  
**Use when:** 
- First-time setup
- Collection attributes are missing or incomplete
- Need to rebuild the entire Event Settings collection

**What it does:**
1. Clears existing Event Settings documents
2. Creates missing attributes in the collection
3. Migrates all data from Prisma to Appwrite

### 2. `migrate-event-and-log-settings.ts` (Data Only)
**Purpose:** Selective data migration for Event Settings and Log Settings  
**Use when:**
- Attributes already exist in the collection
- Need to re-migrate data without recreating attributes
- Migrating both Event Settings and Log Settings together

**What it does:**
1. Clears existing documents
2. Migrates data (assumes attributes exist)
3. Also migrates Log Settings

## Canonical Schema (16 Attributes)

Both scripts produce **identical** Event Settings documents with these attributes:

### Core Event Information (6 attributes)
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

### Barcode Settings (3 attributes)
```typescript
{
  barcodeType: string,         // "numerical" or "alphanumerical"
  barcodeLength: number,       // Length of barcode (e.g., 6)
  barcodeUnique: boolean       // Whether barcodes must be unique
}
```

### Switchboard Integration (4 attributes)
```typescript
{
  enableSwitchboard: boolean,        // Enable Switchboard printing
  switchboardApiKey: string,         // API key for Switchboard
  switchboardTemplateId: string,     // Template ID for printing
  switchboardFieldMappings: string   // JSON string with field mappings
}
```

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

### Consolidated JSON Fields (3 attributes)

#### 1. `cloudinaryConfig` (JSON string)
```typescript
{
  enabled: boolean,
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  uploadPreset: string,
  autoOptimize: boolean,
  generateThumbnails: boolean,
  disableSkipCrop: boolean,
  cropAspectRatio: string
}
```

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
const eventSettings = await databases.getDocument(
  DATABASE_ID,
  EVENT_SETTINGS_COLLECTION_ID,
  documentId
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
1. Navigate to Event Settings collection
2. Verify 16 attributes exist
3. Check a document to ensure JSON fields are properly stringified
4. Verify all data migrated correctly

## Schema Consistency

Both migration scripts produce **identical** schemas. The only difference is:
- `complete-event-settings-migration.ts` creates attributes if missing
- `migrate-event-and-log-settings.ts` assumes attributes already exist

**Always use the same schema** - never modify one script without updating the other.
