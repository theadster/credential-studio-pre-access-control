# Task 9: Accessibility Testing Guide

## Overview
This guide provides step-by-step instructions for testing the accessibility enhancements made to the attendee inline display. Follow these tests to verify WCAG AA compliance and proper assistive technology support.

---

## Test Environment Setup

### Required Tools
1. **Modern Browser** (Chrome, Firefox, Safari, or Edge)
2. **Screen Reader** (choose one):
   - Windows: NVDA (free) or JAWS
   - macOS: VoiceOver (built-in)
   - Linux: Orca (free)
3. **Keyboard** (for keyboard-only testing)
4. **Color Contrast Analyzer** (optional, for verification)

### Test Data Requirements
- At least 3 attendees with different configurations:
  - Attendee with photo and notes
  - Attendee without photo, with custom fields
  - Attendee with URL custom field and credential

---

## Test 1: Keyboard Navigation

### Objective
Verify all interactive elements are keyboard accessible with logical tab order.

### Steps

1. **Navigate to Dashboard**
   - Open the application
   - Log in and navigate to the Attendees tab
   - Click in the browser address bar, then press Tab

2. **Test Tab Order Through First Row**
   - Press Tab repeatedly and observe focus indicators
   - Expected order:
     1. Search input
     2. Filter dropdown
     3. Action buttons (Add, Import, Export)
     4. First attendee checkbox
     5. First attendee name button
     6. First attendee custom field URLs (if any)
     7. First attendee credential button (if exists)
     8. First attendee actions dropdown
     9. Second attendee checkbox
     10. (continues...)

3. **Verify Focus Indicators**
   - Each focused element should have:
     - Visible 2px ring in primary color (violet)
     - 2px offset from element
     - Rounded corners
   - Focus should be clearly visible in both light and dark modes

4. **Test Reverse Navigation**
   - Press Shift+Tab to move backwards
   - Focus should move in reverse order
   - No elements should be skipped

5. **Test Activation**
   - Focus on name button, press Enter
   - Edit form should open
   - Press Escape to close
   - Focus on URL link, press Enter
   - Link should open in new tab

### Expected Results
- ✅ All interactive elements reachable via Tab
- ✅ Tab order is logical (left to right, top to bottom)
- ✅ Focus indicators clearly visible
- ✅ No keyboard traps
- ✅ Enter/Space activates buttons and links

### Pass/Fail Criteria
- **PASS**: All elements accessible, focus visible, logical order
- **FAIL**: Any element unreachable, focus invisible, or illogical order

---

## Test 2: Screen Reader Announcements

### Objective
Verify all content is properly announced by screen readers.

### Setup
1. Enable screen reader:
   - **Windows (NVDA)**: Ctrl+Alt+N
   - **macOS (VoiceOver)**: Cmd+F5
   - **Linux (Orca)**: Super+Alt+S

2. Navigate to Attendees tab

### Test 2.1: Checkbox Announcements

**Steps:**
1. Tab to first attendee checkbox
2. Listen to announcement

**Expected Announcement:**
- "Select [First Name] [Last Name], checkbox, not checked"

**Verify:**
- ✅ Attendee name is announced
- ✅ "checkbox" role is announced
- ✅ Checked state is announced

### Test 2.2: Photo Announcements

**Steps:**
1. Use screen reader navigation to move to photo cell
2. Listen to announcement

**Expected Announcement (with photo):**
- "Photo of [First Name] [Last Name], image"

**Expected Announcement (without photo):**
- "Initials for [First Name] [Last Name], image"

**Verify:**
- ✅ Attendee name is announced
- ✅ Photo vs initials distinction is clear
- ✅ No redundant announcements

### Test 2.3: Name Button Announcements

**Steps:**
1. Tab to name button
2. Listen to announcement

**Expected Announcement (with notes):**
- "Edit [First Name] [Last Name], has notes, button"

**Expected Announcement (without notes):**
- "Edit [First Name] [Last Name], button"

**Verify:**
- ✅ "Edit" action is announced
- ✅ Attendee name is announced
- ✅ Notes status is announced (if applicable)
- ✅ "button" role is announced

### Test 2.4: Custom Field Announcements

**Steps:**
1. Use screen reader to navigate through custom fields
2. Listen to each field announcement

**Expected Announcements:**

**Text Field:**
- "Email: john@example.com"

**URL Field:**
- "Website: https://example.com, opens in new tab, link"

**Boolean Field:**
- "Active: Yes, status"

