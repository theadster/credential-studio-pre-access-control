# Task 6: Visual Separation - Testing Guide

## Overview
This guide provides step-by-step instructions for manually testing the visual separation enhancements for the custom fields section in the attendees table.

## Prerequisites
- Development server running (`npm run dev`)
- Access to the dashboard with attendee data
- At least one attendee with custom field values
- Browser developer tools available

## Test Scenarios

### Test 1: Visual Separation Verification
**Objective:** Verify that the custom fields section has proper visual separation from the name

**Steps:**
1. Navigate to the Dashboard → Attendees tab
2. Locate an attendee row with custom fields
3. Observe the spacing between the name and custom fields section

**Expected Results:**
- ✅ There should be visible space (12px) between the name and the border separator
- ✅ A subtle horizontal border line should separate the name from custom fields
- ✅ There should be space (12px) between the border and the first custom field
- ✅ The separation should be consistent across all attendee rows

**Visual Checklist:**
```
Name + Badge
   ↓ (12px space - mt-3)
─────────────── (border line)
   ↓ (12px space - pt-3)
Custom Fields
   ↓ (8px space - mb-2)
```

### Test 2: Spacing Consistency
**Objective:** Verify spacing is consistent across different attendee rows

**Steps:**
1. Scroll through multiple attendee rows
2. Compare the spacing between name and custom fields across different rows
3. Check rows with different numbers of custom fields (1, 2, 3, 4+)

**Expected Results:**
- ✅ Spacing should be identical across all rows
- ✅ Border position should be consistent
- ✅ No variation in spacing regardless of custom field count

### Test 3: Column Layout Structure
**Objective:** Verify each custom field uses proper column layout

**Steps:**
1. Inspect a custom field item in the browser developer tools
2. Check the CSS classes applied to the field container
3. Verify the label and value are stacked vertically

**Expected Results:**
- ✅ Field container has `flex flex-col` classes
- ✅ Label and value are stacked vertically
- ✅ Small gap (2px) between label and value (`space-y-0.5`)
- ✅ Label is uppercase with tracking

**Developer Tools Check:**
```html
<div class="flex flex-col space-y-0.5">
  <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
    FIELD NAME
  </span>
  <span class="text-sm font-medium text-foreground">
    Field Value
  </span>
</div>
```

### Test 4: Border Visibility
**Objective:** Verify the border separator is visible but subtle

**Steps:**
1. View an attendee row with custom fields
2. Check the border line between name and custom fields
3. Test in both light and dark modes

**Expected Results:**
- ✅ Border is visible in light mode (subtle gray)
- ✅ Border is visible in dark mode (subtle light gray)
- ✅ Border has 50% opacity for subtlety
- ✅ Border spans the full width of the name cell

**Light Mode:**
- Border should be a light gray color
- Should be visible but not overpowering

**Dark Mode:**
- Border should be a lighter gray for contrast
- Should maintain visibility without being harsh

### Test 5: Responsive Spacing
**Objective:** Verify spacing works correctly at different screen sizes

**Steps:**
1. Test at mobile width (375px)
2. Test at tablet width (768px)
3. Test at desktop width (1440px)
4. Use browser developer tools to resize viewport

**Expected Results:**
- ✅ Spacing remains consistent at all screen sizes
- ✅ Border separator maintains position
- ✅ No layout shifts when resizing
- ✅ Custom fields grid adapts while maintaining spacing

**Responsive Breakpoints:**
- **Mobile (< 768px)**: Single column, spacing maintained
- **Tablet (768px - 1024px)**: 2 columns max, spacing maintained
- **Desktop (> 1024px)**: Full grid, spacing maintained

### Test 6: Visual Hierarchy
**Objective:** Verify the spacing creates clear visual hierarchy

**Steps:**
1. View multiple attendee rows
2. Assess how easy it is to distinguish name from custom fields
3. Check if the separation improves readability

**Expected Results:**
- ✅ Name section is clearly distinct from custom fields
- ✅ Border provides clear visual break
- ✅ Easy to scan and identify different sections
- ✅ Professional and polished appearance

**Hierarchy Assessment:**
1. Name should be the primary focus (larger, bold)
2. Border should provide clear separation
3. Custom fields should be secondary but organized
4. Overall layout should feel balanced

### Test 7: Edge Cases
**Objective:** Test spacing with various edge cases

**Test Cases:**

#### 7.1: No Custom Fields
**Steps:**
1. Find an attendee with no custom fields
2. Verify no border or spacing is shown

**Expected:**
- ✅ No border separator appears
- ✅ No extra spacing below name
- ✅ Clean appearance without custom fields section

#### 7.2: One Custom Field
**Steps:**
1. Find an attendee with exactly one custom field
2. Check spacing and border

**Expected:**
- ✅ Border appears above the single field
- ✅ Spacing is consistent with multi-field rows
- ✅ Single field uses full width

