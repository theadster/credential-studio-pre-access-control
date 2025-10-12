# Implementation Plan

- [x] 1. Fix column header alignment in attendees table
  - Update TableHead components for Barcode, Credential, Status, and Actions columns to include `text-center` class
  - Verify alignment matches the centered content in the corresponding TableCell components
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Fix purple border flash on attendee name click
  - Replace `focus:` classes with `focus-visible:` classes on the attendee name button
  - Change `focus:outline-none` to `focus-visible:outline-none`
  - Change `focus:ring-2` to `focus-visible:ring-2`
  - Change `focus:ring-primary` to `focus-visible:ring-primary`
  - Change `focus:ring-offset-2` to `focus-visible:ring-offset-2`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 3. Manual testing and verification
  - Test column alignment in light and dark modes
  - Test focus behavior with mouse clicks (no purple border)
  - Test focus behavior with keyboard navigation (purple border visible)
  - Verify accessibility with keyboard-only navigation
  - Test on different screen sizes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5_
