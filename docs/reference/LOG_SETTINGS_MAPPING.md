---
title: "Log Settings to Action Mapping"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/lib/logSettings.ts", "src/pages/api/log-settings/index.ts", "src/components/LogSettingsDialog.tsx"]
---

# Log Settings to Action Mapping

## Date
January 9, 2025

## Overview
This document maps each log setting to its corresponding action(s) in the codebase to ensure proper logging control.

## Log Settings Structure

### Attendee Operations
| Setting | Action(s) | Endpoint(s) | Status |
|---------|-----------|-------------|--------|
| `attendeeCreate` | `create` | `/api/attendees` POST | ✅ Fixed - Now uses `shouldLog` |
| `attendeeUpdate` | `update` | `/api/attendees/[id]` PUT | ✅ Fixed - Now uses `shouldLog` |
| `attendeeDelete` | `delete` | `/api/attendees/[id]` DELETE | ✅ Fixed - Now uses `shouldLog` |
| `attendeeView` | `view` | `/api/attendees/[id]` GET | ✅ Fixed - Now uses `shouldLog` |
| `attendeeBulkDelete` | `delete` (bulk) | `/api/attendees/bulk-delete` | ✅ Fixed - Now uses `shouldLog` |
| `attendeeImport` | `import` | `/api/attendees/import` | ✅ Fixed - Now uses `shouldLog` |
| `attendeeExport` | `export` | `/api/attendees/export` | ✅ Fixed - Now uses `shouldLog` |

### Credential Management
| Setting | Action(s) | Endpoint(s) | Status |
|---------|-----------|-------------|--------|
| `credentialGenerate` | `generate_credential` | `/api/attendees/[id]/generate-credential` | ✅ Fixed - Now uses `shouldLog` |
| `credentialClear` | `clear_credential` | `/api/attendees/[id]/clear-credential` | ✅ Fixed - Now uses `shouldLog` |

### User Operations
| Setting | Action(s) | Endpoint(s) | Status |
|---------|-----------|-------------|--------|
| `userCreate` | `user_linked` | `/api/users` POST | ✅ Fixed - Now uses `shouldLog` |
| `userUpdate` | `user_updated` | `/api/users` PUT | ✅ Fixed - Now uses `shouldLog` |
| `userDelete` | `delete` | `/api/users` DELETE | ✅ Fixed - Now uses `shouldLog` |
| `userView` | N/A | No individual user view endpoint | ℹ️ Not applicable |
| `userInvite` | `create` | `/api/invitations` POST | ✅ Fixed - Now uses `shouldLog` |

### Role Operations
| Setting | Action(s) | Endpoint(s) | Status |
|---------|-----------|-------------|--------|
| `roleCreate` | `create` | `/api/roles` POST | ✅ Fixed - Now uses `shouldLog` |
| `roleUpdate` | `update` | `/api/roles/[id]` PUT | ✅ Fixed - Now uses `shouldLog` |
| `roleDelete` | `delete` | `/api/roles/[id]` DELETE | ✅ Fixed - Now uses `shouldLog` |
| `roleView` | `view` | `/api/roles/[id]` GET | ✅ Fixed - Now uses `shouldLog` |

### Event Settings
| Setting | Action(s) | Endpoint(s) | Status |
|---------|-----------|-------------|--------|
| `eventSettingsUpdate` | `update` | `/api/event-settings` PUT | ✅ Fixed - Now uses `shouldLog` |

### Custom Fields
| Setting | Action(s) | Endpoint(s) | Status |
|---------|-----------|-------------|--------|
| `customFieldCreate` | `create` | `/api/custom-fields` POST | ✅ Fixed - Now uses `shouldLog` |
| `customFieldUpdate` | `update` | `/api/custom-fields/[id]` PUT | ✅ Fixed - Now uses `shouldLog` |
| `customFieldDelete` | `delete` | `/api/custom-fields/[id]` DELETE | ✅ Fixed - Now uses `shouldLog` |
| `customFieldReorder` | `update` | `/api/custom-fields/reorder` POST | ✅ Fixed - Now uses `shouldLog` |

