# Task 9: Comprehensive Functionality Testing Guide

This document provides a comprehensive manual testing guide for all role management functionality in the redesigned Roles page.

## Testing Environment Setup

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the dashboard:**
   - Open `http://localhost:3000`
   - Log in with admin credentials
   - Navigate to the "Roles" tab

3. **Prepare test data:**
   - Ensure you have at least one test user without a role
   - Have the default roles initialized (Super Administrator, Administrator, Staff, Viewer)

---

## 9.1 Role Creation Workflow Testing

### Test Case 1: Create role with all permissions enabled

**Steps:**
1. Click the "Create Role" button
2. Enter role name: "Full Access Test Role"
3. Enter description: "Test role with all permissions"
4. For each permission category (Attendees, Users, Roles, Settings, Logs, System):
   - Expand the accordion
   - Click "Select All" button
   - Verify the badge shows "X/X" (all permissions selected)
5. Click "Create Role"

**Expected Results:**
- ✅ Form submits successfully
- ✅ Success notification appears
- ✅ Dialog closes
- ✅ New role appears in the roles list
- ✅ Role card shows all permission categories as active (green dots)
- ✅ Permission count shows total number of permissions

**Requirements Covered:** 7.2, 10.3, 10.5

---

### Test Case 2: Create role with partial permissions

**Steps:**
1. Click the "Create Role" button
2. Enter role name: "Limited Access Test Role"
3. Enter description: "Test role with limited permissions"
4. Expand "Attendees" category
5. Select only:
   - View attendee list (read)
   - Create new attendees (create)
6. Expand "Logs" category
7. Select only:
   - View activity logs (read)
8. Click "Create Role"

**Expected Results:**
- ✅ Form submits successfully
- ✅ Success notification appears
- ✅ New role appears in the roles list
- ✅ Role card shows only Attendees and Logs categories as active
- ✅ Permission count shows "3" (2 attendee + 1 log permission)
- ✅ Badge in accordion shows "2/11" for Attendees, "1/4" for Logs

**Requirements Covered:** 7.2, 10.3, 10.5

---

### Test Case 3: Attempt to create role with no permissions (should fail)

**Steps:**
1. Click the "Create Role" button
2. Enter role name: "No Permissions Test Role"
3. Enter description: "This should fail"
4. Do NOT select any permissions
5. Click "Create Role"

**Expected Results:**
- ❌ Form does NOT submit
- ✅ Error alert appears at bottom of form
- ✅ Error message states: "Please select at least one permission"
- ✅ AlertTriangle icon is visible in error alert
- ✅ Dialog remains open
- ✅ Role is NOT created in the list

**Requirements Covered:** 7.2, 10.3, 10.5

---

### Test Case 4: Verify validation messages display correctly

**Steps:**
1. Click the "Create Role" button
2. Leave role name empty
3. Click "Create Role"
4. Observe error message
5. Type "Test Role" in the name field
6. Observe error clears
7. Delete the name again
8. Click "Create Role" again

**Expected Results:**
- ✅ Error appears below name field: "Role name is required"
- ✅ Error is styled with destructive color (red)
- ✅ Error clears when name is entered
- ✅ Error reappears when name is deleted and form is submitted
- ✅ Inline validation works consistently

**Requirements Covered:** 10.3, 10.5

---

### Test Case 5: Confirm role appears in list after creation

**Steps:**
1. Note the current number of roles in the list
2. Create a new role: "Verification Test Role"
3. Add at least one permission
4. Submit the form
5. Wait for success notification
6. Check the roles list

**Expected Results:**
- ✅ Role count increases by 1
- ✅ New role card appears in the list
- ✅ Role card displays correct name and description
- ✅ Role card shows correct permission count
- ✅ Role card shows creation date (today)
- ✅ Role card shows "0 users" initially

**Requirements Covered:** 7.2, 10.5

---

## 9.2 Role Editing Workflow Testing

### Test Case 1: Edit role name and description

**Steps:**
1. Hover over any non-system role card
2. Click the "Edit" button (pencil icon)
3. Change the role name to: "Updated Role Name"
4. Change the description to: "Updated description"
5. Click "Update Role"

**Expected Results:**
- ✅ Form opens with current role data pre-populated
- ✅ Changes save successfully
- ✅ Success notification appears
- ✅ Dialog closes
- ✅ Role card reflects new name and description
- ✅ Permission selections remain unchanged

**Requirements Covered:** 7.2, 4.3

---

### Test Case 2: Add permissions to existing role

**Steps:**
1. Edit a role that has limited permissions
2. Expand a category where no permissions are selected
3. Select 2-3 additional permissions
4. Click "Update Role"

