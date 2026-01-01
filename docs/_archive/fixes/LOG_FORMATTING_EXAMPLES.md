# Log Formatting Examples

## Enhanced Descriptions

The log formatting utility now provides detailed, informative descriptions while keeping them concise.

## Examples by Operation Type

### Attendee Operations

#### Create Attendee
```typescript
createAttendeeLogDetails('create', {
  firstName: 'John',
  lastName: 'Doe',
  barcodeNumber: 'EVT12345'
})
```
**Result**: "Created attendee John Doe (EVT12345)"

#### Update Attendee
```typescript
createAttendeeLogDetails('update', {
  firstName: 'John',
  lastName: 'Doe',
  barcodeNumber: 'EVT12345'
}, {
  changes: ['firstName', 'email', 'company', 'jobTitle', 'phone']
})
```
**Result**: "Updated attendee John Doe (firstName, email, company and 2 more)"

#### Delete Attendee
```typescript
createAttendeeLogDetails('delete', {
  firstName: 'John',
  lastName: 'Doe',
  barcodeNumber: 'EVT12345'
})
```
**Result**: "Deleted attendee John Doe (EVT12345)"

#### Print Badge
```typescript
createAttendeeLogDetails('print', {
  firstName: 'John',
  lastName: 'Doe',
  barcodeNumber: 'EVT12345'
})
```
**Result**: "Printed badge for John Doe (EVT12345)"

### Bulk Attendee Operations

#### Bulk Delete
```typescript
createBulkAttendeeLogDetails('bulk_delete', 25, {
  names: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', ...]
})
```
**Result**: "Deleted 25 attendees including John Doe, Jane Smith, Bob Johnson and 22 more"

#### Bulk Update
```typescript
createBulkAttendeeLogDetails('bulk_update', 15, {
  names: ['John Doe', 'Jane Smith', 'Bob Johnson']
})
```
**Result**: "Updated 15 attendees including John Doe, Jane Smith, Bob Johnson and 12 more"

#### Bulk Generate Credentials
```typescript
createBulkAttendeeLogDetails('bulk_generate', 50, {
  names: ['John Doe', 'Jane Smith', 'Bob Johnson']
})
```
**Result**: "Generated 50 credentials for John Doe, Jane Smith, Bob Johnson and 47 more"

### User Operations

#### Create User
```typescript
createUserLogDetails('create', {
  name: 'John Doe',
  email: 'john@example.com'
}, {
  role: 'Administrator'
})
```
**Result**: "Created user John Doe (john@example.com) with role \"Administrator\""

#### Update User
```typescript
createUserLogDetails('update', {
  name: 'John Doe',
  email: 'john@example.com'
}, {
  changes: ['name', 'role', 'permissions']
})
```
**Result**: "Updated user John Doe (name, role, permissions)"

#### Delete User
```typescript
createUserLogDetails('delete', {
  name: 'John Doe',
  email: 'john@example.com'
})
```
**Result**: "Deleted user John Doe (john@example.com)"

### Role Operations

#### Create Role
```typescript
createRoleLogDetails('create', {
  name: 'Event Manager',
  id: 'role123'
}, {
  description: 'Can manage attendees and view reports'
})
```
**Result**: "Created role \"Event Manager\" - Can manage attendees and view reports"

#### Update Role
```typescript
createRoleLogDetails('update', {
  name: 'Event Manager',
  id: 'role123'
}, {
  changes: ['permissions', 'description']
})
```
**Result**: "Updated role \"Event Manager\" (permissions, description)"

### Settings Operations

#### Update Event Settings
```typescript
createSettingsLogDetails('update', 'event', {
  changes: ['eventName', 'eventDate', 'eventLocation', 'barcodeType', 'barcodeLength']
})
```
**Result**: "Updated event settings (eventName, eventDate, eventLocation and 2 more)"

#### Update Log Settings
```typescript
createSettingsLogDetails('update', 'log', {
  changes: ['attendeeCreate', 'attendeeUpdate']
})
```
**Result**: "Updated log settings (attendeeCreate, attendeeUpdate)"

### Import/Export Operations

