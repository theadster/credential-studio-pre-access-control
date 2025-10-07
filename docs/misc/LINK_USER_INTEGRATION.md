# Link User Integration Guide

This guide explains how to integrate the new "Link Existing User" functionality into the dashboard.

## Overview

The Link User feature allows administrators to link existing Appwrite Auth users to the database without creating a new auth account. This is useful for users who have already signed up through Appwrite Auth but don't have a profile in the application database yet.

## Components Created

1. **LinkUserDialog** (`src/components/LinkUserDialog.tsx`) - Dialog component for linking existing users
2. **DeleteUserDialog** (`src/components/DeleteUserDialog.tsx`) - Dialog component for deleting/unlinking users with options
3. **Updated UserForm** (`src/components/UserForm.tsx`) - Now shows visual indicators for invited vs created users

## API Endpoints Created/Updated

1. **GET /api/users/available** - Lists all Appwrite Auth users not yet linked to database
2. **POST /api/users/link** - Links an existing Auth user to the database with a role
3. **DELETE /api/users** (updated) - Now supports `deleteFromAuth` flag to control deletion behavior

## Integration Steps for Dashboard

### 1. Import the New Components

Add these imports to `src/pages/dashboard.tsx`:

```typescript
import LinkUserDialog from '@/components/LinkUserDialog';
import DeleteUserDialog from '@/components/DeleteUserDialog';
```

### 2. Add State for New Dialogs

Add these state variables near the other dialog states (around line 200):

```typescript
const [showLinkUserDialog, setShowLinkUserDialog] = useState(false);
const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
const [userToDelete, setUserToDelete] = useState<User | null>(null);
```

### 3. Update the User Management Header

Find the section where the "Add User" button is rendered (around line 2070) and replace it with:

```typescript
{activeTab === "users" && hasPermission(currentUser?.role, 'users', 'create') && (
  <div className="flex items-center space-x-2">
    <Button onClick={() => setShowUserForm(true)}>
      <UserPlus className="mr-2 h-4 w-4" />
      Create New User
    </Button>
    <Button variant="outline" onClick={() => setShowLinkUserDialog(true)}>
      <Link className="mr-2 h-4 w-4" />
      Link Existing User
    </Button>
  </div>
)}
```

### 4. Add the New Dialog Components

Add these components near where the UserForm dialog is rendered (search for `<UserForm` in the file):

```typescript
<LinkUserDialog
  isOpen={showLinkUserDialog}
  onClose={() => setShowLinkUserDialog(false)}
  onLink={async () => {
    await refreshUsers();
  }}
  roles={roles}
/>

<DeleteUserDialog
  isOpen={showDeleteUserDialog}
  onClose={() => {
    setShowDeleteUserDialog(false);
    setUserToDelete(null);
  }}
  onConfirm={async (deleteFromAuth) => {
    if (!userToDelete) return;
    
    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: userToDelete.id,
          deleteFromAuth 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: data.message,
        });
        await refreshUsers();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to delete user",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user",
      });
    }
  }}
  user={userToDelete}
/>
```

### 5. Update User Table to Show Indicators and Use New Delete Dialog

In the users table rendering section, add visual indicators and update the delete button:

```typescript
<TableCell>
  <div className="flex items-center gap-2">
    <span>{user.email}</span>
    {user.isInvited && (
      <Badge variant="secondary" className="text-xs">
        Invited
      </Badge>
    )}
  </div>
</TableCell>
```

Update the delete button in the user actions dropdown/buttons:

```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => {
    setUserToDelete(user);
    setShowDeleteUserDialog(true);
  }}
>
  <Trash2 className="mr-2 h-4 w-4" />
  Delete
</Button>
```

## User Workflows

### Workflow 1: Create New User (Existing)
1. Admin clicks "Create New User"
2. Fills in email, name, role
3. System creates Appwrite Auth user with temporary password
4. System creates database profile
5. System sends password recovery email
6. User marked as `isInvited: true`

### Workflow 2: Link Existing User (New)
1. Admin clicks "Link Existing User"
2. System shows list of Auth users not in database
3. Admin selects user and assigns role
4. System creates database profile linked to existing Auth user
5. User marked as `isInvited: false`
6. Optional: Send notification email (to be implemented)

## Visual Indicators

- **Created Users**: Show with UserPlus icon and "Invited" badge
- **Linked Users**: Show with Link icon, no special badge
- **In UserForm**: Display appropriate icon and badge based on user type

## Testing

1. Create a user through Appwrite Auth console directly
2. Go to dashboard and click "Link Existing User"
3. Verify the user appears in the list
4. Select the user, assign a role, and link
5. Verify the user now appears in the users table
6. Verify the user can log in and access the system

## Notes

- Only users with 'users' 'create' permission can link users
- Linked users are immediately active (not in invited status)
- The email notification feature is a placeholder and needs email service integration
- All linked users are logged in the activity logs


## User Deletion Workflows

### Full Delete (Default)
1. Admin clicks delete on a user
2. Dialog shows two options: "Full Delete" (selected by default) and "Unlink Only"
3. Admin confirms "Full Delete"
4. System deletes user from Appwrite Auth
5. System deletes user profile from database
6. Action is logged with `deletedFromAuth: true`

### Unlink Only
1. Admin clicks delete on a user
2. Dialog shows two options
3. Admin selects "Unlink Only" and confirms
4. System deletes user profile from database only
5. Appwrite Auth account remains active
6. User can be re-linked later using "Link Existing User"
7. Action is logged with `deletedFromAuth: false`

## API Changes

### DELETE /api/users

**Request Body:**
```json
{
  "id": "user_document_id",
  "deleteFromAuth": true  // Optional, defaults to true
}
```

**Response:**
```json
{
  "message": "User deleted successfully from both database and authentication",
  "deletedFromAuth": true,
  "deletedFromDatabase": true
}
```

**Possible Messages:**
- `"User deleted successfully from both database and authentication"` - Full delete succeeded
- `"User deleted from database only (authentication deletion failed)"` - Database deleted, auth failed
- `"User unlinked from database (authentication account preserved)"` - Unlink only

## Migration Notes

- Existing delete functionality will continue to work (defaults to full delete)
- The `deleteFromAuth` parameter is optional and defaults to `true` for backward compatibility
- All deletion actions are logged with details about what was deleted
- Failed auth deletions don't prevent database deletion (graceful degradation)
