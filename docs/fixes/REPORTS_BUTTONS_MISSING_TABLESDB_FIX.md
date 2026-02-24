---
title: Reports Buttons Missing - TablesDB API and Missing Permissions Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-23
review_interval_days: 90
related_code:
  - src/pages/api/reports/index.ts
  - src/pages/api/roles/initialize.ts
  - src/pages/api/roles/[id].ts
  - src/pages/api/roles/fix-reports-permission.ts
  - src/lib/validatePermissions.ts
  - src/components/RoleForm.tsx
  - src/hooks/useReports.ts
  - src/components/AdvancedFiltersDialog/AdvancedFiltersDialog.tsx
---

# Reports Buttons Missing - TablesDB API and Missing Permissions Fix

## Problem

The "Save Report" and "Load Report" buttons disappeared from the Advanced Filters dialog. Users could not save or load filter reports.

## Root Causes

### 1. Positional TablesDB calls in `reports/index.ts`

The POST handler used forbidden positional-parameter calls:

```ts
// ❌ FORBIDDEN
await tablesDB.listRows(databaseId, reportsTableId, [...queries]);
await tablesDB.createRow(databaseId, reportsTableId, reportId, { ...data });
```

Fixed to named-parameter style:

```ts
// ✅ CORRECT
await tablesDB.listRows({ databaseId, tableId: reportsTableId, queries: [...] });
await tablesDB.createRow({ databaseId, tableId: reportsTableId, rowId: reportId, data: { ... } });
```

### 2. `reports` permissions missing from all default roles

`src/pages/api/roles/initialize.ts` never included `reports` in any role's permission set. Since `useReports` sets `hasPermission = false` when the GET `/api/reports` returns 403, the buttons are silently hidden for all users.

Fixed by adding `reports` permissions to all four default roles in `initialize.ts`:

| Role | create | read | update | delete |
|------|--------|------|--------|--------|
| Super Administrator | ✅ | ✅ | ✅ | ✅ |
| Event Manager | ✅ | ✅ | ✅ | ✅ |
| Registration Staff | ✅ | ✅ | ✅ | ❌ |
| Viewer | ❌ | ✅ | ❌ | ❌ |

Also fixed positional TablesDB calls throughout `initialize.ts`.

### 3. `validatePermissions` allowlist missing `reports`

`src/lib/validatePermissions.ts` has a hardcoded `ALLOWED_PERMISSION_KEYS` array. `reports` was not in it, so any PUT to `/api/roles/:id` that included `reports` in the permissions object returned a 400, blocking role saves from the UI.

Fixed by adding `'reports'` to the allowlist.

### 4. `RoleForm` had no `reports` section

`src/components/RoleForm.tsx` had no `reports` entry in `defaultPermissions` or `permissionLabels`, so the permission was invisible in the Roles editor UI even after the database was fixed.

Fixed by adding `reports` to both objects — the accordion renders it automatically.

Roles already in the database won't have `reports` permissions. Run the one-time fix endpoint as a Super Administrator:

```
POST /api/roles/fix-reports-permission
```

This patches all existing roles with the correct `reports` permissions and skips any that already have them.

### 5. Positional `getRow` in `roles/[id].ts` DELETE handler

The DELETE case still used positional parameters:

```ts
// ❌ FORBIDDEN
roleToDelete = await tablesDB.getRow(databaseId, rolesTableId, id);
```

Fixed to named-parameter style.

### 6. `useReports` only fetched on component mount

`useReports` called `fetchReports` once on mount via `useEffect`. If the dialog was already mounted when the user saved their role permissions, `hasPermission` was stuck at `false` (from the earlier 403) and never re-evaluated.

Fixed by:
- Accepting an optional `open` parameter in `useReports`
- Re-fetching whenever `open` transitions to `true`
- Setting `hasPermission` to `true` only after the permission check succeeds (when response.ok is true)

```ts
// useReports now accepts open prop
export function useReports(open?: boolean): UseReportsReturn

// AdvancedFiltersDialog passes open so reports re-check on each dialog open
const { ... } = useReports(open);
```

This ensures that after a user saves role permissions, opening the dialog triggers a fresh permission check. The `useReports` hook maintains `hasPermission` state: it starts as `true` by default, but when the API returns a 403 PERMISSION_DENIED error, it's set to `false`. On successful fetch, it's set to `true`. This way, the permission state is always validated against the current API response rather than relying on stale cached state.

## Files Changed

- `src/pages/api/reports/index.ts` — fixed positional `listRows` and `createRow` in POST handler
- `src/pages/api/roles/initialize.ts` — added `reports` permissions to all default roles; fixed all positional TablesDB calls
- `src/pages/api/roles/[id].ts` — fixed all positional TablesDB calls throughout, including positional `getRow` in DELETE handler
- `src/lib/validatePermissions.ts` — added `'reports'` to `ALLOWED_PERMISSION_KEYS` allowlist
- `src/components/RoleForm.tsx` — added `reports` to `defaultPermissions` and `permissionLabels` so it appears in the Roles UI
- `src/pages/api/roles/fix-reports-permission.ts` — new one-time migration endpoint
- `src/hooks/useReports.ts` — accepts optional `open` param; re-fetches on dialog open; sets `hasPermission` to `true` only after successful permission check
- `src/components/AdvancedFiltersDialog/AdvancedFiltersDialog.tsx` — passes `open` to `useReports` so permission check refreshes each time dialog opens
