# Database Operators Migration Guide

## Overview

This guide helps you migrate existing code from traditional read-modify-write patterns to Appwrite's atomic database operators. The migration improves performance, eliminates race conditions, and simplifies code.

## Migration Strategy

### Phase 1: Preparation
1. Review existing code for operator opportunities
2. Add operator utility functions
3. Update database schema with operator-managed fields
4. Create tests for operator functionality

### Phase 2: Incremental Migration
1. Start with high-value use cases (counters, concurrent operations)
2. Migrate one feature at a time
3. Test thoroughly after each migration
4. Monitor for issues in production

### Phase 3: Validation
1. Verify data integrity
2. Compare performance metrics
3. Monitor error rates
4. Validate backward compatibility

## Common Migration Patterns

### Pattern 1: Counter Increment

**Before (Race Condition Risk):**
```typescript
// Read current value
const attendee = await databases.getDocument(
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!,
  attendeeId
);

// Increment in memory
const newCount = (attendee.credentialCount || 0) + 1;

// Write back (race condition possible here)
await databases.updateDocument(
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!,
  attendeeId,
  {
    credentialCount: newCount
  }
);
```

**After (Atomic Operation):**
```typescript
import { createIncrement } from '@/lib/operators';

// Single atomic operation
await tablesDB.updateRow({
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  tableId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!,
  rowId: attendeeId,
  data: {
    credentialCount: createIncrement(1)
  }
});
```

**Benefits:**
- ✅ No race conditions
- ✅ 50% fewer network requests
- ✅ Simpler code
- ✅ Better performance

### Pattern 2: Counter Decrement

**Before:**
```typescript
const attendee = await databases.getDocument(dbId, collectionId, attendeeId);

const newCount = Math.max(0, (attendee.photoUploadCount || 0) - 1);

await databases.updateDocument(dbId, collectionId, attendeeId, {
  photoUploadCount: newCount
});
```

**After:**
```typescript
import { createDecrement } from '@/lib/operators';

await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    photoUploadCount: createDecrement(1, { min: 0 })
  }
});
```

**Benefits:**
- ✅ Bounds checking built-in
- ✅ Atomic operation
- ✅ Cleaner code

### Pattern 3: Array Manipulation

**Before:**
```typescript
const attendee = await databases.getDocument(dbId, collectionId, attendeeId);

// Parse JSON array
const tags = JSON.parse(attendee.tags || '[]');

// Add new tag
if (!tags.includes('vip')) {
  tags.push('vip');
}

// Write back
await databases.updateDocument(dbId, collectionId, attendeeId, {
  tags: JSON.stringify(tags)
});
```

**After:**
```typescript
import { arrayOperators } from '@/lib/operators';

await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    tags: arrayOperators.append(['vip'])
  }
});
```

**Benefits:**
- ✅ No JSON parsing/stringifying
- ✅ Atomic operation
- ✅ Handles duplicates automatically
- ✅ Simpler code

### Pattern 4: Timestamp Updates

**Before:**
```typescript
await databases.updateDocument(dbId, collectionId, attendeeId, {
  lastCredentialGenerated: new Date().toISOString()
});
```

**After:**
```typescript
import { dateOperators } from '@/lib/operators';

await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    lastCredentialGenerated: dateOperators.setNow()
  }
});
```

**Benefits:**
- ✅ Server-side timestamp (accurate)
- ✅ No client-server time drift
- ✅ Consistent timezone handling

### Pattern 5: Bulk Updates

**Before:**
```typescript
const attendees = await databases.listDocuments(
  dbId,
  collectionId,
  [Query.equal('status', 'active')]
);

for (const attendee of attendees.documents) {
  const currentCount = attendee.viewCount || 0;
  await databases.updateDocument(dbId, collectionId, attendee.$id, {
    viewCount: currentCount + 1
  });
}
```

**After:**
```typescript
import { createIncrement } from '@/lib/operators';
import { Query } from 'appwrite';

await tablesDB.updateRows({
  databaseId: dbId,
  tableId: collectionId,
  data: {
    viewCount: createIncrement(1)
  },
  queries: [
    Query.equal('status', 'active')
  ]
});
```

**Benefits:**
- ✅ Single operation instead of N operations
- ✅ 30-50% performance improvement
- ✅ Atomic across all records
- ✅ Much simpler code

### Pattern 6: Combined Operations

**Before:**
```typescript
const attendee = await databases.getDocument(dbId, collectionId, attendeeId);

await databases.updateDocument(dbId, collectionId, attendeeId, {
  credentialCount: (attendee.credentialCount || 0) + 1,
  lastCredentialGenerated: new Date().toISOString()
});
```

