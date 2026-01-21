---
title: Connection Indicator Green State Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-19
review_interval_days: 90
related_code:
  - src/pages/dashboard.tsx
  - src/hooks/useConnectionHealth.ts
  - src/hooks/useRealtimeSubscription.ts
  - src/components/ConnectionStatusIndicator.tsx
  - src/types/connectionHealth.ts
---

# Connection Indicator Green State Fix

## Problem

The ConnectionStatusIndicator was stuck in yellow "connecting" state instead of turning green when the WebSocket connection was successfully established. This was caused by `markConnected()` never being called on the connection health hook.

## Root Cause

The original infinite loop fix removed `connectionHealth` from the subscription props to prevent cascading re-renders. However, this also prevented `markConnected()` from being called when the subscription successfully connected.

The challenge: We need to call `markConnected()` when connected, but we can't pass `connectionHealth` as a prop because it changes on every render and causes infinite loops.

## Solution

Added new callback props to `useRealtimeSubscription` that allow calling connection health methods via refs:

### Step 1: Add `onConnected` and `onDisconnected` Callbacks

Added new props to `RealtimeSubscriptionOptions`:

```typescript
// src/hooks/useRealtimeSubscription.ts
export interface RealtimeSubscriptionOptions<T> {
  // ... existing props ...
  
  /**
   * Callback fired when subscription successfully connects
   * Use this to call connectionHealth.markConnected() via a ref
   */
  onConnected?: () => void;
  
  /**
   * Callback fired when subscription disconnects
   */
  onDisconnected?: (error?: Error) => void;
}
```

### Step 2: Update Type Definitions

Added `ConnectionHealthInternal` interface and `_internal` property to `UseConnectionHealthReturn`:

```typescript
// src/types/connectionHealth.ts
export interface ConnectionHealthInternal {
  markConnected: () => void;
  markDisconnected: (error?: Error) => void;
  handleReconnectSuccess: () => void;
  handleReconnectFailure: (error?: Error) => void;
  scheduleReconnect: (attempt: number) => void;
}

export interface UseConnectionHealthReturn {
  // ... existing props ...
  _internal?: ConnectionHealthInternal;
}
```

### Step 3: Use Callbacks in Dashboard

Updated all subscription calls to use the new `onConnected` callback with refs:

```typescript
// src/pages/dashboard.tsx
useRealtimeSubscription({
  channels: [...],
  callback: useCallback((response: any) => {
    debouncedRefreshAttendees();
    attendeesFreshnessRef.current?.markFresh();
  }, [debouncedRefreshAttendees]),
  enabled: isPageVisible && activeTab === 'attendees',
  onConnected: useCallback(() => {
    connectionHealthRef.current?._internal?.markConnected();
  }, []),  // Empty deps - uses ref
});
```

## Why This Works

1. The `onConnected` callback has empty dependencies (`[]`), so it never changes
2. Inside the callback, we access `connectionHealthRef.current` which always has the latest value
3. The subscription effect doesn't re-run because `onConnected` is stable
4. When the WebSocket connects, `onConnected` is called, which calls `markConnected()` via the ref
5. This updates the connection state to "connected" without causing re-renders that trigger the effect

## Changes Made

**File: `src/types/connectionHealth.ts`**
- Added `ConnectionHealthInternal` interface
- Added `_internal` property to `UseConnectionHealthReturn`

**File: `src/hooks/useConnectionHealth.ts`**
- Removed type assertion (no longer needed)

**File: `src/hooks/useRealtimeSubscription.ts`**
- Added `onConnected` and `onDisconnected` props
- Added `stableOnConnected` and `stableOnDisconnected` memoized callbacks
- Updated subscription logic to prefer new callbacks over deprecated `connectionHealth` prop
- Marked `connectionHealth` and `dataFreshness` props as deprecated

**File: `src/pages/dashboard.tsx`**
- Removed duplicate `connectionHealthRef` declaration
- Updated all 5 subscriptions to use `onConnected` callback instead of `connectionHealth` prop

## Testing

- ✅ All 82 tests pass
- ✅ TypeScript compiles without errors
- ✅ Build succeeds
- ✅ No infinite loop regression

## Verification Steps

To verify the fix works:

1. Load the dashboard
2. Observe the ConnectionStatusIndicator in the top-right
3. It should show a green dot with "Wifi" icon when connected
4. It should show yellow dot with pulsing animation while connecting
5. It should show red dot with "Disconnected" text when disconnected

## Follow-up Fix

After this fix was applied, another issue was discovered: the realtime callbacks were calling `markFresh()` immediately after triggering the debounced refresh, which could mark data as fresh even when the fetch failed.

See: `docs/fixes/DATA_FRESHNESS_REALTIME_CALLBACK_FIX.md` for the resolution, which moved `markFresh()` calls into the refresh functions so they only execute after successful fetch completion.

## Related Documentation

- `.kiro/specs/data-refresh-monitoring/design.md` - Feature design
- `.kiro/specs/data-refresh-monitoring/requirements.md` - Feature requirements
- `docs/enhancements/DATA_REFRESH_MONITORING.md` - Feature overview
- `docs/fixes/DATA_REFRESH_MONITORING_INFINITE_LOOP_FIX.md` - Previous infinite loop fix (this fix resolves the follow-up issue from that fix)
- `docs/fixes/DATA_FRESHNESS_REALTIME_CALLBACK_FIX.md` - Follow-up fix for freshness marking timing
