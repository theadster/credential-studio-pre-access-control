---
title: Optimistic Lock retriesUsed Accuracy Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-26
review_interval_days: 90
related_code: ["src/lib/optimisticLock.ts"]
---

# Optimistic Lock retriesUsed Accuracy Fix

## Problem

Both `withOptimisticLock()` and `updateWithLock()` functions were reporting inaccurate `retriesUsed` values in failure responses. Specifically:

1. **Hardcoded Max Value**: The failure return always reported `retriesUsed: mergedConfig.maxRetries`
2. **Early Exit Ignored**: When the loop broke early due to a non-retryable error, the reported value didn't reflect the actual number of attempts
3. **Misleading Metrics**: Callers couldn't distinguish between "exhausted all retries" and "failed on first attempt with non-retryable error"

### Example Scenario

```typescript
// Config: maxRetries = 5
// Attempt 1: Non-retryable error (e.g., validation error)
// Loop breaks immediately

// Before fix:
// Returns: retriesUsed: 5 (incorrect - only 1 attempt was made)

// After fix:
// Returns: retriesUsed: 1 (correct - actual attempts performed)
```

## Solution

Introduced tracking variables to capture the actual number of attempts performed:

### `withOptimisticLock()` Function

Uses `attemptsUsed` variable:

```typescript
let lastError: Error | undefined;
let conflictDetected = false;
let attemptsUsed = 0;  // Track actual attempts

for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt += 1) {
  attemptsUsed = attempt;  // Update on each iteration
  try {
    const result = await operation();
    return {
      success: true,
      data: result,
      conflictDetected,
      retriesUsed: attempt,
    };
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));

    if (isVersionMismatchError(error)) {
      conflictDetected = true;
      if (attempt < mergedConfig.maxRetries) {
        const delay = calculateBackoff(attempt, mergedConfig);
        await sleep(delay);
        continue;
      }
    } else {
      // Non-retryable error - loop breaks with attemptsUsed set
      break;
    }
  }
}

return {
  success: false,
  conflictDetected,
  retriesUsed: attemptsUsed,  // Now reflects actual attempts
  error: {
    type: conflictDetected ? 'MAX_RETRIES_EXCEEDED' : 'UPDATE_FAILED',
    message: lastError?.message || 'Operation failed',
    originalError: lastError,
  },
};
```

## How It Works

### Tracking Mechanism

- `attemptsUsed` is initialized to 0
- Updated to the current `attempt` value at the start of each loop iteration
- When the loop breaks (either after max retries or on non-retryable error), `attemptsUsed` holds the actual attempt count
- Returned in the failure response

### Scenarios

| Scenario | Max Retries | Attempts | retriesUsed | Error Type |
|----------|-------------|----------|------------|-----------|
| Success on attempt 1 | 5 | 1 | 1 | N/A |
| Non-retryable error on attempt 1 | 5 | 1 | 1 | UPDATE_FAILED |
| Version mismatch, exhaust retries | 5 | 6 | 5 | MAX_RETRIES_EXCEEDED |
| Version mismatch, succeed on attempt 3 | 5 | 3 | 3 | N/A |

## Benefits

1. **Accurate Metrics**: `retriesUsed` now reflects actual attempts performed
2. **Better Debugging**: Callers can distinguish between different failure modes
3. **Improved Logging**: Error reports show true retry count for analysis
4. **No Breaking Changes**: Return type and structure unchanged, only value accuracy improved

## Implementation Details

- **Minimal Change**: Only added one variable and one assignment per iteration
- **No Logic Changes**: All existing retry logic, backoff calculation, and error handling unchanged
- **Type Safe**: No new types or interfaces required
- **Performance**: Negligible impact (single integer assignment per iteration)

## Testing Recommendations

- Test non-retryable error on first attempt (retriesUsed should be 1)
- Test version mismatch exhausting all retries (retriesUsed should be maxRetries)
- Test successful operation on various attempts (retriesUsed should match attempt number)
- Verify error type is correct (UPDATE_FAILED vs MAX_RETRIES_EXCEEDED)
- Test with different maxRetries configurations

## Related Documentation

- [Transactions Best Practices](../guides/TRANSACTIONS_BEST_PRACTICES.md)
- [Optimistic Lock Implementation](../guides/TRANSACTIONS_DEVELOPER_GUIDE.md)
