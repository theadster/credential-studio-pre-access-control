# Event Settings Cache Usage Example

## How the Cache Works

### Scenario 1: First Request (Cold Cache)
```
User → GET /api/event-settings
       ↓
    Check cache (key: 'event-settings')
       ↓
    Cache MISS (no data)
       ↓
    Fetch from database (2-5 seconds)
       ↓
    Store in cache (TTL: 5 minutes)
       ↓
    Response with X-Cache: MISS header
```

### Scenario 2: Subsequent Requests (Warm Cache)
```
User → GET /api/event-settings
       ↓
    Check cache (key: 'event-settings')
       ↓
    Cache HIT (data found, not expired)
       ↓
    Return cached data (< 100ms)
       ↓
    Response with X-Cache: HIT header
```

### Scenario 3: Update Event Settings
```
User → PUT /api/event-settings
       ↓
    Update database
       ↓
    Invalidate cache (remove 'event-settings')
       ↓
    Response with updated data
       ↓
    Next GET request will be cache MISS
```

### Scenario 4: Cache Expiration
```
Time: 0 minutes
User → GET /api/event-settings
       Cache MISS → Fetch from DB → Cache stored

Time: 3 minutes
User → GET /api/event-settings
       Cache HIT → Return cached data (still valid)

Time: 6 minutes (after 5-minute TTL)
User → GET /api/event-settings
       Cache MISS (expired) → Fetch from DB → Cache refreshed
```

## Response Headers

### Cache Hit Response:
```http
HTTP/1.1 200 OK
X-Cache: HIT
X-Cache-Age: 120
X-Performance-Total: 5
Content-Type: application/json

{
  "eventName": "Tech Conference 2025",
  "eventDate": "2025-06-15",
  ...
}
```

### Cache Miss Response:
```http
HTTP/1.1 200 OK
X-Cache: MISS
X-Performance-Total: 2345
X-Performance-EventSettings: 450
X-Performance-ParallelIntegrations: 1850
Content-Type: application/json

{
  "eventName": "Tech Conference 2025",
  "eventDate": "2025-06-15",
  ...
}
```

## Performance Comparison

### Without Cache:
```
Request 1: 2.5 seconds (database fetch)
Request 2: 2.3 seconds (database fetch)
Request 3: 2.7 seconds (database fetch)
Request 4: 2.4 seconds (database fetch)
Request 5: 2.6 seconds (database fetch)

Average: 2.5 seconds per request
Total time for 5 requests: 12.5 seconds
```

### With Cache:
```
Request 1: 2.5 seconds (cache miss, database fetch)
Request 2: 0.05 seconds (cache hit)
Request 3: 0.04 seconds (cache hit)
Request 4: 0.06 seconds (cache hit)
Request 5: 0.05 seconds (cache hit)

Average: 0.54 seconds per request
Total time for 5 requests: 2.7 seconds
Improvement: 78% faster
```

## Cache Statistics

### Monitoring Cache Usage:
```typescript
import { eventSettingsCache } from '@/lib/cache';

// Get current cache statistics
const stats = eventSettingsCache.getStats();
console.log('Cache entries:', stats.size);
console.log('Cached keys:', stats.keys);

// Output:
// Cache entries: 1
// Cached keys: ['event-settings']
```

### Manual Cache Operations:
```typescript
// Check if data is cached
const cached = eventSettingsCache.get('event-settings');
if (cached) {
  console.log('Cache hit!', cached);
} else {
  console.log('Cache miss - need to fetch from database');
}

// Manually invalidate cache
eventSettingsCache.invalidate('event-settings');
console.log('Cache cleared');

// Clear all cache entries
eventSettingsCache.clear();
console.log('All cache entries cleared');
```

## Testing Cache Behavior

### Using cURL:
```bash
# Test 1: First request (cache miss)
curl -i http://localhost:3000/api/event-settings
# Look for: X-Cache: MISS

# Test 2: Second request (cache hit)
curl -i http://localhost:3000/api/event-settings
# Look for: X-Cache: HIT
# Look for: X-Cache-Age: <seconds>

# Test 3: Update settings (invalidates cache)
curl -X PUT http://localhost:3000/api/event-settings \
  -H "Content-Type: application/json" \
  -d '{"eventName": "Updated Event"}'

# Test 4: Next request (cache miss after invalidation)
curl -i http://localhost:3000/api/event-settings
# Look for: X-Cache: MISS
```

### Using Browser DevTools:
1. Open Network tab in DevTools
2. Make GET request to `/api/event-settings`
3. Check Response Headers:
   - First request: `X-Cache: MISS`
   - Subsequent requests: `X-Cache: HIT`
4. Update event settings via UI
5. Next GET request should show: `X-Cache: MISS`

## Cache Configuration

### Default Settings:
- **TTL:** 5 minutes (300,000 milliseconds)
- **Cache Key:** `'event-settings'`
- **Storage:** In-memory (Map)
- **Invalidation:** Automatic on POST/PUT

### Customizing TTL:
```typescript
// Set with custom TTL (1 minute)
eventSettingsCache.set('event-settings', data, 60000);

// Set with custom TTL (10 minutes)
eventSettingsCache.set('event-settings', data, 600000);
```

## Best Practices

### When to Use Cache:
✅ Frequently accessed data  
✅ Data that doesn't change often  
✅ Read-heavy workloads  
✅ Performance-critical endpoints  

### When to Invalidate Cache:
✅ After POST (create)  
✅ After PUT (update)  
✅ After DELETE (if implemented)  
✅ On data import/migration  

### Cache Monitoring:
✅ Track cache hit/miss rates  
✅ Monitor response times  
✅ Check X-Cache headers  
✅ Review cache statistics  

## Troubleshooting

### Cache Not Working:
1. Check if cache is being set: `eventSettingsCache.getStats()`
2. Verify cache key matches: `'event-settings'`
3. Check TTL hasn't expired (< 5 minutes)
4. Ensure cache wasn't cleared manually

### Stale Data Issues:
1. Verify cache invalidation on updates
2. Check if PUT/POST handlers call `invalidate()`
3. Consider reducing TTL if data changes frequently
4. Use manual invalidation if needed

### Performance Issues:
1. Monitor cache hit rate (should be > 80%)
2. Check if TTL is too short (causing frequent misses)
3. Verify database queries are optimized
4. Consider Redis for distributed caching
