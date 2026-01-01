# Requirements Document

## Introduction

This document specifies the requirements for a mobile access control system that integrates with the existing credential.studio event management platform. The system enables event staff to scan attendee badges using a Rork-based mobile application (React Native/Expo) and determine entry approval based on flexible rule sets (approval profiles) defined in the web application.

The solution extends the existing Appwrite database with new collections for access control data, approval profiles, and scan logs. The mobile app operates fully offline with local data caching and synchronizes with the server when connectivity is available.

## Glossary

- **Access Control Record**: A database record containing badge validity window and access status for an attendee
- **Approval Profile**: A named set of rules that define entry requirements for a specific access point or attendee category
- **Rule**: A single condition that evaluates an attendee field against expected values
- **Rule Engine**: The mobile-side logic that evaluates approval profiles against attendee data
- **Scan Log**: A record of each badge scan attempt including result, timestamp, and device information
- **Rork**: A vibe-coded mobile development platform that generates React Native/Expo applications
- **Barcode**: The unique identifier printed on attendee badges, already integrated with the existing system

## Requirements

### Requirement 1

**User Story:** As an event administrator, I want to configure badge validity window per attendee, so that I can control when each badge is valid for entry.

#### Acceptance Criteria

1. WHEN an administrator views an attendee record THEN the System SHALL display validFrom and validUntil datetime fields
2. WHEN an administrator sets validFrom for an attendee THEN the System SHALL store the datetime in UTC format with timezone metadata
3. WHEN an administrator sets validUntil for an attendee THEN the System SHALL store the datetime in UTC format with timezone metadata
4. WHEN an administrator leaves validFrom empty THEN the System SHALL treat the badge as valid from creation time
5. WHEN an administrator leaves validUntil empty THEN the System SHALL treat the badge as valid indefinitely
6. IF validFrom is set after validUntil THEN the System SHALL display a validation error and prevent saving

### Requirement 2

**User Story:** As an event administrator, I want to set an access status (Enabled/Disabled) per attendee, so that I can immediately revoke access regardless of date settings.

#### Acceptance Criteria

1. WHEN an administrator views an attendee record THEN the System SHALL display an accessEnabled field with Enabled and Disabled options
2. WHEN an administrator creates a new attendee THEN the System SHALL set accessEnabled to true by default
3. WHEN an administrator sets accessEnabled to false THEN the System SHALL deny all scan attempts for that badge regardless of validity dates
4. WHEN an administrator changes accessEnabled from false to true THEN the System SHALL resume normal date-based validation for that badge

### Requirement 3

**User Story:** As an event administrator, I want to create and manage approval profiles with flexible rules, so that I can define different entry requirements for various access points.

#### Acceptance Criteria

1. WHEN an administrator accesses the approval profiles section THEN the System SHALL display a list of existing profiles with name, description, and rule count
2. WHEN an administrator creates a new approval profile THEN the System SHALL require a unique name and optional description
3. WHEN an administrator adds a rule to a profile THEN the System SHALL allow selection of any attendee field (core or custom)
4. WHEN an administrator configures a rule THEN the System SHALL support these operators: equals, not_equals, in_list, not_in_list, greater_than, less_than, between, is_true, is_false, is_empty, is_not_empty
5. WHEN an administrator adds multiple rules THEN the System SHALL allow combining rules with AND or OR logic
6. WHEN an administrator saves a profile THEN the System SHALL increment the profile version number
7. WHEN an administrator deletes a profile THEN the System SHALL mark it as deleted rather than removing it to preserve scan log references

### Requirement 4

**User Story:** As an event administrator, I want approval profiles to be versioned and synced to mobile devices, so that scanners always use the correct rules.

#### Acceptance Criteria

1. WHEN a profile is created or modified THEN the System SHALL assign an incrementing version number
2. WHEN the mobile app connects to the server THEN the System SHALL compare local profile versions with server versions
3. WHEN a newer profile version exists on the server THEN the System SHALL download and replace the local profile
4. WHEN the mobile app is offline THEN the System SHALL use the most recently synced profile versions
5. WHEN a profile is deleted on the server THEN the System SHALL mark the local profile as inactive on next sync

### Requirement 5

**User Story:** As a scanner operator, I want to authenticate the mobile app with the backend, so that only authorized devices can access attendee data.

#### Acceptance Criteria

1. WHEN a scanner operator launches the app for the first time THEN the System SHALL require authentication with valid credentials
2. WHEN authentication succeeds THEN the System SHALL store a session token securely on the device
3. WHEN the session token expires THEN the System SHALL prompt for re-authentication
4. WHEN authentication fails THEN the System SHALL display an error message and prevent data sync
5. WHEN a scanner operator logs out THEN the System SHALL clear cached attendee data and session tokens

### Requirement 6

**User Story:** As a scanner operator, I want to sync attendee data and photos to my device, so that I can scan badges offline.

#### Acceptance Criteria

