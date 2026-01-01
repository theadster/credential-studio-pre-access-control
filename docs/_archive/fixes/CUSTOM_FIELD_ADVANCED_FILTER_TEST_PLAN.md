# Custom Field Advanced Filter Searchability - Test Plan

## Test Scenario

Verify that custom fields with "Show on Main Page" disabled are still searchable through Advanced Filters.

## Prerequisites

1. Access to credential.studio dashboard
2. Admin or user with permission to manage event settings
3. Permission to create and edit attendees

## Test Steps

### Step 1: Create a Hidden Custom Field

1. Navigate to Dashboard → Settings tab
2. Click "Add Custom Field"
3. Configure the field:
   - Field Name: "Internal Notes"
   - Field Type: "Text"
   - Required: No
   - **Show on Main Page: Disabled (toggle OFF)**
4. Click "Save Changes"

### Step 2: Add Test Data

1. Navigate to Dashboard → Attendees tab
2. Click "Add Attendee"
3. Fill in basic information:
   - First Name: "Test"
   - Last Name: "User"
   - Barcode: (auto-generated)
4. Scroll to custom fields section
5. Find "Internal Notes" field
6. Enter value: "Secret information for testing"
7. Click "Save"

### Step 3: Verify Main Table Display

1. Return to Attendees tab
2. Locate the test attendee in the table
3. **Expected**: "Internal Notes" field should NOT appear as a column in the table
4. **Expected**: Only fields with "Show on Main Page" enabled should be visible

### Step 4: Test Advanced Filters

1. Click "Advanced Filters" button
2. Scroll through the filter fields
3. **Expected**: "Internal Notes" field SHOULD appear in the Advanced Filters dialog
4. **Expected**: Field should have search operators (Contains, Equals, etc.)

### Step 5: Search Using Hidden Field

1. In Advanced Filters dialog, find "Internal Notes" field
2. Select operator: "Contains"
3. Enter search value: "Secret"
4. Click "Apply Filters"
5. **Expected**: Test attendee should appear in search results
6. **Expected**: Search results should show the attendee with matching hidden field value

### Step 6: Verify Search Operators

Test different operators for the hidden field:

1. **Contains**: "Secret" → Should find attendee
2. **Equals**: "Secret information for testing" → Should find attendee
3. **Starts With**: "Secret" → Should find attendee
4. **Ends With**: "testing" → Should find attendee
5. **Is Empty**: Should NOT find attendee (field has value)
6. **Is Not Empty**: Should find attendee

### Step 7: Test Multiple Hidden Fields

1. Create another hidden custom field: "Department Code"
2. Add value to test attendee: "DEPT-001"
3. Use Advanced Filters to search both hidden fields:
   - Internal Notes: Contains "Secret"
   - Department Code: Equals "DEPT-001"
4. **Expected**: Attendee should be found when both conditions match

### Step 8: Verify Edit Form Display

1. Click "Edit" on the test attendee
2. **Expected**: Hidden fields SHOULD appear in the edit form
3. **Expected**: All custom fields (visible and hidden) should be editable
4. Modify "Internal Notes" value
5. Save changes
6. **Expected**: Changes should be saved successfully

## Expected Results Summary

| Feature | Expected Behavior | Status |
|---------|------------------|--------|
| Main Table Display | Hidden fields NOT shown as columns | ✅ |
| Advanced Filters Dialog | Hidden fields ARE shown in filter options | ✅ |
| Search Functionality | Hidden fields ARE searchable | ✅ |
| Search Operators | All operators work for hidden fields | ✅ |
| Edit Form | Hidden fields ARE editable | ✅ |
| Data Storage | Hidden field values are saved | ✅ |

## Edge Cases to Test

### Edge Case 1: No Value in Hidden Field
1. Create attendee without value in hidden field
2. Search using "Is Empty" operator
3. **Expected**: Attendee should be found

### Edge Case 2: Multiple Attendees with Same Hidden Value
1. Create 3 attendees with same hidden field value
2. Search using that value
3. **Expected**: All 3 attendees should appear in results

### Edge Case 3: Toggle Visibility After Data Entry
1. Create visible field with data
2. Toggle "Show on Main Page" to OFF
3. **Expected**: Field disappears from table but remains searchable
4. Toggle back to ON
5. **Expected**: Field reappears in table

### Edge Case 4: Boolean Hidden Field
1. Create boolean field with "Show on Main Page" disabled
2. Set value to "Yes" for test attendee
3. Search using Advanced Filters
4. **Expected**: Boolean field appears in filters with Yes/No options
5. **Expected**: Search finds attendee correctly

### Edge Case 5: Select Hidden Field
1. Create select field with options, "Show on Main Page" disabled
2. Set value for test attendee
3. Search using Advanced Filters
4. **Expected**: Select field appears with dropdown of options
5. **Expected**: Search finds attendee by selected value

## Troubleshooting

### Issue: Hidden field not appearing in Advanced Filters

**Possible Causes:**
1. Browser cache - Clear cache and reload
2. Event settings not loaded - Check browser console for API errors
3. Permission issue - Verify user has access to event settings

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Check browser console for errors
3. Verify `/api/event-settings` returns all custom fields

### Issue: Search not finding attendee with hidden field value

**Possible Causes:**
1. Value mismatch - Check exact value in database
2. Operator mismatch - Try different operators
3. Case sensitivity - Try different case combinations

**Solution:**
1. Edit attendee to verify exact value
2. Use "Contains" operator for partial matches
3. Check browser console for filter state

## Success Criteria

✅ All test steps pass without errors
✅ Hidden fields appear in Advanced Filters
✅ Hidden fields are searchable with all operators
✅ Hidden fields do NOT appear in main table
✅ Hidden fields remain editable in forms
✅ All edge cases handled correctly

## Notes

- The `showOnMainPage` setting is purely a UI display preference
- It does NOT affect data storage or search functionality
- All custom fields are always stored and retrievable
- This design allows flexible UI while maintaining full search capability
