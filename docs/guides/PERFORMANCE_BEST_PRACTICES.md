---
title: "Performance Best Practices"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/"]
---

# Performance Best Practices

This guide documents performance best practices for credential.studio to prevent common performance pitfalls and ensure the application remains fast and responsive.

## Critical Performance Patterns

### 1. Avoid N+1 Query Problems

**❌ NEVER DO THIS:**
```typescript
// BAD: Individual queries in a loop (N+1 problem)
for (const attendeeId of attendeeIds) {
  const result = await databases.listDocuments(
    dbId,
    collectionId,
    [Query.equal('attendeeId', attendeeId)]
  );
  // Process result...
}
```

**✅ ALWAYS DO THIS:**
```typescript
// GOOD: Batch fetching (prevents N+1 problem)
const chunkSize = 100; // Appwrite's limit for array queries
for (let i = 0; i < attendeeIds.length; i += chunkSize) {
  const chunk = attendeeIds.slice(i, i + chunkSize);
  const result = await databases.listDocuments(
    dbId,
    collectionId,
    [Query.equal('attendeeId', chunk), Query.limit(chunkSize)]
  );
  // Process batch...
}
```

**Why this matters:**
- Individual queries: 100 attendees = 100 database calls = ~5-10 seconds
- Batch queries: 100 attendees = 1 database call = ~50-100ms
- **Performance difference: 100x faster!**

**Real-world example:**
The dashboard performance issue (December 2025) was caused by switching from batch to individual queries, causing 100x slowdown.

### 2. Batch Size Limits

**Appwrite Query Limits:**
- `Query.equal('field', [array])` supports up to **100 values**
- `Query.limit()` maximum is **5000 documents**

**Best practice:**
```typescript
const APPWRITE_ARRAY_QUERY_LIMIT = 100;
const APPWRITE_DOCUMENT_LIMIT = 5000;

// For array queries (Query.equal with array)
const chunkSize = APPWRITE_ARRAY_QUERY_LIMIT;

// For document fetching
const pageSize = APPWRITE_DOCUMENT_LIMIT;
```

### 3. Pagination for Large Datasets

**For datasets > 5000 items:**
```typescript
// Fetch all documents with automatic pagination
const allDocuments: any[] = [];
let offset = 0;
const limit = 5000;

while (true) {
  const batch = await databases.listDocuments(
    dbId,
    collectionId,
    [Query.limit(limit), Query.offset(offset), ...otherQueries]
  );
  
  allDocuments.push(...batch.documents);
  
  if (batch.documents.length < limit) {
    break; // Last batch
  }
  
  offset += limit;
}
```

**See also:** `src/pages/api/attendees/index.ts` for complete implementation with detailed comments.

### 4. Index Usage

**Always create indexes for:**
- Fields used in `Query.equal()`
- Fields used in `Query.search()`
- Fields used in `Query.orderAsc()` / `Query.orderDesc()`

**Example:**
```typescript
// In setup-appwrite.ts
await databases.createIndex(
  databaseId,
  collectionId,
  'fieldName_idx',
  IndexType.Key,
  ['fieldName']
);
```

**Check existing indexes:**
```bash
npx tsx scripts/diagnose-custom-field-search.ts
```

### 5. Minimize Data Transfer

**Filter data at the database level:**
```typescript
// GOOD: Filter in database
const result = await databases.listDocuments(
  dbId,
  collectionId,
  [
    Query.equal('status', 'active'),
    Query.greaterThan('createdAt', startDate)
  ]
);

// BAD: Fetch everything and filter in JavaScript
const all = await databases.listDocuments(dbId, collectionId);
const filtered = all.documents.filter(doc => 
  doc.status === 'active' && doc.createdAt > startDate
);
```

**Select only needed fields:**
```typescript
// If Appwrite supports field selection (check docs)
const result = await databases.listDocuments(
  dbId,
  collectionId,
  [Query.select(['id', 'firstName', 'lastName'])]
);
```

### 6. Caching Strategies

**Use in-memory cache for frequently accessed data:**
```typescript
import { cache } from '@/lib/cache';

// Cache event settings (rarely changes)
const eventSettings = await cache.get('eventSettings', async () => {
  const result = await databases.listDocuments(dbId, settingsCollectionId);
  return result.documents[0];
}, 5 * 60 * 1000); // 5 minutes TTL
```

**See:** `src/lib/cache.ts` for implementation details.

### 7. Parallel Requests

**Use Promise.all for independent requests:**
```typescript
// GOOD: Parallel requests
const [users, roles, attendees] = await Promise.all([
  databases.listDocuments(dbId, usersCollectionId),
  databases.listDocuments(dbId, rolesCollectionId),
  databases.listDocuments(dbId, attendeesCollectionId)
]);

// BAD: Sequential requests
const users = await databases.listDocuments(dbId, usersCollectionId);
const roles = await databases.listDocuments(dbId, rolesCollectionId);
const attendees = await databases.listDocuments(dbId, attendeesCollectionId);
```

**Performance difference:**
- Parallel: ~200ms (all requests at once)
- Sequential: ~600ms (3 × 200ms)

### 8. Avoid Unnecessary Re-renders

**React optimization:**
```typescript
// Use useMemo for expensive computations
const filteredAttendees = useMemo(() => {
  return attendees.filter(a => a.status === 'active');
}, [attendees]);

// Use useCallback for event handlers
const handleClick = useCallback((id: string) => {
  // Handle click
}, []);
```

### 9. Debounce Search Inputs

**For search bars:**
```typescript
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

const debouncedSearch = useDebouncedCallback((term: string) => {
  // Perform search
}, 300); // 300ms delay
```

**Why:** Prevents excessive API calls while user is typing.

