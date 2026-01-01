---
title: "User Management Enhancement for Appwrite"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/users/", "src/components/UserForm.tsx"]
---

# User Management Enhancement for Appwrite

## Problem Statement

In the previous Supabase implementation, the application created users in both Supabase Auth and the application database simultaneously. With Appwrite, the architecture is different:

- **Appwrite Auth** is shared across multiple projects/databases
- **Application Database** is project-specific
- Users may already exist in Appwrite Auth but not in this application's database

We need to support **two workflows**:

1. **Create New User** (Current): Create a new Appwrite Auth user + database profile
2. **Link Existing User** (New): Link an existing Appwrite Auth user to the database

## Current Implementation

The current `src/pages/api/users/index.ts` POST endpoint:
- Creates a new Appwrite Auth user with temporary password
- Creates a user profile in the database
- Sends password recovery email
- Works well for brand new users

**Limitations:**
- Cannot add existing Appwrite Auth users to the system
- No way to grant access to users who already have Appwrite accounts
- Forces creation of duplicate accounts if user exists in Auth

## Proposed Solution

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Appwrite Auth System                      │
│  (Shared across all projects - may have existing users)     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Link
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Database (Project-Specific)         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Users Collection                                      │  │
│  │ - userId (links to Appwrite Auth)                    │  │
│  │ - email                                               │  │
│  │ - name                                                │  │
│  │ - roleId (application-specific role)                 │  │
│  │ - isInvited (true for created, false for linked)     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### New API Endpoints

#### 1. GET /api/users/available
**Purpose:** List Appwrite Auth users not yet linked to the database

**Request:**
```typescript
GET /api/users/available
```

**Response:**
```typescript
{
  users: [
    {
      $id: "auth_user_id_123",
      email: "john@example.com",
      name: "John Doe",
      emailVerification: true,
      status: true
    }
  ]
}
```

**Implementation:**
```typescript
// 1. Fetch all Appwrite Auth users (admin client)
const authUsers = await adminClient.users.list();

// 2. Fetch all database user profiles
const dbUsers = await databases.listDocuments(usersCollectionId);

// 3. Filter out users already in database
const linkedUserIds = new Set(dbUsers.documents.map(u => u.userId));
const availableUsers = authUsers.users.filter(u => !linkedUserIds.has(u.$id));

// 4. Return available users
return availableUsers;
```

#### 2. POST /api/users/link
**Purpose:** Link an existing Appwrite Auth user to the database

**Request:**
```typescript
POST /api/users/link
{
  userId: "auth_user_id_123",  // Appwrite Auth user ID
  roleId: "role_id_456",        // Application role to assign
  sendNotification: true        // Optional: send email notification
}
```

**Response:**
```typescript
{
  id: "db_profile_id",
  userId: "auth_user_id_123",
  email: "john@example.com",
  name: "John Doe",
  roleId: "role_id_456",
  isInvited: false,  // false indicates linked, not created
  role: {
    id: "role_id_456",
    name: "Event Manager",
    permissions: {...}
  }
}
```

**Implementation:**
```typescript
// 1. Validate Auth user exists
const authUser = await adminClient.users.get(userId);

// 2. Check if already linked
const existing = await databases.listDocuments(
  usersCollectionId,
  [Query.equal('userId', userId)]
);
if (existing.documents.length > 0) {
  throw new Error('User already linked');
}

// 3. Validate role
const role = await databases.getDocument(rolesCollectionId, roleId);

// 4. Create database profile
const profile = await databases.createDocument(
  usersCollectionId,
  ID.unique(),
  {
    userId: authUser.$id,
    email: authUser.email,
    name: authUser.name,
    roleId: roleId,
    isInvited: false  // Indicates linked, not created
  }
);

// 5. Send notification email (optional)
if (sendNotification) {
  await sendAccessGrantedEmail(authUser.email, role.name);
}

// 6. Log the action
await databases.createDocument(logsCollectionId, ID.unique(), {
  userId: currentUser.$id,
  action: 'link_user',
  details: JSON.stringify({
    linkedUserId: authUser.$id,
    email: authUser.email,
    roleId: roleId
  })
});
```

### Updated User Deletion

#### Enhanced DELETE /api/users/[id]

**Request:**
```typescript
DELETE /api/users/[id]
{
  deleteFromAuth: boolean  // true = delete from both, false = unlink only
}
```

**Behavior:**
- `deleteFromAuth: false` - Remove from database only (unlink)
- `deleteFromAuth: true` - Remove from both database and Appwrite Auth

