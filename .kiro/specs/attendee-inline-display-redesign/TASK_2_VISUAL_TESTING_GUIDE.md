# Task 2: Visual Testing Guide - Name Display and Spacing

## Quick Visual Verification

### What to Look For
1. **No blank line** between attendee name and custom fields separator
2. **Reduced vertical padding** around the name section
3. **Notes badge** appears only when notes exist
4. **Hover effect** on name changes color to primary (violet)
5. **Proper spacing** in dark mode

## Manual Testing Steps

### Test 1: Basic Layout Verification
1. Navigate to Dashboard → Attendees tab
2. Look at any attendee row with custom fields
3. **Verify:** Name is immediately followed by separator line (no blank space)
4. **Verify:** Custom fields start right after separator
5. **Verify:** Overall spacing looks tighter and cleaner

### Test 2: Notes Badge Display
1. Find an attendee WITH notes
   - **Verify:** Small violet "NOTES" badge appears next to name
   - **Verify:** Badge has FileText icon on the left
   - **Verify:** Badge colors:
     - Light mode: Light violet background, dark violet text
     - Dark mode: Dark violet background, light violet text

2. Find an attendee WITHOUT notes
   - **Verify:** No notes badge appears
   - **Verify:** Name displays normally without extra space

### Test 3: Hover Effects
1. Hover over an attendee name
   - **Verify:** Name text changes to primary color (violet)
   - **Verify:** Transition is smooth (not instant)
   - **Verify:** Cursor changes to pointer (if user has edit permission)

2. Hover over notes badge
   - **Verify:** Badge does not have separate hover effect
   - **Verify:** Badge moves with name on hover

### Test 4: Click Functionality
1. Click on an attendee name (with edit permission)
   - **Verify:** Edit form opens
   - **Verify:** All fields are populated correctly
   - **Verify:** Hidden fields appear in edit form

2. Click on an attendee name (without edit permission)
   - **Verify:** Nothing happens (button is disabled)
   - **Verify:** No error occurs

### Test 5: Dark Mode
1. Toggle to dark mode (if available)
2. **Verify:** Name text is readable (light color on dark background)
3. **Verify:** Notes badge has proper dark mode colors:
   - Background: `bg-violet-900/30`
   - Text: `text-violet-300`
   - Border: `border-violet-800`
4. **Verify:** Hover effect still works (name changes to primary)
5. **Verify:** No extra spacing or blank lines

### Test 6: Responsive Behavior
1. Resize browser to mobile width (< 768px)
   - **Verify:** Name wraps properly if too long
   - **Verify:** Notes badge stays on same line or wraps gracefully
   - **Verify:** No layout breaks

2. Resize to tablet width (768px - 1024px)
   - **Verify:** Layout remains clean
   - **Verify:** Spacing is consistent

3. Resize to desktop width (> 1024px)
   - **Verify:** Full layout displays correctly
   - **Verify:** No excessive spacing

### Test 7: Keyboard Navigation
1. Tab to an attendee name
   - **Verify:** Focus ring appears around name
   - **Verify:** Focus ring is visible and clear

2. Press Enter on focused name
   - **Verify:** Edit form opens (if user has permission)

3. Tab through multiple attendees
   - **Verify:** Focus moves logically through the list
   - **Verify:** Focus indicators are always visible

### Test 8: Screen Reader Testing (Optional)
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate to attendee name
   - **Verify:** Screen reader announces: "Edit [First Name] [Last Name]"
   - **Verify:** If notes exist, announces: "Edit [First Name] [Last Name], has notes"
3. Navigate to notes badge
   - **Verify:** Screen reader announces: "Has notes"

## Visual Comparison Checklist

### Before Task 2
- [ ] Extra vertical padding around name section
- [ ] Blank line between name and separator
- [ ] Extra margin below custom fields section
- [ ] Overall "loose" spacing

### After Task 2
- [x] Reduced vertical padding (no py-2 wrapper)
- [x] No blank line between name and separator
- [x] Tighter spacing around custom fields
- [x] Overall "compact" and clean appearance

## Common Issues to Watch For

### Issue 1: Name and Custom Fields Too Close
**Symptom:** Custom fields appear to touch the name
**Expected:** There should be a visible separator line with proper spacing (mt-3 pt-3)
**Fix:** Verify `mt-3 pt-3 border-t` classes are present

### Issue 2: Notes Badge Appears for Empty Notes
**Symptom:** Badge shows even when notes field is empty or whitespace
**Expected:** Badge only shows when `attendee.notes && attendee.notes.trim() !== ''`
**Fix:** Check conditional rendering logic

### Issue 3: Hover Effect Not Working
**Symptom:** Name doesn't change color on hover
**Expected:** Name should change to primary color with smooth transition
**Fix:** Verify `group-hover:text-primary transition-colors` classes are present

### Issue 4: Click Handler Not Working
**Symptom:** Clicking name doesn't open edit form
**Expected:** Edit form should open with full attendee data
**Fix:** Check button onClick handler and permission check

## Browser-Specific Checks

### Chrome/Edge
- [ ] Spacing appears correct
- [ ] Hover effects are smooth
- [ ] Dark mode works properly
- [ ] Focus indicators are visible

### Firefox
- [ ] Layout matches Chrome
- [ ] Colors are consistent
- [ ] Transitions work smoothly

### Safari
- [ ] Webkit-specific rendering is correct
- [ ] Focus rings are visible
- [ ] Dark mode adapts properly

## Performance Checks

### Page Load
- [ ] Attendee list loads quickly
- [ ] No layout shift when notes badges appear
- [ ] Images load progressively (lazy loading)

### Scrolling
- [ ] Smooth scrolling through attendee list
- [ ] No jank or stuttering
- [ ] Hover effects don't cause lag

### Interactions
- [ ] Click response is immediate
- [ ] Hover effects are smooth (not choppy)
- [ ] No console errors

## Accessibility Verification

### WCAG AA Compliance
- [ ] Color contrast ratio ≥ 4.5:1 for name text
- [ ] Color contrast ratio ≥ 4.5:1 for notes badge
- [ ] Focus indicators are visible (2px ring)
- [ ] Interactive elements are keyboard accessible

### Semantic HTML
- [ ] Button element used for clickable name
- [ ] Proper ARIA labels present
- [ ] Role attributes are appropriate

## Sign-Off Checklist

Before marking task complete, verify:
- [x] No extra blank line under name
- [x] Reduced vertical padding (no py-2)
- [x] Notes badge displays correctly
- [x] Hover effects work
- [x] Click handler works
- [x] Dark mode works
- [x] Keyboard navigation works
- [x] No console errors
- [x] No layout breaks at any screen size
- [x] Accessibility maintained

## Screenshots to Capture (Optional)

1. **Before/After comparison** - Same attendee row showing spacing difference
2. **Notes badge** - Light mode and dark mode
3. **Hover state** - Name with primary color
4. **Focus state** - Keyboard focus ring
5. **Mobile view** - Responsive layout
6. **Dark mode** - Full dark mode appearance

## Next Steps

Once all tests pass:
1. Mark Task 2 as complete
2. Document any issues found
3. Proceed to Task 3: Enhance barcode cell display and positioning
