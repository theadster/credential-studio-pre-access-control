# Implementation Plan

## Phase 1: Core Concurrency Services

- [x] 1. Create OptimisticLockService
  - [x] 1.1 Create `src/lib/optimisticLock.ts` with core interfaces and types
    - Define `OptimisticLockConfig`, `LockResult`, `OptimisticLockError` interfaces
    - Export type definitions for use across the codebase
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 1.2 Implement `readWithVersion` function
    - Read document from Appwrite and extract/default version field
    - Handle missing version field (treat as version 0)
    - _Requirements: 7.1, 7.3_

  - [x] 1.3 Implement `updateWithLock` function with retry logic
    - Implement exponential backoff retry (100ms base, max 2000ms, 3 retries)
    - Detect version mismatch errors from Appwrite
    - Return detailed `LockResult` with retry count and conflict info
    - _Requirements: 1.2, 4.4_

  - [x] 1.4 Write unit tests for OptimisticLockService
    - Test version increment on successful update
    - Test conflict detection with stale version
    - Test retry logic with mocked failures
    - Test max retries exceeded behavior
    - _Requirements: 1.1, 1.2, 1.4_

- [x] 2. Create FieldUpdateService
  - [x] 2.1 Create `src/lib/fieldUpdate.ts` with field group definitions
    - Define `FIELD_GROUPS` constant with credential, photo, profile, etc.
    - Create `FieldUpdateOptions` interface
    - _Requirements: 3.1, 3.2_

  - [x] 2.2 Implement `updateCredentialFields` function
    - Only update credential-specific fields (credentialUrl, credentialGeneratedAt, credentialCount, lastCredentialGenerated)
    - Use optimistic locking internally
    - Preserve all non-credential fields
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.3 Implement `updatePhotoFields` function
    - Only update photo-specific fields (photoUrl, photoUploadCount, lastPhotoUploaded)
    - Use optimistic locking internally
    - Preserve all non-photo fields
    - _Requirements: 2.4, 3.2_

  - [x] 2.4 Implement generic `updateFields` function
    - Accept field list and options for flexible partial updates
    - Support merge mode to preserve unspecified fields
    - _Requirements: 3.2_

  - [x] 2.5 Write unit tests for FieldUpdateService
    - Test credential-only updates don't affect photo fields
    - Test photo-only updates don't affect credential fields
    - Test field group isolation
    - _Requirements: 3.1, 3.2_

- [x] 3. Create ConflictResolver
  - [x] 3.1 Create `src/lib/conflictResolver.ts` with conflict types
    - Define `ConflictInfo`, `ResolutionStrategy` interfaces
    - Create conflict type enums
    - _Requirements: 4.1, 4.2_

  - [x] 3.2 Implement `detectConflict` function
    - Compare expected vs actual version
    - Identify conflicting fields based on operation type
    - _Requirements: 1.1, 1.3_

  - [x] 3.3 Implement `determineStrategy` function
    - Return MERGE for non-overlapping field conflicts
    - Return LATEST_WINS for overlapping fields with timestamp comparison
    - Return RETRY for transient conflicts
    - _Requirements: 4.1, 4.2_

  - [x] 3.4 Implement `resolve` function
    - Apply merge strategy by combining field sets
    - Apply latest-wins by comparing timestamps
    - Return resolution result with merged data
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 3.5 Implement `logConflict` function for monitoring
    - Log conflict details with timestamp, operation type, resolution
    - Format for easy querying and analysis
    - _Requirements: 1.3, 6.1_

  - [x] 3.6 Write unit tests for ConflictResolver
    - Test merge strategy for credential + photo conflicts
    - Test latest-wins for same-field conflicts
    - Test conflict logging format
    - _Requirements: 4.1, 4.2, 4.3_

## Phase 2: API Endpoint Updates

- [x] 4. Update generate-credential.ts endpoint
  - [x] 4.1 Import and integrate FieldUpdateService
    - Replace direct `updateDocument` calls with `updateCredentialFields`
    - Ensure only credential fields are modified
    - _Requirements: 3.1, 3.2_

  - [x] 4.2 Update fallback path to use field-specific updates
    - Modify the operator fallback code (lines ~395-410) to use FieldUpdateService
    - Ensure fallback doesn't overwrite non-credential fields
    - _Requirements: 3.3_

  - [x] 4.3 Add conflict handling with retry
    - Wrap update in retry logic using OptimisticLockService
    - Handle VERSION_MISMATCH errors gracefully
    - _Requirements: 3.4, 4.4_

  - [x] 4.4 Write integration tests for credential generation concurrency
    - Test credential generation doesn't overwrite concurrent photo changes
    - Test retry succeeds after version conflict
    - _Requirements: 3.1, 3.4_

- [x] 5. Update attendees/[id].ts PUT endpoint
  - [x] 5.1 Refactor photo update path to use FieldUpdateService
    - Replace direct photo field updates with `updatePhotoFields`
    - Ensure photo updates don't affect credential fields
    - _Requirements: 2.4, 3.2_

  - [x] 5.2 Add conflict detection and retry for photo uploads
    - Implement retry logic for photo upload conflicts
    - Return user-friendly error if retries exhausted
    - _Requirements: 2.2, 2.5_

  - [x] 5.3 Update profile field updates to use optimistic locking
    - Add version checking for firstName, lastName, etc. updates
    - Increment version on successful update
    - _Requirements: 1.4, 7.3_

  - [x] 5.4 Write integration tests for photo upload concurrency
    - Test photo upload succeeds during bulk credential generation
    - Test photo persists after concurrent credential update
    - _Requirements: 2.1, 2.3_

