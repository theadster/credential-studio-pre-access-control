# Feature Integration Guidelines

## Overview
When adding new features to CredentialStudio, ensure proper integration with the application's role-based access control (RBAC) and comprehensive logging systems. This maintains security, auditability, and consistent user experience across the application.

## Integration Checklist

When implementing a new feature, **ALWAYS** consider and ask:

### 1. Role-Based Access Control (RBAC) Integration

**Question to Ask:** "Should this feature have role-based permissions?"

**When to Add:**
- ✅ Any feature that modifies data (Create, Update, Delete operations)
- ✅ Any feature that displays sensitive information
- ✅ Any feature that performs administrative actions
- ✅ Any feature that affects other users or system-wide settings

**When to Skip:**
- ❌ Public-facing features (login, signup, password reset)
- ❌ Read-only features that all authenticated users should access
- ❌ User's own profile/preferences (self-service features)

**Implementation Steps:**

1. **Define Permission Structure** in `src/lib/permissions.ts`:
   ```typescript
   // Add to permission type definitions
   export interface Permissions {
     // ... existing permissions
     newFeature: {
       read: boolean;
       write: boolean;
       create: boolean;
       delete: boolean;
     };
   }
   ```

2. **Update Permission Checks**:
   - Add permission check functions if needed
   - Use `hasPermission(role, 'newFeature', 'action')` in components
   - Add `canAccessTab()` checks for new dashboard tabs

3. **Update Role Management UI** (`src/components/RoleForm.tsx`):
   - Add new permission toggles to the role creation/edit form
   - Include clear descriptions of what each permission grants

4. **Update Default Roles** (`src/pages/api/roles/initialize.ts`):
   - Add appropriate permissions to default roles:
     - **Super Administrator**: Full access (all permissions true)
     - **Administrator**: Most permissions (evaluate case-by-case)
     - **Staff**: Limited permissions (read/write only)
     - **Viewer**: Read-only access

5. **Document in Role Descriptions**:
   - Update role descriptions to mention new feature access
   - Ensure users understand what each role can do with the new feature

### 2. Logging System Integration

**Question to Ask:** "Should user actions with this feature be logged?"

**When to Add:**
- ✅ Any data modification (Create, Update, Delete)
- ✅ Administrative actions (role changes, user management)
- ✅ Security-relevant actions (login attempts, permission changes)
- ✅ Bulk operations (imports, exports, bulk edits)
- ✅ Critical business operations (credential generation, printing)

**When to Skip:**
- ❌ Read-only operations (viewing lists, searching)
- ❌ Frequent, low-value actions (pagination, sorting, filtering)
- ❌ User preference changes (theme, language)
- ❌ Actions that would create excessive log noise

**Implementation Steps:**

1. **Add Log Setting** in `src/pages/api/log-settings/index.ts`:
   ```typescript
   // Add new boolean field to log settings
   logNewFeatureAction: boolean;
   ```

2. **Update Database Schema** (`scripts/setup-appwrite.ts`):
   ```typescript
   // Add new boolean attribute to log_settings collection
   await databases.createBooleanAttribute(
     databaseId, 
     COLLECTIONS.LOG_SETTINGS, 
     'logNewFeatureAction', 
     false, 
     true // default value
   );
   ```

3. **Implement Logging** in API routes:
   ```typescript
   import { shouldLog } from '@/lib/logSettings';
   
   // In your API handler
   if (await shouldLog('newFeatureAction')) {
     await databases.createDocument(
       process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
       process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
       ID.unique(),
       {
         userId: user.$id,
         action: 'NEW_FEATURE_ACTION',
         details: JSON.stringify({
           type: 'feature_action',
           // Include relevant context
           itemId: item.id,
           changes: { /* what changed */ }
         })
       }
     );
   }
   ```

4. **Update Log Settings UI** (`src/components/LogSettingsDialog.tsx`):
   - Add new toggle for the feature's logging
   - Include clear description of what gets logged
   - Group related log settings together

5. **Update Log Display** (`src/pages/dashboard.tsx`):
   - Add new action type to log filters if needed
   - Ensure log details are properly formatted for display
   - Add appropriate icons/labels for the new action type

### 3. Documentation Requirements

**Always Document:**

1. **Permission Requirements**:
   - Document which permissions are needed in API route comments
   - Add JSDoc comments explaining permission checks
   - Update user documentation with permission requirements

