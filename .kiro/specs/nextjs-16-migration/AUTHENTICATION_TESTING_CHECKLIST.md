# Authentication Testing Checklist - Next.js 16 Migration

## Overview
This document provides a comprehensive manual testing checklist for verifying all authentication flows work correctly after the Next.js 16 migration. Each test should be performed manually to ensure the authentication system functions properly with the new framework version.

**Testing Date:** _____________  
**Tester:** _____________  
**Environment:** _____________  
**Next.js Version:** 16.x  
**React Version:** 19.x

---

## Pre-Testing Setup

### Environment Verification
- [ ] Verify `.env.local` contains all required Appwrite credentials
- [ ] Verify `NEXT_PUBLIC_APPWRITE_ENDPOINT` is set correctly
- [ ] Verify `NEXT_PUBLIC_APPWRITE_PROJECT_ID` is set correctly
- [ ] Verify `NEXT_PUBLIC_APPWRITE_DATABASE_ID` is set correctly
- [ ] Verify development server is running (`npm run dev`)
- [ ] Clear browser cookies and localStorage before testing
- [ ] Open browser DevTools Console to monitor for errors

---

## Test 1: Login with Email/Password

### Test 1.1: Successful Login
**Steps:**
1. Navigate to `/login`
2. Enter valid email address
3. Enter correct password
4. Click "Continue" button

**Expected Results:**
- [ ] No console errors appear
- [ ] User is redirected to `/dashboard`
- [ ] Success toast notification appears: "You have successfully signed in"
- [ ] User profile loads correctly in dashboard
- [ ] Session cookie `appwrite-session` is set in browser
- [ ] Token refresh timer starts (check console logs)

**Actual Results:**
```
_____________________________________________
```

### Test 1.2: Invalid Email Format
**Steps:**
1. Navigate to `/login`
2. Enter invalid email (e.g., "notanemail")
3. Enter any password
4. Click "Continue" button

**Expected Results:**
- [ ] Form validation error appears: "Email is invalid"
- [ ] Continue button remains disabled
- [ ] No API call is made
- [ ] User remains on login page

**Actual Results:**
```
_____________________________________________
```

### Test 1.3: Wrong Password
**Steps:**
1. Navigate to `/login`
2. Enter valid email address
3. Enter incorrect password
4. Click "Continue" button

**Expected Results:**
- [ ] Error alert modal appears with title "Login Failed"
- [ ] Error message: "Invalid email or password. Please check your credentials and try again."
- [ ] User remains on login page
- [ ] Form is cleared or ready for retry
- [ ] No session cookie is set

**Actual Results:**
```
_____________________________________________
```

### Test 1.4: Non-Existent User
**Steps:**
1. Navigate to `/login`
2. Enter email that doesn't exist in system
3. Enter any password
4. Click "Continue" button

**Expected Results:**
- [ ] Error alert modal appears
- [ ] Error message indicates invalid credentials
- [ ] User remains on login page
- [ ] No session cookie is set

**Actual Results:**
```
_____________________________________________
```

### Test 1.5: Rate Limiting
**Steps:**
1. Navigate to `/login`
2. Attempt login with wrong password 5+ times rapidly
3. Observe behavior

**Expected Results:**
- [ ] After multiple failed attempts, rate limit error appears
- [ ] Error title: "Too Many Attempts"
- [ ] Error message mentions waiting period
- [ ] User cannot attempt login immediately

**Actual Results:**
```
_____________________________________________
```

### Test 1.6: Unauthorized Team Access
**Steps:**
1. Navigate to `/login`
2. Login with user account that exists in Appwrite Auth but is NOT in the event team
3. Observe behavior

**Expected Results:**
- [ ] User authenticates successfully with Appwrite
- [ ] Specialized alert appears: "Access Not Granted"
- [ ] Alert shows user's email address
- [ ] Alert explains user needs to be added to event team
- [ ] Session is cleaned up (no cookie remains)
- [ ] User is redirected back to `/login`
- [ ] No dashboard access is granted

**Actual Results:**
```
_____________________________________________
```

---

## Test 2: Login with Google OAuth

### Test 2.1: Successful Google OAuth Login
**Steps:**
1. Navigate to `/login`
2. Click "Sign in with Google" button (if available)
3. Complete Google OAuth flow in popup/redirect
4. Return to application

**Expected Results:**
- [ ] OAuth popup/redirect opens correctly
- [ ] Google authentication completes successfully
- [ ] User is redirected to `/auth/callback`
- [ ] User is then redirected to `/dashboard`
- [ ] Success toast notification appears
- [ ] User profile loads correctly
- [ ] Session cookie is set

**Actual Results:**
```
_____________________________________________
```

### Test 2.2: Google OAuth Cancellation
**Steps:**
1. Navigate to `/login`
2. Click "Sign in with Google" button
3. Cancel the OAuth flow (close popup or click cancel)

