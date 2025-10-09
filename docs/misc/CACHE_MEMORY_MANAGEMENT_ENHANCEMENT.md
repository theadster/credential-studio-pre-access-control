# Cache Memory Management Enhancement

## Overview

Enhanced the `EventSettingsCache` class in `src/lib/cache.ts` to prevent unbounded memory growth by adding size limits, automatic cleanup, LRU eviction, and memory monitoring capabilities.

## Changes Made

### 1. Size Limits
- Added `MAX_ENTRIES = 1000` constant to cap cache size
- Prevents unbounded memory growth
- Configurable limit for different deployment scenarios

### 2. Automatic Cleanup
- Added `cleanup()` method to scan and remove expired entries
- Periodic cleanup runs every 60 seconds via timer
- Cleanup also runs before eviction when cache is full
- Timer uses `unref()` to prevent blocking Node.js shutdown

### 3. LRU Eviction
- Added `lastAccessed` timestamp to `CacheEntry` interface
- Implemented `evictLRU()` private method
- When cache reaches max size:
  1. First runs cleanup to remove expired entries
  2. If still full, evicts least recently used entry
- Ensures most relevant data stays cached

### 4. Memory Monitoring
- Enhanced `getStats()` with detailed metrics:
  - `size` - Current number of entries
  - `maxSize` - Maximum allowed entries
  - `utilizationPercent` - Cache utilization percentage
  - `expiredCount` - Number of expired entries
  - `keys` - Array of all cache keys
- Added `size` getter property for quick checks
- Enables proactive monitoring and alerting

### 5. Lifecycle Management
- Added constructor to start cleanup timer automatically
- Added `stopCleanup()` method for graceful shutdown
- Prevents memory leaks in tests and server restarts

## Technical Details

### Updated Interface
```typescript
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  lastAccessed: number; // NEW: For LRU tracking
}
```

### New Class Properties
```typescript
private readonly MAX_ENTRIES = 1000;
private readonly CLEANUP_INTERVAL = 60 * 1000;
private cleanupTimer: NodeJS.Timeout | null = null;
```

### Memory Management Flow
```
set() called
    ↓
Cache full?
    ↓ Yes
Run cleanup() → Remove expired entries
    ↓
Still full?
    ↓ Yes
evictLRU() → Remove oldest accessed entry
    ↓
Add new entry
```

## Performance Impact

- **Get operations**: O(1) → O(1) (no change, just updates lastAccessed)
- **Set operations**: O(1) → O(1) average, O(n) worst case when eviction needed
- **Cleanup**: O(n) every 60 seconds (background)
- **Memory**: Bounded to ~1000 entries (vs unbounded before)

## Usage Changes

### No Breaking Changes
All existing code continues to work without modification:
```typescript
eventSettingsCache.set('key', data);
const data = eventSettingsCache.get('key');
```

### New Capabilities
```typescript
// Monitor cache size
console.log(`Cache size: ${eventSettingsCache.size}`);

// Get detailed stats
const stats = eventSettingsCache.getStats();
console.log(`Utilization: ${stats.utilizationPercent}%`);

// Manual cleanup
eventSettingsCache.cleanup();

// Graceful shutdown
eventSettingsCache.stopCleanup();
```

## Testing Recommendations

### Unit Tests
```typescript
describe('EventSettingsCache memory management', () => {
  it('should enforce MAX_ENTRIES limit', () => {
    // Fill cache beyond limit
    // Verify size stays at MAX_ENTRIES
  });

  it('should evict LRU when full', () => {
    // Fill cache, access some entries
    // Add new entry, verify LRU was evicted
  });

  it('should cleanup expired entries', () => {
    // Add entries with short TTL
    // Wait for expiration
    // Verify cleanup removes them
  });
});
```

### Integration Tests
- Monitor cache stats in production
- Alert when utilization > 80%
- Log eviction events for analysis

## Configuration

To adjust limits, edit constants in `src/lib/cache.ts`:

```typescript
private readonly MAX_ENTRIES = 1000;        // Increase for larger cache
private readonly CLEANUP_INTERVAL = 60000;  // Adjust cleanup frequency
private readonly DEFAULT_TTL = 300000;      // Adjust default TTL
```

## Monitoring in Production

### Basic Monitoring
```typescript
setInterval(() => {
  const stats = eventSettingsCache.getStats();
  logger.info('Cache stats', {
    size: stats.size,
    utilization: stats.utilizationPercent,
    expired: stats.expiredCount
  });
}, 5 * 60 * 1000); // Every 5 minutes
```

### Advanced Monitoring
```typescript
function monitorCache() {
  const stats = eventSettingsCache.getStats();
  
  if (stats.utilizationPercent > 80) {
    logger.warn('High cache utilization', stats);
  }
  
  if (stats.expiredCount > 100) {
    logger.info('Running manual cleanup');
    eventSettingsCache.cleanup();
  }
}
```

## Benefits

1. **Prevents Memory Leaks**: Bounded cache size prevents unbounded growth
2. **Automatic Maintenance**: Periodic cleanup removes stale entries
3. **Efficient Eviction**: LRU ensures most relevant data stays cached
4. **Observable**: Detailed metrics enable monitoring and alerting
5. **Graceful Shutdown**: Cleanup timer can be stopped cleanly
6. **Zero Breaking Changes**: Existing code works without modification

## Related Documentation

- [Cache Usage Guide](../guides/CACHE_USAGE_GUIDE.md) - Complete usage documentation
- [Cache Usage Example](../guides/CACHE_USAGE_EXAMPLE.md) - Original caching patterns

## Files Modified

- `src/lib/cache.ts` - Enhanced cache implementation
- `docs/guides/CACHE_USAGE_GUIDE.md` - New comprehensive guide
- `docs/README.md` - Updated with new guide link

## Next Steps

1. **Add Tests**: Create `src/lib/__tests__/cache.test.ts` with unit tests
2. **Monitor Production**: Add cache stats logging to production
3. **Tune Limits**: Adjust MAX_ENTRIES based on production usage
4. **Document Metrics**: Add cache metrics to monitoring dashboard

## Date

January 7, 2025
