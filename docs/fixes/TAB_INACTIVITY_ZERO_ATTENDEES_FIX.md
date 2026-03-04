---
title: Tab Inactivity Zero Attendees Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-03-07
review_interval_days: 90
related_code:
  - src/lib/tokenRefresh.ts
  - src/contexts/AuthContext.tsx
  - src/pages/dashboard.tsx
---

# Tab Inactivity Zero Attendees Fix

## Symptom

After leaving the app in a background browser tab for several minutes, returning to the tab showed 0 attendees with a green "Synced" checkmark. Console logs showed:

1. Token refresh failing all 5 attempts with exponential backoff
2. "Cleaning up token refresh and tab coordination" firing unexpectedly mid-session
3. Hundreds of "WebSocket is already in CLOSING or CLOSED state" errors
4. `api/attendees` returning 401 Unauthorized
5. Attendees list showing 0 with a misleading "Synced" indicator

## Root Causes

### 1. Browser timer throttling in background tabs (`src/lib/tokenRefresh.ts`)

Browsers aggressively throttle `setTimeout` in backgrounded tabs — a 10-minute timer can fire 30+ minutes late. The `TokenRefreshManager` relied solely on a timer to schedule refreshes. When the tab was backgrounded, the timer fired too late (after the JWT had already expired), causing all 5 retry attempts to fail with 401.

**Fix:** Added a `visibilitychange` event listener in `start()`. When the tab becomes visible again, it checks whether the refresh was overdue and triggers immediately if so. The listener is registered once and cleaned up in `stop()`.

### 2. Cleanup effect re-running on notification state changes (`src/contexts/AuthContext.tsx`)

The token refresh setup `useEffect` had `hasShownExpirationNotification` in its dependency array. Every time that state changed (e.g. after showing a toast), React ran the effect cleanup first — calling `tokenRefreshManager.stop()` and `tabCoordinator.cleanup()` mid-session. This is why "Cleaning up token refresh" appeared in logs without a page unload.

**Fix:** Changed the effect to `[]` deps (register once, cleanup on unmount only). Replaced direct reads of `hasShownExpirationNotification` inside callbacks with the functional `setState(prev => ...)` form, which safely reads current state without needing it as a closure dependency. Added `hasShownExpirationNotificationRef` to reliably track state across callbacks and prevent duplicate notifications.

**Side effect refactoring:** Removed side effects (toast calls) from state updater functions. All three notification scenarios now:
1. Check `hasShownExpirationNotificationRef.current` before showing toast
2. Call `toast()` outside the state updater
3. Set ref to `true` and call `setHasShownExpirationNotification(true)` separately

This follows React best practices by keeping state updaters pure and separating side effects from state management.

**Additional compliance fix:** Migrated TablesDB API calls from positional parameters to named object parameters:
- `tablesDB.listRows(databaseId, tableId, queries)` → `tablesDB.listRows({ databaseId, tableId, queries })`
- `tablesDB.createRow(databaseId, tableId, rowId, data)` → `tablesDB.createRow({ databaseId, tableId, rowId, data })`

### 3. Attendees wiped on 401, UI showing stale "Synced" state (`src/pages/dashboard.tsx`)

`refreshAttendees` called `setAttendees([])` on any non-ok response, including 401. This cleared the list while `DataRefreshIndicator` still showed "Synced" because `lastUpdatedAt` was set from the previous successful load and never cleared on error.

**Fix:** On 401 or other errors, the existing attendee data is preserved — stale data is better than a misleading empty list. `markFresh()` is NOT called on errors, so the freshness timestamp won't advance on failed fetches. The periodic staleness check will naturally mark data as stale when the threshold is exceeded.

**Response body refactoring:** Replaced unreliable `content-length` header check with actual response body reading:
- Old: `const contentLength = attendeesResponse.headers.get('content-length'); if (contentLength === '0' || ...)`
- New: `const responseText = await attendeesResponse.text(); if (responseText === '' || ...)`
- Then parse the text to JSON: `const attendeesData = JSON.parse(responseText)`

This ensures the empty-body check is reliable and the response body is only consumed once.

**Unexpected JSON shape handling:** When the API returns a 200 response with an unexpected JSON shape (neither an array nor an object with `attendees` property), the code now:
- Preserves existing attendees (does NOT call `setAttendees([])`)
- Does NOT call `markFresh()` to avoid advancing the freshness timestamp
- Logs a warning with the unexpected payload shape for debugging
- Allows the UI to continue showing the last-known data

**Freshness indicator behavior:** On all error branches (401, non-ok responses, network errors, unexpected payloads):
- `markFresh()` is NOT called, preserving the existing `lastUpdatedAt` timestamp
- The periodic staleness check (every 5 seconds) will detect when data exceeds the staleness threshold
- The freshness indicator will automatically transition to "stale" without requiring explicit state updates

## Files Changed

| File | Change |
|------|--------|
| `src/lib/tokenRefresh.ts` | Added `visibilitychange` listener to trigger refresh when tab becomes visible after being backgrounded |
| `src/contexts/AuthContext.tsx` | Fixed effect deps to `[]`; use functional setState in callbacks to avoid re-registering/cleaning up on notification state changes |
| `src/pages/dashboard.tsx` | Preserve existing attendees on 401/error instead of wiping to empty array |

**Note on HTTP 204 handling:** In `refreshAttendees`, HTTP 204 (No Content) from `/api/attendees` is intentionally interpreted as "no attendees" — `setAttendees([])` and `markFresh()` are called to clear the list and mark data as fresh. This is correct behavior and should not be reverted.
