# Session Timeout Improvements

## Issue
Users were experiencing automatic redirects to the login page, which felt random and disruptive. This was caused by JWT token refresh failures triggering immediate logout.

## Root Cause
The authentication system was configured to:
1. JWT tokens expire after 15 minutes (Appwrite default, cannot be changed)
2. Token refresh happens at 10 minutes (5 minutes before expiry)
3. If token refresh failed (due to network issues, etc.), the system immediately logged out the user
4. Only 3 retry attempts with 1-second delays between retries

This aggressive logout behavior meant that temporary network issues or brief Appwrite service interruptions would force users to log in again, even if their session was still valid.

## Changes Made

### 1. Increased Retry Attempts and Delays
**File:** `src/lib/tokenRefresh.ts`

**Changes:**
- Increased retry attempts from **3 to 5**
- Increased retry delay from **1000ms to 2000ms**

**Rationale:**
- More retry attempts give the system better resilience against temporary network issues
- Longer delays allow more time for network recovery between attempts
- With exponential backoff, this provides: 2s, 4s, 8s, 16s delays = ~30 seconds total retry window

### 2. Removed Auto-Logout on Refresh Failure
**File:** `src/contexts/AuthContext.tsx`

**Changes:**
- Removed `signOut()` call when token refresh fails
- Changed notification from "Session Expired" to "Session Warning"
- Updated message to inform users they may need to log in if they encounter errors
- Increased notification duration to 10 seconds for better visibility

**Rationale:**
- Users can continue working even if token refresh fails
- They'll only be prompted to log in when an actual API call fails (which will happen naturally when the JWT expires)
- This provides a better user experience - no unexpected logouts
- Users get a warning but aren't forcibly logged out

## How It Works Now

### Normal Flow:
1. User logs in → JWT created (expires in 15 minutes)
2. At 10 minutes → Token refresh triggered automatically
3. New JWT created → User continues working seamlessly
4. Process repeats every 10 minutes

### Failure Flow (Improved):
1. User logs in → JWT created (expires in 15 minutes)
2. At 10 minutes → Token refresh triggered
3. Refresh fails → System retries 5 times with exponential backoff (up to ~30 seconds)
4. All retries fail → User sees warning notification but stays logged in
5. User continues working with existing (but expiring) JWT
6. When JWT expires and API call fails → User is prompted to log in at that point

### Benefits:
- **Better resilience**: 5 retries with longer delays handle temporary network issues
- **Less disruptive**: Users aren't logged out unless absolutely necessary
- **Clearer communication**: Warning message explains what's happening
- **Natural logout**: Users only log out when they actually try to do something that requires authentication

## Technical Details

### Token Refresh Configuration
```typescript
{
  refreshBeforeExpiry: 5 * 60 * 1000, // 5 minutes before expiry
  retryAttempts: 5,                   // 5 retry attempts
  retryDelay: 2000,                   // 2 second base delay
}
```

### Retry Timeline (with exponential backoff):
- Attempt 1: Immediate
- Attempt 2: After 2 seconds
- Attempt 3: After 4 seconds (6s total)
- Attempt 4: After 8 seconds (14s total)
- Attempt 5: After 16 seconds (30s total)

### JWT Expiration
- **JWT lifetime**: 15 minutes (Appwrite default, cannot be changed from client)
- **Refresh trigger**: 10 minutes (5 minutes before expiry)
- **Session cookie**: 7 days (but JWT is refreshed every 10 minutes)

## Important Notes

### About JWT Expiration Time
The 15-minute JWT expiration is controlled by **Appwrite's backend** and cannot be changed from the application code. This is a security feature. However, the automatic refresh mechanism means users effectively have an unlimited session as long as they're active and the refresh succeeds.

### When Users Will Still Be Logged Out
Users will still be logged out in these scenarios:
1. They manually click "Sign Out"
2. They're inactive for more than 15 minutes (JWT expires and no refresh happens)
3. Their session is deleted on the server side
4. They clear their cookies/browser data

### Cross-Tab Behavior
The tab coordinator ensures that only one tab refreshes the token at a time, preventing redundant API calls. If refresh fails in one tab, all tabs receive the warning but stay logged in.

## Testing Recommendations

To verify these changes work correctly:

1. **Test normal refresh**: Stay logged in for 15+ minutes and verify seamless token refresh
2. **Test network interruption**: Disconnect network briefly during refresh window and verify retry behavior
3. **Test complete failure**: Block Appwrite API and verify warning message appears but user stays logged in
4. **Test multi-tab**: Open multiple tabs and verify coordinated refresh behavior
5. **Test actual expiration**: Wait 15+ minutes without activity and verify logout happens when making API call

## Future Improvements

Potential enhancements to consider:
1. Add a "Refresh Session" button in the warning notification
2. Implement automatic retry when network comes back online
3. Add session activity tracking to extend sessions for active users
4. Implement graceful degradation for offline mode

## Files Modified

- `src/lib/tokenRefresh.ts` - Increased retry attempts and delays
- `src/contexts/AuthContext.tsx` - Removed auto-logout on refresh failure

## Date
January 7, 2025
