# Requirements Document

## Introduction

The integration update functions in `src/lib/appwrite-integrations.ts` use a check-then-act pattern that creates a Time-of-Check-Time-of-Use (TOCTOU) race condition. When two concurrent requests attempt to update the same integration, both may check for existence simultaneously, both find no existing record, and both attempt to create new records, causing conflicts or data loss. This spec addresses the need to implement optimistic locking to ensure safe concurrent updates.

## Requirements

### Requirement 1: Implement Optimistic Locking with Version Field

**User Story:** As a developer, I want integration updates to use optimistic locking, so that concurrent updates are handled safely without race conditions.

#### Acceptance Criteria

1. WHEN an integration document is created THEN it SHALL include a version field initialized to 1
2. WHEN an integration document is updated THEN the version field SHALL be incremented by 1
3. WHEN an update is attempted THEN the system SHALL verify the current version matches the expected version
4. IF the version does not match THEN the system SHALL throw a conflict error

### Requirement 2: Add Version Parameter to Update Functions

**User Story:** As a developer, I want to specify the expected version when updating integrations, so that I can detect and handle concurrent modifications.

#### Acceptance Criteria

1. WHEN calling update functions THEN an optional expectedVersion parameter SHALL be accepted
2. WHEN expectedVersion is provided THEN the system SHALL verify it matches the current document version
3. WHEN expectedVersion is not provided THEN the system SHALL perform the update without version checking (backward compatibility)
4. IF expectedVersion is provided and doesn't match THEN the system SHALL return a clear conflict error

### Requirement 3: Update All Three Integration Functions Consistently

**User Story:** As a developer, I want all integration update functions to use the same locking mechanism, so that behavior is consistent across all integrations.

#### Acceptance Criteria

1. WHEN optimistic locking is implemented THEN updateCloudinaryIntegration SHALL use version checking
2. WHEN optimistic locking is implemented THEN updateSwitchboardIntegration SHALL use version checking
3. WHEN optimistic locking is implemented THEN updateOneSimpleApiIntegration SHALL use version checking
4. WHEN any integration is updated THEN the version field SHALL be incremented consistently

### Requirement 4: Return Clear Conflict Errors

**User Story:** As a developer, I want to receive clear error messages when version conflicts occur, so that I can handle them appropriately in the calling code.

#### Acceptance Criteria

1. WHEN a version conflict occurs THEN the system SHALL throw a specific error type (e.g., ConflictError)
2. WHEN a conflict error is thrown THEN it SHALL include the expected version and actual version
3. WHEN a conflict error is thrown THEN it SHALL include the integration type and eventSettingsId
4. IF the calling code catches the error THEN it SHALL be able to distinguish conflicts from other errors

### Requirement 5: Handle Create vs Update Atomically

**User Story:** As a developer, I want the system to handle both creation and updates safely, so that race conditions don't cause duplicate records or lost updates.

#### Acceptance Criteria

1. WHEN an integration doesn't exist THEN the system SHALL create it with version 1
2. WHEN an integration exists THEN the system SHALL update it and increment the version
3. WHEN two concurrent creates are attempted THEN only one SHALL succeed
4. IF a create fails due to duplicate THEN the system SHALL retry as an update

### Requirement 6: Maintain Backward Compatibility

**User Story:** As a developer, I want existing code to continue working, so that the migration to optimistic locking doesn't break current functionality.

#### Acceptance Criteria

1. WHEN expectedVersion is not provided THEN the update SHALL proceed without version checking
2. WHEN existing integrations don't have a version field THEN the system SHALL treat them as version 0 or initialize the version
3. WHEN migrating existing data THEN a migration strategy SHALL be provided
4. IF version checking is disabled THEN the system SHALL behave like the current implementation

### Requirement 7: Add Version to Integration Interfaces

**User Story:** As a developer, I want TypeScript interfaces to include the version field, so that I have type safety when working with versions.

#### Acceptance Criteria

1. WHEN integration interfaces are defined THEN they SHALL include a version field of type number
2. WHEN integration data is returned THEN it SHALL include the current version
3. WHEN TypeScript compilation occurs THEN version fields SHALL be type-checked
4. IF version is missing from an interface THEN TypeScript SHALL report a type error
