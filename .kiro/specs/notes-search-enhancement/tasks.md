# Implementation Plan

- [x] 1. Update advanced search state structure
  - Add `notes` field to `advancedSearchFilters` state with `value`, `operator`, and `hasNotes` properties
  - Initialize with default values: `{ value: '', operator: 'contains', hasNotes: false }`
  - _Requirements: 1.1, 2.1, 3.1, 5.5_

- [x] 2. Update state management functions
  - [x] 2.1 Extend `handleAdvancedSearchChange` to handle 'notes' field
    - Add 'notes' to the field type union
    - Ensure operator changes clear value for 'isEmpty' and 'isNotEmpty'
    - _Requirements: 1.4, 2.8_

  - [x] 2.2 Update `clearAdvancedSearch` function
    - Include notes field reset: `{ value: '', operator: 'contains', hasNotes: false }`
    - _Requirements: 5.2_

  - [x] 2.3 Update `hasAdvancedFilters` function
    - Add checks for `advancedSearchFilters.notes.value`
    - Add checks for 'isEmpty' and 'isNotEmpty' operators on notes
    - Add check for `advancedSearchFilters.notes.hasNotes`
    - _Requirements: 5.3_

  - [x] 2.4 Update `handleAdvancedSearchToggle` function
    - Initialize notes field when opening advanced search
    - _Requirements: 5.5_

  - [x] 2.5 Update initialization in Dialog trigger onClick
    - Ensure notes field is initialized when advanced search dialog opens
    - _Requirements: 5.5_

- [x] 3. Implement notes filtering logic
  - [x] 3.1 Add notes filter to `filteredAttendees` computation
    - Use `applyTextFilter(attendee.notes || '', advancedSearchFilters.notes)` for text matching
    - Implement "Has Notes" checkbox logic: `!advancedSearchFilters.notes.hasNotes || (attendee.notes && attendee.notes.trim().length > 0)`
    - Combine both filters with AND logic: `notesMatch && hasNotesMatch`
    - Add to overall filter condition with other filters
    - _Requirements: 1.2, 1.3, 2.1-2.8, 3.2, 3.4, 5.1, 6.1, 7.1-7.5_

- [x] 4. Add Notes search UI to Advanced Search dialog
  - [x] 4.1 Add Notes field to the dialog grid
    - Position after Photo Status field in the grid
    - Use same structure as other text fields (First Name, Last Name, Barcode)
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Implement Notes field label with icon
    - Use `FileText` icon from lucide-react
    - Label text: "Notes"
    - Use `flex items-center space-x-2` layout
    - _Requirements: 4.3, 4.4_

  - [x] 4.3 Implement operator dropdown
    - Use shadcn/ui Select component
    - Width: 120px (w-[120px])
    - Options: Contains, Equals, Starts With, Ends With, Is Empty, Is Not Empty
    - Bind to `advancedSearchFilters.notes.operator`
    - Call `handleAdvancedSearchChange('notes', operator, 'operator')` on change
    - _Requirements: 2.1-2.8, 4.5_

  - [x] 4.4 Implement text input field
    - Use shadcn/ui Input component
    - Placeholder: "Value..."
    - Bind to `advancedSearchFilters.notes.value`
    - Call `handleAdvancedSearchChange('notes', value, 'value')` on change
    - Disable when operator is 'isEmpty' or 'isNotEmpty'
    - _Requirements: 1.1, 1.4, 2.6, 2.7, 4.6_

  - [x] 4.5 Implement "Has Notes" checkbox
    - Use shadcn/ui Checkbox component
    - Label: "Has Notes"
    - Position below the input field with `flex items-center space-x-2`
    - Bind to `advancedSearchFilters.notes.hasNotes`
    - Update state on change using `setAdvancedSearchFilters`
    - Disable when operator is 'isEmpty' or 'isNotEmpty'
    - _Requirements: 3.1-3.5_

- [x] 5. Update pagination reset logic
  - Verify that `useEffect` for pagination reset includes `advancedSearchFilters` in dependencies
  - Ensure Notes filter changes trigger pagination reset to page 1
  - _Requirements: 6.2_

- [x] 6. Test Notes search functionality
  - [x] 6.1 Test basic text search
    - Verify typing in Notes field filters attendees correctly
    - Test case-insensitive matching
    - Test with attendees that have notes and those that don't
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 6.2 Test all operators
    - Test "Contains" operator with various search terms
    - Test "Equals" operator with exact matches
    - Test "Starts With" operator
    - Test "Ends With" operator
    - Test "Is Empty" operator (should show attendees without notes)
    - Test "Is Not Empty" operator (should show attendees with notes)
    - Verify input is disabled for "Is Empty" and "Is Not Empty"
    - _Requirements: 2.1-2.8_

  - [x] 6.3 Test "Has Notes" checkbox
    - Test checking the checkbox filters to attendees with notes
    - Test unchecking removes the filter
    - Test combination with text search (both must match)
    - Verify checkbox is disabled when operator is "Is Empty" or "Is Not Empty"
    - _Requirements: 3.1-3.5_

  - [x] 6.4 Test edge cases
    - Test with attendees that have null notes
    - Test with attendees that have empty string notes
    - Test with attendees that have whitespace-only notes
    - Test with special characters in notes
    - _Requirements: 7.1-7.5_

  - [x] 6.5 Test integration with other filters
    - Test Notes filter with First Name filter
    - Test Notes filter with Last Name filter
    - Test Notes filter with Barcode filter
    - Test Notes filter with Photo Status filter
    - Test Notes filter with custom field filters
    - Verify all filters use AND logic
    - _Requirements: 5.1_

  - [x] 6.6 Test state management
    - Test "Clear All" button resets Notes filter
    - Test "Clear filters" link resets Notes filter
    - Test closing and reopening dialog preserves Notes filter
    - Test "Advanced filters active" badge shows when Notes filter is active
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 6.7 Test pagination
    - Verify pagination resets to page 1 when Notes filter changes
    - Verify Notes filter is preserved when navigating between pages
    - _Requirements: 6.2, 6.3_

  - [x] 6.8 Test responsive layout
    - Test on mobile (single column)
    - Test on tablet (2 columns)
    - Test on desktop (3 columns)
    - Verify Notes field appears after Photo Status on all screen sizes
    - _Requirements: 4.1, 4.2_

- [x] 7. Verify visual design and accessibility
  - [x] 7.1 Verify visual consistency
    - Check that Notes field matches styling of other text fields
    - Verify FileText icon is displayed correctly
    - Verify operator dropdown width is 120px
    - Verify input placeholder text is "Value..."
    - Verify checkbox and label alignment
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 7.2 Test keyboard navigation
    - Tab through all fields in correct order
    - Test operator dropdown with keyboard (Space/Enter, Arrow keys)
    - Test text input with keyboard
    - Test checkbox with keyboard (Space to toggle)
    - _Requirements: Accessibility_

  - [x] 7.3 Test screen reader support
    - Verify label is properly associated with input
    - Verify checkbox label is properly associated
    - Test with screen reader to ensure proper announcements
    - _Requirements: Accessibility_

  - [x] 7.4 Verify disabled states
    - Check visual indication when input is disabled
    - Check visual indication when checkbox is disabled
    - Verify cursor changes appropriately
    - _Requirements: 2.6, 2.7, 3.5_
