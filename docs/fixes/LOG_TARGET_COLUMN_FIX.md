# Log Target Column Display Fix

## Problems Identified

### 1. Target Column Display Issues
- Target and category were swapped in many log entries
- Print badge showed "Attendee" as target instead of person name
- Role operations showed "role" instead of role name
- User operations showed "User" instead of user name
- Auth operations showed "Authentication" instead of "System Operation"

### 2. Categorization Issues
- User operations should be "System Operation" not "User"
- Role operations should be "System Operation" not "Role"
- Auth operations (login/logout) should be "System Operation"
- Export/Import should be "System Operation" with "Export"/"Import" as target

### 3. Log Settings Changes Not Showing
- Updated log settings showed field names but not the from/to values
- Lost the "true to false" detail that was previously shown

## Solutions Implemented

### 1. Fixed Dashboard Display Logic

**File**: `src/pages/dashboard.tsx`

**Before**:
```typescript
<div className="font-medium">{log.details?.target || log.details?.type}</div>
<div className="text-xs">{log.details?.type}</div>
```

**After**:
```typescript
// Top line: Show actual target (person name, role name, or target type)
<div className="font-medium">
  {log.details?.firstName && log.details?.lastName 
    ? `${log.details.firstName} ${log.details.lastName}`
    : log.details?.roleName 
      ? log.details.roleName
      : log.details?.target 
        ? log.details.target
        : 'System'}
</div>

// Bottom line: Show category
<div className="text-xs">
  {type === 'attendee' ? 'Attendee'
    : type === 'user' ? 'User'
    : type === 'role' ? 'Role'
    : type === 'settings' ? 'Settings'
    : type === 'system' || type === 'auth' ? 'System Operation'
    : log.details?.target || 'System'}
</div>
```

### 2. Updated Log Formatting Utility

**File**: `src/lib/logFormatting.ts`

Changed categorization for system operations:

**User Operations**:
```typescript
// Before
type: 'user',
target: 'User'

// After
type: 'system',  // System operation
target: userName  // Actual user name
```

**Role Operations**:
```typescript
// Before
type: 'role',
target: 'Role'

// After
type: 'system',  // System operation
target: role.name  // Actual role name
```

**Auth Operations**:
```typescript
// Before
type: 'auth',
target: 'Authentication'

// After
type: 'system',  // System operation
target: 'Authentication'
```

**Export Operations**:
```typescript
// Before
type: exportType,  // 'attendees' or 'logs'
target: formatTargetName(exportType)

// After
type: 'system',  // System operation
target: 'Export'
exportType: exportType  // Stored separately
```

**Import Operations**:
```typescript
// Before
type: importType,  // 'attendees'
target: formatTargetName(importType)

// After
type: 'system',  // System operation
target: 'Import'
importType: importType  // Stored separately
```

### 3. Fixed Log Settings Change Details

**File**: `src/pages/api/log-settings/index.ts`

**Before**:
```typescript
details: JSON.stringify(createSettingsLogDetails('update', 'log', {
  changes: Object.keys(changes)  // Only field names
}))
```

**After**:
```typescript
details: JSON.stringify(createSettingsLogDetails('update', 'log', {
  changes: Object.keys(changes),
  changeDetails: changes  // Include from/to values
}))
```

## Expected Display After Fixes

### Print Badge
```
Action: Print
User: Adam LaPrade (adam@example.com)
Target: Jane Rodriguez
       Attendee
Details: Printed badge for Jane Rodriguez (EVT38328)
```

### Create User
```
Action: Create
User: Admin User (admin@example.com)
Target: John Doe
       System Operation
Details: Created user John Doe (john@example.com) with role "Administrator"
```

### Create Role
```
Action: Create
User: Admin User (admin@example.com)
Target: Event Manager
       System Operation
Details: Created role "Event Manager" - Can manage attendees
```

### Login/Logout
```
Action: Log In
User: John Doe (john@example.com)
Target: Authentication
       System Operation
Details: User logged in
```

### Export
```
Action: Export
User: Admin User (admin@example.com)
Target: Export
       System Operation
Details: Exported 150 attendees as CSV (attendees_export_2025-10-09.csv)
```

### Import
```
Action: Import
User: Admin User (admin@example.com)
Target: Import
       System Operation
Details: Imported 100 attendees from attendees_2025.csv including John Doe, Jane Smith, Bob Johnson and 97 more
```

### Update Log Settings
```
Action: Update
User: Admin User (admin@example.com)
Target: Log Settings
       Settings
Details: Updated log settings (attendeeCreate, attendeeUpdate)
        attendeeCreate: true → false
        attendeeUpdate: false → true
```

### View Event Settings
```
Action: View
User: Adam LaPrade (adam@example.com)
Target: Event Settings
       System Operation
Details: Viewed event configuration
```

## Categorization Rules

### Attendee
- Type: `attendee` or `attendees`
- Target: Person name (e.g., "Jane Rodriguez")
- Category: "Attendee"

### User
- Type: `system`
- Target: User name (e.g., "John Doe")
- Category: "System Operation"

### Role
- Type: `system`
- Target: Role name (e.g., "Event Manager")
- Category: "System Operation"

### Settings
- Type: `settings`
- Target: Settings type (e.g., "Event Settings", "Log Settings")
- Category: "Settings"

### Auth
- Type: `system`
- Target: "Authentication"
- Category: "System Operation"

### Export/Import
- Type: `system`
- Target: "Export" or "Import"
- Category: "System Operation"

### System
- Type: `system`
- Target: Operation name
- Category: "System Operation"

## Testing

After these fixes, verify:

### Target Column Display
- [ ] Top line shows actual target (person name, role name, etc.)
- [ ] Bottom line shows category (Attendee, System Operation, etc.)
- [ ] No swapped values

### Categorization
- [ ] Attendee operations → "Attendee"
- [ ] User operations → "System Operation"
- [ ] Role operations → "System Operation"
- [ ] Auth operations → "System Operation"
- [ ] Export/Import → "System Operation"
- [ ] Settings → "Settings"

### Log Settings Changes
- [ ] Shows field names that changed
- [ ] Shows from/to values (e.g., "true → false")
- [ ] Displays in details section

## Files Modified

1. ✅ `src/pages/dashboard.tsx` - Fixed Target column display logic
2. ✅ `src/lib/logFormatting.ts` - Updated categorization for system operations
3. ✅ `src/pages/api/log-settings/index.ts` - Include change details

## Impact on Existing Logs

- **Old logs**: Will display better with new dashboard logic
- **New logs**: Will be created with correct categorization
- **Test logs**: Need to be regenerated to see full effect

## Next Steps

1. ✅ Regenerate test logs to see new format
2. ✅ Verify display in Activity Logs tab
3. ✅ Test each operation type
4. ✅ Confirm categorization is correct