**Expected Results:**
- ✅ New permissions are saved
- ✅ Permission count increases on role card
- ✅ Permission category becomes active (green dot)
- ✅ Badge shows updated count (e.g., "3/11")

**Requirements Covered:** 7.2, 4.3

---

### Test Case 3: Remove permissions from existing role

**Steps:**
1. Edit a role that has multiple permissions
2. Expand a category with selected permissions
3. Deselect 1-2 permissions
4. Click "Update Role"

**Expected Results:**
- ✅ Permissions are removed
- ✅ Permission count decreases on role card
- ✅ If all permissions in a category are removed, category becomes inactive (gray dot)
- ✅ Badge shows updated count

**Requirements Covered:** 7.2, 4.3

---

### Test Case 4: Use "Select All" and "Deselect All" buttons

**Steps:**
1. Edit any role
2. Expand "Attendees" category
3. Click "Select All"
4. Verify all switches are checked
5. Click "Deselect All"
6. Verify all switches are unchecked
7. Click "Select All" again
8. Click "Update Role"

**Expected Results:**
- ✅ "Select All" checks all switches in the category
- ✅ Badge updates to show "11/11" for Attendees
- ✅ "Deselect All" unchecks all switches
- ✅ Badge updates to show "0/11"
- ✅ Button text toggles between "Select All" and "Deselect All"
- ✅ Changes persist after save

**Requirements Covered:** 7.2, 4.3

---

### Test Case 5: Verify changes persist after save

**Steps:**
1. Edit a role and make several changes:
   - Change name
   - Add 3 permissions
   - Remove 2 permissions
2. Click "Update Role"
3. Wait for success notification
4. Edit the same role again

**Expected Results:**
- ✅ All changes are reflected in the edit form
- ✅ Name shows updated value
- ✅ Added permissions are checked
- ✅ Removed permissions are unchecked
- ✅ Permission counts are accurate

**Requirements Covered:** 7.2, 4.3

---

## 9.3 Role Deletion Workflow Testing

### Test Case 1: Delete role with no assigned users

**Steps:**
1. Create a new test role (or use one with 0 users)
2. Hover over the role card
3. Click the "Delete" button (trash icon)
4. Confirm deletion in the dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Dialog shows role name
- ✅ Dialog indicates "0 users" assigned
- ✅ After confirmation, role is deleted
- ✅ Success notification appears
- ✅ Role card is removed from the list
- ✅ Role count decreases by 1

**Requirements Covered:** 7.3, 7.4

---

### Test Case 2: Attempt to delete role with assigned users

**Steps:**
1. Assign a user to a test role
2. Hover over that role card
3. Click the "Delete" button
4. Read the confirmation dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Dialog shows warning about assigned users
- ✅ Dialog displays number of users (e.g., "1 user")
- ✅ Dialog asks for confirmation to proceed
- ✅ If confirmed, role is deleted and users lose that role
- ✅ If cancelled, role remains unchanged

**Requirements Covered:** 7.3, 7.4

---

### Test Case 3: Attempt to delete Super Administrator role

**Steps:**
1. Locate the "Super Administrator" role card
2. Hover over the card
3. Look for the delete button

**Expected Results:**
- ✅ Delete button is NOT visible for Super Administrator
- ✅ Only Edit button is shown
- ✅ System role cannot be deleted
- ✅ Other system roles (Administrator, Staff, Viewer) CAN be deleted

**Requirements Covered:** 7.3, 7.4

---

### Test Case 4: Verify role is removed from list after deletion

**Steps:**
1. Note the current role count
2. Delete a test role
3. Confirm deletion
4. Wait for success notification

**Expected Results:**
- ✅ Role card disappears from the list
- ✅ Role count decreases
- ✅ List re-renders smoothly
- ✅ No empty space or layout issues
- ✅ Other role cards remain unaffected

**Requirements Covered:** 7.3, 7.4

---

## 9.4 Permission Management Testing

### Test Case 1: Toggle individual permissions on and off

**Steps:**
1. Edit any role
2. Expand "Attendees" category
3. Click the "View attendee list" switch
4. Click it again to toggle off
5. Click it once more to toggle on
6. Repeat for 2-3 other permissions

**Expected Results:**
- ✅ Switch toggles smoothly
- ✅ Visual feedback is immediate
- ✅ Permission count badge updates in real-time
- ✅ No lag or delay in toggling
- ✅ Switch state is clearly visible (on/off)

**Requirements Covered:** 4.3, 9.4

---

### Test Case 2: Use "Select All" for entire category

