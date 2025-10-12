# Import Boolean Format Fix

## Issue
Boolean custom fields imported from CSV were being stored as "true"/"false" strings, but the UI expects "yes"/"no" strings. This caused imported boolean values to not display correctly in the UI.

## Root Cause
The import logic was converting boolean values to "true"/"false", but the AttendeeForm component uses a Switch component that checks for `value === 'yes'` and sets values as `'yes'` or `'no'`.

### Evidence:
**Import was using:**
```typescript
if (truthyValues.includes(lowerValue)) {
  processedValue = 'true';  // ❌ Wrong format
} else {
  processedValue = 'false'; // ❌ Wrong format
}
```

**UI expects (AttendeeForm.tsx line 515):**
```typescript
<Switch
  checked={value === 'yes'}  // ✅ Checks for 'yes'
  onCheckedChange={(checked) => setFormData(prev => ({
    ...prev,
    customFieldValues: {
      ...prev.customFieldValues,
      [field.id]: checked ? 'yes' : 'no'  // ✅ Sets 'yes'/'no'
    }
  }))}
/>
```

## Solution
Changed the import logic to convert boolean values to "yes"/"no" instead of "true"/"false".

### Files Modified
1. **src/pages/api/attendees/import.ts**
   - Changed boolean conversion from 'true'/'false' to 'yes'/'no'
   - Updated comments to clarify UI format requirement

2. **src/pages/api/attendees/__tests__/import-boolean-fields.test.ts**
   - Updated all test expectations from 'true'/'false' to 'yes'/'no'
   - All 10 tests passing

## Changes

### Before:
```typescript
// Handle boolean fields - convert YES/NO, TRUE/FALSE, 1/0 to boolean
if (fieldInfo?.fieldType === 'boolean') {
  const truthyValues = ['yes', 'true', '1'];
  const falsyValues = ['no', 'false', '0'];
  const lowerValue = String(value).toLowerCase().trim();
  
  if (truthyValues.includes(lowerValue)) {
    processedValue = 'true';  // ❌ Wrong
  } else if (falsyValues.includes(lowerValue)) {
    processedValue = 'false'; // ❌ Wrong
  } else {
    processedValue = 'false'; // ❌ Wrong
  }
}
```

### After:
```typescript
// Handle boolean fields - convert YES/NO, TRUE/FALSE, 1/0 to yes/no
// The UI uses 'yes'/'no' strings for boolean Switch components
if (fieldInfo?.fieldType === 'boolean') {
  const truthyValues = ['yes', 'true', '1'];
  const falsyValues = ['no', 'false', '0'];
  const lowerValue = String(value).toLowerCase().trim();
  
  if (truthyValues.includes(lowerValue)) {
    processedValue = 'yes';  // ✅ Correct
  } else if (falsyValues.includes(lowerValue)) {
    processedValue = 'no';   // ✅ Correct
  } else {
    processedValue = 'no';   // ✅ Correct
  }
}
```

## Testing

### Test Results:
```
✓ Import API - Boolean Custom Fields Conversion Logic (10 tests)
  ✓ should convert YES/yes/Yes to yes
  ✓ should convert NO/no/No to no
  ✓ should convert TRUE/true/True to yes
  ✓ should convert FALSE/false/False to no
  ✓ should convert 1 to yes and 0 to no
  ✓ should handle whitespace around values
  ✓ should default to no for unrecognized boolean values
  ✓ should not convert non-boolean fields
  ✓ should handle all truthy variations
  ✓ should handle all falsy variations
```

### Manual Testing:
1. Import CSV with boolean fields (YES/NO, TRUE/FALSE, 1/0)
2. Verify values display correctly in UI
3. Verify Switch components show correct state
4. Edit and save record - verify boolean values persist correctly

## Impact

### Before Fix:
- ❌ Imported boolean values showed as "No" regardless of CSV value
- ❌ Switch components always appeared off
- ❌ Editing and saving would change format, causing inconsistency

### After Fix:
- ✅ Imported boolean values display correctly
- ✅ Switch components show correct on/off state
- ✅ Consistent format between import and UI editing
- ✅ All boolean operations work as expected

## Supported Input Formats

The import now correctly handles all these formats and converts them to 'yes'/'no':

**Truthy values (→ 'yes'):**
- YES, yes, Yes (any case)
- TRUE, true, True (any case)
- 1

**Falsy values (→ 'no'):**
- NO, no, No (any case)
- FALSE, false, False (any case)
- 0

**Unrecognized values (→ 'no'):**
- Empty strings
- Any other value

## Related Files
- `src/components/AttendeeForm.tsx` - UI component using 'yes'/'no' format
- `src/pages/api/attendees/[id].ts` - Update endpoint (already uses correct format)
- `src/pages/api/attendees/export.ts` - Export endpoint (converts to Yes/No for display)

## Notes
- The UI consistently uses 'yes'/'no' strings for boolean Switch components
- Checkbox fields use 'true'/'false' (different component type)
- Export converts 'yes'/'no' to 'Yes'/'No' for CSV display
- This fix ensures consistency across import, storage, and display
