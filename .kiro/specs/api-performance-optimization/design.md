# Design Document

## Overview

This design addresses the Gateway Timeout issue in the `/api/event-settings` endpoint by implementing parallel query execution, removing write operations from GET requests, adding response caching, and improving error handling. The current implementation makes 6+ sequential database queries that can exceed 30 seconds, causing 504 errors. The optimized design will reduce response time to under 5 seconds through parallelization and caching.

## Architecture

### Current Flow (Sequential - Problematic)
```
GET /api/event-settings
  ↓
1. Fetch event settings (1 query)
  ↓
2. Fetch custom fields (1 query)
  ↓
3. Check for missing internal field names
  ↓
4. Update fields with missing names (N queries - WRITE during READ!)
  ↓
5. Re-fetch custom fields (1 query)
  ↓
6. Fetch Switchboard integration (1 query)
  ↓
7. Fetch Cloudinary integration (1 query)
  ↓
8. Fetch OneSimpleAPI integration (1 query)
  ↓
9. Try to get authenticated user (1-2 queries)
  ↓
10. Create log entry (1 query)
  ↓
Response (30+ seconds = TIMEOUT)
```

### Optimized Flow (Parallel)
```
GET /api/event-settings
  ↓
1. Fetch event settings (1 query)
  ↓
2. Parallel fetch (Promise.all):
   - Custom fields
   - Switchboard integration
   - Cloudinary integration
   - OneSimpleAPI integration
  ↓
3. Parse and merge data
  ↓
4. Async logging (non-blocking)
  ↓
Response (<2 seconds)
```

## Components and Interfaces

### 1. Query Parallelization Module

**Purpose:** Execute multiple independent database queries concurrently

**Implementation:**
```typescript
interface IntegrationData {
  switchboard: any | null;
  cloudinary: any | null;
  oneSimpleApi: any | null;
}

async function fetchIntegrationsParallel(
  databases: Databases,
  dbId: string,
  eventSettingsId: string
): Promise<IntegrationData> {
  const [switchboard, cloudinary, oneSimpleApi] = await Promise.allSettled([
    fetchSwitchboardIntegration(databases, dbId, eventSettingsId),
    fetchCloudinaryIntegration(databases, dbId, eventSettingsId),
    fetchOneSimpleApiIntegration(databases, dbId, eventSettingsId)
  ]);

  return {
    switchboard: switchboard.status === 'fulfilled' ? switchboard.value : null,
    cloudinary: cloudinary.status === 'fulfilled' ? cloudinary.value : null,
    oneSimpleApi: oneSimpleApi.status === 'fulfilled' ? oneSimpleApi.value : null
  };
}
```

**Key Design Decisions:**
- Use `Promise.allSettled()` instead of `Promise.all()` to handle partial failures gracefully
- Each integration fetch is isolated and failures don't block other integrations
- Return null for failed integrations rather than throwing errors

### 2. Custom Fields Optimization

**Current Problem:** GET requests trigger write operations when internal field names are missing

**Solution:** Remove write operations from GET requests entirely

**Implementation:**
```typescript
async function fetchCustomFields(
  databases: Databases,
  dbId: string,
  customFieldsCollectionId: string,
  eventSettingsId: string
): Promise<any[]> {
  const result = await databases.listDocuments(
    dbId,
    customFieldsCollectionId,
    [
      Query.equal('eventSettingsId', eventSettingsId),
      Query.orderAsc('order'),
      Query.limit(100)
    ]
  );

  // Parse field options but DO NOT update missing internal field names
  return result.documents.map((field: any) => ({
    id: field.$id,
    fieldName: field.fieldName,
    internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName),
    fieldType: field.fieldType,
    required: field.required,
    order: field.order,
    fieldOptions: parseFieldOptions(field.fieldOptions)
  }));
}
```

**Key Design Decisions:**
- Generate internal field names on-the-fly for display purposes only
- Persist internal field names during POST/PUT operations, not GET
- Single query with no follow-up writes

### 3. Response Caching Layer

**Purpose:** Cache event settings responses to serve repeated requests instantly

**Implementation:**
```typescript
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class EventSettingsCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const eventSettingsCache = new EventSettingsCache();
```

**Key Design Decisions:**
- In-memory cache using Map for simplicity (can be upgraded to Redis later)
- 5-minute TTL by default, configurable per entry
- Cache key based on event settings ID
- Invalidate on PUT/POST operations
- Cache only successful responses

### 4. Async Logging

**Current Problem:** Logging operations block the response

**Solution:** Fire-and-forget logging that doesn't block the response

**Implementation:**
```typescript
async function logEventSettingsView(
  req: NextApiRequest,
  dbId: string,
  usersCollectionId: string,
  logsCollectionId: string
): Promise<void> {
  try {
    const { account, databases } = createSessionClient(req);
    const user = await account.get();
    
    const userDocs = await databases.listDocuments(dbId, usersCollectionId, [
      Query.equal('userId', user.$id)
    ]);
    
    if (userDocs.documents.length > 0 && await shouldLog('systemViewEventSettings')) {
      // Fire and forget - don't await
      databases.createDocument(
        dbId,
        logsCollectionId,
        ID.unique(),
        {
          userId: user.$id,
          action: 'view',
          details: JSON.stringify({ type: 'event_settings' })
        }
      ).catch(err => console.error('Logging failed:', err));
    }
  } catch (error) {
    // Silently fail - logging should never block the response
    console.error('Logging error:', error);
  }
}
```

