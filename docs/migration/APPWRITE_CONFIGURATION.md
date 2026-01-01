---
title: "Appwrite Configuration Reference"
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 180
related_code: ["scripts/setup-appwrite.ts"]
---

# Appwrite Configuration Reference

This document provides a quick reference for the Appwrite infrastructure setup for CredentialStudio.

## Database Structure

**Database ID**: `credentialstudio`

### Collections Overview

| Collection | ID | Purpose | Key Attributes |
|------------|----|---------|--------------------|
| Users | `users` | User profiles linked to Appwrite Auth | userId, email, name, roleId, isInvited |
| Roles | `roles` | Role definitions with permissions | name, description, permissions (JSON) |
| Attendees | `attendees` | Event attendee records | firstName, lastName, barcodeNumber, customFieldValues (JSON) |
| Custom Fields | `custom_fields` | Dynamic form field definitions | fieldName, fieldType, fieldOrder, fieldOptions (JSON) |
| Event Settings | `event_settings` | Global event configuration | eventName, barcodeType, switchboardFieldMappings (JSON) |
| Logs | `logs` | Activity audit trail | userId, action, details (JSON) |
| Log Settings | `log_settings` | Logging preferences | logUserLogin, logAttendeeCreate, etc. |
| Invitations | `invitations` | User invitation tokens | token, expiresAt, usedAt |

## Collection Details

### 1. Users Collection (`users`)

**Purpose**: Store user profile information linked to Appwrite Auth accounts.

**Attributes**:
- `userId` (string, required) - Appwrite Auth user ID
- `email` (string, required, unique)
- `name` (string, optional)
- `roleId` (string, optional) - Reference to roles collection
- `isInvited` (boolean, default: false)

**Indexes**:
- `email_idx` (unique) - Fast email lookups
- `userId_idx` (key) - Link to Appwrite Auth
- `roleId_idx` (key) - Fast role lookups

**Permissions**:
- Read: Any authenticated user
- Write/Create/Delete: Admin users only

---

### 2. Roles Collection (`roles`)

**Purpose**: Define user roles with granular permissions.

**Attributes**:
- `name` (string, required, unique) - Role name (e.g., "Super Administrator")
- `description` (string, optional) - Role description
- `permissions` (string, JSON, required) - Serialized permissions object

**Permissions JSON Structure**:
```json
{
  "attendees": {
    "create": true,
    "read": true,
    "update": true,
    "delete": true
  },
  "users": {
    "create": true,
    "read": true,
    "update": true,
    "delete": true
  },
  "logs": {
    "read": true,
    "delete": true
  }
}
```

**Indexes**:
- `name_idx` (unique) - Fast role name lookups

**Permissions**:
- Read: Any authenticated user
- Write/Create/Delete: Admin users only

---

### 3. Attendees Collection (`attendees`)

**Purpose**: Store event attendee information with custom fields.

**Attributes**:
- `firstName` (string, required)
- `lastName` (string, required)
- `barcodeNumber` (string, required, unique)
- `photoUrl` (string, optional) - Cloudinary URL
- `credentialUrl` (string, optional) - Generated credential URL
- `credentialGeneratedAt` (datetime, optional)
- `customFieldValues` (string, JSON, optional) - Denormalized custom field data

**Custom Field Values JSON Structure**:
```json
{
  "customFieldId1": "value1",
  "customFieldId2": "value2"
}
```

**Indexes**:
- `barcodeNumber_idx` (unique) - Ensure barcode uniqueness
- `lastName_idx` (key) - Fast sorting by last name
- `firstName_idx` (key) - Fast sorting by first name

**Permissions**:
- Read: Users with read permission
- Write/Create/Delete: Users with appropriate permissions

---

### 4. Custom Fields Collection (`custom_fields`)

**Purpose**: Define dynamic form fields for attendee data collection.

**Attributes**:
- `eventSettingsId` (string, required) - Reference to event settings
- `fieldName` (string, required) - Display name
- `internalFieldName` (string, optional) - Internal identifier
- `fieldType` (string, required) - One of: text, number, date, select, checkbox
- `fieldOptions` (string, JSON, optional) - Options for select/checkbox fields
- `required` (boolean, default: false)
- `fieldOrder` (integer, required) - Display order (renamed from 'order' - reserved keyword)

**Field Options JSON Structure** (for select/checkbox):
```json
["Option 1", "Option 2", "Option 3"]
```

