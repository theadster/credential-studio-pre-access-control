# Database Operators Developer Guide

## Overview

Appwrite's database operators enable atomic, server-side operations on database fields, eliminating race conditions and improving performance. This guide covers all available operators in CredentialStudio and how to use them effectively.

## Why Use Database Operators?

### Benefits

1. **Atomic Operations**: Eliminate race conditions in concurrent scenarios
2. **Performance**: Reduce network overhead by performing operations server-side
3. **Reliability**: Server-side operations are more reliable than client-side calculations
4. **Simplicity**: Cleaner code with less boilerplate
5. **Scalability**: Better performance under high concurrency

### When to Use Operators

✅ **Use operators when:**
- Incrementing/decrementing counters (credentials generated, photo uploads)
- Modifying arrays (adding/removing tags, categories)
- Setting timestamps to server time
- Performing bulk updates on numeric fields
- Ensuring data consistency under concurrent access

❌ **Don't use operators when:**
- Complex business logic is required
- Multiple fields need coordinated updates with validation
- The operation requires reading current values for decision-making
- Traditional updates are simpler and sufficient

## Available Operators

### Numeric Operators

#### Increment

Atomically increases a numeric field by a specified value.

```typescript
import { createIncrement } from '@/lib/operators';

// Basic increment
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    credentialCount: createIncrement(1)
  }
});

// Increment with maximum bound
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    credentialCount: createIncrement(1, { max: 100 })
  }
});
```

**Use cases:**
- Credential generation counters
- Photo upload counters
- View counters
- Any incrementing metric

#### Decrement

Atomically decreases a numeric field by a specified value.

```typescript
import { createDecrement } from '@/lib/operators';

// Basic decrement
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    photoUploadCount: createDecrement(1)
  }
});

// Decrement with minimum bound (prevent negative)
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    photoUploadCount: createDecrement(1, { min: 0 })
  }
});
```

**Use cases:**
- Photo deletion counters
- Inventory management
- Credit systems
- Any decrementing metric

#### Multiply, Divide, Power, Modulo

Advanced numeric operations for specialized use cases.

```typescript
import { Operator } from 'appwrite';

// Multiply
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: id,
  data: {
    points: Operator.multiply(2) // Double the points
  }
});

// Divide
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: id,
  data: {
    price: Operator.divide(2) // Half price
  }
});
```

### Array Operators

#### Array Append

Adds one or more values to the end of an array.

```typescript
import { arrayOperators } from '@/lib/operators';

// Append single value
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    tags: arrayOperators.append(['vip'])
  }
});

// Append multiple values
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    tags: arrayOperators.append(['vip', 'speaker', 'sponsor'])
  }
});
```

**Use cases:**
- Adding tags or categories
- Adding items to lists
- Multi-select field values

#### Array Prepend

Adds one or more values to the beginning of an array.

```typescript
import { arrayOperators } from '@/lib/operators';

await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    tags: arrayOperators.prepend(['priority'])
  }
});
```

#### Array Remove

Removes all occurrences of a value from an array.

```typescript
import { arrayOperators } from '@/lib/operators';

await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    tags: arrayOperators.remove('vip')
  }
});
```

#### Array Unique

Removes duplicate values from an array.

```typescript
import { arrayOperators } from '@/lib/operators';

await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    tags: arrayOperators.unique()
  }
});
```

**Use cases:**
- Ensuring no duplicate tags
- Cleaning up multi-select values
- Data normalization

### String Operators

#### String Concatenation

Appends a string to an existing field value.

```typescript
import { stringOperators } from '@/lib/operators';

await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    notes: stringOperators.concat('\n[2025-01-17] New note added')
  }
});
```

**Use cases:**
- Appending notes or comments
- Building log messages
- Concatenating text fields

### Date Operators

#### Date Set Now

Sets a datetime field to the current server time.

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

**Use cases:**
- Timestamp fields (lastUpdated, lastAccessed)
- Audit trails
- Activity tracking

## Common Patterns

### Pattern 1: Counter with Timestamp

Track both count and last occurrence time.

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

### Pattern 2: Bulk Updates with Operators

Update multiple records efficiently.

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

### Pattern 3: Array Management

Safely manage array fields without race conditions.

```typescript
import { arrayOperators } from '@/lib/operators';

// Add tag
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    tags: arrayOperators.append(['new-tag'])
  }
});

// Remove duplicates
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    tags: arrayOperators.unique()
  }
});
```

