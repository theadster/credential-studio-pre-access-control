# Implementation Plan

- [x] 1. Add error detection utility to API error handler
  - Create `isUnauthorizedTeamError` function in `src/lib/apiErrorHandler.ts`
  - Function should check for `error.type === 'user_unauthorized'` AND `error.code === 401`
  - Add secondary check for error message containing "not authorized to perform the requested action"
  - Export the function for use in AuthContext
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Implement unauthorized access alert in AuthContext
  - [x] 2.1 Create helper function to display SweetAlert modal
    - Add `showUnauthorizedTeamAlert` function that accepts user email as parameter
    - Use `showAlert` from `useSweetAlert` hook with "info" icon
    - Include user's email, explanation of issue, and next steps in HTML content
    - Add message informing user they'll be returned to login page
    - Use "OK, I Understand" as confirm button text
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.2 Create helper function to clean up unauthorized session
    - Add `cleanupUnauthorizedSession` function
    - Stop token refresh manager
    - Delete current Appwrite session
    - Clear session cookie
    - Clear user and userProfile state
    - Add error handling for cleanup failures (log but don't throw)
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 2.3 Modify signIn method to detect and handle unauthorized errors
    - Import `isUnauthorizedTeamError` from apiErrorHandler
    - Wrap profile fetch in try-catch block
    - Check if error is unauthorized team error using utility function
    - If unauthorized: show alert, cleanup session, redirect to login, return early
    - If other error: handle normally (existing behavior)
    - Ensure alert is only shown during explicit login, not session restoration
    - _Requirements: 1.1, 1.5, 2.4, 2.5, 5.4, 5.5_

  - [x] 2.4 Add logging for unauthorized access attempts
    - Log warning when unauthorized team error is detected
    - Include timestamp, userId, email, and error type in log
    - Optionally log to database using `logAuthEvent` if available
    - Handle logging failures gracefully (don't block main flow)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Update login page to handle redirect properly
  - Verify that login page properly resets state when navigated to after unauthorized access
  - Ensure no stale loading states remain
  - Test that user can immediately attempt login again without clearing cookies
  - _Requirements: 5.3, 5.4, 5.5_

- [x] 4. Verify and test the complete flow
  - [x] 4.1 Test unauthorized access detection
    - Create test user in Appwrite Auth without team membership
    - Attempt login and verify alert appears
    - Verify alert content includes user email and proper messaging
    - Verify "info" icon is used, not "error"
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.2 Test session cleanup and redirect
    - Verify session is cleared after alert dismissal (check cookies and state)
    - Verify redirect to login page occurs
    - Verify no infinite loading state appears
    - Verify user can attempt login again without clearing cookies manually
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.3 Test that normal login still works
    - Add test user to event team
    - Verify normal login flow works correctly
    - Verify no alert appears for authorized users
    - Verify dashboard loads properly for authorized users
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 4.4 Test error differentiation
    - Test with invalid credentials - verify generic error shown, not team access alert
    - Test with expired session - verify session expired message, not team access alert
    - Test with network error - verify connection error, not team access alert
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.5 Test in different scenarios
    - Test in light mode and dark mode
    - Test on mobile devices
    - Test with keyboard navigation (Enter key to dismiss)
    - Test that logging works correctly
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_
