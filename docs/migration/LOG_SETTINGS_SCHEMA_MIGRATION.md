---
title: "Log Settings Table Schema Migration"
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 180
related_code: ["scripts/setup-appwrite.ts"]
---

# Log Settings Table Schema Migration

## Date
January 9, 2025

## Problem
The Log Settings page was showing "0 enabled" for all categories because the Appwrite table schema was incomplete and outdated.

## Root Cause Analysis

### Original Schema (Outdated)
The `scripts/setup-appwrite.ts` file created only 6 columns with old naming:
```
logUserLogin
logUserLogout
logAttendeeCreate
logAttendeeUpdate
logAttendeeDelete
logCredentialGenerate
```

### Required Schema (Current)
The API and frontend expect 32 columns with new naming convention:
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
**Total: 32 attributes**

### Impact
- Existing log settings row had old field names
- All new fields appeared as `null` or `undefined`
- Frontend couldn't read any settings
- UI showed "0 enabled" for all categories

## Solution

### Step 1: Create Migration Script
Created `scripts/fix-log-settings-table.ts` to:
- Check existing columns in the table
- Identify missing columns
- Add all 32 missing boolean columns
- Set default value to `true` (enabled)

### Step 2: Create Cleanup Script
Created `scripts/reset-log-settings-row.ts` to:
- Delete old rows with incorrect schema
- Allow API to create fresh row with correct fields

### Step 3: Execute Migration
```bash
# Add missing columns to table
npx tsx scripts/fix-log-settings-table.ts

# Delete old rows
npx tsx scripts/reset-log-settings-row.ts
```

## Migration Results

### Columns Added (32 total)
✅ All 32 missing boolean columns successfully added to table

### Rows Reset
✅ 1 old row deleted
✅ API will auto-create new row with default values on first access

## Verification Steps

1. Open Log Settings dialog in the application
2. Verify all categories show correct enabled counts
3. Toggle some settings and save
4. Refresh and verify changes persisted

## Files Created

1. **scripts/fix-log-settings-table.ts**
   - Adds missing boolean columns to log_settings table
   - Checks for existing columns to avoid duplicates
   - Includes rate limiting to avoid API throttling

2. **scripts/reset-log-settings-row.ts**
   - Deletes all existing log settings rows
   - Allows clean slate for new schema

## Future Considerations

### Update Setup Script
The `scripts/setup-appwrite.ts` file should be updated to include all 33 log settings attributes with correct naming. Current version will cause issues on fresh database setup.

### Recommended Changes to setup-appwrite.ts
Replace the `createLogSettingsCollection` function with:

```typescript
async function createLogSettingsCollection(databaseId: string) {
  try {
    console.log('\nCreating log_settings table...');
    await databases.createCollection(
      databaseId,
      TABLES.LOG_SETTINGS,
      'Log Settings',
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    // Add all 32 boolean attributes
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
      try {
        await databases.createBooleanAttribute(
          databaseId, 
          TABLES.LOG_SETTINGS, 
          attr, 
          false, // required
          true   // default value
        );
      } catch (error: any) {
        if (error.code === 409) {
          // Attribute already exists, skip it
          continue;
        }
        throw error;
      }
    }

    console.log('✓ Log settings table created with all columns');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Log settings table already exists');
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
4. **Verification**: Always verify table schema matches code expectations
5. **Documentation**: Document schema changes and migration steps
