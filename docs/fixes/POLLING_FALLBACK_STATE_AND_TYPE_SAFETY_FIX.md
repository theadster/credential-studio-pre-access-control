---
title: Polling Fallback State and Type Safety Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-21
review_interval_days: 90
related_code: ["src/pages/dashboard.tsx", "src/hooks/usePollingFallback.ts", "src/types/connectionHealth.ts"]
---

# Polling Fallback State and Type Safety Fix

## Problem

The polling fallback implementation had two issues:

1. **Inefficient Computation**: `isDisconnectedLong` was computed inline on every render using `Date.now()`, recalculating the elapsed time even when nothing had changed
2. **Type Unsafety**: `activeTab` was being unsafely cast to `DataType` using `as`, which could pass invalid values to `usePollingFallback` if the tab name didn't match a valid data type

### Root Cause

The original implementation:

```typescript
// ❌ Computed on every render
const isDisconnectedLong = connectionHealth.state.status === 'disconnected' &&
  connectionHealth.state.lastDisconnectedAt !== null &&
  (Date.now() - connectionHealth.state.lastDisconnectedAt.getTime()) > DATA_FRESHNESS.POLLING_ACTIVATION_DELAY;

// ❌ Unsafe type cast
usePollingFallback({
  enabled: isDisconnectedLong,
  dataType: activeTab as 'attendees' | 'users' | 'roles' | 'settings' | 'logs',
  onPoll: useCallback(async () => {
    const freshness = getActiveFreshness();
    await freshness.refresh();
  }, [getActiveFreshness]),
});
```

This approach:
- Recalculated elapsed time on every render
- Didn't properly handle the transition from "not yet polling" to "polling active"
- Used unsafe type casting that could hide bugs if tab names changed
- Didn't clean up timers properly

## Solution

Replaced inline computation with state-based tracking and added safe type mapping.

### Changes Made

#### 1. Added State for Polling Activation

```typescript
const [isPollingActive, setIsPollingActive] = useState(false);
```

#### 2. Created Safe Type Mapping Function

```typescript
const mapTabToDataType = (tab: string): 'attendees' | 'users' | 'roles' | 'settings' | 'logs' | undefined => {
  switch (tab) {
    case 'attendees':
      return 'attendees';
    case 'users':
      return 'users';
    case 'roles':
      return 'roles';
    case 'settings':
      return 'settings';
    case 'logs':
      return 'logs';
    default:
      return undefined;
  }
};
```

#### 3. Implemented Timer-Based Activation

```typescript
useEffect(() => {
  // Only set up timer if disconnected
  if (connectionHealth.state.status !== 'disconnected' || connectionHealth.state.lastDisconnectedAt === null) {
    // Clear polling if reconnected
    if (isPollingActive) {
      setIsPollingActive(false);
    }
    return;
  }

  // Calculate time elapsed since disconnection
  const timeSinceDisconnect = Date.now() - connectionHealth.state.lastDisconnectedAt.getTime();
  const timeUntilPolling = DATA_FRESHNESS.POLLING_ACTIVATION_DELAY - timeSinceDisconnect;

  // If already past the threshold, activate immediately
  if (timeUntilPolling <= 0) {
    setIsPollingActive(true);
    return;
  }

  // Otherwise, schedule activation after remaining delay
  const timer = setTimeout(() => {
    setIsPollingActive(true);
  }, timeUntilPolling);

  return () => clearTimeout(timer);
}, [connectionHealth.state.status, connectionHealth.state.lastDisconnectedAt, isPollingActive]);
```

#### 4. Updated usePollingFallback Call

```typescript
const pollingDataType = mapTabToDataType(activeTab);

usePollingFallback({
  enabled: isPollingActive && pollingDataType !== undefined,
  dataType: pollingDataType || 'attendees', // Fallback for type safety, won't be used if enabled is false
  onPoll: useCallback(async () => {
    const freshness = getActiveFreshness();
    await freshness.refresh();
  }, [getActiveFreshness]),
});
```

## Impact

- **Performance**: Polling activation is now computed once via state instead of on every render
- **Type Safety**: Invalid tab names are safely handled and won't cause polling to activate with wrong data types
- **Correctness**: Timer properly handles edge cases (already past threshold, reconnection, unmount)
- **Maintainability**: Explicit mapping makes it clear which tabs support polling

## Files Modified

- `src/pages/dashboard.tsx` - Added state, helper function, and timer-based activation logic

## Testing

To verify this fix:

1. Open the dashboard and disconnect the network
2. Wait 60 seconds and verify polling activates
3. Switch between tabs and verify polling uses the correct data type
4. Reconnect and verify polling deactivates
5. Add a new tab and verify it's handled safely (either mapped or polling doesn't activate)

## Related Documentation

- [Data Refresh Monitoring](../enhancements/DATA_REFRESH_MONITORING.md)
- [Polling Fallback Hook](../guides/MEMORY_OPTIMIZATION_GUIDE.md)
