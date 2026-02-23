---
title: Event Settings 204 No Content State Clear Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-02-23
review_interval_days: 90
related_code:
  - src/pages/dashboard.tsx
---

# Event Settings 204 No Content State Clear Fix

## Issue

When the `/api/event-settings` endpoint returned a 204 No Content response, the `refreshEventSettings` callback in the Dashboard component failed to clear the `eventSettings` state. This caused stale event settings data to persist in the UI even when the backend indicated no content was available.

## Root Cause

In the `refreshEventSettings` function (line 467-493 of `src/pages/dashboard.tsx`), the 204 No Content response handler only marked the data as fresh but did not clear the state:

```typescript
// BEFORE (buggy)
if (settingsResponse.status === 204) {
  settingsFreshnessRef.current?.markFresh();
  return;  // Returns without clearing state
}
```

This left the previous `eventSettings` value in state, violating the HTTP 204 semantics where "No Content" means the resource has no data.

## Solution

Added `setEventSettings(null)` to properly clear the state when receiving a 204 response:

```typescript
// AFTER (fixed)
if (settingsResponse.status === 204) {
  setEventSettings(null);  // Clear stale data
  settingsFreshnessRef.current?.markFresh();
  return;
}
```

## Impact

- **Scope**: Dashboard component event settings state management
- **Severity**: Medium - Affects UI consistency when event settings are cleared
- **User-facing**: Yes - Users may see outdated event settings in the UI
- **Performance**: None - No performance impact

## Testing

Verify the fix by:
1. Ensuring the `/api/event-settings` endpoint can return 204 No Content
2. Confirming that `eventSettings` state becomes `null` after receiving 204
3. Verifying UI components that depend on `eventSettings` handle `null` gracefully

## Related Issues

- Code review comment: "Possible Bug: 204 No Content response does not clear eventSettings state"
- Lines flagged: 466-493 in `src/pages/dashboard.tsx`
