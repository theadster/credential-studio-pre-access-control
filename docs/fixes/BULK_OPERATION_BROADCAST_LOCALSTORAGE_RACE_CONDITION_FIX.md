---
title: Bulk Operation Broadcast localStorage Race Condition Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-26
review_interval_days: 90
related_code: ["src/lib/bulkOperationBroadcast.ts"]
---

# Bulk Operation Broadcast localStorage Race Condition Fix

## Problem

The localStorage-based fallback mechanism in `BulkOperationBroadcastService` had a race condition when messages were sent rapidly:

1. **Single Key Reuse**: All messages were written to the same key (`this.config.channelName`)
2. **Quick Removal**: The key was removed after 50ms
3. **Message Loss**: If two messages were sent within 50ms, the first would be overwritten before listeners could process it
4. **No Filtering**: The storage listener checked for exact key match, which could conflict with unrelated localStorage keys

### Example Race Condition

```
Time 0ms:   Message 1 written to "bulk-operations"
Time 10ms:  Message 2 written to "bulk-operations" (overwrites Message 1)
Time 20ms:  Listener processes Message 2
Time 50ms:  "bulk-operations" key removed
            Message 1 is lost
```

## Solution

Implemented unique keys per message with prefix-based filtering:

### 1. Unique Message Keys

Each message now gets a unique key combining timestamp and random suffix:

```typescript
private generateMessageKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${this.config.channelName}:${timestamp}-${random}`;
}
```

Example keys:
- `bulk-operations:1705000000000-abc123def`
- `bulk-operations:1705000000010-xyz789uvw`

### 2. Prefix-Based Storage Listener

Updated the storage event listener to only handle keys matching the channel prefix:

```typescript
private initLocalStorageFallback(): void {
  this.storageListener = (event: StorageEvent) => {
    // Only handle keys that start with the channel prefix
    if (event.key && event.key.startsWith(`${this.config.channelName}:`) && event.newValue) {
      try {
        const message: BulkOperationMessage = JSON.parse(event.newValue);
        if (message.sourceId !== this.sourceId) {
          this.handleMessage(message);
        }
      } catch (error) {
        console.error('[BulkOperationBroadcast] Failed to parse localStorage message:', error);
      }
    }
  };
  // ...
}
```

### 3. Per-Message Cleanup

Each message key is removed individually after 50ms:

```typescript
private postMessage(message: BulkOperationMessage): void {
  // ...
  const messageKey = this.generateMessageKey();
  localStorage.setItem(messageKey, JSON.stringify(message));
  
  // Schedule removal of this specific message key
  setTimeout(() => {
    try {
      localStorage.removeItem(messageKey);
    } catch (e) {
      // Ignore cleanup errors
    }
  }, 50);
}
```

## Benefits

1. **No Message Loss**: Each message gets its own key, preventing overwrites
2. **Rapid Message Support**: Multiple messages can be sent in quick succession
3. **Isolation**: Prefix-based filtering prevents interference with other localStorage keys
4. **Clean Cleanup**: Each message is removed individually after processing window
5. **Backward Compatible**: No changes to public API or message format

## How It Works

### Before (Race Condition)
```
Message 1 → "bulk-operations" → Listener reads → Remove key
Message 2 → "bulk-operations" → Listener reads → Remove key
                    ↑
            Both use same key!
```

### After (No Race Condition)
```
Message 1 → "bulk-operations:1705000000000-abc123" → Listener reads → Remove key
Message 2 → "bulk-operations:1705000000010-xyz789" → Listener reads → Remove key
                    ↑
            Each message has unique key
```

## Performance Impact

- **Minimal**: Key generation uses simple timestamp + random (microseconds)
- **Storage**: Slightly larger keys but same message size
- **Cleanup**: Same 50ms timeout per message (no accumulation)

## Testing Recommendations

- Test rapid message sending (multiple messages within 50ms)
- Verify no messages are lost during concurrent sends
- Ensure prefix filtering doesn't interfere with other localStorage keys
- Test with different channel names to verify prefix isolation
- Verify cleanup removes only the specific message key

## Related Documentation

- [Bulk Operation Broadcast Singleton Configuration Fix](./BULK_OPERATION_BROADCAST_SINGLETON_CONFIG_FIX.md)
- [Bulk Operations Performance](../guides/BULK_OPERATIONS_PERFORMANCE.md)
