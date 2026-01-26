---
title: Bulk Credential Photo Concurrency Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-22
review_interval_days: 90
related_code:
  - src/lib/optimisticLock.ts
  - src/lib/fieldUpdate.ts
  - src/lib/conflictResolver.ts
  - src/lib/concurrencyErrors.ts
  - src/lib/bulkOperationBroadcast.ts
  - src/pages/api/attendees/[id]/generate-credential.ts
  - src/pages/api/attendees/[id].ts
  - src/pages/api/attendees/bulk-edit.ts
---

# Bulk Credential Photo Concurrency Fix

## Problem

When bulk credential generation runs for multiple attendees, concurrent photo uploads from other browser sessions were being overwritten. The bulk operation would read the attendee record, generate credentials, and write back the entire record - inadvertently overwriting any photo changes made between the read and write.

## Root Cause

The original implementation used full document updates that replaced all fields, including photo-related fields. When two operations (credential generation and photo upload) occurred concurrently:

1. Session A reads attendee (no photo)
2. Session B uploads photo, saves attendee (has photo)
3. Session A generates credential, saves attendee (overwrites photo with null)

## Solution

Implemented field-specific updates with optimistic locking:

### Core Services

| Service | File | Purpose |
|---------|------|---------|
| OptimisticLockService | `src/lib/optimisticLock.ts` | Version-based conflict detection with retry logic |
| FieldUpdateService | `src/lib/fieldUpdate.ts` | Field group isolation (credential, photo, profile) |
| ConflictResolver | `src/lib/conflictResolver.ts` | Merge and latest-wins resolution strategies |

### Field Groups

Updates are now isolated by field group:

```typescript
const FIELD_GROUPS = {
  credential: ['credentialUrl', 'credentialGeneratedAt', 'credentialCount', 'lastCredentialGenerated'],
  photo: ['photoUrl', 'photoUploadCount', 'lastPhotoUploaded'],
  profile: ['firstName', 'lastName', 'barcodeNumber', 'notes']
};
```

### Optimistic Locking

Each attendee record now includes a `version` field:
- Incremented on every update
- Conflict detected when expected version doesn't match current
- Automatic retry with exponential backoff (100ms base, max 2000ms, 3 retries)

### Conflict Resolution Strategies

| Strategy | When Used | Behavior |
|----------|-----------|----------|
| MERGE | Non-overlapping field groups | Combines both changes |
| LATEST_WINS | Same field, different values | Uses most recent timestamp |
| RETRY | Transient conflicts | Retries with backoff |
| FAIL | Unresolvable conflicts | Returns error to user |

## API Changes

### Credential Generation
`POST /api/attendees/[id]/generate-credential` now uses `updateCredentialFields()` which only modifies credential-specific fields.

### Photo Upload
`PUT /api/attendees/[id]` photo updates now use `updatePhotoFields()` which only modifies photo-specific fields.

### Bulk Edit
`POST /api/attendees/bulk-edit` integrates optimistic locking with per-attendee conflict handling.

## Backward Compatibility

- Records without `version` field are treated as version 0
- Version field is automatically added on first update
- No migration required for existing data
- All existing API contracts preserved

## Error Handling

User-friendly error messages for concurrency conflicts:

```typescript
// Example error response
{
  "error": "This record was modified by another user. Please refresh and try again.",
  "code": "CONFLICT",
  "retryable": true
}
```

## Monitoring

Conflict metrics integrated with transaction monitoring:
- Conflict rate tracking
- Resolution success rate
- Retry count statistics

The Transaction Monitoring Dashboard (accessible via the "monitoring" tab for admins) displays:
- Total conflicts detected
- Resolution success rate
- Resolved vs failed conflicts
- Average retries per conflict
- Conflicts by operation type (credential_generation, photo_upload, etc.)
- Conflicts by resolution strategy (MERGE, RETRY, LATEST_WINS, FAIL)
- Conflicts by conflict type (VERSION_MISMATCH, FIELD_COLLISION, TRANSIENT)

Realtime broadcast notifies other clients when bulk operations complete.

## Testing

56 integration tests covering:
- Concurrent credential/photo operations
- Bulk operations with 100+ attendees
- Merge strategy verification
- Retry logic and max retries
- Backward compatibility with legacy records

Run tests:
```bash
npx vitest --run src/__tests__/integration/concurrency-simulation.test.ts
npx vitest --run src/__tests__/integration/bulk-operation-isolation.test.ts
npx vitest --run src/__tests__/integration/conflict-resolution-verification.test.ts
npx vitest --run src/__tests__/integration/backward-compatibility.test.ts
```

## Related Documentation

- Spec: `.kiro/specs/bulk-credential-photo-concurrency/`
- Integration optimistic locking: `docs/migration/INTEGRATION_VERSION_MIGRATION.md`