**Expected Results:**
- [ ] User is redirected back to `/login`
- [ ] No error message appears (cancellation is expected)
- [ ] No session is created
- [ ] User can attempt login again

**Actual Results:**
```
_____________________________________________
```

### Test 2.3: Google OAuth Error
**Steps:**
1. Navigate to `/login`
2. Click "Sign in with Google" button
3. Simulate OAuth error (if possible, or observe natural errors)

**Expected Results:**
- [ ] Error toast notification appears
- [ ] Error message indicates OAuth failure
- [ ] User is redirected back to `/login`
- [ ] No session is created

**Actual Results:**
```
_____________________________________________
```

---

## Test 3: Password Reset Flow

### Test 3.1: Request Password Reset
**Steps:**
1. Navigate to `/login`
2. Click "Forgot password?" link
3. Enter valid email address
4. Click submit button

**Expected Results:**
- [ ] Success toast appears: "Check your email for the password reset link"
- [ ] No console errors
- [ ] Email is sent to user's inbox (check email)
- [ ] User remains on forgot password page or is redirected

**Actual Results:**
```
_____________________________________________
```

### Test 3.2: Password Reset with Invalid Email
**Steps:**
1. Navigate to `/forgot-password`
2. Enter invalid email format
3. Click submit button

**Expected Results:**
- [ ] Form validation error appears
- [ ] No API call is made
- [ ] User remains on page

**Actual Results:**
```
_____________________________________________
```

### Test 3.3: Complete Password Reset
**Steps:**
1. Request password reset (Test 3.1)
2. Check email inbox
3. Click password reset link in email
4. Enter new password
5. Confirm new password
6. Submit form

**Expected Results:**
- [ ] User is redirected to password reset page with valid token
- [ ] New password form appears
- [ ] Password validation works (minimum length, etc.)
- [ ] Success message appears after submission
- [ ] User can login with new password
- [ ] Old password no longer works

**Actual Results:**
```
_____________________________________________
```

### Test 3.4: Expired Password Reset Token
**Steps:**
1. Request password reset
2. Wait for token to expire (or use old token)
3. Attempt to use expired token

**Expected Results:**
- [ ] Error message appears indicating token is expired
- [ ] User is prompted to request new reset link
- [ ] Password is not changed

**Actual Results:**
```
_____________________________________________
```

### Test 3.5: Password Reset Rate Limiting
**Steps:**
1. Navigate to `/forgot-password`
2. Request password reset multiple times rapidly (5+ times)
3. Observe behavior

**Expected Results:**
- [ ] Rate limit error appears after multiple requests
- [ ] Error title: "Too Many Attempts"
- [ ] Error message mentions waiting period
- [ ] User cannot request reset immediately

**Actual Results:**
```
_____________________________________________
```

---

## Test 4: Session Management

### Test 4.1: Session Persistence Across Page Refresh
**Steps:**
1. Login successfully
2. Navigate to `/dashboard`
3. Refresh the page (F5 or Cmd+R)
4. Observe behavior

**Expected Results:**
- [ ] User remains logged in after refresh
- [ ] Dashboard loads without redirect to login
- [ ] User profile data is restored
- [ ] No "session expired" message appears
- [ ] Token refresh timer continues working

**Actual Results:**
```
_____________________________________________
```

### Test 4.2: Session Persistence Across Browser Tabs
**Steps:**
1. Login in Tab 1
2. Open new tab (Tab 2)
3. Navigate to `/dashboard` in Tab 2
4. Observe behavior

**Expected Results:**
- [ ] User is logged in automatically in Tab 2
- [ ] Dashboard loads without login prompt
- [ ] Both tabs maintain session independently
- [ ] Token refresh coordinates between tabs

**Actual Results:**
```
_____________________________________________
```

### Test 4.3: Session Expiration Handling
**Steps:**
1. Login successfully
2. Wait for session to expire (or manually expire JWT)
3. Attempt to perform an action (e.g., navigate to protected page)
4. Observe behavior

**Expected Results:**
- [ ] Session expiration is detected
- [ ] Toast notification appears: "Session Expired"
- [ ] User is redirected to `/login`
- [ ] Current URL is preserved for post-login redirect
- [ ] Session cookie is cleared
- [ ] Token refresh timer stops

**Actual Results:**
```
_____________________________________________
```

### Test 4.4: Token Refresh During Active Session
**Steps:**
1. Login successfully
2. Keep browser open and active
3. Wait for token refresh to occur (check console logs)
4. Observe behavior

**Expected Results:**
- [ ] Token refresh occurs automatically before expiration
- [ ] Console logs show successful token refresh
- [ ] User experiences no interruption
- [ ] Session continues seamlessly
- [ ] No error messages appear

