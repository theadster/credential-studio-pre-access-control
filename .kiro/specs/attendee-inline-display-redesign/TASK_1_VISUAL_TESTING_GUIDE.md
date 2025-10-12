# Task 1: Photo Cell Enhancement - Visual Testing Guide

## Quick Test Checklist

Use this guide to manually verify the photo cell enhancements are working correctly.

## Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Dashboard and click on the **Attendees** tab

## Test Scenarios

### ✅ Test 1: Photo Display with Images
**What to check:**
- [ ] Photos are larger than before (80x96px vs 64x80px)
- [ ] Photos have gradient violet background visible around edges
- [ ] Photos have subtle border and shadow
- [ ] Hover over photo shows increased shadow (smooth transition)
- [ ] Photos are crisp and properly cropped (object-fit: cover)

**Expected Result:** Photos should be noticeably larger and more prominent with smooth hover effects.

---

### ✅ Test 2: Initials Display (No Photo)
**What to check:**
- [ ] Initials are displayed in larger font (text-2xl)
- [ ] Initials are bold and violet colored
- [ ] Background has gradient violet effect
- [ ] Container size is 80x96px (w-20 h-24)
- [ ] Hover effect works on initials container

**Expected Result:** Initials should be larger, bolder, and more readable than before.

---

### ✅ Test 3: Top Alignment with Custom Fields
**What to check:**
- [ ] Find an attendee with multiple custom fields (4+ fields)
- [ ] Verify custom fields wrap to multiple rows
- [ ] Photo stays at the TOP of its column (not vertically centered)
- [ ] Photo aligns with barcode, credential icon, status badge, and actions

**Expected Result:** Photo should remain at the top of the column even when the name cell expands with custom fields.

---

### ✅ Test 4: Image Loading Error Handling
**What to check:**
- [ ] Open browser DevTools → Network tab
- [ ] Block image loading or simulate slow network
- [ ] Verify fallback to initials works
- [ ] Initials display with text-2xl font size
- [ ] No broken image icon appears

**Expected Result:** Failed image loads should gracefully fall back to initials display.

---

### ✅ Test 5: Dark Mode
**What to check:**
- [ ] Toggle dark mode in the application
- [ ] Photo container background adapts (darker violet gradient)
- [ ] Border color changes to darker violet
- [ ] Initials color changes to lighter violet (text-violet-400)
- [ ] Hover effects work in dark mode
- [ ] Contrast is sufficient (WCAG AA)

**Expected Result:** All colors should adapt appropriately for dark mode with good contrast.

---

### ✅ Test 6: Responsive Behavior
**What to check:**
- [ ] Resize browser window to mobile size (375px)
- [ ] Photos maintain aspect ratio
- [ ] Photos don't overflow or break layout
- [ ] Hover effects work on touch devices (tap)

**Expected Result:** Photos should scale appropriately and maintain layout integrity.

---

### ✅ Test 7: Performance
**What to check:**
- [ ] Scroll through a list of 50+ attendees
- [ ] Verify smooth scrolling (no jank)
- [ ] Check that images lazy load (Network tab)
- [ ] Verify async decoding doesn't block rendering

**Expected Result:** Scrolling should be smooth with no performance degradation.

---

### ✅ Test 8: Accessibility
**What to check:**
- [ ] Use Tab key to navigate through table
- [ ] Verify focus indicators are visible
- [ ] Use screen reader to check aria-labels
- [ ] Verify role="img" is announced correctly
- [ ] Check color contrast with browser tools

**Expected Result:** All accessibility features should work correctly.

---

## Visual Comparison

### Before (w-16 h-20, text-xl)
- Photo: 64px × 80px
- Initials: 1.25rem (20px)
- Alignment: Default (centered)

### After (w-20 h-24, text-2xl)
- Photo: 80px × 96px ✨
- Initials: 1.5rem (24px) ✨
- Alignment: Top (align-top) ✨

## Common Issues to Watch For

❌ **Issue**: Photo appears stretched or distorted  
✅ **Solution**: Verify `object-cover` class is present on img tag

❌ **Issue**: Photo not staying at top when custom fields expand  
✅ **Solution**: Verify `align-top` class is on TableCell

❌ **Issue**: Initials too small or hard to read  
✅ **Solution**: Verify `text-2xl` class is present on initials span

❌ **Issue**: Dark mode colors don't look right  
✅ **Solution**: Verify dark: prefixed classes are present

❌ **Issue**: Hover effect not smooth  
✅ **Solution**: Verify `transition-all duration-200` classes are present

## Browser Testing

Test in these browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Sign-Off

- [ ] All visual tests pass
- [ ] No layout issues observed
- [ ] Dark mode works correctly
- [ ] Performance is acceptable
- [ ] Accessibility features work

**Tested by:** _________________  
**Date:** _________________  
**Notes:** _________________
