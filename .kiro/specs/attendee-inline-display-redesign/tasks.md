# Implementation Plan

This implementation plan breaks down the attendee inline display redesign into discrete, manageable tasks. Each task builds incrementally on previous work, following a test-driven approach where appropriate.

## Task Overview

The implementation is organized into three phases:
1. **Phase 1: Core Visual Enhancements** - Update styling for existing elements
2. **Phase 2: Layout Improvements** - Implement responsive grid and spacing
3. **Phase 3: Polish and Optimization** - Add interactions, accessibility, and performance optimizations

---

## Phase 1: Core Visual Enhancements

- [x] 1. Enhance photo cell styling, size, and positioning
  - Update photo container with gradient background, border, and shadow
  - Increase photo size from 64x80px to 80x96px (w-20 h-24)
  - Add `align-top` class to TableCell to position photo at top of column
  - Improve initials display with larger font (text-2xl) and better colors
  - Add hover effect with shadow transition
  - Implement image loading error handling with fallback to initials
  - Test with attendees that have photos and without photos
  - Verify photo stays at top when custom fields expand to multiple rows
  - Verify dark mode appearance
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 2. Enhance name display and remove extra spacing
  - Update name typography to font-semibold text-lg
  - Add group hover effect for name (hover:text-primary)
  - Redesign notes badge with icon, better colors, and violet theme
  - Remove `py-2` wrapper to eliminate extra vertical padding
  - Remove `mb-2` after name to eliminate blank line before custom fields
  - Improve badge sizing and positioning
  - Test click handler still works correctly
  - Verify notes badge only appears when notes exist
  - Verify no extra blank line appears under name
  - Test dark mode appearance
  - _Requirements: 1.1, 1.5, 2.1, 2.6, 2.8_

- [x] 3. Enhance barcode cell display and positioning
  - Add `align-top` class to TableCell to position barcode at top of column
  - Add QR code icon to barcode cell on same line as barcode number
  - Apply monospace font to barcode number
  - Increase badge padding for better visual weight
  - Add background color to badge for contrast
  - Test with various barcode lengths
  - Verify barcode stays at top when custom fields expand to multiple rows
  - Verify dark mode appearance
  - _Requirements: 1.1, 1.4, 2.4, 5.3_

- [x] 4. Enhance status badge display, colors, and positioning
  - Add `align-top` class to TableCell to position status badge at top of column
  - Add icons to status badges (CheckCircle, AlertTriangle, Circle)
  - Update colors for Current status (emerald theme with emerald hover, not purple)
  - Update colors for Outdated status (red theme with red hover)
  - Add hover effects using same color family (emerald for Current, red for Outdated)
  - Add `transition-colors` for smooth hover effect
  - Add "NONE" badge for attendees without credentials
  - Improve dark mode colors with better contrast
  - Ensure consistent padding across all status types
  - Test all three status states
  - Verify status badge stays at top when custom fields expand to multiple rows
  - Verify hover effects don't clash with site colors
  - Verify accessibility (icons + text, not color-only)
  - _Requirements: 1.1, 1.5, 2.5, 5.1, 5.2, 6.1, 6.4, 6.5, 9.3_

---

## Phase 2: Layout Improvements

- [x] 5. Implement responsive grid layout for custom fields with full width expansion
  - Create getGridColumns helper function for dynamic column calculation
  - Implement grid layout with 1-4 columns based on field count
  - Add responsive breakpoints (mobile: 1 col, tablet: max 2 cols, desktop: full grid)
  - Update custom field label styling (uppercase, tracking-wide, smaller font)
  - Update custom field value styling (text-sm, font-medium)
  - Add proper spacing between grid items (gap-x-6 gap-y-2)
  - Ensure custom fields occupy full width available in name cell
  - Allow custom fields to wrap to 2nd, 3rd, or more rows as needed
  - Test with 0, 1, 2, 3, 4, 5, 6+ custom fields
  - Test with many fields that wrap to multiple rows
  - Verify custom field expansion doesn't affect other columns
  - Verify responsive behavior at different screen sizes
  - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 11.1, 11.2, 11.3_