**After:**
```typescript
import { createIncrement, dateOperators } from '@/lib/operators';

await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    credentialCount: createIncrement(1),
    lastCredentialGenerated: dateOperators.setNow()
  }
});
```

**Benefits:**
- ✅ Both operations atomic
- ✅ Single network request
- ✅ No read required

## Feature-Specific Migration

### Credential Generation

**Files to Update:**
- `src/pages/api/attendees/[id]/generate-credential.ts`

**Changes:**
```typescript
// Add imports
import { createIncrement, dateOperators } from '@/lib/operators';

// Replace credential count update
await tablesDB.updateRow({
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  tableId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!,
  rowId: attendeeId,
  data: {
    credentialCount: createIncrement(1),
    lastCredentialGenerated: dateOperators.setNow(),
    credentialGeneratedAt: dateOperators.setNow()
  }
});
```

**Testing:**
```bash
# Run credential tracking tests
npx vitest --run src/__tests__/api/credential-tracking.test.ts
```

### Photo Upload Tracking

**Files to Update:**
- `src/pages/api/attendees/[id]/photo.ts`

**Changes:**
```typescript
// Add imports
import { createIncrement, createDecrement, dateOperators } from '@/lib/operators';

// On photo upload
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    photoUploadCount: createIncrement(1),
    lastPhotoUploaded: dateOperators.setNow()
  }
});

// On photo delete
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    photoUploadCount: createDecrement(1, { min: 0 })
  }
});
```

**Testing:**
```bash
# Run photo tracking tests
npx vitest --run src/__tests__/api/photo-tracking.test.ts
```

### Custom Field Management

**Files to Update:**
- `src/pages/api/custom-fields/[id].ts`
- `src/lib/customFieldArrayOperators.ts`

**Changes:**
```typescript
// Add imports
import { arrayOperators } from '@/lib/operators';

// For multi-value fields
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    customFieldValues: arrayOperators.append([newValue])
  }
});
```

**Testing:**
```bash
# Run array operations tests
npx vitest --run src/__tests__/api/array-operations.test.ts
```

### Bulk Operations

**Files to Update:**
- `src/pages/api/attendees/bulk-edit.ts`

**Changes:**
```typescript
// Add imports
import { createIncrement, arrayOperators } from '@/lib/operators';

// For numeric fields
if (typeof updateData[field] === 'number') {
  operatorData[field] = createIncrement(updateData[field]);
}

// For array fields
if (Array.isArray(updateData[field])) {
  operatorData[field] = arrayOperators.append(updateData[field]);
}
```

**Testing:**
```bash
# Run bulk operations performance tests
npx vitest --run src/__tests__/performance/bulk-operations.performance.test.ts
```

### Activity Logging

**Files to Update:**
- `src/pages/api/logs/index.ts`

**Changes:**
```typescript
// Add imports
import { dateOperators } from '@/lib/operators';

// Use server-side timestamps
await databases.createDocument(
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
  ID.unique(),
  {
    userId: user.$id,
    action: 'CREDENTIAL_GENERATED',
    timestamp: dateOperators.setNow(),
    details: JSON.stringify(logDetails)
  }
);
```

**Testing:**
```bash
# Run logging operators tests
npx vitest --run src/__tests__/api/logging-operators.test.ts
```

## Database Schema Migration

### Step 1: Add New Attributes

Run the Appwrite setup script to add operator-managed fields:

```bash
node scripts/setup-appwrite.ts
```

This adds:
- `credentialCount` (integer, default: 0)
- `photoUploadCount` (integer, default: 0)
- `viewCount` (integer, default: 0)
- `lastCredentialGenerated` (datetime, optional)
- `lastPhotoUploaded` (datetime, optional)

### Step 2: Migrate Existing Data

Run the migration script to initialize new fields:

```bash
node scripts/migrate-operator-fields.ts
```

This script:
- Sets `credentialCount` based on existing `credentialGeneratedAt` field
- Sets `photoUploadCount` based on existing `photoUrl` field
- Initializes `viewCount` to 0 for all attendees

### Step 3: Verify Migration

```bash
node scripts/verify-appwrite-setup.ts
```

## Backward Compatibility

### Maintaining Compatibility

The migration maintains full backward compatibility:

1. **Existing Fields Preserved**: All existing fields remain unchanged
2. **New Fields Optional**: New operator-managed fields are optional
3. **Gradual Migration**: Features can be migrated incrementally
4. **Fallback Support**: Traditional updates still work

### Compatibility Patterns

**Pattern 1: Dual Field Support**

Support both old and new fields during transition:

```typescript
// Read from either field
const credentialCount = attendee.credentialCount ?? 
  (attendee.credentialGeneratedAt ? 1 : 0);

// Update both fields during transition
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    credentialCount: createIncrement(1),
    credentialGeneratedAt: dateOperators.setNow() // Keep for compatibility
  }
});
```

