# Task 5: Responsive Grid Layout - Visual Testing Guide

## Overview
This guide provides step-by-step instructions for visually testing the responsive grid layout implementation for custom fields in the attendee inline display. The implementation uses a multi-row table structure where custom fields span across 5 columns (Name, Barcode, Credential, Status, Actions), providing significantly more horizontal space for displaying custom field data.

## Prerequisites

1. **Development Server Running:**
   ```bash
   npm run dev
   ```

2. **Test Data Setup:**
   - Ensure you have attendees with varying numbers of custom fields
   - Create test attendees with 0, 1, 2, 3, 4, 5, and 6+ custom fields
   - Include different field types (text, number, email, url, boolean, etc.)

3. **Browser DevTools:**
   - Open browser developer tools (F12)
   - Have responsive design mode ready (Ctrl+Shift+M or Cmd+Shift+M)

## Test Scenarios

### Test 1: Field Count Variations

#### 1.1 Zero Custom Fields
**Expected Result:**
- Custom fields row should not be rendered
- Only first row visible with name and notes badge (if applicable)
- No second row below the attendee

**Steps:**
1. Navigate to Dashboard → Attendees tab
2. Find an attendee with no custom fields
3. Verify no custom fields row appears

**Visual Checklist:**
- [ ] Only one table row per attendee
- [ ] No custom fields grid visible
- [ ] No second row below attendee data
- [ ] Clean, compact appearance

#### 1.2 One Custom Field
**Expected Result:**
- Second row appears below attendee
- Single column layout on all screen sizes
- Field spans across 5 columns (Name through Actions)
- Proper spacing and border separator

**Steps:**
1. Find an attendee with exactly 1 custom field
2. Verify second row appears
3. Verify single column layout
4. Test on mobile, tablet, and desktop sizes

**Visual Checklist:**
- [ ] Second row visible below first row
- [ ] Field spans full width of 5 columns
- [ ] Label is uppercase with wide tracking
- [ ] Value is below label with proper spacing
- [ ] Border separator at top of custom fields section
- [ ] Checkbox and photo columns empty in second row

#### 1.3 Two to Three Custom Fields
**Expected Result:**
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns
- Fields span across 5 table columns
- Proper horizontal spacing between columns

**Steps:**
1. Find attendees with 2 and 3 custom fields
2. Test responsive behavior at different breakpoints
3. Verify column layout changes at 768px and 1024px breakpoints

**Visual Checklist:**
- [ ] Mobile (< 768px): Single column
- [ ] Tablet (≥ 768px): 2 columns
- [ ] Desktop (≥ 1024px): 3 columns
- [ ] Fields span full width of 5 table columns
- [ ] 24px gap between columns
- [ ] 8px gap between rows

#### 1.4 Four to Six Custom Fields
**Expected Result:**
- Mobile: 1 column
- Tablet: 3 columns
- Desktop: 5 columns
- Excellent information density

**Steps:**
1. Find attendees with 4, 5, and 6 custom fields
2. Test at mobile, tablet, and desktop sizes
3. Verify fields wrap to second row when needed

**Visual Checklist:**
- [ ] Mobile: Single column, all fields stacked
- [ ] Tablet: 3 columns, fields wrap to rows
- [ ] Desktop: 5 columns, optimal layout
- [ ] Consistent spacing across all rows
- [ ] Fields align properly in grid
- [ ] Full utilization of 5-column span

#### 1.5 Seven to Nine Custom Fields
**Expected Result:**
- Mobile: 1 column
- Tablet: 4 columns
- Desktop: 6 columns
- Fields wrap to multiple rows

**Steps:**
1. Find attendees with 7, 8, and 9 custom fields
2. Test responsive behavior
3. Verify wrapping to multiple rows

**Visual Checklist:**
- [ ] Mobile: Single column, all fields stacked
- [ ] Tablet: 4 columns, multiple rows
- [ ] Desktop: 6 columns, multiple rows
- [ ] Consistent spacing throughout
- [ ] No layout breaking with many fields

#### 1.6 Ten or More Custom Fields
**Expected Result:**
- Mobile: 1 column
- Tablet: 4 columns
- Desktop: 7 columns (maximum)
- Fields wrap to multiple rows

**Steps:**
1. Find attendees with 10+ custom fields
2. Test responsive behavior
3. Verify maximum column count

**Visual Checklist:**
- [ ] Mobile: Single column, all fields stacked
- [ ] Tablet: 4 columns, multiple rows
- [ ] Desktop: 7 columns maximum, multiple rows
- [ ] Consistent spacing throughout
- [ ] Clean appearance even with many fields
- [ ] Full utilization of 5-column table span

### Test 2: Responsive Breakpoints

#### 2.1 Mobile View (< 768px)
**Test Sizes:** 375px, 414px, 480px

