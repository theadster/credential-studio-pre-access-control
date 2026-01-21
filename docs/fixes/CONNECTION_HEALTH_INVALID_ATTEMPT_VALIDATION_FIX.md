---
title: Connection Health Invalid Attempt Validation Fix
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

# Connection Health Invalid Attempt Validation Fix

## Issue

The `scheduleReconnect` function accepted non-positive attempt values (0 or negative), which caused incorrect state tracking and potential infinite loops.

**Location:** `src/hooks/useConnectionHealth.ts`, lines 139-186

**Problem:** 
- Function accepted `attempt: number` with no validation
- Non-positive attempts would pass through to `reconnectAttemptRef.current = attempt`
- `calculateBackoff(attempt)` would return `initialBackoff` for attempt < 1, but state would be set to invalid value
- This could cause infinite reconnection loops or incorrect attempt tracking

## Root Cause

```typescript
// BEFORE (no validation)
const scheduleReconnect = useCallback(
  (attempt: number) => {
    if (!isMountedRef.current) return;
    
    // No check for attempt < 1
    if (attempt > maxReconnectAttempts) { /* ... */ }
    
    reconnectAttemptRef.current = attempt; // Could be 0 or negative
    // ...
  }
);
```

## Solution

Add validation to reject non-positive attempt values:

```typescript
// AFTER (with validation)
const scheduleReconnect = useCallback(
  (attempt: number) => {
    if (!isMountedRef.current) return;

    // Validate attempt is positive (Requirement 2.1)
    if (attempt < 1) {
      console.warn('scheduleReconnect called with invalid attempt:', attempt);
      return;
    }

    // Check max attempts limit (Requirement 2.5)
    if (attempt > maxReconnectAttempts) { /* ... */ }
    
    reconnectAttemptRef.current = attempt; // Now guaranteed >= 1
    // ...
  }
);
```

## Changes Made

1. Added validation check: `if (attempt < 1) return`
2. Added console warning for debugging invalid calls
3. Validation occurs before any state updates

## Test Results

✅ All 13 property tests passing
- Exponential backoff calculation tests: 8/8 passing
- Boundary condition tests: 5/5 passing

## Verification

The fix ensures:
- `scheduleReconnect` only accepts valid attempt numbers (>= 1)
- Invalid calls are rejected early with warning
- State is never set to invalid attempt values
- Reconnection loop cannot be triggered by invalid attempts

## Related Requirements

- **Requirement 2.1:** Automatic reconnection with exponential backoff
- **Requirement 2.5:** Maximum reconnection attempts limit
- **Property 5:** Exponential Backoff Calculation - validates backoff formula correctness