**Steps:**
1. Edit any role
2. Expand "Users" category
3. Ensure some permissions are unchecked
4. Click "Select All"
5. Observe all switches

**Expected Results:**
- ✅ All switches in the category become checked
- ✅ Badge shows "4/4" (all users permissions)
- ✅ Button text changes to "Deselect All"
- ✅ Change happens instantly
- ✅ All permission labels are visible

**Requirements Covered:** 4.3, 9.4

---

### Test Case 3: Use "Deselect All" for entire category

**Steps:**
1. Edit any role
2. Expand "Roles" category
3. Click "Select All" first
4. Then click "Deselect All"
5. Observe all switches

**Expected Results:**
- ✅ All switches in the category become unchecked
- ✅ Badge shows "0/4"
- ✅ Button text changes to "Select All"
- ✅ Change happens instantly
- ✅ Category becomes inactive if saved

**Requirements Covered:** 4.3, 9.4

---

### Test Case 4: Verify permission counts update correctly

**Steps:**
1. Edit any role
2. Expand "Attendees" category (11 permissions)
3. Start with all unchecked
4. Check permissions one by one
5. Watch the badge update

**Expected Results:**
- ✅ Badge shows "0/11" initially
- ✅ Badge updates to "1/11" after first selection
- ✅ Badge updates to "2/11" after second selection
- ✅ Badge continues updating accurately
- ✅ Badge shows "11/11" when all are selected
- ✅ Badge color changes when permissions are granted (default variant)

**Requirements Covered:** 4.3, 9.4

---

### Test Case 5: Test accordion expand/collapse functionality

**Steps:**
1. Open role form
2. Click on "Attendees" accordion header
3. Observe it expands
4. Click on "Users" accordion header
5. Observe "Attendees" collapses and "Users" expands
6. Click "Users" header again
7. Observe it collapses

**Expected Results:**
- ✅ Accordion expands smoothly with animation
- ✅ Accordion collapses smoothly with animation
- ✅ Only one accordion can be open at a time (or multiple, depending on implementation)
- ✅ Chevron icon rotates when expanding/collapsing
- ✅ Content is fully visible when expanded
- ✅ No layout shifts or jumps

**Requirements Covered:** 4.3, 9.4

---

## 9.5 Responsive Behavior Testing

### Test Case 1: Mobile devices (320px, 375px, 414px widths)

**Steps:**
1. Open browser DevTools
2. Set viewport to 320px width
3. Navigate through the Roles page
4. Test all interactions
5. Repeat for 375px and 414px

**Expected Results:**
- ✅ No horizontal scrolling at any width
- ✅ Statistics cards stack in single column
- ✅ Role cards are full width and readable
- ✅ Permission grid in role cards shows 1 column
- ✅ Form uses single column layout
- ✅ Action buttons remain accessible
- ✅ Text remains readable (no truncation issues)
- ✅ Touch targets are adequately sized (min 44x44px)

**Requirements Covered:** 5.1, 5.5

---

### Test Case 2: Tablet devices (768px, 1024px widths)

**Steps:**
1. Set viewport to 768px width
2. Navigate through the Roles page
3. Test all interactions
4. Repeat for 1024px

**Expected Results:**
- ✅ Statistics cards display in 2 columns
- ✅ Role cards remain full width
- ✅ Permission grid shows 2 columns
- ✅ Form uses two column layout for basic info
- ✅ User avatars wrap properly
- ✅ All content is accessible
- ✅ No layout issues or overlaps

**Requirements Covered:** 5.1, 5.5

---

### Test Case 3: Desktop (1280px, 1440px, 1920px widths)

**Steps:**
1. Set viewport to 1280px width
2. Navigate through the Roles page
3. Test all interactions
4. Repeat for 1440px and 1920px

**Expected Results:**
- ✅ Statistics cards display in 4 columns
- ✅ Role cards are full width for readability
- ✅ Permission grid shows 3 columns
- ✅ Form uses two column layout
- ✅ User avatars display inline
- ✅ Generous spacing and comfortable layout
- ✅ No excessive whitespace

**Requirements Covered:** 5.1, 5.5

---

### Test Case 4: Verify no horizontal scrolling at any breakpoint

**Steps:**
1. Test at each breakpoint: 320px, 375px, 414px, 768px, 1024px, 1280px, 1440px, 1920px
2. Scroll vertically through entire page
3. Check for horizontal scrollbar

**Expected Results:**
- ✅ No horizontal scrollbar appears at any width
- ✅ All content fits within viewport
- ✅ No elements overflow horizontally
- ✅ Smooth vertical scrolling only

