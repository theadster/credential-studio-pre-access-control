# Custom Field Multi-Select Filter Enhancement

## Overview
Enhanced the Advanced Filtering section to support multi-select capability for dropdown (select) custom fields. Users can now select multiple options from a dropdown field and filter attendees who match ANY of the selected options.

## Date
December 30, 2025

## Problem Statement
Previously, the Advanced Filtering section only allowed selecting a single option from dropdown custom fields. Users needed the ability to search for attendees matching multiple options simultaneously (e.g., "Show me attendees who selected Option A OR Option B").

## Solution

### 1. State Structure Changes

**File:** `src/pages/dashboard.tsx`

Updated the `advancedSearchFilters` state to support both string and array values for custom fields:

```typescript
// Before
customFields: { [key: string]: { value: string; operator: string } };

// After
customFields: { [key: string]: { value: string | string[]; operator: string } };
```

### 2. UI Component Replacement

Replaced the single-select dropdown with a searchable multi-select component using Popover and Command components.

**Key Features:**
- **Searchable**: Users can type to filter options
- **Multi-select**: Click to toggle multiple options
- **Visual feedback**: Checkboxes show selected state
- **Count display**: Shows "X options selected" when multiple selected
- **Clear button**: Easy way to clear all selections

**Component Structure:**
```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox">
      {/* Display logic: "Select options...", single option, or "X options selected" */}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <Command>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No options found.</CommandEmpty>
        <CommandGroup>
          {/* Checkbox items for each option */}
        </CommandGroup>
      </CommandList>
    </Command>
    {/* Clear Selection button */}
  </PopoverContent>
</Popover>
```

### 3. Handler Function Updates

**File:** `src/pages/dashboard.tsx`

Updated `handleCustomFieldSearchChange` to accept both string and array values:

```typescript
// Before
const handleCustomFieldSearchChange = (fieldId: string, value: string, operator?: string) => {
  // ...
};

// After
const handleCustomFieldSearchChange = (fieldId: string, value: string | string[], operator?: string) => {
  // ...
};
```

### 4. Filtering Logic Enhancement

**File:** `src/pages/dashboard.tsx`

Enhanced the filtering logic to handle multi-select (OR logic):

```typescript
// Handle multi-select for select fields (array of values)
if (Array.isArray(filter.value)) {
  // If empty array, match all (no filter applied)
  if (filter.value.length === 0) {
    return true;
  }
  // For multi-select, check if attendee value matches ANY of the selected options
  return filter.value.some(selectedValue => 
    hasValue && attendeeValue.toLowerCase() === selectedValue.toLowerCase()
  );
}
```

**Logic:**
- Empty array = no filter (match all attendees)
- Non-empty array = match attendees whose field value equals ANY selected option (OR logic)

### 5. Clear Function Update

**File:** `src/pages/dashboard.tsx`

Updated `clearAdvancedSearch` to initialize select fields with empty arrays:

```typescript
const clearAdvancedSearch = () => {
  const customFields: { [key: string]: { value: string | string[]; operator: string } } = {};
  eventSettings?.customFields?.forEach((field: any) => {
    // Use empty array for select fields, empty string for others
    customFields[field.id] = { 
      value: field.fieldType === 'select' ? [] : '', 
      operator: 'contains' 
    };
  });
  // ...
};
```

### 6. Export Dialog Update

**File:** `src/components/ExportDialog.tsx`

Updated the filter display to handle array values:

```typescript
// Handle both string and array values
if (Array.isArray(filter.value) && filter.value.length > 0) {
  filters.push(`Custom Field: "${filter.value.join(', ')}"`);
} else if (typeof filter.value === 'string' && filter.value) {
  filters.push(`Custom Field: "${filter.value}"`);
}
```

### 7. Import Additions

**File:** `src/pages/dashboard.tsx`

Added necessary component imports:

```typescript
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
```

## Visual Design

### Button States

1. **No Selection:**
   ```
   [Select options...                    ▼]
   ```

2. **Single Selection:**
   ```
   [Option A                             ▼]
   ```

3. **Multiple Selections:**
   ```
   [3 options selected                   ▼]
   ```

