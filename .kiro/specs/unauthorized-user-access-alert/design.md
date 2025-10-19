# Design Document

## Overview

This feature enhances the user experience for authenticated Appwrite users who lack team membership for a specific event. When such users attempt to access CredentialStudio, they currently encounter generic 401 errors without clear guidance. This design implements an informative SweetAlert popup that explains the situation and directs users to contact the event manager for access.

The solution intercepts "user_unauthorized" errors during the login flow and presents a user-friendly modal before logging the user out and redirecting them to the login page.

## Architecture

### High-Level Flow

```
User Login → Appwrite Auth Success → API Call (e.g., /api/profile) → 
Team Membership Check Fails → 401 user_unauthorized Error → 
Detect Error in AuthContext → Show SweetAlert Modal → 
User Dismisses → Clear Session → Redirect to Login
```

### Component Interaction

1. **Login Page** (`src/pages/login.tsx`): Initiates authentication
2. **AuthContext** (`src/contexts/AuthContext.tsx`): Handles authentication flow and error detection
3. **API Middleware** (`src/lib/apiMiddleware.ts`): Returns 401 errors for unauthorized users
4. **SweetAlert Hook** (`src/hooks/useSweetAlert.ts`): Displays the informative modal
5. **API Error Handler** (`src/lib/apiErrorHandler.ts`): Provides error type detection utilities

## Components and Interfaces

### 1. Error Detection in AuthContext

**Location**: `src/contexts/AuthContext.tsx` - `signIn` method

**Current Behavior**:
- After successful Appwrite authentication, the `signIn` method creates a JWT and attempts to fetch the user profile
- If the user is not a team member, subsequent API calls (like fetching user profile) fail with 401 "user_unauthorized" errors
- These errors are currently caught generically and shown as login failures

**New Behavior**:
- Detect "user_unauthorized" errors specifically after successful authentication
- Distinguish between authentication failures (invalid credentials) and authorization failures (no team access)
- Show a specialized SweetAlert modal for authorization failures
- Clean up session and redirect to login page

**Implementation Details**:

```typescript
// In signIn method, after JWT creation and before profile fetch
try {
  // Fetch user profile
  const profile = await fetchUserProfile(currentUser.$id);
  setUserProfile(profile);
  
  // ... rest of existing code
} catch (error: any) {
  // Check if this is a team membership issue
  if (isUnauthorizedTeamError(error)) {
    // Show specialized alert for team access
    await showUnauthorizedTeamAlert(currentUser.email);
    
    // Clean up session
    await cleanupUnauthorizedSession();
    
    // Redirect to login
    router.push('/login');
    return; // Exit early, don't throw
  }
  
  // Handle other errors normally
  throw error;
}
```

### 2. Error Type Detection Utility

**Location**: `src/lib/apiErrorHandler.ts` (new function)

**Purpose**: Provide a reliable way to detect "user_unauthorized" errors that indicate team membership issues

**Function Signature**:

```typescript
/**
 * Check if an error is related to team membership/authorization
 * (user is authenticated but not authorized for this event)
 * 
 * @param error - The error object to check
 * @returns true if the error indicates missing team membership
 */
export function isUnauthorizedTeamError(error: any): boolean {
  if (!error) return false;
  
  // Check for specific Appwrite error type
  if (error.type === 'user_unauthorized' && error.code === 401) {
    return true;
  }
  
  // Check for specific error message
  const message = error.message?.toLowerCase() || '';
  if (message.includes('not authorized to perform the requested action')) {
    return true;
  }
  
  return false;
}
```

### 3. SweetAlert Modal Display

**Location**: `src/contexts/AuthContext.tsx` (new helper function)

**Purpose**: Display an informative, user-friendly modal explaining the team access issue

**Function Signature**:

