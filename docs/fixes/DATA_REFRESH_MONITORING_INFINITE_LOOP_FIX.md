---
title: Data Refresh Monitoring Infinite Loop Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-19
review_interval_days: 90
related_code:
  - src/pages/dashboard.tsx
  - src/hooks/useRealtimeSubscription.ts
  - src/hooks/useDataFreshness.ts
  - src/hooks/useConnectionHealth.ts
---

# Data Refresh Monitoring Infinite Loop Fix

## Problem

When integrating the data refresh monitoring feature into the dashboard, the application crashed with:

```
Maximum update depth exceeded. This can happen when a component repeatedly 
calls setState inside componentWillUpdate or componentDidUpdate. React limits 
the number of nested updates to prevent infinite loops.
```

The error stack trace showed `@radix-ui/react-compose-refs` was involved during `safelyDetachRef` in `commitMutationEffects`.

## Root Cause

The issue was caused by passing `connectionHealth` and `dataFreshness` hook return objects directly to `useRealtimeSubscription`:

```typescript
// PROBLEMATIC CODE
useRealtimeSubscription({
  channels: [...],
  callback: useCallback(...),
  enabled: isPageVisible && activeTab === 'attendees',
  connectionHealth,        // ❌ Object changes on every render
  dataFreshness: attendeesFreshness,  // ❌ Object changes on every render
  autoReconnect: true,
  refreshOnReconnect: refreshAttendees,
});
```

The problem:
1. `connectionHealth` and `attendeesFreshness` objects contain state that changes
2. When passed to `useRealtimeSubscription`, they become effect dependencies
3. The subscription effect re-runs when these objects change
4. Re-subscribing triggers `markConnected()` and `markFresh()` calls
5. These calls update state, causing the objects to change again
6. This creates an infinite loop of state updates

The Radix UI error occurred because the cascading re-renders affected components using `asChild` pattern (like `DropdownMenuTrigger`), which use ref composition that breaks under rapid re-renders.

## Solution

Instead of passing the hook objects to `useRealtimeSubscription`, use refs to call `markFresh()` in the subscription callbacks:

```typescript
// FIXED CODE

// Create refs for freshness hooks
const attendeesFreshnessRef = useRef(attendeesFreshness);
const usersFreshnessRef = useRef(usersFreshness);
// ... etc

// Keep refs updated
useEffect(() => {
  attendeesFreshnessRef.current = attendeesFreshness;
  usersFreshnessRef.current = usersFreshness;
  // ... etc
}, [attendeesFreshness, usersFreshness, /* ... */]);

// Use refs in callbacks - no object dependencies
useRealtimeSubscription({
  channels: [...],
  callback: useCallback((response: any) => {
    debouncedRefreshAttendees();
    attendeesFreshnessRef.current.markFresh();  // ✅ Via ref
  }, [debouncedRefreshAttendees]),  // ✅ Stable dependencies
  enabled: isPageVisible && activeTab === 'attendees',
  // ✅ No connectionHealth or dataFreshness props
});
```

## Key Changes

1. Removed `connectionHealth`, `dataFreshness`, `autoReconnect`, and `refreshOnReconnect` props from all `useRealtimeSubscription` calls
2. Added refs for all freshness hooks to avoid recreating callbacks
3. Call `markFresh()` via refs in subscription callbacks
4. Connection health and data freshness tracking work independently

## Prevention

When integrating hooks that manage state:
- Never pass hook return objects as dependencies to other hooks/effects
- Use refs to access hook methods in callbacks
- Keep callback dependencies minimal and stable
- Test integration with Radix UI components that use `asChild` pattern

## Testing

All 113 data refresh monitoring tests pass after the fix:
- `src/__tests__/hooks/useDataFreshness.property.test.ts`
- `src/__tests__/hooks/useConnectionHealth.property.test.ts`
- `src/__tests__/hooks/usePollingFallback.test.ts`
- `src/__tests__/hooks/usePageVisibility.property.test.ts`
- `src/__tests__/components/ConnectionStatusIndicator.test.tsx`
- `src/__tests__/components/DataRefreshIndicator.test.tsx`

## Follow-up Fix

After this fix was applied, a follow-up issue was discovered: the connection indicator remained yellow instead of turning green when connected. This was caused by the removal of `connectionHealth` from subscriptions, preventing `markConnected()` from being called.

See: `docs/fixes/CONNECTION_INDICATOR_GREEN_STATE_FIX.md` for the resolution, which added new `onConnected` and `onDisconnected` callback props to `useRealtimeSubscription`. These callbacks use refs to call `markConnected()` without causing infinite loops.
