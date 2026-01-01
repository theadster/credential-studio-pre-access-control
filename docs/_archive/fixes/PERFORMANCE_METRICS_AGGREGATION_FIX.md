# Performance Metrics Aggregation Fix

## Problem

The `PerformanceTracker` class in `performance.ts` had a bug where duplicate query names would overwrite previous durations instead of aggregating them:

```typescript
// Before: Overwrites previous durations
getMetrics(): PerformanceMetrics {
  const queryTimes: Record<string, number> = {};
  
  for (const metric of this.queryMetrics) {
    queryTimes[metric.queryName] = metric.duration;  // ❌ Overwrites!
  }
  
  return { totalTime: this.getTotalTime(), queryTimes, warnings: this.warnings };
}
```

**Issues:**
- **Data loss**: Only the last execution time was kept for duplicate query names
- **Inaccurate metrics**: Lost information about multiple executions
- **Poor analysis**: Couldn't see patterns in repeated queries
- **Misleading logs**: Performance summaries showed incomplete data

### Example of Data Loss

```typescript
const tracker = new PerformanceTracker();

await tracker.trackQuery('fetchUsers', query1);  // 100ms
await tracker.trackQuery('fetchUsers', query2);  // 150ms
await tracker.trackQuery('fetchUsers', query3);  // 200ms

const metrics = tracker.getMetrics();
console.log(metrics.queryTimes.fetchUsers);  // ❌ Only shows 200ms (last one)
// Lost: 100ms and 150ms executions
```

## Solution

Implemented aggregation that preserves all durations and provides statistical analysis:

### 1. New Data Structure

```typescript
export interface QueryAggregation {
  count: number;        // Number of executions
  total: number;        // Sum of all durations
  average: number;      // Average duration
  min: number;          // Fastest execution
  max: number;          // Slowest execution
  durations: number[];  // All individual durations
}

export interface PerformanceMetrics {
  totalTime: number;
  queryTimes: Record<string, QueryAggregation>;  // Changed from number to QueryAggregation
  warnings: string[];
}
```

### 2. Updated `getMetrics()` with Aggregation

```typescript
getMetrics(): PerformanceMetrics {
  const queryTimes: Record<string, QueryAggregation> = {};
  
  // Aggregate metrics by query name
  for (const metric of this.queryMetrics) {
    if (!queryTimes[metric.queryName]) {
      queryTimes[metric.queryName] = {
        count: 0,
        total: 0,
        average: 0,
        min: Infinity,
        max: -Infinity,
        durations: []
      };
    }
    
    const agg = queryTimes[metric.queryName];
    agg.count++;
    agg.total += metric.duration;
    agg.min = Math.min(agg.min, metric.duration);
    agg.max = Math.max(agg.max, metric.duration);
    agg.durations.push(metric.duration);
    agg.average = agg.total / agg.count;
  }

  return {
    totalTime: this.getTotalTime(),
    queryTimes,
    warnings: this.warnings
  };
}
```

### 3. Enhanced `logSummary()` Output

```typescript
logSummary(requestPath: string): void {
  const metrics = this.getMetrics();
  
  console.log(`\n📊 Performance Summary for ${requestPath}`);
  console.log(`   Total Request Time: ${metrics.totalTime}ms`);
  console.log(`   Query Breakdown:`);
  
  for (const [queryName, agg] of Object.entries(metrics.queryTimes)) {
    const icon = agg.max > SLOW_QUERY_THRESHOLD ? '⚠️' : '✓';
    
    if (agg.count === 1) {
      // Single execution - show simple format
      console.log(`     ${icon} ${queryName}: ${agg.total}ms`);
    } else {
      // Multiple executions - show aggregated stats
      console.log(`     ${icon} ${queryName}: ${agg.total}ms total (${agg.count}x, avg: ${Math.round(agg.average)}ms, min: ${agg.min}ms, max: ${agg.max}ms)`);
    }
  }
  
  // ... warnings ...
}
```

### 4. Updated Response Headers

```typescript
getResponseHeaders(): Record<string, string> {
  const metrics = this.getMetrics();
  
  // Calculate total number of query executions
  const totalExecutions = Object.values(metrics.queryTimes)
    .reduce((sum, agg) => sum + agg.count, 0);
  
  return {
    'X-Response-Time': `${metrics.totalTime}ms`,
    'X-Query-Count': String(totalExecutions),        // Total executions
    'X-Unique-Queries': String(Object.keys(metrics.queryTimes).length),  // NEW!
    'X-Slow-Queries': String(metrics.warnings.length)
  };
}
```

## Example Usage

### Before (Data Loss)

```typescript
const tracker = new PerformanceTracker();

await tracker.trackQuery('fetchUsers', () => db.listUsers());     // 100ms
await tracker.trackQuery('fetchUsers', () => db.listUsers());     // 150ms
await tracker.trackQuery('fetchUsers', () => db.listUsers());     // 200ms

const metrics = tracker.getMetrics();
console.log(metrics.queryTimes.fetchUsers);
// Output: 200  ❌ Lost 100ms and 150ms!
```

### After (Full Aggregation)