```typescript
/**
 * Show alert for users who are authenticated but not authorized
 * @param userEmail - The authenticated user's email address
 */
const showUnauthorizedTeamAlert = async (userEmail: string): Promise<void> => {
  await showAlert({
    title: 'Access Not Granted',
    html: `
      <div style="text-align: left;">
        <p><strong>You are signed in as:</strong> ${userEmail}</p>
        <br/>
        <p>However, your account does not have access to this event's database.</p>
        <br/>
        <p><strong>To gain access:</strong></p>
        <ul style="margin-left: 20px;">
          <li>Contact the event manager or administrator</li>
          <li>Request to be added to the event team</li>
          <li>Once added, you'll be able to log in successfully</li>
        </ul>
        <br/>
        <p><em>When you click OK, you'll be returned to the login page.</em></p>
      </div>
    `,
    icon: 'info',
    confirmButtonText: 'OK, I Understand'
  });
};
```

**Design Rationale**:
- **Icon**: "info" (blue) rather than "error" (red) - this is informational, not a failure
- **Title**: "Access Not Granted" - clear and non-technical
- **Content**: 
  - Shows the user's email to confirm their identity
  - Explains the situation in plain language
  - Provides clear next steps
  - Uses HTML for better formatting and readability
  - **Informs user they'll be returned to login page** - sets expectation for what happens next
- **Button**: "OK, I Understand" - acknowledges understanding rather than just dismissing
- **Modal Behavior**: Uses `allowOutsideClick: false` and `allowEscapeKey: false` (from alert method) to ensure user reads the message

### 4. Session Cleanup

**Location**: `src/contexts/AuthContext.tsx` (new helper function)

**Purpose**: Properly clean up the user's session after detecting unauthorized access

**Function Signature**:

```typescript
/**
 * Clean up session for unauthorized user
 * Ensures no stale session data remains
 */
const cleanupUnauthorizedSession = async (): Promise<void> => {
  try {
    // Stop token refresh
    tokenRefreshManager.stop();
    tokenRefreshManager.clearUserContext();
    
    // Delete Appwrite session
    await account.deleteSession('current');
    
    // Clear session cookie
    document.cookie = 'appwrite-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Clear state
    setUser(null);
    setUserProfile(null);
    
    console.log('[AuthContext] Unauthorized session cleaned up', {
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log but don't throw - cleanup is best-effort
    console.error('[AuthContext] Error during unauthorized session cleanup:', error);
  }
};
```

### 5. Logging Enhancement

**Location**: `src/contexts/AuthContext.tsx` - within error detection logic

**Purpose**: Log unauthorized access attempts for monitoring and troubleshooting

**Implementation**:

```typescript
// After detecting unauthorized error
console.warn('[AuthContext] Unauthorized team access detected', {
  timestamp: new Date().toISOString(),
  userId: currentUser.$id,
  email: currentUser.email,
  errorType: 'user_unauthorized',
  message: 'User authenticated but not authorized for this event',
});

// Optionally log to database if logging is enabled
try {
  await logAuthEvent('auth_unauthorized_access', currentUser.$id, {
    email: currentUser.email,
    errorType: 'user_unauthorized',
    timestamp: new Date().toISOString(),
  });
} catch (logError) {
  console.error('[AuthContext] Failed to log unauthorized access:', logError);
}
```

## Data Models

No new data models are required. This feature uses existing structures:

- **Appwrite User**: Standard Appwrite authentication user object
- **Error Objects**: Standard JavaScript/Appwrite error objects with `type`, `code`, and `message` properties
- **Log Entries**: Existing log structure for authentication events

## Error Handling

### Error Detection Strategy

The solution uses a multi-layered approach to detect unauthorized team access:

1. **Primary Detection**: Check for `error.type === 'user_unauthorized'` AND `error.code === 401`
2. **Secondary Detection**: Check error message for "not authorized to perform the requested action"
3. **Context Awareness**: Only trigger the alert during the login flow, not during session restoration

### Error Scenarios