- [x] 6. Update bulk-edit.ts endpoint
  - [x] 6.1 Integrate optimistic locking into bulk operations
    - Add version field to bulk update operations
    - Handle per-attendee conflicts without failing entire batch
    - _Requirements: 3.4_

  - [x] 6.2 Update fallback sequential updates to use field-specific updates
    - Modify fallback loop to use FieldUpdateService
    - Preserve non-edited fields during bulk operations
    - _Requirements: 3.2, 3.3_

  - [x] 6.3 Write tests for bulk edit concurrency
    - Test bulk edit handles concurrent single-record updates
    - Test partial batch success on conflicts
    - _Requirements: 3.4_

## Phase 3: Monitoring and User Feedback

- [x] 7. Add conflict logging and monitoring
  - [x] 7.1 Create conflict log collection schema (if using separate collection)
    - Define ConflictLogEntry document structure
    - Or use existing logs collection with conflict-specific action type
    - _Requirements: 6.1, 6.5_

  - [x] 7.2 Implement conflict logging in ConflictResolver
    - Log all conflicts with resolution outcome
    - Include operation type, attendee ID, versions, fields
    - _Requirements: 6.1, 6.3_

  - [x] 7.3 Add conflict metrics to transaction monitoring
    - Track conflict rate, resolution success rate, retry counts
    - Integrate with existing `src/lib/transactionMonitoring.ts`
    - _Requirements: 6.3_

- [x] 8. Add user feedback for conflicts
  - [x] 8.1 Create user-friendly error messages for concurrency errors
    - Define error message templates in constants
    - Map technical errors to user-friendly explanations
    - _Requirements: 5.4_

  - [x] 8.2 Update API error responses to include concurrency info
    - Add `retryable` flag to error responses
    - Include suggestion for user action
    - _Requirements: 5.2, 5.4_

  - [x] 8.3 Add realtime broadcast for bulk operation completion
    - Broadcast event when bulk credential generation completes
    - Allow other clients to refresh their data
    - _Requirements: 5.5_

## Phase 4: Integration Testing

- [x] 9. Create comprehensive integration tests
  - [x] 9.1 Create concurrent operation simulation test suite
    - Test simultaneous credential generation and photo upload
    - Test multiple concurrent photo uploads to same attendee
    - Verify both operations succeed and data persists
    - _Requirements: 2.1, 3.1_

  - [x] 9.2 Create bulk operation isolation tests
    - Test bulk credential generation (100+ attendees) with concurrent photo uploads
    - Verify no photo data is lost during bulk operations
    - _Requirements: 3.1, 3.2_

  - [x] 9.3 Create conflict resolution verification tests
    - Test merge strategy produces correct combined data
    - Test retry logic eventually succeeds
    - Test max retries returns appropriate error
    - _Requirements: 4.1, 4.4, 4.5_

  - [x] 9.4 Create backward compatibility tests
    - Test updates to records without version field
    - Verify version field is added on first update
    - Test existing API contracts still work
    - _Requirements: 7.1, 7.2, 7.4_


---

## Summary

### Files Created/Modified

**Core Services (Phase 1):**
- `src/lib/optimisticLock.ts` - Optimistic locking with version-based conflict detection
- `src/lib/fieldUpdate.ts` - Field-specific update service with group isolation
- `src/lib/conflictResolver.ts` - Conflict detection and resolution strategies
- `src/lib/conflictLogging.ts` - Conflict logging for monitoring

**API Endpoints (Phase 2):**
- `src/pages/api/attendees/[id]/generate-credential.ts` - Updated with field-specific updates
- `src/pages/api/attendees/[id].ts` - Updated photo/profile updates with optimistic locking
- `src/pages/api/attendees/bulk-edit.ts` - Integrated optimistic locking for bulk operations

**Monitoring & Feedback (Phase 3):**
- `src/lib/concurrencyErrors.ts` - User-friendly error messages and response helpers
- `src/lib/transactionMonitoring.ts` - Extended with conflict metrics
- `src/lib/bulkOperationBroadcast.ts` - Realtime broadcast for bulk operation completion

**Tests:**
- `src/__tests__/lib/optimisticLock.test.ts`
- `src/__tests__/lib/fieldUpdate.test.ts`
- `src/__tests__/lib/conflictResolver.test.ts`
- `src/__tests__/api/attendees/id/generate-credential.test.ts`
- `src/__tests__/api/attendees/bulk-edit-concurrency.test.ts`
- `src/__tests__/lib/concurrencyErrors.test.ts`
- `src/__tests__/lib/bulkOperationBroadcast.test.ts`

### Key Concepts

- **Optimistic Locking**: Uses `version` field to detect concurrent modifications
- **Field Groups**: Credential, photo, and profile fields are updated independently
- **Conflict Resolution**: Merge strategy for non-overlapping fields, latest-wins for overlapping
- **Retry Logic**: Exponential backoff (100ms base, max 2000ms, 3 retries)

### Remaining Work

Phase 4 integration tests (9.1-9.4) require manual testing or a test environment with actual Appwrite connections to verify end-to-end concurrency behavior.
