# Integration Collections Migration Guide

## Overview

The Event Settings have been normalized into separate collections to work within Appwrite's attribute limits. Integration settings (Cloudinary, Switchboard, OneSimpleAPI) are now stored in their own collections.

## Database Structure

### Before (Supabase/Prisma)
- **event_settings**: 38 fields in one table

### After (Appwrite)
- **event_settings**: 14 core fields
- **cloudinary_integrations**: 10 Cloudinary-specific fields
- **switchboard_integrations**: 8 Switchboard-specific fields  
- **onesimpleapi_integrations**: 6 OneSimpleAPI-specific fields

## Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID=cloudinary_integrations
NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID=switchboard_integrations
NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID=onesimpleapi_integrations
```

## Helper Library

A new helper library has been created at `src/lib/appwrite-integrations.ts` with the following functions:

### Fetching Data

```typescript
import { 
  getEventSettingsWithIntegrations,
  getCloudinaryIntegration,
  getSwitchboardIntegration,
  getOneSimpleApiIntegration 
} from '@/lib/appwrite-integrations';

// Get event settings with all integrations
const settings = await getEventSettingsWithIntegrations(databases, eventSettingsId);

// Access integration data
if (settings.cloudinary?.enabled) {
  console.log('Cloudinary is enabled');
}

if (settings.switchboard?.enabled) {
  console.log('Switchboard is enabled');
}
```

### Updating Integrations

```typescript
import { 
  updateCloudinaryIntegration,
  updateSwitchboardIntegration,
  updateOneSimpleApiIntegration 
} from '@/lib/appwrite-integrations';

// Update Cloudinary settings
await updateCloudinaryIntegration(databases, eventSettingsId, {
  enabled: true,
  cloudName: 'my-cloud',
  apiKey: 'my-key',
});

// Update Switchboard settings
await updateSwitchboardIntegration(databases, eventSettingsId, {
  enabled: true,
  apiEndpoint: 'https://api.switchboard.com',
  templateId: 'template-123',
});
```

### Legacy Compatibility

For code that expects all fields in one object (legacy format), use the `flattenEventSettings` helper:

```typescript
import { getEventSettingsWithIntegrations, flattenEventSettings } from '@/lib/appwrite-integrations';

const settings = await getEventSettingsWithIntegrations(databases, eventSettingsId);
const flatSettings = flattenEventSettings(settings);

// Now you can access fields like before
console.log(flatSettings.cloudinaryEnabled);
console.log(flatSettings.switchboardApiKey);
```

## Migration Checklist

### Files Updated

- ✅ `src/lib/appwrite-integrations.ts` - New helper library created
- ✅ `src/lib/customFieldValidation.ts` - Updated to work with new structure
- ✅ `.env.local` - Added integration collection IDs

### Files That Need Updating

The following files reference event settings and may need updates:

1. **API Routes** - Any route that reads/writes event settings
   - Check `src/pages/api/**/*.ts` files
   - Use `getEventSettingsWithIntegrations()` instead of direct queries
   - Use update helpers for integration settings

2. **Components** - Any component that displays/edits event settings
   - Update to use the new structure
   - Access integrations via `settings.cloudinary`, `settings.switchboard`, etc.

3. **Forms** - Event settings forms
   - Split into separate forms for each integration
   - Or use the helper functions to update each integration separately

## Code Migration Examples

### Example 1: Reading Event Settings

**Before:**
```typescript
const eventSettings = await databases.getDocument(dbId, eventSettingsCollectionId, id);
console.log(eventSettings.cloudinaryEnabled);
```

**After:**
```typescript
import { getEventSettingsWithIntegrations } from '@/lib/appwrite-integrations';

const eventSettings = await getEventSettingsWithIntegrations(databases, id);
console.log(eventSettings.cloudinary?.enabled);
```

### Example 2: Updating Cloudinary Settings

**Before:**
```typescript
await databases.updateDocument(dbId, eventSettingsCollectionId, id, {
  cloudinaryEnabled: true,
  cloudinaryCloudName: 'my-cloud',
  cloudinaryApiKey: 'key',
});
```

**After:**
```typescript
import { updateCloudinaryIntegration } from '@/lib/appwrite-integrations';

await updateCloudinaryIntegration(databases, id, {
  enabled: true,
  cloudName: 'my-cloud',
  apiKey: 'key',
});
```

### Example 3: Checking if Integration is Enabled

**Before:**
```typescript
if (eventSettings.switchboardEnabled) {
  // Do something
}
```

**After:**
```typescript
if (eventSettings.switchboard?.enabled) {
  // Do something
}
```

### Example 4: Using Legacy Code (Temporary)

If you have a lot of code that expects the old format, use the flatten helper:

```typescript
import { getEventSettingsWithIntegrations, flattenEventSettings } from '@/lib/appwrite-integrations';

const settings = await getEventSettingsWithIntegrations(databases, id);
const legacyFormat = flattenEventSettings(settings);

// Now works with old code
if (legacyFormat.cloudinaryEnabled) {
  console.log(legacyFormat.cloudinaryCloudName);
}
```

## Benefits of New Structure

✅ **Stays within Appwrite limits** - Each collection has < 27 attributes
✅ **Better organization** - Related settings grouped together
✅ **Easier to maintain** - Integration logic is isolated
✅ **Scalable** - Easy to add new integrations
✅ **Performance** - Only fetch integrations when needed

## Rollback Plan

If you need to rollback:

1. Keep Supabase active
2. Revert to Supabase-based code
3. Update environment variables back to Supabase
4. Clear Appwrite collections

## Testing Checklist

After updating your code:

- [ ] Test reading event settings
- [ ] Test updating core event settings
- [ ] Test Cloudinary integration (if enabled)
- [ ] Test Switchboard integration (if enabled)
- [ ] Test OneSimpleAPI integration (if enabled)
- [ ] Test custom field validation with integrations
- [ ] Test event settings forms
- [ ] Test credential generation with integrations

## Support

For questions or issues with the migration, refer to:
- This guide
- `src/lib/appwrite-integrations.ts` - Helper library with TypeScript types
- `src/scripts/migrate-with-integration-collections.ts` - Migration script

## Next Steps

1. Review files that use event settings
2. Update API routes to use helper functions
3. Update components to use new structure
4. Test all integration features
5. Remove legacy compatibility code once fully migrated