```typescript
const tracker = new PerformanceTracker();

await tracker.trackQuery('fetchUsers', () => db.listUsers());     // 100ms
await tracker.trackQuery('fetchUsers', () => db.listUsers());     // 150ms
await tracker.trackQuery('fetchUsers', () => db.listUsers());     // 200ms

const metrics = tracker.getMetrics();
console.log(metrics.queryTimes.fetchUsers);
// Output: {
//   count: 3,
//   total: 450,
//   average: 150,
//   min: 100,
//   max: 200,
//   durations: [100, 150, 200]
// } ✅ All data preserved!
```

### Log Output Examples

**Single execution:**
```
📊 Performance Summary for /api/attendees
   Total Request Time: 250ms
   Query Breakdown:
     ✓ fetchEventSettings: 50ms
     ✓ fetchAttendee: 100ms
```

**Multiple executions:**
```
📊 Performance Summary for /api/attendees/bulk-export
   Total Request Time: 5500ms
   Query Breakdown:
     ✓ fetchEventSettings: 50ms
     ⚠️ fetchAttendee: 5000ms total (100x, avg: 50ms, min: 45ms, max: 120ms)
     ✓ fetchCustomFields: 200ms
```

## Files Modified

**src/lib/performance.ts**
- Added `QueryAggregation` interface
- Updated `PerformanceMetrics` interface
- Rewrote `getMetrics()` to aggregate duplicate query names
- Enhanced `logSummary()` to show aggregated stats
- Updated `getResponseHeaders()` to include unique query count

**src/lib/__tests__/performance.test.ts**
- Updated existing tests to work with new aggregated format
- Added new test: "should aggregate duplicate query names"
- Added new test: "should count total executions in headers for duplicate queries"
- All 11 tests pass

## Benefits

✅ **No data loss**: All query executions are preserved  
✅ **Statistical analysis**: Min, max, average, and total durations  
✅ **Better insights**: See patterns in repeated queries  
✅ **Performance optimization**: Identify queries that are called too frequently  
✅ **Accurate metrics**: True picture of query performance  
✅ **Backward compatible**: Single executions show simple format  
✅ **Enhanced headers**: New `X-Unique-Queries` header  

## Use Cases

### 1. Identify N+1 Query Problems

```typescript
// Before: Couldn't see the problem
fetchUser: 50ms  // Only showed last execution

// After: Problem is obvious
fetchUser: 5000ms total (100x, avg: 50ms, min: 45ms, max: 120ms)
// ⚠️ This query is being called 100 times! N+1 problem detected!
```

### 2. Analyze Query Performance Variance

```typescript
// High variance indicates inconsistent performance
fetchData: 1500ms total (10x, avg: 150ms, min: 50ms, max: 500ms)
// ⚠️ Max is 10x slower than min - investigate caching or load issues
```

### 3. Monitor Batch Operations

```typescript
// Track performance of bulk operations
processAttendee: 10000ms total (500x, avg: 20ms, min: 15ms, max: 100ms)
// ✓ Consistent performance across 500 items
```

### 4. Detect Performance Regressions

```typescript
// Compare metrics over time
// Before optimization:
fetchUsers: 5000ms total (50x, avg: 100ms, min: 80ms, max: 150ms)

// After optimization:
fetchUsers: 2500ms total (50x, avg: 50ms, min: 45ms, max: 60ms)
// ✓ 50% improvement in average time!
```

## Migration Guide

### For Code Using `getMetrics()`

**Before:**
```typescript
const metrics = tracker.getMetrics();
const duration = metrics.queryTimes.fetchUsers;  // number
console.log(`Query took ${duration}ms`);
```

**After:**
```typescript
const metrics = tracker.getMetrics();
const agg = metrics.queryTimes.fetchUsers;  // QueryAggregation
console.log(`Query took ${agg.total}ms (${agg.count} executions, avg: ${agg.average}ms)`);
```

### For Code Using Response Headers

**Before:**
```typescript
const headers = tracker.getResponseHeaders();
console.log(`Executed ${headers['X-Query-Count']} queries`);
```

**After (same, but more accurate):**
```typescript
const headers = tracker.getResponseHeaders();
console.log(`Executed ${headers['X-Query-Count']} queries`);  // Now counts all executions
console.log(`Unique queries: ${headers['X-Unique-Queries']}`);  // NEW!
```

## Testing

All tests pass with the new aggregation:

```bash
npx vitest --run src/lib/__tests__/performance.test.ts

✓ src/lib/__tests__/performance.test.ts (11 tests) 28ms
  ✓ measureQueryTime
    ✓ should measure query execution time
    ✓ should log warning for slow queries
    ✓ should handle query errors and still measure time
  ✓ PerformanceTracker
    ✓ should track multiple queries
    ✓ should aggregate duplicate query names  ← NEW TEST
    ✓ should track warnings for slow queries
    ✓ should calculate total time correctly
    ✓ should generate response headers
    ✓ should count total executions in headers for duplicate queries  ← NEW TEST
    ✓ should log summary with all metrics
    ✓ should log summary without errors

Test Files  1 passed (1)
     Tests  11 passed (11)
```

## Related Files

- `src/lib/performance.ts` - Performance tracking utilities
- `src/lib/__tests__/performance.test.ts` - Test suite
- `src/pages/api/event-settings/index.ts` - Example usage
