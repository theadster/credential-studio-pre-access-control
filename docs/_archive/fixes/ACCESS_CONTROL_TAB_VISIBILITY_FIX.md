# Access Control Tab Visibility Fix

## Issue
The Access Control tab was implemented in Step 11 of the mobile-access-control spec, but it wasn't visible in the dashboard for users, and the permissions weren't listed in the role management UI.

## Root Cause
Two issues were identified:

1. **Missing Permissions in RoleForm UI**: The `RoleForm` component didn't include the new permission categories (`accessControl`, `approvalProfiles`, `scanLogs`) in its `permissionLabels` object. This meant these permissions couldn't be configured through the UI, even though they were defined in the permissions system.

2. **Existing Roles Missing Permissions**: If roles were initialized before the access control feature was added, existing roles wouldn't have these permissions set. The role initialization script only runs once, so existing roles need to be updated via migration.

## Solution

### 1. Updated RoleForm Component
**File**: `src/components/RoleForm.tsx`

Added the missing permission categories to the form:
- `accessControl`: Controls access to the Access Control tab
  - `read`: View access control settings
  - `write`: Manage access control settings
- `approvalProfiles`: Controls approval profile management
  - `read`: View approval profiles
  - `write`: Create and edit approval profiles
  - `delete`: Delete approval profiles
- `scanLogs`: Controls scan log viewing
  - `read`: View scan logs
  - `export`: Export scan logs

### 2. Migration Script
**File**: `scripts/add-access-control-permissions.ts`

Created a migration script to add access control permissions to existing roles:

```bash
npx ts-node scripts/add-access-control-permissions.ts
```

This script:
- Fetches all existing roles
- Adds the missing permission categories
- Sets appropriate permission levels based on role type:
  - **Super Administrator**: Full access (read: true, write: true, delete: true)
  - **Event Manager**: Full access (read: true, write: true, delete: true)
  - **Registration Staff**: Limited access (read: true, write: true for profiles, read-only for logs)
  - **Viewer**: Read-only access (read: true, write: false)

## How to Apply the Fix

### For New Installations
No action needed. New roles created through the UI will automatically include access control permissions.

### For Existing Installations
Run the migration script to add permissions to existing roles:

```bash
# Set up environment variables if not already set
export APPWRITE_API_KEY="your_api_key"
export NEXT_PUBLIC_APPWRITE_ENDPOINT="your_endpoint"
export NEXT_PUBLIC_APPWRITE_PROJECT_ID="your_project_id"
export NEXT_PUBLIC_APPWRITE_DATABASE_ID="your_database_id"
export NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID="your_roles_collection_id"

# Run the migration
npx ts-node scripts/add-access-control-permissions.ts
```

## Verification

After applying the fix:

1. **Check RoleForm UI**: 
   - Go to Dashboard → Roles
   - Create or edit a role
   - Scroll down in the permissions accordion
   - You should see three new sections:
     - Access Control
     - Approval Profiles
     - Scan Logs

2. **Check Dashboard Tab**:
   - Users with appropriate permissions should see "Access Control" in the sidebar
   - Clicking it should show the Approval Profile Manager and Scan Logs Viewer components

3. **Check Default Roles**:
   - Super Administrator: Full access to all access control features
   - Event Manager: Full access to all access control features
   - Registration Staff: Can view and manage profiles, view scan logs
   - Viewer: Read-only access to profiles and scan logs

## Files Modified
- `src/components/RoleForm.tsx` - Added UI for access control permissions
- `scripts/add-access-control-permissions.ts` - New migration script

## Related Requirements
- Requirement 5.1: Add access control permissions to role system
- Requirement 5.4: Ensure proper RBAC integration
- Task 12.1: Add access control permissions to role system

## Testing
The fix has been verified to:
- ✓ Display access control permissions in the RoleForm UI
- ✓ Allow creation and editing of roles with access control permissions
- ✓ Properly initialize default roles with access control permissions
- ✓ Make the Access Control tab visible to users with appropriate permissions
