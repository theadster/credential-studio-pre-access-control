---
title: Field Update Service Guide
type: canonical
status: active
owner: "@dev-team"
last_verified: 2026-01-21
review_interval_days: 90
related_code:
  - src/lib/fieldUpdate.ts
  - src/lib/optimisticLock.ts
  - src/__tests__/lib/fieldUpdate.test.ts
---

# Field Update Service Guide

## Overview

The Field Update Service provides field-specific updates for attendee records to prevent concurrent operations from overwriting each other's changes. This is critical for scenarios where bulk credential generation runs simultaneously with photo uploads from different sessions.

## Problem Solved

When multiple users work on attendee records simultaneously (e.g., one user uploading photos while another generates credentials in bulk), full document updates can cause data loss. The Field Update Service ensures:

- Credential generation only updates credential fields
- Photo uploads only update photo fields
- Profile updates only update profile fields
- Each operation preserves fields it doesn't own

## Field Groups

The service defines logical field groups that are typically modified together:

| Group | Fields | Use Case |
|-------|--------|----------|
| `credential` | credentialUrl, credentialGeneratedAt, credentialCount, lastCredentialGenerated | Credential generation |
| `photo` | photoUrl, photoUploadCount, lastPhotoUploaded | Photo upload/removal |
| `profile` | firstName, lastName, barcodeNumber, notes | Profile editing |
| `customFields` | customFieldValues | Custom field updates |
| `accessControl` | accessEnabled, validFrom, validUntil | Access control settings |
| `tracking` | lastSignificantUpdate, version | Internal tracking |

## Usage

### Updating Credential Fields

```typescript
import { updateCredentialFields } from '@/lib/fieldUpdate';

const result = await updateCredentialFields(
  databases,
  dbId,
  attendeesCollectionId,
  attendeeId,
  {
    credentialUrl: 'https://example.com/credential.pdf',
    credentialGeneratedAt: new Date().toISOString(),
  }
);

if (result.success) {
  console.log('Credential updated, new version:', result.version);
} else if (result.conflictDetected) {
  console.log('Conflict detected, retries used:', result.retriesUsed);
}
```

### Updating Photo Fields

```typescript
import { updatePhotoFields } from '@/lib/fieldUpdate';

// Adding a photo
const addResult = await updatePhotoFields(
  databases,
  dbId,
  attendeesCollectionId,
  attendeeId,
  { photoUrl: 'https://example.com/photo.jpg' }
);

// Removing a photo
const removeResult = await updatePhotoFields(
  databases,
  dbId,
  attendeesCollectionId,
  attendeeId,
  { photoUrl: null }
);
```

### Generic Field Updates

```typescript
import { updateFields, updateFieldGroup } from '@/lib/fieldUpdate';

// Update specific fields
const result = await updateFields(
  databases,
  dbId,
  collectionId,
  documentId,
  { firstName: 'John', lastName: 'Doe' },
  { fields: ['firstName', 'lastName'] }
);

// Update by field group
const result = await updateFieldGroup(
  databases,
  dbId,
  collectionId,
  documentId,
  'profile',
  { firstName: 'John', lastName: 'Doe', photoUrl: 'ignored' }
);
```

## Optimistic Locking

All update functions use optimistic locking internally via the `OptimisticLockService`. This means:

1. The current document version is read before update
2. The version is incremented on successful update
3. If a conflict is detected (version mismatch), the operation retries with exponential backoff
4. After max retries (default: 3), the operation fails with conflict info

## Helper Functions

```typescript
import {
  getFieldGroup,
  isFieldInGroup,
  getFieldGroupName,
  filterToGroups,
  excludeGroups,
} from '@/lib/fieldUpdate';

// Get all fields in a group
const credentialFields = getFieldGroup('credential');

// Check if a field belongs to a group
const isCredential = isFieldInGroup('credentialUrl', 'credential'); // true

// Find which group a field belongs to
const group = getFieldGroupName('photoUrl'); // 'photo'

// Filter data to specific groups
const filtered = filterToGroups(data, ['credential', 'photo']);

// Exclude groups from data
const withoutCredentials = excludeGroups(data, ['credential']);
```

## Related Documentation

- [Optimistic Locking Implementation](.kiro/specs/integration-optimistic-locking/) - Integration-specific optimistic locking
- [Bulk Operations Performance](./BULK_OPERATIONS_PERFORMANCE.md) - Performance considerations for bulk operations
- [Transactions Guide](./TRANSACTIONS_DEVELOPER_GUIDE.md) - Transaction handling patterns