1. WHEN the mobile app authenticates successfully THEN the System SHALL initiate a full sync of attendee data
2. WHEN syncing attendees THEN the System SHALL download all attendee records including access control fields and custom field values
3. WHEN syncing attendees THEN the System SHALL download attendee photos for local display
4. WHEN the device reconnects after being offline THEN the System SHALL perform a delta sync of changed records
5. WHEN sync completes THEN the System SHALL display the last sync timestamp and record count
6. WHEN sync fails THEN the System SHALL display an error and retain previously cached data

### Requirement 7

**User Story:** As a scanner operator, I want to scan a badge barcode and see an immediate approval result, so that I can quickly process entry decisions.

#### Acceptance Criteria

1. WHEN the scanner operator activates the scan screen THEN the System SHALL activate the device camera for barcode scanning
2. WHEN a barcode is scanned THEN the System SHALL lookup the attendee record by barcode number within 500 milliseconds
3. WHEN the attendee is found THEN the System SHALL evaluate the selected approval profile rules against the attendee data
4. WHEN all profile rules pass AND accessEnabled is true AND current time is within validity window THEN the System SHALL display a green approval screen with attendee name and photo
5. WHEN any condition fails THEN the System SHALL display a red denial screen with the specific reason
6. IF the barcode is not found in local data THEN the System SHALL display a red screen with "Badge not found" message

### Requirement 8

**User Story:** As a scanner operator, I want to see clear denial reasons, so that I can inform attendees why entry was denied.

#### Acceptance Criteria

1. WHEN accessEnabled is false THEN the System SHALL display "Access disabled"
2. WHEN current time is before validFrom THEN the System SHALL display "Badge not yet valid" with the valid from date
3. WHEN current time is after validUntil THEN the System SHALL display "Badge has expired" with the expiration date
4. WHEN a profile rule fails THEN the System SHALL display "Access requirements not met" with the failed rule description
5. WHEN multiple conditions fail THEN the System SHALL display the first applicable reason in priority order: accessEnabled, validity dates, profile rules

### Requirement 9

**User Story:** As a scanner operator, I want to select which approval profile to use, so that I can scan for different access points.

#### Acceptance Criteria

1. WHEN the scanner operator opens the app THEN the System SHALL display a profile selector with all synced profiles
2. WHEN the scanner operator selects a profile THEN the System SHALL use that profile for all subsequent scans
3. WHEN the selected profile is updated via sync THEN the System SHALL automatically use the new version
4. WHEN no profile is selected THEN the System SHALL only validate accessEnabled and validity dates

### Requirement 10

**User Story:** As an event administrator, I want all scan attempts logged, so that I can audit entry activity.

#### Acceptance Criteria

1. WHEN a badge is scanned THEN the System SHALL create a local scan log record with timestamp, barcode, result, profile used, and denial reason if applicable
2. WHEN the device has connectivity THEN the System SHALL upload pending scan logs to the server
3. WHEN viewing scan logs on the web app THEN the System SHALL display logs in a dedicated scanner logs section separate from system logs
4. WHEN exporting scan logs THEN the System SHALL include device identifier, operator, timestamp, attendee, result, and profile
5. WHEN the device is offline THEN the System SHALL queue scan logs for upload when connectivity returns

### Requirement 11

**User Story:** As an event administrator, I want the rule engine to evaluate rules predictably, so that I can trust the access control decisions.

#### Acceptance Criteria

1. WHEN evaluating rules with AND logic THEN the System SHALL require all rules to pass for approval
2. WHEN evaluating rules with OR logic THEN the System SHALL require at least one rule to pass for approval
3. WHEN evaluating nested rule groups THEN the System SHALL evaluate inner groups first before outer logic
4. WHEN a field value is null or missing THEN the System SHALL treat it as failing equality checks and passing is_empty checks
5. WHEN comparing dates THEN the System SHALL convert all times to UTC before comparison
6. WHEN evaluating in_list rules THEN the System SHALL perform case-insensitive string matching

### Requirement 12

**User Story:** As an event administrator, I want to serialize and deserialize approval profiles to JSON, so that profiles can be synced and stored reliably.

#### Acceptance Criteria

1. WHEN a profile is saved THEN the System SHALL serialize the complete rule structure to JSON format
2. WHEN a profile is loaded THEN the System SHALL deserialize the JSON and reconstruct the rule structure
3. WHEN serializing a profile THEN the System SHALL include version, name, description, and complete rule tree
4. WHEN deserializing a profile THEN the System SHALL validate the JSON structure before use
5. WHEN serializing then deserializing a profile THEN the System SHALL produce an equivalent rule structure

### Requirement 13

**User Story:** As a scanner operator, I want the app to handle connectivity changes gracefully, so that I can continue scanning without interruption.

#### Acceptance Criteria

1. WHEN the device loses connectivity THEN the System SHALL continue operating with cached data without user intervention
2. WHEN the device regains connectivity THEN the System SHALL automatically attempt to sync pending logs and fetch updates
3. WHEN sync is in progress THEN the System SHALL display a non-blocking sync indicator
4. WHEN cached data is older than a configurable threshold THEN the System SHALL display a warning but allow continued scanning
