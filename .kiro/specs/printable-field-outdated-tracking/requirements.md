# Requirements Document

## Introduction

This feature adds a "printable" flag to custom fields that controls whether changes to that field should mark an attendee's credential as OUTDATED. This allows the system to intelligently track when a credential needs to be reprinted based only on changes to fields that actually appear on the printed credential, avoiding unnecessary reprints when non-printed information (like email addresses or internal notes) is updated.

## Glossary

- **Custom Field**: A user-defined field that can be added to attendee records to capture additional information beyond the default fields.
- **Printable Field**: A custom field that is marked as appearing on the printed credential. Changes to printable fields mark the credential as OUTDATED.
- **Non-Printable Field**: A custom field that does not appear on the printed credential. Changes to these fields do NOT mark the credential as OUTDATED.
- **OUTDATED Status**: A flag on an attendee record indicating that the credential image needs to be regenerated because printable information has changed since the last credential generation.
- **CURRENT Status**: A flag indicating that the credential image is up-to-date with all printable field values.
- **Credential Image**: The generated image file that is printed on physical credentials, created through the Switchboard Canvas API.
- **Event Settings Form**: The administrative interface where custom fields are configured, including their visibility, requirement, and printable status.
- **Attendee Form**: The interface where staff enter or update attendee information.

## Requirements

### Requirement 1

**User Story:** As an event administrator, I want to mark custom fields as "printable" or "non-printable" so that the system knows which field changes should trigger a credential reprint.

#### Acceptance Criteria

1. WHEN an administrator creates or edits a custom field in the Event Settings Form, THE System SHALL display a "Printable" toggle option alongside the existing "Required" and "Visible" toggles.
2. WHEN an administrator enables the "Printable" toggle for a custom field, THE System SHALL store the printable status as true in the custom field configuration.
3. WHEN an administrator disables the "Printable" toggle for a custom field, THE System SHALL store the printable status as false in the custom field configuration.
4. WHEN an administrator saves the Event Settings Form, THE System SHALL persist all printable field configurations to the event_settings collection in the database.
5. THE System SHALL set the default value of the "Printable" toggle to false for newly created custom fields.

### Requirement 2

**User Story:** As an event administrator, I want existing custom fields to have a default printable status so that the system behaves predictably after the feature is deployed.

#### Acceptance Criteria

1. WHEN the printable field feature is deployed, THE System SHALL treat all existing custom fields without a printable flag as non-printable (printable: false).
2. WHEN an administrator views existing custom fields in the Event Settings Form, THE System SHALL display the "Printable" toggle in the unchecked state for fields that do not have the printable property defined.
3. WHEN an administrator saves the Event Settings Form with existing fields, THE System SHALL add the printable property to any custom fields that do not have it, setting the value based on the toggle state.

### Requirement 3

**User Story:** As a staff member, I want the system to automatically mark credentials as OUTDATED when I change printable field values so that I know which credentials need to be reprinted.

#### Acceptance Criteria

1. WHEN a staff member updates an attendee record through the Attendee Form, THE System SHALL compare the changed fields against the custom field configuration to identify which fields are marked as printable.
2. IF a staff member changes the value of one or more printable fields, THEN THE System SHALL set the attendee record status to OUTDATED.
3. IF a staff member changes only non-printable field values, THEN THE System SHALL NOT change the attendee record status to OUTDATED.
4. WHEN a staff member saves an attendee record with changes to both printable and non-printable fields, THE System SHALL mark the record as OUTDATED because at least one printable field changed.
5. THE System SHALL perform the printable field check on every attendee update operation, including individual edits and bulk edit operations.

### Requirement 4

**User Story:** As a staff member, I want to see which attendee records have OUTDATED credentials so that I can prioritize reprinting them.

#### Acceptance Criteria

1. WHEN a staff member views the attendees list on the dashboard, THE System SHALL display a visual indicator (badge or icon) for attendee records with OUTDATED status.
2. WHEN a staff member views an individual attendee record, THE System SHALL display the current credential status (CURRENT or OUTDATED) prominently in the interface.
3. THE System SHALL provide a filter option on the attendees list to show only records with OUTDATED status.
4. THE System SHALL provide a filter option on the attendees list to show only records with CURRENT status.

### Requirement 5

**User Story:** As a staff member, I want the system to automatically mark a credential as CURRENT when a new credential image is generated so that the status accurately reflects the credential state.

#### Acceptance Criteria

1. WHEN a credential image is generated through the Switchboard Canvas API for an attendee, THE System SHALL set the attendee record status to CURRENT.
2. WHEN a credential image is generated through bulk credential generation, THE System SHALL set all successfully generated attendee records to CURRENT status.
3. IF credential generation fails for an attendee, THEN THE System SHALL NOT change the attendee record status.
4. THE System SHALL update the credential status immediately after successful image generation, before returning the response to the user.

### Requirement 6

**User Story:** As an event administrator, I want to understand which fields are printable when configuring custom fields so that I can make informed decisions about the printable flag.

#### Acceptance Criteria

1. WHEN an administrator hovers over or focuses on the "Printable" toggle in the Event Settings Form, THE System SHALL display a tooltip or help text explaining what the printable flag does.
2. THE System SHALL display help text that reads: "Mark this field as printable if it appears on the credential. Changes to printable fields will mark credentials as outdated and require reprinting."
3. WHEN an administrator views the custom fields list in the Event Settings Form, THE System SHALL visually indicate which fields are currently marked as printable.

### Requirement 7

**User Story:** As a developer, I want the printable field logic to be properly integrated with the existing custom field validation system so that the feature works reliably across all attendee operations.

#### Acceptance Criteria

1. THE System SHALL add a printable property to the custom field type definition in the TypeScript interfaces.
2. THE System SHALL update the custom field validation schema to include the printable property as an optional boolean field.
3. THE System SHALL ensure that all API endpoints that modify attendee records check for printable field changes and update the OUTDATED status accordingly.
4. THE System SHALL ensure that the printable field logic works correctly with the existing custom field visibility and requirement logic.
5. THE System SHALL maintain backward compatibility with existing custom field configurations that do not have the printable property.

### Requirement 8

**User Story:** As an event administrator, I want changes to the printable flag configuration to not automatically mark existing credentials as OUTDATED so that I can adjust settings without triggering mass reprints.

#### Acceptance Criteria

1. WHEN an administrator changes a custom field from non-printable to printable, THE System SHALL NOT automatically mark existing attendee records as OUTDATED.
2. WHEN an administrator changes a custom field from printable to non-printable, THE System SHALL NOT automatically mark existing attendee records as CURRENT.
3. THE System SHALL only evaluate the printable flag when attendee data is actually modified, not when the field configuration changes.
4. WHEN an administrator saves Event Settings with printable flag changes, THE System SHALL display a message indicating that existing credential statuses will not be affected until attendee records are updated.
