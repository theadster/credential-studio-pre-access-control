---
title: Page Visibility Property Test Cumulative Gap Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-21
review_interval_days: 90
related_code:
  - src/__tests__/hooks/usePageVisibility.property.test.ts
  - src/hooks/usePageVisibility.ts
---

# Page Visibility Property Test Cumulative Gap Fix

## Issue

The property test for visibility change debouncing generated time gaps that could cumulatively exceed the debounce window despite the test's intention to keep all changes within the window.

**Location:** `src/__tests__/hooks/usePageVisibility.property.test.ts`, lines 120-175

**Problem:** The constraint calculation divided the debounce window by `numGaps` (number of gaps generated), but the loop processed `Math.min(numChanges - 1, constrainedGaps.length)` gaps. When `numGaps < numChanges - 1`, the cumulative gaps could exceed `VISIBILITY_DEBOUNCE_MS`, violating the test's documented property.

## Root Cause

```typescript
// BEFORE (incorrect)
const maxGapPerChange = Math.floor(
  (VISIBILITY_DEBOUNCE_MS - 1) / numGaps  // Divides by generated gaps
);
// ...
for (let i = 0; i < Math.min(numChanges - 1, constrainedGaps.length); i++) {
  // But processes min(numChanges - 1, gaps.length) gaps
  // If numGaps < numChanges - 1, cumulative sum can exceed window
}
```

## Solution

Calculate `maxGapPerChange` based on the actual number of gaps that will be processed:

```typescript
// AFTER (correct)
const numGapsToProcess = Math.min(numChanges - 1, gaps.length);
const maxGapPerChange = Math.floor(
  (VISIBILITY_DEBOUNCE_MS - 1) / numGapsToProcess
);
const constrainedGaps = gaps.map((g) => Math.min(g, maxGapPerChange));
// ...
for (let i = 0; i < numGapsToProcess; i++) {
  // Now processes exactly numGapsToProcess gaps
  // Cumulative sum guaranteed to stay within window
}
```

## Changes Made

1. Introduced `numGapsToProcess` variable to track actual gaps processed
2. Updated `maxGapPerChange` calculation to use `numGapsToProcess`
3. Updated loop condition to use `numGapsToProcess` instead of `Math.min(...)`

## Test Results

✅ All 13 property tests passing
- `calculateMaxCallbacksInWindow` tests: 4/4 passing
- `createVisibilityDebounceController` tests: 3/3 passing
- Boundary condition tests: 3/3 passing
- Specific scenario tests: 3/3 passing

## Verification

The fix ensures that for any generated sequence of visibility changes:
- Cumulative time gaps stay within `VISIBILITY_DEBOUNCE_MS` (500ms)
- Property: "At most one callback executes for rapid changes within debounce window" is correctly tested
- No false negatives from test data generation exceeding the window

## Related Requirements

- **Requirement 4.5:** Visibility Recovery system SHALL execute at most one refresh operation for any sequence of visibility changes within 500ms window
- **Property 11:** Visibility Change Debouncing - validates the above requirement
