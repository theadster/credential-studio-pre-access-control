# Task 10: Compatibility Testing Guide

## Overview
This guide provides step-by-step instructions for manually testing all compatibility requirements to ensure the enhanced attendee inline display doesn't break any existing functionality.

---

## Prerequisites

### Test Environment Setup
1. **Database**: Ensure you have test data with:
   - Multiple attendees (at least 30 for pagination testing)
   - Attendees with and without photos
   - Attendees with and without credentials
   - Attendees with various credential statuses (current, outdated, none)
   - Custom fields with different visibility settings (`showOnMainPage: true/false`)
   - At least 6 custom fields to test grid layouts

2. **User Roles**: Test with different user roles:
   - Super Administrator (full permissions)
   - Administrator (most permissions)
   - Staff (limited permissions)
   - Viewer (read-only)

3. **Browser**: Test in your primary browser (Chrome, Firefox, Safari, or Edge)

---

## Test 1: Click Name Opens Edit Form with All Fields

### Objective
Verify that clicking an attendee's name opens the edit form with ALL fields, including those marked as hidden (`showOnMainPage: false`).

### Steps
1. Navigate to the Attendees tab
2. Identify an attendee in the list
3. Click on the attendee's name (not the checkbox or actions dropdown)
4. **Expected Result**: Edit form opens
5. Verify the form contains:
   - All standard fields (First Name, Last Name, Barcode, Photo, Notes)
   - ALL custom fields (including those with `showOnMainPage: false`)
6. Check that hidden fields are editable in the form
7. Close the form without saving

### Pass Criteria
- ✅ Form opens when name is clicked
- ✅ All standard fields are present
- ✅ All custom fields are present (including hidden ones)
- ✅ Hidden fields are editable
- ✅ Form loads with current attendee data

### Troubleshooting
- **Form doesn't open**: Check if you have `attendees.update` permission
- **Missing fields**: Verify API returns full data at `/api/attendees/${id}`
- **Hidden fields missing**: Check AttendeeForm component renders all fields

---

## Test 2: Bulk Selection Checkboxes Work Correctly

### Objective
Verify that individual and bulk selection checkboxes function correctly.

### Steps

#### Individual Selection
1. Navigate to the Attendees tab
2. Click the checkbox next to an attendee
3. **Expected Result**: Checkbox becomes checked, row highlights
4. Click the checkbox again
5. **Expected Result**: Checkbox unchecks, row highlight removes
6. Select multiple attendees individually
7. **Expected Result**: All selected attendees show as checked

#### Select All on Page
1. Click the header checkbox (in the table header)
2. **Expected Result**: All attendees on current page become selected
3. Navigate to page 2
4. **Expected Result**: Attendees on page 2 are not selected
5. Navigate back to page 1
6. **Expected Result**: Attendees on page 1 remain selected
7. Click header checkbox again
8. **Expected Result**: All attendees on page 1 become unselected

#### Indeterminate State
1. Select 2-3 attendees individually (not all on page)
2. **Expected Result**: Header checkbox shows indeterminate state (dash/minus)
3. Click header checkbox once
4. **Expected Result**: All attendees on page become selected
5. Click header checkbox again
6. **Expected Result**: All attendees on page become unselected

### Pass Criteria
- ✅ Individual checkboxes toggle correctly
- ✅ Selected rows show visual highlight
- ✅ Header checkbox selects all on current page
- ✅ Indeterminate state shows for partial selection
- ✅ Selection persists when navigating between pages
- ✅ Selection count displays correctly ("X selected")

### Troubleshooting
- **Checkboxes don't work**: Check `selectedAttendees` state management
- **Selection doesn't persist**: Verify state isn't reset on page change
- **Visual highlight missing**: Check `data-state="selected"` attribute

---

## Test 3: Search and Filters Continue to Work

### Objective
Verify that basic search, photo filter, and advanced search all function correctly.

### Steps

#### Basic Search
1. Navigate to the Attendees tab
2. Type a first name in the search box
3. **Expected Result**: List filters to show only matching attendees
4. Clear the search
5. **Expected Result**: Full list returns
6. Search by last name
7. **Expected Result**: List filters correctly
8. Search by barcode number
9. **Expected Result**: List filters correctly

