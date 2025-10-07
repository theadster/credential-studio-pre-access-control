# Event Settings Migration Status

## ✅ Completed

### Infrastructure
- [x] Created 4 Appwrite collections (event_settings, cloudinary_integrations, switchboard_integrations, onesimpleapi_integrations)
- [x] Migrated all data from Supabase to Appwrite
- [x] Added environment variables to `.env.local`
- [x] Created helper library (`src/lib/appwrite-integrations.ts`)
- [x] Updated custom field validation (`src/lib/customFieldValidation.ts`)
- [x] Created migration documentation

### Migration Script
- [x] `src/scripts/migrate-with-integration-collections.ts` - Successfully migrated 1 event setting + 3 integrations

## 📋 Files Requiring Updates

### High Priority - Integration-Specific Files

1. **`src/pages/api/switchboard/test.ts`**
   - ✅ Updated to use Appwrite
   - ✅ Fetches switchboard integration from separate collection
   - Status: ✅ Complete

2. **`src/pages/api/attendees/bulk-export-pdf.ts`**
   - ✅ Updated to use Appwrite
   - ✅ Fetches oneSimpleApi integration from separate collection
   - Status: ✅ Complete

### Medium Priority - Event Settings Management

3. **`src/pages/api/custom-fields/index.ts`**
   - References eventSettingsId (OK - this is just a foreign key)
   - No changes needed for integration logic
   - Status: ✅ OK

4. **`src/pages/api/log-settings/index.ts`**
   - References eventSettingsUpdate permission
   - No integration logic
   - Status: ✅ OK

### Components & Pages

5. **Event Settings Forms/Components**
   - Need to find and update any forms that edit integration settings
   - Should use helper functions to update separate collections
   - Status: ⏳ Needs investigation

## 🔧 Update Strategy

### For API Routes

**Pattern to follow:**

```typescript
// OLD (Prisma)
const eventSettings = await prisma.eventSettings.findFirst();
if (eventSettings.switchboardEnabled) {
  // use eventSettings.switchboardApiKey, etc.
}

// NEW (Appwrite with helper)
import { getEventSettingsWithIntegrations } from '@/lib/appwrite-integrations';

const settings = await getEventSettingsWithIntegrations(databases, eventSettingsId);
if (settings.switchboard?.enabled) {
  // use settings.switchboard.apiKey, etc.
}
```

### For Components

**Pattern to follow:**

```typescript
// OLD
<input value={eventSettings.cloudinaryCloudName} />

// NEW
<input value={eventSettings.cloudinary?.cloudName || ''} />
```

## 📝 Next Steps

1. Update `src/pages/api/switchboard/test.ts` to use Appwrite
2. Update `src/pages/api/attendees/bulk-export-pdf.ts` to use Appwrite
3. Search for components that edit integration settings
4. Update forms to use helper functions
5. Test all integration features
6. Remove Prisma dependencies once fully migrated

## 🎯 Current Focus

**Immediate action:** Update the two high-priority API routes that directly use integration settings.
