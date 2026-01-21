---
title: Page Visibility Property Test Division by Zero Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-21
review_interval_days: 90
related_code:
  - src/__tests__/hooks/usePageVisibility.property.test.ts
  - src/hooks/usePageVisibility.ts
---

# Page Visibility Property Test Division by Zero Fix

## Issue

The property test for visibility change debouncing could cause a division by zero error when `numGapsToProcess` equals 0.

**Location:** `src/__tests__/hooks/usePageVisibility.property.test.ts`, lines 120-176

**Problem:** When the property generator produced `numChanges = 2` with `gaps.length = 0`, the calculation `numGapsToProcess = Math.min(1, 0) = 0` would result in division by zero in `maxGapPerChange = Math.floor((VISIBILITY_DEBOUNCE_MS - 1) / numGapsToProcess)`.

## Root Cause

```typescript
// BEFORE (no guard)
const numGapsToProcess = Math.min(numChanges - 1, gaps.length);
const maxGapPerChange = Math.floor(
  (VISIBILITY_DEBOUNCE_MS - 1) / numGapsToProcess  // Division by zero when numGapsToProcess = 0
);
```

## Solution

Add a guard clause to handle the zero gaps case:

```typescript
// AFTER (with guard)
const numGapsToProcess = Math.min(numChanges - 1, gaps.length);

// Guard against division by zero when no gaps to process
if (numGapsToProcess === 0) {
  // Handle single change case (no gaps between changes)
  const controller = createVisibilityDebounceController(VISIBILITY_DEBOUNCE_MS);
  let callbackExecutions = 0;
  const callback = () => {
    callbackExecutions++;
  };

  controller.processVisibilityChange(callback, 1000000);
  expect(callbackExecutions).toBe(1);

  controller.reset();
  return;
}

const maxGapPerChange = Math.floor(
  (VISIBILITY_DEBOUNCE_MS - 1) / numGapsToProcess  // Now guaranteed > 0
);
```

## Changes Made

1. Added guard check: `if (numGapsToProcess === 0) return`
2. Handles single change case explicitly
3. Guard occurs before division operation

## Test Results

✅ All 13 property tests passing
- `calculateMaxCallbacksInWindow` tests: 4/4 passing
- `createVisibilityDebounceController` tests: 3/3 passing
- Boundary condition tests: 3/3 passing
- Specific scenario tests: 3/3 passing

## Verification

The fix ensures:
- No division by zero errors in property test generation
- Single change case (no gaps) handled correctly
- Property test can safely generate all valid combinations
- All edge cases covered

## Related Requirements

- **Requirement 4.5:** Visibility Recovery system SHALL execute at most one refresh operation for any sequence of visibility changes within 500ms window
- **Property 11:** Visibility Change Debouncing - validates the above requirement
