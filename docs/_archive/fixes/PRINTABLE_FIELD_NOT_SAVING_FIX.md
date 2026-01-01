# Printable Field Not Saving Fix

## Issue

The "Printable Field" toggle in the Custom Field form was not being saved or persisted. When users toggled the printable field setting and saved the custom field, the value would not be retained when reopening the form or refreshing the page.

## Root Cause

The issue was in the GET endpoint (`src/pages/api/event-settings/index.ts`) where custom fields are fetched and parsed. When mapping the database fields to the response object, the `printable` field was missing from the parsed custom fields object.

### Code Location

In the GET request handler, around line 1264:

```typescript
const parsedCustomFields = fetchedCustomFields.map((field: any) => ({
  id: field.$id,
  fieldName: field.fieldName,
  internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName),
  fieldType: field.fieldType,
  required: field.required,
  order: field.order,
  showOnMainPage: field.showOnMainPage !== undefined ? field.showOnMainPage : true,
  // printable field was MISSING here
  fieldOptions: (() => {
    if (!field.fieldOptions) return null;
    if (typeof field.fieldOptions === 'string') return JSON.parse(field.fieldOptions);
    return field.fieldOptions;
  })()
}));
```

## Solution

Added the `printable` field to the parsed custom fields object in the GET endpoint:

```typescript
const parsedCustomFields = fetchedCustomFields.map((field: any) => ({
  id: field.$id,
  fieldName: field.fieldName,
  internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName),
  fieldType: field.fieldType,
  required: field.required,
  order: field.order,
  showOnMainPage: field.showOnMainPage !== undefined ? field.showOnMainPage : true,
  printable: field.printable !== undefined ? field.printable : false, // ADDED
  fieldOptions: (() => {
    if (!field.fieldOptions) return null;
    if (typeof field.fieldOptions === 'string') return JSON.parse(field.fieldOptions);
    return field.fieldOptions;
  })()
}));
```

## Verification

The following components were already working correctly:

1. **Database Schema** (`scripts/setup-appwrite.ts`):
   - ✅ `printable` boolean attribute exists in the custom_fields collection
   - ✅ Default value is `false`

2. **Frontend Form** (`src/components/EventSettingsForm.tsx`):
   - ✅ Toggle switch correctly updates `fieldData.printable`
   - ✅ `handleSubmit` includes `printable` in `finalFieldData` via spread operator
   - ✅ Initial state sets `printable: false` as default

3. **API PUT Endpoint** (`src/pages/api/event-settings/index.ts`):
   - ✅ Detects changes to `printable` field (line ~738)
   - ✅ Saves `printable` value for modified fields (line ~765)
   - ✅ Saves `printable` value for new fields (line ~793)
   - ✅ Other parsing locations already included `printable` (lines 583, 1993)

## Impact

This was a display/retrieval issue only. The `printable` field was being saved correctly to the database, but when fetching custom fields, the value was not being included in the response. This caused:

- The toggle to always show as "off" when editing existing fields
- Users to think their changes weren't being saved
- Potential confusion about which fields were marked as printable

## Testing

To verify the fix:

1. Navigate to Event Settings → Custom Fields
2. Create or edit a custom field
3. Toggle the "Printable Field" switch to ON
4. Save the field
5. Refresh the page or close and reopen the edit dialog
6. Verify the "Printable Field" toggle shows the correct state (ON)
7. Check that the field is properly tracked for credential outdating

## Files Modified

- `src/pages/api/event-settings/index.ts` (line ~1272)
  - Added `printable` field to parsed custom fields in GET endpoint

## Related Documentation

- **Feature Implementation**: `docs/enhancements/PRINTABLE_FIELD_TRACKING_IMPLEMENTATION.md`
- **User Guide**: `docs/guides/PRINTABLE_FIELDS_USER_GUIDE.md`
- **Backward Compatibility**: `docs/testing/BACKWARD_COMPATIBILITY_TESTS_SUMMARY.md`
- **Dialog Scrolling Fix**: `docs/fixes/CUSTOM_FIELD_DIALOG_SCROLLING_FIX.md`
