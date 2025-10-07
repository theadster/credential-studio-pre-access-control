# Integration Architecture Fix

## Issue

When trying to generate credentials, the error "Switchboard Canvas integration is not enabled" appeared because the code was looking for integration settings in the wrong place.

## Root Cause

The application uses a **normalized database design** with separate collections for each integration type:

1. **event_settings** - Core event configuration
2. **switchboard_integrations** - Switchboard Canvas settings
3. **cloudinary_integrations** - Cloudinary settings  
4. **onesimpleapi_integrations** - OneSimpleAPI settings

The credential generation code was incorrectly trying to read Switchboard settings from the `event_settings` collection instead of the `switchboard_integrations` collection.

## Database Architecture

### Event Settings Collection
Contains core event configuration:
- Event name, date, time, location
- Barcode settings
- Display preferences
- **Does NOT contain integration settings**

### Integration Collections
Each integration has its own collection linked to event settings via `eventSettingsId`:

**Switchboard Integration**:
```typescript
{
  $id: string;
  eventSettingsId: string;  // Links to event_settings
  version: number;           // For optimistic locking
  enabled: boolean;
  apiEndpoint: string;
  authHeaderType: string;
  apiKey: string;
  requestBody: string;       // JSON template
  templateId: string;
  fieldMappings: string;     // JSON array
}
```

**Cloudinary Integration**:
```typescript
{
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset: string;
  autoOptimize: boolean;
  generateThumbnails: boolean;
  disableSkipCrop: boolean;
  cropAspectRatio: string;
}
```

**OneSimpleAPI Integration**:
```typescript
{
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  url: string;
  formDataKey: string;
  formDataValue: string;
  recordTemplate: string;
}
```

## Solution Implemented

### Files Modified

**src/pages/api/attendees/[id]/generate-credential.ts**:
1. Added import for `getSwitchboardIntegration` helper
2. Fetch Switchboard integration from separate collection
3. Updated all references from `eventSettings.switchboard*` to `switchboardIntegration.*`
4. Parse `fieldMappings` from JSON string

### Key Changes

**Before**:
```typescript
// ❌ Wrong - looking in event_settings
if (!eventSettings.switchboardEnabled) {
  return res.status(400).json({ error: 'Not enabled' });
}
```

**After**:
```typescript
// ✅ Correct - fetch from switchboard_integrations collection
const switchboardIntegration = await getSwitchboardIntegration(
  databases, 
  eventSettings.$id
);

if (!switchboardIntegration || !switchboardIntegration.enabled) {
  return res.status(400).json({ error: 'Not enabled' });
}
```

## Benefits of This Architecture

### 1. Separation of Concerns
- Core event settings separate from integration configs
- Each integration can be managed independently
- Easier to add new integrations

### 2. Optimistic Locking
- Each integration has a `version` field
- Prevents concurrent modification conflicts
- Ensures data consistency

### 3. Flexibility
- Enable/disable integrations independently
- Different events can have different integration configs
- Easy to add integration-specific fields

### 4. Performance
- Only fetch integrations when needed
- Smaller document sizes
- Better query performance

## Environment Variables Required

Make sure these are set in your `.env.local`:

```env
# Integration Collection IDs
NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID=switchboard_integrations
NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID=cloudinary_integrations
NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID=onesimpleapi_integrations
```

## Helper Functions Available

The `src/lib/appwrite-integrations.ts` module provides helper functions:

```typescript
// Get integration for an event
const switchboard = await getSwitchboardIntegration(databases, eventSettingsId);
const cloudinary = await getCloudinaryIntegration(databases, eventSettingsId);
const oneSimpleApi = await getOneSimpleApiIntegration(databases, eventSettingsId);

// Update integration with optimistic locking
await updateSwitchboardIntegration(databases, integrationId, updates, currentVersion);
await updateCloudinaryIntegration(databases, integrationId, updates, currentVersion);
await updateOneSimpleApiIntegration(databases, integrationId, updates, currentVersion);
```

## Next Steps

To configure Switchboard Canvas integration:

1. Go to Event Settings in the application
2. Navigate to the Integrations tab
3. Enable Switchboard Canvas
4. Configure:
   - API Endpoint
   - API Key
   - Auth Header Type
   - Template ID
   - Request Body Template
   - Field Mappings

Once configured, credential generation will work correctly.

## Similar Issues

If you encounter similar errors with Cloudinary or OneSimpleAPI integrations, the same pattern applies:
- Fetch the integration from its dedicated collection
- Check the `enabled` flag
- Use the integration-specific fields

All integration-related code should use the helper functions from `src/lib/appwrite-integrations.ts` to ensure consistency.
