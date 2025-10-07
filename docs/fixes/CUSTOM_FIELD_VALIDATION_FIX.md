# Custom Field Validation Fix

## Issue
When editing attendee records, users encountered the error: "Some custom fields no longer exist. Please refresh the page and try again."

This occurred even when the user hadn't modified any custom fields, making it impossible to save any changes to attendee data.

## Root Cause
When an attendee record was loaded for editing, it included ALL custom field values that were saved with that attendee, including values for custom fields that may have been deleted since the attendee was created.

**Example scenario:**
1. Admin creates custom field "Department" (ID: abc123)
2. Attendee is created with Department = "Sales"
3. Admin deletes the "Department" custom field
4. User tries to edit the attendee's name
5. Form loads with customFieldValues including the deleted field (abc123)
6. On save, API validates field IDs and rejects abc123 as invalid
7. User sees error even though they didn't touch custom fields

## Solution

### 1. Filter Custom Field Values on Load (`src/components/AttendeeForm.tsx`)

When loading an attendee for editing, filter out custom field values for fields that no longer exist:

```typescript
useEffect(() => {
  if (attendee) {
    // Get current custom field IDs to filter out deleted fields
    const currentCustomFieldIds = new Set(customFields.map(cf => cf.id));
    
    setFormData({
      firstName: attendee.firstName || '',
      lastName: attendee.lastName || '',
      barcodeNumber: attendee.barcodeNumber || '',
      photoUrl: attendee.photoUrl || '',
      customFieldValues: Array.isArray(attendee.customFieldValues)
        ? attendee.customFieldValues.reduce((acc: Record<string, string>, cfv: CustomFieldValue) => {
            // Only include custom field values for fields that still exist
            if (currentCustomFieldIds.has(cfv.customFieldId)) {
              acc[cfv.customFieldId] = cfv.value;
            }
            return acc;
          }, {})
        : {}
    });
  }
}, [attendee, eventSettings, customFields]);
```

**Key changes:**
- Create a Set of current custom field IDs for fast lookup
- Filter customFieldValues to only include fields that still exist
- Add `customFields` to the dependency array to re-filter if fields change

### 2. Filter Custom Field Values on Submit

Add an additional safety check when preparing data for submission:

```typescript
// Prepare custom field values for API
// Only include values for custom fields that currently exist
const currentCustomFieldIds = new Set(customFields.map(cf => cf.id));
const customFieldValues = Object.entries(formData.customFieldValues)
  .filter(([customFieldId, value]) => {
    // Filter out empty values and deleted custom fields
    return value && currentCustomFieldIds.has(customFieldId);
  })
  .map(([customFieldId, value]) => ({
    customFieldId,
    value
  }));
```

**Key changes:**
- Check that each custom field ID exists in the current custom fields list
- Filter out both empty values AND deleted custom fields
- Ensures only valid data is sent to the API

## Benefits

1. **Prevents Validation Errors**: Users can edit attendees even if custom fields have been deleted
2. **Data Cleanup**: Automatically removes references to deleted custom fields
3. **Better UX**: Users don't see confusing errors about fields they can't see
4. **Defensive Programming**: Double-checks data both on load and submit
5. **Backward Compatible**: Handles old attendee records gracefully

## Testing

### Test Case 1: Edit Attendee with Deleted Custom Field
1. Create a custom field (e.g., "Test Field")
2. Create an attendee and fill in the custom field
3. Delete the custom field
4. Edit the attendee (change name or other field)
5. Save the attendee
6. **Expected**: Save succeeds without error

### Test Case 2: Edit Attendee with Current Custom Fields
1. Create custom fields
2. Create an attendee with custom field values
3. Edit the attendee and modify a custom field value
4. Save the attendee
5. **Expected**: Save succeeds with updated values

### Test Case 3: Edit Attendee with No Custom Fields
1. Create an attendee without any custom fields
2. Edit the attendee
3. Save the attendee
4. **Expected**: Save succeeds

## Files Modified

- `src/components/AttendeeForm.tsx` - Added filtering for deleted custom fields

## Related Issues

This fix addresses a common scenario in applications where:
- Schema changes over time (fields added/removed)
- Old data references deleted schema elements
- Users need to edit old records without errors

## API Validation

The API validation in `src/pages/api/attendees/[id].ts` remains in place as a safety check. This is good practice because:
- Prevents data corruption from invalid field IDs
- Catches issues from other sources (direct API calls, bugs, etc.)
- Provides clear error messages for debugging

The client-side filtering ensures users don't encounter these validation errors during normal use.

## Future Improvements

1. **Data Migration**: Add a script to clean up deleted custom field values from all attendees
2. **Soft Delete**: Consider soft-deleting custom fields instead of hard-deleting them
3. **Field History**: Track custom field changes and show warnings when deleting fields with data
4. **Bulk Update**: Provide UI to bulk-update or clear values for deleted fields
