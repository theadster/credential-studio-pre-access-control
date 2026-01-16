---
inclusion: manual
---
# Feature Integration Guidelines

When adding new features, integrate with RBAC and logging systems for security and auditability.

## Decision Matrix

| Integration | Add When | Skip When |
|-------------|----------|-----------|
| **RBAC** | Modifies data, displays sensitive info, admin actions, affects other users | Public features (login/signup), read-only for all users, user's own preferences |
| **Logging** | Data modifications (CUD), admin/security actions, bulk operations, critical business ops | Read-only ops, high-frequency trivial actions (pagination), user preferences |

## RBAC Implementation

| Step | Action | File(s) | Pattern |
|------|--------|---------|---------|
| 1 | Define permission structure | `src/lib/permissions.ts` | Add to `Permissions` interface |
| 2 | Add permission checks | Components, API routes | `hasPermission(role, 'feature', 'action')` |
| 3 | Update Role UI | `src/components/RoleForm.tsx` | Add toggles with descriptions |
| 4 | Set default roles | `src/pages/api/roles/initialize.ts` | SuperAdmin=full, Admin=most, Staff=limited, Viewer=read |
| 5 | Document | API route comments, JSDoc | Permission requirements |

```typescript
// Step 1: Permission structure (src/lib/permissions.ts)
export interface Permissions {
  newFeature: { read: boolean; write: boolean; create: boolean; delete: boolean; };
}
```

## Logging Implementation

| Step | Action | File(s) | Pattern |
|------|--------|---------|---------|
| 1 | Add log setting | `src/pages/api/log-settings/index.ts` | `logNewFeatureAction: boolean` |
| 2 | Update schema | `scripts/setup-appwrite.ts` | `createBooleanAttribute(..., 'logNewFeatureAction')` |
| 3 | Implement logging | API routes | `if (await shouldLog('action')) { createDocument(...) }` |
| 4 | Update Settings UI | `src/components/LogSettingsDialog.tsx` | Add toggle with description |
| 5 | Update Log Display | `src/pages/dashboard.tsx` | Add action type to filters |

```typescript
// Step 3: Logging in API route
import { shouldLog } from '@/lib/logSettings';

if (await shouldLog('newFeatureAction')) {
  await databases.createDocument(databaseId, COLLECTIONS.LOGS, ID.unique(), {
    userId: user.$id, action: 'NEW_FEATURE_ACTION',
    details: JSON.stringify({ type: 'feature_action', itemId: item.id })
  });
}
```

## Examples

### Full Integration: Bulk Attendee Import
- **RBAC**: ✅ Yes - modifies data, affects many records
  - Permission: `attendees: { create: true }`
  - Roles: SuperAdmin ✓, Admin ✓, Staff ✓ (with permission), Viewer ✗
- **Logging**: ✅ Yes - track bulk operations for audit
  - Setting: `logAttendeeImport`, Action: `ATTENDEES_IMPORTED`
  - Details: record count, filename, success/failure counts

### Skip Integration: Dashboard Widget Preferences
- **RBAC**: ✗ No - personal preferences, not security-relevant
- **Logging**: ✗ No - low-value action, creates noise

## Common Pitfalls

1. ❌ **Don't forget default roles** - Add new permissions to existing role definitions
2. ❌ **Don't log PII** - Log IDs and event names, not sensitive user data
3. ❌ **Don't over-granularize permissions** - Keep at reasonable level
4. ❌ **Don't log read operations** - Creates excessive noise and performance issues
5. ❌ **Don't skip backward compatibility** - Existing roles must still work

## Definition of Done

- [ ] Permission checks in API routes and components
- [ ] Default roles updated with new permissions
- [ ] Log setting added and UI toggle created
- [ ] Actions logged with appropriate detail level
- [ ] Tests: permission denied/granted, logging enabled/disabled
- [ ] Documentation: API comments, JSDoc, user docs

## Quick File Reference

**RBAC**: `permissions.ts` → `RoleForm.tsx` → `roles/initialize.ts` → API routes → Components

**Logging**: `setup-appwrite.ts` → `logSettings.ts` → `LogSettingsDialog.tsx` → `dashboard.tsx` → API routes