#### Photo Filter
1. Click the photo filter dropdown
2. Select "With Photo"
3. **Expected Result**: Only attendees with photos show
4. Select "Without Photo"
5. **Expected Result**: Only attendees without photos show
6. Select "All"
7. **Expected Result**: All attendees show

#### Advanced Search
1. Click "Advanced Search" button
2. Enter a first name with operator "Contains"
3. Enter a last name with operator "Starts With"
4. Select a photo filter
5. Enter a custom field value
6. Click "Apply Search"
7. **Expected Result**: List filters to match all criteria
8. Click "Clear Filters"
9. **Expected Result**: All filters reset, full list returns

### Pass Criteria
- ✅ Basic search filters by firstName, lastName, barcode
- ✅ Photo filter works for all three options
- ✅ Advanced search applies multiple filters
- ✅ All search operators work (contains, equals, startsWith, endsWith, isEmpty, isNotEmpty)
- ✅ Custom field search works for all field types
- ✅ Clear filters resets all search criteria
- ✅ Search results update within 500ms

### Troubleshooting
- **Search doesn't filter**: Check `filteredAttendees` logic
- **Slow performance**: Verify filtering logic is optimized
- **Custom fields not searchable**: Check advanced search includes custom fields

---

## Test 4: Pagination Maintains Behavior

### Objective
Verify that pagination works correctly with 25 records per page.

### Steps
1. Navigate to the Attendees tab
2. Verify the page shows "Page 1 of X" (where X is total pages)
3. **Expected Result**: First 25 attendees display
4. Click "Next" button
5. **Expected Result**: Page 2 displays, showing attendees 26-50
6. Click "Previous" button
7. **Expected Result**: Page 1 displays again
8. Click directly on page number (e.g., page 3)
9. **Expected Result**: Page 3 displays
10. Apply a search filter that reduces results to < 25
11. **Expected Result**: Pagination shows "Page 1 of 1"
12. Clear the filter
13. **Expected Result**: Pagination returns to full page count

### Pass Criteria
- ✅ 25 records per page consistently
- ✅ Page navigation buttons work correctly
- ✅ Direct page number selection works
- ✅ Pagination updates when filters applied
- ✅ Current page indicator shows correctly
- ✅ Previous/Next buttons disable appropriately

### Troubleshooting
- **Wrong number of records**: Check `recordsPerPage` constant (should be 25)
- **Pagination doesn't update**: Verify `totalPages` calculation
- **Page doesn't change**: Check `currentPage` state management

---

## Test 5: Actions Dropdown Works Correctly

### Objective
Verify that all actions in the dropdown menu function correctly.

### Steps

#### Generate Credential
1. Navigate to an attendee without a credential
2. Click the actions dropdown (three dots)
3. Click "Generate Credential"
4. **Expected Result**: 
   - Loading spinner shows
   - Credential generates
   - Success message displays
   - Credential icon appears in Credential column
   - Status badge shows "CURRENT"

#### Clear Credential
1. Navigate to an attendee with a credential
2. Click the actions dropdown
3. Click "Clear Credential"
4. **Expected Result**:
   - Confirmation dialog appears
   - After confirming, credential is removed
   - Credential icon disappears
   - Status badge shows "NONE"

#### Edit
1. Click the actions dropdown for any attendee
2. Click "Edit"
3. **Expected Result**:
   - Edit form opens
   - All fields (including hidden) are present
   - Form is populated with current data

#### Delete
1. Click the actions dropdown for any attendee
2. Click "Delete"
3. **Expected Result**:
   - Confirmation dialog appears
   - After confirming, attendee is deleted
   - List refreshes without the deleted attendee

### Pass Criteria
- ✅ Dropdown opens when clicking three dots icon
- ✅ All actions appear based on permissions
- ✅ Generate Credential creates credential successfully
- ✅ Clear Credential removes credential successfully
- ✅ Edit opens form with all fields
- ✅ Delete removes attendee after confirmation
- ✅ Loading states show during async operations
- ✅ Dropdown closes after action selection

### Troubleshooting
- **Dropdown doesn't open**: Check `dropdownStates` state management
- **Actions missing**: Verify user has appropriate permissions
- **Actions don't work**: Check handler functions are called correctly

---

## Test 6: Real-time Updates Refresh Display Correctly