**Key Design Decisions:**
- Logging happens after response is sent
- Errors in logging don't affect the main response
- Use fire-and-forget pattern for log creation

### 5. Performance Monitoring

**Purpose:** Track query execution times and identify bottlenecks

**Implementation:**
```typescript
interface PerformanceMetrics {
  totalTime: number;
  queryTimes: {
    eventSettings: number;
    customFields: number;
    integrations: number;
  };
  cacheHit: boolean;
}

function measureQueryTime<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  return queryFn().then(result => ({
    result,
    duration: Date.now() - start
  }));
}

// Usage
const { result: eventSettings, duration: eventSettingsDuration } = 
  await measureQueryTime('eventSettings', () => 
    databases.listDocuments(dbId, eventSettingsCollectionId, [Query.limit(1)])
  );

console.log(`Event settings query took ${eventSettingsDuration}ms`);
```

**Key Design Decisions:**
- Log all query durations in development
- Log only slow queries (>1s) in production
- Include metrics in response headers for debugging
- Track cache hit/miss rates

## Data Models

No changes to existing data models. The optimization is purely at the API layer.

## Error Handling

### Integration Query Failures

```typescript
// Use Promise.allSettled to handle partial failures
const results = await Promise.allSettled([
  fetchSwitchboard(),
  fetchCloudinary(),
  fetchOneSimpleApi()
]);

// Extract results, using null for failures
const integrations = {
  switchboard: results[0].status === 'fulfilled' ? results[0].value : null,
  cloudinary: results[1].status === 'fulfilled' ? results[1].value : null,
  oneSimpleApi: results[2].status === 'fulfilled' ? results[2].value : null
};

// Log failures but continue
results.forEach((result, index) => {
  if (result.status === 'rejected') {
    console.error(`Integration ${index} failed:`, result.reason);
  }
});
```

### Cache Failures

```typescript
// Always fall back to database if cache fails
let eventSettings = eventSettingsCache.get('event-settings');

if (!eventSettings) {
  try {
    eventSettings = await fetchEventSettingsFromDB();
    eventSettingsCache.set('event-settings', eventSettings);
  } catch (error) {
    console.error('Failed to fetch event settings:', error);
    return res.status(500).json({ error: 'Failed to fetch event settings' });
  }
}
```

### Timeout Handling

```typescript
// Add timeout wrapper for critical queries
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  
  return Promise.race([promise, timeout]);
}

// Usage
const eventSettings = await withTimeout(
  databases.listDocuments(dbId, eventSettingsCollectionId, [Query.limit(1)]),
  10000, // 10 second timeout
  'Event settings query timed out'
);
```

## Testing Strategy

### Unit Tests

1. **Cache Module Tests**
   - Test cache set/get operations
   - Test TTL expiration
   - Test cache invalidation
   - Test cache miss scenarios

2. **Query Parallelization Tests**
   - Test Promise.allSettled behavior with all successes
   - Test partial failures (some integrations fail)
   - Test complete failures (all integrations fail)
   - Verify null values for failed integrations

3. **Performance Measurement Tests**
   - Test query time tracking
   - Test metrics collection
   - Test logging of slow queries

### Integration Tests

1. **API Endpoint Tests**
   - Test GET request with cache miss (full database fetch)
   - Test GET request with cache hit (fast response)
   - Test cache invalidation on PUT request
   - Test response time under load
   - Test partial integration failures

2. **Performance Tests**
   - Measure response time with cold cache
   - Measure response time with warm cache
   - Test concurrent requests
   - Verify response time < 5 seconds

### Load Tests

1. **Stress Testing**
   - 100 concurrent GET requests
   - Verify no timeouts occur
   - Monitor database connection pool
   - Track cache hit rates

## Performance Targets

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Response Time (cold cache) | 30+ seconds (timeout) | < 5 seconds | 95th percentile |
| Response Time (warm cache) | N/A | < 100ms | 95th percentile |
| Database Queries per Request | 10-15 | 4-5 | Average |
| Cache Hit Rate | 0% | > 80% | After warmup |
| Timeout Rate | High | 0% | Error rate |

## Migration Strategy

### Phase 1: Immediate Fixes (No Breaking Changes)
1. Implement parallel query execution
2. Remove write operations from GET requests
3. Add performance logging

### Phase 2: Caching Layer (Optional Enhancement)
1. Implement in-memory cache
2. Add cache invalidation on updates
3. Monitor cache hit rates

### Phase 3: Advanced Optimizations (Future)
1. Consider Redis for distributed caching
2. Implement query result pagination
3. Add database query optimization (indexes)

## Rollback Plan

If issues arise:
1. Revert to sequential query execution
2. Keep performance logging for debugging
3. Disable caching if it causes stale data issues
4. Monitor error rates and response times

## Security Considerations

- Cache should not store sensitive data (API keys, secrets)
- Cache invalidation must be immediate on updates to prevent stale data
- Logging should not expose sensitive information
- Authentication checks remain unchanged
