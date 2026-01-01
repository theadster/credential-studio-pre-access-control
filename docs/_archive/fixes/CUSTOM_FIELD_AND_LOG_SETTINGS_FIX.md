# Custom Field Values and Log Settings Fix

## Date
January 9, 2025

## Issues Fixed

### 1. Attendee Update Logging All Fields as Changed
**Problem:** When updating an attendee record (e.g., changing just the last name), the activity log showed ALL custom fields as changed from "empty" to their current values, even though they weren't modified.

**Root Cause:** The `customFieldValues` in the database are stored as a JSON array string:
```json
"[{\"customFieldId\":\"field1\",\"value\":\"MEDIA\"},{\"customFieldId\":\"field2\",\"value\":\"COMPANY\"}]"
```

However, the code was trying to use it directly as an object without:
1. Parsing the JSON string
2. Converting the array format to an object format for comparison

This caused all comparisons to fail, making every field appear as "changed from empty".

**Solution:** Modified `src/pages/api/attendees/[id].ts` to:
1. Parse the JSON string properly
2. Convert the array format `[{customFieldId, value}]` to object format `{customFieldId: value}`
3. Add error handling for malformed JSON

```typescript
// Parse existing custom field values (stored as JSON array)
let currentCustomFieldValues: Record<string, any> = {};
try {
  if (existingAttendee.customFieldValues) {
    const parsed = typeof existingAttendee.customFieldValues === 'string'
      ? JSON.parse(existingAttendee.customFieldValues)
      : existingAttendee.customFieldValues;
    
    // Convert array format to object format for easier comparison
    if (Array.isArray(parsed)) {
      currentCustomFieldValues = parsed.reduce((acc: Record<string, any>, item: any) => {
        if (item.customFieldId) {
          acc[item.customFieldId] = item.value;
        }
        return acc;
      }, {});
    }
  }
} catch (error) {
  console.error('Failed to parse customFieldValues:', error);
  currentCustomFieldValues = {};
}
```

### 2. Log Settings Page Showing Zero Settings
**Problem:** The Log Settings page displayed "0 enabled" for all categories, indicating it couldn't read the settings from the database.

**Root Cause:** The Appwrite collection schema was incomplete and outdated:
- The setup script (`scripts/setup-appwrite.ts`) only created 6 attributes with old naming convention:
  - `logUserLogin`, `logUserLogout`, `logAttendeeCreate`, etc.
- But the API expected 33 attributes with new naming convention:
  - `authLogin`, `authLogout`, `attendeeCreate`, etc.
- The existing log settings document had the old field names, so all new fields appeared as null/undefined

**Solution:** 
1. Created migration script `scripts/fix-log-settings-collection.ts` to add all 32 missing attributes
2. Created cleanup script `scripts/reset-log-settings-document.ts` to delete old documents
3. The API automatically creates a new document with correct default values on first access

**Scripts Created:**
- `scripts/fix-log-settings-collection.ts` - Adds missing boolean attributes to the collection
- `scripts/reset-log-settings-document.ts` - Deletes old documents with incorrect schema

## Files Modified

1. **src/pages/api/attendees/[id].ts**
   - Fixed custom field values parsing and comparison logic
   - Lines 94-115: Added proper JSON parsing and array-to-object conversion

2. **scripts/fix-log-settings-collection.ts** (NEW)
   - Migration script to add missing attributes to log_settings collection
   - Adds all 32 missing boolean attributes with correct naming

3. **scripts/reset-log-settings-document.ts** (NEW)
   - Cleanup script to delete old log settings documents
   - Allows API to create fresh document with correct schema

## Testing Instructions

### Test Attendee Update Logging
1. Open an existing attendee record
2. Change ONLY the last name (or any single field)
3. Save the changes
4. Check the activity log
5. **Expected:** Should only show "Last Name: 'OLD' → 'NEW'"
6. **Should NOT show:** All custom fields changing from "empty" to their values

### Test Log Settings
1. Open the Log Settings dialog
2. All settings should now display with their correct enabled/disabled state
3. The count badges should show the correct number of enabled settings per category
4. Try toggling some settings and saving - changes should persist

## Expected Behavior After Fix