### Objective
Verify that changes made in another browser tab/window automatically update the display.

### Steps
1. Open the dashboard in two browser tabs/windows
2. In Tab 1, navigate to the Attendees tab
3. In Tab 2, navigate to the Attendees tab
4. In Tab 2, edit an attendee (change first name)
5. Save the changes
6. **Expected Result**: Tab 1 automatically updates to show the new name (within 2-3 seconds)
7. In Tab 2, delete an attendee
8. **Expected Result**: Tab 1 automatically removes the deleted attendee
9. In Tab 2, add a new attendee
10. **Expected Result**: Tab 1 automatically shows the new attendee

### Pass Criteria
- ✅ Updates appear automatically without manual refresh
- ✅ Updates appear within 2-3 seconds
- ✅ Current page and selection state maintained
- ✅ No errors in console
- ✅ Display shows correct data after update

### Troubleshooting
- **Updates don't appear**: Check Appwrite Realtime subscription is active
- **Slow updates**: Verify debouncing delay (should be 2 seconds)
- **Console errors**: Check Appwrite connection and permissions

---

## Test 7: Permission Checks Control Access Appropriately

### Objective
Verify that users only see and can perform actions they have permission for.

### Steps

#### Test with Super Administrator
1. Log in as Super Administrator
2. **Expected Result**: All tabs visible, all actions available

#### Test with Staff Role
1. Log in as Staff user
2. Navigate to Attendees tab
3. **Expected Result**: Can view attendees
4. Click an attendee name
5. **Expected Result**: Can edit if has `attendees.update` permission
6. Open actions dropdown
7. **Expected Result**: Only actions with permissions appear
8. Try to access Users tab
9. **Expected Result**: Tab hidden if no `users.read` permission

#### Test with Viewer Role
1. Log in as Viewer user
2. Navigate to Attendees tab
3. **Expected Result**: Can view attendees
4. Click an attendee name
5. **Expected Result**: Button disabled if no `attendees.update` permission
6. Open actions dropdown
7. **Expected Result**: Only "View" actions available (no Edit/Delete)
8. Try to access Settings tab
9. **Expected Result**: Tab hidden if no `eventSettings.read` permission

### Pass Criteria
- ✅ Tabs only visible with appropriate permissions
- ✅ Actions only available with appropriate permissions
- ✅ Buttons disabled when no permission
- ✅ Dropdown items hidden when no permission
- ✅ No console errors when accessing restricted features
- ✅ Appropriate error messages if attempting restricted actions

### Troubleshooting
- **All actions visible**: Check `hasPermission` function is called correctly
- **Tabs not hidden**: Verify `canAccessTab` function works
- **Errors on restricted access**: Check permission checks in API routes

---

## Test 8: Hidden Fields Don't Appear in Display

### Objective
Verify that custom fields with `showOnMainPage: false` don't appear in the attendee table.

### Steps

#### Setup
1. Navigate to Event Settings
2. Create or edit a custom field
3. Set `showOnMainPage` to `false`
4. Save the settings
5. Navigate back to Attendees tab

#### Verification
1. Look at the attendee rows in the table
2. **Expected Result**: The hidden field does NOT appear under any attendee name
3. Count the visible custom fields
4. **Expected Result**: Count matches number of fields with `showOnMainPage !== false`
5. Click an attendee name to open edit form
6. **Expected Result**: Hidden field DOES appear in the edit form

### Pass Criteria
- ✅ Hidden fields don't appear in table display
- ✅ Only visible fields show under attendee names
- ✅ Hidden fields appear in edit form
- ✅ Display updates automatically when visibility changes

### Troubleshooting
- **Hidden fields still visible**: Check `visibleCustomFields` useMemo filter
- **All fields hidden**: Verify `showOnMainPage !== false` logic (not `=== true`)
- **Display doesn't update**: Check real-time subscription for settings changes

---

## Test 9: Hidden Fields Appear in Edit Form

### Objective
Verify that ALL custom fields (including hidden ones) appear in the edit form.

### Steps
1. Ensure you have at least one custom field with `showOnMainPage: false`
2. Navigate to Attendees tab
3. Click an attendee name to open edit form
4. **Expected Result**: Form opens with all fields
5. Scroll through the form
6. **Expected Result**: Hidden custom field is present and editable
7. Edit the hidden field value
8. Save the form
9. **Expected Result**: Changes save successfully
10. Reopen the form
11. **Expected Result**: Hidden field shows updated value

