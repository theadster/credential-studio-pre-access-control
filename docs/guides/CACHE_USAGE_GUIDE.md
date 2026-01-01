---
title: "Cache Usage Guide"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/lib/cache.ts"]
---

# Cache Usage Guide

## Overview

The `EventSettingsCache` class provides an in-memory caching solution with automatic memory management, TTL support, and LRU eviction.

## Key Features

### 1. Size Limits
- Maximum of **1000 entries** by default
- Automatic eviction when limit is reached
- Prevents unbounded memory growth

### 2. Automatic Cleanup
- Periodic cleanup runs every **60 seconds**
- Removes expired entries automatically
- Cleanup also runs before eviction if needed

### 3. LRU Eviction
- When cache is full, least recently used entries are evicted
- Access time is tracked on every `get()` operation
- Ensures most relevant data stays cached

### 4. Memory Monitoring
- `getStats()` provides detailed metrics
- `size` property for quick size checks
- Track utilization and expired entries

## Basic Usage

```typescript
import { eventSettingsCache } from '@/lib/cache';

// Set a value (default 5 minute TTL)
eventSettingsCache.set('event-123', eventData);

// Set with custom TTL (10 minutes)
eventSettingsCache.set('event-456', eventData, 10 * 60 * 1000);

// Get a value
const data = eventSettingsCache.get('event-123');

// Invalidate a specific entry
eventSettingsCache.invalidate('event-123');

// Clear all entries
eventSettingsCache.clear();
```

## Memory Monitoring

### Quick Size Check
```typescript
const currentSize = eventSettingsCache.size;
console.log(`Cache has ${currentSize} entries`);
```

### Detailed Statistics
```typescript
const stats = eventSettingsCache.getStats();
console.log(`Cache utilization: ${stats.utilizationPercent}%`);
console.log(`Entries: ${stats.size}/${stats.maxSize}`);
console.log(`Expired entries: ${stats.expiredCount}`);
console.log(`Keys: ${stats.keys.join(', ')}`);
```

### Example Monitoring Function
```typescript
function monitorCache() {
  const stats = eventSettingsCache.getStats();
  
  if (stats.utilizationPercent > 80) {
    console.warn('Cache utilization high:', stats.utilizationPercent + '%');
  }
  
  if (stats.expiredCount > 100) {
    console.info('Running manual cleanup...');
    eventSettingsCache.cleanup();
  }
}

// Run monitoring periodically
setInterval(monitorCache, 5 * 60 * 1000); // Every 5 minutes
```

## Manual Cleanup

While cleanup runs automatically, you can trigger it manually:

```typescript
// Force cleanup of expired entries
eventSettingsCache.cleanup();
```

## Shutdown Handling

The cache starts a periodic cleanup timer automatically. For clean shutdown (e.g., in tests or graceful server shutdown):

```typescript
// Stop the cleanup timer
eventSettingsCache.stopCleanup();
```

## Configuration

Current defaults (defined in `src/lib/cache.ts`):

```typescript
DEFAULT_TTL = 5 * 60 * 1000;      // 5 minutes
MAX_ENTRIES = 1000;                // Maximum cache size
CLEANUP_INTERVAL = 60 * 1000;      // Cleanup every minute
```

To modify these, edit the class constants in `src/lib/cache.ts`.

## How It Works

### Entry Lifecycle

1. **Set**: Entry is added with timestamp and TTL
2. **Get**: Entry is accessed, `lastAccessed` is updated
3. **Expiration**: Entry expires after TTL, removed on next access or cleanup
4. **Eviction**: If cache is full, oldest accessed entry is removed

### Memory Management Flow

```
set() called
    ↓
Is cache full?
    ↓ Yes
Run cleanup() to remove expired entries
    ↓
Still full?
    ↓ Yes
Evict LRU entry
    ↓
Add new entry
```

### Cleanup Process

```
Every 60 seconds (automatic)
    ↓
Scan all entries
    ↓
Check if expired (now - timestamp > ttl)
    ↓
Delete expired entries
```

## Best Practices

### 1. Choose Appropriate TTLs
```typescript
// Short TTL for frequently changing data
eventSettingsCache.set('live-data', data, 30 * 1000); // 30 seconds

// Longer TTL for stable data
eventSettingsCache.set('config', data, 30 * 60 * 1000); // 30 minutes
```

### 2. Monitor in Production
```typescript
// Log cache stats periodically
setInterval(() => {
  const stats = eventSettingsCache.getStats();
  logger.info('Cache stats', stats);
}, 10 * 60 * 1000); // Every 10 minutes
```

### 3. Invalidate on Updates
```typescript
// After updating data, invalidate cache
await updateEventSettings(eventId, newSettings);
eventSettingsCache.invalidate(`event-${eventId}`);
```

### 4. Use Consistent Key Patterns
```typescript
// Good: Consistent, predictable keys
eventSettingsCache.set(`event-${eventId}`, data);
eventSettingsCache.set(`user-${userId}`, data);

// Avoid: Random or inconsistent keys
eventSettingsCache.set(Math.random().toString(), data);
```

## Performance Characteristics

- **Get**: O(1) - Map lookup
- **Set**: O(1) average, O(n) worst case when eviction needed
- **Cleanup**: O(n) - Scans all entries
- **Evict LRU**: O(n) - Finds oldest entry

## Memory Considerations

- Each entry stores: data + timestamp + TTL + lastAccessed
- With 1000 max entries, memory usage depends on data size
- Typical event settings: ~1-5KB per entry = ~1-5MB total
- Monitor with `getStats()` if storing large objects

## Testing

Example test for cache behavior:

```typescript
import { EventSettingsCache } from '@/lib/cache';

describe('EventSettingsCache', () => {
  let cache: EventSettingsCache;

  beforeEach(() => {
    cache = new EventSettingsCache();
  });

  afterEach(() => {
    cache.stopCleanup();
    cache.clear();
  });

  it('should evict LRU when full', () => {
    // Fill cache to max
    for (let i = 0; i < 1000; i++) {
      cache.set(`key-${i}`, { data: i });
    }

    // Access first entry to make it recently used
    cache.get('key-0');

    // Add one more entry
    cache.set('key-1000', { data: 1000 });

    // First entry should still exist (recently accessed)
    expect(cache.get('key-0')).toBeTruthy();

    // Some old entry should be evicted
    expect(cache.size).toBe(1000);
  });
});
```

## Troubleshooting

### Cache Not Cleaning Up
- Check if `stopCleanup()` was called
- Verify TTL values are reasonable
- Manually call `cleanup()` to force cleanup

### Memory Growing
- Check `getStats().size` to see current entries
- Verify TTL values aren't too long
- Consider reducing `MAX_ENTRIES` constant

### Entries Disappearing
- Check TTL - may be too short
- Verify cache isn't being cleared elsewhere
- Check if LRU eviction is happening (cache full)

## Related Files

- Implementation: `src/lib/cache.ts`
- Usage: `src/pages/api/event-settings/index.ts`
- Tests: Create in `src/lib/__tests__/cache.test.ts`
