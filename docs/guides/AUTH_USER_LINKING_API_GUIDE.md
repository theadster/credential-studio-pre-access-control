# Auth User Linking API Guide

## Overview

The Auth User Linking system allows administrators to link existing Appwrite authentication users to the application, assign roles, and manage permissions. This guide documents all API endpoints related to user linking functionality.

## Authentication

All endpoints require authentication via Appwrite session. The session token should be included in cookies or headers as configured by the Appwrite SDK.

## Permissions

The following permissions are required for different operations:

- `users.read` - View and search auth users
- `users.create` - Link auth users to the application
- `users.update` - Update user roles and settings
- `users.delete` - Unlink users from the application

## API Endpoints

### 1. Search Auth Users

Search and list Appwrite authentication users with pagination and filtering.

**Endpoint:** `POST /api/users/search`

**Required Permission:** `users.read`

**Request Body:**
```json
{
  "searchTerm": "john@example.com",
  "page": 1,
  "limit": 25
}
```

**Parameters:**
- `searchTerm` (string, optional): Search by email or name
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 25, max: 100)

**Response (200 OK):**
```json
{
  "users": [
    {
      "$id": "user123",
      "email": "john@example.com",
      "name": "John Doe",
      "$createdAt": "2025-01-15T10:30:00.000Z",
      "emailVerification": true,
      "phoneVerification": false,
      "isLinked": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

**Error Responses:**
- `403 Forbidden` - User lacks `users.read` permission
- `500 Internal Server Error` - Server or Appwrite API error

---

### 2. Send Email Verification

Send an email verification link to an unverified auth user.

**Endpoint:** `POST /api/users/verify-email`

**Required Permission:** `users.create`

**Request Body:**
```json
{
  "userId": "user123"
}
```

**Parameters:**
- `userId` (string, required): Appwrite auth user ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid user ID or email already verified
- `403 Forbidden` - User lacks `users.create` permission
- `404 Not Found` - Auth user not found
- `429 Too Many Requests` - Rate limit exceeded (3 per user/hour, 20 per admin/hour)
- `500 Internal Server Error` - Failed to send verification email

**Rate Limiting:**
- Maximum 3 verification emails per user per hour
- Maximum 20 verification emails per admin per hour

---

### 3. Link Auth User to Application

Create a user profile linking an existing Appwrite auth user to the application with a specific role.

**Endpoint:** `POST /api/users`

**Required Permission:** `users.create`

**Request Body:**
```json
{
  "authUserId": "user123",
  "roleId": "role456",
  "addToTeam": true
}
```

**Parameters:**
- `authUserId` (string, required): Appwrite auth user ID to link
- `roleId` (string, required): Application role ID to assign
- `addToTeam` (boolean, optional): Add user to project team (default: false)

**Response (201 Created):**
```json
{
  "id": "profile789",
  "userId": "user123",
  "email": "john@example.com",
  "name": "John Doe",
  "roleId": "role456",
  "role": {
    "id": "role456",
    "name": "Event Manager",
    "permissions": ["attendees.read", "attendees.create"]
  },
  "createdAt": "2025-01-15T10:35:00.000Z",
  "teamMembership": {
    "status": "success",
    "teamId": "team123",
    "role": "admin"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid authUserId or roleId
- `403 Forbidden` - User lacks `users.create` permission
- `404 Not Found` - Auth user or role not found
- `409 Conflict` - User already linked to application
- `500 Internal Server Error` - Database or API error

**Notes:**
- Team membership is optional and non-blocking. If it fails, the user profile is still created
- All linking actions are logged for audit purposes

---

### 4. List Linked Users

Get a list of all users linked to the application.

**Endpoint:** `GET /api/users`

**Required Permission:** `users.read`

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 50)
- `roleId` (string, optional): Filter by role ID

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": "profile789",
      "userId": "user123",
      "email": "john@example.com",
      "name": "John Doe",
      "roleId": "role456",
      "role": {
        "id": "role456",
        "name": "Event Manager"
      },
      "isInvited": false,
      "createdAt": "2025-01-15T10:35:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25
  }
}
```

---

### 5. Update User Role

Update the role assigned to a linked user.

**Endpoint:** `PUT /api/users`

**Required Permission:** `users.update`

**Request Body:**
```json
{
  "id": "profile789",
  "roleId": "newRole123"
}
```

**Response (200 OK):**
```json
{
  "id": "profile789",
  "userId": "user123",
  "email": "john@example.com",
  "name": "John Doe",
  "roleId": "newRole123",
  "role": {
    "id": "newRole123",
    "name": "Registration Staff"
  },
  "updatedAt": "2025-01-15T11:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid profile ID or role ID
- `403 Forbidden` - User lacks `users.update` permission
- `404 Not Found` - User profile or role not found
- `500 Internal Server Error` - Database error

---

### 6. Unlink User from Application

Remove a user's access to the application by deleting their profile.

**Endpoint:** `DELETE /api/users`

**Required Permission:** `users.delete`

**Request Body:**
```json
{
  "id": "profile789",
  "deleteFromAuth": false,
  "removeFromTeam": true
}
```

**Parameters:**
- `id` (string, required): User profile ID to delete
- `deleteFromAuth` (boolean, optional): Also delete from Appwrite auth (default: false)
- `removeFromTeam` (boolean, optional): Remove from project team (default: true)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User unlinked successfully",
  "deletedFromAuth": false,
  "removedFromTeam": true
}
```

**Error Responses:**
- `400 Bad Request` - Invalid profile ID
- `403 Forbidden` - User lacks `users.delete` permission
- `404 Not Found` - User profile not found
- `500 Internal Server Error` - Database or API error

**Notes:**
- `deleteFromAuth` should only be used for cleanup purposes
- Team membership removal is best-effort and won't block the operation if it fails

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "User-friendly error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

- `USER_ALREADY_LINKED` - Auth user is already linked to the application
- `INVALID_AUTH_USER` - Auth user ID not found in Appwrite
- `INVALID_ROLE` - Role ID not found
- `PERMISSION_DENIED` - User lacks required permission
- `TEAM_MEMBERSHIP_FAILED` - Team membership creation failed (non-blocking)
- `DATABASE_ERROR` - Database operation failed
- `EMAIL_ALREADY_VERIFIED` - Email is already verified
- `VERIFICATION_RATE_LIMIT` - Too many verification emails sent
- `VERIFICATION_SEND_FAILED` - Failed to send verification email

---

## Rate Limiting

### Email Verification Rate Limits

- **Per User:** Maximum 3 verification emails per hour
- **Per Admin:** Maximum 20 verification emails per hour

Rate limits are tracked per user ID and per admin session.

### API Rate Limits

- **Search endpoint:** 100 requests per minute per user
- **Link endpoint:** 20 requests per minute per user

---

## Environment Variables

Configure these environment variables for the auth user linking system:

```bash
# Team membership (optional)
NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID=<team-id>
APPWRITE_TEAM_MEMBERSHIP_ENABLED=true

