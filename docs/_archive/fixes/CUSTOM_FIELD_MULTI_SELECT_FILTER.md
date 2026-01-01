# Custom Field Multi-Select Filter Enhancement

## Overview
Enhanced the Advanced Filtering feature to support multiple option selection for dropdown (select) custom fields. Users can now search for attendees who have ANY of the selected options (OR logic).

## Date
December 30, 2025

## Problem Statement
Previously, the Advanced Filtering section only allowed selecting a single option from dropdown custom fields. Users needed the ability to filter for multiple options simultaneously (e.g., "Show me attendees who selected Option A OR Option B").

## Solution

### 1. Created Multi-Select Component
**File:** `src/components/ui/multi-select.tsx`

Created a new reusable multi-select component with a clean, user-friendly interface:
- **Compact Display**: Shows "X options selected" instead of overflowing badges
- **Checkbox Interface**: Uses checkboxes in dropdown for clear selection state
- **Searchable Dropdown**: Filter options as you type
- **Visual Feedback**: Selected items shown with checkmarks and bold text
- **Selection Counter**: Shows count of selected items at bottom
- **Clear All Button**: Easy way to reset selections
- **Scrollable List**: Handles many options gracefully with scroll area
- **Responsive Width**: Dropdown matches trigger button width
- **Keyboard Navigation**: Full keyboard support
- **Accessibility**: Proper ARIA labels and roles
- **Dark Mode**: Matches existing design system

**Key Design Improvements:**
- No badge overflow issues - displays count instead
- Single-line trigger button that doesn't grow
- Checkbox-style selection is more intuitive
- Selected count always visible
- Cleaner, more professional appearance

### 2. Updated Dashboard State Management
**File:** `src/pages/dashboard.tsx`

**Changes:**
1. **Type Definition Update:**
   ```typescript
   customFields: { [key: string]: { value: string | string[]; operator: string } };
   ```
   - Changed `value` type from `string` to `string | string[]` to support both single and multi-select

2. **Handler Function Update:**
   ```typescript
   const handleCustomFieldSearchChange = (fieldId: string, value: string | string[], operator?: string)
   ```
   - Updated to accept both string and string array values

3. **Filtering Logic Enhancement:**
   - Added support for array-based filtering with OR logic
   - When `filter.value` is an array, checks if attendee value matches ANY selected option
   - Maintains backward compatibility with single-value filters
   
   ```typescript
   // Handle multi-select for dropdown fields (when filter.value is an array)
   if (Array.isArray(filter.value)) {
     if (filter.value.length === 0) {
       return true; // No filter applied
     }
     // Check if attendee value matches ANY of the selected options (OR logic)
     return filter.value.some(filterVal => 
       hasValue && attendeeValue.toLowerCase() === filterVal.toLowerCase()
     );
   }
   ```

4. **Filter Count Updates:**
   - Updated `hasAdvancedFilters()` to properly detect array values
   - Updated filter count badge to handle array values
   - Empty arrays are treated as "no filter applied"

### 3. Updated UI Rendering
**File:** `src/pages/dashboard.tsx`

Replaced single-select dropdown with multi-select component for dropdown custom fields:

```typescript
<MultiSelect
  options={field.fieldOptions?.options
    ?.filter((option: string) => option && option.trim() !== '')
    .map((option: string) => ({
      label: option,
      value: option
    })) || []}
  selected={Array.isArray(advancedSearchFilters.customFields[field.id]?.value) 
    ? advancedSearchFilters.customFields[field.id]?.value as string[]
    : advancedSearchFilters.customFields[field.id]?.value 
      ? [advancedSearchFilters.customFields[field.id]?.value as string]
      : []}
  onChange={(values) => handleCustomFieldSearchChange(field.id, values, 'equals')}
  placeholder={`Select ${field.fieldName.toLowerCase()}...`}
/>
```

**Backward Compatibility:**
- Handles conversion from single string value to array format
- Ensures existing filters continue to work

### 4. Updated Export Dialog
**File:** `src/components/ExportDialog.tsx`

Updated the active filters display to properly show multi-select values:

```typescript
// Handle array values (multi-select)
if (Array.isArray(filter.value)) {
  if (filter.value.length > 0) {
    filters.push(`Custom Field: "${filter.value.join(', ')}"`);
  }
} else {
  filters.push(`Custom Field: "${filter.value}"`);
}
```

### User Experience

### Before
- Users could only select ONE option from a dropdown field
- To find attendees with multiple options, users had to:
  1. Export with first option
  2. Export with second option
  3. Manually merge the results

### After
- Users can select MULTIPLE options from a dropdown field
- Clean, compact interface that doesn't overflow
- Shows "X options selected" for clarity
- Checkbox-style selection is intuitive
- Results show attendees who have ANY of the selected options (OR logic)
- Visual feedback with checkmarks for selected items
- Selection count always visible
- "Clear all" button for quick reset
- Searchable dropdown for finding options quickly

## Example Use Cases

