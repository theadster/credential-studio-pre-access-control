# Remove IP Address and User Agent from Logs Export

## Problem

IP Address and User Agent fields were available in the logs export dialog and API, but this data is not collected by the application.

## Solution

Removed both fields from:
1. Export API field mappings
2. Export dialog available fields list

## Changes Made

### 1. Export API (`src/pages/api/logs/export.ts`)

**Removed**:
```typescript
ipAddress: {
  header: 'IP Address',
  extract: (log) => log.details?.ipAddress || ''
},
userAgent: {
  header: 'User Agent',
  extract: (log) => log.details?.userAgent || ''
}
```

### 2. Export Dialog (`src/components/LogsExportDialog.tsx`)

**Before**:
```typescript
{ id: 'logId', name: 'Log ID', description: 'Unique identifier of the log entry', category: 'system' },
{ id: 'changes', name: 'Changes Made', description: 'Specific fields that were changed', category: 'system' },
{ id: 'ipAddress', name: 'IP Address', description: 'IP address of the user (if available)', category: 'system' },
{ id: 'userAgent', name: 'User Agent', description: 'Browser/device information (if available)', category: 'system' }
```

**After**:
```typescript
{ id: 'logId', name: 'Log ID', description: 'Unique identifier of the log entry', category: 'system' },
{ id: 'changes', name: 'Changes Made', description: 'Specific fields that were changed', category: 'system' }
```

## Available Export Fields (After Removal)

### Basic Fields
- Log ID
- Date & Time
- Action

### User Fields
- User Name
- User Email
- User ID

### Target Fields
- Target Name
- Target Type
- Attendee ID

### Details Fields
- Details
- Changes Made

## Impact

- ✅ Export dialog no longer shows IP Address and User Agent options
- ✅ Export API no longer includes these fields in CSV
- ✅ Cleaner export interface
- ✅ No confusion about unavailable data
- ✅ Smaller CSV files

## Testing

1. Open Activity Logs tab
2. Click "Export Logs"
3. Check available fields:
   - [ ] IP Address is NOT in the list
   - [ ] User Agent is NOT in the list
   - [ ] All other fields are still available
4. Export logs with various field selections
5. Verify CSV doesn't have IP Address or User Agent columns

## Files Modified

1. ✅ `src/pages/api/logs/export.ts` - Removed field mappings
2. ✅ `src/components/LogsExportDialog.tsx` - Removed from available fields
3. ✅ `docs/fixes/REMOVE_IP_USERAGENT_FROM_LOGS.md` - This documentation

## Notes

- These fields were never populated with data
- Removing them simplifies the export interface
- If IP/User Agent tracking is needed in the future, it would require:
  - Collecting the data at log creation time
  - Adding it to the log details object
  - Re-adding these field mappings
