# Multi-Session Authentication Guide

## Overview

CredentialStudio implements a robust multi-session authentication system that automatically manages JWT token refresh, maintains sessions across page refreshes and browser tabs, and provides graceful handling of session expiration. This guide covers configuration, usage, error handling, and troubleshooting.

## Table of Contents

1. [Token Refresh Configuration](#token-refresh-configuration)
2. [API Middleware Usage](#api-middleware-usage)
3. [Error Handling Patterns](#error-handling-patterns)
4. [Multi-Session Behavior](#multi-session-behavior)
5. [Troubleshooting Guide](#troubleshooting-guide)

---

## Token Refresh Configuration

### Overview

The `TokenRefreshManager` automatically refreshes JWT tokens before they expire to maintain seamless user sessions. By default, tokens are refreshed 5 minutes before their 15-minute expiration time.

### Configuration Options

```typescript
interface TokenRefreshConfig {
  refreshBeforeExpiry: number; // milliseconds before expiry to refresh (default: 5 minutes)
  retryAttempts: number;       // number of retry attempts (default: 3)
  retryDelay: number;          // base delay between retries in ms (default: 1000)
}
```

### Default Configuration

```typescript
const defaultConfig = {
  refreshBeforeExpiry: 5 * 60 * 1000, // 5 minutes (300,000 ms)
  retryAttempts: 3,                    // 3 retry attempts
  retryDelay: 1000                     // 1 second base delay
};
```

### Custom Configuration

To customize token refresh behavior, modify the `TokenRefreshManager` initialization in `src/contexts/AuthContext.tsx`:

```typescript
const [tokenRefreshManager] = useState(() => 
  new TokenRefreshManagerImpl({
    refreshBeforeExpiry: 3 * 60 * 1000, // Refresh 3 minutes before expiry
    retryAttempts: 5,                    // Try 5 times before giving up
    retryDelay: 2000                     // Wait 2 seconds between retries
  })
);
```

### Retry Logic

The token refresh system uses **exponential backoff** for retries:

- **Attempt 1**: Wait 1 second (retryDelay × 2^0)
- **Attempt 2**: Wait 2 seconds (retryDelay × 2^1)
- **Attempt 3**: Wait 4 seconds (retryDelay × 2^2)

After all retry attempts fail, the user is logged out and redirected to the login page.

### Token Lifecycle

```
User Login
    ↓
JWT Created (expires in 15 minutes)
    ↓
Token Refresh Timer Started
    ↓
Wait 10 minutes (15 min - 5 min buffer)
    ↓
Automatic Token Refresh
    ↓
New JWT Created (expires in 15 minutes)
    ↓
Timer Restarted
    ↓
(Cycle continues until logout)
```

### Monitoring Token Refresh

Token refresh events are logged to the console:

```javascript
// Success
console.log('[TokenRefresh] Token refreshed successfully', {
  userId: 'user123',
  timestamp: '2025-10-06T10:30:00Z'
});

// Failure
console.error('[TokenRefresh] Token refresh failed', {
  attempt: 1,
  error: 'Network error',
  willRetry: true
});

// Final failure
console.error('[TokenRefresh] Token refresh failed after all retries', {
  totalAttempts: 3,
  lastError: 'Network timeout'
});
```

---

## API Middleware Usage

### Overview

The `withAuth` middleware provides consistent authentication and authorization for API routes. It validates JWT tokens, fetches user profiles, and handles errors uniformly.

### Basic Usage

Wrap your API route handler with `withAuth`:

```typescript
// src/pages/api/example/index.ts
import { withAuth } from '@/lib/apiMiddleware';
import type { AuthenticatedRequest } from '@/lib/apiMiddleware';
import type { NextApiResponse } from 'next';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Access authenticated user
  const { user, userProfile } = req;
  
  // Your API logic here
  return res.status(200).json({
    message: 'Success',
    userId: user.$id,
    userEmail: user.email,
    userRole: userProfile.role?.name
  });
}

export default withAuth(handler);
```

### What the Middleware Provides

The middleware automatically:

1. **Validates JWT Token**: Checks if the token is valid and not expired
2. **Fetches User Data**: Retrieves the authenticated user from Appwrite
3. **Fetches User Profile**: Gets the user's profile including role information
4. **Attaches to Request**: Makes `user` and `userProfile` available on the request object
5. **Handles Errors**: Returns consistent error responses for authentication failures

### Request Object Properties

After middleware execution, the request object includes:

```typescript
interface AuthenticatedRequest extends NextApiRequest {
  user: Models.User<Models.Preferences>;  // Appwrite user object
  userProfile: {
    $id: string;
    userId: string;
    email: string;
    name: string;
    roleId?: string;
    role?: {
      id: string;
      name: string;
      description: string;
      permissions: Record<string, boolean>;
    };
  };
}
```

### Accessing User Information

```typescript
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // User ID
  const userId = req.user.$id;
  
  // User email
  const email = req.user.email;
  
  // User name
  const name = req.user.name;
  
  // User role
  const roleName = req.userProfile.role?.name;
  
  // Check permissions
  const canManageUsers = req.userProfile.role?.permissions.manageUsers;
  
  if (!canManageUsers) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  // Your logic here
}
```

### Permission Checking Example

```typescript
import { withAuth } from '@/lib/apiMiddleware';
import type { AuthenticatedRequest } from '@/lib/apiMiddleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { userProfile } = req;
  
  // Check if user has required permission
  if (!userProfile.role?.permissions.manageAttendees) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to manage attendees'
    });
  }
  
  // Proceed with attendee management logic
  // ...
}

export default withAuth(handler);
```

### Method-Specific Handling

```typescript
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;
  
  switch (method) {
    case 'GET':
      // Anyone authenticated can read
      return handleGet(req, res);
      
    case 'POST':
      // Check create permission
      if (!req.userProfile.role?.permissions.createAttendees) {
        return res.status(403).json({ error: 'Cannot create attendees' });
      }
      return handlePost(req, res);
      
    case 'PUT':
      // Check update permission
      if (!req.userProfile.role?.permissions.updateAttendees) {
        return res.status(403).json({ error: 'Cannot update attendees' });
      }
      return handlePut(req, res);
      
    case 'DELETE':
      // Check delete permission
      if (!req.userProfile.role?.permissions.deleteAttendees) {
        return res.status(403).json({ error: 'Cannot delete attendees' });
      }
      return handleDelete(req, res);
      
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withAuth(handler);
```

### Routes Using Middleware

The following API routes currently use the `withAuth` middleware:

- `/api/profile/index.ts` - User profile management
- `/api/users/index.ts` - User management
- `/api/roles/[id].ts` - Role management
- `/api/roles/index.ts` - Role listing
- `/api/attendees/**` - All attendee routes
- `/api/custom-fields/**` - Custom field management
- `/api/event-settings/index.ts` - Event configuration
- `/api/invitations/**` - Invitation management
- `/api/logs/**` - Activity logging
- `/api/log-settings/**` - Log settings

---

## Error Handling Patterns

### Overview

The authentication system uses consistent error handling patterns across client and server code to provide clear feedback and enable proper error recovery.

### Error Response Format

All authentication errors follow this standardized format:

```typescript
interface ApiError {
  error: string;           // Human-readable error message
  code: number;            // HTTP status code
  type: string;            // Error type identifier
  tokenExpired?: boolean;  // Flag indicating token expiration
  details?: any;           // Additional context (dev only)
}
```

### Common Error Types

#### 1. Token Expired Error

**Server Response:**
```json
{
  "error": "Token expired",
  "code": 401,
  "type": "token_expired",
  "message": "Your session has expired. Please log in again.",
  "tokenExpired": true
}
```

**Client Handling:**
```typescript
// Automatic handling in AuthContext
if (error.tokenExpired) {
  // Show notification
  toast({
    variant: "destructive",
    title: "Session Expired",
    description: "Your session has expired. Please log in again."
  });
  
  // Redirect to login with return URL
  router.push(`/login?returnUrl=${encodeURIComponent(router.asPath)}`);
}
```

#### 2. Invalid Token Error

**Server Response:**
```json
{
  "error": "Unauthorized",
  "code": 401,
  "type": "user_jwt_invalid",
  "message": "Authentication required",
  "tokenExpired": true
}
```

#### 3. User Not Found Error

**Server Response:**
```json
{
  "error": "User profile not found",
  "code": 404,
  "type": "not_found",
  "message": "User profile not found"
}
```

#### 4. Permission Denied Error

**Server Response:**
```json
{
  "error": "Forbidden",
  "code": 403,
  "type": "forbidden",
  "message": "You do not have permission to perform this action"
}
```

### Client-Side Error Handling

#### API Call Error Handling

```typescript
try {
  const response = await fetch('/api/attendees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attendeeData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    // Check for token expiration
    if (error.tokenExpired) {
      // AuthContext will handle logout and redirect
      throw new Error('Session expired');
    }
    
    // Handle other errors
    throw new Error(error.message || 'Request failed');
  }
  
  const data = await response.json();
  return data;
  
} catch (error) {
  console.error('API call failed:', error);
  
  // Show user-friendly error
  toast({
    variant: "destructive",
    title: "Error",
    description: error.message || 'An unexpected error occurred'
  });
}
```

#### Token Refresh Error Handling

```typescript
// In AuthContext
tokenRefreshManager.onRefresh((success, error) => {
  if (!success) {
    console.error('[Auth] Token refresh failed:', error);
    
    // Show notification (only once)
    if (!hasShownExpirationNotification) {
      toast({
        variant: "destructive",
        title: "Session Expired",
        description: "Your session has expired. Please log in again."
      });
      hasShownExpirationNotification = true;
    }
    
    // Logout and redirect
    signOut();
  }
});
```

### Server-Side Error Handling

#### Using the Error Handler Utility

```typescript
import { handleApiError, isTokenExpiredError } from '@/lib/apiErrorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Your API logic
    const result = await someOperation();
    return res.status(200).json(result);
    
  } catch (error) {
    // Centralized error handling
    return handleApiError(error, res, {
      logError: true,
      includeStack: process.env.NODE_ENV === 'development'
    });
  }
}
```

#### Custom Error Handling

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Validate input
    if (!req.body.email) {
      return res.status(400).json({
        error: 'Validation error',
        code: 400,
        type: 'validation_error',
        message: 'Email is required'
      });
    }
    
    // Your logic
    const result = await createUser(req.body);
    return res.status(201).json(result);
    
  } catch (error: any) {
    // Check for specific error types
    if (error.code === 409) {
      return res.status(409).json({
        error: 'Conflict',
        code: 409,
        type: 'duplicate_email',
        message: 'A user with this email already exists'
      });
    }
    
    // Fall back to generic handler
    return handleApiError(error, res);
  }
}
```

### Error Logging

#### Client-Side Logging

```typescript
// Token refresh events
console.log('[TokenRefresh] Starting token refresh');
console.log('[TokenRefresh] Token refreshed successfully');
console.error('[TokenRefresh] Token refresh failed:', error);

// Session restoration
console.log('[Auth] Restoring session from cookie');
console.log('[Auth] Session restored successfully');
console.error('[Auth] Session restoration failed:', error);

// Authentication events
console.log('[Auth] User logged in:', userId);
console.log('[Auth] User logged out:', userId);
```

#### Server-Side Logging

```typescript
// In API routes
console.error('[API] Authentication failed:', {
  path: req.url,
  method: req.method,
  error: error.message,
  userId: req.user?.$id
});

// In middleware
console.error('[Middleware] Token validation failed:', {
  type: error.type,
  code: error.code,
  path: req.url
});
```

---

## Multi-Session Behavior

### Overview

CredentialStudio supports multiple concurrent sessions, allowing users to be logged in from different devices, browsers, or browser tabs simultaneously. Each session is independent and has its own JWT token lifecycle.

### How Multi-Session Works

#### Independent Sessions

Each login creates a new Appwrite session with its own:
- Session ID
- JWT token
- Expiration time
- Token refresh cycle

```
Device A (Chrome)          Device B (Firefox)         Device C (Mobile)
     ↓                           ↓                          ↓
Session A                   Session B                  Session C
JWT Token A                 JWT Token B                JWT Token C
Refresh Timer A             Refresh Timer B            Refresh Timer C
```

#### Session Isolation

- Refreshing a token in one session does NOT affect other sessions
- Logging out from one device does NOT log out other devices
- Each session maintains its own authentication state

### Multi-Tab Coordination

When multiple tabs are open in the same browser, they coordinate token refresh to prevent redundant requests.

#### Tab Coordination Mechanism

```typescript
// Uses BroadcastChannel API for inter-tab communication
const channel = new BroadcastChannel('token-refresh');

// Tab 1 requests refresh
channel.postMessage({ type: 'refresh-request' });

// Tab 2 (if already refreshing) denies
channel.postMessage({ type: 'refresh-denied' });

// Tab 1 proceeds with refresh
// After completion, notifies other tabs
channel.postMessage({ type: 'refresh-complete', success: true });
```

#### Leader Election

Only one tab refreshes the token at a time:

1. Tab initiates refresh and broadcasts request
2. Other tabs respond if they're already refreshing
3. If no denial received within 100ms, tab proceeds
4. After refresh, all tabs are notified of the new token

### Session Lifecycle

#### Creating a Session

```typescript
// User logs in
const session = await account.createEmailPasswordSession(email, password);

// JWT created
const jwt = await account.createJWT();

// Token refresh started
tokenRefreshManager.start(jwtExpiry);
```

#### Maintaining a Session

```typescript
// Automatic refresh every 10 minutes
// (5 minutes before 15-minute expiration)

Timer triggers → Request new JWT → Update cookie → Restart timer
```

#### Ending a Session

```typescript
// User logs out from current device
await account.deleteSession('current');

// Only current session is terminated
// Other sessions remain active
```

### Multi-Device Scenarios

#### Scenario 1: Login from Multiple Devices

```
1. User logs in from Desktop (Session A created)
2. User logs in from Mobile (Session B created)
3. Both sessions are active and independent
4. Each device refreshes its own token
5. User can work on both devices simultaneously
```

#### Scenario 2: Logout from One Device

```
1. User has active sessions on Desktop and Mobile
2. User logs out from Desktop
3. Desktop session (Session A) is terminated
4. Mobile session (Session B) remains active
5. User can continue working on Mobile
```

#### Scenario 3: Token Expiration on One Device

```
1. User has active sessions on Desktop and Mobile
2. Desktop loses network connection
3. Desktop token refresh fails after retries
4. Desktop session expires and user is logged out
5. Mobile session continues working normally
```

### Limitations and Considerations

#### Current Limitations

1. **No Session Management UI**: Users cannot view or manage their active sessions
2. **No Remote Logout**: Cannot log out other devices remotely
3. **No Session Limit**: Unlimited concurrent sessions allowed
4. **No Device Tracking**: Cannot see which devices have active sessions

#### Security Considerations

1. **Password Change**: Changing password does NOT invalidate existing sessions (Appwrite limitation)
2. **Suspicious Activity**: No automatic detection of unusual login patterns
3. **Session Timeout**: Sessions expire after 15 minutes of inactivity (JWT expiration)

#### Performance Considerations

1. **Token Refresh Frequency**: Each session refreshes independently (every 10 minutes)
2. **API Load**: Multiple sessions = multiple token refresh requests
3. **Storage**: Each session stores its own cookie

### Best Practices

#### For Users

1. **Log Out When Done**: Always log out when finished, especially on shared devices
2. **Monitor Active Sessions**: Be aware of where you're logged in
3. **Use Strong Passwords**: Protect your account from unauthorized access

#### For Developers

1. **Session Validation**: Always validate tokens on the server side
2. **Error Handling**: Handle token expiration gracefully
3. **Logging**: Log authentication events for security monitoring
4. **Rate Limiting**: Consider rate limiting token refresh requests

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: "Session Expired" Error After Short Time

**Symptoms:**
- User gets logged out after 10-15 minutes
- "Session expired" notification appears
- Redirected to login page

**Possible Causes:**
1. Token refresh is not starting properly
2. Token refresh is failing silently
3. Network issues preventing refresh

**Solutions:**

1. **Check Console Logs:**
```javascript
// Look for these messages in browser console
[TokenRefresh] Starting token refresh
[TokenRefresh] Token refreshed successfully
```

2. **Verify Token Refresh is Running:**
```typescript
// In AuthContext, check if timer is started
console.log('Token refresh manager started:', tokenRefreshManager.isRefreshing());
```

3. **Check Network Tab:**
- Look for requests to Appwrite JWT endpoint
- Verify requests are succeeding (200 status)
- Check for network errors or timeouts

4. **Verify Appwrite Configuration:**
```typescript
// Check environment variables
console.log('Appwrite endpoint:', process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
console.log('Appwrite project:', process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
```

#### Issue 2: Multiple "Session Expired" Notifications

**Symptoms:**
- Multiple toast notifications appear
- Notification spam when session expires
- User sees repeated error messages

**Cause:**
Multiple API calls failing simultaneously when token expires

**Solution:**

The system includes notification deduplication:

```typescript
let hasShownExpirationNotification = false;

tokenRefreshManager.onRefresh((success, error) => {
  if (!success && !hasShownExpirationNotification) {
    toast({
      variant: "destructive",
      title: "Session Expired",
      description: "Your session has expired. Please log in again."
    });
    hasShownExpirationNotification = true;
  }
});
```

If still seeing multiple notifications, check that this flag is properly implemented.

#### Issue 3: Session Not Restored After Page Refresh

**Symptoms:**
- User is logged out after refreshing page
- Session doesn't persist across page loads
- Have to log in again after every refresh

**Possible Causes:**
1. Cookie not being set properly
2. Session validation failing
3. JWT creation failing during restoration

**Solutions:**

1. **Check Cookie Storage:**
```javascript
// In browser console
document.cookie.split(';').find(c => c.includes('appwrite-session'))
```

2. **Verify Session Restoration Logic:**
```typescript
// Check AuthContext initialization
useEffect(() => {
  const fetchSession = async () => {
    try {
      const currentUser = await account.get();
      // Should succeed if session is valid
      console.log('Session restored for user:', currentUser.$id);
    } catch (error) {
      console.error('Session restoration failed:', error);
    }
  };
  fetchSession();
}, []);
```

3. **Check for Cookie Issues:**
- Verify `SameSite` attribute is set correctly
- Check if cookies are being blocked by browser settings
- Ensure domain matches between cookie and application

#### Issue 4: Token Refresh Fails with Network Error

**Symptoms:**
- Console shows "Token refresh failed" errors
- User gets logged out unexpectedly
- Network tab shows failed requests

**Possible Causes:**
1. Network connectivity issues
2. Appwrite service unavailable
3. CORS configuration problems
4. Firewall blocking requests

**Solutions:**

1. **Check Network Connectivity:**
```bash
# Test Appwrite endpoint
curl https://cloud.appwrite.io/v1/health

# Check if endpoint is reachable
ping cloud.appwrite.io
```

2. **Verify Appwrite Status:**
- Check Appwrite status page
- Verify project is active
- Check API key validity

3. **Review CORS Settings:**
```typescript
// Verify Appwrite project settings
// Ensure your domain is in allowed origins
```

4. **Check Retry Logic:**
```typescript
// Token refresh should retry 3 times
// Check console for retry attempts
[TokenRefresh] Token refresh attempt 1 failed
[TokenRefresh] Token refresh attempt 2 failed
[TokenRefresh] Token refresh attempt 3 failed
```

#### Issue 5: API Returns 401 Despite Valid Session

**Symptoms:**
- API calls return 401 Unauthorized
- User appears logged in on client
- Session seems valid but API rejects requests

**Possible Causes:**
1. JWT token not being sent with requests
2. Token format incorrect
3. Server-side validation failing
4. Cookie not accessible to API routes

**Solutions:**

1. **Verify Token in Request:**
```javascript
// Check Network tab in DevTools
// Look for Cookie header in API requests
Cookie: appwrite-session=eyJhbGc...
```

2. **Check API Middleware:**
```typescript
// Verify withAuth middleware is applied
export default withAuth(handler);
```

3. **Test Token Validation:**
```typescript
// In API route, log token validation
try {
  const user = await account.get();
  console.log('Token valid for user:', user.$id);
} catch (error) {
  console.error('Token validation failed:', error);
}
```

4. **Verify Cookie Path:**
```typescript
// Cookie should be accessible to all API routes
document.cookie = `appwrite-session=${jwt}; path=/; ...`;
```

#### Issue 6: Multiple Tabs Not Coordinating

**Symptoms:**
- Multiple token refresh requests from different tabs
- Redundant API calls
- Performance issues with many tabs open

**Possible Causes:**
1. BroadcastChannel not supported
2. Tab coordinator not initialized
3. Message handling not working

**Solutions:**

1. **Check Browser Support:**
```javascript
// Check if BroadcastChannel is available
if ('BroadcastChannel' in window) {
  console.log('BroadcastChannel supported');
} else {
  console.log('BroadcastChannel not supported, using fallback');
}
```

2. **Verify Tab Coordinator:**
```typescript
// Check if coordinator is initialized
console.log('Tab coordinator active:', tabCoordinator !== null);
```

3. **Monitor Channel Messages:**
```typescript
// Add logging to see messages
channel.onmessage = (event) => {
  console.log('Received message:', event.data);
};
```

4. **Fallback to localStorage:**
If BroadcastChannel is not supported, implement localStorage fallback:
```typescript
// Listen for storage events
window.addEventListener('storage', (event) => {
  if (event.key === 'token-refresh') {
    // Handle refresh event
  }
});
```

### Debugging Tools

#### Enable Verbose Logging

Add this to your `.env.local`:
```bash
NEXT_PUBLIC_DEBUG_AUTH=true
```

Then in your code:
```typescript
const DEBUG = process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true';

if (DEBUG) {
  console.log('[Auth Debug]', message, data);
}
```

#### Monitor Token Expiration

```typescript
// Add to AuthContext
useEffect(() => {
  const interval = setInterval(() => {
    const timeUntilRefresh = tokenRefreshManager.getTimeUntilRefresh();
    console.log('Time until next refresh:', timeUntilRefresh, 'ms');
  }, 60000); // Check every minute
  
  return () => clearInterval(interval);
}, []);
```

#### Test Token Refresh Manually

```typescript
// In browser console
// Access AuthContext
const { refreshToken } = useAuth();

// Manually trigger refresh
refreshToken().then(success => {
  console.log('Manual refresh:', success ? 'SUCCESS' : 'FAILED');
});
```

### Getting Help

If you continue to experience issues:

1. **Check Console Logs**: Look for error messages and stack traces
2. **Review Network Tab**: Inspect API requests and responses
3. **Verify Configuration**: Double-check environment variables
4. **Test in Incognito**: Rule out browser extension interference
5. **Check Appwrite Dashboard**: Verify project settings and logs
6. **Review Recent Changes**: Check if recent code changes affected auth

### Performance Monitoring

Monitor these metrics to ensure healthy authentication:

```typescript
// Token refresh success rate
const successRate = successfulRefreshes / totalRefreshAttempts;

// Average refresh time
const avgRefreshTime = totalRefreshTime / successfulRefreshes;

// Session restoration success rate
const restorationRate = successfulRestorations / totalRestorations;
```

Target metrics:
- Token refresh success rate: > 99%
- Average refresh time: < 500ms
- Session restoration success rate: > 95%

---

## Additional Resources

### Related Documentation

- [Appwrite Authentication Docs](https://appwrite.io/docs/authentication)
- [Appwrite JWT Docs](https://appwrite.io/docs/authentication-security#jwt)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

### Code References

- `src/lib/tokenRefresh.ts` - Token refresh manager implementation
- `src/lib/tabCoordinator.ts` - Multi-tab coordination
- `src/lib/apiMiddleware.ts` - API authentication middleware
- `src/lib/apiErrorHandler.ts` - Error handling utilities
- `src/contexts/AuthContext.tsx` - Authentication context

### Support

For additional support:
1. Check the troubleshooting guide above
2. Review console logs and network requests
3. Consult Appwrite documentation
4. Contact your development team

---

**Last Updated**: October 6, 2025  
**Version**: 1.0.0
