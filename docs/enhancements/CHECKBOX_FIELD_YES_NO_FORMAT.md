---
title: "Checkbox Field Yes/No Format"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/components/CustomFieldInput.tsx"]
---

# Checkbox Field Yes/No Format Enhancement

## Overview

Updated checkbox custom fields to use 'yes'/'no' format instead of 'true'/'false', matching the behavior of boolean fields. Checkbox fields now display with a checkmark icon on the main dashboard, styled consistently with the yes/no switch field type.

## Changes Made

### 1. CustomFieldInput Component (`src/components/AttendeeForm/CustomFieldInput.tsx`)

**Checkbox Field Handling:**
- Changed from storing 'true'/'false' to 'yes'/'no'
- Checkbox now displays "Yes" or "No" label instead of just the checkbox
- Graceful handling of legacy 'true'/'false' values for backward compatibility
- When legacy values are encountered, they're treated as checked but saved as 'yes'/'no'

**Code Changes:**
```typescript
case 'checkbox':
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        checked={value === 'yes' || value === 'true'}  // Accept both formats
        onCheckedChange={(checked) => onChange(checked ? 'yes' : 'no')}  // Always save as yes/no
        aria-label={field.fieldName}
      />
      <Label>{(value === 'yes' || value === 'true') ? 'Yes' : 'No'}</Label>
    </div>
  );
```

### 2. Dashboard Display (`src/pages/dashboard.tsx`)

**Checkbox Field Rendering:**
- Added new rendering logic for checkbox fields in the custom fields table display
- Checkbox fields now display with a checkmark icon (✓) in a badge
- Styled consistently with boolean fields using violet colors for "Yes" and gray for "No"
- Icon is hidden from screen readers with `aria-hidden="true"`

**Code Changes:**
```typescript
: field.fieldType === 'checkbox' ? (
  <Badge
    variant="outline"
    className={`text-xs inline-flex items-center gap-1.5 ${(field.value === 'Yes' || field.value === 'yes')
      ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800 dark:hover:bg-violet-900/40 dark:hover:border-violet-700'
      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300 dark:bg-gray-950/30 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-900/40 dark:hover:border-gray-700'
      }`}
    role="status"
  >
    <Check className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
    {(field.value === 'Yes' || field.value === 'yes') ? 'Yes' : 'No'}
  </Badge>
) : (
```

**Icon Import:**
- Added `Check` icon to the lucide-react imports

### 3. Bulk Edit Support

The bulk edit functionality already supported both 'boolean' and 'checkbox' field types with Yes/No values, so no changes were needed there.

### 4. Test Updates

**Moved Test File:**
- Moved test file from `src/components/AttendeeForm/__tests__/CustomFieldInput.test.tsx` to `src/__tests__/components/AttendeeForm/CustomFieldInput.test.tsx` (correct location per project standards)

**Updated Tests:**
- Updated checkbox field tests to use 'yes'/'no' format
- Added tests for legacy 'true' value handling
- Added tests for Yes/No label display
- Updated boolean field tests to use 'yes'/'no' format
- All 23 tests passing

## Visual Changes

### Before
- Checkbox fields displayed as plain checkboxes in forms
- On dashboard, checkbox values showed as 'true' or 'false' text
- No visual distinction from other field types

### After
- Checkbox fields display with Yes/No labels in forms
- On dashboard, checkbox fields display as badges with checkmark icon
- Violet badge for "Yes" state, gray badge for "No" state
- Consistent styling with boolean/yes-no switch fields
- Dark mode support with appropriate color adjustments

## Data Format

### Storage Format
- **Checkbox fields:** 'yes' or 'no' (string)
- **Boolean fields:** 'yes' or 'no' (string)
- **Legacy values:** 'true'/'false' are gracefully handled and converted to 'yes'/'no'

### Bulk Edit Options
Both checkbox and boolean fields support:
- No Change
- Yes
- No
- Clear Field

## Backward Compatibility

- Legacy 'true'/'false' values are recognized and treated as checked
- When users interact with legacy values, they're automatically converted to 'yes'/'no'
- No data migration required - conversion happens on-the-fly

## Testing

All tests pass:
- ✓ Checkbox field rendering with yes/no values
- ✓ Checkbox field label display
- ✓ Checkbox field change handling
- ✓ Legacy 'true' value handling
- ✓ Boolean field rendering with yes/no values
- ✓ Boolean field change handling
- ✓ All other field types continue to work correctly

## Files Modified

1. `src/components/AttendeeForm/CustomFieldInput.tsx` - Updated checkbox field handling
2. `src/pages/dashboard.tsx` - Added checkbox field rendering with checkmark icon
3. `src/__tests__/components/AttendeeForm/CustomFieldInput.test.tsx` - Updated tests (moved to correct location)

## Notes

- The checkbox field now uses the same 'yes'/'no' format as boolean fields for consistency
- This ensures compatibility with Switchboard integration field mappings
- Import/export functionality continues to work correctly
- Bulk edit operations support both field types identically
