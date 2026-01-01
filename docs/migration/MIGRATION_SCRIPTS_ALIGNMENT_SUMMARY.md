---
title: "Migration Scripts Alignment Summary"
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 180
related_code: ["scripts/"]
---

# Migration Scripts Alignment Summary

## Issue Resolution

**Problem:** Concern that `migrate-event-and-log-settings.ts` and `complete-event-settings-migration.ts` might have different schemas for Event Settings, potentially causing data inconsistency.

**Resolution:** ✅ **Both scripts already use identical schemas.** No changes were needed to the code.

## Verification Results

### Schema Comparison

Both scripts create Event Settings documents with **exactly 16 attributes**:

| Category | Attributes | Count |
|----------|-----------|-------|
| Core Event Info | `eventName`, `eventDate`, `eventTime`, `eventLocation`, `timeZone`, `eventLogo` | 6 |
| Barcode Settings | `barcodeType`, `barcodeLength`, `barcodeUnique` | 3 |
| Switchboard | `enableSwitchboard`, `switchboardApiKey`, `switchboardTemplateId`, `switchboardFieldMappings` | 4 |
| Consolidated JSON | `cloudinaryConfig`, `oneSimpleApiConfig`, `additionalSettings` | 3 |
| **Total** | | **16** |

### Document Payload Comparison

Both scripts use identical document creation logic:

```typescript
const documentData: any = {
  // Core event info
  eventName: settings.eventName || '',
  eventDate: settings.eventDate ? settings.eventDate.toISOString() : new Date().toISOString(),
  eventTime: settings.eventTime || '',
  eventLocation: settings.eventLocation || '',
  timeZone: settings.timeZone || 'UTC',
  eventLogo: settings.bannerImageUrl || '',

  // Barcode settings
  barcodeType: settings.barcodeType || 'numerical',
  barcodeLength: settings.barcodeLength || 6,
  barcodeUnique: settings.barcodeUnique ?? true,

  // Switchboard settings
  enableSwitchboard: settings.switchboardEnabled ?? false,
  switchboardApiKey: settings.switchboardApiKey || '',
  switchboardTemplateId: settings.switchboardTemplateId || '',
  switchboardFieldMappings: JSON.stringify({...}),

  // Consolidated JSON fields
  cloudinaryConfig: JSON.stringify(cloudinaryConfig),
  oneSimpleApiConfig: JSON.stringify(oneSimpleApiConfig),
  additionalSettings: JSON.stringify(additionalSettings),
};
```

### JSON Consolidation

Both scripts consolidate the same fields into JSON:

**cloudinaryConfig:**
- `cloudinaryEnabled` → `enabled`
- `cloudinaryCloudName` → `cloudName`
- `cloudinaryApiKey` → `apiKey`
- `cloudinaryApiSecret` → `apiSecret`
- `cloudinaryUploadPreset` → `uploadPreset`
- `cloudinaryAutoOptimize` → `autoOptimize`
- `cloudinaryGenerateThumbnails` → `generateThumbnails`
- `cloudinaryDisableSkipCrop` → `disableSkipCrop`
- `cloudinaryCropAspectRatio` → `cropAspectRatio`

**oneSimpleApiConfig:**
- `oneSimpleApiEnabled` → `enabled`
- `oneSimpleApiUrl` → `url`
- `oneSimpleApiFormDataKey` → `formDataKey`
- `oneSimpleApiFormDataValue` → `formDataValue`
- `oneSimpleApiRecordTemplate` → `recordTemplate`

**additionalSettings:**
- `forceFirstNameUppercase`
- `forceLastNameUppercase`
- `attendeeSortField`
- `attendeeSortDirection`
- `bannerImageUrl`
- `signInBannerUrl`

**switchboardFieldMappings:**
- Spreads existing `switchboardFieldMappings` object
- Adds `apiEndpoint`, `authHeaderType`, `requestBody`

## Script Differences

The only difference between the two scripts is their **scope and purpose**:

### `complete-event-settings-migration.ts`
- **Purpose:** Full setup with attribute creation
- **Scope:** Event Settings only
- **Steps:**
  1. Clear existing documents
  2. **Create missing attributes** (if needed)
  3. Wait for Appwrite to process attributes
  4. Migrate data
  5. Verify all 16 attributes exist

**Use when:**
- First-time setup
- Attributes are missing or incomplete
- Need to rebuild the collection structure

### `migrate-event-and-log-settings.ts`
- **Purpose:** Data-only migration
- **Scope:** Event Settings + Log Settings
- **Steps:**
  1. Clear existing documents
  2. Migrate Event Settings data (assumes attributes exist)
  3. Migrate Log Settings data

**Use when:**
- Attributes already exist
- Need to re-migrate data
- Want to migrate both Event Settings and Log Settings together

## Documentation Updates

### Created
1. **`docs/migration/EVENT_SETTINGS_MIGRATION_SCHEMA.md`**
   - Canonical schema definition
   - Complete field mappings
   - Usage guidelines
   - Application code examples

2. **`docs/migration/MIGRATION_SCRIPTS_ALIGNMENT_SUMMARY.md`** (this file)
   - Verification results
   - Script comparison
   - Resolution summary

### Updated
1. **`src/scripts/migrate-event-and-log-settings.ts`**
   - Added comprehensive header comment
   - Documents the 16-attribute schema
   - Notes that attributes must exist
   - References the complete migration script

2. **`docs/README.md`**
   - Added link to Event Settings Migration Schema

## Recommendations

### For Developers

1. **First-time setup:**
   ```bash
   npx tsx src/scripts/complete-event-settings-migration.ts
   ```

2. **Re-migrating data:**
   ```bash
   npx tsx src/scripts/migrate-event-and-log-settings.ts
   ```

3. **Verify setup:**
   ```bash
   npx tsx scripts/verify-appwrite-setup.ts
   ```

### For Maintenance

1. **Never modify one script without the other** - Both must maintain identical schemas
2. **Always test both scripts** after schema changes
3. **Update documentation** when adding/removing fields
4. **Reference the canonical schema** in `EVENT_SETTINGS_MIGRATION_SCHEMA.md`

## Testing Verification

To verify both scripts produce identical results:

```bash
# Test 1: Run complete migration
npx tsx src/scripts/complete-event-settings-migration.ts

# Export data from Appwrite
# (manually via dashboard or API)

# Test 2: Clear and run selective migration
npx tsx src/scripts/migrate-event-and-log-settings.ts

# Compare exported data - should be identical
```

## Conclusion

✅ **No code changes were required**  
✅ **Both scripts already use identical schemas**  
✅ **Documentation created to prevent future drift**  
✅ **Clear guidelines for when to use each script**

The migration scripts are properly aligned and will produce consistent data. The new documentation ensures this alignment is maintained going forward.

---

**Date:** 2025-10-07  
**Status:** ✅ Resolved - No schema conflicts found  
**Action:** Documentation added to maintain alignment