**Indexes**:
- `eventSettingsId_idx` (key) - Fast filtering by event
- `fieldOrder_idx` (key) - Fast sorting by order

**Permissions**:
- Read: Any authenticated user
- Write/Create/Delete: Admin users only

---

### 5. Event Settings Collection (`event_settings`)

**Purpose**: Store global event configuration.

**Attributes**:
- `eventName` (string, optional)
- `eventLogo` (string, optional) - Logo URL
- `barcodeType` (string, optional) - "numerical" or "alphanumerical"
- `barcodeLength` (integer, optional)
- `enableSwitchboard` (boolean, default: false)
- `switchboardApiKey` (string, optional)
- `switchboardTemplateId` (string, optional)
- `switchboardFieldMappings` (string, JSON, optional)

**Switchboard Field Mappings JSON Structure**:
```json
{
  "firstName": "field_1",
  "lastName": "field_2",
  "customField1": "field_3"
}
```

**Permissions**:
- Read: Any authenticated user
- Write: Admin users only

---

### 6. Logs Collection (`logs`)

**Purpose**: Audit trail of all user actions.

**Attributes**:
- `userId` (string, required) - User who performed action
- `attendeeId` (string, optional) - Related attendee (if applicable)
- `action` (string, required) - Action type (e.g., "ATTENDEE_CREATED")
- `details` (string, JSON, optional) - Additional action details

**Details JSON Structure**:
```json
{
  "changes": {
    "firstName": { "old": "John", "new": "Jane" }
  },
  "metadata": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Indexes**:
- `userId_idx` (key) - Fast filtering by user
- `attendeeId_idx` (key) - Fast filtering by attendee
- Automatic `$createdAt` index for time-based queries

**Permissions**:
- Read: Users with log read permission
- Create: Any authenticated user
- Delete: Users with log delete permission

---

### 7. Log Settings Collection (`log_settings`)

**Purpose**: Configure which actions should be logged.

**Attributes**:
- `logUserLogin` (boolean, default: true)
- `logUserLogout` (boolean, default: true)
- `logAttendeeCreate` (boolean, default: true)
- `logAttendeeUpdate` (boolean, default: true)
- `logAttendeeDelete` (boolean, default: true)
- `logCredentialGenerate` (boolean, default: true)

**Permissions**:
- Read: Any authenticated user
- Write: Admin users only

---

### 8. Invitations Collection (`invitations`)

**Purpose**: Manage user invitation tokens.

**Attributes**:
- `userId` (string, required) - Invited user ID (once accepted)
- `token` (string, required, unique) - Unique invitation token
- `expiresAt` (datetime, required) - Expiration timestamp
- `usedAt` (datetime, optional) - When invitation was used
- `createdBy` (string, required) - User who created invitation

**Indexes**:
- `token_idx` (unique) - Fast token validation
- `userId_idx` (key) - Fast user lookups
- `expiresAt_idx` (key) - Fast expiration checks

**Permissions**:
- Read: Creator and admin
- Write/Create: Users with invite permission
- Delete: Admin users only

## Environment Variables

All environment variables are configured in `.env.local`:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key

# Appwrite Database IDs
NEXT_PUBLIC_APPWRITE_DATABASE_ID=credentialstudio
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=users
NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID=roles
NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID=attendees
NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID=custom_fields
NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID=event_settings
NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID=logs
NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID=log_settings
```

## Important Notes

### Reserved Keywords
- `order` is a reserved keyword in Appwrite - use `fieldOrder` instead
- Always check [Appwrite's reserved keywords](https://appwrite.io/docs/advanced/platform/reserved-keywords) when creating attributes

### JSON Fields
- Store complex data as JSON strings
- Parse on read, stringify on write
- Validate JSON structure in application code

### Relationships
- Appwrite doesn't support traditional foreign keys
- Use document IDs to reference related documents
- Fetch related documents separately or use Appwrite's relationship attributes

### Permissions
- Collection-level permissions are set during creation
- Document-level permissions can be set per document
- Use role-based permissions for fine-grained access control

### Indexes
- Indexes improve query performance
- Unique indexes enforce uniqueness constraints
- Key indexes speed up filtering and sorting

## Maintenance

### Backup Strategy
- Use Appwrite's export functionality
- Regular database backups
- Test restore procedures

### Monitoring
- Monitor API usage in Appwrite Console
- Set up alerts for quota limits
- Review error logs regularly

### Updates
- Keep Appwrite SDK updated
- Review Appwrite changelog for breaking changes
- Test updates in development environment first
