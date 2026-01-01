# Requirements Document

## Introduction

This document specifies the requirements for adding configurable Access Control settings to the Event Settings in credential.studio. The feature allows event administrators to enable or disable access control functionality per event and configure how badge validity dates are interpreted (date-only vs. date-time precision).

When Access Control is enabled, attendee records include validity window fields (`validFrom`, `validUntil`) and an access status field (`accessEnabled`) that control badge access. These fields already exist in the Appwrite database; this feature adds the event-level configuration to control their visibility and behavior.

## Glossary

- **Access Control**: A feature that restricts badge access based on validity dates and access status
- **Event Settings**: The configuration panel for event-specific settings in the dashboard
- **validFrom**: The date/datetime when a badge becomes valid for entry
- **validUntil**: The date/datetime when a badge expires and is no longer valid
- **accessEnabled**: A boolean field indicating whether an attendee's badge is currently active
- **Time Mode**: The interpretation mode for validity dates (date-only or date-time)
- **Date-only Mode**: Validity interpreted as full days (12:00 AM start, 11:59 PM end)
- **Date-time Mode**: Validity interpreted with exact timestamps down to the minute

## Requirements

### Requirement 1

**User Story:** As an event administrator, I want to enable or disable Access Control for my event, so that I can choose whether to use badge validity restrictions.

#### Acceptance Criteria

1. WHEN an administrator views Event Settings THEN the System SHALL display an "Enable Access Control" toggle in a dedicated Access Control section
2. WHEN an administrator enables Access Control THEN the System SHALL store `accessControlEnabled: true` in the event settings
3. WHEN an administrator disables Access Control THEN the System SHALL store `accessControlEnabled: false` in the event settings
4. WHEN Access Control is disabled THEN the System SHALL hide all access control fields (validFrom, validUntil, accessEnabled) from the attendee form and table
5. WHEN Access Control is enabled THEN the System SHALL display access control fields in the attendee form and table
6. WHEN a new event is created THEN the System SHALL set Access Control to disabled by default

### Requirement 2

**User Story:** As an event administrator, I want to see a warning when enabling Access Control, so that I understand this is an advanced feature requiring additional hardware.

#### Acceptance Criteria

1. WHEN Access Control is enabled THEN the System SHALL display a warning notice near the toggle
2. WHEN displaying the warning THEN the System SHALL state that this feature is for advanced use only
3. WHEN displaying the warning THEN the System SHALL indicate that additional hardware (mobile scanning devices) is required for the feature to work correctly
4. WHEN Access Control is disabled THEN the System SHALL hide the warning notice

### Requirement 3

**User Story:** As an event administrator, I want to configure how badge validity dates are interpreted, so that I can choose between date-only or precise date-time validation.

#### Acceptance Criteria

1. WHEN Access Control is enabled THEN the System SHALL display a "Time Mode" selector with two options: "Date only" and "Date and time"
2. WHEN "Date only" mode is selected THEN the System SHALL store `accessControlTimeMode: 'date_only'` in event settings
3. WHEN "Date and time" mode is selected THEN the System SHALL store `accessControlTimeMode: 'date_time'` in event settings
4. WHEN Access Control is disabled THEN the System SHALL hide the Time Mode selector
5. WHEN Access Control is enabled for the first time THEN the System SHALL default to "Date only" mode

### Requirement 4

**User Story:** As an event administrator, I want the attendee form to show appropriate date inputs based on the Time Mode setting, so that I can enter validity dates in the correct format.

#### Acceptance Criteria

1. WHEN Time Mode is "Date only" AND Access Control is enabled THEN the System SHALL display date-only pickers for validFrom and validUntil fields
2. WHEN Time Mode is "Date and time" AND Access Control is enabled THEN the System SHALL display date-time pickers (with hour and minute selection) for validFrom and validUntil fields
3. WHEN validFrom is set in "Date only" mode THEN the System SHALL interpret the date as starting at 12:00 AM (00:00:00) in the event timezone
4. WHEN validUntil is set in "Date only" mode THEN the System SHALL interpret the date as ending at 11:59 PM (23:59:59) in the event timezone
5. WHEN validFrom is set in "Date and time" mode THEN the System SHALL store the exact timestamp specified by the administrator
6. WHEN validUntil is set in "Date and time" mode THEN the System SHALL store the exact timestamp specified by the administrator

### Requirement 5

**User Story:** As an event administrator, I want the accessEnabled field to be visible when Access Control is enabled, so that I can immediately enable or disable individual attendee access.

#### Acceptance Criteria

1. WHEN Access Control is enabled THEN the System SHALL display an "Access Status" field in the attendee form with options "Active" and "Inactive"
2. WHEN creating a new attendee with Access Control enabled THEN the System SHALL default accessEnabled to "Active" (true)
3. WHEN Access Control is disabled THEN the System SHALL hide the Access Status field from the attendee form
4. WHEN Access Control is disabled THEN the System SHALL hide the Access Status column from the attendees table

### Requirement 6

**User Story:** As an event administrator, I want the attendees table to show access control columns when enabled, so that I can quickly see badge validity status.

#### Acceptance Criteria

1. WHEN Access Control is enabled THEN the System SHALL display validFrom, validUntil, and accessEnabled columns in the attendees table
2. WHEN Access Control is disabled THEN the System SHALL hide validFrom, validUntil, and accessEnabled columns from the attendees table
3. WHEN displaying validity dates in the table THEN the System SHALL format dates according to the Time Mode setting (date-only or date-time)
4. WHEN displaying accessEnabled in the table THEN the System SHALL show "Active" or "Inactive" status with appropriate visual indicators

### Requirement 7

**User Story:** As a system integrator, I want API responses to include access control configuration, so that mobile apps can correctly enforce badge validity.

#### Acceptance Criteria

1. WHEN fetching event settings via API THEN the System SHALL include `accessControlEnabled` and `accessControlTimeMode` fields in the response
2. WHEN fetching attendee data via API AND Access Control is enabled THEN the System SHALL include validFrom, validUntil, and accessEnabled fields
3. WHEN fetching attendee data via API AND Access Control is disabled THEN the System SHALL still include the access control fields (for backward compatibility) but mobile apps should ignore them based on event settings
4. WHEN the mobile app receives event settings THEN the System SHALL provide the Time Mode so the app can correctly interpret validity dates

### Requirement 8

**User Story:** As an event administrator, I want validation on validity date fields, so that I cannot set invalid date ranges.

#### Acceptance Criteria

1. IF validFrom is set after validUntil THEN the System SHALL display a validation error and prevent saving
2. WHEN validFrom is left empty THEN the System SHALL treat the badge as valid from creation time
3. WHEN validUntil is left empty THEN the System SHALL treat the badge as valid indefinitely
4. WHEN both validFrom and validUntil are empty THEN the System SHALL treat the badge as always valid (subject to accessEnabled status)
