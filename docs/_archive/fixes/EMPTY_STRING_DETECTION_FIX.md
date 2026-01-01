# Empty String Detection Fix - Significant Change Logic

## Issue

The significant-change detection logic in the attendee update endpoint was using truthy checks (e.g., `firstName && firstName !== existingAttendee.firstName`) which would ignore updates that set fields to empty strings or other falsy values.

### Example Problem Scenario

If a user tried to clear a field by setting it to an empty string:
- **Before**: `firstName = ""` would be treated as falsy, so the check `firstName && ...` would be `false`, and the change would NOT be detected as significant
- **Result**: The credential would remain marked as CURRENT even though a printable field changed
- **Expected**: Empty string is a valid value change and should mark the credential as OUTDATED

## Root Cause

The code was using JavaScript's truthy/falsy evaluation:
```typescript
(firstName && firstName !== existingAttendee.firstName)
```

This fails for falsy values like:
- Empty string: `""`
- Zero: `0`
- `false` (for boolean fields)
- `null`

## Solution

Changed from truthy checks to explicit `undefined` checks:

### Before
```typescript
const hasSignificantChanges = 
  (firstName && firstName !== existingAttendee.firstName) ||
  (lastName && lastName !== existingAttendee.lastName) ||
  (barcodeNumber && barcodeNumber !== existingAttendee.barcodeNumber) ||
  (photoUrl !== undefined && photoUrl !== existingAttendee.photoUrl) ||
  hasPrintableCustomFieldChanges;
```

### After
```typescript
const hasSignificantChanges = 
  (firstName !== undefined && firstName !== existingAttendee.firstName) ||
  (lastName !== undefined && lastName !== existingAttendee.lastName) ||
  (barcodeNumber !== undefined && barcodeNumber !== existingAttendee.barcodeNumber) ||
  (photoUrl !== undefined && photoUrl !== existingAttendee.photoUrl) ||
  hasPrintableCustomFieldChanges;
```

## What Changed

- **firstName**: `firstName &&` → `firstName !== undefined &&`
- **lastName**: `lastName &&` → `lastName !== undefined &&`
- **barcodeNumber**: `barcodeNumber &&` → `barcodeNumber !== undefined &&`
- **photoUrl**: Already correct (kept as-is)
- **hasPrintableCustomFieldChanges**: No change needed (boolean value)

## Why This Works

Using `!== undefined` explicitly checks if the field was provided in the request:
- ✅ `undefined`: Field not provided in request → skip check
- ✅ `""` (empty string): Field provided with empty value → detect change
- ✅ `0`: Field provided with zero → detect change
- ✅ `false`: Field provided with false → detect change
- ✅ `null`: Field provided with null → detect change
- ✅ Any other value: Field provided → detect change

## Impact

This fix ensures that:
1. **Empty strings are detected**: Users can clear fields and have credentials marked as outdated
2. **Zero values work**: Numeric fields can be set to zero
3. **Boolean false works**: Boolean fields can be set to false
4. **Null values work**: Fields can be explicitly set to null
5. **Undefined still skips**: If a field isn't in the request, it's not checked (correct behavior)

## Testing Scenarios

### Scenario 1: Clear First Name
```typescript
// Request: { firstName: "" }
// Before: NOT detected (firstName is falsy)
// After: ✅ Detected (firstName !== undefined is true)
```

### Scenario 2: Set Barcode to Zero
```typescript
// Request: { barcodeNumber: "0" }
// Before: NOT detected (truthy check might fail depending on type)
// After: ✅ Detected (barcodeNumber !== undefined is true)
```

### Scenario 3: Field Not Provided
```typescript
// Request: { lastName: "Smith" } (firstName not in request)
// Before: ✅ Correctly skipped (firstName is undefined)
// After: ✅ Correctly skipped (firstName === undefined)
```

### Scenario 4: Change to Non-Empty Value
```typescript
// Request: { firstName: "John" }
// Before: ✅ Detected (firstName is truthy)
// After: ✅ Detected (firstName !== undefined is true)
```

## Files Modified

- `src/pages/api/attendees/[id].ts` (lines 311-315)
  - Changed significant-change detection from truthy checks to explicit undefined checks

## Related Features

This fix is part of the printable field tracking feature:
- **Feature Implementation**: `docs/enhancements/PRINTABLE_FIELD_TRACKING_IMPLEMENTATION.md`
- **User Guide**: `docs/guides/PRINTABLE_FIELDS_USER_GUIDE.md`
- **Backward Compatibility**: `docs/testing/BACKWARD_COMPATIBILITY_TESTS_SUMMARY.md`

## Best Practice

When checking if a field was provided in a request:
- ✅ Use: `field !== undefined`
- ❌ Avoid: `field` or `!!field` (truthy check)

This ensures all valid values (including falsy ones) are properly detected.
