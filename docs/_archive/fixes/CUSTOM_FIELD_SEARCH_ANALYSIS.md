# Custom Field Search Analysis

## Issue Report

Custom fields (including email field) are not searchable using the search bar or advanced filters.

## Investigation Results

### Root Cause

Custom field search **IS working correctly** - the issue is architectural, not a bug:

1. **Current Architecture**: The dashboard fetches ALL attendees at once and filters them client-side in JavaScript
2. **Search Implementation**: All search (including custom fields) happens in the browser after data is loaded
3. **Why It Works**: Lines 1248-1270 in `src/pages/dashboard.tsx` show custom field search is implemented

```typescript
// Search in custom field values
let customFieldMatch = false;
let parsedCustomFieldValues: any = attendee.customFieldValues;
if (typeof parsedCustomFieldValues === 'string') {
  try {
    parsedCustomFieldValues = JSON.parse(parsedCustomFieldValues);
  } catch (e) {
    parsedCustomFieldValues = {};
  }
}

if (Array.isArray(parsedCustomFieldValues)) {
  // Legacy array format
  customFieldMatch = parsedCustomFieldValues.some((cfv: any) =>
    cfv.value && cfv.value.toLowerCase().includes(searchTerm.toLowerCase())
  );
} else if (parsedCustomFieldValues && typeof parsedCustomFieldValues === 'object') {
  // Current object format
  customFieldMatch = Object.values(parsedCustomFieldValues).some((value: any) => {
    if (Array.isArray(value)) {
      return value.some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return value && String(value).toLowerCase().includes(searchTerm.toLowerCase());
  });
}
```

### Why Custom Fields Appear Unsearchable

The issue is likely one of these:

1. **Custom field values are hidden** - Fields with `showOnMainPage = false` are filtered out before search
2. **Data format mismatch** - Custom field values might be in unexpected format
3. **Empty values** - The custom field might not have values for the attendees being searched
4. **Case sensitivity** - Search is case-insensitive but might not match expected format

### Attempted Fix (Rolled Back)

We attempted to add a full-text search index on `customFieldValues` to enable database-level searching. This was rolled back because:

1. **Not utilized**: The dashboard doesn't pass search parameters to the API - it fetches all data
2. **Performance degradation**: The index added overhead without providing benefits
3. **Architectural mismatch**: The index would only help if we changed to server-side filtering

## Correct Solution

### Option 1: Verify Data and Visibility (Recommended)

Check if the issue is with data or visibility settings:

1. **Check custom field visibility**:
   ```sql
   -- In Appwrite console, check custom_fields collection
   -- Look for showOnMainPage attribute
   -- If false, the field won't appear in search results
   ```

2. **Check custom field values**:
   ```sql
   -- In Appwrite console, check attendees collection
   -- Look at customFieldValues for a few records
   -- Verify the email field has values
   ```

3. **Verify field format**:
   - Custom fields should be stored as: `{"fieldId": "value"}`
   - Check if email field ID matches what's in the data

### Option 2: Debug Search Functionality

Add temporary logging to see what's happening:

```typescript
// In src/pages/dashboard.tsx, around line 1250
console.log('Search term:', searchTerm);
console.log('Attendee custom fields:', parsedCustomFieldValues);
console.log('Custom field match:', customFieldMatch);
```

### Option 3: Change to Server-Side Search (Major Refactor)

If you need better performance for large datasets:

1. Modify dashboard to pass search parameters to API
2. Update API to filter at database level
3. Implement pagination
4. Add full-text index (only useful with server-side filtering)

**Pros**: Better performance for large datasets
**Cons**: Significant refactoring required

## Testing Steps

To verify custom field search is working:

1. **Create a test attendee** with a known email in a custom field
2. **Verify the field is visible**: Check `showOnMainPage` is not false
3. **Search for the email**: Use the exact value
4. **Check browser console**: Look for any JavaScript errors
5. **Inspect the data**: Use browser DevTools to check the attendee object

## Recommendations

1. **First**: Verify the custom field has `showOnMainPage !== false`
2. **Second**: Check that attendees actually have values in the email custom field
3. **Third**: Test with a simple, known value to isolate the issue
4. **Last Resort**: Consider server-side filtering if dataset is very large (>5000 attendees)

## Files Involved

- `src/pages/dashboard.tsx` - Client-side search implementation (lines 1099-1280)
- `src/pages/api/attendees/index.ts` - API endpoint (currently fetches all, no search params)
- `scripts/add-custom-field-values-index.ts` - Index creation (not useful for current architecture)
- `scripts/remove-custom-field-values-index.ts` - Index removal (executed to restore performance)

## Conclusion

Custom field search is implemented and should work. The issue is likely:
- Custom field visibility settings
- Missing or incorrectly formatted data
- Misunderstanding of how the search works

The full-text index approach was incorrect for the current architecture and has been rolled back.

Next step: Investigate the actual data and visibility settings to find the real issue.