**Verify:**
- ✅ Field label is announced
- ✅ Field value is announced
- ✅ URL fields announce "opens in new tab"
- ✅ Boolean fields announced as status

### Test 2.5: Barcode Announcements

**Steps:**
1. Navigate to barcode cell
2. Listen to announcement

**Expected Announcement:**
- "Barcode: 123456789, group"

**Verify:**
- ✅ "Barcode" label is announced
- ✅ Barcode number is announced
- ✅ No icon noise (QR icon is hidden)

### Test 2.6: Credential Button Announcements

**Steps:**
1. Tab to credential button
2. Listen to announcement

**Expected Announcement (with credential):**
- "View credential for [First Name] [Last Name], opens in new tab, button"

**Expected Announcement (no credential):**
- "No credential generated, status"

**Verify:**
- ✅ Action is clear ("View credential")
- ✅ Attendee name is announced
- ✅ "opens in new tab" is announced
- ✅ No-credential state is clear

### Test 2.7: Status Badge Announcements

**Steps:**
1. Navigate to status cell
2. Listen to announcement

**Expected Announcements:**
- "Credential status: Current, status"
- "Credential status: Outdated, status"
- "Credential status: None, status"

**Verify:**
- ✅ "Credential status" prefix is announced
- ✅ Status value is announced
- ✅ "status" role is announced
- ✅ No icon noise (icons are hidden)

### Test 2.8: Actions Dropdown Announcements

**Steps:**
1. Tab to actions dropdown
2. Listen to announcement

**Expected Announcement:**
- "Actions for [First Name] [Last Name], button"

**Verify:**
- ✅ "Actions for" is announced
- ✅ Attendee name is announced
- ✅ "button" role is announced

### Pass/Fail Criteria
- **PASS**: All content announced correctly, no redundant announcements
- **FAIL**: Missing announcements, unclear context, or excessive noise

---

## Test 3: Color Contrast

### Objective
Verify all text and interactive elements meet WCAG AA contrast ratio (4.5:1 minimum).

### Tools
- Browser DevTools (Inspect element)
- Online contrast checker: https://webaim.org/resources/contrastchecker/
- Browser extension: "WCAG Color Contrast Checker"

### Test 3.1: Light Mode Contrast

**Elements to Test:**

1. **Primary Text (Name)**
   - Foreground: `#0f172a`
   - Background: `#ffffff`
   - Expected: 16.1:1 ✅

2. **Muted Text (Field Labels)**
   - Foreground: `#64748b`
   - Background: `#ffffff`
   - Expected: 4.6:1 ✅

3. **Primary Links (URLs)**
   - Foreground: `#8b5cf6`
   - Background: `#ffffff`
   - Expected: 4.5:1 ✅

4. **Emerald Status Badge**
   - Foreground: `#065f46`
   - Background: `#d1fae5`
   - Expected: 7.2:1 ✅

5. **Red Status Badge**
   - Foreground: `#991b1b`
   - Background: `#fee2e2`
   - Expected: 7.8:1 ✅

6. **Violet Notes Badge**
   - Foreground: `#5b21b6`
   - Background: `#ede9fe`
   - Expected: 8.1:1 ✅

### Test 3.2: Dark Mode Contrast

**Switch to Dark Mode:**
- Click theme toggle in header
- Verify dark mode is active

**Elements to Test:**

1. **Primary Text (Name)**
   - Foreground: `#f8fafc`
   - Background: `#0f172a`
   - Expected: 16.1:1 ✅

2. **Muted Text (Field Labels)**
   - Foreground: `#94a3b8`
   - Background: `#0f172a`
   - Expected: 7.1:1 ✅

3. **Primary Links (URLs)**
   - Foreground: `#a78bfa`
   - Background: `#0f172a`
   - Expected: 8.2:1 ✅

4. **Emerald Status Badge**
   - Foreground: `#6ee7b7`
   - Background: `#064e3b`
   - Expected: 8.5:1 ✅

5. **Red Status Badge**
   - Foreground: `#fca5a5`
   - Background: `#7f1d1d`
   - Expected: 7.9:1 ✅

6. **Violet Notes Badge**
   - Foreground: `#c4b5fd`
   - Background: `#4c1d95`
   - Expected: 8.3:1 ✅

### Test 3.3: Focus Indicator Contrast

**Steps:**
1. Tab to any interactive element
2. Measure focus ring contrast

**Expected:**
- Focus ring: 2px solid primary color
- Contrast against background: > 3:1 ✅

