# Implementation Plan: Advanced Filters Redesign

## Overview

This implementation plan breaks down the Advanced Filters Redesign into discrete, incremental tasks. Each task builds on previous work, with property-based tests validating correctness properties from the design document.

## Tasks

- [x] 1. Set up component structure and utility functions
  - [x] 1.1 Create filter utility functions in src/lib/filterUtils.ts
    - Implement `countSectionFilters(filters, section)` function
    - Implement `filtersToChips(filters, eventSettings)` function
    - Implement `hasActiveFilters(filters)` function
    - Implement `formatFilterValue(value, operator, fieldType)` function
    - _Requirements: 1.3, 2.2, 2.4_

  - [x] 1.2 Write property test for filter count accuracy
    - **Property 1: Section Filter Count Badge Accuracy**
    - **Validates: Requirements 1.3**

  - [x] 1.3 Write property test for filters to chips conversion
    - **Property 3: Active Filters Bar Chip Accuracy**
    - **Validates: Requirements 2.1, 2.2, 2.4**

- [x] 2. Implement ActiveFiltersBar component
  - [x] 2.1 Create ActiveFiltersBar component in src/components/AdvancedFiltersDialog/ActiveFiltersBar.tsx
    - Render filter chips using Badge component
    - Implement chip removal with X button
    - Add Clear All button
    - Use horizontal ScrollArea for overflow
    - Add aria-live region for screen reader announcements
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 2.8, 7.6_

  - [x] 2.2 Write unit tests for ActiveFiltersBar
    - Test chip rendering for various filter states
    - Test chip removal callback
    - Test Clear All functionality
    - Test visibility when no filters active
    - _Requirements: 2.1, 2.3, 2.5, 2.6_

- [x] 3. Implement filter section components
  - [x] 3.1 Create BasicInfoSection component
    - Implement First Name, Last Name, Barcode text filters with operators
    - Implement Photo Status select filter
    - Use consistent muted icon styling
    - Ensure label associations for accessibility
    - _Requirements: 1.6, 3.1, 3.4, 5.1, 5.3, 7.4_

  - [x] 3.2 Create NotesContentSection component
    - Implement Notes text filter with operators
    - Implement Has Notes checkbox
    - _Requirements: 1.7, 5.4_

  - [x] 3.3 Create AccessControlSection component
    - Implement Access Status select (All/Active/Inactive)
    - Implement Valid From date range inputs
    - Implement Valid Until date range inputs
    - _Requirements: 1.8, 5.7_

  - [x] 3.4 Create CustomFieldsSection component
    - Render filter for each custom field from event settings
    - Handle text, select, multi-select, and boolean field types
    - Use Popover with ScrollArea for multi-select dropdowns
    - _Requirements: 1.9, 5.5, 5.6, 8.3_

  - [x] 3.5 Write property test for custom fields completeness
    - **Property 2: Custom Fields Section Completeness**
    - **Validates: Requirements 1.9**

  - [x] 3.6 Write property test for operator-based input state
    - **Property 5: Operator-Based Input State**
    - **Validates: Requirements 5.2**

- [x] 4. Checkpoint - Ensure all section components work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement main AdvancedFiltersDialog component
  - [x] 5.1 Create AdvancedFiltersDialog component structure
    - Set up Dialog with header and footer
    - Implement Accordion with multiple sections
    - Configure Basic Information section expanded by default
    - Allow multiple sections expanded simultaneously (type="multiple")
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.10, 1.11_

  - [x] 5.2 Integrate section components into accordion
    - Add BasicInfoSection to Basic Information accordion item
    - Add NotesContentSection to Notes & Content accordion item
    - Add AccessControlSection conditionally based on eventSettings.accessControlEnabled
    - Add CustomFieldsSection to Custom Fields accordion item
    - Display filter count badges in section headers
    - _Requirements: 1.2, 1.3, 1.8_

  - [x] 5.3 Integrate ActiveFiltersBar
    - Render ActiveFiltersBar at top of dialog content
    - Connect chip removal to filter state updates
    - Connect Clear All to onClear callback
    - _Requirements: 2.1, 2.3, 2.6_

  - [x] 5.4 Implement action footer
    - Add Clear All Filters button (ghost variant)
    - Add Cancel button (outline variant)
    - Add Apply Search button (primary)
    - Validate at least one filter is set before applying
    - _Requirements: 5.8_

  - [x] 5.5 Write property test for filter change reactivity
    - **Property 4: Filter Change Reactivity**
    - **Validates: Requirements 2.3, 2.7, 4.3**

  - [x] 5.6 Write property test for form input label associations
    - **Property 6: Form Input Label Associations**
    - **Validates: Requirements 7.4**

- [x] 6. Apply responsive layout and styling
  - [x] 6.1 Implement responsive grid layouts
    - Configure grid-cols-1 for mobile (< 768px)
    - Configure md:grid-cols-2 for tablet (768px - 1024px)
    - Configure lg:grid-cols-3 for desktop (> 1024px)
    - Set dialog max-w-4xl and max-h-[80vh]
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 6.2 Apply design system styling
    - Use text-muted-foreground for icons
    - Use bg-card and border-border for filter cards
    - Apply gap-4 spacing within sections
    - Ensure dark mode support with dark: prefix classes
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.7_

- [x] 7. Checkpoint - Ensure component is fully functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integrate with dashboard and cleanup
  - [x] 8.1 Update dashboard.tsx to use AdvancedFiltersDialog
    - Import AdvancedFiltersDialog component
    - Replace inline Advanced Filters dialog with component
    - Pass required props (eventSettings, filters, callbacks)
    - Maintain existing filter state structure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 8.2 Remove old inline implementation from dashboard.tsx
    - Remove old Dialog and filter field JSX (~500 lines)
    - Keep filter state and handler functions in dashboard
    - Verify no regressions in filter functionality
    - _Requirements: 4.1_

  - [x] 8.3 Write integration tests
    - Test dialog opens from dashboard
    - Test filter state persists after dialog close
    - Test Apply Search filters attendees correctly
    - _Requirements: 4.4, 5.8_

- [x] 9. Final checkpoint - Complete verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all requirements are met
  - Test with various custom field configurations
  - Test accessibility with keyboard navigation

## Notes

- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- Test files should be placed in `src/__tests__/components/AdvancedFiltersDialog/`