### Pass Criteria
- ✅ All custom fields appear in edit form
- ✅ Hidden fields are editable
- ✅ Hidden field values save correctly
- ✅ Hidden field values persist after save
- ✅ No visual distinction between hidden and visible fields in form

### Troubleshooting
- **Hidden fields missing**: Check AttendeeForm doesn't filter by `showOnMainPage`
- **Can't edit hidden fields**: Verify form inputs are not disabled
- **Values don't save**: Check API saves all custom field values

---

## Test 10: Hidden Fields Included in Exports

### Objective
Verify that exported data includes ALL custom fields, including hidden ones.

### Steps
1. Ensure you have at least one custom field with `showOnMainPage: false`
2. Navigate to Attendees tab
3. Click "Export" button
4. Select "Export All" or "Export Filtered"
5. Choose CSV format
6. Download the export
7. Open the CSV file
8. **Expected Result**: CSV contains columns for ALL custom fields
9. Verify hidden field column is present
10. **Expected Result**: Hidden field data is included
11. Check that values match what's in the database

### Pass Criteria
- ✅ Export includes all standard fields
- ✅ Export includes all custom fields (visible and hidden)
- ✅ Hidden field column is present in export
- ✅ Hidden field values are correct
- ✅ Export format is valid CSV/Excel

### Troubleshooting
- **Hidden fields missing**: Check export logic doesn't filter by `showOnMainPage`
- **Wrong values**: Verify export fetches complete attendee data
- **Export fails**: Check API endpoint returns all fields

---

## Regression Testing Checklist

After completing all tests above, verify these additional scenarios:

### Data Integrity
- [ ] No data loss when editing attendees
- [ ] Custom field values persist correctly
- [ ] Photo URLs remain valid
- [ ] Credential URLs remain valid
- [ ] Barcode numbers remain unique

### Performance
- [ ] Page loads within 3 seconds
- [ ] Search results appear within 500ms
- [ ] Pagination is smooth
- [ ] No memory leaks (check browser dev tools)
- [ ] Smooth scrolling with 100+ attendees

### Accessibility
- [ ] All interactive elements keyboard accessible
- [ ] Focus states visible
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets WCAG AA standards
- [ ] No keyboard traps

### Responsive Design
- [ ] Works on mobile (375px width)
- [ ] Works on tablet (768px width)
- [ ] Works on desktop (1920px width)
- [ ] Custom field grid adapts to screen size
- [ ] All features accessible on mobile

### Dark Mode
- [ ] All elements visible in dark mode
- [ ] Proper contrast in dark mode
- [ ] Hover states work in dark mode
- [ ] Status badges readable in dark mode

---

## Bug Reporting Template

If you find any issues during testing, use this template:

```markdown
### Bug Report

**Test**: [Test number and name]
**Severity**: [Critical / High / Medium / Low]
**Browser**: [Chrome / Firefox / Safari / Edge]
**User Role**: [Super Admin / Admin / Staff / Viewer]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happened]

**Screenshots**:
[Attach screenshots if applicable]

**Console Errors**:
[Copy any console errors]

**Additional Notes**:
[Any other relevant information]
```

---

## Test Completion Checklist

- [ ] Test 1: Click name opens edit form - PASSED
- [ ] Test 2: Bulk selection checkboxes - PASSED
- [ ] Test 3: Search and filters - PASSED
- [ ] Test 4: Pagination - PASSED
- [ ] Test 5: Actions dropdown - PASSED
- [ ] Test 6: Real-time updates - PASSED
- [ ] Test 7: Permission checks - PASSED
- [ ] Test 8: Hidden fields don't appear in display - PASSED
- [ ] Test 9: Hidden fields appear in edit form - PASSED
- [ ] Test 10: Hidden fields included in exports - PASSED
- [ ] Regression testing - PASSED
- [ ] All bugs reported and resolved

---

## Sign-off

**Tester Name**: ___________________________
**Date**: ___________________________
**Result**: [ ] PASS [ ] FAIL
**Notes**: ___________________________

---

**Document Version**: 1.0
**Last Updated**: December 10, 2025
