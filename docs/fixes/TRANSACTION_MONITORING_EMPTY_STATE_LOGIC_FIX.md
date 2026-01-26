---
title: Transaction Monitoring Dashboard Empty-State Logic Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-26
review_interval_days: 90
related_code: ["src/components/TransactionMonitoringDashboard.tsx"]
---

# Transaction Monitoring Dashboard Empty-State Logic Fix

## Problem

The TransactionMonitoringDashboard component had incorrect empty-state logic in three breakdown cards:
- By Operation Type
- By Resolution Strategy
- By Conflict Type

The issue was checking `Object.keys(metrics.*.conflictsBy*).length === 0` which only detects when the object has no keys, but misses the case where keys exist but all counts are zero.

### Example Scenario

```typescript
// Data structure with keys but all zero counts
const conflictsByOperationType = {
  'bulk_edit': 0,
  'bulk_delete': 0,
  'credential_generation': 0
};

// Before fix:
Object.keys(conflictsByOperationType).length === 0  // false (3 keys exist)
// Result: Shows empty rows instead of "No data available"

// After fix:
const visibleByOperation = Object.entries(conflictsByOperationType)
  .filter(([_, count]) => count > 0);
visibleByOperation.length === 0  // true (no items with count > 0)
// Result: Correctly shows "No data available"
```

## Solution

Refactored all three breakdown cards to:

1. **Compute filtered arrays** - Extract entries with count > 0
2. **Check filtered length** - Base empty-state on filtered array length
3. **Map filtered data** - Render only visible items

### Pattern Applied to All Three Cards

```typescript
{(() => {
  const visibleByOperation = Object.entries(metrics.concurrencyConflicts.conflictsByOperationType)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);
  return (
    <>
      {visibleByOperation.map(([type, count]) => (
        <div key={type} className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{type.replace(/_/g, ' ')}</span>
          <span className="font-medium">{count}</span>
        </div>
      ))}
      {visibleByOperation.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No data available
        </p>
      )}
    </>
  );
})()}
```

## Cards Updated

1. **By Operation Type** - `conflictsByOperationType`
2. **By Resolution Strategy** - `conflictsByStrategy`
3. **By Conflict Type** - `conflictsByType`

## Benefits

1. **Accurate Empty States** - Shows "No data available" when all metrics are zero
2. **Consistent Behavior** - All three cards use the same pattern
3. **Cleaner UI** - No empty rows when there's no data to display
4. **Better UX** - Users understand when there's no data vs. when data is loading

## Implementation Details

- **IIFE Pattern** - Uses immediately-invoked function expression to compute filtered array in JSX
- **No Breaking Changes** - Same visual output, just corrected logic
- **Performance** - Minimal impact (filtering happens on render, data is typically small)
- **Maintainability** - Consistent pattern across all three cards

## Testing Recommendations

- Test with all metrics at zero (should show "No data available")
- Test with some metrics at zero and some > 0 (should show only non-zero items)
- Test with all metrics > 0 (should show all items)
- Verify sorting still works correctly (highest counts first)
- Test with different data sets to ensure filtering works as expected

## Related Documentation

- [Transaction Monitoring Dashboard](../guides/OPERATOR_MONITORING_USER_GUIDE.md)
- [Concurrency Conflict Tracking](../misc/BULK_OPERATIONS_CANONICAL.md)
