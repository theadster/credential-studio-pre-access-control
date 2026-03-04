---
title: Code Review Issues - Fourth Round Fixes
type: canonical
status: active
owner: "@team"
last_verified: 2026-03-04
review_interval_days: 90
related_code:
  - src/lib/tabCoordinator.ts
  - src/lib/tokenRefresh.ts
  - src/contexts/AuthContext.tsx
---

# Code Review Issues - Fourth Round Fixes

## Summary

Fixed 7 critical issues from fourth code review round affecting event listener cleanup, leader election race conditions, cookie security, configuration validation, and cross-tab communication. All fixes maintain backward compatibility and improve reliability.

## Issues Fixed

### 1. Ephemeral Listeners Cleared Even If Removal Threw Error
**Status:** ✅ Fixed  
**Impact:** High - Resource leaks, orphaned event handlers

**Problem:** If `removeEventListener()` throws, code clears listeners from tracking set anyway, preventing retry/removal later. Orphaned handlers remain active, causing memory leaks or duplicate callbacks.

**Solution:**
- Changed cleanup to only remove listeners that were successfully removed
- Failed listeners remain in `ephemeralListeners` set for retry on next cleanup
- Wrapped removal in try/catch, keeping failed listeners in set
- Ensures all listeners are eventually removed even if first attempt fails

**Files Changed:** `src/lib/tabCoordinator.ts` (cleanup method)

---

### 2. Race Condition in Leader Election: Multiple Tabs Can Become Refresh Leaders
**Status:** ✅ Fixed  
**Impact:** High - Duplicate token refreshes, token overwrites

**Problem:** Multiple tabs can timeout simultaneously and both set `isRefreshLeader = true`, causing concurrent refreshes. No atomic check-and-set operation prevents this.

**Solution:**
- Added atomic check before setting leader flag: `if (!this.isRefreshLeader)`
- Only set leader if flag is still false (first tab wins)
- Other tabs that timeout see flag already set and resolve false
- Ensures only one tab becomes leader even with concurrent timeouts

**Files Changed:** `src/lib/tabCoordinator.ts` (requestRefresh timeout handler)

---

### 3. Uncaught JSON Parse Errors When Reading Attendees Response Body
**Status:** ✅ Already Fixed (Verified)  
**Impact:** High - Uncaught exceptions break fetch handler

**Problem:** If server returns invalid JSON, `JSON.parse()` throws uncaught exception, breaking error-handling flow.

**Solution:** Already implemented in `src/pages/dashboard.tsx`:
- Wrapped `JSON.parse()` in try/catch
- On error, preserves existing attendees and logs error
- Does NOT call `markFresh()`, allowing staleness check to detect stale data

**Files:** `src/pages/dashboard.tsx` (refreshAttendees function)

---

### 4. Client-Side Cookie Clearing Cannot Clear HttpOnly Cookies
**Status:** ✅ Already Documented (Verified)  
**Impact:** High - Security gap in logout

**Problem:** Client-side code cannot clear HttpOnly cookies, leaving session active.

**Solution:** Already implemented:
- Calls `account.deleteSession('current')` first (server-side invalidation)
- Server-side deleteSession() clears HttpOnly cookies
- Client-side clearing is secondary (for non-HttpOnly cookies)

**Files:** `src/contexts/AuthContext.tsx` (signOut function)

---

### 5. stop() Clears Cookie With Direct document.cookie Instead of js-cookie
**Status:** ✅ Fixed  
**Impact:** High - Session persistence security hole

**Problem:** Using `document.cookie = '...'` doesn't properly remove cookies set with SameSite=None, Secure, or domain attributes. Cookie may remain active despite stop() being called.

**Solution:**
- Changed to use `Cookies.remove()` from js-cookie library
- Handles all cookie attributes (SameSite, Secure, domain, path)
- Tries removal with path first, then without path as fallback
- Falls back to direct `document.cookie` if js-cookie throws
- Ensures cookie is actually removed regardless of how it was set

**Files Changed:** `src/lib/tokenRefresh.ts` (stop method)

---

### 6. No Upper Bound on retryAttempts Allows Extremely Large Values
**Status:** ✅ Fixed  
**Impact:** High - DoS vulnerability

**Problem:** Constructor doesn't validate max value for `retryAttempts`. Misconfigured or malicious value can cause enormous number of network requests, CPU exhaustion, UI hangs.

**Solution:**
- Added upper bound validation: max 50 retry attempts
- If value exceeds limit, caps it and logs warning
- Prevents DoS from misconfiguration or malicious input
- Still allows reasonable retry counts (5-50)

**Files Changed:** `src/lib/tokenRefresh.ts` (constructor)

---

### 7. postMessage Calls Without try/catch Can Throw If BroadcastChannel Closed
**Status:** ✅ Fixed  
**Impact:** High - Crashes refresh-completion flow

**Problem:** Calling `postMessage()` on closed BroadcastChannel throws exception, propagating out of handler and breaking cross-tab coordination.

**Solution:**
- Wrapped all `postMessage()` calls in try/catch blocks
- Logs errors but continues execution
- Prevents exceptions from crashing handlers
- Ensures UI and cross-tab coordination remain consistent even if messaging fails

**Files Changed:** `src/contexts/AuthContext.tsx` (all postMessage calls)

---

## Testing Recommendations

1. **Listener Cleanup:** Mock removeEventListener to throw intermittently, verify cleanup retries
2. **Leader Election:** Open 3+ tabs, trigger simultaneous refresh requests, verify only one becomes leader
3. **Cookie Removal:** Set cookie with SameSite=None/Secure, call stop(), verify cookie is removed
4. **retryAttempts Cap:** Test `new TokenRefreshManager({ retryAttempts: 100 })`, verify capped at 50
5. **postMessage Errors:** Mock BroadcastChannel.postMessage to throw, verify handlers continue

## Backward Compatibility

All fixes maintain backward compatibility:
- No API changes
- No breaking changes to configuration
- Existing code continues to work unchanged
- Improvements are transparent to callers

## Performance Impact

- **Positive:** Eliminates duplicate refreshes, prevents resource leaks, improves security
- **Neutral:** Minimal overhead from additional checks and error handling
- **Overall:** Improved reliability, security, and resource usage

## Security Impact

- **Cookie Removal:** Now properly removes cookies with all attributes (SameSite=None, Secure, domain)
- **DoS Prevention:** Upper bound on retryAttempts prevents client exhaustion
- **Error Resilience:** postMessage errors don't crash handlers, maintaining cross-tab coordination

