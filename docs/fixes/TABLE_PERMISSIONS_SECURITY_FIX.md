---
title: Table Permissions Security Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-23
review_interval_days: 90
related_code:
  - scripts/setup-appwrite.ts
  - src/pages/api/access-control/[attendeeId].ts
  - src/pages/api/approval-profiles/index.ts
  - src/pages/api/event-settings/index.ts
  - src/pages/api/log-settings/index.ts
---

# Table Permissions Security Fix

## Issue

Four sensitive tables had overly permissive Appwrite table-level permissions, granting `create`, `update`, and `delete` to all authenticated users (`Role.users()`):
- `access_control` — Controls attendee access eligibility
- `approval_profiles` — Mobile scanning approval rules
- `event_settings` — Global event configuration
- `log_settings` — Audit logging toggles

This bypassed the application's role-based access control (RBAC) layer, allowing any user to modify critical data.

## Resolution

Restricted table-level permissions to read-only for `Role.users()`. Write operations now depend entirely on API-layer permission checks:

```typescript
// BEFORE (overly permissive)
permissions: [
  Permission.read(Role.users()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
]

// AFTER (secure)
permissions: [
  Permission.read(Role.users()),
  // Create/update/delete restricted to API layer (role-based checks enforced there)
]
```

## Security Model

- **Table-level permissions:** Read-only for authenticated users
- **Write operations:** Enforced via API middleware (`withAuth`) that checks `userProfile.role.permissions`
- **Example:** Access control updates require `permissions?.accessControl?.write === true`

All four affected tables already had proper API-layer permission checks in place; this fix aligns table permissions with the intended security model.

## Files Modified

- `scripts/setup-appwrite.ts` — Updated table creation permissions
- `docs/reference/DATABASE_SCHEMA.md` — Updated schema documentation