### 10. Monitor Performance

**Add performance logging:**
```typescript
const startTime = performance.now();

// Perform operation
const result = await databases.listDocuments(...);

const duration = performance.now() - startTime;
if (duration > 1000) {
  console.warn(`Slow query detected: ${duration}ms`);
}
```

## Common Performance Anti-Patterns

### ❌ Anti-Pattern 1: Loop with Await
```typescript
// BAD: Sequential async operations
for (const item of items) {
  await processItem(item); // Each waits for previous
}

// GOOD: Parallel processing
await Promise.all(items.map(item => processItem(item)));

// GOOD: Batch processing
const chunkSize = 10;
for (let i = 0; i < items.length; i += chunkSize) {
  const chunk = items.slice(i, i + chunkSize);
  await Promise.all(chunk.map(item => processItem(item)));
}
```

### ❌ Anti-Pattern 2: Fetching in Render
```typescript
// BAD: Fetching in component render
function Component() {
  const [data, setData] = useState([]);
  
  // This runs on every render!
  fetch('/api/data').then(res => setData(res));
  
  return <div>{data.length}</div>;
}

// GOOD: Use useEffect
function Component() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetch('/api/data').then(res => setData(res));
  }, []); // Only on mount
  
  return <div>{data.length}</div>;
}
```

### ❌ Anti-Pattern 3: Large JSON Parsing
```typescript
// BAD: Parse large JSON repeatedly
attendees.forEach(attendee => {
  const customFields = JSON.parse(attendee.customFieldValues);
  // Use customFields...
});

// GOOD: Parse once and cache
const parsedAttendees = attendees.map(attendee => ({
  ...attendee,
  customFieldValues: JSON.parse(attendee.customFieldValues)
}));
```

### ❌ Anti-Pattern 4: Unnecessary State Updates
```typescript
// BAD: Update state in loop
items.forEach(item => {
  setItems(prev => [...prev, item]); // Triggers re-render each time
});

// GOOD: Batch state updates
setItems(prev => [...prev, ...items]); // Single re-render
```

## Performance Checklist

Before committing code, verify:

- [ ] No loops with `await` inside (check for N+1 problems)
- [ ] Batch fetching used for related data (chunks of 100)
- [ ] Indexes exist for queried fields
- [ ] Parallel requests used where possible (`Promise.all`)
- [ ] Search inputs are debounced
- [ ] Large datasets use pagination
- [ ] Expensive computations use `useMemo`
- [ ] Event handlers use `useCallback`
- [ ] No fetching in component render
- [ ] State updates are batched

## Performance Testing

### Manual Testing
1. Open browser DevTools → Network tab
2. Load dashboard
3. Check:
   - Total requests: Should be < 10 for initial load
   - Load time: Should be < 2 seconds
   - No duplicate requests

### Automated Testing
```bash
# Run performance benchmarks
npm run test:performance

# Profile specific endpoint
npx tsx scripts/profile-api.ts /api/attendees
```

### Load Testing
```bash
# Test with large dataset
npx tsx scripts/create-test-data.ts --count 5000

# Measure dashboard load time
time curl http://localhost:3000/api/attendees
```

## Real-World Examples

### Example 1: Dashboard Loading (Fixed December 2025)

**Problem:** Dashboard took 10+ seconds to load with 100 attendees

**Root cause:** Individual queries for access control data (N+1 problem)

**Solution:** Batch fetching in chunks of 100

**Result:** Load time reduced from 10s to 1s (10x improvement)

**File:** `src/pages/api/attendees/index.ts`

**Documentation:** `docs/fixes/DASHBOARD_PERFORMANCE_FIX.md`

### Example 2: Custom Field Search

**Problem:** Custom field search appeared slow

**Root cause:** Full-text index added unnecessary overhead

**Solution:** Removed index, kept client-side filtering (appropriate for dataset size)

**Result:** Performance restored

**File:** `src/pages/dashboard.tsx`

**Documentation:** `docs/fixes/CUSTOM_FIELD_SEARCH_ANALYSIS.md`

## Monitoring in Production

### Key Metrics to Track

1. **API Response Times**
   - Target: < 500ms for most endpoints
   - Alert: > 2 seconds

2. **Database Query Count**
   - Target: < 10 queries per page load
   - Alert: > 50 queries

3. **Page Load Time**
   - Target: < 2 seconds
   - Alert: > 5 seconds

4. **Memory Usage**
   - Target: < 100MB per user session
   - Alert: > 500MB

### Setting Up Monitoring

```typescript
// Add to API routes
import { trackPerformance } from '@/lib/monitoring';

export default async function handler(req, res) {
  const startTime = performance.now();
  
  try {
    // Handle request
    const result = await processRequest(req);
    
    const duration = performance.now() - startTime;
    trackPerformance('api.attendees.list', duration);
    
    return res.json(result);
  } catch (error) {
    // Handle error
  }
}
```

## Resources

- [Appwrite Query Documentation](https://appwrite.io/docs/databases#querying-documents)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [N+1 Query Problem Explained](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem)
- [Web Performance Best Practices](https://web.dev/performance/)

## Getting Help

If you encounter performance issues:

1. **Profile the issue**: Use browser DevTools to identify bottleneck
2. **Check this guide**: Look for similar patterns
3. **Review recent changes**: Use `git diff` to see what changed
4. **Run diagnostics**: Use scripts in `scripts/` directory
5. **Document the fix**: Add to `docs/fixes/` for future reference

## Conclusion

Performance is a feature. Following these best practices ensures credential.studio remains fast and responsive as it scales. When in doubt, measure first, optimize second, and always document your findings.

**Remember:** The fastest code is code that doesn't run. Avoid unnecessary work before optimizing necessary work.
