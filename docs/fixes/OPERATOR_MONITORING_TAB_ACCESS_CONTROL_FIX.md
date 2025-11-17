# Operator Monitoring Tab Access Control Fix

## Issue
The Operator Monitoring tab in the dashboard had two problems:
1. It was hardcoded to only show for users with the role name 'Super Administrator' instead of using the proper permission system
2. It wasn't included in the `canAccessTab` function, so it couldn't be properly controlled through role permissions
3. There was no monitoring permission defined in the permissions system or RoleForm

## Root Cause
The tab was implemented with a direct role name check (`currentUser?.role?.name === 'Super Administrator'`) instead of using the permission-based access control system that all other tabs use.

## Solution

### 1. Added Monitoring Permission to Permission System

**File: `src/lib/permissions.ts`**
- Added `monitoring?: Permission` to the `UserPermissions` interface
- Added `case 'monitoring'` to the `canAccessTab` function that checks for `monitoring.read` permission

### 2. Updated Dashboard Tab Access Control

**File: `src/pages/dashboard.tsx`**
- Changed the Operator Monitoring tab button from hardcoded role check to `canAccessTab(currentUser?.role, 'monitoring')`
- Added 'monitoring' to the `getAvailableTabs()` function so it's included in tab availability checks

### 3. Added Monitoring Permissions to RoleForm

**File: `src/components/RoleForm.tsx`**
- Added `monitoring` to the `UserPermissions` interface
- Added `monitoring` to `defaultPermissions` with `read` and `configure` actions
- Added `monitoring` to `permissionLabels` with:
  - Title: "Operator Monitoring"
  - Description: "Monitor database operator performance and feature flags"
  - Actions:
    - `read`: "View operator metrics and performance data"
    - `configure`: "Manage feature flags and operator settings"

### 4. Updated System Permissions

**File: `src/components/RoleForm.tsx`**
- Added `read` action to system permissions: "View system information"
- This provides a clear distinction between system administration and monitoring

## Changes Made

### src/lib/validatePermissions.ts
```typescript
const ALLOWED_PERMISSION_KEYS = [
  'attendees',
  'users',
  'roles',
  'eventSettings',
  'customFields',
  'logs',
  'system',
  'monitoring', // Added
  'all'
];
```

### src/lib/permissions.ts
```typescript
interface UserPermissions {
  // ... existing permissions
  monitoring?: Permission;
}

export function canAccessTab(userRole: any, tab: string): boolean {
  switch (tab) {
    // ... existing cases
    case 'monitoring':
      return hasPermission(userRole, 'monitoring', 'read');
    default:
      return false;
  }
}
```

### src/pages/dashboard.tsx
```typescript
// In getAvailableTabs()
if (canAccessTab(currentUser?.role, 'monitoring')) tabs.push('monitoring');

// In sidebar navigation
{canAccessTab(currentUser?.role, 'monitoring') && (
  <Button
    variant={activeTab === "monitoring" ? "default" : "ghost"}
    className="w-full justify-start text-base"
    onClick={() => setActiveTab("monitoring")}
  >
    <BarChart3 className="mr-2 h-4 w-4" />
    Operator Monitoring
  </Button>
)}
```

### src/components/RoleForm.tsx
```typescript
const defaultPermissions: UserPermissions = {
  // ... existing permissions
  monitoring: {
    read: false,
    configure: false
  }
};

const permissionLabels = {
  // ... existing labels
  monitoring: {
    title: "Operator Monitoring",
    description: "Monitor database operator performance and feature flags",
    icon: Activity,
    actions: {
      read: "View operator metrics and performance data",
      configure: "Manage feature flags and operator settings"
    }
  }
};
```

## Impact

### Positive
- ✅ Operator Monitoring tab now uses the proper permission system
- ✅ Access can be controlled through role management UI
- ✅ Consistent with other tabs in the dashboard
- ✅ More flexible - any role can be granted monitoring access, not just Super Administrator
- ✅ Follows the application's RBAC architecture

### Breaking Changes
- ⚠️ Existing Super Administrator roles will need to have the `monitoring.read` permission added
- ⚠️ The default role initialization script should be updated to grant monitoring permissions to Super Administrator

### Bug Fix
- 🐛 Fixed "Invalid permission keys detected" error when trying to add monitoring permissions
- The `validatePermissions` utility was missing 'monitoring' from its allowed keys list

## Testing

### Manual Testing Steps
1. Log in as a Super Administrator
2. Go to Roles management
3. Edit the Super Administrator role
4. Verify that "Operator Monitoring" section appears in the permissions list
5. Enable "View operator metrics and performance data" permission
6. Save the role
7. Verify that the Operator Monitoring tab appears in the sidebar
8. Click the tab and verify it loads the OperatorMonitoringDashboard component
9. Create a test role without monitoring permissions
10. Assign a user to that role
11. Log in as that user and verify the Operator Monitoring tab does NOT appear

### Expected Behavior
- Users with `monitoring.read` permission can see and access the Operator Monitoring tab
- Users without `monitoring.read` permission cannot see the tab
- The tab appears in the correct position in the sidebar (after Activity Logs)
- Clicking the tab loads the monitoring dashboard

## Follow-up Tasks

1. **Update Default Roles Script** (`src/pages/api/roles/initialize.ts`)
   - Add monitoring permissions to Super Administrator role
   - Consider adding monitoring.read to Administrator role

2. **Update Documentation**
   - Add monitoring permissions to role documentation
   - Update user guide with information about operator monitoring access

3. **Migration Script** (Optional)
   - Create a migration script to add monitoring.read permission to existing Super Administrator roles

## Related Files
- `src/pages/dashboard.tsx` - Dashboard with tab navigation
- `src/lib/permissions.ts` - Permission system
- `src/lib/validatePermissions.ts` - Permission validation (CRITICAL - must include 'monitoring')
- `src/components/RoleForm.tsx` - Role management UI
- `src/components/OperatorMonitoringDashboard.tsx` - Monitoring dashboard component
- `src/pages/api/roles/initialize.ts` - Default roles initialization (needs update)
- `src/pages/api/roles/[id].ts` - Role update API (uses validatePermissions)

## References
- Feature Integration Guidelines: `.kiro/steering/feature-integration.md`
- Visual Design System: `.kiro/steering/visual-design.md`
- Product Overview: `.kiro/steering/product.md`
