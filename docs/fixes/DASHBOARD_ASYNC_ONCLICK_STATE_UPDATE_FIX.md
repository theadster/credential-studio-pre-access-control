---
title: Dashboard Async onClick Handler State Update Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/pages/dashboard.tsx
---

# Dashboard Async onClick Handler State Update Fix

## Problem

The "Add Attendee" button's onClick handler awaited a network call (`refreshEventSettings()`) before updating state. If the user navigated away or the component unmounted during the network call, React would emit a warning about state updates on unmounted components:

```
Warning: Can't perform a React state update on an unmounted component. 
This is a no-op, but it indicates a memory leak in your application.
```

## Root Cause

The handler was structured as:

```typescript
onClick={async () => {
  await refreshEventSettings();  // Network call
  setEditingAttendee(null);      // State update after await
  setShowAttendeeForm(true);     // State update after await
}}
```

If the component unmounted while waiting for `refreshEventSettings()` to complete, the subsequent `setState` calls would trigger the warning because React prevents state updates on unmounted components.

## Fix

Reordered operations to update state synchronously before any async operations:

```typescript
onClick={() => {
  setEditingAttendee(null);
  setShowAttendeeForm(true);
  refreshEventSettings().catch(err => console.error('Failed to refresh event settings:', err));
}}
```

**Key changes:**
1. Removed `async`/`await` from the onClick handler
2. Moved state updates to execute immediately (synchronously)
3. Called `refreshEventSettings()` without awaiting
4. Added error handling via `.catch()` to log failures

## Why This Works

- State updates happen synchronously before any async operations
- If the component unmounts, the state updates have already completed
- The network call continues in the background but doesn't trigger state updates
- No memory leak warnings because setState is never called on an unmounted component

## Impact

- Eliminates React warnings about state updates on unmounted components
- Improves perceived responsiveness (form opens immediately)
- Maintains data consistency (event settings refresh happens in background)
- No breaking changes to user experience

## Pattern

This pattern should be applied to any onClick handler that:
1. Awaits a network call
2. Updates state after the await
3. Could be unmounted before the call completes

**Correct pattern:**
```typescript
onClick={() => {
  // Update state first (synchronously)
  setState(value);
  // Then call async operations (without awaiting)
  asyncOperation().catch(err => console.error(err));
}}
```

**Incorrect pattern (avoid):**
```typescript
onClick={async () => {
  // ❌ Don't await before state updates
  await asyncOperation();
  setState(value);  // Risk of unmount warning
}}
```

