---
title: Duplicate Attendee Access Control Not Copied Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-24
review_interval_days: 90
related_code:
  - src/pages/api/attendees/duplicate.ts
---

# Duplicate Attendee Access Control Not Copied Fix

## Problem

When duplicating an attendee whose access control was set to "Active" (`accessEnabled: true`), the new duplicate record always showed as "Inactive" (`accessEnabled: false`).

## Root Cause

The duplicate endpoint hardcoded `accessEnabled: false` when creating the access control record for the new attendee, along with a comment claiming this was intentional for security reasons:

```typescript
// Security: Access control is reset to defaults to prevent unintentionally
// granting the same access rights to the duplicate attendee
data: {
  attendeeId: newRow.$id,
  accessEnabled: false,  // ← always false regardless of source
  validFrom: null,
  validUntil: null,
},
```

This meant `validFrom` and `validUntil` were also never copied.

## Fix

The endpoint now fetches the source attendee's access control record first and copies all three fields (`accessEnabled`, `validFrom`, `validUntil`) to the duplicate. If the source has no access control record, it defaults to `accessEnabled: true` — consistent with the rest of the app.

```typescript
const sourceAcResult = await tablesDB.listRows({
  databaseId: dbId,
  tableId: accessControlTableId,
  queries: [Query.equal('attendeeId', attendeeId), Query.limit(1)],
});

const sourceAc = sourceAcResult.rows[0];
await tablesDB.createRow({
  databaseId: dbId,
  tableId: accessControlTableId,
  rowId: ID.unique(),
  data: {
    attendeeId: newRow.$id,
    accessEnabled: sourceAc?.accessEnabled ?? true,
    validFrom: sourceAc?.validFrom || null,
    validUntil: sourceAc?.validUntil || null,
  },
});
```

## File Changed

- `src/pages/api/attendees/duplicate.ts` — access control creation block
