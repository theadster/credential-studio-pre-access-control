---
title: Bulk Operation Broadcast Singleton Configuration Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-26
review_interval_days: 90
related_code: ["src/lib/bulkOperationBroadcast.ts"]
---

# Bulk Operation Broadcast Singleton Configuration Fix

## Problem

The `getBulkOperationBroadcast()` singleton factory was ignoring subsequent configuration arguments. Once the singleton instance was created, any new calls with different config parameters would simply return the existing instance without applying the new configuration.

This caused issues in scenarios where:
- Tests needed to reconfigure the service with different channel names or settings
- Runtime configuration changes needed to be applied to the broadcast service
- Different parts of the application needed different broadcast configurations

## Solution

Updated the singleton factory to respect new configurations through two mechanisms:

### 1. Config Comparison & Recreation

The `getBulkOperationBroadcast()` function now:
- Compares incoming config with the existing instance's config using deep equality check
- If configs differ, it cleans up the existing instance and creates a new one
- Returns the fresh instance with the new configuration

```typescript
export function getBulkOperationBroadcast(
  config?: Partial<BulkOperationBroadcastConfig>
): BulkOperationBroadcastService {
  if (!instance) {
    instance = new BulkOperationBroadcastService(config);
    return instance;
  }

  // If config is provided and differs from current instance config, recreate
  if (config && !configsEqual(config, instance['config'])) {
    instance.cleanup();
    instance = new BulkOperationBroadcastService(config);
  }

  return instance;
}
```

### 2. Public updateConfig Method

Added `updateConfig()` method to `BulkOperationBroadcastService` for in-place configuration updates:
- Merges new partial config into existing instance
- Reinitializes broadcast channel if channel name changes
- Preserves existing subscriptions and state

```typescript
updateConfig(newConfig: Partial<BulkOperationBroadcastConfig>): void {
  const oldChannelName = this.config.channelName;
  this.config = { ...this.config, ...newConfig };

  // If channel name changed, reinitialize the broadcast channel
  if (oldChannelName !== this.config.channelName && this.isInitialized) {
    // Clean up old channel and reinitialize with new name
  }
}
```

### 3. Explicit Reset Function

Added `resetBulkOperationBroadcast()` for testing and explicit reconfiguration:
- Cleans up the existing instance
- Nullifies the singleton, allowing a fresh instance to be created
- Useful for test isolation and reconfiguration scenarios

## Implementation Details

- **Deep Equality Check**: `configsEqual()` compares all config properties (channelName, includeAffectedIds, maxAffectedIds)
- **Cleanup on Recreate**: Properly closes BroadcastChannel and removes storage listeners before creating new instance
- **Backward Compatible**: Existing code that doesn't pass config continues to work unchanged

## Usage Examples

### Scenario 1: Different Config Per Call
```typescript
// First call creates instance with custom channel
const broadcast1 = getBulkOperationBroadcast({ 
  channelName: 'custom-channel' 
});

// Second call with different config recreates instance
const broadcast2 = getBulkOperationBroadcast({ 
  channelName: 'another-channel' 
});
// broadcast2 is a new instance with the new channel name
```

### Scenario 2: In-Place Config Update
```typescript
const broadcast = getBulkOperationBroadcast();
broadcast.updateConfig({ 
  maxAffectedIds: 200 
});
// Existing instance updated with new setting
```

### Scenario 3: Test Isolation
```typescript
// Test setup
const broadcast = getBulkOperationBroadcast({ channelName: 'test-channel' });

// Test teardown
resetBulkOperationBroadcast();

// Next test gets fresh instance
const broadcast2 = getBulkOperationBroadcast({ channelName: 'test-channel-2' });
```

## Files Modified

- `src/lib/bulkOperationBroadcast.ts`
  - Added `updateConfig()` method to `BulkOperationBroadcastService`
  - Added `configsEqual()` helper function
  - Updated `getBulkOperationBroadcast()` factory logic
  - Added `resetBulkOperationBroadcast()` export
  - Fixed localStorage race condition with unique message keys
  - Updated storage listener to use prefix-based key matching

## Testing Recommendations

- Test config comparison logic with various config combinations
- Verify channel recreation when channel name changes
- Ensure cleanup is called before instance recreation
- Test that subscriptions are preserved during updateConfig
- Verify test isolation with resetBulkOperationBroadcast()

## Related Documentation

- [Bulk Operation Broadcast Service](../guides/BULK_OPERATIONS_PERFORMANCE.md)
- [Bulk Operations Canonical](../misc/BULK_OPERATIONS_CANONICAL.md)
