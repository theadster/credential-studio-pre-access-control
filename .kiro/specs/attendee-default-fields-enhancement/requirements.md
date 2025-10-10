# Requirements Document

## Introduction

This feature enhances the attendee data model by adding two new default fields (Credential Type and Notes) and introducing visibility control for custom fields on the main Attendees page. Currently, attendees only have First Name, Last Name, and Barcode as starting fields. This enhancement provides more flexibility for event organizers to capture essential information upfront while maintaining a clean, customizable interface.

The Credential Type field will be a dropdown that can be fully configured through the Event's custom fields section, allowing organizers to define their own credential categories (e.g., VIP, Staff, Press, General Admission). The Notes field provides a quick way to capture important contextual information about each attendee. The visibility control feature allows administrators to declutter the main Attendees page by hiding less frequently accessed custom fields while keeping them available in the edit view.

## Requirements

### Requirement 1: Add Credential Type Default Field

**User Story:** As an event organizer, I want a Credential Type dropdown field available by default for all attendees, so that I can quickly categorize attendees without having to create a custom field first.

#### Acceptance Criteria

1. WHEN a new event is initialized THEN the system SHALL create a "Credential Type" custom field with type "dropdown"
2. WHEN viewing the attendee creation form THEN the system SHALL display the Credential Type field alongside First Name, Last Name, and Barcode
3. WHEN an administrator accesses the Event's custom fields section THEN the system SHALL allow full editing of the Credential Type field options
4. WHEN an administrator adds or removes options from Credential Type THEN the system SHALL update the dropdown choices in the attendee form immediately
5. WHEN creating or editing an attendee THEN the system SHALL allow selection of any configured Credential Type option
6. WHEN no Credential Type options are configured THEN the system SHALL display an empty dropdown with a prompt to configure options
7. IF the Credential Type field is deleted from custom fields THEN the system SHALL remove it from the attendee form

### Requirement 2: Add Notes Default Field

**User Story:** As an event staff member, I want a Notes field available by default for all attendees, so that I can quickly record important information or special requirements without navigating through custom fields.

#### Acceptance Criteria

1. WHEN a new event is initialized THEN the system SHALL create a "Notes" custom field with type "textarea"
2. WHEN viewing the attendee creation form THEN the system SHALL display the Notes field as a 2-line text box
3. WHEN viewing the attendee edit form THEN the system SHALL display the Notes field with existing content
4. WHEN entering text in the Notes field THEN the system SHALL allow up to a reasonable character limit (e.g., 500 characters)
5. WHEN saving an attendee record THEN the system SHALL persist the Notes content
6. WHEN an administrator accesses the Event's custom fields section THEN the system SHALL allow editing of the Notes field properties (label, required status, etc.)
7. IF the Notes field is deleted from custom fields THEN the system SHALL remove it from the attendee form

### Requirement 3: Custom Field Visibility Control

**User Story:** As an event administrator, I want to control which custom fields are visible on the main Attendees page, so that I can keep the interface clean and focused on the most important information.

#### Acceptance Criteria

1. WHEN creating or editing a custom field THEN the system SHALL provide a "Show on main page" checkbox option
2. WHEN a custom field is created THEN the system SHALL default the "Show on main page" option to checked (visible)
3. WHEN the "Show on main page" checkbox is unchecked THEN the system SHALL hide that field from the main Attendees list/table view
4. WHEN the "Show on main page" checkbox is checked THEN the system SHALL display that field in the main Attendees list/table view
5. WHEN viewing the attendee edit page THEN the system SHALL display ALL custom fields regardless of visibility setting
6. WHEN viewing the attendee creation page THEN the system SHALL display ALL custom fields regardless of visibility setting
7. WHEN an administrator changes a field's visibility setting THEN the system SHALL update the main Attendees page display immediately
8. WHEN exporting attendee data THEN the system SHALL include ALL custom fields regardless of visibility setting
9. IF no custom fields are marked as visible THEN the system SHALL display only the core fields (First Name, Last Name, Barcode) on the main page

### Requirement 4: Database Schema Updates

**User Story:** As a system administrator, I want the database schema to support the new default fields and visibility control, so that the data is properly structured and persisted.

#### Acceptance Criteria

1. WHEN the system is updated THEN the custom_fields collection SHALL include a new boolean attribute "showOnMainPage"
2. WHEN creating new custom fields THEN the system SHALL default "showOnMainPage" to true (visible)
3. WHEN a new event is initialized THEN the system SHALL automatically create the "Credential Type" custom field record
4. WHEN a new event is initialized THEN the system SHALL automatically create the "Notes" custom field record
5. WHEN querying attendees for the main page THEN the system SHALL efficiently filter which custom field values to return based on visibility settings

### Requirement 5: User Interface Updates

**User Story:** As an event staff member, I want the user interface to clearly show which fields are visible on the main page, so that I understand how the data will be displayed.

#### Acceptance Criteria

1. WHEN viewing the custom fields management page THEN the system SHALL display a visibility indicator (icon or badge) for each field
2. WHEN editing a custom field THEN the system SHALL clearly label the visibility checkbox with descriptive text
3. WHEN viewing the main Attendees page THEN the system SHALL only display columns for visible custom fields
4. WHEN the main Attendees page loads THEN the system SHALL maintain good performance even with many custom fields
5. WHEN hovering over a visibility control THEN the system SHALL display a tooltip explaining the feature

### Requirement 6: Permissions and Access Control

**User Story:** As a system administrator, I want the new features to respect existing role-based permissions, so that security and access control remain consistent.

#### Acceptance Criteria

1. WHEN a user has permission to create attendees THEN the system SHALL allow them to fill in Credential Type and Notes fields
2. WHEN a user has permission to edit custom fields THEN the system SHALL allow them to modify the visibility settings
3. WHEN a user has permission to view attendees THEN the system SHALL show them only the visible custom fields on the main page
4. WHEN a user has permission to edit attendees THEN the system SHALL show them all custom fields in the edit form
5. WHEN a user lacks custom field management permissions THEN the system SHALL not display visibility controls to them
