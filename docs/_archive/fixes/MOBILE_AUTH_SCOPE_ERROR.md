# Mobile App: Authentication Scope Error on Auto-Sync

## Issue Summary

When the mobile app attempts to auto-sync every 5 minutes, it receives a 401 authentication error:

```
User (role: guests) missing scopes (["account"])
```

The sync request fails because the session token is either:
1. Expired
2. Invalid or corrupted
3. Missing required scopes
4. Not being sent correctly in the Authorization header

## Error Details

```
Endpoint: /api/mobile/sync/attendees?since=2025-12-06T23%3A14%3A07.836Z
Method: GET
Error: User (role: guests) missing scopes (["account"])
Error Type: general_unauthorized_scope
Error Code: 401
```

## Root Cause Analysis

### Why This Happens

1. **Session Token Expiration**: Appwrite session tokens have a limited lifetime. After expiration, the token becomes invalid.

2. **Missing Scopes**: The session token may have been created without the required "account" scope, which is needed to verify the user's identity.

3. **Incorrect Token Format**: The mobile app may not be sending the token correctly in the Authorization header.

4. **Token Corruption**: The token may be corrupted during storage or transmission.

## How the Web Backend Expects Authentication

The API middleware (`src/lib/apiMiddleware.ts`) supports two authentication methods:

### 1. Cookie-Based (Web Client)
```
Cookie: appwrite-session=<jwt_token>
```

### 2. Authorization Header (Mobile Client)
```
Authorization: Bearer <jwt_token>
```

The mobile app should use the **Authorization header** method.

## What Needs to be Fixed in the Mobile App

### 1. Session Token Management

The mobile app needs to:

**a) Store the session token securely**
- Use secure device storage (not plain text)
- Store the token expiration time
- Store the token creation time

**b) Check token expiration before each sync**
```typescript
// Pseudo-code
const tokenExpiration = getStoredTokenExpiration();
const now = Date.now();

if (now > tokenExpiration) {
  // Token expired, need to re-authenticate
  await reauthenticateUser();
}
```

**c) Implement token refresh logic**
- If token is expired, prompt user to log in again
- Or implement automatic token refresh if Appwrite supports it

### 2. Correct Authorization Header Format

When making requests to the sync endpoint, the mobile app must send:

```
GET /api/mobile/sync/attendees?since=2025-12-06T23:14:07.836Z
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Important**: The token must be prefixed with "Bearer " (with a space).

### 3. Handle 401 Responses

When receiving a 401 error, the mobile app should:

```typescript
// Pseudo-code
try {
  const response = await fetch('/api/mobile/sync/attendees', {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    }
  });
  
  if (response.status === 401) {
    // Token is invalid or expired
    // Clear stored token
    clearStoredSessionToken();
    
    // Prompt user to log in again
    navigateToLoginScreen();
    
    // Don't retry automatically
    return;
  }
  
  // Handle other responses...
} catch (error) {
  console.error('Sync failed:', error);
}
```

### 4. Session Token Creation

When the user logs in on the mobile app, the session token should be created with proper scopes:

```typescript
// Pseudo-code - This should happen during login
const session = await account.createSession(email, password);

// Store the session token
const token = session.secret; // or however Appwrite returns the JWT