**Use Cases:**
- **Unlink**: Remove user's access to this application but keep their Appwrite account
- **Full Delete**: Remove user completely from both systems

### UI Changes

#### User Management Page Enhancements

**Current:**
```
┌─────────────────────────────────────────────────────────┐
│ Users                                    [+ Create User] │
├─────────────────────────────────────────────────────────┤
│ Name          Email              Role         Actions    │
│ John Doe      john@example.com   Admin        [Edit][X] │
└─────────────────────────────────────────────────────────┘
```

**Enhanced:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Users                    [+ Create User] [🔗 Link Existing User] │
├─────────────────────────────────────────────────────────────────┤
│ Name          Email              Role         Type      Actions  │
│ John Doe      john@example.com   Admin        Created   [Edit][X]│
│ Jane Smith    jane@example.com   Manager      Linked    [Edit][X]│
└─────────────────────────────────────────────────────────────────┘
```

**Link Existing User Dialog:**
```
┌─────────────────────────────────────────────────────────┐
│ Link Existing Appwrite User                             │
├─────────────────────────────────────────────────────────┤
│ Select a user from Appwrite Auth to grant access:       │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ○ john@example.com (John Doe)                       │ │
│ │ ○ jane@example.com (Jane Smith)                     │ │
│ │ ○ bob@example.com (Bob Johnson)                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Assign Role:                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Select Role ▼]                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ☑ Send notification email                               │
│                                                          │
│                              [Cancel]  [Link User]       │
└─────────────────────────────────────────────────────────┘
```

**Delete User Dialog (Enhanced):**
```
┌─────────────────────────────────────────────────────────┐
│ Delete User                                              │
├─────────────────────────────────────────────────────────┤
│ Are you sure you want to delete john@example.com?       │
│                                                          │
│ Choose deletion type:                                    │
│                                                          │
│ ○ Unlink Only (Recommended)                             │
│   Remove access to this application only.               │
│   User keeps their Appwrite account.                    │
│                                                          │
│ ○ Full Delete                                            │
│   ⚠️  Delete from both application AND Appwrite Auth.   │
│   User will lose access to ALL Appwrite projects.       │
│                                                          │
│                              [Cancel]  [Delete]          │
└─────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Backend API (Task 12.5.1 & 12.5.2)
1. Create `/api/users/available` endpoint
2. Create `/api/users/link` endpoint
3. Update `/api/users/[id]` DELETE to support `deleteFromAuth` flag
4. Add comprehensive error handling
5. Add logging for all new operations

### Phase 2: Frontend UI (Task 12.5.3)
1. Add "Link Existing User" button to user management page
2. Create LinkUserDialog component
3. Fetch and display available Auth users
4. Implement role selection
5. Handle linking success/error states
6. Add visual indicator (badge/icon) for linked vs created users

### Phase 3: Enhanced Deletion (Task 12.5.4)
1. Update DeleteUserDialog with deletion type options
2. Add warnings for full delete
3. Update delete API call to include `deleteFromAuth` flag
4. Handle both deletion scenarios

### Phase 4: Testing
1. Test linking existing users
2. Test duplicate prevention
3. Test role assignment
4. Test unlink vs full delete
5. Test permission checks
6. Test notification emails

## Security Considerations

1. **Permission Checks**: Only users with `users.create` permission can link users
2. **Validation**: Verify Auth user exists before linking
3. **Duplicate Prevention**: Check if user already linked before creating profile
4. **Audit Trail**: Log all linking and unlinking actions
5. **Email Verification**: Consider requiring email verification before linking

## Benefits

1. **Flexibility**: Support both new and existing Appwrite users
2. **No Duplication**: Avoid creating duplicate Auth accounts
3. **Multi-Project**: Users can have one Appwrite account across multiple projects
4. **Granular Control**: Unlink users without deleting their Auth account
5. **Better UX**: Existing Appwrite users don't need new credentials

## Migration Notes

- Existing users created through the old workflow will have `isInvited: true`
- Newly linked users will have `isInvited: false`
- This distinction helps track user origin for analytics/support
- No data migration needed - existing users continue to work

## Future Enhancements

1. **Bulk Linking**: Link multiple users at once
2. **Auto-Linking**: Automatically link users on first login
3. **Role Templates**: Pre-defined role assignments based on email domain
4. **Invitation Codes**: Generate codes for users to self-link
5. **SSO Integration**: Link users from SSO providers
