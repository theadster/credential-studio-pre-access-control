# Custom Field Export Missing Data Investigation

## Issue
Some attendees have custom field data visible in the UI and stored in the database, but the data doesn't appear in CSV exports.

**Example:**
- Attendee: Vincent Coleman
- Barcode: 4459961
- Issue: Custom fields show data in UI but export as empty

## Potential Causes

### 1. Data Format Mismatch
Custom field values are stored as JSON in the database. Possible issues:
- String vs Object format inconsistency
- Parsing errors during export
- Null/undefined handling

### 2. Field ID Mismatch
- Custom field IDs in the stored values don't match current field definitions
- Fields were deleted and recreated with new IDs
- Orphaned data from old field definitions

### 3. Data Type Issues
- Boolean fields stored in unexpected format
- Empty strings vs null values
- Type coercion problems

## Changes Made

### Enhanced Error Handling in Export API

**File: `src/pages/api/attendees/export.ts`**

#### Before
```typescript
const customFieldValues = attendee.customFieldValues ?
  (typeof attendee.customFieldValues === 'string' ?
    JSON.parse(attendee.customFieldValues) : attendee.customFieldValues) : {};

for (const customField of customFieldsData) {
  if (fields.includes(`custom_${customField.$id}`)) {
    let value = customFieldValues[customField.$id] || '';
    // ... process value
  }
}
```

#### After
```typescript
let customFieldValues: Record<string, any> = {};

if (attendee.customFieldValues) {
  try {
    if (typeof attendee.customFieldValues === 'string') {
      customFieldValues = JSON.parse(attendee.customFieldValues);
    } else if (typeof attendee.customFieldValues === 'object') {
      customFieldValues = attendee.customFieldValues;
    }
  } catch (error) {
    console.error(`[Export] Failed to parse customFieldValues for attendee ${attendee.$id}:`, error);
    console.error(`[Export] Raw customFieldValues:`, attendee.customFieldValues);
  }
}

for (const customField of customFieldsData) {
  if (fields.includes(`custom_${customField.$id}`)) {
    let value = customFieldValues[customField.$id];
    
    // Handle null, undefined, or missing values
    if (value === null || value === undefined) {
      value = '';
    } else {
      // Process value based on field type
    }
    
    row.push(value);
  }
}
```

**Improvements:**
- Explicit type checking for customFieldValues
- Try-catch with detailed error logging
- Separate handling for null/undefined values
- Better error messages for debugging

## Diagnostic Script

Created `scripts/diagnose-custom-field-export.ts` to help identify the root cause:

### What It Does
1. Finds the specific attendee by barcode
2. Examines the raw customFieldValues data
3. Parses and displays the stored values
4. Fetches all custom field definitions
5. Matches stored values with field definitions
6. Identifies orphaned values (values for deleted fields)
7. Identifies missing values (fields without data)
8. Provides a detailed summary

### How to Run

**Diagnose specific attendee by barcode:**
```bash
npx ts-node scripts/diagnose-custom-field-export.ts 4459961
```

**Diagnose Vincent Coleman (default):**
```bash
npx ts-node scripts/diagnose-custom-field-export.ts
```

**Scan all attendees for issues:**
```bash
npx ts-node scripts/diagnose-custom-field-export.ts scan
```

### Expected Output
```
================================================================================
CUSTOM FIELD EXPORT DIAGNOSTIC
================================================================================

1. Searching for Vincent Coleman (Barcode: 4459961)...
✅ Found attendee: Vincent Coleman
   Attendee ID: 67xxxxx

2. Checking customFieldValues...
   Type: string
   Raw value: {"field1": "value1", "field2": "value2"}

✅ Successfully parsed customFieldValues (was string)
   Parsed values: {
     "field1": "value1",
     "field2": "value2"
   }
   Number of fields: 2

3. Fetching custom field definitions...
✅ Found 5 custom fields

4. Matching values with field definitions...
--------------------------------------------------------------------------------
Field: Company (text)
  ID: field1
  Value: "Acme Corp"
  Has value: true

Field: Department (text)
  ID: field2
  Value: "Sales"
  Has value: true
...
--------------------------------------------------------------------------------

5. Checking for field ID mismatches...
⚠️  Found values for non-existent fields (orphaned):
   - oldfield123: "Old Value"

⚠️  Found fields without values:
   - New Field (newfield456)

================================================================================
SUMMARY
================================================================================
Attendee: Vincent Coleman
Barcode: 4459961
Custom field values stored: 3
Custom field definitions: 5
Fields with values: 2
Orphaned values: 1
Missing values: 3
================================================================================
```

## Common Scenarios

### Scenario 1: Orphaned Field Values
**Symptom:** Data exists in database but doesn't export

**Cause:** Field was deleted and recreated with a new ID

**Solution:**
1. Run diagnostic script to identify orphaned field IDs
2. Create a migration script to map old field IDs to new ones
3. Update attendee records with correct field IDs

### Scenario 2: Array Format Instead of Object
**Symptom:** Some random attendees missing custom field data in export

**Cause:** customFieldValues stored in array format `[{customFieldId: "id", value: "val"}]` instead of object format `{"id": "val"}`

**Solution:**
1. Run scan to identify affected attendees
2. Export API now handles both formats automatically
3. Consider migrating array format to object format for consistency

### Scenario 3: Parsing Errors
**Symptom:** Export shows empty values, console shows parsing errors

**Cause:** Corrupted JSON in customFieldValues

**Solution:**
1. Check server logs for parsing errors
2. Identify affected attendees
3. Fix or re-save their custom field data

### Scenario 3: Type Mismatch
**Symptom:** Some fields export, others don't

**Cause:** Unexpected data types (e.g., number stored as string)

**Solution:**
1. Verify field type definitions match stored data types
2. Add type coercion in export logic if needed

## Next Steps

### For Immediate Investigation
1. Run the diagnostic script for Vincent Coleman
2. Check server logs during export for error messages
3. Compare field IDs in database vs field definitions
4. Verify data format in database

### For Long-Term Fix
1. Identify root cause from diagnostic output
2. Create migration script if field IDs changed
3. Add data validation on save to prevent future issues
4. Consider adding field ID mapping for backward compatibility

## Related Files

- `src/pages/api/attendees/export.ts` - Export API with enhanced error handling
- `scripts/diagnose-custom-field-export.ts` - Diagnostic script
- `src/pages/api/attendees/index.ts` - Main attendees API (reference for data format)
- `src/pages/api/attendees/[id].ts` - Attendee update API (where data is saved)

## Testing Recommendations

1. **Run Diagnostic**: Execute diagnostic script for affected attendee
2. **Check Logs**: Review server logs during export for error messages
3. **Compare Data**: Check database directly vs what UI shows
4. **Test Export**: Try exporting just the affected attendee
5. **Verify Fields**: Ensure custom field definitions haven't changed

## Prevention

To prevent this issue in the future:

1. **Field ID Stability**: Never delete and recreate fields; update existing ones
2. **Data Validation**: Validate customFieldValues format on save
3. **Migration Scripts**: When changing field structure, migrate existing data
4. **Error Logging**: Monitor export errors in production
5. **Data Integrity Checks**: Periodic validation of customFieldValues format
