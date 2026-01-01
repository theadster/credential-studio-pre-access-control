---
title: "Preventing Performance Regressions"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/"]
---

# Preventing Performance Regressions

This guide explains how to prevent performance regressions like the dashboard slowdown that occurred in December 2025.

## What Happened

### The Incident (December 2025)

**Problem:** Dashboard loading time increased from ~1-2 seconds to ~10+ seconds

**Root Cause:** Code was changed from batch fetching to individual fetching of access control data

**Impact:** 100x performance degradation for users with 100+ attendees

**Why It Happened:** The change was likely made to:
1. Fix a perceived issue with batch queries
2. Simplify the code (individual queries are easier to understand)
3. Handle edge cases differently
4. Without realizing the performance implications

### The Original Code (Fast)
```typescript
// Batch fetching - 1 query per 100 attendees
const chunkSize = 100;
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

### The Changed Code (Slow)
```typescript
// Individual fetching - 1 query per attendee
for (const attendeeId of attendeeIds) {
  const result = await databases.listDocuments(
    dbId,
    collectionId,
    [Query.equal('attendeeId', attendeeId), Query.limit(1)]
  );
  // Process individual...
}
```

## Prevention Strategies

### 1. Automated Performance Checks

**Run before committing:**
```bash
npm run check:performance
```

This script (`scripts/check-performance-patterns.ts`) automatically detects:
- N+1 query problems (individual queries in loops)
- Sequential await in loops
- Fetch calls in component render
- Repeated JSON.parse in loops

**Add to your workflow:**
```bash
# Before committing
git add .
npm run check:performance
git commit -m "Your commit message"
```

### 2. Code Review Checklist

When reviewing code changes, check for:

- [ ] **Loops with `await` inside** - Red flag for N+1 problems
- [ ] **Database queries in loops** - Should use batch fetching
- [ ] **Performance impact documented** - Why was the change made?
- [ ] **Before/after comparison** - Was performance tested?
- [ ] **Alternative approaches considered** - Why this approach?

### 3. Performance Testing

**Before committing performance-sensitive changes:**

1. **Measure baseline performance:**
   ```bash
   # Time the API endpoint
   time curl http://localhost:3000/api/attendees
   ```

2. **Make your changes**

3. **Measure new performance:**
   ```bash
   # Time again
   time curl http://localhost:3000/api/attendees
   ```

4. **Compare results:**
   - If > 2x slower: Investigate why
   - If > 10x slower: Revert and find alternative

### 4. Load Testing

**Test with realistic data:**
```bash
# Create test data
npx tsx scripts/create-test-data.ts --count 500

# Test dashboard load
time curl http://localhost:3000/api/attendees

# Clean up
npx tsx scripts/cleanup-test-data.ts
```

### 5. Documentation Requirements

**When making performance-related changes, document:**

1. **Why the change was made**
   - What problem does it solve?
   - What alternatives were considered?

2. **Performance impact**
   - Before: X ms
   - After: Y ms
   - Acceptable because: [reason]

3. **Trade-offs**
   - What was gained?
   - What was sacrificed?

**Example:**
```typescript
/**
 * PERFORMANCE NOTE:
 * 
 * This code uses batch fetching (100 items per query) instead of
 * individual queries to avoid N+1 query problem.
 * 
 * Performance:
 * - Batch: 100 attendees = 1 query = ~50ms
 * - Individual: 100 attendees = 100 queries = ~5000ms
 * 
 * Trade-off: Slightly more complex code for 100x better performance.
 * 
 * DO NOT change to individual queries without performance testing!
 */
const chunkSize = 100;
for (let i = 0; i < attendeeIds.length; i += chunkSize) {
  // Batch fetching code...
}
```

### 6. Git Hooks

**Add pre-commit hook to run performance checks:**

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash

echo "Running performance checks..."
npm run check:performance

if [ $? -ne 0 ]; then
  echo "❌ Performance check failed. Commit aborted."
  echo "Fix the issues or use 'git commit --no-verify' to skip (not recommended)"
  exit 1
fi

echo "✅ Performance check passed"
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### 7. Monitoring in Production

**Set up alerts for:**

1. **API response time > 2 seconds**
   - Alert: Slow API endpoint detected
   - Action: Investigate immediately

2. **Database query count > 50 per request**
   - Alert: Potential N+1 query problem
   - Action: Review recent changes

3. **Memory usage > 500MB per user**
   - Alert: Memory leak detected
   - Action: Profile and fix

### 8. Performance Budgets

**Set performance budgets for key metrics:**

| Metric | Target | Alert | Critical |
|--------|--------|-------|----------|
| Dashboard load | < 2s | > 3s | > 5s |
| API response | < 500ms | > 1s | > 2s |
| Database queries | < 10 | > 20 | > 50 |
| Memory per user | < 100MB | > 200MB | > 500MB |

**Enforce in CI/CD:**
```yaml
# .github/workflows/performance.yml
name: Performance Check
on: [pull_request]
jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run check:performance
```

## Common Scenarios

### Scenario 1: "I need to fetch related data for each item"

**❌ Don't do this:**
```typescript
for (const item of items) {
  const related = await fetchRelated(item.id);
  item.related = related;
}
```

**✅ Do this instead:**
```typescript
// Batch fetch all related data
const itemIds = items.map(i => i.id);
const chunkSize = 100;
const allRelated = [];