### Pattern 4: Fallback Strategy

Implement graceful fallback for operator failures.

```typescript
import { createIncrement } from '@/lib/operators';

async function updateWithFallback(attendeeId: string) {
  try {
    // Try operator-based update
    await tablesDB.updateRow({
      databaseId: dbId,
      tableId: collectionId,
      rowId: attendeeId,
      data: {
        credentialCount: createIncrement(1)
      }
    });
  } catch (error) {
    console.error('Operator update failed, using fallback:', error);
    
    // Fallback to traditional update
    const attendee = await databases.getDocument(dbId, collectionId, attendeeId);
    await databases.updateDocument(dbId, collectionId, attendeeId, {
      credentialCount: (attendee.credentialCount || 0) + 1
    });
  }
}
```

### Pattern 5: Transaction with Operators

Use operators within transactions for atomic multi-step operations.

```typescript
import { createIncrement, dateOperators } from '@/lib/operators';
import { ID } from 'appwrite';

const operations = [
  {
    action: 'update',
    databaseId: dbId,
    tableId: attendeesCollectionId,
    rowId: attendeeId,
    data: {
      credentialCount: createIncrement(1),
      lastCredentialGenerated: dateOperators.setNow()
    }
  },
  {
    action: 'create',
    databaseId: dbId,
    tableId: logsCollectionId,
    rowId: ID.unique(),
    data: {
      userId: user.$id,
      action: 'credential_generated',
      timestamp: dateOperators.setNow()
    }
  }
];

await executeTransactionWithRetry(tablesDB, operations);
```

## Error Handling

### Validation Errors

Operators validate inputs before execution.

```typescript
import { createIncrement } from '@/lib/operators';

try {
  // This will throw a validation error
  const operator = createIncrement('invalid'); // Must be a number
} catch (error) {
  console.error('Validation error:', error.message);
  // Handle validation error
}
```

### Execution Errors

Handle errors during operator execution.

```typescript
import { createIncrement } from '@/lib/operators';

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
  if (error.code === 404) {
    console.error('Document not found');
  } else if (error.code === 401) {
    console.error('Permission denied');
  } else {
    console.error('Operator execution failed:', error);
  }
  
  // Implement fallback or retry logic
}
```

### Bounds Checking

Use bounds to prevent invalid values.

```typescript
import { createIncrement, createDecrement } from '@/lib/operators';

// Prevent exceeding maximum
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    credentialCount: createIncrement(1, { max: 1000 })
  }
});

// Prevent going below minimum
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    photoUploadCount: createDecrement(1, { min: 0 })
  }
});
```

## Performance Considerations

### Network Overhead Reduction

**Before (2 requests):**
```typescript
// Read document
const attendee = await databases.getDocument(dbId, collectionId, attendeeId);

// Write document
await databases.updateDocument(dbId, collectionId, attendeeId, {
  credentialCount: (attendee.credentialCount || 0) + 1
});
```

**After (1 request):**
```typescript
// Single atomic operation
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    credentialCount: createIncrement(1)
  }
});
```

**Result:** 50% reduction in network calls

### Bulk Operations

Operators significantly improve bulk operation performance.

```typescript
import { createIncrement } from '@/lib/operators';
import { Query } from 'appwrite';

// Update 1000 records with a single operation
await tablesDB.updateRows({
  databaseId: dbId,
  tableId: collectionId,
  data: {
    viewCount: createIncrement(1)
  },
  queries: [
    Query.limit(1000)
  ]
});
```

**Performance improvement:** 30-50% faster than traditional bulk updates

### Memory Usage

Operators reduce client-side memory usage by avoiding document loading.

**Before:**
```typescript
// Load entire document into memory
const attendee = await databases.getDocument(dbId, collectionId, attendeeId);
// Modify in memory
attendee.credentialCount = (attendee.credentialCount || 0) + 1;
// Write back
await databases.updateDocument(dbId, collectionId, attendeeId, attendee);
```

**After:**
```typescript
// No document loading required
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    credentialCount: createIncrement(1)
  }
});
```

## Troubleshooting

### Issue: Operator Not Working

**Symptoms:** Updates don't apply or throw errors

**Solutions:**
1. Verify field type matches operator type (numeric for increment, array for arrayAppend)
2. Check field exists in database schema
3. Verify permissions allow updates
4. Check Appwrite SDK version supports operators

### Issue: Race Conditions Still Occurring

**Symptoms:** Counts are inaccurate under concurrent load