**Pattern 2: Feature Flags**

Use feature flags to control operator usage:

```typescript
const USE_OPERATORS = process.env.ENABLE_DATABASE_OPERATORS === 'true';

if (USE_OPERATORS) {
  await updateWithOperators(attendeeId);
} else {
  await updateTraditional(attendeeId);
}
```

**Pattern 3: Graceful Fallback**

Implement fallback for operator failures:

```typescript
async function updateWithFallback(attendeeId: string) {
  try {
    await tablesDB.updateRow({
      databaseId: dbId,
      tableId: collectionId,
      rowId: attendeeId,
      data: {
        credentialCount: createIncrement(1)
      }
    });
  } catch (error) {
    console.error('Operator failed, using fallback:', error);
    
    const attendee = await databases.getDocument(dbId, collectionId, attendeeId);
    await databases.updateDocument(dbId, collectionId, attendeeId, {
      credentialCount: (attendee.credentialCount || 0) + 1
    });
  }
}
```

## Rollback Procedures

### Scenario 1: Operator Issues Detected

If operators cause issues in production:

1. **Disable Operators via Feature Flag**
   ```bash
   # Set environment variable
   ENABLE_DATABASE_OPERATORS=false
   ```

2. **Revert to Traditional Updates**
   - Code automatically falls back to traditional updates
   - No data loss occurs
   - Operator-managed fields remain valid

3. **Monitor and Debug**
   - Check logs for operator errors
   - Verify data integrity
   - Identify root cause

### Scenario 2: Data Integrity Issues

If data inconsistencies are detected:

1. **Stop Using Operators**
   ```bash
   ENABLE_DATABASE_OPERATORS=false
   ```

2. **Audit Data**
   ```typescript
   // Compare operator-managed fields with source data
   const attendees = await databases.listDocuments(dbId, collectionId);
   
   for (const attendee of attendees.documents) {
     const expectedCount = attendee.credentialGeneratedAt ? 1 : 0;
     if (attendee.credentialCount !== expectedCount) {
       console.error('Mismatch detected:', attendee.$id);
     }
   }
   ```

3. **Correct Data**
   ```bash
   # Re-run migration script
   node scripts/migrate-operator-fields.ts
   ```

### Scenario 3: Performance Regression

If operators don't improve performance:

1. **Measure Baseline**
   ```bash
   # Run performance tests
   npx vitest --run src/__tests__/performance/
   ```

2. **Compare Metrics**
   - Check operation latency
   - Monitor network requests
   - Measure throughput

3. **Identify Bottleneck**
   - Database indexes
   - Network latency
   - Query complexity

4. **Optimize or Revert**
   - Add indexes if needed
   - Optimize queries
   - Revert if no improvement possible

## Testing Strategy

### Unit Tests

Test operator utility functions:

```bash
npx vitest --run src/__tests__/lib/operators.test.ts
```

### Integration Tests

Test end-to-end operator functionality:

```bash
# Credential tracking
npx vitest --run src/__tests__/api/credential-tracking.test.ts

# Photo tracking
npx vitest --run src/__tests__/api/photo-tracking.test.ts

# Array operations
npx vitest --run src/__tests__/api/array-operations.test.ts

# Logging operators
npx vitest --run src/__tests__/api/logging-operators.test.ts
```

### Performance Tests

Measure performance improvements:

```bash
npx vitest --run src/__tests__/performance/bulk-operations.performance.test.ts
```

### Concurrent Tests

Verify atomic behavior under load:

```typescript
// Test concurrent increments
const promises = Array.from({ length: 100 }, () =>
  tablesDB.updateRow({
    databaseId: dbId,
    tableId: collectionId,
    rowId: attendeeId,
    data: {
      credentialCount: createIncrement(1)
    }
  })
);

await Promise.all(promises);

// Verify final count
const attendee = await databases.getDocument(dbId, collectionId, attendeeId);
expect(attendee.credentialCount).toBe(100);
```

## Migration Checklist

### Pre-Migration
- [ ] Review existing code for operator opportunities
- [ ] Create operator utility functions (`src/lib/operators.ts`)
- [ ] Create type definitions (`src/types/operators.ts`)
- [ ] Write unit tests for operators
- [ ] Update database schema (run `scripts/setup-appwrite.ts`)
- [ ] Migrate existing data (run `scripts/migrate-operator-fields.ts`)

### Migration
- [ ] Migrate credential generation
- [ ] Migrate photo upload tracking
- [ ] Migrate custom field management
- [ ] Migrate bulk operations
- [ ] Migrate activity logging
- [ ] Update dashboard to use new fields

