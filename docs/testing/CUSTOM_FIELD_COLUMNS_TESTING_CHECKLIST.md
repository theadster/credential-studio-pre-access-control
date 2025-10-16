# Custom Field Columns Configuration - Testing Checklist

## Overview

This checklist helps verify that the Custom Field Columns configuration feature works correctly across different scenarios.

## Pre-Testing Setup

### Prerequisites
- [ ] Migration script has been run successfully
- [ ] Development server is running
- [ ] Logged in as administrator
- [ ] Event settings exist
- [ ] At least 7-10 custom fields are configured for comprehensive testing

### Test Data Setup
1. Create test custom fields if needed:
   - At least 10 custom fields
   - Mix of field types (text, number, select, boolean)
   - Some visible, some hidden
   - Various field name lengths

## Test Cases

### 1. Default Behavior (Backward Compatibility)

#### Test 1.1: Fresh Installation
- [ ] Fresh installation defaults to 7 columns
- [ ] Attendees page displays correctly with default setting
- [ ] No errors in browser console

#### Test 1.2: Existing Installation After Migration
- [ ] Existing installation maintains current behavior
- [ ] Setting shows 7 columns as default
- [ ] No layout changes until setting is modified

### 2. Configuration UI

#### Test 2.1: Access Event Settings
- [ ] Navigate to Dashboard → Settings tab
- [ ] Click "Edit Settings" button
- [ ] Settings dialog opens successfully

#### Test 2.2: Locate Setting
- [ ] Go to "General" tab
- [ ] Scroll to "Attendee List Settings" section
- [ ] "Custom Field Columns (Desktop)" dropdown is visible
- [ ] Current value is displayed correctly
- [ ] Help text is clear and informative

#### Test 2.3: Dropdown Options
- [ ] Dropdown shows all options (3-10 columns)
- [ ] Each option has descriptive label (e.g., "7 Columns (Default)")
- [ ] Options are in ascending order
- [ ] Dropdown is styled consistently with other selects

### 3. Setting Configuration

#### Test 3.1: Change to Lower Value (5 columns)
- [ ] Select "5 Columns" from dropdown
- [ ] Click "Save Settings"
- [ ] Success notification appears
- [ ] Settings dialog closes
- [ ] Navigate to Attendees page
- [ ] Custom fields display in 5 columns on desktop
- [ ] Layout looks correct and readable

#### Test 3.2: Change to Higher Value (9 columns)
- [ ] Open Event Settings again
- [ ] Select "9 Columns" from dropdown
- [ ] Click "Save Settings"
- [ ] Success notification appears
- [ ] Navigate to Attendees page
- [ ] Custom fields display in 9 columns on desktop
- [ ] Layout looks correct (may be dense)

#### Test 3.3: Change to Minimum (3 columns)
- [ ] Select "3 Columns"
- [ ] Save and verify
- [ ] Fields are large and readable
- [ ] More rows are used for wrapping

#### Test 3.4: Change to Maximum (10 columns)
- [ ] Select "10 Columns"
- [ ] Save and verify
- [ ] Fields are compact but readable
- [ ] Maximum information density achieved

### 4. Responsive Behavior

#### Test 4.1: Desktop View (> 1024px)
- [ ] Open Attendees page on desktop
- [ ] Verify configured column count is used
- [ ] Test with 1 field visible: displays 1 column
- [ ] Test with 2-3 fields: displays 3 columns
- [ ] Test with 4-6 fields: displays 5 columns
- [ ] Test with 7-9 fields: displays min(6, configured max)
- [ ] Test with 10+ fields: displays configured max

#### Test 4.2: Tablet View (768px - 1024px)
- [ ] Resize browser to tablet width
- [ ] Verify responsive layout is used (not configured value)
- [ ] 1 field: 1 column
- [ ] 2-3 fields: 2 columns
- [ ] 4-6 fields: 3 columns
- [ ] 7+ fields: 4 columns

#### Test 4.3: Mobile View (< 768px)
- [ ] Resize browser to mobile width
- [ ] Verify all fields display in 1 column
- [ ] Layout is readable and usable
- [ ] No horizontal scrolling

#### Test 4.4: Browser Resize
- [ ] Start at desktop width
- [ ] Slowly resize to mobile
- [ ] Verify smooth transitions between breakpoints
- [ ] No layout breaks or glitches

### 5. Edge Cases

#### Test 5.1: No Custom Fields
- [ ] Hide all custom fields
- [ ] Attendees page displays correctly
- [ ] No errors or empty space issues

#### Test 5.2: One Custom Field
- [ ] Show only 1 custom field
- [ ] Displays in single column regardless of setting
- [ ] Layout looks correct

#### Test 5.3: Many Custom Fields (15+)
- [ ] Show 15+ custom fields
- [ ] All fields display correctly
- [ ] Wrapping works as expected
- [ ] Performance is acceptable

#### Test 5.4: Mixed Visibility
- [ ] Mix of visible and hidden fields
- [ ] Only visible fields are counted
- [ ] Layout adjusts correctly
- [ ] Hidden fields don't affect column count

#### Test 5.5: Long Field Names
- [ ] Custom fields with very long names
- [ ] Text wraps or truncates appropriately
- [ ] Layout doesn't break
- [ ] Readable on all column counts

