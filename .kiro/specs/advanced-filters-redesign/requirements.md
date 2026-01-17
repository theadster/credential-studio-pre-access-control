# Requirements Document

## Introduction

This document defines the requirements for redesigning the Advanced Filters dialog in the credential.studio application. The current implementation suffers from several UX issues including a flat grid layout with no visual hierarchy, visual clutter from colorful icon badges (rainbow effect), no categorization of filter types, and poor scalability when many custom fields are present. The redesign aims to create a cleaner, more organized, and scalable filtering experience using collapsible accordion sections, an active filters summary bar, and simplified visual design following the established design system.

## Glossary

- **Advanced_Filters_Dialog**: The modal dialog component that provides multi-criteria search functionality for filtering attendees
- **Filter_Section**: A collapsible accordion group containing related filter fields (e.g., Basic Information, Custom Fields)
- **Active_Filters_Bar**: A horizontal summary bar displaying currently applied filters as removable badge chips
- **Filter_Chip**: A removable badge component representing a single active filter with one-click removal capability
- **Filter_Field**: An individual filter input (text, select, date range, etc.) within a filter section
- **Custom_Field**: User-defined fields configured in event settings that extend the attendee data model
- **Access_Control_Section**: Filter section for access control fields (only visible when access control is enabled in event settings)
- **Progressive_Disclosure**: UX pattern where content is revealed progressively to reduce cognitive load

## Requirements

### Requirement 1: Collapsible Accordion Sections

**User Story:** As an event administrator, I want filter fields organized into collapsible sections, so that I can focus on relevant filters without being overwhelmed by all options at once.

#### Acceptance Criteria

1. WHEN the Advanced_Filters_Dialog opens, THE Dialog SHALL display filter fields organized into collapsible accordion sections
2. THE Advanced_Filters_Dialog SHALL group filters into the following sections in order: Basic Information, Notes & Content, Access Control (conditional), Custom Fields
3. WHEN a section contains active filters, THE section header SHALL display a badge showing the count of active filters in that section
4. WHEN the user clicks on a collapsed section header, THE section SHALL expand to reveal its filter fields
5. WHEN the user clicks on an expanded section header, THE section SHALL collapse to hide its filter fields
6. THE Basic Information section SHALL contain: First Name, Last Name, Barcode, and Photo Status filters
7. THE Notes & Content section SHALL contain: Notes text filter and Has Notes checkbox
8. IF access control is enabled in event settings, THEN THE Access Control section SHALL be visible and contain: Access Status, Valid From Range, and Valid Until Range filters
9. THE Custom Fields section SHALL contain all custom fields defined in event settings
10. WHEN the dialog first opens, THE Basic Information section SHALL be expanded by default
11. THE Advanced_Filters_Dialog SHALL allow multiple sections to be expanded simultaneously

### Requirement 2: Active Filters Summary Bar

**User Story:** As an event administrator, I want to see all my active filters at a glance with the ability to quickly remove individual filters, so that I can efficiently manage my search criteria.

#### Acceptance Criteria

1. WHEN one or more filters are active, THE Advanced_Filters_Dialog SHALL display an Active_Filters_Bar at the top of the dialog content
2. THE Active_Filters_Bar SHALL display each active filter as a removable Filter_Chip badge
3. WHEN the user clicks the remove button on a Filter_Chip, THE corresponding filter SHALL be cleared immediately
4. THE Filter_Chip SHALL display the field name and current filter value in a readable format
5. WHEN all filters are cleared, THE Active_Filters_Bar SHALL be hidden
6. THE Active_Filters_Bar SHALL include a "Clear All" button to remove all active filters at once
7. WHEN a filter value changes, THE Active_Filters_Bar SHALL update immediately to reflect the change
8. THE Active_Filters_Bar SHALL be horizontally scrollable if the number of chips exceeds the available width

### Requirement 3: Simplified Visual Design

**User Story:** As an event administrator, I want a clean and consistent visual design, so that the filter interface is easy to scan and use without visual distractions.

#### Acceptance Criteria