### Pass/Fail Criteria
- **PASS**: All elements meet 4.5:1 minimum (7:1 for AAA)
- **FAIL**: Any element below 4.5:1 contrast ratio

---

## Test 4: Keyboard-Only Usage

### Objective
Verify the entire attendee management workflow can be completed without a mouse.

### Setup
- Disconnect mouse or commit to not using it
- Use only keyboard for all interactions

### Test 4.1: View Attendee Details

**Steps:**
1. Tab to first attendee name button
2. Press Enter to open edit form
3. Tab through form fields
4. Press Escape to close form

**Verify:**
- ✅ Form opens on Enter
- ✅ All form fields accessible via Tab
- ✅ Form closes on Escape
- ✅ Focus returns to name button

### Test 4.2: Select Multiple Attendees

**Steps:**
1. Tab to first attendee checkbox
2. Press Space to check
3. Tab to second attendee checkbox
4. Press Space to check
5. Tab to bulk actions

**Verify:**
- ✅ Checkboxes toggle with Space
- ✅ Visual indication of selection
- ✅ Bulk actions become available

### Test 4.3: Open External Links

**Steps:**
1. Tab to custom field URL link
2. Press Enter
3. Verify new tab opens

**Verify:**
- ✅ Link opens in new tab
- ✅ Focus remains in original tab
- ✅ Can return to original tab

### Test 4.4: Use Actions Dropdown

**Steps:**
1. Tab to actions dropdown button
2. Press Enter to open
3. Use Arrow keys to navigate menu
4. Press Enter to select action
5. Press Escape to close without selecting

**Verify:**
- ✅ Dropdown opens on Enter
- ✅ Arrow keys navigate menu items
- ✅ Enter activates selected item
- ✅ Escape closes dropdown

### Test 4.5: View Credential

**Steps:**
1. Tab to credential button
2. Press Enter
3. Verify credential opens in new tab

**Verify:**
- ✅ Credential opens on Enter
- ✅ Opens in new tab
- ✅ Focus remains in original tab

### Pass/Fail Criteria
- **PASS**: All workflows completable without mouse
- **FAIL**: Any action requires mouse interaction

---

## Test 5: High Contrast Mode

### Objective
Verify all elements remain visible and distinguishable in high contrast mode.

### Setup (Windows)
1. Press Left Alt + Left Shift + Print Screen
2. Click "Yes" to enable high contrast
3. Navigate to Attendees tab

### Setup (macOS)
1. System Preferences > Accessibility > Display
2. Enable "Increase contrast"
3. Navigate to Attendees tab

### Elements to Verify

1. **Text Visibility**
   - ✅ All text remains readable
   - ✅ No text disappears
   - ✅ Sufficient contrast maintained

2. **Borders and Dividers**
   - ✅ Table borders visible
   - ✅ Cell separators visible
   - ✅ Custom field separator visible

3. **Interactive Elements**
   - ✅ Buttons have visible borders
   - ✅ Links are distinguishable
   - ✅ Checkboxes visible

4. **Status Indicators**
   - ✅ Status badges visible
   - ✅ Icons visible
   - ✅ Colors adapted appropriately

5. **Focus Indicators**
   - ✅ Focus rings visible
   - ✅ High contrast against background
   - ✅ Clear indication of focus

### Pass/Fail Criteria
- **PASS**: All elements visible and distinguishable
- **FAIL**: Any element invisible or indistinguishable

---

## Test 6: Reduced Motion

### Objective
Verify animations respect user's motion preferences.

### Setup
**Windows:**
1. Settings > Ease of Access > Display
2. Enable "Show animations in Windows"

**macOS:**
1. System Preferences > Accessibility > Display
2. Enable "Reduce motion"

**Browser DevTools:**
1. Open DevTools (F12)
2. Open Command Palette (Ctrl+Shift+P)
3. Type "Emulate CSS prefers-reduced-motion"
4. Select "prefers-reduced-motion: reduce"

### Elements to Test

1. **Hover Effects**
   - Photo shadow transition
   - Name color transition
   - Button hover states

2. **Focus Transitions**
   - Focus ring appearance
   - Element state changes

3. **Dropdown Animations**
   - Menu open/close
   - Smooth vs instant

### Expected Behavior
- Animations should be instant or significantly reduced
- No motion sickness triggers
- Functionality remains intact

### Pass/Fail Criteria
- **PASS**: Animations reduced or removed, functionality intact
- **FAIL**: Animations still present, causing discomfort

