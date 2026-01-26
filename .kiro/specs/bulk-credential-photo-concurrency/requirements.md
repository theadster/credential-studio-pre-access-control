# Requirements Document

## Introduction

This specification addresses a critical concurrency issue where bulk credential generation (e.g., 112 attendees) conflicts with photo uploads performed from different sessions/computers. Users report that saving a photo in one record while bulk credentials are being generated on another machine appears to fail or not persist. This issue affects multi-user workflows where different staff members work on attendee records simultaneously.

Based on initial investigation, the issue is NOT related to Appwrite rate limiting (no errors are returned). The root causes appear to be:
1. Lack of optimistic locking on attendee records
2. Sequential processing without coordination between sessions
3. Potential race conditions in the fallback code paths
4. No conflict detection or resolution mechanisms

## Requirements

### Requirement 1: Concurrent Operation Detection

**User Story:** As a system administrator, I want the system to detect when concurrent operations are modifying the same attendee record, so that data loss can be prevented.

#### Acceptance Criteria

1. WHEN two operations attempt to modify the same attendee record simultaneously, THEN the system SHALL detect the conflict before data is overwritten.
2. IF an attendee record has been modified since it was last read, THEN the system SHALL prevent the stale update from overwriting newer data.
3. WHEN a conflict is detected, THEN the system SHALL log the conflict with details including operation types, timestamps, and affected fields.
4. THE system SHALL implement version-based optimistic locking on attendee records using a `version` field.

### Requirement 2: Photo Upload Resilience

**User Story:** As a staff member, I want my photo uploads to succeed even when bulk operations are running on other machines, so that I can continue working without interruption.

#### Acceptance Criteria

1. WHEN a photo is uploaded while bulk credential generation is in progress, THEN the photo upload SHALL succeed and persist.
2. IF a photo upload encounters a version conflict, THEN the system SHALL retry the operation with the latest record version.
3. WHEN a photo upload succeeds, THEN the system SHALL return a success response to the user within 5 seconds.
4. THE system SHALL use partial/field-specific updates for photo uploads rather than full document replacements.
5. IF a photo upload fails after retry attempts, THEN the system SHALL display a clear error message explaining the conflict and suggesting the user retry.

### Requirement 3: Bulk Credential Generation Isolation

**User Story:** As an event coordinator, I want bulk credential generation to not interfere with other users' operations, so that multiple staff can work simultaneously.

#### Acceptance Criteria

1. WHEN bulk credential generation updates an attendee record, THEN the system SHALL only modify credential-specific fields (credentialUrl, credentialGeneratedAt, credentialCount, lastCredentialGenerated).
2. THE system SHALL NOT overwrite non-credential fields (photoUrl, photoUploadCount, lastPhotoUploaded, customFieldValues, etc.) during credential generation.
3. IF the credential generation fallback path is triggered, THEN the system SHALL still preserve non-credential fields.
4. WHEN bulk credential generation encounters a version conflict on a specific attendee, THEN the system SHALL retry that attendee's update without failing the entire batch.
5. THE system SHALL process bulk operations in a way that minimizes lock contention with other operations.

### Requirement 4: Conflict Resolution Strategy

**User Story:** As a system, I want to automatically resolve conflicts when possible, so that users don't experience data loss or need manual intervention.

#### Acceptance Criteria

1. WHEN a conflict occurs between credential generation and photo upload, THEN the system SHALL merge the changes (both credential URL and photo URL should be preserved).
2. IF automatic merge is not possible, THEN the system SHALL preserve the most recent change based on timestamp.
3. WHEN a conflict is resolved automatically, THEN the system SHALL log the resolution strategy used.
4. THE system SHALL implement exponential backoff retry logic for conflict resolution (initial delay 100ms, max 3 retries).
5. IF all retry attempts fail, THEN the system SHALL queue the failed operation for manual review.

### Requirement 5: User Feedback and Transparency

**User Story:** As a staff member, I want to know when my operation might be affected by concurrent activity, so that I can make informed decisions.

#### Acceptance Criteria

1. WHEN a bulk operation is in progress, THEN other users viewing the same attendees SHALL see an indicator that records may be updating.
2. IF a user's operation is delayed due to conflict resolution, THEN the system SHALL display a brief message explaining the delay.
3. WHEN a photo upload succeeds after conflict resolution, THEN the system SHALL confirm success to the user.
4. THE system SHALL NOT display technical error messages to users; instead, it SHALL provide user-friendly explanations.
5. WHEN bulk credential generation completes, THEN the system SHALL broadcast a realtime event so other clients can refresh their data.

### Requirement 6: Diagnostic and Monitoring

**User Story:** As a system administrator, I want to monitor concurrent operation conflicts, so that I can identify patterns and optimize system performance.

#### Acceptance Criteria

1. THE system SHALL log all conflict occurrences with: timestamp, operation types, attendee IDs, resolution outcome.
2. WHEN conflicts exceed a threshold (e.g., 10 per minute), THEN the system SHALL generate an alert in the monitoring dashboard.
3. THE system SHALL track metrics for: conflict rate, resolution success rate, average retry count, operation latency.
4. WHEN viewing the monitoring dashboard, administrators SHALL be able to see concurrent operation statistics.
5. THE system SHALL retain conflict logs for at least 30 days for analysis.
   - **Note:** Currently partially implemented. Conflict monitoring exists with in-memory storage (5,000-record cap), but retention is not persistent and does not survive application restarts. Full compliance requires persisting conflict logs to durable storage (database/S3) with TTL/retention logic.

### Requirement 7: Backward Compatibility

**User Story:** As a system administrator, I want the concurrency improvements to work with existing data, so that no migration is required for current attendee records.

#### Acceptance Criteria

1. WHEN an attendee record lacks a version field, THEN the system SHALL treat it as version 0 and add the version field on first update.
2. THE system SHALL NOT require a database migration to enable concurrency protection.
3. WHEN updating existing records, THEN the system SHALL automatically initialize the version field if missing.
4. THE system SHALL maintain full backward compatibility with existing API contracts.
5. IF the version field cannot be added to a record, THEN the system SHALL fall back to timestamp-based conflict detection.
