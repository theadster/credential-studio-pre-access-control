# Operator Monitoring Alert Deduplication

## Problem

The alert system in `operatorMonitoring.ts` was triggering duplicate alerts on every log entry while a metric stayed above threshold. For example:

- If error rate stays at 6% (above 5% threshold)
- Every new log entry would trigger a `HIGH_ERROR_RATE` alert
- This could result in hundreds of identical alerts per minute

### Impact

- Alert fatigue and noise in monitoring systems
- Overwhelming logs and alerting services
- Difficulty identifying new issues vs. ongoing problems
- Wasted resources sending duplicate notifications

## Solution

Implemented **alert deduplication** using a cooldown mechanism that prevents the same alert type from triggering more than once within a 5-minute window.

### How It Works

1. **Cooldown Tracking**: `lastAlertTime` map stores the timestamp of the last alert for each type
2. **Cooldown Period**: `ALERT_COOLDOWN_MS` (5 minutes) defines the minimum time between alerts
3. **Deduplication Check**: `shouldTriggerAlert()` verifies if enough time has passed
4. **Conditional Triggering**: Alerts only trigger if the cooldown has expired

### Implementation

```typescript
// Alert cooldown period in milliseconds (5 minutes)
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

// Track last alert time for each alert type
const lastAlertTime: Record<string, number> = {};

// Check if an alert should be triggered based on cooldown period
function shouldTriggerAlert(alertType: string): boolean {
  const now = Date.now();
  const lastTime = lastAlertTime[alertType];
  
  // If no previous alert or cooldown period has passed
  if (!lastTime || now - lastTime >= ALERT_COOLDOWN_MS) {
    lastAlertTime[alertType] = now;
    return true;
  }
  
  return false;
}

// Usage in checkAlerts()
if (metrics.errorRate > ALERT_THRESHOLDS.errorRate) {
  if (shouldTriggerAlert('HIGH_ERROR_RATE')) {
    triggerAlert('HIGH_ERROR_RATE', `Operator error rate is ${metrics.errorRate.toFixed(2)}%`, metrics);
  }
}
```

## Changes Made

### New Constants

- `ALERT_COOLDOWN_MS`: 5 minutes (300,000 ms) - configurable if needed

### New Data Structures

- `lastAlertTime`: Record mapping alert type to last trigger timestamp

### New Functions

- `shouldTriggerAlert(alertType: string): boolean`
  - Checks if cooldown has expired for the alert type
  - Updates `lastAlertTime` when allowing an alert
  - Returns true if alert should trigger, false otherwise

### Modified Functions

- `checkAlerts()`: Now calls `shouldTriggerAlert()` before each `triggerAlert()`
- `clearMetrics()`: Now also clears `lastAlertTime` for testing

## Alert Behavior

### Before Deduplication

```
Time 0:00 - Error rate 6% → Alert triggered
Time 0:01 - Error rate 6% → Alert triggered (duplicate)
Time 0:02 - Error rate 6% → Alert triggered (duplicate)
Time 0:03 - Error rate 6% → Alert triggered (duplicate)
...
Result: 60+ alerts in 1 minute
```

### After Deduplication

```
Time 0:00 - Error rate 6% → Alert triggered
Time 0:01 - Error rate 6% → Suppressed (cooldown active)
Time 0:02 - Error rate 6% → Suppressed (cooldown active)
...
Time 5:00 - Error rate 6% → Alert triggered (cooldown expired)
Time 5:01 - Error rate 6% → Suppressed (new cooldown starts)
...
Result: 1 alert per 5 minutes
```

## Configuration

### Adjusting Cooldown Period

To change the cooldown period, modify `ALERT_COOLDOWN_MS`:

```typescript
// 1 minute cooldown
const ALERT_COOLDOWN_MS = 1 * 60 * 1000;

// 10 minute cooldown
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;

// 30 second cooldown (for testing)
const ALERT_COOLDOWN_MS = 30 * 1000;
```

### Alert Types Covered

- `HIGH_ERROR_RATE`: Error rate > 5%
- `HIGH_FALLBACK_RATE`: Fallback rate > 10%
- `HIGH_P95_LATENCY`: P95 latency > 500ms
- `HIGH_P99_LATENCY`: P99 latency > 1000ms

Each alert type has its own cooldown tracking, so:
- `HIGH_ERROR_RATE` can trigger while `HIGH_P95_LATENCY` is in cooldown
- Different alert types don't interfere with each other

## Benefits

✅ **Reduced Alert Noise**: Prevents duplicate alerts during sustained issues  
✅ **Better Monitoring**: Easier to identify new problems vs. ongoing issues  
✅ **Resource Efficiency**: Fewer notifications to alerting services  
✅ **Configurable**: Cooldown period can be adjusted per deployment  
✅ **Per-Type Tracking**: Each alert type has independent cooldown  
✅ **Test-Friendly**: `clearMetrics()` resets cooldown tracking  

## Testing

The deduplication is transparent to existing tests:

```typescript
// Test still works - alert triggers on first occurrence
logOperatorUsage({ /* high error rate */ });
expect(getRecentAlerts()).toHaveLength(1);

// Subsequent logs within cooldown don't trigger alerts
logOperatorUsage({ /* high error rate */ });
expect(getRecentAlerts()).toHaveLength(1); // Still 1, not 2

// After clearing metrics, cooldown resets
clearMetrics();
logOperatorUsage({ /* high error rate */ });
expect(getRecentAlerts()).toHaveLength(1); // New alert triggered
```

## Thread Safety

The deduplication mechanism is thread-safe because:
- `lastAlertTime` updates happen within `executeThreadSafe()` context
- `shouldTriggerAlert()` is called within the thread-safe operation queue
- All mutations are serialized, preventing race conditions

## Future Enhancements

1. **Per-Alert Configuration**: Different cooldown periods for different alert types
2. **Alert Escalation**: Increase severity if alert persists beyond cooldown
3. **Alert Recovery**: Trigger "resolved" alerts when metrics return to normal
4. **Persistent Tracking**: Store alert history in database for audit trail
5. **Integration**: Send to external alerting services (PagerDuty, Slack, etc.)

## Code Quality

- ✅ No TypeScript errors
- ✅ Proper documentation with JSDoc comments
- ✅ Thread-safe implementation
- ✅ Backward compatible with existing code
- ✅ Testable and maintainable

## References

- **File Modified**: `src/lib/operatorMonitoring.ts`
- **Related Feature**: Thread-safe operation queue (see `OPERATOR_MONITORING_CONCURRENCY_FIX.md`)
- **Alert Thresholds**: Defined in `ALERT_THRESHOLDS` constant
- **Cooldown Period**: 5 minutes (300,000 ms)
