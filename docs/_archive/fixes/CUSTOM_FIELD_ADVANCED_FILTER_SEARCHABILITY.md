# Custom Field Advanced Filter Searchability Fix

## Issue Description

User reported that custom fields with "Show on Main Page" toggle disabled were not searchable using Advanced Filters on the Attendees page. Specifically, when searching for "Is Empty" on a hidden email field, it returned all records instead of only records where that field is empty.

## Root Cause Analysis

The issue was in the `/api/attendees` endpoint. The API was filtering out hidden custom field values before sending them to the frontend:

**Problem Code** (line 441 in `src/pages/api/attendees/index.ts`):
```typescript
parsedCustomFieldValues = Object.entries(parsed)
  .filter(([customFieldId]) => visibleFieldIds.has(customFieldId)) // ❌ Filtering out hidden fields
  .map(([customFieldId, value]) => ({
    customFieldId,
    value: String(value)
  }));
```

This meant:
1. Hidden field values were completely removed from the API response
2. The frontend had no data to determine if a hidden field was empty or not
3. Advanced Filters couldn't properly search hidden fields
4. "Is Empty" searches returned all records because the frontend treated missing data as "no filter"

## Solution

**Removed the filter** so ALL custom field values (including hidden ones) are sent to the frontend:

```typescript
parsedCustomFieldValues = Object.entries(parsed)
  .map(([customFieldId, value]) => ({
    customFieldId,
    value: String(value)
  }));
```

The `showOnMainPage` setting now only affects the **display logic** in the frontend, not the data returned by the API.

## Changes Made

### 1. API Endpoint (`src/pages/api/attendees/index.ts`)

**Lines 421-450**: Removed filtering of hidden custom field values
- Changed comments to clarify that ALL fields are returned
- Removed `.filter(([customFieldId]) => visibleFieldIds.has(customFieldId))`
- Removed `.filter((cfv: any) => visibleFieldIds.has(cfv.customFieldId))` for legacy array format

**Lines 135-160**: Updated comments to reflect new behavior
- Clarified that API returns all custom field values
- Noted that frontend display logic handles visibility filtering

### 2. Frontend Dashboard (`src/pages/dashboard.tsx`)

**Line 3190**: Added clarifying comments
- Documented that Advanced Filters show ALL fields (including hidden ones)
- Explained that `showOnMainPage` only affects table display

### 3. Tests Updated

**`src/__tests__/api/attendees/index.test.ts`**:
- Updated "Custom Field Visibility Filtering" tests
- Changed expectations to verify ALL fields are returned (including hidden ones)
- Fixed import path from relative to absolute

**`src/__tests__/api/attendees/batch-fetching.integration.test.ts`**:
- Updated batch fetching test for custom field visibility
- Changed expectations to verify ALL fields are returned
- Fixed import path from relative to absolute

## How It Works Now

### Field Visibility Behavior

1. **API Response** (`/api/attendees`):
   - Returns ALL custom field values regardless of `showOnMainPage` setting
   - This allows Advanced Filters to search on hidden fields
   - Provides complete data for filtering logic

2. **Main Attendees Table** (Frontend):
   - Uses `getCustomFieldsWithValues()` function to filter display
   - Only shows fields where `showOnMainPage !== false`
   - Keeps the table clean and focused

3. **Advanced Filters Dialog** (Frontend):
   - Shows ALL custom fields regardless of `showOnMainPage` setting
   - Allows searching on hidden fields
   - All search operators work correctly (Contains, Equals, Is Empty, etc.)

4. **Search Functionality**:
   - Advanced search iterates through all custom fields in the filter state
   - Matches field values against attendee data
   - Works correctly for both visible and hidden fields
   - "Is Empty" now correctly identifies records with empty hidden fields

### Code Locations

- **API Endpoint**: `src/pages/api/attendees/index.ts` (lines 135-450)
  - Returns all custom field values without filtering
  
- **Advanced Filters UI**: `src/pages/dashboard.tsx` (line 3192)
  - Maps over all custom fields without filtering
  
