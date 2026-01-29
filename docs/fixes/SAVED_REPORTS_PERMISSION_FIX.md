---
title: Saved Reports Permission Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-28
review_interval_days: 90
related_code:
  - scripts/add-reports-permissions.ts
  - src/hooks/useReports.ts
  - src/components/AdvancedFiltersDialog/AdvancedFiltersDialog.tsx
  - src/components/AdvancedFiltersDialog/components/LoadReportDialog.tsx
---

# Saved Reports Permission Fix

## Issue

When opening the dashboard after implementing the Saved Reports feature, users encountered a permission error:

```
You do not have permission to view reports
```

This error occurred because the existing roles in the database did not have the `reports` resource permissions configured.

## Root Cause

The Saved Reports feature requires specific permissions for each role:
- `reports.create` - Create new reports
- `reports.read` - View reports
- `reports.update` - Edit reports
- `reports.delete` - Delete reports

When the feature was implemented, these permissions were added to the permission system but not to the existing role documents in the Appwrite database. This caused the API to reject all requests with a 403 Forbidden error.

## Solution

### 1. Migration Script

Created `scripts/add-reports-permissions.ts` to add reports permissions to all existing roles:

```bash
npx ts-node --esm scripts/add-reports-permissions.ts
```

**Permissions Added:**
- **Super Administrator**: create, read, update, delete
- **Event Manager**: create, read, update, delete
- **Registration Staff**: create, read
- **Viewer**: read

### 2. Error Handling Improvement

Enhanced error handling in the LoadReportDialog to gracefully display permission errors to users:

- Added `error` prop to LoadReportDialog
- Display error message when reports fail to load
- Show user-friendly error UI instead of console errors

## Implementation Details

### Migration Script (`scripts/add-reports-permissions.ts`)

The script:
1. Connects to Appwrite database
2. Fetches all existing roles
3. Parses their current permissions
4. Adds reports permissions based on role type
5. Updates each role document with new permissions

### Error Display

The LoadReportDialog now shows:
- Loading spinner while fetching reports
- Error message if reports fail to load
- Empty state if no reports exist
- Search results if reports are available

## Testing

After running the migration script:

1. Open the dashboard
2. Click "Advanced Filters"
3. Click "Load Report" button
4. Verify reports list loads without errors

## Rollback

If needed, the permissions can be removed by manually editing each role's permissions JSON in the Appwrite console, removing the `reports` object.

## Related Documentation

- [Saved Reports Feature Guide](../guides/SAVED_REPORTS_GUIDE.md)
- [Permissions System](../guides/PERMISSIONS_GUIDE.md)
- [Appwrite Configuration](../migration/APPWRITE_CONFIGURATION.md)

