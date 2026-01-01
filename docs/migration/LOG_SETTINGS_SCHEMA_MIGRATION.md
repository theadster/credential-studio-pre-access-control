---
title: "Log Settings Collection Schema Migration"
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 180
related_code: ["scripts/setup-appwrite.ts"]
---

# Log Settings Collection Schema Migration

## Date
January 9, 2025

## Problem
The Log Settings page was showing "0 enabled" for all categories because the Appwrite collection schema was incomplete and outdated.

## Root Cause Analysis

### Original Schema (Outdated)
The `scripts/setup-appwrite.ts` file created only 6 attributes with old naming:
```
logUserLogin
logUserLogout
logAttendeeCreate
logAttendeeUpdate
logAttendeeDelete
logCredentialGenerate
```

### Required Schema (Current)
The API and frontend expect 33 attributes with new naming convention:
```
attendeeCreate, attendeeUpdate, attendeeDelete, attendeeView,
attendeeBulkDelete, attendeeImport, attendeeExport,
credentialGenerate, credentialClear,
userCreate, userUpdate, userDelete, userView, userInvite,
roleCreate, roleUpdate, roleDelete, roleView,
eventSettingsUpdate,
customFieldCreate, customFieldUpdate, customFieldDelete, customFieldReorder,
authLogin, authLogout,
logsDelete, logsExport, logsView,
systemViewEventSettings, systemViewAttendeeList, systemViewRolesList, systemViewUsersList
```

### Impact
- Existing log settings document had old field names
- All new fields appeared as `null` or `undefined`
- Frontend couldn't read any settings
- UI showed "0 enabled" for all categories

## Solution

### Step 1: Create Migration Script
Created `scripts/fix-log-settings-collection.ts` to:
- Check existing attributes in the collection
- Identify missing attributes
- Add all 32 missing boolean attributes
- Set default value to `true` (enabled)

### Step 2: Create Cleanup Script
Created `scripts/reset-log-settings-document.ts` to:
- Delete old documents with incorrect schema
- Allow API to create fresh document with correct fields

### Step 3: Execute Migration
```bash
# Add missing attributes to collection
npx tsx scripts/fix-log-settings-collection.ts

# Delete old documents
npx tsx scripts/reset-log-settings-document.ts
```

## Migration Results

### Attributes Added (32 total)
✅ All 32 missing boolean attributes successfully added to collection

### Documents Reset
✅ 1 old document deleted
✅ API will auto-create new document with default values on first access

## Verification Steps

1. Open Log Settings dialog in the application
2. Verify all categories show correct enabled counts
3. Toggle some settings and save
4. Refresh and verify changes persisted

## Files Created

1. **scripts/fix-log-settings-collection.ts**
   - Adds missing boolean attributes to log_settings collection
   - Checks for existing attributes to avoid duplicates
   - Includes rate limiting to avoid API throttling

2. **scripts/reset-log-settings-document.ts**
   - Deletes all existing log settings documents
   - Allows clean slate for new schema

## Future Considerations

### Update Setup Script
The `scripts/setup-appwrite.ts` file should be updated to include all 33 log settings attributes with correct naming. Current version will cause issues on fresh database setup.

### Recommended Changes to setup-appwrite.ts
Replace the `createLogSettingsCollection` function with:

```typescript
async function createLogSettingsCollection(databaseId: string) {
  try {
    console.log('\nCreating log_settings collection...');
    await databases.createCollection(
      databaseId,
      COLLECTIONS.LOG_SETTINGS,
      'Log Settings',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    // Add all 33 boolean attributes
    const attributes = [
      'attendeeCreate', 'attendeeUpdate', 'attendeeDelete', 'attendeeView',
      'attendeeBulkDelete', 'attendeeImport', 'attendeeExport',
      'credentialGenerate', 'credentialClear',
      'userCreate', 'userUpdate', 'userDelete', 'userView', 'userInvite',
      'roleCreate', 'roleUpdate', 'roleDelete', 'roleView',
      'eventSettingsUpdate',
      'customFieldCreate', 'customFieldUpdate', 'customFieldDelete', 'customFieldReorder',
      'authLogin', 'authLogout',
      'logsDelete', 'logsExport', 'logsView',
      'systemViewEventSettings', 'systemViewAttendeeList', 
      'systemViewRolesList', 'systemViewUsersList'
    ];

    for (const attr of attributes) {
      await databases.createBooleanAttribute(
        databaseId, 
        COLLECTIONS.LOG_SETTINGS, 
        attr, 
        false, // required
        true   // default value
      );
    }

    console.log('✓ Log settings collection created with all attributes');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Log settings collection already exists');
    } else {
      throw error;
    }
  }
}
```

## Related Documentation
- [Custom Field and Log Settings Fix](../fixes/CUSTOM_FIELD_AND_LOG_SETTINGS_FIX.md)
- [Appwrite Configuration](./APPWRITE_CONFIGURATION.md)

## Lessons Learned

1. **Schema Evolution**: When adding new features, ensure setup scripts are updated
2. **Migration Scripts**: Keep migration scripts for schema changes
3. **Default Values**: Use sensible defaults (true for most log settings)
4. **Verification**: Always verify collection schema matches code expectations
5. **Documentation**: Document schema changes and migration steps