### Dropdown Content

```
┌─────────────────────────────────────┐
│ Search options...                   │
├─────────────────────────────────────┤
│ ☑ Option A                          │
│ ☐ Option B                          │
│ ☑ Option C                          │
│ ☐ Option D                          │
│ ☑ Option E                          │
├─────────────────────────────────────┤
│        [Clear Selection]             │
└─────────────────────────────────────┘
```

## User Experience

### Selecting Options
1. Click the dropdown button
2. Type to search/filter options (optional)
3. Click options to toggle selection
4. Selected options show checkmarks
5. Click outside or press Escape to close

### Clearing Selection
- Click "Clear Selection" button in dropdown
- Or use "Clear All Filters" button to reset everything

### Visual Feedback
- Checkboxes indicate selected state
- Button text updates to show selection count
- Search highlights matching options
- Hover states for better interactivity

## Technical Details

### Type Safety
All changes maintain TypeScript type safety with proper union types (`string | string[]`).

### Backward Compatibility
- Text fields continue to use string values
- Boolean fields continue to use string values
- Only select fields use array values
- Existing filters are preserved

### Performance
- Efficient filtering using `Array.some()` for OR logic
- No unnecessary re-renders
- Debounced search in Command component

## Testing Recommendations

### Manual Testing
1. **Single Selection:**
   - Select one option
   - Verify attendees with that option are shown
   - Verify button shows the option name

2. **Multiple Selections:**
   - Select 2-3 options
   - Verify attendees with ANY of those options are shown
   - Verify button shows "X options selected"

3. **Search Functionality:**
   - Type in search box
   - Verify options are filtered
   - Verify selection still works

4. **Clear Functionality:**
   - Select multiple options
   - Click "Clear Selection"
   - Verify all options are deselected
   - Verify all attendees are shown

5. **Mixed Filters:**
   - Combine multi-select with other filters (name, barcode, etc.)
   - Verify all filters work together (AND logic between different fields)

6. **Export:**
   - Apply multi-select filter
   - Open Export dialog
   - Verify filter summary shows all selected options

### Edge Cases
- Empty dropdown (no options configured)
- Single option in dropdown
- Very long option names
- Special characters in option names
- Rapid clicking/toggling

## Files Modified

1. **src/pages/dashboard.tsx**
   - State type definition
   - Handler functions
   - UI component
   - Filtering logic
   - Clear function
   - Imports

2. **src/components/ExportDialog.tsx**
   - Filter display logic

## Benefits

1. **Improved Usability:** Users can filter by multiple options without creating complex queries
2. **Time Savings:** No need to run multiple separate searches
3. **Better UX:** Searchable dropdown makes finding options easier
4. **Visual Clarity:** Clear indication of selected options
5. **Flexibility:** Maintains single-select capability while adding multi-select

## Future Enhancements

Potential improvements for future iterations:

1. **Select All/None:** Add buttons to quickly select or deselect all options
2. **Recent Selections:** Remember commonly used filter combinations
3. **Saved Filters:** Allow users to save and name filter presets
4. **AND Logic Option:** Toggle between OR and AND logic for multi-select
5. **Keyboard Navigation:** Enhanced keyboard shortcuts for power users

## Migration Notes

### For Other Branches

When porting this feature to other branches:

1. **Check State Structure:** Ensure the branch has the same `advancedSearchFilters` structure
2. **Verify Imports:** Confirm Popover and Command components are available
3. **Test Filtering Logic:** Verify the filtering logic matches the branch's implementation
4. **Update Types:** Ensure TypeScript types are updated consistently
5. **Test Export:** Verify export functionality handles array values

### Compatibility

- **Next.js:** Compatible with Next.js 16.x
- **React:** Compatible with React 19.x
- **shadcn/ui:** Requires Popover and Command components
- **TypeScript:** Requires TypeScript 5.x for proper type inference

## Conclusion

This enhancement significantly improves the Advanced Filtering experience for dropdown custom fields by adding multi-select capability with search functionality. The implementation maintains backward compatibility, type safety, and follows the existing design patterns in the application.