**Actual Results:**
```
_____________________________________________
```

### Test 4.5: Protected Route Access Without Session
**Steps:**
1. Ensure you are logged out
2. Clear all cookies and localStorage
3. Directly navigate to `/dashboard` (protected route)
4. Observe behavior

**Expected Results:**
- [ ] User is redirected to `/login`
- [ ] Current URL is preserved in sessionStorage
- [ ] After login, user is redirected back to `/dashboard`
- [ ] No console errors appear

**Actual Results:**
```
_____________________________________________
```

### Test 4.6: Session Cookie Handling
**Steps:**
1. Login successfully
2. Open browser DevTools > Application > Cookies
3. Inspect `appwrite-session` cookie
4. Verify cookie properties

**Expected Results:**
- [ ] Cookie `appwrite-session` exists
- [ ] Cookie contains JWT token
- [ ] Cookie has appropriate expiration (7 days)
- [ ] Cookie path is `/`
- [ ] Cookie SameSite attribute is set correctly
- [ ] Cookie Secure flag is set (if HTTPS)

**Actual Results:**
```
_____________________________________________
```

---

## Test 5: Logout Functionality

### Test 5.1: Standard Logout
**Steps:**
1. Login successfully
2. Navigate to dashboard
3. Click logout button/link
4. Observe behavior

**Expected Results:**
- [ ] Success toast appears: "You have successfully signed out"
- [ ] User is redirected to `/` (home page)
- [ ] Session cookie is cleared
- [ ] Token refresh timer stops
- [ ] User cannot access protected routes without re-login
- [ ] Logout event is logged in activity logs

**Actual Results:**
```
_____________________________________________
```

### Test 5.2: Logout from Multiple Tabs
**Steps:**
1. Login in Tab 1
2. Open Tab 2 with same session
3. Logout from Tab 1
4. Observe Tab 2 behavior

**Expected Results:**
- [ ] Tab 1 logs out successfully
- [ ] Tab 2 detects session termination
- [ ] Tab 2 redirects to login or shows session expired message
- [ ] Both tabs clear session data

**Actual Results:**
```
_____________________________________________
```

### Test 5.3: Logout After Session Expiration
**Steps:**
1. Login successfully
2. Wait for session to expire (or manually expire)
3. Attempt to logout
4. Observe behavior

**Expected Results:**
- [ ] Logout completes without errors
- [ ] User is redirected appropriately
- [ ] No error messages appear
- [ ] Session cleanup occurs properly

**Actual Results:**
```
_____________________________________________
```

---

## Test 6: Cross-Browser Compatibility

### Test 6.1: Chrome/Chromium
**Browser Version:** _____________

- [ ] All authentication flows work correctly
- [ ] No console errors
- [ ] Cookies are set properly
- [ ] Session management works

**Notes:**
```
_____________________________________________
```

### Test 6.2: Firefox
**Browser Version:** _____________

- [ ] All authentication flows work correctly
- [ ] No console errors
- [ ] Cookies are set properly
- [ ] Session management works

**Notes:**
```
_____________________________________________
```

### Test 6.3: Safari
**Browser Version:** _____________

- [ ] All authentication flows work correctly
- [ ] No console errors
- [ ] Cookies are set properly
- [ ] Session management works
- [ ] Third-party cookie restrictions handled

**Notes:**
```
_____________________________________________
```

### Test 6.4: Edge
**Browser Version:** _____________

- [ ] All authentication flows work correctly
- [ ] No console errors
- [ ] Cookies are set properly
- [ ] Session management works

**Notes:**
```
_____________________________________________
```

---

## Test 7: Mobile Responsiveness

### Test 7.1: Mobile Chrome (iOS)
**Device:** _____________

- [ ] Login page renders correctly
- [ ] Form inputs are accessible
- [ ] Touch interactions work
- [ ] OAuth flows work on mobile
- [ ] Session persists across app switches

**Notes:**
```
_____________________________________________
```

### Test 7.2: Mobile Safari (iOS)
**Device:** _____________

- [ ] Login page renders correctly
- [ ] Form inputs are accessible
- [ ] Touch interactions work
- [ ] OAuth flows work on mobile
- [ ] Session persists across app switches

**Notes:**
```
_____________________________________________
```

### Test 7.3: Mobile Chrome (Android)
**Device:** _____________

- [ ] Login page renders correctly
- [ ] Form inputs are accessible
- [ ] Touch interactions work
- [ ] OAuth flows work on mobile
- [ ] Session persists across app switches

**Notes:**
```
_____________________________________________
```

---

## Test 8: Error Handling & Edge Cases

### Test 8.1: Network Disconnection During Login
**Steps:**
1. Start login process
2. Disconnect network before request completes
3. Observe behavior

