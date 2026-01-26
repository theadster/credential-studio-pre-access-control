---
title: Role Permissions Validation Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-26
review_interval_days: 90
related_code: ["src/lib/validatePermissions.ts", "src/pages/api/roles/[id].ts"]
---

# Role Permissions Validation Fix

## Issue
When attempting to save role permissions that included access control features (`accessControl`, `approvalProfiles`, `scanLogs`), the API returned a 400 error:

```
Unknown permission keys detected: [ 'accessControl', 'approvalProfiles', 'scanLogs' ]
PUT /api/roles/[id] 400
```

## Root Cause
The `validatePermissions` function in `src/lib/validatePermissions.ts` maintained a hardcoded whitelist of allowed permission keys. When access control permissions were added to the system (see `ACCESS_CONTROL_TAB_VISIBILITY_FIX.md`), the validation whitelist was not updated to include the new permission categories.

The permissions were properly defined in:
- `src/lib/permissions.ts` - Type definitions and permission checking logic
- `src/components/RoleForm.tsx` - UI for configuring permissions
- Database schema - Roles collection stores these permissions

However, the API validation layer rejected them as "unknown keys."

## Solution
Updated the `ALLOWED_PERMISSION_KEYS` constant in `src/lib/validatePermissions.ts` to include the three access control permission categories:

```typescript
const ALLOWED_PERMISSION_KEYS = [
  'attendees',
  'users',
  'roles',
  'eventSettings',
  'customFields',
  'logs',
  'system',
  'monitoring',
  'accessControl',    // Added
  'approvalProfiles', // Added
  'scanLogs',         // Added
  'all'
];
```

## Files Modified
- `src/lib/validatePermissions.ts` - Added missing permission keys to validation whitelist

## Verification
After applying the fix:

1. Navigate to Dashboard → Roles
2. Edit any role with access control permissions
3. Modify any permission setting
4. Click "Save Changes"
5. Verify the role saves successfully without validation errors

## Related Documentation
- `docs/_archive/fixes/ACCESS_CONTROL_TAB_VISIBILITY_FIX.md` - Original access control permissions implementation
- `src/lib/permissions.ts` - Permission type definitions and checking logic
- `src/lib/validatePermissions.ts` - Permission validation utility

## Prevention
When adding new permission categories to the system:
1. Update type definitions in `src/lib/permissions.ts`
2. Update UI in `src/components/RoleForm.tsx`
3. **Update validation whitelist in `src/lib/validatePermissions.ts`**
4. Run migration script if needed for existing roles
5. Test role creation/editing through the UI