**Requirements Covered:** 5.1, 5.5

---

### Test Case 5: Ensure all text remains readable at all sizes

**Steps:**
1. Test at smallest viewport (320px)
2. Read all text on the page
3. Check role names, descriptions, permission labels
4. Verify button text is readable
5. Check form labels and inputs

**Expected Results:**
- ✅ All text is legible (minimum 14px font size)
- ✅ No text is cut off or truncated inappropriately
- ✅ Line heights provide adequate spacing
- ✅ Contrast is sufficient for readability
- ✅ No text overlaps other elements

**Requirements Covered:** 5.1, 5.5

---

## 9.6 Dark Mode Appearance Testing

### Test Case 1: Switch between light and dark modes

**Steps:**
1. Start in light mode
2. Navigate to Roles page
3. Switch to dark mode (using system theme toggle)
4. Observe all elements
5. Switch back to light mode

**Expected Results:**
- ✅ Theme switches smoothly without flash
- ✅ All elements adapt to dark mode
- ✅ No elements remain in light mode colors
- ✅ Transition is smooth and professional

**Requirements Covered:** 5.4, 8.1

---

### Test Case 2: Verify all colors have proper contrast

**Steps:**
1. Switch to dark mode
2. Check text on backgrounds
3. Check button colors
4. Check border visibility
5. Use browser DevTools to check contrast ratios

**Expected Results:**
- ✅ All text meets WCAG AA contrast ratio (4.5:1)
- ✅ Buttons are clearly visible
- ✅ Borders are visible but not harsh
- ✅ Icons are clearly visible
- ✅ No readability issues

**Requirements Covered:** 5.4, 8.1

---

### Test Case 3: Test gradient backgrounds in dark mode

**Steps:**
1. Switch to dark mode
2. Observe statistics cards
3. Observe role cards
4. Check gradient transitions

**Expected Results:**
- ✅ Gradients are visible and attractive
- ✅ Gradients use appropriate dark mode colors
- ✅ Gradients don't appear washed out
- ✅ Color combinations are harmonious
- ✅ Emerald, purple, amber, blue gradients all work well

**Requirements Covered:** 5.4, 8.1

---

### Test Case 4: Check hover states in dark mode

**Steps:**
1. Switch to dark mode
2. Hover over role cards
3. Hover over buttons
4. Hover over permission toggles
5. Hover over action buttons

**Expected Results:**
- ✅ Hover effects are visible
- ✅ Hover colors are appropriate for dark mode
- ✅ Scale effects work smoothly
- ✅ Shadow effects are visible
- ✅ No harsh or jarring color changes

**Requirements Covered:** 5.4, 8.1

---

### Test Case 5: Ensure all text is readable

**Steps:**
1. Switch to dark mode
2. Read through all text on the page
3. Check role names, descriptions
4. Check permission labels
5. Check form labels and placeholders

**Expected Results:**
- ✅ All text is easily readable
- ✅ No eye strain from poor contrast
- ✅ Muted text is still legible
- ✅ Primary text stands out appropriately
- ✅ No text blends into background

**Requirements Covered:** 5.4, 8.1

---

## 9.7 Accessibility Compliance Testing

### Test Case 1: Navigate entire interface using only keyboard

**Steps:**
1. Start at the top of the Roles page
2. Use Tab key to navigate through all interactive elements
3. Use Shift+Tab to navigate backwards
4. Use Enter/Space to activate buttons
5. Use Arrow keys in accordion
6. Use Escape to close dialogs

**Expected Results:**
- ✅ Tab order is logical and predictable
- ✅ All interactive elements are reachable
- ✅ Focus indicators are clearly visible
- ✅ Enter/Space activates buttons and toggles
- ✅ Escape closes dialogs
- ✅ Arrow keys navigate accordion items
- ✅ No keyboard traps

**Requirements Covered:** 5.2, 5.3, 5.4

---

### Test Case 2: Test with screen reader (VoiceOver, NVDA, or JAWS)

**Steps:**
1. Enable screen reader
2. Navigate to Roles page
3. Listen to announcements for each element
4. Navigate through role cards
5. Open and interact with role form
6. Toggle permissions

**Expected Results:**
- ✅ Page title is announced
- ✅ Role cards are announced with role name and user count
- ✅ Action buttons are announced with clear labels
- ✅ Form fields are announced with labels
- ✅ Permission toggles are announced with descriptions
- ✅ Error messages are announced
- ✅ Success notifications are announced
- ✅ All interactive elements have meaningful labels

**Requirements Covered:** 5.2, 5.3, 5.4

---