for (let i = 0; i < itemIds.length; i += chunkSize) {
  const chunk = itemIds.slice(i, i + chunkSize);
  const related = await fetchRelatedBatch(chunk);
  allRelated.push(...related);
}

// Map back to items
const relatedMap = new Map(allRelated.map(r => [r.itemId, r]));
items.forEach(item => {
  item.related = relatedMap.get(item.id);
});
```

### Scenario 2: "Batch queries are failing"

**If batch queries fail, investigate why:**

1. **Check Appwrite limits:**
   - Array queries: max 100 values
   - Document limit: max 5000 per query

2. **Check query syntax:**
   ```typescript
   // Correct
   Query.equal('field', [value1, value2, value3])
   
   // Incorrect
   Query.equal('field', value1, value2, value3)
   ```

3. **Check data types:**
   - Ensure all values in array are same type
   - Strings vs numbers matter

**Don't immediately switch to individual queries!**

### Scenario 3: "The code is too complex"

**If batch fetching seems complex:**

1. **Extract to a helper function:**
   ```typescript
   async function batchFetch<T>(
     ids: string[],
     fetchFn: (chunk: string[]) => Promise<T[]>,
     chunkSize = 100
   ): Promise<T[]> {
     const results: T[] = [];
     for (let i = 0; i < ids.length; i += chunkSize) {
       const chunk = ids.slice(i, i + chunkSize);
       const batch = await fetchFn(chunk);
       results.push(...batch);
     }
     return results;
   }
   
   // Usage
   const related = await batchFetch(
     itemIds,
     (chunk) => databases.listDocuments(dbId, collectionId, [
       Query.equal('itemId', chunk)
     ])
   );
   ```

2. **Add comments explaining why:**
   ```typescript
   // Batch fetching prevents N+1 query problem
   // DO NOT change to individual queries without performance testing
   ```

3. **Document the pattern:**
   - Add to team wiki
   - Reference in code reviews
   - Include in onboarding

## Emergency Response

**If a performance regression is deployed:**

1. **Identify the issue:**
   ```bash
   # Check recent commits
   git log --oneline -10
   
   # Check specific file
   git log --oneline -10 src/pages/api/attendees/index.ts
   ```

2. **Verify the regression:**
   ```bash
   # Compare with previous version
   git diff HEAD~1 src/pages/api/attendees/index.ts
   ```

3. **Quick fix:**
   ```bash
   # Revert the problematic commit
   git revert <commit-hash>
   
   # Or revert specific file
   git checkout HEAD~1 -- src/pages/api/attendees/index.ts
   ```

4. **Test the fix:**
   ```bash
   npm run check:performance
   time curl http://localhost:3000/api/attendees
   ```

5. **Deploy immediately:**
   ```bash
   git commit -m "fix: revert performance regression"
   git push
   ```

6. **Document the incident:**
   - Create file in `docs/fixes/`
   - Explain what happened
   - Document the fix
   - Add prevention measures

## Learning from Incidents

**After each performance incident:**

1. **Post-mortem meeting:**
   - What happened?
   - Why did it happen?
   - How can we prevent it?

2. **Update documentation:**
   - Add to this guide
   - Update code comments
   - Create examples

3. **Improve tooling:**
   - Add new checks to performance script
   - Update CI/CD pipeline
   - Add monitoring alerts

4. **Team training:**
   - Share lessons learned
   - Review best practices
   - Update onboarding materials

## Resources

- [Performance Best Practices](./PERFORMANCE_BEST_PRACTICES.md)
- [Dashboard Performance Fix](../fixes/DASHBOARD_PERFORMANCE_FIX.md)
- [N+1 Query Problem Explained](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem)
- [Appwrite Query Limits](https://appwrite.io/docs/databases#querying-documents)

## Conclusion

Performance regressions are preventable with:
1. Automated checks
2. Code review discipline
3. Performance testing
4. Good documentation
5. Team awareness

**Remember:** It's easier to prevent performance problems than to fix them after deployment.

**When in doubt:** Run `npm run check:performance` before committing!
