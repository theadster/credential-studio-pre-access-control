---
title: Connection Health Zero Max Attempts Fix
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

# Connection Health Zero Max Attempts Fix

## Issue

The `reconnect()` function could trigger the max-attempts failure path even when `maxReconnectAttempts` is configured to 0 (no automatic retries expected).

**Location:** `src/hooks/useConnectionHealth.ts`, lines 139-192

**Problem:**
- `reconnect()` calls `scheduleReconnect(1)` for manual reconnection
- `scheduleReconnect` checks `if (attempt > maxReconnectAttempts)`
- When `maxReconnectAttempts = 0`, the check `1 > 0` is TRUE
- This immediately triggers the max-attempts failure path, preventing manual reconnection

## Root Cause

```typescript
// BEFORE (no guard for zero config)
if (attempt > maxReconnectAttempts) {
  // Triggers failure even for manual reconnect when maxReconnectAttempts = 0
  const error = new Error(`Maximum reconnection attempts (${maxReconnectAttempts}) reached`);
  onReconnectFailure?.(error);
  return;
}
```

## Solution

Add a guard to only enforce the limit when `maxReconnectAttempts > 0`:

```typescript
// AFTER (with zero config guard)
if (attempt > maxReconnectAttempts && maxReconnectAttempts > 0) {
  // Only triggers failure if limit is configured and exceeded
  const error = new Error(`Maximum reconnection attempts (${maxReconnectAttempts}) reached`);
  onReconnectFailure?.(error);
  return;
}
```

## Changes Made

1. Added condition: `&& maxReconnectAttempts > 0`
2. Allows manual reconnection even when `maxReconnectAttempts = 0`
3. Preserves limit enforcement when configured

## Test Results

✅ All 13 property tests passing
- Exponential backoff calculation tests: 8/8 passing
- Boundary condition tests: 5/5 passing

## Verification

The fix ensures:
- Manual `reconnect()` works regardless of `maxReconnectAttempts` setting
- Max attempts limit only enforced when configured (> 0)
- Zero configuration allows unlimited manual reconnection attempts
- Automatic retry limits still respected when configured

## Related Requirements

- **Requirement 2.1:** Automatic reconnection with exponential backoff
- **Requirement 2.5:** Maximum reconnection attempts limit
- **Requirement 2.6:** Manual reconnection trigger
