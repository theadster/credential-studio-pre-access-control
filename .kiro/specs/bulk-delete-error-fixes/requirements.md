# Requirements Document

## Introduction

This feature addresses critical errors occurring during bulk delete operations in CredentialStudio. Users are experiencing two main issues when attempting to delete multiple attendees: audit log creation failures due to an invalid `timestamp` attribute, and cascading failures when attempting to delete already-deleted documents. These errors prevent successful bulk deletions and create a poor user experience with confusing error messages.

The solution will fix the audit log schema mismatch in the legacy fallback code and improve error handling to gracefully handle already-deleted documents, ensuring bulk delete operations complete successfully even when some documents are already removed.

## Requirements

### Requirement 1: Fix Audit Log Schema Mismatch

**User Story:** As a system administrator performing bulk delete operations, I want audit logs to be created successfully so that all deletion activities are properly tracked for compliance and auditing purposes.

#### Acceptance Criteria

1. WHEN the legacy fallback code creates an audit log THEN it SHALL NOT include a `timestamp` attribute in the document data
2. WHEN the legacy fallback code creates an audit log THEN it SHALL only include attributes that exist in the logs collection schema (userId, action, details, attendeeId)
3. WHEN an audit log is created during bulk delete THEN the system SHALL rely on Appwrite's automatic `$createdAt` timestamp instead of a custom timestamp field
4. WHEN the audit log creation fails THEN the system SHALL log the error but SHALL NOT fail the entire bulk delete operation

### Requirement 2: Handle Already-Deleted Documents Gracefully

**User Story:** As a user performing bulk delete operations, I want the system to handle already-deleted documents gracefully so that the bulk delete operation completes successfully for remaining valid documents.

#### Acceptance Criteria

1. WHEN a document in the bulk delete list is already deleted THEN the system SHALL log a warning but SHALL continue processing remaining documents
2. WHEN a document cannot be found (404 error) THEN the system SHALL count it as already deleted and SHALL NOT treat it as a failure
3. WHEN the legacy fallback completes THEN the system SHALL report the actual number of documents successfully deleted
4. WHEN all documents in the bulk delete list are already deleted THEN the system SHALL return a success response with deletedCount of 0

### Requirement 3: Improve Error Reporting

**User Story:** As a user performing bulk delete operations, I want clear error messages that distinguish between different failure scenarios so that I can understand what happened and take appropriate action.

#### Acceptance Criteria

1. WHEN documents are already deleted THEN the system SHALL report them separately from actual deletion failures
2. WHEN the bulk delete completes THEN the response SHALL include the count of successfully deleted documents, already-deleted documents, and actual failures
3. WHEN audit log creation fails THEN the error message SHALL clearly indicate it's a logging issue and SHALL NOT suggest the delete operation failed
4. WHEN all documents are already deleted THEN the success message SHALL indicate "0 documents deleted (all already removed)" or similar

### Requirement 4: Maintain Backward Compatibility

**User Story:** As a developer maintaining the codebase, I want the fixes to maintain backward compatibility with existing bulk delete functionality so that no other features are broken.

#### Acceptance Criteria

1. WHEN the transaction-based bulk delete succeeds THEN it SHALL continue to work as before without changes
2. WHEN the legacy fallback is used THEN it SHALL maintain the same API response structure
3. WHEN audit logging is disabled THEN the system SHALL still create a minimal audit log entry as before
4. WHEN the bulk delete API is called THEN it SHALL continue to validate permissions and attendee existence before attempting deletion
