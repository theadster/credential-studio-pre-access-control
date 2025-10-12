# Requirements Document

## Introduction

This feature adds a Notes search capability to the advanced search functionality in the attendees dashboard. Users will be able to search for attendees based on the content of their notes field, with options to search by text content or simply filter for attendees who have notes.

The Notes field was recently added as a permanent field to the attendee records, and this enhancement makes it searchable through the advanced search interface, improving the ability to find and filter attendees based on their notes.

## Requirements

### Requirement 1: Notes Text Search

**User Story:** As an event administrator, I want to search for attendees by the content in their notes field, so that I can quickly find attendees with specific information recorded in their notes.

#### Acceptance Criteria

1. WHEN the user opens the Advanced Search dialog THEN a "Notes" search field SHALL be displayed after the "Photo Status" field
2. WHEN the user enters text in the Notes search field THEN the attendee list SHALL filter to show only attendees whose notes contain the search text (case-insensitive)
3. WHEN the Notes search field is empty AND no operator is selected THEN all attendees SHALL be included in the results (no filtering applied)
4. WHEN the user types in the Notes search field THEN the filtering SHALL update the attendee list in real-time
5. WHEN the user clears the Notes search field THEN the attendee list SHALL return to showing all attendees (subject to other active filters)

### Requirement 2: Notes Search Operators

**User Story:** As an event administrator, I want to use different search operators for the notes field, so that I can perform precise searches based on my needs.

#### Acceptance Criteria

1. WHEN the user clicks the operator dropdown for Notes THEN the following options SHALL be available: "Contains", "Equals", "Starts With", "Ends With", "Is Empty", "Is Not Empty"
2. WHEN the operator is set to "Contains" THEN the search SHALL match attendees whose notes contain the search text anywhere within the field
3. WHEN the operator is set to "Equals" THEN the search SHALL match attendees whose notes exactly match the search text
4. WHEN the operator is set to "Starts With" THEN the search SHALL match attendees whose notes begin with the search text
5. WHEN the operator is set to "Ends With" THEN the search SHALL match attendees whose notes end with the search text
6. WHEN the operator is set to "Is Empty" THEN the search SHALL match attendees who have no notes (null or empty string) AND the text input field SHALL be disabled
7. WHEN the operator is set to "Is Not Empty" THEN the search SHALL match attendees who have any notes content AND the text input field SHALL be disabled
8. WHEN the operator is changed THEN the filtering SHALL immediately update to reflect the new operator logic

### Requirement 3: "Has Notes" Checkbox Filter

**User Story:** As an event administrator, I want a quick checkbox to filter for attendees who have notes, so that I can easily see which attendees have additional information recorded without typing a search query.

#### Acceptance Criteria

1. WHEN the user views the Notes search field THEN a checkbox labeled "Has Notes" SHALL be displayed below or next to the text input
2. WHEN the user checks the "Has Notes" checkbox THEN the attendee list SHALL filter to show only attendees who have non-empty notes
3. WHEN the user unchecks the "Has Notes" checkbox THEN the filter SHALL be removed and all attendees SHALL be shown (subject to other active filters)
4. WHEN the "Has Notes" checkbox is checked AND the user also enters text in the Notes search field THEN both filters SHALL be applied (attendees must have notes AND the notes must match the search criteria)
5. WHEN the operator is set to "Is Empty" or "Is Not Empty" THEN the "Has Notes" checkbox SHALL be disabled or hidden as it would be redundant

### Requirement 4: Visual Design and Placement

**User Story:** As an event administrator, I want the Notes search field to be visually consistent with other search fields, so that the interface remains intuitive and easy to use.

#### Acceptance Criteria

1. WHEN the user views the Advanced Search dialog THEN the Notes search field SHALL be positioned immediately after the "Photo Status" field
2. WHEN the user views the Notes search field THEN it SHALL have the same visual styling as other text search fields (First Name, Last Name, Barcode)
3. WHEN the user views the Notes search field THEN it SHALL display a FileText icon (or similar notes-related icon) next to the label
4. WHEN the user views the Notes search field THEN the label SHALL read "Notes"
5. WHEN the user views the Notes search field THEN it SHALL include the same operator dropdown pattern as other text fields
6. WHEN the user views the Notes search field THEN the placeholder text SHALL read "Value..." (consistent with other fields)

### Requirement 5: Advanced Search Integration

**User Story:** As an event administrator, I want the Notes search to work seamlessly with other advanced search filters, so that I can perform complex multi-criteria searches.

#### Acceptance Criteria

1. WHEN the user applies Notes search criteria along with other filters THEN all filters SHALL be applied using AND logic (attendees must match all criteria)
2. WHEN the user clicks "Clear All" in the Advanced Search dialog THEN the Notes search field SHALL be reset to empty with "Contains" operator
3. WHEN the user has active Notes search criteria THEN the "Advanced filters active" badge SHALL be displayed
4. WHEN the user clicks "Clear filters" THEN the Notes search criteria SHALL be cleared along with all other filters
5. WHEN the Advanced Search dialog is opened THEN the Notes search field SHALL be initialized with empty value and "Contains" operator

### Requirement 6: State Management and Performance

**User Story:** As an event administrator, I want the Notes search to perform efficiently even with large attendee lists, so that the interface remains responsive.

#### Acceptance Criteria

1. WHEN the user types in the Notes search field THEN the filtering SHALL use the existing filteredAttendees logic without causing performance degradation
2. WHEN the Notes search criteria changes THEN the pagination SHALL reset to page 1
3. WHEN the user navigates between pages THEN the Notes search criteria SHALL be preserved
4. WHEN the Advanced Search dialog is closed and reopened THEN the Notes search criteria SHALL be preserved until explicitly cleared
5. WHEN the component re-renders THEN the Notes search state SHALL be maintained using React state management

### Requirement 7: Empty and Null Value Handling

**User Story:** As an event administrator, I want the Notes search to correctly handle attendees with no notes, so that I can reliably filter based on the presence or absence of notes.

#### Acceptance Criteria

1. WHEN an attendee has a null notes field THEN it SHALL be treated as empty for search purposes
2. WHEN an attendee has an empty string notes field THEN it SHALL be treated as empty for search purposes
3. WHEN an attendee has whitespace-only notes THEN it SHALL be treated as having content (not empty)
4. WHEN the operator is "Is Empty" THEN attendees with null or empty string notes SHALL be included in results
5. WHEN the operator is "Is Not Empty" THEN only attendees with non-null, non-empty notes SHALL be included in results