| Scenario | Error Type | Handling |
|----------|-----------|----------|
| Invalid credentials | `user_invalid_credentials` | Show generic login error (existing behavior) |
| Expired session | `user_jwt_invalid` | Show session expired message (existing behavior) |
| No team membership | `user_unauthorized` | Show team access alert (new behavior) |
| Network error | Various | Show connection error (existing behavior) |
| Rate limiting | `general_rate_limit_exceeded` | Show rate limit error (existing behavior) |

### Edge Cases

1. **Multiple API Calls Failing**: Only show the alert once per login attempt
2. **Session Restoration**: Don't show the alert during automatic session restoration (only during explicit login)
3. **Concurrent Tabs**: Alert shown in the tab where login occurred
4. **Browser Back Button**: Ensure clean state after alert dismissal
5. **Infinite Loading State**: Current issue where unauthorized users see infinite loading - fixed by immediate session cleanup and redirect
6. **Cookie Clearing Workaround**: Current workaround where users must manually clear cookies - no longer needed with automatic cleanup

## Testing Strategy

### Unit Tests

**File**: `src/contexts/__tests__/AuthContext.unauthorized.test.tsx`

Test cases:
1. `isUnauthorizedTeamError` correctly identifies team access errors
2. `isUnauthorizedTeamError` returns false for other error types
3. Alert is shown when unauthorized error occurs during login
4. Alert is not shown for other error types
5. Session is properly cleaned up after alert dismissal
6. User is redirected to login page after alert dismissal

### Integration Tests

**File**: `src/__tests__/integration/unauthorized-access-flow.test.tsx`

Test cases:
1. Complete flow: login → unauthorized error → alert → cleanup → redirect
2. Alert content includes user's email address
3. Alert uses "info" icon, not "error"
4. Subsequent login attempts work correctly after cleanup
5. No duplicate alerts shown for multiple failed API calls

### Manual Testing Checklist

1. **Setup**: Create a test user in Appwrite Auth but don't add them to the event team
2. **Test Login**: Attempt to log in with the test user
3. **Verify Alert**: Confirm the alert appears with correct content (including "you'll be returned to login page" message)
4. **Verify No Infinite Loading**: Confirm no infinite loading circle appears
5. **Verify Cleanup**: Check that session is cleared (no cookies, no local state)
6. **Verify Redirect**: Confirm redirect to login page after clicking OK
7. **Test Re-login Without Cookie Clearing**: Attempt to log in again without manually clearing cookies (should work)
8. **Test After Access Granted**: Add user to team, verify normal login works immediately
9. **Test Dark Mode**: Verify alert appearance in both light and dark themes
10. **Test Mobile**: Verify alert is readable and functional on mobile devices
11. **Compare to Old Behavior**: Verify the infinite loading issue is resolved

### Accessibility Testing

1. **Keyboard Navigation**: Ensure alert can be dismissed with Enter key
2. **Screen Reader**: Verify alert content is properly announced
3. **Focus Management**: Confirm focus returns to login form after dismissal
4. **Color Contrast**: Verify text meets WCAG AA standards in both themes

## Implementation Plan

### Phase 1: Error Detection Utility (30 minutes)

1. Add `isUnauthorizedTeamError` function to `src/lib/apiErrorHandler.ts`
2. Add unit tests for the new function
3. Export the function for use in AuthContext

### Phase 2: AuthContext Enhancement (1 hour)

1. Add `showUnauthorizedTeamAlert` helper function
2. Add `cleanupUnauthorizedSession` helper function
3. Modify `signIn` method to detect and handle unauthorized errors
4. Add logging for unauthorized access attempts
5. Add state management to prevent duplicate alerts

### Phase 3: Testing (1 hour)

1. Write unit tests for AuthContext changes
2. Write integration tests for complete flow
3. Perform manual testing with test user
4. Test in both light and dark modes
5. Test on mobile devices

### Phase 4: Documentation (30 minutes)

1. Update AuthContext JSDoc comments
2. Add inline code comments explaining the logic
3. Create user-facing documentation for event administrators
4. Update troubleshooting guide