**Solutions:**
1. Verify you're using operators, not traditional updates
2. Check for mixed operator/traditional update patterns
3. Ensure all code paths use operators consistently
4. Review transaction boundaries

### Issue: Performance Not Improved

**Symptoms:** No noticeable performance gain

**Solutions:**
1. Measure baseline performance before operators
2. Verify operators are actually being used (check network requests)
3. Consider whether the operation is I/O bound vs CPU bound
4. Check for other bottlenecks (database indexes, network latency)

### Issue: Validation Errors

**Symptoms:** Operator creation throws errors

**Solutions:**
1. Check input types (numbers for numeric operators, arrays for array operators)
2. Verify values are not NaN or undefined
3. Use TypeScript for compile-time type checking
4. Add runtime validation before operator creation

### Issue: Bounds Not Enforced

**Symptoms:** Values exceed specified min/max

**Solutions:**
1. Verify bounds are passed correctly to operator functions
2. Check Appwrite version supports bounds
3. Consider adding application-level validation
4. Use database constraints as additional safety

## Best Practices

### 1. Use Type-Safe Wrappers

Always use the provided utility functions for type safety.

✅ **Good:**
```typescript
import { createIncrement } from '@/lib/operators';
const operator = createIncrement(1);
```

❌ **Bad:**
```typescript
import { Operator } from 'appwrite';
const operator = Operator.increment(1); // No validation
```

### 2. Add Bounds for Safety

Prevent invalid values with bounds checking.

```typescript
import { createIncrement, createDecrement } from '@/lib/operators';

// Always set reasonable bounds
const increment = createIncrement(1, { max: 10000 });
const decrement = createDecrement(1, { min: 0 });
```

### 3. Implement Fallback Logic

Always have a fallback for critical operations.

```typescript
async function safeUpdate(id: string) {
  try {
    await updateWithOperator(id);
  } catch (error) {
    console.error('Operator failed, using fallback');
    await updateTraditional(id);
  }
}
```

### 4. Log Operator Usage

Track operator usage for monitoring and debugging.

```typescript
import { createIncrement } from '@/lib/operators';

console.log('Using operator: increment', { field: 'credentialCount', value: 1 });

await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    credentialCount: createIncrement(1)
  }
});
```

### 5. Test Concurrent Scenarios

Always test operators under concurrent load.

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

// Verify final count is exactly 100
const attendee = await databases.getDocument(dbId, collectionId, attendeeId);
expect(attendee.credentialCount).toBe(100);
```

### 6. Document Operator Usage

Add comments explaining why operators are used.

```typescript
// Using operator to prevent race conditions during concurrent credential generation
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

## API Reference

### Numeric Operators

```typescript
// Create increment operator
createIncrement(value: number, options?: { min?: number; max?: number }): any

// Create decrement operator
createDecrement(value: number, options?: { min?: number; max?: number }): any
```

### Array Operators

```typescript
// Array operators object
arrayOperators = {
  append: (values: any[]) => any,
  prepend: (values: any[]) => any,
  remove: (value: any) => any,
  insert: (index: number, value: any) => any,
  unique: () => any,
  diff: (values: any[]) => any
}
```

### String Operators

```typescript
// String operators object
stringOperators = {
  concat: (value: string) => any
}
```

### Date Operators

```typescript
// Date operators object
dateOperators = {
  setNow: () => any
}
```

## Examples from CredentialStudio

### Credential Generation

```typescript
// src/pages/api/attendees/[id]/generate-credential.ts
import { createIncrement, dateOperators } from '@/lib/operators';

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

### Photo Upload Tracking

```typescript
// src/pages/api/attendees/[id]/photo.ts
import { createIncrement, createDecrement, dateOperators } from '@/lib/operators';

// On upload
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    photoUploadCount: createIncrement(1),
    lastPhotoUploaded: dateOperators.setNow()
  }
});

// On delete
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    photoUploadCount: createDecrement(1, { min: 0 })
  }
});
```

### Bulk Operations

```typescript
// src/pages/api/attendees/bulk-edit.ts
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

## Conclusion

Database operators are a powerful tool for building reliable, performant applications. By following this guide and best practices, you can leverage operators to eliminate race conditions, improve performance, and simplify your code.

For migration guidance, see the [Operator Migration Guide](../migration/OPERATOR_MIGRATION_GUIDE.md).

For performance benchmarks, see the [Bulk Operations Performance Guide](./BULK_OPERATIONS_PERFORMANCE.md).
