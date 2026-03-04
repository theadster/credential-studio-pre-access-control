---
title: Code Review Issues - Second Round Fixes
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

# Code Review Issues - Second Round Fixes

## Summary

Fixed 6 critical issues from second code review round affecting token refresh, tab coordination, session management, and error handling. All fixes maintain backward compatibility.

## Issues Fixed

### 1. Cross-Tab Notification Ref Not Reset on Sign Out
**Status:** ✅ Fixed  
**Impact:** Medium - Confusing UI state, missed notifications across tabs

**Problem:** When signing out, `hasShownExpirationNotificationRef` was not reset, causing other tabs to suppress future session warnings.

**Solution:** 
- Reset both state and ref on sign out
- Broadcast `session-warning-reset` message to other tabs via BroadcastChannel
- Ensures all tabs clear their notification flags

**Files Changed:** `src/contexts/AuthContext.tsx` (signOut function)

---

### 2. Null Config Values Coerced to 0
**Status:** ✅ Fixed  
**Impact:** High - Constructor throws on null values

**Problem:** Constructor coerced null values to 0 using `Number(null)`, which passes validation but is incorrect. Should skip null values to use defaults.

**Solution:**
- Added explicit null check: `config.field !== undefined && config.field !== null`
- Null values are skipped, allowing defaults to apply
- Only non-null values are coerced to numbers

**Files Changed:** `src/lib/tokenRefresh.ts` (constructor)

---

### 3. Rescheduling Logic Can Schedule Immediate Refresh That's Skipped
**Status:** ✅ Fixed  
**Impact:** High - Token not refreshed, unexpected session expiry

**Problem:** Visibility handler scheduled immediate refresh when one was already in progress, but `refresh()` returns false when already refreshing, causing the scheduled refresh to be skipped.

**Solution:**
- Removed rescheduling logic
- If refresh already in progress, visibility handler simply returns
- Existing timer will handle the next refresh attempt
- Prevents scheduling a refresh that will be skipped

**Files Changed:** `src/lib/tokenRefresh.ts` (visibility handler)

---

### 4. cleanup() Calls External APIs Without Try/Catch
**Status:** ✅ Fixed  
**Impact:** High - Resource leaks, timers left running

**Problem:** If any DOM/API call throws (e.g., malformed listener), subsequent cleanup steps won't run, leaving resources leaked.

**Solution:**
- Wrapped each external API call in try/catch
- Logs errors but continues cleanup
- Ensures all cleanup steps complete regardless of exceptions
- Prevents resource leaks and stale state

**Files Changed:** `src/lib/tabCoordinator.ts` (cleanup method)

---

### 5. Accessing event.data.type Without Validation
**Status:** ✅ Fixed  
**Impact:** Medium - Uncaught exceptions, broken message handling

**Problem:** BroadcastChannel message handler accessed `event.data.type` without validating `event.data` is an object, causing TypeError if null/undefined.

**Solution:**
- Added validation: `if (!event.data || typeof event.data !== 'object')`
- Wrapped entire handler in try/catch
- Logs warnings for invalid messages
- Prevents uncaught exceptions

**Files Changed:** `src/contexts/AuthContext.tsx` (notification channel handler)

---

### 6. Race Condition: Multiple Tabs Can Become Refresh Leaders Concurrently
**Status:** ✅ Fixed  
**Impact:** High - Duplicate network requests, token overwrites

**Problem:** Multiple tabs could timeout simultaneously and both set `isRefreshLeader = true`, causing concurrent refreshes.

**Solution:**
- Added `denied` flag check in timeout handler
- Set `denied = true` before setting `isRefreshLeader`
- Handler also checks `!denied` before resolving
- Ensures only one tab becomes leader even with concurrent timeouts

**Files Changed:** `src/lib/tabCoordinator.ts` (requestRefresh method)

---

## Testing Recommendations

1. **Null Config:** Test with `new TokenRefreshManager({ retryAttempts: null })`
2. **Visibility Handler:** Test with tab backgrounded during active refresh
3. **Cleanup Errors:** Mock removeEventListener to throw, verify cleanup completes
4. **Message Validation:** Send malformed BroadcastChannel messages
5. **Race Condition:** Open 3+ tabs, trigger simultaneous refresh requests

## Backward Compatibility

All fixes maintain backward compatibility:
- No API changes
- No breaking changes to configuration
- Existing code continues to work unchanged
- Improvements are transparent to callers

## Performance Impact

- **Positive:** Eliminates resource leaks, prevents duplicate network requests
- **Neutral:** Minimal overhead from additional validation
- **Overall:** Improved reliability and reduced resource usage
