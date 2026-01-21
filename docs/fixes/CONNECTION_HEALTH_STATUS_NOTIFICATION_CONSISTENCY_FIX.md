---
title: Connection Health Status Notification Consistency Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-21
review_interval_days: 90
related_code:
  - src/hooks/useConnectionHealth.ts
  - src/types/connectionHealth.ts
  - src/__tests__/hooks/useConnectionHealth.property.test.ts
---

# Connection Health Status Notification Consistency Fix

## Issue

Status change notifications were emitted inconsistently because `scheduleReconnect()` called `onStatusChange()` directly instead of using the shared `updateStatus()` helper.

**Location:** `src/hooks/useConnectionHealth.ts`, lines 139-192

**Problem:**
- `markConnected()` and `markDisconnected()` use `updateStatus()` helper
- `scheduleReconnect()` called `setState()` directly and then `onStatusChange?.('reconnecting')`
- Max-attempts failure path also called `setState()` directly
- Creates maintenance issues - changes to `updateStatus()` logic don't apply to `scheduleReconnect()`

## Root Cause

```typescript
// BEFORE (inconsistent notification pattern)
// In markConnected/markDisconnected:
updateStatus('connected', { /* state */ });

// In scheduleReconnect:
setState((prev) => ({ ...prev, status: 'reconnecting', /* state */ }));
onStatusChange?.('reconnecting');  // Direct call instead of via helper
```

## Solution

Use the shared `updateStatus()` helper consistently throughout:

```typescript
// AFTER (consistent notification pattern)
// In scheduleReconnect:
updateStatus('reconnecting', {
  reconnectAttempt: attempt,
  nextReconnectAt,
});

// In max-attempts failure:
updateStatus('disconnected', {
  error,
  nextReconnectAt: null,
});
```

## Changes Made

1. Replaced `setState()` + `onStatusChange?.()` with `updateStatus()` in `scheduleReconnect()`
2. Replaced `setState()` with `updateStatus()` in max-attempts failure path
3. All status changes now go through single helper function

## Test Results

✅ All 13 property tests passing
- Exponential backoff calculation tests: 8/8 passing
- Boundary condition tests: 5/5 passing

## Verification

The fix ensures:
- All status changes use consistent `updateStatus()` helper
- Single source of truth for status notification logic
- Future changes to `updateStatus()` apply everywhere
- Easier to maintain and debug status change flow

## Related Requirements

- **Requirement 1.4:** Status change callbacks
- **Requirement 2.1:** Automatic reconnection with exponential backoff
- **Requirement 2.5:** Maximum reconnection attempts limit
