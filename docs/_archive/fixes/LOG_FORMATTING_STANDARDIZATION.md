# Log Formatting Standardization

## Problem

Log entries throughout the application have inconsistent formatting:
- Inconsistent capitalization (e.g., "badge" vs "Badge")
- Incorrect categorization (e.g., print badge showing "badge" instead of "Attendee")
- Vague descriptions (e.g., "print" instead of "Printed badge for John Doe")
- Mixed formatting styles across different operations

## Solution

Created a centralized log formatting utility (`src/lib/logFormatting.ts`) that provides:
- Consistent action name formatting
- Proper target/category names
- Descriptive, human-readable log descriptions
- Type-safe log detail creation

## New Utility Functions

### Core Formatting Functions

1. **`formatActionName(action: string)`** - Formats action codes for display
   - `'print'` → `'Print'`
   - `'delete_logs'` → `'Delete Logs'`
   - `'bulk_update'` → `'Bulk Update'`

2. **`formatTargetName(target: string)`** - Formats target/category names
   - `'credential'` → `'Badge'`
   - `'attendee'` → `'Attendee'`
   - `'event_settings'` → `'Event Settings'`

### Log Detail Creation Functions

1. **`createAttendeeLogDetails()`** - For attendee operations
   ```typescript
   createAttendeeLogDetails('print', {
     firstName: 'John',
     lastName: 'Doe',
     barcodeNumber: '12345'
   })
   // Returns: {
   //   type: 'attendee',
   //   target: 'Attendee',
   //   description: 'Printed badge for John Doe',
   //   ...
   // }
   ```

2. **`createBulkAttendeeLogDetails()`** - For bulk operations
   ```typescript
   createBulkAttendeeLogDetails('bulk_delete', 25)
   // Returns: {
   //   type: 'attendees',
   //   target: 'Attendees',
   //   description: 'Deleted 25 attendees',
   //   count: 25
   // }
   ```

3. **`createUserLogDetails()`** - For user operations
4. **`createRoleLogDetails()`** - For role operations
5. **`createSettingsLogDetails()`** - For settings operations
6. **`createAuthLogDetails()`** - For authentication operations
7. **`createExportLogDetails()`** - For export operations
8. **`createImportLogDetails()`** - For import operations
9. **`createSystemLogDetails()`** - For system operations
10. **`createDeleteLogsDetails()`** - For log deletion operations

## Files Updated

### ✅ Already Updated

1. **`src/lib/logFormatting.ts`** - New utility file created
2. **`src/pages/api/attendees/[id]/print.ts`** - Print badge logging
3. **`src/pages/api/logs/delete.ts`** - Delete logs logging

### 📋 Files That Need Updates

#### Attendee Operations
- [ ] `src/pages/api/attendees/index.ts` - Create/list attendees
- [ ] `src/pages/api/attendees/[id].ts` - Update/delete/view attendee
- [ ] `src/pages/api/attendees/bulk-delete.ts` - Bulk delete
- [ ] `src/pages/api/attendees/bulk-edit.ts` - Bulk update
- [ ] `src/pages/api/attendees/bulk-generate-credentials.ts` - Bulk generate
- [ ] `src/pages/api/attendees/export.ts` - Export attendees
- [ ] `src/pages/api/attendees/import.ts` - Import attendees

#### User Operations
- [ ] `src/pages/api/users/index.ts` - Create/list users
- [ ] `src/pages/api/users/[id].ts` - Update/delete user
- [ ] `src/pages/api/invitations/index.ts` - User invitations

#### Role Operations
- [ ] `src/pages/api/roles/index.ts` - Create/list roles
- [ ] `src/pages/api/roles/[id].ts` - Update/delete/view role

#### Settings Operations
- [ ] `src/pages/api/event-settings/index.ts` - Update event settings
- [ ] `src/pages/api/log-settings/index.ts` - Update log settings
- [ ] `src/pages/api/custom-fields/index.ts` - Create custom field
- [ ] `src/pages/api/custom-fields/[id].ts` - Update/delete custom field

#### Authentication
- [ ] `src/pages/api/auth/login.ts` - Login
- [ ] `src/pages/api/auth/logout.ts` - Logout

#### Export/Import
- [ ] `src/pages/api/logs/export.ts` - Export logs

## Expected Format Examples

### Before
```json
{
  "action": "print",
  "details": {
    "type": "credential",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Display**: 
- Action: "Print"
- Target: "badge" (lowercase, incorrect)
- Group: "badge" (should be "Attendee")
- Description: Generic or missing

### After
```json
{
  "action": "print",
  "details": {
    "type": "attendee",
    "target": "Attendee",
    "description": "Printed badge for John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "barcodeNumber": "12345"
  }
}
```

**Display**:
- Action: "Print"
- Target: "Badge" (proper capitalization)
- Group: "Attendee" (correct categorization)
- Description: "Printed badge for John Doe" (descriptive)

## Implementation Pattern

### Old Pattern
```typescript
await databases.createDocument({
  // ...
  data: {
    action: 'print',
    details: JSON.stringify({
      type: 'credential',
      firstName: attendee.firstName,
      lastName: attendee.lastName
    })
  }
});
```

### New Pattern
```typescript
import { createAttendeeLogDetails } from '@/lib/logFormatting';

await databases.createDocument({
  // ...
  data: {
    action: 'print',
    details: JSON.stringify(createAttendeeLogDetails('print', {
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      barcodeNumber: attendee.barcodeNumber
    }))
  }
});
```

## Benefits

1. **Consistency**: All logs follow the same format
2. **Readability**: Clear, descriptive messages
3. **Maintainability**: Single source of truth for formatting
4. **Type Safety**: TypeScript interfaces ensure correct usage
5. **Localization Ready**: Easy to add i18n support later

## Testing

After updates, verify:
1. All log entries have proper capitalization
2. Target/category names are correct
3. Descriptions are clear and descriptive
4. Group categorization is accurate (Attendee, User, Role, System, etc.)

## Migration Strategy

1. ✅ Create utility functions
2. ✅ Update critical paths (print, delete logs)
3. 🔄 Update remaining API endpoints systematically
4. 🔄 Test each endpoint after update
5. 🔄 Update test files to match new format
6. 🔄 Document any special cases

## Next Steps

1. Update all API endpoints to use new formatting functions
2. Update test files to expect new format
3. Add integration tests for log formatting
4. Consider adding a migration script to update existing logs in database
5. Update documentation with new log format examples