1. THE Advanced_Filters_Dialog SHALL use muted, consistent icon colors (text-muted-foreground) instead of colorful per-field icon badges
2. THE filter field cards SHALL use semantic color classes (bg-card, border-border) instead of direct color values
3. THE Advanced_Filters_Dialog SHALL follow the design system spacing guidelines (gap-4 default, gap-6 comfortable)
4. THE filter field labels SHALL use consistent typography (font-medium, text-sm)
5. THE Advanced_Filters_Dialog SHALL support dark mode using appropriate dark: prefix classes
6. THE accordion section headers SHALL use consistent styling with subtle visual hierarchy
7. THE filter inputs SHALL use the standard input styling (bg-background, border-input)

### Requirement 4: Component Extraction

**User Story:** As a developer, I want the Advanced Filters functionality extracted into a dedicated component, so that the code is maintainable, testable, and reusable.

#### Acceptance Criteria

1. THE Advanced_Filters_Dialog SHALL be implemented as a standalone component in src/components/AdvancedFiltersDialog.tsx
2. THE AdvancedFiltersDialog component SHALL accept the following props: eventSettings, filters, onFiltersChange, onApply, onClear
3. THE AdvancedFiltersDialog component SHALL emit filter changes through the onFiltersChange callback
4. THE AdvancedFiltersDialog component SHALL be importable and usable from the dashboard page
5. THE component SHALL maintain the existing filter state structure for backward compatibility
6. THE component SHALL handle all filter types: text with operators, select/multi-select, boolean, date ranges

### Requirement 5: Filter Field Functionality Preservation

**User Story:** As an event administrator, I want all existing filter capabilities preserved in the redesign, so that I don't lose any functionality I currently rely on.

#### Acceptance Criteria

1. THE text filter fields SHALL support operators: Contains, Equals, Starts With, Ends With, Is Empty, Is Not Empty
2. WHEN a text filter operator is set to Is Empty or Is Not Empty, THE value input SHALL be disabled
3. THE Photo Status filter SHALL support options: All Attendees, With Photo, Without Photo
4. THE Notes filter SHALL support both text search and a "Has Notes" checkbox option
5. THE select-type custom fields SHALL support multi-select with searchable dropdown
6. THE boolean-type custom fields SHALL support options: All, Yes, No
7. THE Access Control filters SHALL support: Access Status (All/Active/Inactive) and date range filters for Valid From and Valid Until
8. WHEN the Apply Search button is clicked with no filters set, THE system SHALL display an error message

### Requirement 6: Responsive Layout

**User Story:** As an event administrator, I want the Advanced Filters dialog to work well on different screen sizes, so that I can use it effectively on various devices.

#### Acceptance Criteria

1. THE Advanced_Filters_Dialog SHALL use responsive grid layouts within accordion sections
2. ON mobile viewports (< 768px), THE filter fields within sections SHALL stack vertically (single column)
3. ON tablet viewports (768px - 1024px), THE filter fields within sections SHALL display in 2 columns
4. ON desktop viewports (> 1024px), THE filter fields within sections SHALL display in 3 columns
5. THE dialog SHALL have a maximum width of max-w-4xl to prevent excessive stretching on large screens
6. THE dialog content SHALL be scrollable with max-h-[80vh] to handle many custom fields

### Requirement 7: Accessibility

**User Story:** As an event administrator using assistive technology, I want the Advanced Filters dialog to be fully accessible, so that I can use all filtering features effectively.

#### Acceptance Criteria

1. THE accordion sections SHALL be keyboard navigable using Tab, Enter, and Space keys
2. THE accordion sections SHALL have appropriate ARIA attributes (aria-expanded, aria-controls)
3. THE Filter_Chip remove buttons SHALL have accessible labels describing the action
4. THE form inputs SHALL have associated labels using htmlFor/id attributes
5. THE dialog SHALL trap focus when open and return focus to the trigger when closed
6. THE Active_Filters_Bar SHALL announce changes to screen readers using aria-live regions

### Requirement 8: Performance

**User Story:** As an event administrator with many custom fields, I want the Advanced Filters dialog to remain responsive, so that I can filter efficiently even with complex configurations.

#### Acceptance Criteria

1. WHEN the dialog opens, THE component SHALL render within 100ms for up to 50 custom fields
2. THE filter state updates SHALL not cause unnecessary re-renders of unaffected sections
3. THE multi-select dropdowns SHALL use virtualization or lazy loading for options lists exceeding 100 items
4. THE Active_Filters_Bar SHALL update efficiently without re-rendering the entire dialog