# Rate limiting
VERIFICATION_EMAIL_USER_LIMIT=3
VERIFICATION_EMAIL_ADMIN_LIMIT=20
VERIFICATION_EMAIL_WINDOW_HOURS=1
```

---

## Usage Examples

### Example 1: Search and Link a User

```javascript
// 1. Search for auth users
const searchResponse = await fetch('/api/users/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    searchTerm: 'john@example.com',
    page: 1,
    limit: 25
  })
});

const { users } = await searchResponse.json();
const authUser = users[0];

// 2. Link the user to the application
const linkResponse = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    authUserId: authUser.$id,
    roleId: 'role456',
    addToTeam: true
  })
});

const linkedUser = await linkResponse.json();
console.log('User linked:', linkedUser);
```

### Example 2: Send Verification Email

```javascript
const response = await fetch('/api/users/verify-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123'
  })
});

if (response.ok) {
  console.log('Verification email sent');
} else if (response.status === 429) {
  console.error('Rate limit exceeded');
}
```

### Example 3: Update User Role

```javascript
const response = await fetch('/api/users', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'profile789',
    roleId: 'newRole123'
  })
});

const updatedUser = await response.json();
console.log('Role updated:', updatedUser.role.name);
```

---

## Best Practices

1. **Always check permissions** before showing UI elements for linking/unlinking users
2. **Handle rate limits gracefully** by showing appropriate messages to users
3. **Validate auth user IDs** before attempting to link
4. **Use team membership optionally** - don't rely on it for critical functionality
5. **Log all user management actions** for audit and compliance
6. **Display clear error messages** to help administrators resolve issues
7. **Check email verification status** before linking users to ensure account security

---

## Troubleshooting

### User Already Linked Error

**Problem:** Getting 409 error when trying to link a user

**Solution:** Check if the user is already linked by searching for them first. The `isLinked` field in search results indicates if a user is already linked.

### Team Membership Fails

**Problem:** User is linked but team membership shows "failed" status

**Solution:** Team membership is optional and non-blocking. Verify:
- `APPWRITE_TEAM_MEMBERSHIP_ENABLED` is set to `true`
- `NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID` is configured correctly
- The team exists in Appwrite
- The admin has permission to manage team memberships

### Rate Limit Exceeded

**Problem:** Getting 429 error when sending verification emails

**Solution:** 
- Wait for the rate limit window to expire (1 hour)
- Adjust rate limits via environment variables if needed
- Ensure users aren't repeatedly requesting verification emails

### Permission Denied

**Problem:** Getting 403 error on API calls

**Solution:**
- Verify the user has the required permission in their role
- Check that the role is properly assigned to the user
- Ensure the permission system is configured correctly

---

## Security Considerations

1. **Authentication Required:** All endpoints require valid Appwrite session
2. **Permission Checks:** Every operation validates user permissions
3. **Input Validation:** All inputs are validated before processing
4. **Rate Limiting:** Prevents abuse of verification email system
5. **Audit Logging:** All user management actions are logged
6. **No Password Exposure:** Passwords are never returned in API responses

---

## Migration from Old System

If migrating from the old user creation system:

1. **Existing users continue to work** - No changes needed to existing user profiles
2. **Old `isInvited` field preserved** - Backward compatibility maintained
3. **New users use linking flow** - No new auth users created from application
4. **Gradual rollout supported** - Can enable for specific admin users first

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review error codes and messages
3. Check application logs for detailed error information
4. Verify environment variables are configured correctly