**Steps:**
1. Set viewport to 375px width
2. Scroll through attendee list
3. Verify all custom fields display in single column

**Visual Checklist:**
- [ ] All fields in single column
- [ ] Full width utilization
- [ ] Readable text at small size
- [ ] Proper spacing maintained
- [ ] No horizontal scrolling

#### 2.2 Tablet View (768px - 1024px)
**Test Sizes:** 768px, 834px, 1024px

**Steps:**
1. Set viewport to 768px width
2. Verify column counts for different field counts
3. Test at 1024px boundary

**Visual Checklist:**
- [ ] 2-3 fields: 2 columns
- [ ] 4-5 fields: 2 columns
- [ ] 6+ fields: 2 columns
- [ ] Smooth transition at breakpoint
- [ ] No layout shifts

#### 2.3 Desktop View (> 1024px)
**Test Sizes:** 1280px, 1440px, 1920px

**Steps:**
1. Set viewport to 1280px width
2. Verify full grid system active
3. Test at ultra-wide resolutions

**Visual Checklist:**
- [ ] 1 field: 1 column
- [ ] 2-3 fields: 3 columns
- [ ] 4-6 fields: 5 columns
- [ ] 7-9 fields: 6 columns
- [ ] 10+ fields: 7 columns
- [ ] Optimal information density
- [ ] Full utilization of 5-column span
- [ ] No excessive white space

### Test 3: Multi-Row Wrapping

#### 3.1 Natural Wrapping
**Expected Result:**
- Fields wrap to new rows when column count is exceeded
- Consistent spacing across all rows
- Proper alignment maintained

**Steps:**
1. Find attendee with 8+ custom fields
2. View at desktop size (4 columns)
3. Verify fields wrap to second row after 4th field

**Visual Checklist:**
- [ ] First row: 4 fields
- [ ] Second row: Remaining fields
- [ ] Consistent horizontal spacing
- [ ] Consistent vertical spacing
- [ ] Proper grid alignment

#### 3.2 Uneven Field Counts
**Expected Result:**
- Last row may have fewer fields than columns
- Fields maintain proper alignment
- No layout distortion

**Steps:**
1. Test with 5, 7, 9, 10 fields
2. Verify last row appearance
3. Check alignment of partial rows

**Visual Checklist:**
- [ ] Partial rows align to grid
- [ ] No stretching of last row fields
- [ ] Consistent field widths
- [ ] Proper spacing maintained

### Test 4: Column Isolation

#### 4.1 Other Columns Unaffected
**Expected Result:**
- First row contains: Checkbox, Photo, Name+Notes, Barcode, Credential, Status, Actions
- Second row (if custom fields exist) spans columns 3-7
- Custom fields don't affect first row layout
- All top-row elements align properly

**Steps:**
1. Find attendee with many custom fields (wraps to 3+ rows in grid)
2. Verify first row remains unchanged
3. Verify second row spans correctly
4. Check alignment across both rows

**Visual Checklist:**
- [ ] First row: All elements at top (align-top)
- [ ] Photo stays at top of column in first row
- [ ] Barcode stays at top of column in first row
- [ ] Credential icon stays at top in first row
- [ ] Status badge stays at top in first row
- [ ] Actions menu stays at top in first row
- [ ] Second row: Empty space for checkbox and photo columns
- [ ] Second row: Custom fields span across 5 columns
- [ ] All top elements align horizontally in first row

#### 4.2 Row Height Consistency
**Expected Result:**
- Row height determined by tallest cell (name cell with custom fields)
- Other columns don't vertically center
- Clean, organized appearance

**Steps:**
1. Compare rows with different custom field counts
2. Verify row heights vary appropriately
3. Check vertical alignment

**Visual Checklist:**
- [ ] Rows with more fields are taller
- [ ] Other columns use align-top
- [ ] No awkward vertical centering
- [ ] Consistent appearance across rows

### Test 5: Styling Verification

#### 5.1 Label Styling
**Expected Appearance:**
- Font size: 11px
- Font weight: Medium (500)
- Color: Muted foreground
- Transform: Uppercase
- Letter spacing: Wide

**Steps:**
1. Inspect custom field labels
2. Verify font properties in DevTools
3. Check color contrast

**Visual Checklist:**
- [ ] Labels are uppercase
- [ ] Wide letter spacing visible
- [ ] Muted gray color
- [ ] 11px font size
- [ ] Medium font weight

#### 5.2 Value Styling
**Expected Appearance:**
- Font size: 14px (text-sm)
- Font weight: Medium (500)
- Color: Foreground
- Proper contrast

**Steps:**
1. Inspect custom field values
2. Verify font properties
3. Check readability