### Test Case 3: Verify all interactive elements have focus indicators

**Steps:**
1. Use keyboard to navigate through page
2. Observe focus indicators on:
   - Buttons
   - Inputs
   - Switches
   - Accordion triggers
   - Action buttons

**Expected Results:**
- ✅ All interactive elements show focus ring
- ✅ Focus ring is clearly visible (2px, primary color)
- ✅ Focus ring has adequate offset
- ✅ Focus ring is visible in both light and dark modes
- ✅ Focus ring doesn't obscure content

**Requirements Covered:** 5.2, 5.3, 5.4

---

### Test Case 4: Check color contrast ratios meet WCAG AA standards

**Steps:**
1. Use browser DevTools or contrast checker tool
2. Check contrast ratios for:
   - Body text on background (4.5:1 minimum)
   - Headings on background (4.5:1 minimum)
   - Button text on button background (4.5:1 minimum)
   - Muted text on background (4.5:1 minimum)
3. Test in both light and dark modes

**Expected Results:**
- ✅ All text meets WCAG AA (4.5:1 for normal text)
- ✅ Large text meets WCAG AA (3:1 for large text)
- ✅ Interactive elements are distinguishable
- ✅ No contrast issues in either theme

**Requirements Covered:** 5.2, 5.3, 5.4

---

### Test Case 5: Test with color blindness simulators

**Steps:**
1. Use browser extension or tool to simulate:
   - Protanopia (red-blind)
   - Deuteranopia (green-blind)
   - Tritanopia (blue-blind)
   - Achromatopsia (total color blindness)
2. Navigate through Roles page
3. Verify all information is still accessible

**Expected Results:**
- ✅ Information is not conveyed by color alone
- ✅ Icons accompany color indicators
- ✅ Text labels provide context
- ✅ Status indicators use shapes/icons, not just colors
- ✅ All functionality remains accessible
- ✅ Green/red status dots have additional indicators

**Requirements Covered:** 5.2, 5.3, 5.4

---

## Testing Checklist Summary

### Role Creation (9.1)
- [ ] Create role with all permissions
- [ ] Create role with partial permissions
- [ ] Attempt to create role with no permissions (should fail)
- [ ] Verify validation messages
- [ ] Confirm role appears in list

### Role Editing (9.2)
- [ ] Edit role name and description
- [ ] Add permissions to existing role
- [ ] Remove permissions from existing role
- [ ] Use "Select All" and "Deselect All"
- [ ] Verify changes persist

### Role Deletion (9.3)
- [ ] Delete role with no users
- [ ] Attempt to delete role with users
- [ ] Attempt to delete Super Administrator (should be prevented)
- [ ] Verify role is removed from list

### Permission Management (9.4)
- [ ] Toggle individual permissions
- [ ] Use "Select All" for category
- [ ] Use "Deselect All" for category
- [ ] Verify permission counts update
- [ ] Test accordion expand/collapse

### Responsive Behavior (9.5)
- [ ] Test mobile (320px, 375px, 414px)
- [ ] Test tablet (768px, 1024px)
- [ ] Test desktop (1280px, 1440px, 1920px)
- [ ] Verify no horizontal scrolling
- [ ] Ensure text readability

### Dark Mode (9.6)
- [ ] Switch between light and dark modes
- [ ] Verify color contrast
- [ ] Test gradient backgrounds
- [ ] Check hover states
- [ ] Ensure text readability

### Accessibility (9.7)
- [ ] Navigate with keyboard only
- [ ] Test with screen reader
- [ ] Verify focus indicators
- [ ] Check color contrast ratios
- [ ] Test with color blindness simulators

---

## Test Results Template

Use this template to document your test results:

```
Test Date: [DATE]
Tester: [NAME]
Browser: [Chrome/Firefox/Safari/Edge]
OS: [macOS/Windows/Linux]

Test Case: [Test Case Number and Name]
Status: [PASS/FAIL]
Notes: [Any observations or issues]
Screenshots: [If applicable]
```

---

## Known Issues / Notes

Document any issues found during testing here:

1. [Issue description]
   - Severity: [Low/Medium/High/Critical]
   - Steps to reproduce:
   - Expected behavior:
   - Actual behavior:

---

## Sign-off

Once all tests pass, sign off here:

- [ ] All role creation tests pass
- [ ] All role editing tests pass
- [ ] All role deletion tests pass
- [ ] All permission management tests pass
- [ ] All responsive behavior tests pass
- [ ] All dark mode tests pass
- [ ] All accessibility tests pass

**Tested by:** _______________
**Date:** _______________
**Approved by:** _______________
**Date:** _______________
