---
title: Connection Health Stale Attempt Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-21
review_interval_days: 90
related_code: ["src/hooks/useConnectionHealth.ts", "src/__tests__/hooks/useConnectionHealth.test.ts"]
---

# Connection Health Stale Attempt Fix

## Problem

In `src/hooks/useConnectionHealth.ts`, the `handleReconnectFailure` function was reading `state.reconnectAttempt` to compute the next attempt number. However, under rapid successive failures, `handleReconnectFailure` could be called before the React state update from the previous `scheduleReconnect` takes effect. This caused the function to read a stale attempt count, leading to duplicate or skipped reconnection attempts.

### Root Cause

The timing issue:

```typescript
// ❌ WRONG: Reads stale state
const handleReconnectFailure = useCallback(
  (error?: Error) => {
    const nextAttempt = state.reconnectAttempt + 1;  // Stale value!
    scheduleReconnect(nextAttempt);
  },
  [state.reconnectAttempt, scheduleReconnect]
);

// Rapid failures:
// 1. handleReconnectFailure called, reads state.reconnectAttempt = 0
// 2. scheduleReconnect(1) called, setState updates state
// 3. handleReconnectFailure called again before state update takes effect
// 4. Still reads state.reconnectAttempt = 0, computes nextAttempt = 1 again
// Result: Attempt 1 scheduled twice, attempt 2 never scheduled
```

## Solution

Introduced a synchronous ref (`reconnectAttemptRef`) to track the current attempt number. The ref is updated immediately in `scheduleReconnect`, ensuring `handleReconnectFailure` always reads the current attempt:

```typescript
// ✅ CORRECT: Reads ref instead of state
const handleReconnectFailure = useCallback(
  (error?: Error) => {
    const nextAttempt = reconnectAttemptRef.current + 1;  // Current value!
    scheduleReconnect(nextAttempt);
  },
  [scheduleReconnect]
);

// Rapid failures now work correctly:
// 1. handleReconnectFailure called, reads reconnectAttemptRef.current = 0
// 2. scheduleReconnect(1) called, sets reconnectAttemptRef.current = 1 immediately
// 3. handleReconnectFailure called again
// 4. Reads reconnectAttemptRef.current = 1, computes nextAttempt = 2
// Result: Attempts 1, 2, 3... scheduled correctly
```

### Changes Made

#### 1. Added `reconnectAttemptRef` (Line 68)

```typescript
const reconnectAttemptRef = useRef(0);
```

#### 2. Updated `markConnected` (Lines 88-99)

- Reset `reconnectAttemptRef.current = 0` when connection succeeds

#### 3. Updated `scheduleReconnect` (Lines 137-177)

- Set `reconnectAttemptRef.current = attempt` immediately before state update
- Reset ref to 0 when max attempts exceeded

#### 4. Updated `handleReconnectFailure` (Lines 197-205)

- Changed from `state.reconnectAttempt + 1` to `reconnectAttemptRef.current + 1`
- Removed `state.reconnectAttempt` from dependency array

#### 5. Updated `resetBackoff` (Lines 207-216)

- Reset `reconnectAttemptRef.current = 0` when backoff is reset

## Impact

- **Correctness**: Reconnection attempts are now scheduled reliably without duplicates or skips
- **Consistency**: `reconnectAttemptRef` and `reconnectAttempt` state are always in sync
- **Performance**: Reduced dependency array size in `handleReconnectFailure`
- **Reliability**: Exponential backoff works correctly under rapid successive failures

## Files Modified

- `src/hooks/useConnectionHealth.ts` - Added ref and updated all attempt tracking

## Testing

To verify this fix:

1. Simulate rapid successive connection failures
2. Verify that reconnection attempts increment correctly (1, 2, 3, etc.)
3. Verify that no attempts are skipped or duplicated
4. Verify that exponential backoff delays increase correctly with each attempt

## Related Documentation

- [Polling Fallback Stale State Fix](./POLLING_FALLBACK_STALE_STATE_FIX.md)
- [Realtime Subscription Fallback Logic Fix](./REALTIME_SUBSCRIPTION_FALLBACK_LOGIC_FIX.md)