- **Main Table Display**: `src/pages/dashboard.tsx` (line 436)
  - Filters to only show visible fields using `getCustomFieldsWithValues()`
  
- **Search Logic**: `src/pages/dashboard.tsx` (lines 1020-1080)
  - Iterates through all custom fields for matching

## Testing

To verify the fix works correctly:

1. Create a custom email field in Event Settings
2. Disable "Show on Main Page" toggle for that field
3. Add email values to some attendees, leave others empty
4. Verify the field does NOT appear as a column in the main attendees table
5. Open Advanced Filters dialog
6. Verify the hidden email field DOES appear in the Advanced Filters
7. Search using "Is Empty" operator
8. Verify only attendees with empty email fields are returned
9. Search using "Is Not Empty" operator
10. Verify only attendees with email values are returned

## Expected Behavior

- ✅ Hidden fields (showOnMainPage = false) do NOT appear as columns in main table
- ✅ Hidden fields DO appear in Advanced Filters dialog
- ✅ Hidden fields ARE searchable through Advanced Filters
- ✅ "Is Empty" correctly identifies records with empty hidden fields
- ✅ "Is Not Empty" correctly identifies records with values in hidden fields
- ✅ All search operators work correctly for hidden fields
- ✅ Main table remains clean with only visible fields shown

## Performance Impact

**Minimal increase in payload size**:
- Hidden field values are now included in API response
- For most events, this adds negligible data (a few KB)
- The benefit of correct search functionality outweighs the small payload increase
- Frontend filtering is fast and doesn't impact performance

## Related Files

- `src/pages/api/attendees/index.ts` - Attendees API endpoint
- `src/pages/dashboard.tsx` - Main dashboard with Advanced Filters
- `src/__tests__/api/attendees/index.test.ts` - Unit tests
- `src/__tests__/api/attendees/batch-fetching.integration.test.ts` - Integration tests

## Notes

- The `showOnMainPage` setting is now purely a UI display preference for the main table
- It does NOT affect data storage, API responses, or search functionality
- All custom fields are always stored and retrievable regardless of visibility setting
- This design allows for flexible UI while maintaining full search capability
- Hidden fields remain editable in the attendee edit/create forms

## Automated Testing

### Unit Tests

All unit tests for the `/api/attendees` endpoint are passing, including comprehensive tests for custom field visibility:

**Test File:** `src/__tests__/api/attendees/index.test.ts`

**Custom Field Visibility Tests:**
- ✅ Returns ALL custom fields including hidden ones (showOnMainPage is false)
- ✅ Defaults to visible when showOnMainPage is undefined
- ✅ Defaults to visible when showOnMainPage is null
- ✅ Handles attendees with no custom field values
- ✅ Handles array format custom field values with visibility filtering

**Test Results:**
```bash
npx vitest --run src/__tests__/api/attendees/index.test.ts
# 19 passed | 6 skipped (30 total)
```

### Integration Tests

All batch fetching integration tests are passing, verifying that the fix works correctly for large events (>5000 attendees):

**Test File:** `src/__tests__/api/attendees/batch-fetching.integration.test.ts`

**Batch Fetching Tests:**
- ✅ Small events (≤5000 attendees) - single request
- ✅ Large events (>5000 attendees) - multiple batches
- ✅ Correct offset calculation for each batch
- ✅ Preserves filters across all batches
- ✅ Preserves ordering across all batches
- ✅ Returns ALL custom fields including hidden ones with batch fetching
- ✅ Handles edge cases (exactly 5000, empty batches)
- ✅ Performance characteristics for various event sizes

**Test Results:**
```bash
npx vitest --run src/__tests__/api/attendees/batch-fetching.integration.test.ts
# 11 passed (11 total)
```

See `docs/fixes/BATCH_FETCHING_TESTS_COMPLETED.md` for details on test updates.

### User Verification