### Testing
- [ ] Run all unit tests
- [ ] Run all integration tests
- [ ] Run performance tests
- [ ] Test concurrent scenarios
- [ ] Verify data integrity
- [ ] Test backward compatibility

### Deployment
- [ ] Deploy to staging environment
- [ ] Monitor for 24 hours
- [ ] Verify performance improvements
- [ ] Check error rates
- [ ] Deploy to production
- [ ] Monitor production metrics

### Post-Migration
- [ ] Document performance improvements
- [ ] Update API documentation
- [ ] Train team on operator usage
- [ ] Remove feature flags (if stable)
- [ ] Archive old code patterns

## Common Pitfalls

### Pitfall 1: Mixing Operators and Traditional Updates

❌ **Wrong:**
```typescript
// Some code uses operators
await tablesDB.updateRow({
  data: { credentialCount: createIncrement(1) }
});

// Other code uses traditional updates
const attendee = await databases.getDocument(dbId, collectionId, id);
await databases.updateDocument(dbId, collectionId, id, {
  credentialCount: attendee.credentialCount + 1
});
```

✅ **Correct:**
```typescript
// All code uses operators consistently
await tablesDB.updateRow({
  data: { credentialCount: createIncrement(1) }
});
```

### Pitfall 2: Forgetting Bounds Checking

❌ **Wrong:**
```typescript
// Can go negative
await tablesDB.updateRow({
  data: { photoUploadCount: createDecrement(1) }
});
```

✅ **Correct:**
```typescript
// Prevents negative values
await tablesDB.updateRow({
  data: { photoUploadCount: createDecrement(1, { min: 0 }) }
});
```

### Pitfall 3: Not Handling Errors

❌ **Wrong:**
```typescript
// No error handling
await tablesDB.updateRow({
  data: { credentialCount: createIncrement(1) }
});
```

✅ **Correct:**
```typescript
// Proper error handling with fallback
try {
  await tablesDB.updateRow({
    data: { credentialCount: createIncrement(1) }
  });
} catch (error) {
  console.error('Operator failed:', error);
  await fallbackUpdate(attendeeId);
}
```

### Pitfall 4: Incorrect Field Types

❌ **Wrong:**
```typescript
// Using increment on string field
await tablesDB.updateRow({
  data: { name: createIncrement(1) } // name is a string!
});
```

✅ **Correct:**
```typescript
// Use correct operator for field type
await tablesDB.updateRow({
  data: { credentialCount: createIncrement(1) } // numeric field
});
```

### Pitfall 5: Not Testing Concurrency

❌ **Wrong:**
```typescript
// Only test sequential operations
await updateCount(id);
await updateCount(id);
expect(count).toBe(2);
```

✅ **Correct:**
```typescript
// Test concurrent operations
await Promise.all([
  updateCount(id),
  updateCount(id)
]);
expect(count).toBe(2);
```

## Performance Benchmarks

### Expected Improvements

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Single increment | 2 requests | 1 request | 50% faster |
| Bulk update (100 rows) | 100 requests | 1 request | 99% faster |
| Concurrent increments | Race conditions | Atomic | 100% accurate |
| Array append | Read + Parse + Write | Single write | 60% faster |
| Memory usage | Load full document | No loading | 80% less |

### Measuring Performance

```typescript
// Before migration
console.time('traditional-update');
const attendee = await databases.getDocument(dbId, collectionId, id);
await databases.updateDocument(dbId, collectionId, id, {
  credentialCount: (attendee.credentialCount || 0) + 1
});
console.timeEnd('traditional-update');

// After migration
console.time('operator-update');
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: id,
  data: {
    credentialCount: createIncrement(1)
  }
});
console.timeEnd('operator-update');
```

## Support and Resources

### Documentation
- [Database Operators Guide](../guides/DATABASE_OPERATORS_GUIDE.md)
- [Bulk Operations Performance](../guides/BULK_OPERATIONS_PERFORMANCE.md)
- [Array Operators Implementation](../guides/ARRAY_OPERATORS_IMPLEMENTATION.md)

### Code Examples
- `src/lib/operators.ts` - Operator utility functions
- `src/__tests__/lib/operators.test.ts` - Operator tests
- `src/pages/api/attendees/[id]/generate-credential.ts` - Credential tracking example

### Scripts
- `scripts/setup-appwrite.ts` - Database schema setup
- `scripts/migrate-operator-fields.ts` - Data migration
- `scripts/verify-appwrite-setup.ts` - Verification

## Conclusion

Migrating to database operators improves performance, eliminates race conditions, and simplifies code. Follow this guide for a smooth, incremental migration with full backward compatibility and easy rollback if needed.

For detailed operator usage, see the [Database Operators Guide](../guides/DATABASE_OPERATORS_GUIDE.md).
