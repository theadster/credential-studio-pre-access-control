---
title: Max Retries Alert Dynamic Configuration Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-21
review_interval_days: 90
related_code: ["src/pages/dashboard.tsx", "src/hooks/useConnectionHealth.ts", "src/types/connectionHealth.ts", "src/lib/connectionNotifications.ts"]
---

# Max Retries Alert Dynamic Configuration Fix

## Problem

The `onReconnectFailure` handler in `src/pages/dashboard.tsx` was hard-coding `attemptsMade: 10` when calling `showMaxRetriesAlert()`. This meant the alert always displayed "10 attempts" regardless of the actual configured maximum retry limit in the connection health hook, making the alert misleading if the configuration changed.

### Root Cause

The callback was structured like this:

```typescript
onReconnectFailure: useCallback((_error: Error) => {
  showMaxRetriesAlert({
    attemptsMade: 10,  // ❌ Hard-coded value
    onReconnect: () => connectionHealthRef.current?.reconnect(),
    isDark: isDarkRef.current,
  });
}, []),
```

The `maxReconnectAttempts` value was only available in the hook's options but wasn't exposed in the return value, making it inaccessible to the dashboard component.

## Solution

Exposed `maxReconnectAttempts` in the `UseConnectionHealthReturn` type and updated the hook to return this value, allowing the dashboard to derive the actual configured limit.

### Changes Made

#### 1. Updated Type Definition

Added `maxReconnectAttempts` property to `UseConnectionHealthReturn`:

```typescript
// src/types/connectionHealth.ts
export interface UseConnectionHealthReturn {
  state: ConnectionState;
  reconnect: () => void;
  resetBackoff: () => void;
  isHealthy: boolean;
  maxReconnectAttempts: number;  // ✅ New property
  _internal?: ConnectionHealthInternal;
}
```

#### 2. Updated Hook Return Value

Modified `useConnectionHealth` to return the configured `maxReconnectAttempts`:

```typescript
// src/hooks/useConnectionHealth.ts
return {
  state,
  reconnect,
  resetBackoff,
  isHealthy: state.status === 'connected',
  maxReconnectAttempts,  // ✅ Now exposed
  _internal: { /* ... */ },
};
```

#### 3. Updated Dashboard Callback

Changed the `onReconnectFailure` handler to derive `attemptsMade` from the connection health hook:

```typescript
// src/pages/dashboard.tsx
onReconnectFailure: useCallback((_error: Error) => {
  // Derive attemptsMade from the connection health hook's maxReconnectAttempts
  // Falls back to 0 if undefined (defensive programming)
  const attemptsMade = connectionHealthRef.current?.maxReconnectAttempts ?? 0;
  showMaxRetriesAlert({
    attemptsMade,  // ✅ Dynamic value from hook config
    onReconnect: () => connectionHealthRef.current?.reconnect(),
    isDark: isDarkRef.current,
  });
}, []),
```

## Impact

- **Accuracy**: The max retries alert now always reflects the actual configured retry limit
- **Maintainability**: If `CONNECTION_HEALTH.MAX_RECONNECT_ATTEMPTS` is changed, the alert automatically uses the new value
- **Flexibility**: Supports custom `maxReconnectAttempts` passed to the hook via options
- **Robustness**: Includes defensive fallback to 0 if the value is undefined

## Files Modified

- `src/types/connectionHealth.ts` - Added `maxReconnectAttempts` to return type
- `src/hooks/useConnectionHealth.ts` - Exposed `maxReconnectAttempts` in return value
- `src/pages/dashboard.tsx` - Updated `onReconnectFailure` to use dynamic value

## Testing

To verify this fix:

1. Open the dashboard and observe the connection status
2. Simulate a network failure that exhausts all reconnection attempts
3. Verify the max retries alert displays the correct attempt count
4. If you modify `CONNECTION_HEALTH.MAX_RECONNECT_ATTEMPTS` in constants, verify the alert reflects the new value

## Related Documentation

- [Connection Health Monitoring](../guides/CONNECTION_HEALTH_MONITORING.md)
- [Data Refresh Monitoring](../enhancements/DATA_REFRESH_MONITORING.md)
- [Connection Indicator Green State Fix](./CONNECTION_INDICATOR_GREEN_STATE_FIX.md)
