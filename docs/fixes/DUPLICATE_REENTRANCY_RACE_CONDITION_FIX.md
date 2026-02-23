---
title: Duplicate Operation Reentrancy Race Condition Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-02-23
review_interval_days: 90
related_code:
  - src/pages/dashboard.tsx
---

# Duplicate Operation Reentrancy Race Condition Fix

## Issue

The `handleDuplicateAttendee` function had a race condition in its reentrancy guard. Multiple duplicate operations could start simultaneously if clicks occurred between the check and the state update.

**The Problem:**
- Line 2527: Checks `if (duplicatingAttendee) return;`
- Line 2529: Then calls `setDuplicatingAttendee(sourceAttendee.id)`
- **Race condition**: Between the check and state update, another click could pass the check
- This is a classic TOCTOU (Time-of-Check-Time-of-Use) race condition
- Result: Multiple duplicate operations could run concurrently

## Root Cause

The reentrancy guard relied on React state, which is asynchronous. The check and update were not atomic, creating a window where multiple calls could pass the check before any state update took effect.

## Solution

Added a synchronous ref to track reentrancy state alongside the React state:

```typescript
// BEFORE (buggy - race condition)
if (duplicatingAttendee) return;  // Check
setDuplicatingAttendee(sourceAttendee.id);  // Update (async)

// AFTER (fixed - synchronous check)
if (duplicatingAttendeeRef.current) return;  // Synchronous check
duplicatingAttendeeRef.current = sourceAttendee.id;  // Synchronous update
setDuplicatingAttendee(sourceAttendee.id);  // Also update state for UI
```

The ref provides synchronous, atomic check-and-set semantics, preventing the race condition while maintaining UI state for the disabled button.

## Impact

- **Scope**: Duplicate attendee operation
- **Severity**: High - Race condition could cause duplicate API calls and data inconsistency
- **User-facing**: Yes - Prevents multiple concurrent duplications
- **Performance**: None - No performance impact

## Testing

Verify the fix by:
1. Rapidly click Duplicate on the same attendee multiple times
2. Confirm only one duplication operation starts
3. Confirm subsequent clicks are blocked until the first completes
4. Verify the button remains disabled during the operation
