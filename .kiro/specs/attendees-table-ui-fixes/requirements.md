# Requirements Document

## Introduction

This specification addresses two UI issues on the Attendees page table:
1. Column header alignment - The column titles (Barcode, Credential, Status, Actions) are not properly centered with their associated content items
2. Purple border flash - When clicking an attendee name to open the edit dialog, a purple focus ring briefly appears in the table cell

These issues affect the visual polish and user experience of the attendees table, which is a core feature of the application.

## Requirements

### Requirement 1: Fix Column Header Alignment

**User Story:** As an event administrator, I want the column headers to be properly aligned with their content, so that the table is easier to read and looks more professional.

#### Acceptance Criteria

1. WHEN viewing the attendees table THEN the "Barcode" column header SHALL be centered above the barcode badges
2. WHEN viewing the attendees table THEN the "Credential" column header SHALL be centered above the credential icons
3. WHEN viewing the attendees table THEN the "Status" column header SHALL be centered above the status badges
4. WHEN viewing the attendees table THEN the "Actions" column header SHALL be centered above the action buttons
5. WHEN viewing the attendees table THEN the "Photo" column header SHALL be centered above the photo thumbnails
6. WHEN viewing the attendees table THEN all column headers SHALL maintain consistent spacing and alignment across different screen sizes

### Requirement 2: Remove Purple Border Flash on Name Click

**User Story:** As an event administrator, I want to click on attendee names without seeing a distracting purple border flash, so that the interface feels more polished and professional.

#### Acceptance Criteria

1. WHEN clicking an attendee name to edit THEN no purple border or focus ring SHALL appear in the table cell
2. WHEN clicking an attendee name THEN the edit dialog SHALL open smoothly without visual artifacts
3. WHEN using keyboard navigation THEN focus indicators SHALL still be visible for accessibility
4. WHEN the button receives focus via keyboard THEN the focus ring SHALL be visible
5. WHEN the button is clicked with a mouse THEN the focus ring SHALL not appear