#### Import Attendees
```typescript
createImportLogDetails('attendees', 100, {
  filename: 'attendees_2025.csv',
  names: ['John Doe', 'Jane Smith', 'Bob Johnson']
})
```
**Result**: "Imported 100 attendees from attendees_2025.csv including John Doe, Jane Smith, Bob Johnson and 97 more"

#### Export Attendees (CSV)
```typescript
createExportLogDetails('attendees', 'csv', 150, {
  filename: 'attendees_export_2025-10-09.csv'
})
```
**Result**: "Exported 150 attendees as CSV (attendees_export_2025-10-09.csv)"

#### Export Logs (PDF)
```typescript
createExportLogDetails('logs', 'pdf', 500, {
  filename: 'activity_logs_2025-10-09.pdf'
})
```
**Result**: "Exported 500 activity logs as PDF (activity_logs_2025-10-09.pdf)"

### Authentication Operations

#### Login
```typescript
createAuthLogDetails('login', {
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
})
```
**Result**: "User logged in"

#### Logout
```typescript
createAuthLogDetails('logout')
```
**Result**: "User logged out"

### System Operations

#### Delete Logs
```typescript
createDeleteLogsDetails(1000, {
  beforeDate: '2025-10-05',
  action: 'view'
})
```
**Result**: "Deleted 1000 logs (before 10/5/2025, action: view)"

#### Custom System Operation
```typescript
createSystemLogDetails('database_backup', 'Automated database backup completed successfully', {
  size: '2.5GB',
  duration: '45s'
})
```
**Result**: "Automated database backup completed successfully"

## Usage Guidelines

### When to Include Sample Names

✅ **Include names for**:
- Bulk operations (delete, update, generate)
- Import operations
- Any operation affecting multiple entities

❌ **Don't include names for**:
- Single entity operations (already in description)
- System operations
- Authentication operations

### How Many Names to Show

The utility automatically shows:
- **First 3 names** from the provided list
- **"and X more"** if there are additional items
- Example: "John Doe, Jane Smith, Bob Johnson and 22 more"

### When to Include Filenames

✅ **Include filenames for**:
- Import operations (source file)
- Export operations (destination file)
- File upload operations

### When to Include Changed Fields

✅ **Include changed fields for**:
- Update operations (attendees, users, roles, settings)
- Shows first 3 fields + "and X more" if applicable

### Additional Details to Include

**Attendees**:
- Barcode number (for create, delete, print)
- Changed fields (for update)

**Users**:
- Email address (for create, delete)
- Role name (for create)
- Changed fields (for update)

**Roles**:
- Description (for create)
- Changed fields (for update)

**Settings**:
- Changed fields (for update)

**Import/Export**:
- Filename
- Count
- Sample names (for import)

**System**:
- Filters applied
- Counts
- Error information if applicable

## Complete Example Flow

### Bulk Delete Attendees

**Code**:
```typescript
const attendeesToDelete = [
  { firstName: 'John', lastName: 'Doe' },
  { firstName: 'Jane', lastName: 'Smith' },
  { firstName: 'Bob', lastName: 'Johnson' },
  // ... 22 more
];

const names = attendeesToDelete.map(a => `${a.firstName} ${a.lastName}`);

const logDetails = createBulkAttendeeLogDetails('bulk_delete', 25, { names });

await databases.createDocument({
  // ...
  data: {
    action: 'bulk_delete',
    details: JSON.stringify(logDetails)
  }
});
```

**Log Entry Display**:
- **Action**: "Bulk Delete"
- **User**: "Admin User (admin@example.com)"
- **Target**: "Attendees"
- **Group**: "Attendees"
- **Description**: "Deleted 25 attendees including John Doe, Jane Smith, Bob Johnson and 22 more"
- **Timestamp**: "2025-10-09 3:45 PM"

## Benefits

1. **Informative**: Users can see exactly what happened
2. **Concise**: Descriptions don't become overwhelming
3. **Consistent**: All logs follow the same pattern
4. **Scannable**: Easy to quickly understand the action
5. **Detailed**: Enough context for auditing and troubleshooting
