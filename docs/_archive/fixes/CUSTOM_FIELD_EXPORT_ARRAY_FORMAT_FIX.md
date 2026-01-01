# Custom Field Export - Array Format Fix

## Issue
Some random attendees have custom field data visible in the UI but the data doesn't appear in CSV exports. This affects only certain attendees, not all.

**Example:**
- Attendee: Vincent Coleman (Barcode: 4459961)
- Symptom: Custom fields show in UI but export as empty
- Pattern: Affects random attendees, not all

## Root Cause
The `customFieldValues` field can be stored in two different formats:

### Format 1: Object (Expected)
```json
{
  "fieldId1": "value1",
  "fieldId2": "value2"
}
```

### Format 2: Array (Legacy/Alternative) - Stored as JSON String
```json
"[{\"customFieldId\":\"fieldId1\",\"value\":\"value1\"},{\"customFieldId\":\"fieldId2\",\"value\":\"value2\"}]"
```

**The Critical Issue:**
The data is stored as a **JSON string** containing an array. The export code had array conversion logic, but it only checked if the value was an array BEFORE parsing the JSON string, not AFTER.

### The Problem Flow
1. Database stores: `"[{customFieldId: 'id', value: 'val'}]"` (string)
2. Code parses: `JSON.parse(string)` → `[{customFieldId: 'id', value: 'val'}]` (array)
3. Old code checked: `if (Array.isArray(attendee.customFieldValues))` → **FALSE** (because original was string)
4. Result: Array indices (0, 1, 2...) treated as field IDs instead of converting array to object

## Solution

### Updated Export API
**File: `src/pages/api/attendees/export.ts`**

Fixed the logic to check for array format AFTER parsing:

```typescript
// BEFORE (Broken):
if (typeof attendee.customFieldValues === 'string') {
  customFieldValues = JSON.parse(attendee.customFieldValues);
} else if (Array.isArray(attendee.customFieldValues)) {
  // This never executed for string-stored arrays!
  customFieldValues = convertArrayToObject(attendee.customFieldValues);
}

// AFTER (Fixed):
let parsedValues: any;

// First, parse if it's a string
if (typeof attendee.customFieldValues === 'string') {
  parsedValues = JSON.parse(attendee.customFieldValues);
} else {
  parsedValues = attendee.customFieldValues;
}

// Now check if the parsed/original value is an array and convert it
if (Array.isArray(parsedValues)) {
  // Convert array format [{customFieldId: "id", value: "val"}] to object format
  customFieldValues = parsedValues.reduce((acc, item) => {
    if (item.customFieldId) {
      acc[item.customFieldId] = item.value;
    }
    return acc;
  }, {});
} else if (typeof parsedValues === 'object') {
  customFieldValues = parsedValues;
}
```

**Key Change:** The array check now happens AFTER parsing, so string-stored arrays are properly detected and converted.

### Enhanced Diagnostic Script
**File: `scripts/diagnose-custom-field-export.ts`**

Added three modes of operation:

#### 1. Diagnose Specific Attendee
```bash
npx ts-node scripts/diagnose-custom-field-export.ts 4459961
```
Provides detailed analysis of a single attendee's custom field data.

#### 2. Diagnose Default (Vincent Coleman)
```bash
npx ts-node scripts/diagnose-custom-field-export.ts
```
Diagnoses the default test case.

#### 3. Scan All Attendees
```bash
npx ts-node scripts/diagnose-custom-field-export.ts scan
```
Scans all attendees and identifies those with:
- Parsing errors
- Array format data
- Orphaned field IDs
- Other data issues

**Example Scan Output:**
```
================================================================================
SCANNING ALL ATTENDEES FOR CUSTOM FIELD ISSUES
================================================================================

Fetching all attendees...
✅ Found 150 attendees

Analyzing custom field data...

================================================================================
SCAN RESULTS
================================================================================
Total attendees: 150
Attendees with issues: 12

ATTENDEES WITH ISSUES:
--------------------------------------------------------------------------------
1. Vincent Coleman (Barcode: 4459961)
   ⚠️  Using array format (should be object)
   Total values: 5

2. John Smith (Barcode: 1234567)
   ⚠️  2 orphaned field(s): oldfield123, deletedfield456
   Total values: 7

3. Jane Doe (Barcode: 7654321)
   ❌ Parsing error
   Total values: 0
--------------------------------------------------------------------------------
```

## Impact

### Before Fix
- Attendees with array-format custom field values: **Data not exported**
- Error logging: **Minimal, hard to debug**
- Diagnosis: **Manual database inspection required**

### After Fix
- Attendees with array-format custom field values: **✅ Data exports correctly**
- Error logging: **✅ Detailed with attendee info**
- Diagnosis: **✅ Automated scan tool available**

## Why Two Formats Exist

The array format may exist due to:

1. **Legacy Code**: Older version of the app used array format
2. **API Inconsistency**: Different APIs saving in different formats
3. **Import Process**: Bulk import might use array format
4. **Frontend Transformation**: UI might send array format in some cases

## Recommended Actions

### Immediate (Done)
- ✅ Export API now handles both formats
- ✅ Enhanced error logging
- ✅ Diagnostic tool available

### Short-Term
1. Run scan to identify all affected attendees
2. Review why array format is being created
3. Ensure all save operations use object format

### Long-Term
1. Create migration script to convert all array format to object format
2. Add validation on save to enforce object format
3. Update all APIs to consistently use object format
4. Add database constraint or validation

## Testing

### Test Cases
1. ✅ Export attendee with object format custom fields
2. ✅ Export attendee with array format custom fields
3. ✅ Export attendee with no custom fields
4. ✅ Export attendee with parsing errors (logs error, continues)
5. ✅ Export attendee with orphaned field IDs

### Verification Steps
1. Run diagnostic scan: `npx ts-node scripts/diagnose-custom-field-export.ts scan`
2. Identify attendees with array format
3. Export those specific attendees
4. Verify custom field data appears in CSV
5. Check server logs for any errors

## Migration Script (Optional)

If you want to normalize all data to object format:

```typescript
// scripts/migrate-custom-field-format.ts
import { Client, Databases, Query } from 'node-appwrite';

async function migrateCustomFieldFormat() {
  // Fetch all attendees with array format
  // Convert to object format
  // Update database
  // Log results
}
```

## Related Files

- `src/pages/api/attendees/export.ts` - Export API (fixed)
- `scripts/diagnose-custom-field-export.ts` - Diagnostic tool (enhanced)
- `src/pages/api/attendees/index.ts` - Main API (uses object format)
- `src/pages/api/attendees/[id].ts` - Update API (saves as object format)

## Prevention

To prevent mixed formats in the future:

1. **Consistent Save Format**: Always save as object format
2. **Validation**: Add validation to reject array format on save
3. **Type Definitions**: Use TypeScript types to enforce format
4. **Documentation**: Document expected format in code comments
5. **Testing**: Add tests for both formats to ensure compatibility

## Summary

The issue was caused by inconsistent data formats in the database. Some attendees had custom field values stored in array format while the export expected object format. The fix adds support for both formats and provides tools to identify and resolve data inconsistencies.

**Key Changes:**
- ✅ Export now handles both object and array formats
- ✅ Enhanced error logging with attendee details
- ✅ Diagnostic tool can scan all attendees for issues
- ✅ No data loss - all formats now export correctly
