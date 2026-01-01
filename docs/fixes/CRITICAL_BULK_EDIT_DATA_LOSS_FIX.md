---
title: "CRITICAL: Bulk Edit Data Loss Fix"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/attendees/bulk-edit.ts"]
---

# CRITICAL: Bulk Edit Data Loss Fix

## Severity: CRITICAL 🚨
**Data Loss Bug** - This bug caused permanent data loss when using bulk edit functionality.

## Issue
When using the bulk edit feature to update a single custom field across multiple attendees, **ALL other custom field values were being erased** from those attendee records.

### Example of Data Loss
**Before Bulk Edit:**
- Attendee has: Company="ABC Corp", Title="Manager", Department="Sales"
- User bulk edits only Department to "Marketing"

**After Bulk Edit (BUG):**
- Attendee has: Department="Marketing"
- **LOST**: Company and Title data completely erased ❌

## Root Cause

### The Problem
The bulk edit API was treating `customFieldValues` as an object and using object spread syntax:

```typescript
// BUGGY CODE
const currentCustomFieldValues = attendee.customFieldValues ? 
  (typeof attendee.customFieldValues === 'string' ? 
    JSON.parse(attendee.customFieldValues) : attendee.customFieldValues) : {};

const updatedCustomFieldValues = { ...currentCustomFieldValues };
```

### Why This Caused Data Loss

Custom field values are stored in **array format**:
```json
[
  {"customFieldId": "abc123", "value": "ABC Corp"},
  {"customFieldId": "def456", "value": "Manager"},
  {"customFieldId": "ghi789", "value": "Sales"}
]
```

When the code did `{ ...currentCustomFieldValues }` on an array, it converted it to an object with numeric keys:
```json
{
  "0": {"customFieldId": "abc123", "value": "ABC Corp"},
  "1": {"customFieldId": "def456", "value": "Manager"},
  "2": {"customFieldId": "ghi789", "value": "Sales"}
}
```

Then when updating a single field, the code would:
1. Create a new object with only the changed field
2. Save it back as JSON
3. **All other fields were lost** because they weren't in the update object

## Solution

### Fixed Implementation

1. **Properly parse array format**:
```typescript
let currentCustomFieldValues: Array<{customFieldId: string, value: string}> = [];

if (attendee.customFieldValues) {
  const parsed = typeof attendee.customFieldValues === 'string' ? 
    JSON.parse(attendee.customFieldValues) : attendee.customFieldValues;
  
  // Convert to array format if it's an object
  if (Array.isArray(parsed)) {
    currentCustomFieldValues = parsed;
  } else if (typeof parsed === 'object') {
    // Convert object format to array format
    currentCustomFieldValues = Object.entries(parsed)
      .filter(([key]) => !key.match(/^\d+$/)) // Skip numeric keys
      .map(([customFieldId, value]) => ({
        customFieldId,
        value: String(value)
      }));
  }
}
```

2. **Use Map for updates** (preserves all existing values):
```typescript
// Create a map for easier lookup and updates
const customFieldMap = new Map(
  currentCustomFieldValues.map(cfv => [cfv.customFieldId, cfv.value])
);

// Update only the changed fields
for (const [fieldId, value] of Object.entries(changes)) {
  if (value && value !== 'no-change') {
    customFieldMap.set(fieldId, String(processedValue));
    hasChanges = true;
  }
}
```

3. **Convert back to array format**:
```typescript
// Convert map back to array format
const updatedCustomFieldValues = Array.from(customFieldMap.entries()).map(([customFieldId, value]) => ({
  customFieldId,
  value
}));
```

## Impact

### Before Fix
- ❌ Bulk editing ANY field erased ALL other custom field data
- ❌ Permanent data loss with no recovery option
- ❌ Users lost critical attendee information

### After Fix
- ✅ Bulk editing updates ONLY the specified fields
- ✅ All other custom field values are preserved
- ✅ Data integrity maintained

