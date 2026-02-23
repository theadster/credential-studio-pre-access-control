---
title: Roles Tab State Clear After Edit Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-23
review_interval_days: 90
related_code:
  - src/pages/dashboard.tsx
---

# Roles Tab State Clear After Edit Fix

## Problem

After editing a role, the Roles tab would show "No roles have been configured yet" and require a hard refresh to recover. The realtime subscription triggered `refreshRoles()` after any role change, but that function was silently setting roles to an empty array.

## Root Cause

`GET /api/roles` returns `{ roles: [...], total: N }` but `refreshRoles()` checked `Array.isArray(rolesData)` — which is always false for an object — and fell back to `setRoles([])`.

```ts
// Before (broken)
setRoles(Array.isArray(rolesData) ? rolesData : []);

// After (fixed)
const rolesArray = Array.isArray(rolesData) ? rolesData : (Array.isArray(rolesData?.roles) ? rolesData.roles : []);
setRoles(rolesArray);
```

## Fix

Updated two locations in `src/pages/dashboard.tsx`:

1. `refreshRoles()` — called by the realtime subscription on any role change
2. Initialize roles handler — same pattern after initializing default roles

Both now correctly unwrap the `{ roles, total }` envelope before setting state.
