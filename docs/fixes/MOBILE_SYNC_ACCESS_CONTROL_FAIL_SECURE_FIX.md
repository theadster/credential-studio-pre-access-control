---
title: Mobile Sync Access Control Fail-Secure Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-25
review_interval_days: 90
related_code: ["src/pages/api/mobile/sync/attendees.ts"]
---

# Mobile Sync Access Control Fail-Secure Fix

## Issue

The mobile sync attendees endpoint used a default-allow fallback when access control data was missing or the fetch failed:

```typescript
// BEFORE — insecure
const accessControl = accessControlMap.get(attendee.$id) || {
  accessEnabled: true, // granted access even on fetch failure
  validFrom: null,
  validUntil: null
};
```

If the access control table fetch threw an error, every attendee in the sync response would receive `accessEnabled: true`, silently granting access to attendees who should be blocked.

A TablesDB positional parameter violation was also present on the same `listRows` call.

## Fix

Introduced `accessControlFetchFailed` to track whether the fetch errored. The fallback now distinguishes two cases:

- Fetch failed → `accessEnabled: false` (deny-secure)
- Fetch succeeded, no record found → `accessEnabled: true` (feature likely disabled, safe to allow)

```typescript
// AFTER — fail-secure
const accessControl = accessControlMap.get(attendee.$id) || {
  accessEnabled: !accessControlFetchFailed,
  validFrom: null,
  validUntil: null
};
```

Also corrected the `listRows` call to use named object parameters per TablesDB API standard.