### Attendee Updates
- Only fields that actually changed should appear in the log
- Custom fields that weren't modified should not appear in the change log
- Empty-to-value changes should only log if the field was actually empty before

### Log Settings
- All settings should display with their correct enabled/disabled state
- The count badges should show the correct number of enabled settings per category
- Console logs will help identify any remaining data structure issues

## Migration Steps Performed

1. **Analyzed the issue:**
   - Discovered collection had only 6 old attributes
   - API expected 33 new attributes
   - Field naming convention had changed

2. **Fixed the collection schema:**
   ```bash
   npx tsx scripts/fix-log-settings-collection.ts
   ```
   - Added 32 missing boolean attributes
   - All attributes default to `true` (enabled)

3. **Reset existing data:**
   ```bash
   npx tsx scripts/reset-log-settings-document.ts
   ```
   - Deleted old document with incorrect schema
   - API will create new document on first access

## Future Maintenance

**Important:** The `scripts/setup-appwrite.ts` file needs to be updated to include all log settings attributes. The current version is outdated and will cause issues if run on a fresh database.

## Codebase Audit Results

### ✅ Areas Already Handling JSON Correctly

After auditing the codebase, these areas are already properly parsing JSON strings:

1. **Role Permissions** (`src/lib/apiMiddleware.ts`)
   - ✅ Properly parses `role.permissions` from JSON string to object
   - ✅ Has error handling and fallback to empty object

2. **Log Details** (`src/pages/api/logs/index.ts`, `src/pages/api/logs/export.ts`)
   - ✅ Properly parses `log.details` from JSON string to object
   - ✅ Has error handling and fallback to empty object

3. **Custom Field Values** (Multiple files)
   - ✅ Most endpoints already parse `customFieldValues` correctly
   - ✅ `src/pages/api/attendees/index.ts` - Handles both string and object formats
   - ✅ `src/pages/api/attendees/export.ts` - Parses before filtering
   - ✅ `src/pages/api/attendees/[id]/generate-credential.ts` - Parses and converts array to object
   - ✅ `src/pages/api/attendees/[id]/print.ts` - Parses with error handling

4. **Switchboard Field Mappings** (`src/pages/api/event-settings/index.ts`)
   - ✅ Properly parses `switchboardFieldMappings` from JSON string
   - ✅ Handles both string and object formats

5. **Dashboard Display** (`src/pages/dashboard.tsx`)
   - ✅ Correctly displays parsed log details
   - ✅ Handles different formats (array, object, string)

### 🔧 Fixed Issues

1. **Attendee Update Comparison** (`src/pages/api/attendees/[id].ts`)
   - ❌ Was not parsing `existingAttendee.customFieldValues` before comparison
   - ✅ Now parses JSON string and converts array to object format

### 🔧 Fixed Issues (Continued)

2. **Log Settings Collection Schema** (`scripts/setup-appwrite.ts`)
   - ❌ Setup script was outdated with only 6 attributes and old naming
   - ✅ Created migration script to add all 32 missing attributes
   - ✅ Reset existing documents to use new schema

### Summary

The codebase is generally well-structured with consistent JSON parsing patterns:
- Most APIs parse JSON strings when reading from database
- Error handling is in place with fallbacks to empty objects/arrays
- The main issue was in the attendee update comparison logic, which is now fixed

## Related Files
- `src/pages/api/attendees/[id].ts` - Attendee update endpoint (FIXED)
- `src/pages/api/log-settings/index.ts` - Log settings API (FIXED)
- `src/components/LogSettingsDialog.tsx` - Log settings UI component (FIXED)
- `src/lib/apiMiddleware.ts` - Role permissions parsing (ALREADY CORRECT)
- `src/pages/api/logs/index.ts` - Log details parsing (ALREADY CORRECT)
- `src/pages/api/logs/export.ts` - Log export with details parsing (ALREADY CORRECT)

## Related Documentation
- [Improved System Log Details](./IMPROVED_SYSTEM_LOG_DETAILS.md) - Enhanced log formatting for system operations
- [Log Settings Schema Migration](../migration/LOG_SETTINGS_SCHEMA_MIGRATION.md) - Collection schema fix
