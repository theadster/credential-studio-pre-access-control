---
title: "Custom Field Storage Format Consistency Fix"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/custom-fields/"]
---

# Custom Field Storage Format Consistency Fix

## Issue
The update endpoint was storing custom field values in array format `[{"customFieldId": "id", "value": "value"}]`, while the create endpoint and import were storing in object format `{"id": "value"}`. This caused:

1. **False change detection in logs** - Every edit appeared to change all custom fields
2. **Format inconsistency** - Records had different formats depending on how they were created/updated
3. **Confusion** - Imported records looked different from UI-edited records

## Root Cause

### Storage Format (Correct):
```json
{"68e351ad001a939881bb": "PRODUCTION", "68e351ad0021e663e157": "GlobalCorp"}
```

### What Was Happening:

**Import & Create (POST):**
```json
// Stored as object format ✅
{"68e351ad001a939881bb": "PRODUCTION"}
```

**Update (PUT):**
```json
// Stored as array format ❌
[{"customFieldId": "68e351ad001a939881bb", "value": "PRODUCTION"}]
```

This inconsistency meant that:
- Importing a record → object format
- Editing that record → array format
- Logs detected this as "all fields changed"

## Solution

Updated the update endpoint to convert array format back to object format before storage, matching the create endpoint and import behavior.

### File Modified
- `src/pages/api/attendees/[id].ts`

### Changes

**Before:**
```typescript
// Convert custom field values array to JSON array format (not object)
const validCustomFieldValues = customFieldValues
  .filter((cfv: any) => cfv.customFieldId)
  .map((cfv: any) => ({
    customFieldId: cfv.customFieldId,
    value: cfv.value !== null && cfv.value !== undefined ? String(cfv.value) : ''
  }));

updateData.customFieldValues = JSON.stringify(validCustomFieldValues);
// Stores: [{"customFieldId": "id", "value": "val"}] ❌
```

**After:**
```typescript
// Convert custom field values array to JSON object format for storage
// This matches the format used by the create endpoint and import
const validCustomFieldValues = customFieldValues
  .filter((cfv: any) => cfv.customFieldId)
  .map((cfv: any) => ({
    customFieldId: cfv.customFieldId,
    value: cfv.value !== null && cfv.value !== undefined ? String(cfv.value) : ''
  }));

// Convert array format to object format for storage
const customFieldValuesObj: { [key: string]: string } = {};
validCustomFieldValues.forEach((cfv: any) => {
  customFieldValuesObj[cfv.customFieldId] = cfv.value;
});

updateData.customFieldValues = JSON.stringify(customFieldValuesObj);
// Stores: {"id": "val"} ✅
```

## Data Flow (Corrected)

### Creating an Attendee (POST /api/attendees)
1. Frontend sends: `[{customFieldId: "field1", value: "value1"}]`
2. API converts to: `{"field1": "value1"}`
3. API stores as: `'{"field1": "value1"}'` (JSON string)

### Importing Attendees (POST /api/attendees/import)
1. CSV has: `field1,field2`
2. API converts to: `{"field1": "value1", "field2": "value2"}`
3. API stores as: `'{"field1": "value1", "field2": "value2"}'` (JSON string)

### Updating an Attendee (PUT /api/attendees/[id])
1. Frontend sends: `[{customFieldId: "field1", value: "value1"}]`
2. API converts to: `{"field1": "value1"}` ✅ **NOW CONSISTENT**
3. API stores as: `'{"field1": "value1"}'` (JSON string)

### Reading an Attendee (GET /api/attendees or GET /api/attendees/[id])
1. API reads: `'{"field1": "value1"}'` (JSON string)
2. API parses to: `{"field1": "value1"}` (object)
3. API converts to: `[{customFieldId: "field1", value: "value1"}]` (array)
4. Frontend receives: `[{customFieldId: "field1", value: "value1"}]`

## Benefits

### Before Fix:
- ❌ Imported records: object format
- ❌ UI-edited records: array format
- ❌ Logs showed all fields changed on every edit
- ❌ Inconsistent data format in database

### After Fix:
- ✅ All records: object format (consistent)
- ✅ Logs only show actual changes
- ✅ Import and UI editing produce identical format
- ✅ Consistent data format across all operations

## Impact on Existing Data

### Records Created/Imported Before Fix:
- Already in object format ✅
- No migration needed

### Records Edited Before Fix:
- May be in array format ❌
- Will be converted to object format on next edit ✅
- API can read both formats (backward compatible)

### Going Forward:
- All new records: object format ✅
- All updates: object format ✅
- Consistent format everywhere ✅

## Additional Fix: Log Comparison

### Issue
The logging comparison code was only handling array format for existing data, not object format. This caused all custom fields to appear as "empty → value" even when they already had values.

### Solution
Updated the comparison code to handle both formats:

```typescript
// Convert to object format for easier comparison
if (Array.isArray(parsed)) {
  // Convert array format to object format
  currentCustomFieldValues = parsed.reduce((acc: Record<string, any>, item: any) => {
    if (item.customFieldId) {
      acc[item.customFieldId] = item.value;
    }
    return acc;
  }, {});
} else if (parsed && typeof parsed === 'object') {
  // Already in object format ✅ ADDED THIS
  currentCustomFieldValues = parsed;
}
```

Now the logs correctly detect actual changes regardless of the storage format.

## Testing

### Test Scenario 1: Import then Edit
1. Import a CSV with custom fields
2. Edit ONE field in the UI
3. Check database - format should remain object format ✅
4. Check logs - should only show the ONE field you changed ✅

### Test Scenario 2: Create then Edit
1. Create attendee via UI
2. Edit ONE field
3. Check database - format should remain object format ✅
4. Check logs - should only show the ONE field you changed ✅

### Test Scenario 3: Existing Array Format Records
1. Find a record with array format (edited before fix)
2. Edit ONE field
3. Check database - should convert to object format ✅
4. Check logs - should only show the ONE field you changed ✅

## Related Files

- `src/pages/api/attendees/index.ts` - Create endpoint (already uses object format)
- `src/pages/api/attendees/import.ts` - Import endpoint (already uses object format)
- `src/pages/api/attendees/[id].ts` - Update endpoint (now fixed to use object format)
- `docs/fixes/CUSTOM_FIELD_VALUES_FIX.md` - Original format documentation

## Storage Format Standard

**Official Storage Format:**
```json
{
  "customFieldId1": "value1",
  "customFieldId2": "value2",
  "customFieldId3": "value3"
}
```

**API Response Format (for frontend):**
```json
[
  {"customFieldId": "customFieldId1", "value": "value1"},
  {"customFieldId": "customFieldId2", "value": "value2"},
  {"customFieldId": "customFieldId3", "value": "value3"}
]
```

**Key Principle:**
- **Storage**: Object format (compact, efficient)
- **API Response**: Array format (easy for frontend to iterate)
- **API Request**: Array format (from frontend forms)
- **Conversion**: API layer handles all conversions transparently

## Notes

- This fix ensures consistency across all CRUD operations
- The API layer handles format conversion transparently
- Frontend always works with array format
- Database always stores object format
- Logs now accurately detect actual changes
- No breaking changes for frontend or existing data