**Expected Results:**
- [ ] Error message appears indicating connection issue
- [ ] User can retry after reconnecting
- [ ] No partial session is created

**Actual Results:**
```
_____________________________________________
```

### Test 8.2: Slow Network Connection
**Steps:**
1. Throttle network to slow 3G
2. Attempt login
3. Observe behavior

**Expected Results:**
- [ ] Loading indicator appears
- [ ] Login completes successfully (may take longer)
- [ ] No timeout errors
- [ ] User experience is acceptable

**Actual Results:**
```
_____________________________________________
```

### Test 8.3: Browser Back Button After Login
**Steps:**
1. Login successfully
2. Navigate to dashboard
3. Click browser back button
4. Observe behavior

**Expected Results:**
- [ ] User does not return to login page
- [ ] User remains on dashboard or navigates appropriately
- [ ] Session remains active

**Actual Results:**
```
_____________________________________________
```

### Test 8.4: Browser Back Button After Logout
**Steps:**
1. Login successfully
2. Logout
3. Click browser back button
4. Observe behavior

**Expected Results:**
- [ ] User is redirected to login page
- [ ] Protected pages are not accessible
- [ ] Session remains terminated

**Actual Results:**
```
_____________________________________________
```

### Test 8.5: Concurrent Login Attempts
**Steps:**
1. Open two browser tabs
2. Attempt login in both tabs simultaneously
3. Observe behavior

**Expected Results:**
- [ ] Both logins complete successfully OR
- [ ] One login succeeds, other handles gracefully
- [ ] No session conflicts occur
- [ ] Both tabs end up in consistent state

**Actual Results:**
```
_____________________________________________
```

---

## Test 9: Security Verification

### Test 9.1: Password Visibility Toggle
**Steps:**
1. Navigate to `/login`
2. Enter password
3. Click eye icon to toggle visibility
4. Observe behavior

**Expected Results:**
- [ ] Password toggles between hidden and visible
- [ ] Eye icon changes appropriately
- [ ] Password value is not exposed in HTML
- [ ] Toggle works smoothly

**Actual Results:**
```
_____________________________________________
```

### Test 9.2: Session Cookie Security
**Steps:**
1. Login successfully
2. Inspect session cookie in DevTools
3. Verify security attributes

**Expected Results:**
- [ ] Cookie has `HttpOnly` flag (if applicable)
- [ ] Cookie has `Secure` flag (on HTTPS)
- [ ] Cookie has appropriate `SameSite` value
- [ ] Cookie expiration is reasonable (7 days)

**Actual Results:**
```
_____________________________________________
```

### Test 9.3: XSS Protection
**Steps:**
1. Attempt to inject script in email field
2. Attempt to inject script in password field
3. Observe behavior

**Expected Results:**
- [ ] Scripts are not executed
- [ ] Input is sanitized or rejected
- [ ] No XSS vulnerabilities present

**Actual Results:**
```
_____________________________________________
```

---

## Test 10: Performance Verification

### Test 10.1: Login Performance
**Steps:**
1. Clear cache and cookies
2. Navigate to `/login`
3. Measure page load time
4. Perform login
5. Measure login completion time

**Expected Results:**
- [ ] Login page loads in < 2 seconds
- [ ] Login completes in < 3 seconds
- [ ] No performance regressions vs Next.js 15

**Actual Results:**
```
Page Load Time: _______ seconds
Login Time: _______ seconds
```

### Test 10.2: Session Restoration Performance
**Steps:**
1. Login successfully
2. Refresh page
3. Measure session restoration time

**Expected Results:**
- [ ] Session restores in < 1 second
- [ ] Dashboard loads without delay
- [ ] No performance regressions

**Actual Results:**
```
Restoration Time: _______ seconds
```

---

## Summary

### Overall Test Results
- **Total Tests:** 50+
- **Passed:** _______
- **Failed:** _______
- **Blocked:** _______
- **Not Tested:** _______

### Critical Issues Found
```
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________
```

### Non-Critical Issues Found
```
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________
```

### Performance Comparison (Next.js 15 vs 16)
```
Login Page Load: _______ vs _______
Login Completion: _______ vs _______
Session Restoration: _______ vs _______
```

### Browser Compatibility Summary
- Chrome: ✅ / ❌
- Firefox: ✅ / ❌
- Safari: ✅ / ❌
- Edge: ✅ / ❌
- Mobile Chrome: ✅ / ❌
- Mobile Safari: ✅ / ❌

### Recommendations
```
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________
```

### Sign-Off
- **Tester:** _______________________ **Date:** _______
- **Reviewer:** _______________________ **Date:** _______
- **Status:** ✅ Approved / ❌ Needs Fixes / ⏸️ Blocked

---

## Notes
```
Additional observations, comments, or context:

_____________________________________________
_____________________________________________
_____________________________________________
```