// Store with expiration info
storeSessionToken({
  token: token,
  createdAt: Date.now(),
  expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
});
```

## Web Backend Status

The web backend is **correctly configured**:

### ✅ Session Client Setup
- `src/lib/appwrite.ts` - Correctly handles JWT from Authorization header
- Supports Bearer token format: `Authorization: Bearer <token>`
- Falls back to cookie if header not present

### ✅ API Middleware
- `src/lib/apiMiddleware.ts` - Validates authentication
- Fetches user profile and role
- Caches user profile for performance

### ✅ Mobile Sync Endpoints
- `GET /api/mobile/sync/attendees` - Requires valid authentication
- `GET /api/mobile/sync/profiles` - Requires valid authentication
- `POST /api/mobile/scan-logs` - Requires valid authentication

## Testing the Fix

After updating the mobile app:

1. **Log in on the mobile app**
   - Verify the session token is stored securely
   - Note the token expiration time

2. **Perform a manual sync**
   - Verify the Authorization header is sent correctly
   - Check that the sync succeeds

3. **Wait for auto-sync (5 minutes)**
   - Verify the sync completes without 401 errors
   - Check that attendee data is updated

4. **Let the app run for 24+ hours**
   - Verify the app handles token expiration gracefully
   - Verify the user is prompted to log in again if needed

## Related Code

### Web Backend Files
- `src/lib/appwrite.ts` - Session client configuration
- `src/lib/apiMiddleware.ts` - Authentication middleware
- `src/pages/api/mobile/sync/attendees.ts` - Sync endpoint

### Mobile App Files (Needs Update)
- Login screen - Session token creation
- Sync service - Token validation and refresh
- Network layer - Authorization header formatting
- Secure storage - Token persistence

## Debugging Tips

### Check Token Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                ^^^^^^ Must have "Bearer " prefix with space
```

### Check Token Expiration
```
// Decode JWT to check expiration
const decoded = jwt_decode(token);
console.log('Expires at:', new Date(decoded.exp * 1000));
```

### Check Appwrite Session
```
// Verify session is valid in Appwrite console
// Sessions > [Your Session] > Check expiration and scopes
```

## Immediate Action Items for Mobile App

### 1. Verify Token is Being Sent Correctly
Add logging to the mobile app to verify the Authorization header:

```typescript
// Before making sync request
console.log('Authorization Header:', `Bearer ${sessionToken.substring(0, 20)}...`);
console.log('Token Length:', sessionToken.length);
console.log('Token Starts With:', sessionToken.substring(0, 10));
```

### 2. Check Token Expiration
```typescript
// Decode and check token expiration
const decoded = jwt_decode(sessionToken);
const expiresAt = new Date(decoded.exp * 1000);
const now = new Date();

console.log('Token Expires At:', expiresAt);
console.log('Current Time:', now);
console.log('Token Expired:', now > expiresAt);
```

### 3. Implement Token Refresh on 401
```typescript
// In sync service
const response = await fetch('/api/mobile/sync/attendees', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
  }
});

if (response.status === 401) {
  // Token is invalid or expired
  console.error('Authentication failed - token may be expired');
  
  // Clear the invalid token
  await clearSessionToken();
  
  // Prompt user to log in again
  showLoginPrompt('Your session has expired. Please log in again.');
  
  // Don't retry - wait for user to log in
  return;
}
```

### 4. Verify Login Creates Valid Token
When user logs in, verify the token is created with proper scopes:

```typescript
// During login
try {
  const session = await account.createSession(email, password);
  
  // Verify session was created
  if (!session || !session.secret) {
    throw new Error('Session creation failed - no token returned');
  }
  
  // Store the token
  await storeSessionToken(session.secret);
  
  // Verify token can be used
  const user = await account.get(); // This requires "account" scope
  console.log('Login successful, user:', user.email);
  
} catch (error) {
  console.error('Login failed:', error);
  showError('Login failed. Please try again.');
}
```

## Notes

- The error mentions "guests" role, which suggests the user may not be properly authenticated
- The "account" scope is required for Appwrite to verify the user's identity
- Session tokens are different from API keys - they're user-specific and time-limited
- The mobile app should implement proper error handling for 401 responses
- Consider implementing automatic token refresh if Appwrite supports it
- The token may be corrupted during storage or transmission - verify it's stored as plain text
- Check that the Authorization header is being sent on every request (not just the first one)

## References

- Appwrite Documentation: https://appwrite.io/docs/authentication
- JWT Tokens: https://appwrite.io/docs/authentication#jwt
- Session Management: https://appwrite.io/docs/authentication#sessions
- JWT Decode Library: https://github.com/auth0/jwt-decode
