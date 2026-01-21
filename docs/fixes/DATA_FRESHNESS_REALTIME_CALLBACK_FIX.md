---
title: Data Freshness Realtime Callback Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-21
review_interval_days: 90
related_code: ["src/pages/dashboard.tsx", "src/hooks/useDataFreshness.ts"]
---

# Data Freshness Realtime Callback Fix

## Problem

The realtime callbacks in `src/pages/dashboard.tsx` were calling `markFresh()` immediately after triggering `debouncedRefreshAttendees()`, `debouncedRefreshUsers()`, `debouncedRefreshRoles()`, and `debouncedRefreshEventSettings()`. This caused the data freshness state to be marked as "fresh" even when the subsequent fetch failed, leading to incorrect freshness indicators in the UI.

### Root Cause

The callbacks were structured like this:

```typescript
callback: useCallback((response: any) => {
  console.log('Attendee change received!', response);
  debouncedRefreshAttendees();
  attendeesFreshnessRef.current?.markFresh();  // ❌ Called immediately, before fetch completes
}, [debouncedRefreshAttendees]),
```

Since `debouncedRefreshAttendees()` is a debounced function that doesn't return a promise, the `markFresh()` call happened immediately without waiting for the actual data fetch to complete. If the fetch failed, the freshness state would still be marked as fresh, creating a false positive.

## Solution

Moved the `markFresh()` calls into the refresh functions themselves, so they only execute after a successful fetch:

### Changes Made

#### 1. Updated Refresh Functions

Each refresh function now calls `markFresh()` only after a successful fetch:

```typescript
const refreshAttendees = useCallback(async () => {
  try {
    const attendeesResponse = await fetch('/api/attendees');
    if (attendeesResponse.ok) {
      // ... parse and set data ...
      // Mark freshness only after successful fetch
      attendeesFreshnessRef.current?.markFresh();
    } else {
      setAttendees([]);
    }
  } catch (error) {
    console.error('Error refreshing attendees:', error);
    setAttendees([]);
  }
}, []);
```

Applied to:
- `refreshAttendees()`
- `refreshUsers()`
- `refreshRoles()`
- `refreshEventSettings()`

#### 2. Updated Realtime Callbacks

Removed the immediate `markFresh()` calls from all realtime subscription callbacks:

```typescript
useRealtimeSubscription({
  channels: [`databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID}.documents`],
  callback: useCallback((response: any) => {
    console.log('Attendee change received!', response);
    debouncedRefreshAttendees();
    // ✅ markFresh() removed - now called in refreshAttendees() after successful fetch
  }, [debouncedRefreshAttendees]),
  enabled: isPageVisible && activeTab === 'attendees',
  onConnected: useCallback(() => {
    connectionHealthRef.current?._internal?.markConnected();
  }, []),
});
```

Applied to:
- Attendees subscription
- Users subscription
- Roles subscription
- Event settings subscription

## Impact

- **Correctness**: Freshness state now accurately reflects whether data was successfully fetched
- **User Experience**: The data refresh indicator will only show "fresh" when data is actually up-to-date
- **Reliability**: Failed fetches no longer create false positive freshness states

## Files Modified

- `src/pages/dashboard.tsx` - Updated refresh functions and realtime callbacks

## Testing

To verify this fix:

1. Open the dashboard and navigate to the attendees tab
2. Trigger a realtime update (e.g., add/edit an attendee from another session)
3. Observe that the data refresh indicator correctly reflects the fetch status
4. Simulate a network failure and verify that freshness is not marked as fresh on failure

## Related Documentation

- [Data Refresh Monitoring](../guides/DATA_REFRESH_MONITORING.md)
- [Connection Health Monitoring](../guides/CONNECTION_HEALTH_MONITORING.md)
