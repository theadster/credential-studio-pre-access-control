# Event Settings Migration - Complete Fields Fix

## Issue
The `migrate-event-and-log-settings.ts` script (lines 113-122) only mapped 8 event settings fields, missing many required fields that consumers expect:
- Missing core fields: `eventDate`, `eventTime`, `eventLocation`, `timeZone`
- Missing barcode field: `barcodeUnique`
- Missing integration settings: Cloudinary, OneSimpleAPI, and additional settings
- This would break consumers expecting a complete settings object

## Root Cause
The migration was created as a "selective" migration focusing only on the basic Switchboard-related fields, but didn't include all the fields that the application requires for proper operation.

## Solution
Extended the migration logic to include ALL required fields with proper defaults and JSON stringification:

### Added Core Event Fields
```typescript
eventName: settings.eventName || '',
eventDate: settings.eventDate ? settings.eventDate.toISOString() : new Date().toISOString(),
eventTime: settings.eventTime || '',
eventLocation: settings.eventLocation || '',
timeZone: settings.timeZone || 'UTC',
eventLogo: settings.bannerImageUrl || '',
```

### Added Complete Barcode Settings
```typescript
barcodeType: settings.barcodeType || 'numerical',
barcodeLength: settings.barcodeLength || 6,
barcodeUnique: settings.barcodeUnique ?? true,
```

### Added Switchboard Settings with Extended Mappings
```typescript
enableSwitchboard: settings.switchboardEnabled ?? false,
switchboardApiKey: settings.switchboardApiKey || '',
switchboardTemplateId: settings.switchboardTemplateId || '',
switchboardFieldMappings: JSON.stringify({
  ...(typeof settings.switchboardFieldMappings === 'object' && settings.switchboardFieldMappings !== null
    ? settings.switchboardFieldMappings
    : {}),
  apiEndpoint: settings.switchboardApiEndpoint || '',
  authHeaderType: settings.switchboardAuthHeaderType || 'Bearer',
  requestBody: settings.switchboardRequestBody || '',
}),
```

### Added Consolidated JSON Fields
Properly consolidated and stringified nested configuration objects:

1. **Cloudinary Configuration**
   ```typescript
   cloudinaryConfig: JSON.stringify({
     enabled: settings.cloudinaryEnabled ?? false,
     cloudName: settings.cloudinaryCloudName || '',
     apiKey: settings.cloudinaryApiKey || '',
     apiSecret: settings.cloudinaryApiSecret || '',
     uploadPreset: settings.cloudinaryUploadPreset || '',
     autoOptimize: settings.cloudinaryAutoOptimize ?? false,
     generateThumbnails: settings.cloudinaryGenerateThumbnails ?? false,
     disableSkipCrop: settings.cloudinaryDisableSkipCrop ?? false,
     cropAspectRatio: settings.cloudinaryCropAspectRatio || '1',
   })
   ```

2. **OneSimpleAPI Configuration**
   ```typescript
   oneSimpleApiConfig: JSON.stringify({
     enabled: settings.oneSimpleApiEnabled ?? false,
     url: settings.oneSimpleApiUrl || '',
     formDataKey: settings.oneSimpleApiFormDataKey || '',
     formDataValue: settings.oneSimpleApiFormDataValue || '',
     recordTemplate: settings.oneSimpleApiRecordTemplate || '',
   })
   ```

3. **Additional Settings**
   ```typescript
   additionalSettings: JSON.stringify({
     forceFirstNameUppercase: settings.forceFirstNameUppercase ?? false,
     forceLastNameUppercase: settings.forceLastNameUppercase ?? false,
     attendeeSortField: settings.attendeeSortField || 'lastName',
     attendeeSortDirection: settings.attendeeSortDirection || 'asc',
     bannerImageUrl: settings.bannerImageUrl || '',
     signInBannerUrl: settings.signInBannerUrl || '',
   })
   ```

## Key Improvements

### 1. Complete Field Coverage
Now migrates all 16 required attributes:
- 6 core event fields
- 3 barcode fields
- 4 Switchboard fields
- 3 consolidated JSON fields

### 2. Proper Data Type Handling
- Dates converted to ISO strings
- Nested objects properly JSON.stringified
- Boolean values with proper defaults using nullish coalescing (`??`)
- String values with fallbacks using logical OR (`||`)

### 3. Sensible Defaults
- `eventDate`: Falls back to current date if missing
- `timeZone`: Defaults to 'UTC'
- `barcodeType`: Defaults to 'numerical'
- `barcodeLength`: Defaults to 6
- `barcodeUnique`: Defaults to true
- All boolean flags default to false
- All string fields default to empty string

### 4. Validation & Normalization
- Type checking for `switchboardFieldMappings` before spreading
- Proper handling of null/undefined values
- Consistent data shape matching application expectations

## Files Modified
- `src/scripts/migrate-event-and-log-settings.ts` (lines 105-205)

## Testing Recommendations
1. Run migration on test data to verify all fields are populated
2. Verify JSON fields can be parsed correctly by consumers
3. Check that default values match application expectations
4. Ensure migrated records work with existing event settings UI
5. Validate Switchboard integration still works with extended field mappings

## Related Files
- `src/scripts/complete-event-settings-migration.ts` - Reference implementation
- `src/pages/api/event-settings/index.ts` - Consumer of event settings
- `src/lib/appwrite.ts` - Appwrite client configuration

## Impact
- ✅ Migration now produces complete, application-ready event settings
- ✅ All consumers will receive expected field structure
- ✅ No breaking changes for existing functionality
- ✅ Proper defaults prevent null/undefined errors
- ✅ JSON stringification ensures Appwrite compatibility