#### Test 5.6: Various Field Types
- [ ] Text fields
- [ ] Number fields
- [ ] Select dropdowns
- [ ] Boolean switches
- [ ] URL links
- [ ] All types display correctly in grid

### 6. Data Persistence

#### Test 6.1: Setting Persistence
- [ ] Configure column count
- [ ] Refresh page
- [ ] Setting is maintained
- [ ] Layout is consistent

#### Test 6.2: Multiple Sessions
- [ ] Configure setting in one browser
- [ ] Open in different browser/incognito
- [ ] Setting is applied consistently
- [ ] No session-specific issues

#### Test 6.3: After Logout/Login
- [ ] Configure setting
- [ ] Logout
- [ ] Login again
- [ ] Setting is still applied
- [ ] No reset to default

### 7. Performance

#### Test 7.1: Page Load Time
- [ ] Measure page load with default setting
- [ ] Measure page load with different settings
- [ ] No significant performance difference
- [ ] Acceptable load times

#### Test 7.2: Setting Change Speed
- [ ] Change setting
- [ ] Measure time to apply
- [ ] Changes apply immediately
- [ ] No noticeable delay

#### Test 7.3: Large Dataset
- [ ] Test with 100+ attendees
- [ ] Test with 15+ custom fields
- [ ] Performance is acceptable
- [ ] No lag or freezing

### 8. Error Handling

#### Test 8.1: Invalid Values
- [ ] Try to set value outside range (if possible)
- [ ] Appropriate error handling
- [ ] Falls back to default or previous value

#### Test 8.2: Network Errors
- [ ] Simulate network failure during save
- [ ] Appropriate error message
- [ ] Setting not corrupted
- [ ] Can retry successfully

#### Test 8.3: Database Errors
- [ ] Simulate database error (if possible)
- [ ] Graceful error handling
- [ ] User is informed
- [ ] System remains stable

### 9. Browser Compatibility

#### Test 9.1: Chrome
- [ ] All features work correctly
- [ ] Layout renders properly
- [ ] No console errors

#### Test 9.2: Firefox
- [ ] All features work correctly
- [ ] Layout renders properly
- [ ] No console errors

#### Test 9.3: Safari
- [ ] All features work correctly
- [ ] Layout renders properly
- [ ] No console errors

#### Test 9.4: Edge
- [ ] All features work correctly
- [ ] Layout renders properly
- [ ] No console errors

### 10. Integration Testing

#### Test 10.1: With Custom Field Visibility
- [ ] Change field visibility
- [ ] Column count adjusts correctly
- [ ] Layout updates appropriately

#### Test 10.2: With Attendee Sorting
- [ ] Change sort field
- [ ] Column layout is maintained
- [ ] No conflicts between features

#### Test 10.3: With Search/Filter
- [ ] Search for attendees
- [ ] Column layout is maintained
- [ ] Filtered results display correctly

#### Test 10.4: With Bulk Operations
- [ ] Perform bulk edit
- [ ] Column layout is maintained
- [ ] No layout issues after bulk operations

### 11. User Experience

#### Test 11.1: Discoverability
- [ ] Setting is easy to find
- [ ] Location makes sense
- [ ] Help text is helpful

#### Test 11.2: Usability
- [ ] Dropdown is easy to use
- [ ] Options are clear
- [ ] Changes are intuitive

#### Test 11.3: Visual Feedback
- [ ] Success notification on save
- [ ] Immediate visual change on Attendees page
- [ ] No confusion about current state

#### Test 11.4: Documentation
- [ ] Help text is accurate
- [ ] User guide is comprehensive
- [ ] Examples are helpful

### 12. Accessibility

#### Test 12.1: Keyboard Navigation
- [ ] Can navigate to setting with keyboard
- [ ] Can change value with keyboard
- [ ] Can save with keyboard

#### Test 12.2: Screen Reader
- [ ] Setting is announced correctly
- [ ] Options are readable
- [ ] Help text is accessible

#### Test 12.3: Color Contrast
- [ ] Text is readable in light mode
- [ ] Text is readable in dark mode
- [ ] Meets WCAG standards

## Post-Testing Verification

### Final Checks
- [ ] No console errors throughout testing
- [ ] No visual glitches or layout breaks
- [ ] All features work as expected
- [ ] Documentation is accurate
- [ ] Migration script works correctly

### Regression Testing
- [ ] Existing features still work
- [ ] No unintended side effects
- [ ] Other settings are not affected
- [ ] Performance is maintained

## Test Results Summary

### Passed Tests
- Count: _____ / _____
- Percentage: _____%

### Failed Tests
- List any failed tests here
- Include steps to reproduce
- Note severity and impact

### Issues Found
1. Issue description
   - Severity: High/Medium/Low
   - Steps to reproduce
   - Expected vs actual behavior

### Recommendations
- Any improvements or fixes needed
- Additional testing required
- Documentation updates needed

## Sign-Off

- Tester Name: _______________
- Date: _______________
- Version Tested: _______________
- Overall Status: ☐ Pass ☐ Fail ☐ Pass with Issues

## Notes

Additional observations or comments:
