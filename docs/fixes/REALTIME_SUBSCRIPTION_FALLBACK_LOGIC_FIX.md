---
title: Realtime Subscription Fallback Logic Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-21
review_interval_days: 90
related_code: ["src/hooks/useRealtimeSubscription.ts", "src/types/connectionHealth.ts"]
---

# Realtime Subscription Fallback Logic Fix

## Problem

In `src/hooks/useRealtimeSubscription.ts`, the conditional checks for connection/disconnection handlers were testing the always-defined `useCallback` wrappers (`stableOnConnected` and `stableOnDisconnected`) instead of the original optional props (`onConnected` and `onDisconnected`). This prevented the fallback to `connectionHealth._internal` from ever executing.

### Root Cause

The hook creates stable callback wrappers using `useCallback`:

```typescript
const stableOnConnected = useCallback(() => onConnected?.(), [onConnected]);
const stableOnDisconnected = useCallback((error?: Error) => onDisconnected?.(error), [onDisconnected]);
```

Then checked these wrappers in the conditionals:

```typescript
// ❌ WRONG: stableOnConnected is always defined (it's a function)
if (stableOnConnected) {
  stableOnConnected();
} else if (connectionHealth?._internal) {
  // This fallback never runs!
  connectionHealth._internal.markConnected();
}
```

Since `stableOnConnected` and `stableOnDisconnected` are always defined (they're function objects), the condition always evaluates to `true`, making the fallback unreachable.

## Solution

Changed the conditionals to check the original optional props instead:

```typescript
// ✅ CORRECT: Check if the caller provided the handler
if (onConnected) {
  stableOnConnected();
} else if (connectionHealth?._internal) {
  // Fallback is now reachable
  connectionHealth._internal.markConnected();
}
```

### Changes Made

#### 1. Connection Handler (Line ~139)

**Before:**
```typescript
if (stableOnConnected) {
  stableOnConnected();
} else if (connectionHealth?._internal) {
  connectionHealth._internal.markConnected();
}
```

**After:**
```typescript
if (onConnected) {
  stableOnConnected();
} else if (connectionHealth?._internal) {
  connectionHealth._internal.markConnected();
}
```

#### 2. Disconnection Handler (Line ~167)

**Before:**
```typescript
if (stableOnDisconnected) {
  stableOnDisconnected(subscriptionError);
} else if (connectionHealth?._internal) {
  connectionHealth._internal.markDisconnected(subscriptionError);
}
```

**After:**
```typescript
if (onDisconnected) {
  stableOnDisconnected(subscriptionError);
} else if (connectionHealth?._internal) {
  connectionHealth._internal.markDisconnected(subscriptionError);
}
```

## Impact

- **Correctness**: Fallback to `connectionHealth._internal` now works as intended
- **Backward Compatibility**: Maintained - deprecated `connectionHealth` prop still works when new callbacks aren't provided
- **Migration Path**: Callers can gradually migrate from passing `connectionHealth` to using `onConnected`/`onDisconnected` callbacks

## Files Modified

- `src/hooks/useRealtimeSubscription.ts` - Fixed conditional logic in connection/disconnection handlers

## Testing

To verify this fix:

1. Use `useRealtimeSubscription` without providing `onConnected`/`onDisconnected` callbacks
2. Verify that `connectionHealth._internal.markConnected()` is called when subscription connects
3. Verify that `connectionHealth._internal.markDisconnected()` is called when subscription disconnects
4. Verify that providing `onConnected`/`onDisconnected` callbacks takes precedence over the fallback

## Related Documentation

- [Data Freshness Realtime Callback Fix](./DATA_FRESHNESS_REALTIME_CALLBACK_FIX.md)
- [Connection Health Monitoring](../guides/CONNECTION_HEALTH_MONITORING.md)
