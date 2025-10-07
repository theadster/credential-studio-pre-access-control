# Multi-Browser Authentication Testing Guide

## Overview

This guide provides step-by-step instructions for testing the multi-session authentication implementation. The changes enable users to be logged in from multiple browsers simultaneously without losing access in other sessions.

## What Changed

### Before (Problematic)
- Used session-specific JWTs that became invalid when logging in from a second browser
- First browser would lose database access when second login occurred
- Sessions were not truly independent

### After (Fixed)
- Uses Appwrite's session management with custom session cookies
- Each browser maintains its own independent session
- Multiple concurrent sessions work correctly
- Session ID is stored in a custom cookie (`appwrite-session`) that our API routes can access

## Prerequisites

1. Development server running: `npm run dev`
2. Two different browsers (e.g., Chrome and Firefox) or two browser profiles
3. A test user account

## Test Scenarios

### Scenario 1: Basic Multi-Browser Login

**Steps:**

1. **Browser A (Chrome):**
   - Navigate to `http://localhost:3000/login`
   - Log in with test credentials
   - Verify you're redirected to the dashboard
   - Navigate to `http://localhost:3000/test-auth`
   - Verify "Client-Side Auth State" shows your user information
   - Verify "Server-Side Session Test" shows `authenticated: true`
   - Note the session ID in the cookie information

2. **Browser B (Firefox):**
   - Navigate to `http://localhost:3000/login`
   - Log in with the **same** test credentials
   - Verify you're redirected to the dashboard
   - Navigate to `http://localhost:3000/test-auth`
   - Verify "Client-Side Auth State" shows your user information
   - Verify "Server-Side Session Test" shows `authenticated: true`
   - Note the session ID (should be different from Browser A)

3. **Browser A (Chrome):**
   - Refresh the page or navigate to dashboard
   - **Expected:** You should still be logged in
   - **Expected:** API calls should still work
   - Navigate to `http://localhost:3000/test-auth`
   - Click "Test API Call" button
   - **Expected:** API call succeeds with your profile data

4. **Browser B (Firefox):**
   - Navigate to dashboard
   - **Expected:** You should still be logged in
   - **Expected:** API calls should still work

**Success Criteria:**
- ✅ Both browsers remain authenticated after second login
- ✅ Each browser has a different session ID
- ✅ API calls work from both browsers
- ✅ No "Session cookie not found" errors in terminal

### Scenario 2: Real-Time Data Synchronization

**Steps:**

1. **Browser A (Chrome):**
   - Log in and navigate to the attendees page
   - Note the current list of attendees

2. **Browser B (Firefox):**
   - Log in with the same user
   - Navigate to the attendees page
   - Create a new attendee

3. **Browser A (Chrome):**
   - Refresh the page
   - **Expected:** The new attendee should appear in the list

4. **Browser B (Firefox):**
   - Edit an existing attendee
   - Save changes

5. **Browser A (Chrome):**
   - Refresh the page
   - **Expected:** The edited attendee should show updated information

**Success Criteria:**
- ✅ Changes made in one browser are visible in the other after refresh
- ✅ No authentication errors occur
- ✅ Both browsers maintain their sessions throughout

### Scenario 3: Independent Logout

**Steps:**

1. **Browser A (Chrome):**
   - Log in and navigate to dashboard
   - Verify you're authenticated

2. **Browser B (Firefox):**
   - Log in with the same user
   - Navigate to dashboard
   - Verify you're authenticated

3. **Browser A (Chrome):**
   - Click logout
   - **Expected:** You're redirected to the home page
   - **Expected:** You're no longer authenticated
   - Try to navigate to `/dashboard`
   - **Expected:** You're redirected to login

4. **Browser B (Firefox):**
   - Refresh the page or navigate to another page
   - **Expected:** You should STILL be logged in
   - **Expected:** Dashboard and API calls still work
   - Navigate to `http://localhost:3000/test-auth`
   - Click "Test API Call"
   - **Expected:** API call succeeds

5. **Browser B (Firefox):**
   - Click logout
   - **Expected:** You're redirected to the home page
   - **Expected:** You're no longer authenticated

**Success Criteria:**
- ✅ Logging out from Browser A doesn't affect Browser B
- ✅ Each browser's session is independent
- ✅ After logout, the session cookie is cleared
- ✅ After logout, API calls return 401 errors

### Scenario 4: Session Persistence

**Steps:**

1. **Browser A (Chrome):**
   - Log in
   - Navigate to dashboard
   - Close the browser tab (but not the entire browser)

2. **Browser A (Chrome):**
   - Open a new tab
   - Navigate to `http://localhost:3000/dashboard`
   - **Expected:** You should still be logged in (session persists)

3. **Browser A (Chrome):**
   - Close the entire browser
   - Reopen the browser
   - Navigate to `http://localhost:3000/dashboard`
   - **Expected:** You should still be logged in (cookie persists)

**Success Criteria:**
- ✅ Session persists across tabs
- ✅ Session persists after closing and reopening browser
- ✅ Cookie has appropriate max-age (7 days)

### Scenario 5: API Route Authentication

**Steps:**

1. **Without Authentication:**
   - Open browser in incognito/private mode
   - Navigate to `http://localhost:3000/api/auth/test-session`
   - **Expected:** Response shows `authenticated: false`
   - **Expected:** Response shows `message: "No session cookie found"`

2. **With Authentication:**
   - Log in normally
   - Navigate to `http://localhost:3000/api/auth/test-session`
   - **Expected:** Response shows `authenticated: true`
   - **Expected:** Response includes user information