2. **Logged Actions**:
   - Document what actions are logged and why
   - Explain what information is captured in log details
   - Note any PII considerations

3. **Integration Points**:
   - List all files modified for RBAC integration
   - List all files modified for logging integration
   - Document any new database fields or collections

## Examples

### Example 1: Adding a "Reports" Feature

**RBAC Integration:**
- ✅ Yes - Reports may contain sensitive data
- Permissions needed: `reports: { read: true, create: true }`
- Super Admin: Full access
- Administrator: Full access
- Staff: Read only
- Viewer: Read only

**Logging Integration:**
- ✅ Yes - Track report generation for audit purposes
- Log setting: `logReportGenerate`
- Log action: `REPORT_GENERATED`
- Log details: Report type, date range, user who generated

### Example 2: Adding a "Dashboard Widget Preferences" Feature

**RBAC Integration:**
- ❌ No - Personal preferences, not security-relevant
- All authenticated users can manage their own preferences

**Logging Integration:**
- ❌ No - Low-value action, would create noise
- User preferences are not audit-worthy

### Example 3: Adding a "Bulk Attendee Import" Feature

**RBAC Integration:**
- ✅ Yes - Modifies data, could affect many records
- Permissions needed: `attendees: { create: true }`
- Super Admin: Yes
- Administrator: Yes
- Staff: Yes (if they have attendee create permission)
- Viewer: No

**Logging Integration:**
- ✅ Yes - Important to track bulk operations
- Log setting: `logAttendeeImport`
- Log action: `ATTENDEES_IMPORTED`
- Log details: Number of records, file name, success/failure counts

## Testing Requirements

When adding RBAC or logging integration:

1. **Permission Tests**:
   - Test that users without permission are denied access
   - Test that users with permission can access the feature
   - Test edge cases (no role, invalid role, etc.)

2. **Logging Tests**:
   - Test that actions are logged when setting is enabled
   - Test that actions are NOT logged when setting is disabled
   - Test that log details contain expected information
   - Test that PII is properly handled

3. **Integration Tests**:
   - Test the complete flow with permissions and logging
   - Test role changes affect feature access immediately
   - Test log settings changes affect logging immediately

## Common Pitfalls to Avoid

1. **❌ Don't forget to update default roles** - New features should be added to existing role definitions
2. **❌ Don't log PII unnecessarily** - Be mindful of what data goes into logs
3. **❌ Don't create overly granular permissions** - Keep permissions at a reasonable level
4. **❌ Don't skip documentation** - Future developers need to understand the integration
5. **❌ Don't forget backward compatibility** - Existing roles should still work after adding new permissions
6. **❌ Don't log read operations** - This creates excessive noise and performance issues
7. **❌ Don't make everything require admin permissions** - Consider the user experience

## Quick Reference

### Files to Update for RBAC:
- `src/lib/permissions.ts` - Permission type definitions
- `src/components/RoleForm.tsx` - Role management UI
- `src/pages/api/roles/initialize.ts` - Default roles
- API routes - Permission checks
- Components - UI permission checks

### Files to Update for Logging:
- `scripts/setup-appwrite.ts` - Database schema
- `src/lib/logSettings.ts` - Log setting checks
- `src/components/LogSettingsDialog.tsx` - Settings UI
- `src/pages/dashboard.tsx` - Log display
- API routes - Log creation

## Questions to Ask During Feature Planning

1. **Who should be able to use this feature?**
   - All users? Specific roles? Admins only?

2. **What actions should be logged?**
   - Creates? Updates? Deletes? All of the above?

3. **What information is important to capture in logs?**
   - What changed? Who did it? When? Why?

4. **Should this be configurable?**
   - Should admins be able to turn logging on/off?
   - Should permissions be granular or simple?

5. **What's the security impact?**
   - Could this expose sensitive data?
   - Could this be abused if not properly controlled?

6. **What's the audit requirement?**
   - Is this legally required to be logged?
   - Is this important for business operations?

## Conclusion

Proper integration with RBAC and logging systems ensures:
- ✅ Consistent security across the application
- ✅ Complete audit trail for compliance
- ✅ Better user experience with appropriate access levels
- ✅ Easier debugging and troubleshooting
- ✅ Professional, enterprise-ready application

**Remember:** When in doubt, ask! It's better to discuss integration requirements during planning than to retrofit them later.