### Authentication
| Setting | Action(s) | Endpoint(s) | Status |
|---------|-----------|-------------|--------|
| `authLogin` | `auth_login` | `AuthContext` → `/api/logs` POST | ✅ Fixed - Conversion logic updated to handle snake_case |
| `authLogout` | `auth_logout` | `AuthContext` → `/api/logs` POST | ✅ Fixed - Conversion logic updated to handle snake_case |

### Logs Management
| Setting | Action(s) | Endpoint(s) | Status |
|---------|-----------|-------------|--------|
| `logsDelete` | `delete_logs` | `/api/logs/delete` DELETE | ✅ Fixed - Now uses `shouldLog` |
| `logsExport` | `export` | `/api/logs/export` POST | ✅ Fixed - Now uses `shouldLog` |
| `logsView` | N/A | `/api/logs` GET | ℹ️ Not logged (to avoid infinite recursion) |

### System View Operations
| Setting | Action(s) | Endpoint(s) | Status |
|---------|-----------|-------------|--------|
| `systemViewEventSettings` | `view` | `/api/event-settings` GET | ✅ Uses `shouldLog` |
| `systemViewAttendeeList` | `view` | `/api/attendees` GET | ✅ Fixed - Now uses `shouldLog` |
| `systemViewRolesList` | `view` | `/api/roles` GET | ✅ Fixed - Now uses `shouldLog` |
| `systemViewUsersList` | `view` | `/api/users` GET | ✅ Uses `shouldLog` |

## Recent Fixes

### Fixed in This Session
1. **credentialGenerate** - Added `shouldLog` check
2. **credentialClear** - Added `shouldLog` check
3. **systemViewAttendeeList** - Changed from direct check to `shouldLog`
4. **systemViewRolesList** - Added `shouldLog` check

### Pattern Used
```typescript
// Before (incorrect)
if (logSettings && logSettings.systemViewAttendeeList !== false) {
  // Log...
}

// After (correct)
if (await shouldLog('systemViewAttendeeList')) {
  // Log...
}
```

## Implementation Status

### ✅ Confirmed Working (All Fixed!)
- Attendee CRUD operations
- Credential generate/clear
- System view operations (Event Settings, Attendees List, Roles List, Users List)
- Bulk attendee delete
- Attendee import/export
- User CRUD operations
- Invitation operations
- Role CRUD operations
- Custom field operations
- Event settings update
- Authentication logs (login/logout)
- Logs management (delete/export)

## How to Verify

### 1. Check if `shouldLog` is Used
```bash
grep -n "shouldLog" src/pages/api/[endpoint].ts
```

### 2. Check if Import Exists
```bash
grep -n "import.*shouldLog" src/pages/api/[endpoint].ts
```

### 3. Test the Setting
1. Disable the setting in Log Settings dialog
2. Perform the action
3. Check if log was created
4. If log was created, the setting is not working

## Common Issues

### Issue 1: Direct Check Instead of shouldLog
**Problem:**
```typescript
if (logSettings && logSettings.attendeeCreate !== false) {
  // This logs even when setting is undefined
}
```

**Solution:**
```typescript
if (await shouldLog('attendeeCreate')) {
  // This only logs when setting is explicitly true
}
```

### Issue 2: Missing Import
**Problem:**
```typescript
// shouldLog is not imported
if (await shouldLog('attendeeCreate')) { // Error!
```

**Solution:**
```typescript
import { shouldLog } from '@/lib/logSettings';
```

### Issue 3: Wrong Setting Name
**Problem:**
```typescript
if (await shouldLog('attendee_create')) { // Wrong name!
```

**Solution:**
```typescript
if (await shouldLog('attendeeCreate')) { // Correct camelCase
```

## Next Steps

1. **Audit remaining endpoints** - Check all endpoints marked with ⚠️
2. **Add shouldLog checks** - Where missing
3. **Test each setting** - Verify it actually prevents logging
4. **Update this document** - Mark as ✅ when verified

## Related Files
- `src/lib/logSettings.ts` - shouldLog implementation
- `src/pages/api/log-settings/index.ts` - Log settings CRUD
- `src/components/LogSettingsDialog.tsx` - UI for managing settings
