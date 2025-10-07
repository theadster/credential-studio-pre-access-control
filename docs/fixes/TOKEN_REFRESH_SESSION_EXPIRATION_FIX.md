# Token Refresh Session Expiration Fix

## Issue
Users were encountering a "Token refresh failed after all retries" error when trying to save data (e.g., adding photos or updating user records). This error occurred when:

1. The JWT token expired (after 15 minutes)
2. The token refresh mechanism attempted to create a new JWT
3. The underlying Appwrite session had also expired or become invalid
4. The system kept retrying without checking if the session was still valid

## Root Cause
The token refresh mechanism in `src/lib/tokenRefresh.ts` was attempting to create new JWTs without first verifying that the underlying Appwrite session was still valid. When the session expired, it would:

- Retry multiple times (5 attempts with exponential backoff)
- Show generic "Token refresh failed" errors
- Not properly detect that the session itself had expired
- Keep the user "logged in" in the UI while their session was actually dead

## Solution

### 1. Enhanced Token Refresh Logic (`src/lib/tokenRefresh.ts`)

Added session validation before attempting JWT refresh:

```typescript
// First verify the session is still valid
try {
  await account.get();
} catch (sessionError: any) {
  // If session is invalid, don't retry - fail immediately
  if (sessionError.code === 401 || sessionError.type === 'user_unauthorized') {
    // Stop the timer and clear context
    this.stop();
    this.clearUserContext();
    
    const error = new Error('Session expired. Please log in again.');
    (error as any).code = 401;
    (error as any).type = 'session_expired';
    this.notifyCallbacks(false, error);
    this.isRefreshingFlag = false;
    return false;
  }
  throw sessionError;
}
```

**Key improvements:**
- Validates session before attempting JWT refresh
- Detects authentication errors (401, user_unauthorized) and stops retrying immediately
- Properly propagates session expiration errors to callbacks
- Tracks the last error for better debugging

### 2. Improved Session Expiration Handling (`src/contexts/AuthContext.tsx`)

Enhanced the token refresh callback to distinguish between temporary failures and session expiration:

```typescript
const handleRefreshResult = (success: boolean, error?: Error) => {
  if (!success) {
    // Check if this is a session expiration error
    const isSessionExpired = error && (
      (error as any).code === 401 || 
      (error as any).type === 'session_expired' ||
      (error as any).type === 'user_unauthorized' ||
      error.message.toLowerCase().includes('session expired')
    );
    
    if (isSessionExpired) {
      // Session is truly expired - force logout
      // Clear state, show notification, redirect to login
    } else {
      // Network or temporary error - show warning but don't logout
    }
  }
};
```

**Key improvements:**
- Distinguishes between session expiration and temporary network errors
- Forces logout and redirects to login when session expires
- Preserves the current URL for post-login redirect
- Shows appropriate notifications based on error type

### 3. New Token Refresh Hook (`src/hooks/useTokenRefresh.ts`)

Created a reusable hook for components that need to ensure fresh tokens before API calls:

```typescript
export function useTokenRefresh() {
  const { refreshToken, isTokenRefreshing, user } = useAuth();
  
  const ensureFreshToken = async (): Promise<boolean> => {
    // Refresh token if needed
    // Handle errors and redirect to login if session expired
  };
  
  const withFreshToken = async <T>(apiCall: () => Promise<T>): Promise<T> => {
    // Wrap API calls with automatic token refresh
  };
  
  return { ensureFreshToken, withFreshToken, isRefreshing };
}
```

**Usage example:**
```typescript
const { withFreshToken } = useTokenRefresh();

const handleSave = async () => {
  try {
    await withFreshToken(async () => {
      const response = await fetch('/api/users', {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      return response.json();
    });
  } catch (error) {
    // Handle error
  }
};
```

## Benefits

1. **Better Error Detection**: Immediately detects when the session has expired vs. temporary network issues
2. **Improved User Experience**: Users are promptly redirected to login when their session expires instead of seeing cryptic errors
3. **Reduced Retry Spam**: Stops retrying immediately when session is invalid instead of exhausting all retry attempts
4. **Clearer Notifications**: Shows appropriate messages based on whether it's a session expiration or temporary error
5. **URL Preservation**: Saves the current URL so users can return to what they were doing after logging back in
6. **Reusable Pattern**: The new hook provides a clean way for any component to ensure fresh tokens before API calls

## Testing

To test the fix:

1. **Session Expiration Test**:
   - Log in to the application
   - Wait for the session to expire (or manually delete the session in Appwrite)
   - Try to save user data or perform any action
   - Expected: User is redirected to login with "Session Expired" message

2. **Token Refresh Test**:
   - Log in to the application
   - Wait ~10 minutes (token refresh should happen automatically)
   - Perform actions - should work seamlessly
   - Check console logs for successful token refresh

3. **Network Error Test**:
   - Log in to the application
   - Disconnect network temporarily
   - Wait for token refresh to trigger
   - Expected: Warning message but user stays logged in
   - Reconnect network - next refresh should succeed

## Files Modified

- `src/lib/tokenRefresh.ts` - Enhanced token refresh logic with session validation
- `src/contexts/AuthContext.tsx` - Improved session expiration handling
- `src/hooks/useTokenRefresh.ts` - New hook for ensuring fresh tokens (created)

## Related Documentation

- [Session Timeout Improvements](./SESSION_TIMEOUT_IMPROVEMENTS.md)
- [Multi-Session Authentication](../.kiro/specs/multi-session-authentication/)
- [Authentication Guide](../.kiro/specs/multi-session-authentication/AUTHENTICATION_GUIDE.md)

## Future Improvements

1. **Proactive Token Refresh**: Refresh tokens before they expire when user is actively using the app
2. **Session Extension**: Extend session lifetime on user activity
3. **Better Offline Handling**: Queue API calls when offline and retry when connection is restored
4. **Session Monitoring**: Add a visual indicator showing session status and time until expiration