## Design Decisions and Rationales

### Decision 1: Use SweetAlert Instead of Toast

**Rationale**: 
- Toast notifications auto-dismiss and can be easily missed
- This is a critical message that requires user acknowledgment
- SweetAlert modal blocks interaction until dismissed, ensuring the user reads the message
- Consistent with other important alerts in the application (errors, confirmations)

### Decision 2: Show Alert in AuthContext, Not Login Page

**Rationale**:
- Error occurs after successful authentication, during profile fetch
- AuthContext is the central location for authentication logic
- Keeps login page simple and focused on form handling
- Allows the same logic to work for other authentication methods (OAuth, magic link)

### Decision 3: Clean Up Session Immediately and Redirect to Login

**Rationale**:
- Prevents confusion from having a valid Appwrite session but no database access
- Ensures clean state for next login attempt
- Prevents potential security issues from lingering sessions
- Matches user expectation (if I can't access the app, I shouldn't be "logged in")
- **Fixes Current Issue**: Currently, users in this state see an infinite loading circle and must manually clear cookies to log in again
- Automatic session termination and redirect provides a clear path forward
- Allows users to retry login immediately after access is granted

### Decision 4: Use "info" Icon Instead of "error"

**Rationale**:
- This is not an error on the user's part - they successfully authenticated
- The issue is a configuration/permission problem, not a user mistake
- "info" icon (blue) is less alarming than "error" icon (red)
- Sets the right tone: informational rather than accusatory

### Decision 5: Include User Email in Alert

**Rationale**:
- Confirms to the user which account they're signed in with
- Helps users who may have multiple accounts
- Provides context for contacting the administrator ("I'm trying to access with email X")
- Increases transparency and reduces confusion

### Decision 6: Detect Error Type, Not HTTP Status Alone

**Rationale**:
- 401 errors can occur for multiple reasons (expired session, invalid credentials, no team access)
- Checking error type (`user_unauthorized`) ensures we only show this alert for team access issues
- Prevents false positives from other authentication failures
- More robust and maintainable than message string matching alone

## Security Considerations

1. **No Sensitive Data in Alert**: The alert only shows the user's email (which they already know) and generic guidance
2. **Proper Session Cleanup**: Ensures no lingering sessions that could be exploited
3. **Logging**: Unauthorized access attempts are logged for security monitoring
4. **No Information Disclosure**: Alert doesn't reveal details about the team structure or other users
5. **Rate Limiting**: Existing rate limiting on login attempts prevents brute force attacks

## Performance Considerations

1. **Minimal Overhead**: Error detection adds negligible processing time
2. **No Additional API Calls**: Uses existing error responses
3. **Efficient Cleanup**: Session cleanup is fast and non-blocking
4. **Single Alert**: Prevents alert spam from multiple failed API calls

## Accessibility Considerations

1. **Semantic HTML**: Alert uses proper HTML structure with headings and lists
2. **Keyboard Accessible**: Modal can be dismissed with Enter key
3. **Screen Reader Friendly**: Content is properly structured for screen readers
4. **Focus Management**: Focus is properly managed before and after alert
5. **Color Contrast**: Text meets WCAG AA standards in both light and dark modes
6. **Clear Language**: Uses plain language without technical jargon

## Future Enhancements

1. **Self-Service Access Request**: Add a button to request access directly from the alert
2. **Administrator Contact Info**: Include specific contact information for the event administrator
3. **Access Request Tracking**: Track and display pending access requests
4. **Email Notification**: Automatically notify administrators of access requests
5. **Temporary Guest Access**: Allow limited read-only access while waiting for approval

## Conclusion

This design provides a user-friendly solution to a common access issue in multi-tenant event management systems. By clearly communicating the problem and providing actionable next steps, we reduce user frustration and support burden while maintaining security and proper session management.

The implementation is straightforward, leveraging existing infrastructure (SweetAlert, error handling, logging) and requiring minimal new code. The solution is robust, accessible, and maintainable.