### Use Case 1: Event Registration Types
**Scenario:** Event has a "Registration Type" dropdown with options: VIP, Speaker, Attendee, Sponsor

**Before:** Could only filter for "VIP" OR "Speaker" separately

**After:** Can select both "VIP" AND "Speaker" to see all VIP and Speaker attendees in one view

### Use Case 2: Dietary Restrictions
**Scenario:** Event has a "Dietary Restrictions" dropdown with options: Vegetarian, Vegan, Gluten-Free, Kosher, Halal

**Before:** Had to run 5 separate exports to get all attendees with dietary restrictions

**After:** Can select all dietary restriction options at once to see everyone who needs special meals

### Use Case 3: T-Shirt Sizes
**Scenario:** Event has a "T-Shirt Size" dropdown with options: XS, S, M, L, XL, XXL

**Before:** Had to filter for each size separately to count inventory

**After:** Can select "XL" and "XXL" together to see all attendees needing larger sizes

## Technical Details

### Filter Logic
- **OR Logic:** When multiple options are selected, attendees matching ANY option are included
- **Case-Insensitive:** Matching is case-insensitive for better user experience
- **Empty Array Handling:** Empty selection array is treated as "no filter" (shows all)

### Performance Considerations
- Filtering happens client-side on already-loaded attendees
- No additional API calls required
- Array comparison uses `.some()` for efficient short-circuit evaluation

### Accessibility
- Full keyboard navigation support
- ARIA labels and roles properly set
- Screen reader friendly
- Focus management for modal interactions

### Dark Mode Support
- Component fully supports dark mode
- Uses CSS variables for theming
- Matches existing design system

## Testing Recommendations

### Manual Testing Checklist
- [ ] Select single option - should work as before
- [ ] Select multiple options - should show attendees with ANY selected option
- [ ] Remove individual selections using X button
- [ ] Use "Clear all" button to remove all selections
- [ ] Search within dropdown options
- [ ] Test with empty selection (should show all attendees)
- [ ] Test filter count badge updates correctly
- [ ] Test export dialog shows selected options correctly
- [ ] Test dark mode appearance
- [ ] Test keyboard navigation
- [ ] Test with different custom field types (text, number, boolean) - should not be affected

### Edge Cases to Test
- [ ] Custom field with no options defined
- [ ] Custom field with single option
- [ ] Custom field with many options (20+)
- [ ] Attendee with no value for the custom field
- [ ] Attendee with value not in current options list
- [ ] Switching between single and multi-select fields
- [ ] Clearing filters and reapplying

## Files Modified

1. **Created:**
   - `src/components/ui/multi-select.tsx` - New multi-select component

2. **Modified:**
   - `src/pages/dashboard.tsx` - State management, filtering logic, UI rendering
   - `src/components/ExportDialog.tsx` - Display of multi-select filters

## Migration Notes

### For Other Branches
When porting this feature to other branches:

1. **Copy the multi-select component:**
   ```bash
   cp src/components/ui/multi-select.tsx <target-branch>/src/components/ui/
   ```

2. **Update dashboard.tsx:**
   - Update the `advancedSearchFilters` state type definition
   - Update `handleCustomFieldSearchChange` signature
   - Update filtering logic in `filteredAttendees` useMemo
   - Update `hasAdvancedFilters` function
   - Update filter count calculation
   - Add MultiSelect import
   - Replace Select with MultiSelect for dropdown fields

3. **Update ExportDialog.tsx:**
   - Update custom field filter display logic to handle arrays

4. **Test thoroughly:**
   - Ensure backward compatibility with existing single-value filters
   - Test all custom field types
   - Verify export functionality

### Backward Compatibility
- Existing single-value filters are automatically converted to arrays
- No database migration required
- No API changes required
- Existing exports and imports continue to work

## Future Enhancements

### Potential Improvements
1. **AND Logic Option:** Add toggle to switch between OR and AND logic
2. **Saved Filter Presets:** Allow users to save commonly used filter combinations
3. **Filter Templates:** Pre-defined filter sets for common scenarios
4. **Multi-Select for Boolean Fields:** Extend to support "Yes AND No" for boolean fields
5. **Visual Filter Builder:** Drag-and-drop interface for complex filter combinations
6. **Filter History:** Remember recently used filters
7. **Export Filter Definitions:** Save and share filter configurations

### Performance Optimizations
1. **Server-Side Filtering:** Move filtering to API for large datasets (1000+ attendees)
2. **Indexed Search:** Add database indexes for custom field values
3. **Lazy Loading:** Load options on-demand for fields with many options
4. **Debounced Search:** Add debouncing to search input in multi-select

## Conclusion

This enhancement significantly improves the Advanced Filtering feature by allowing users to search for multiple options in dropdown fields simultaneously. The implementation maintains backward compatibility, follows the existing design system, and provides a smooth user experience with proper accessibility support.

The OR logic approach (matching ANY selected option) is intuitive for most use cases and aligns with user expectations when selecting multiple items in a filter context.