- [x] 6. Add visual separation for custom fields section
  - Add top border separator between name and custom fields
  - Implement proper vertical spacing (mb-2, mt-3, pt-3)
  - Add column layout structure with flex-col and space-y-0.5
  - Test visual hierarchy and readability
  - Verify spacing consistency across all rows
  - _Requirements: 2.2, 2.3, 3.5_

- [ ] 7. Enhance custom field value display by type with subtle colors
  - Implement URL field display with Link icon and clickable link
  - Add stopPropagation to URL clicks to prevent row click
  - Implement boolean "Yes" field display with subtle, faint violet badge
  - Use `bg-violet-50 text-violet-700 border-violet-200` for light mode "Yes" badges
  - Use `bg-violet-950/20 text-violet-400 border-violet-900/50` for dark mode "Yes" badges
  - Add subtle hover effect within violet family for "Yes" badges
  - Implement boolean "No" field display with secondary variant
  - Add text truncation for long values with title attribute
  - Test URL fields open in new tab correctly
  - Test boolean fields display with subtle colors (not bold primary)
  - Test long text values truncate properly
  - _Requirements: 2.3, 2.7, 3.7, 6.3_

- [ ] 7.5. Position credential and actions cells at top
  - Add `align-top` class to credential TableCell
  - Add `align-top` class to actions TableCell
  - Verify credential icon stays at top when custom fields expand
  - Verify actions dropdown menu stays at top when custom fields expand
  - Test that all top-row elements (photo, barcode, credential, status, actions) align properly
  - _Requirements: 5.1, 5.2, 5.4_

---

## Phase 3: Polish and Optimization

- [x] 8. Implement performance optimizations
  - Add useCallback for getGridColumns function
  - Extract getCustomFieldsWithValues helper function outside map
  - Add lazy loading attribute to photo images
  - Add async decoding attribute to photo images
  - Verify no performance regression with large datasets (100+ attendees)
  - Test scroll performance remains smooth
  - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [x] 9. Enhance accessibility features
  - Verify all interactive elements have proper focus states
  - Add proper ARIA labels where needed
  - Ensure keyboard navigation works correctly (Tab order)
  - Test with screen reader (announce name, status, custom fields)
  - Verify color contrast meets WCAG AA standards (4.5:1)
  - Test with keyboard only (no mouse)
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 10. Verify compatibility with existing features
  - Test clicking name opens edit form with all fields (including hidden)
  - Test bulk selection checkboxes work correctly
  - Test search and filters continue to work
  - Test pagination maintains behavior
  - Test actions dropdown (Edit, Delete, Generate Credential) work
  - Test real-time updates refresh display correctly
  - Test permission checks control access appropriately
  - Verify hidden fields (showOnMainPage: false) don't appear in display
  - Verify hidden fields appear in edit form
  - Verify hidden fields included in exports
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 11. Test responsive design across devices
  - Test on mobile (375px, 414px)
  - Test on tablet (768px, 1024px)
  - Test on desktop (1280px, 1440px, 1920px)
  - Verify custom field grid adapts correctly at each breakpoint
  - Verify photos scale appropriately
  - Verify all interactive elements remain accessible
  - Verify top-row elements (credential, status, actions) remain on first line at all breakpoints
  - Test touch interactions on mobile devices
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ]* 12. Create visual regression tests
  - Capture screenshots of attendee rows with 0 custom fields
  - Capture screenshots with 1-2 custom fields
  - Capture screenshots with 3-5 custom fields
  - Capture screenshots with 6+ custom fields
  - Capture screenshots with/without photos
  - Capture screenshots with/without notes
  - Capture screenshots of all credential statuses
  - Test in light and dark modes
  - _Requirements: 1.5, 8.1_

- [ ]* 13. Perform cross-browser testing
  - Test in Chrome (latest)
  - Test in Firefox (latest)
  - Test in Safari (latest)
  - Test in Edge (latest)
  - Document any browser-specific issues
  - Verify CSS fallbacks work in older browsers
  - _Requirements: 1.1, 1.4_

---

## Notes

- Tasks marked with `*` are optional testing tasks that can be skipped for MVP
- Each task should be completed and verified before moving to the next
- All changes should maintain backward compatibility with existing features
- Dark mode should be tested for every visual change
- Performance should be monitored throughout implementation