---

## Test 7: Mobile Screen Reader

### Objective
Verify accessibility on mobile devices with touch screen readers.

### Setup (iOS - VoiceOver)
1. Settings > Accessibility > VoiceOver
2. Enable VoiceOver
3. Open application in Safari

### Setup (Android - TalkBack)
1. Settings > Accessibility > TalkBack
2. Enable TalkBack
3. Open application in Chrome

### Test Gestures

**iOS VoiceOver:**
- Swipe right: Next element
- Swipe left: Previous element
- Double tap: Activate element
- Two-finger swipe up: Read from top

**Android TalkBack:**
- Swipe right: Next element
- Swipe left: Previous element
- Double tap: Activate element
- Swipe down then right: Read from top

### Elements to Test

1. **Navigation**
   - ✅ Can navigate through all elements
   - ✅ Logical reading order
   - ✅ No elements skipped

2. **Announcements**
   - ✅ All content announced
   - ✅ Context is clear
   - ✅ Actions are clear

3. **Activation**
   - ✅ Double tap activates buttons
   - ✅ Links open correctly
   - ✅ Checkboxes toggle

### Pass/Fail Criteria
- **PASS**: All elements accessible and properly announced
- **FAIL**: Elements unreachable or unclear announcements

---

## Test 8: Zoom and Text Scaling

### Objective
Verify layout adapts gracefully to increased text size.

### Test 8.1: Browser Zoom

**Steps:**
1. Press Ctrl/Cmd + Plus to zoom to 200%
2. Navigate through attendee rows
3. Verify all content visible and usable

**Verify:**
- ✅ No horizontal scrolling required
- ✅ Text remains readable
- ✅ Buttons remain clickable
- ✅ Layout doesn't break

### Test 8.2: Text-Only Zoom

**Firefox:**
1. View > Zoom > Zoom Text Only
2. Press Ctrl + Plus to increase text size

**Verify:**
- ✅ Text scales appropriately
- ✅ Layout adapts to larger text
- ✅ No text overflow
- ✅ Buttons remain usable

### Test 8.3: System Text Size

**Windows:**
1. Settings > Ease of Access > Display
2. Increase "Make text bigger" to 150%

**macOS:**
1. System Preferences > Accessibility > Display
2. Increase text size

**Verify:**
- ✅ Application respects system settings
- ✅ Text scales appropriately
- ✅ Layout remains functional

### Pass/Fail Criteria
- **PASS**: Layout adapts, all content accessible at 200% zoom
- **FAIL**: Layout breaks, content hidden, or unusable

---

## Test Results Template

### Test Session Information
- **Date**: _______________
- **Tester**: _______________
- **Browser**: _______________
- **Screen Reader**: _______________
- **Operating System**: _______________

### Test Results

| Test | Status | Notes |
|------|--------|-------|
| 1. Keyboard Navigation | ☐ Pass ☐ Fail | |
| 2. Screen Reader | ☐ Pass ☐ Fail | |
| 3. Color Contrast | ☐ Pass ☐ Fail | |
| 4. Keyboard-Only Usage | ☐ Pass ☐ Fail | |
| 5. High Contrast Mode | ☐ Pass ☐ Fail | |
| 6. Reduced Motion | ☐ Pass ☐ Fail | |
| 7. Mobile Screen Reader | ☐ Pass ☐ Fail | |
| 8. Zoom and Text Scaling | ☐ Pass ☐ Fail | |

### Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Overall Assessment
☐ **PASS** - All tests passed, WCAG AA compliant
☐ **FAIL** - Issues found, requires fixes

---

## Quick Reference: Common Issues

### Issue: Focus Not Visible
**Solution:** Verify focus ring styles are applied and have sufficient contrast

### Issue: Screen Reader Not Announcing
**Solution:** Check aria-label, aria-labelledby, or role attributes

### Issue: Keyboard Trap
**Solution:** Verify all modals and dropdowns can be closed with Escape

### Issue: Poor Contrast
**Solution:** Adjust colors to meet 4.5:1 minimum ratio

### Issue: Redundant Announcements
**Solution:** Add aria-hidden="true" to decorative icons

### Issue: Unclear Context
**Solution:** Add descriptive aria-label with full context

---

## Conclusion

Following this testing guide ensures the attendee inline display meets WCAG AA standards and provides an excellent experience for all users, including those using assistive technologies.

**Remember:** Accessibility is not a one-time task. Test regularly and consider accessibility in all future changes.