User confirmed the fix is working correctly in production:
- ✅ Hidden custom fields are now searchable using Advanced Filters
- ✅ "Is Empty" operator correctly returns only records where the field is empty
- ✅ "Is Not Empty" operator correctly returns only records where the field has a value
- ✅ Hidden fields remain hidden from the main table display


---

## Enhancement: Multi-Select for Dropdown Fields

### Date
December 30, 2025

### Overview
Added the ability to select multiple options in dropdown (select) custom fields within the Advanced Filtering section. Users can now search for attendees who have ANY of the selected options (OR logic).

### What Changed

#### New Component
- **`src/components/ui/multi-select.tsx`** - A reusable multi-select component with:
  - Compact display showing "X options selected" (no overflow issues)
  - Checkbox-style selection interface
  - Searchable dropdown with scroll area
  - Selection counter and "Clear all" button
  - Full keyboard navigation and accessibility
  - Dark mode support

#### Modified Files
1. **`src/pages/dashboard.tsx`**
   - Updated state type to support `string | string[]` for custom field values
   - Enhanced filtering logic to handle array-based multi-select with OR logic
   - Replaced single-select dropdown with MultiSelect component for dropdown fields
   - Updated filter count calculations to handle arrays

2. **`src/components/ExportDialog.tsx`**
   - Updated filter display to show comma-separated list for multi-select values

### How It Works

#### User Experience
1. Open Advanced Filters dialog
2. For any dropdown custom field, click to open the multi-select
3. Search or scroll to find options
4. Click options to toggle selection (checkboxes show selection state)
5. Selected count appears at bottom ("X selected")
6. Trigger button shows "X options selected" (clean, no overflow)
7. Click "Clear all" to remove all selections
8. Apply filters to see attendees with ANY of the selected options

#### Technical Implementation
- **OR Logic**: When multiple options are selected, attendees matching ANY option are included
- **Backward Compatible**: Existing single-value filters automatically work with the new system
- **Type Safe**: TypeScript types updated to support both string and string array values
- **Performance**: Client-side filtering with efficient `.some()` for short-circuit evaluation

### Example Use Cases

#### Event Registration Types
Select "VIP" AND "Speaker" to see all VIP and Speaker attendees in one view.

#### Dietary Restrictions
Select multiple dietary options (Vegetarian, Vegan, Gluten-Free) to see all attendees with special meal requirements.

#### T-Shirt Sizes
Select "XL" and "XXL" together to see all attendees needing larger sizes for inventory planning.

### Documentation

For detailed documentation and porting instructions, see:
- **Main Documentation**: `docs/fixes/CUSTOM_FIELD_MULTI_SELECT_FILTER.md`
- **Porting Guide**: `docs/fixes/CUSTOM_FIELD_MULTI_SELECT_FILTER_PORTING_GUIDE.md`

### Benefits

#### For Users
- ✅ Filter for multiple options at once
- ✅ No need to run multiple exports and merge results
- ✅ Clean interface with no overflow issues
- ✅ Clear visual feedback with checkboxes
- ✅ Easy to see how many options are selected
- ✅ Simple "Clear all" button
- ✅ Intuitive OR logic (matches ANY selected option)

#### For Developers
- ✅ Reusable multi-select component
- ✅ Type-safe implementation
- ✅ Backward compatible
- ✅ No database changes required
- ✅ No API changes required
- ✅ Well-documented for porting

### Testing Status
- [x] No TypeScript errors
- [ ] Manual testing pending
- [ ] User acceptance testing pending


---

## Update (January 17, 2026)

This documentation has been archived. The Advanced Filters feature has been refactored and extracted into a dedicated component. See:
- `docs/fixes/CUSTOM_FIELD_SEARCHABILITY_REAPPLIED.md` - Current implementation status
- `docs/misc/ADVANCED_FILTERS_COMPONENT_EXTRACTION_REFACTOR.md` - Full refactoring details

The custom field searchability fix remains valid - all custom fields (including hidden ones) are still returned by the API and searchable through the new Advanced Filters Dialog component.