**Visual Checklist:**
- [ ] 14px font size
- [ ] Medium font weight
- [ ] Dark foreground color
- [ ] Good contrast ratio
- [ ] Readable at all sizes

#### 5.3 Spacing Verification
**Expected Spacing:**
- Horizontal gap: 24px (gap-x-6)
- Vertical gap: 8px (gap-y-2)
- Label-to-value: 2px (space-y-0.5)

**Steps:**
1. Use DevTools to measure gaps
2. Verify spacing between fields
3. Check label-to-value spacing

**Visual Checklist:**
- [ ] 24px between columns
- [ ] 8px between rows
- [ ] 2px between label and value
- [ ] Consistent throughout grid

### Test 6: Full Width Expansion

#### 6.1 Width Utilization
**Expected Result:**
- Custom fields span across 5 table columns
- Grid expands to fill the 5-column span
- Significantly more horizontal space than before
- No fixed width constraints

**Steps:**
1. Resize browser window
2. Observe custom fields section width
3. Verify it spans from Name column through Actions column

**Visual Checklist:**
- [ ] Fields span across 5 columns
- [ ] Much wider than single Name column
- [ ] Full width utilization of 5-column span
- [ ] No horizontal scrolling
- [ ] Responsive to container size
- [ ] Can display up to 7 columns of fields on desktop

#### 6.2 Container Boundaries
**Expected Result:**
- Custom fields stay within 5-column span
- Checkbox and photo columns remain empty in second row
- No overflow beyond table boundaries
- Clean separation maintained

**Steps:**
1. Check custom fields boundaries
2. Verify proper column spanning
3. Test with many fields

**Visual Checklist:**
- [ ] Custom fields start at column 3 (Name column)
- [ ] Custom fields end at column 7 (Actions column)
- [ ] Columns 1-2 (Checkbox, Photo) empty in second row
- [ ] No overflow beyond table boundaries
- [ ] Clean vertical boundaries
- [ ] Proper containment within 5-column span

### Test 7: Dark Mode

#### 7.1 Dark Mode Appearance
**Expected Result:**
- All colors adapt to dark mode
- Proper contrast maintained
- Readable in dark theme

**Steps:**
1. Toggle dark mode
2. Review custom fields appearance
3. Check color contrast

**Visual Checklist:**
- [ ] Labels visible in dark mode
- [ ] Values readable
- [ ] Border separator visible
- [ ] Proper contrast ratios
- [ ] No color issues

### Test 8: Performance

#### 8.1 Render Performance
**Expected Result:**
- Smooth scrolling with many attendees
- No lag when resizing window
- Efficient grid calculations

**Steps:**
1. Load page with 100+ attendees
2. Scroll through list
3. Resize browser window
4. Monitor performance in DevTools

**Visual Checklist:**
- [ ] Smooth scrolling
- [ ] No frame drops
- [ ] Quick resize response
- [ ] No layout thrashing

## Common Issues to Check

### Layout Issues
- [ ] Fields not aligning in grid
- [ ] Inconsistent spacing
- [ ] Overflow or clipping
- [ ] Broken responsive behavior

### Styling Issues
- [ ] Wrong font sizes
- [ ] Incorrect colors
- [ ] Missing uppercase transform
- [ ] Poor contrast

### Responsive Issues
- [ ] Breakpoints not working
- [ ] Layout not changing at correct widths
- [ ] Horizontal scrolling on mobile
- [ ] Awkward layouts at certain sizes

### Performance Issues
- [ ] Slow rendering
- [ ] Laggy scrolling
- [ ] Delayed resize response
- [ ] Memory leaks

## Browser Testing

Test in the following browsers:

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Safari iOS
- [ ] Chrome Android
- [ ] Samsung Internet

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through custom fields
- [ ] Focus indicators visible
- [ ] Logical tab order

### Screen Reader
- [ ] Labels announced correctly
- [ ] Values announced after labels
- [ ] Proper reading order

### Color Contrast
- [ ] Labels meet WCAG AA (4.5:1)
- [ ] Values meet WCAG AA (4.5:1)
- [ ] Visible in high contrast mode

## Sign-Off Checklist

Before marking task as complete:

- [ ] All field count variations tested
- [ ] All responsive breakpoints verified
- [ ] Multi-row wrapping works correctly
- [ ] Column isolation maintained
- [ ] Styling matches design specifications
- [ ] Full width expansion working
- [ ] Dark mode appearance correct
- [ ] Performance is acceptable
- [ ] All browsers tested
- [ ] Accessibility verified
- [ ] No console errors
- [ ] No visual regressions

## Notes

- Take screenshots of any issues found
- Document browser-specific problems
- Note any performance concerns
- Record accessibility issues

## Conclusion

This comprehensive testing ensures the responsive grid layout implementation meets all requirements and provides an excellent user experience across all devices and screen sizes.
