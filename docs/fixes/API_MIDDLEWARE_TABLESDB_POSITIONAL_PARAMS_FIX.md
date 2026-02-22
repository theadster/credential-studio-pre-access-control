---
title: API Middleware TablesDB Positional Parameters Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/lib/apiMiddleware.ts
---

# API Middleware TablesDB Positional Parameters Fix

## Problem

The `withAuth` middleware in `src/lib/apiMiddleware.ts` was using positional parameters for two TablesDB calls, violating the project's named-parameter API standard. This caused runtime errors when fetching user profiles and roles, meaning `userProfile.role` always came back `null`.

As a result, every authenticated API endpoint that relies on role-based permission checks was silently returning 403 Forbidden — including `POST /api/mobile/scan-logs`, which is why scan logs stopped being recorded.

## Affected Calls

```typescript
// BEFORE (broken — positional params)
tablesDB.listRows(envVars.databaseId, envVars.usersTableId, [...])
adminTablesDB.getRow(envVars.databaseId, envVars.rolesTableId, userProfileDoc.roleId)

// AFTER (correct — named params)
tablesDB.listRows({ databaseId: envVars.databaseId, tableId: envVars.usersTableId, queries: [...] })
adminTablesDB.getRow({ databaseId: envVars.databaseId, tableId: envVars.rolesTableId, rowId: userProfileDoc.roleId })
```

## Impact

All authenticated mobile API endpoints were affected since `withAuth` is shared middleware. Any endpoint relying on `userProfile.role.permissions` for access control would have been denying requests.