#### 7.3: Many Custom Fields (6+)
**Steps:**
1. Find an attendee with 6 or more custom fields
2. Check spacing and layout

**Expected:**
- ✅ Border appears above the grid
- ✅ Spacing remains consistent
- ✅ Grid layout maintains proper gaps
- ✅ No overflow or layout issues

#### 7.4: Long Field Names
**Steps:**
1. Test with custom fields that have long names
2. Check if spacing is affected

**Expected:**
- ✅ Spacing remains consistent
- ✅ Long names don't break layout
- ✅ Labels wrap properly if needed

### Test 8: Dark Mode Verification
**Objective:** Verify spacing and borders work correctly in dark mode

**Steps:**
1. Enable dark mode in the application
2. Navigate to the Attendees tab
3. Check border visibility and spacing

**Expected Results:**
- ✅ Border is visible with appropriate contrast
- ✅ Spacing remains identical to light mode
- ✅ No visual issues or contrast problems
- ✅ Professional appearance maintained

**Dark Mode Checklist:**
- Border color: Should be lighter gray for visibility
- Spacing: Identical to light mode
- Contrast: Border should be visible but subtle
- Overall: Should look polished and professional

### Test 9: Hover States
**Objective:** Verify spacing doesn't interfere with hover effects

**Steps:**
1. Hover over an attendee name
2. Check if hover effect works correctly
3. Verify spacing doesn't change on hover

**Expected Results:**
- ✅ Name changes color on hover (to primary)
- ✅ Spacing remains consistent during hover
- ✅ No layout shifts on hover
- ✅ Border position doesn't change

### Test 10: Accessibility Check
**Objective:** Verify spacing improves accessibility

**Steps:**
1. Use keyboard navigation (Tab key)
2. Check focus states
3. Test with screen reader (if available)

**Expected Results:**
- ✅ Tab order is logical (name → actions)
- ✅ Focus states are visible
- ✅ Screen reader announces sections clearly
- ✅ Visual separation aids comprehension

## Measurement Verification

### Using Browser Developer Tools

**Check Top Margin (mt-3):**
1. Inspect the custom fields container div
2. Check computed styles
3. Verify `margin-top: 0.75rem` (12px)

**Check Top Padding (pt-3):**
1. Same element as above
2. Verify `padding-top: 0.75rem` (12px)

**Check Bottom Margin (mb-2):**
1. Same element as above
2. Verify `margin-bottom: 0.5rem` (8px)

**Check Border:**
1. Verify `border-top-width: 1px`
2. Check border color uses CSS variable
3. Verify 50% opacity

**Check Column Spacing (space-y-0.5):**
1. Inspect a field item
2. Check gap between label and value
3. Verify `gap: 0.125rem` (2px)

## Common Issues and Solutions

### Issue 1: Border Not Visible
**Symptoms:** Border separator is not showing
**Check:**
- Verify `border-t` class is present
- Check if `border-border/50` is applied
- Inspect computed styles for border-top

**Solution:** Ensure the div has all required classes

### Issue 2: Spacing Too Tight
**Symptoms:** Custom fields appear too close to name
**Check:**
- Verify `mt-3` and `pt-3` are present
- Check computed margin and padding values

**Solution:** Ensure spacing classes are correctly applied

### Issue 3: Inconsistent Spacing
**Symptoms:** Spacing varies between rows
**Check:**
- Verify all rows use the same classes
- Check for any inline styles overriding classes

**Solution:** Ensure consistent class application across all rows

### Issue 4: Dark Mode Border Invisible
**Symptoms:** Border not visible in dark mode
**Check:**
- Verify CSS variable adapts to dark mode
- Check border opacity

**Solution:** Ensure `border-border` variable is properly defined for dark mode

## Success Criteria

All tests pass when:
- ✅ Visual separation is clear and consistent
- ✅ Spacing measurements match specifications (12px, 12px, 8px)
- ✅ Border is visible in both light and dark modes
- ✅ Column layout structure is correct
- ✅ Responsive behavior works at all breakpoints
- ✅ No layout shifts or visual glitches
- ✅ Professional and polished appearance
- ✅ Accessibility is maintained or improved

## Reporting Issues

If you find any issues during testing:

1. **Document the issue:**
   - What you expected to see
   - What you actually saw
   - Steps to reproduce

2. **Include screenshots:**
   - Before and after (if applicable)
   - Different screen sizes
   - Light and dark modes

3. **Provide context:**
   - Browser and version
   - Screen resolution
   - Number of custom fields in test case

4. **Check developer console:**
   - Any errors or warnings
   - CSS conflicts

## Conclusion

This testing guide ensures that Task 6's visual separation enhancements are working correctly across all scenarios. Complete all test scenarios and verify the success criteria before marking the task as complete.