## Data Recovery

### For Affected Users

If you've already lost data due to this bug:

1. **Check database backups**: Restore from the most recent backup before bulk edits
2. **Check logs**: The logs collection may have "before" snapshots of attendee data
3. **Re-import data**: If you have CSV exports from before the bulk edit, re-import them

### Prevention Going Forward

The fix ensures:
- Existing custom field values are always preserved
- Only explicitly changed fields are updated
- Array format is maintained throughout the process

## Testing

### Test Case 1: Single Field Update
1. Create attendee with multiple custom fields filled
2. Bulk edit to change only one field
3. **Expected**: Only that field changes, all others preserved ✅
4. **Before Fix**: All other fields erased ❌

### Test Case 2: Multiple Field Update
1. Create attendee with 5 custom fields filled
2. Bulk edit to change 2 fields
3. **Expected**: Those 2 fields change, other 3 preserved ✅
4. **Before Fix**: Other 3 fields erased ❌

### Test Case 3: No Changes
1. Create attendee with custom fields
2. Bulk edit but select "no-change" for all fields
3. **Expected**: No changes, all data preserved ✅
4. **Before Fix**: All fields erased ❌

## Files Modified

- `src/pages/api/attendees/bulk-edit.ts` - Fixed to preserve existing custom field values

## Related Issues

This is related to the ongoing custom field data format issues:
- [Custom Field Values Fix](./CUSTOM_FIELD_VALUES_FIX.md) - Array/object format handling
- [Custom Field Validation Fix](./CUSTOM_FIELD_VALIDATION_FIX.md) - Deleted field handling

## Lessons Learned

### Root Cause Analysis

1. **Inconsistent Data Format**: Custom fields stored as arrays but treated as objects
2. **No Data Validation**: No checks to ensure all fields were preserved
3. **Insufficient Testing**: Bulk edit wasn't tested with multiple custom fields
4. **Object Spread on Arrays**: Using `{...array}` converts arrays to objects with numeric keys

### Prevention Measures

1. **Consistent Data Format**: Always use array format for custom field values
2. **Preserve Existing Data**: Always load existing data before updates
3. **Use Appropriate Data Structures**: Use Map for key-value updates
4. **Add Tests**: Test bulk operations with multiple fields
5. **Add Logging**: Log before/after states for bulk operations

## Recommendations

### Immediate Actions

1. ✅ **Deploy Fix Immediately**: This is a critical data loss bug
2. ⚠️ **Notify Users**: Inform users about the bug and potential data loss
3. 📊 **Audit Data**: Check for affected records and extent of data loss
4. 💾 **Backup Data**: Ensure recent backups exist before further operations

### Long-term Improvements

1. **Add Confirmation Dialog**: Show preview of changes before bulk edit
2. **Add Undo Feature**: Allow reverting bulk edits within a time window
3. **Add Audit Trail**: Log all bulk operations with before/after snapshots
4. **Add Data Validation**: Validate that all existing fields are preserved
5. **Add Integration Tests**: Test bulk operations thoroughly

## Communication Template

### For Users

```
CRITICAL BUG FIX: Bulk Edit Data Loss

We've identified and fixed a critical bug in the bulk edit feature that 
could cause data loss. If you used bulk edit recently, please:

1. Check your attendee records for missing custom field data
2. Restore from backups if needed
3. Contact support if you need assistance with data recovery

The bug has been fixed and deployed. Bulk edit now correctly preserves 
all existing custom field values.

We apologize for any inconvenience and data loss this may have caused.
```

## Related Documentation

- [Custom Field Values Fix](./CUSTOM_FIELD_VALUES_FIX.md)
- [Custom Field Validation Fix](./CUSTOM_FIELD_VALIDATION_FIX.md)
- [Credential Generation Fixes](./CREDENTIAL_GENERATION_FIXES_SUMMARY.md)