3. **Test Protected Endpoint:**
   - While logged in, navigate to `http://localhost:3000/api/profile`
   - **Expected:** Response includes your user profile
   - Log out
   - Navigate to `http://localhost:3000/api/profile` again
   - **Expected:** Response shows 401 Unauthorized

**Success Criteria:**
- ✅ Unauthenticated requests are properly rejected
- ✅ Authenticated requests succeed
- ✅ Session cookie is properly read by API routes

## Debugging

### Check Terminal Logs

When you make API requests, you should see logs like:
```
Session cookie found: appwrite-session
```

If you see:
```
Session cookie not found: appwrite-session
```

This means the cookie isn't being sent with the request.

### Check Browser DevTools

1. Open DevTools (F12)
2. Go to Application/Storage tab
3. Look at Cookies for `http://localhost:3000`
4. You should see a cookie named `appwrite-session`
5. The value should be a long string (the session ID)

### Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Make an API request
4. Click on the request
5. Look at the "Cookies" section in the request headers
6. Verify `appwrite-session` cookie is being sent

### Common Issues

**Issue:** "Session cookie not found" in terminal
- **Cause:** Cookie not being set or not being sent
- **Fix:** Check that login is successful and cookie is set in browser

**Issue:** 401 Unauthorized errors
- **Cause:** Session expired or invalid
- **Fix:** Log out and log back in

**Issue:** First browser loses access after second login
- **Cause:** Implementation not working correctly
- **Fix:** Verify the code changes were applied correctly

## Test Results Template

Use this template to document your test results:

```markdown
## Test Results - [Date]

### Scenario 1: Basic Multi-Browser Login
- [ ] Both browsers remain authenticated: PASS/FAIL
- [ ] Different session IDs: PASS/FAIL
- [ ] API calls work from both: PASS/FAIL
- [ ] No cookie errors: PASS/FAIL

### Scenario 2: Real-Time Data Synchronization
- [ ] Changes visible across browsers: PASS/FAIL
- [ ] No authentication errors: PASS/FAIL
- [ ] Sessions maintained: PASS/FAIL

### Scenario 3: Independent Logout
- [ ] Logout doesn't affect other browser: PASS/FAIL
- [ ] Sessions are independent: PASS/FAIL
- [ ] Cookie cleared after logout: PASS/FAIL

### Scenario 4: Session Persistence
- [ ] Persists across tabs: PASS/FAIL
- [ ] Persists after browser restart: PASS/FAIL

### Scenario 5: API Route Authentication
- [ ] Unauthenticated requests rejected: PASS/FAIL
- [ ] Authenticated requests succeed: PASS/FAIL
- [ ] Cookie properly read: PASS/FAIL

### Notes
[Add any observations or issues here]
```

## Automated Testing

Comprehensive automated tests have been created to verify the session lifecycle. These tests cover all aspects of session management with cookies.

### Running the Tests

```bash
# Run all tests
npm test

# Run session lifecycle tests specifically
npx vitest run src/__tests__/integration/session-lifecycle.test.ts

# Run tests in watch mode
npx vitest src/__tests__/integration/session-lifecycle.test.ts
```

### Test Coverage

The automated tests in `src/__tests__/integration/session-lifecycle.test.ts` cover:

#### 1. Login Flow - Session Cookie Creation (3 tests)
- ✅ Session creation with automatic cookie setting by Appwrite
- ✅ Login failure handling
- ✅ Verification that session cookies are automatically managed

#### 2. Authenticated API Calls - Using Session Cookie (5 tests)
- ✅ API request authentication using session cookies
- ✅ Multiple authenticated API calls with same session
- ✅ API requests without session cookie (should fail)
- ✅ API requests with invalid session cookie (should fail)
- ✅ Verification that session cookies are sent automatically by browser

#### 3. Logout Flow - Session Cookie Cleanup (3 tests)
- ✅ Session deletion with automatic cookie cleanup
- ✅ Logout when no session exists
- ✅ Verification that session cookie is removed after logout

#### 4. API Calls After Logout - 401 Errors (4 tests)
- ✅ 401 errors for API calls after logout
- ✅ 401 errors for expired sessions
- ✅ Multiple API calls failing after logout
- ✅ Graceful 401 error handling in API routes

#### 5. Session Cookie Verification (3 tests)
- ✅ Correct session cookie name format (`a_session_[projectId]`)
- ✅ Session ID usage with `setSession()` (not `setJWT()`)
- ✅ Session cookies working across multiple requests

#### 6. Complete Session Lifecycle (1 test)
- ✅ Full lifecycle: login → API calls → logout → 401 errors

### Test Results

All 19 tests pass successfully, verifying:
- Session cookies are automatically created on login
- Session cookies are automatically sent with API requests
- Session cookies are automatically cleared on logout
- API calls fail with 401 after logout
- Session lifecycle works end-to-end

### Requirements Coverage

These tests verify the following requirements:
- **Requirement 2.3**: Session creation and automatic cookie management
- **Requirement 2.4**: Session expiration handling
- **Requirement 7.3**: Backward compatibility maintained

## Success Criteria Summary

The implementation is successful if:

1. ✅ Users can log in from multiple browsers simultaneously
2. ✅ Each browser maintains its own independent session
3. ✅ API calls work from all authenticated browsers
4. ✅ Logging out from one browser doesn't affect others
5. ✅ Sessions persist across page refreshes and browser restarts
6. ✅ No "Session cookie not found" errors in production use
7. ✅ Authentication state is consistent between client and server

## Rollback

If testing reveals issues, you can rollback by:

1. Reverting the changes to `src/lib/appwrite.ts`
2. Reverting the changes to `src/contexts/AuthContext.tsx`
3. Restarting the development server

The previous implementation will be restored.
