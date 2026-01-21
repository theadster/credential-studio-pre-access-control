---
title: Polling Fallback Stale State Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-21
review_interval_days: 90
related_code: ["src/hooks/usePollingFallback.ts", "src/__tests__/hooks/usePollingFallback.test.ts"]
---

# Polling Fallback Stale State Fix

## Problem

In `src/hooks/usePollingFallback.ts`, the `scheduleRetry` function was checking the React state `isPolling` to determine whether to schedule retries. However, `startPolling` calls `setIsPolling(true)` (an async state update), and then immediately calls `executePoll()` which may trigger `scheduleRetry()` before the state update takes effect. This caused `scheduleRetry` to read a stale `false` value, preventing retries from being scheduled.

### Root Cause

The timing issue:

```typescript
// ❌ WRONG: State update is async
const startPolling = useCallback(() => {
  setIsPolling(true);  // Async - doesn't take effect immediately
  
  executePoll().then((success) => {
    if (!success && isMountedRef.current) {
      scheduleRetry();  // Reads stale isPolling = false
    }
  });
}, [executePoll, interval, scheduleRetry]);

// ❌ WRONG: Checks React state which may be stale
const scheduleRetry = useCallback(() => {
  if (!isMountedRef.current || !isPolling) return;  // isPolling is false!
  // ... retry logic never runs
}, [isPolling, executePoll]);
```

## Solution

Introduced a synchronous ref (`isPollingRef`) to mirror the React state. The ref is updated immediately before the state update, ensuring `scheduleRetry` always sees the current polling status:

```typescript
// ✅ CORRECT: Ref is updated synchronously
const startPolling = useCallback(() => {
  isPollingRef.current = true;  // Synchronous - takes effect immediately
  setIsPolling(true);           // Also update state for UI
  
  executePoll().then((success) => {
    if (!success && isMountedRef.current) {
      scheduleRetry();  // Reads current isPollingRef.current = true
    }
  });
}, [executePoll, interval, scheduleRetry]);

// ✅ CORRECT: Checks ref instead of state
const scheduleRetry = useCallback(() => {
  if (!isMountedRef.current || !isPollingRef.current) return;  // Reliable!
  // ... retry logic runs as expected
}, [executePoll]);
```

### Changes Made

#### 1. Added `isPollingRef` (Line 67)

```typescript
const isPollingRef = useRef(false);
```

#### 2. Updated `scheduleRetry` (Lines 125-147)

- Changed condition from `!isPolling` to `!isPollingRef.current`
- Removed `isPolling` from dependency array (now uses ref)
- Updated timeout check to use `isPollingRef.current`

#### 3. Updated `pollNow` (Lines 149-155)

- Changed condition from `isPolling` to `isPollingRef.current`
- Removed `isPolling` from dependency array

#### 4. Updated `startPolling` (Lines 157-177)

- Set `isPollingRef.current = true` immediately before `setIsPolling(true)`
- Added comment explaining the synchronous update

#### 5. Updated `stopPolling` (Lines 179-186)

- Set `isPollingRef.current = false` before `setIsPolling(false)`
- Ensures ref and state stay in sync

## Impact

- **Correctness**: Retries are now scheduled reliably when polls fail
- **Consistency**: `isPollingRef` and `isPolling` state are always in sync
- **Performance**: Reduced dependency array sizes (removed `isPolling` from callbacks)
- **Reliability**: Polling fallback now works as designed when connection is lost

## Files Modified

- `src/hooks/usePollingFallback.ts` - Added ref and updated all polling state checks

## Testing

To verify this fix:

1. Simulate a connection loss that triggers polling fallback
2. Trigger a poll failure (e.g., network error)
3. Verify that `scheduleRetry` is called and retries are scheduled with exponential backoff
4. Verify that polling continues until connection is restored

## Related Documentation

- [Data Freshness Realtime Callback Fix](./DATA_FRESHNESS_REALTIME_CALLBACK_FIX.md)
- [Polling Fallback Implementation](../guides/POLLING_FALLBACK_GUIDE.md)
