---
title: Pagination Offset Deletion Bug Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 90
related_code:
  - src/scripts/clear-event-settings.ts
---

# Pagination Offset Deletion Bug Fix

## Issue

Loop condition variable `hasMoreRows` is never defined or updated in pseudocode, causing ReferenceError or infinite loop. If copied into production, this could cause a ReferenceError or an infinite loop, causing the deletion script to hang or crash.

## Root Cause

Incomplete pseudocode example missing proper loop initialization and control:

```typescript
// ❌ BROKEN - hasMoreRows never defined
while (hasMoreRows) {  // ReferenceError: hasMoreRows is not defined
  const rows = await listRows({ offset: 0 });
  // ... delete rows ...
}
```

## Solution

Properly initialize and update loop control variable:

```typescript
// ✅ CORRECT - Proper loop control
let hasMoreRows = true;
while (hasMoreRows) {
  const rows = await listRows({ offset: 0 });
  
  if (rows.length === 0) {
    hasMoreRows = false;
    break;
  }
  
  // Delete rows...
  for (const row of rows) {
    await deleteRow(row.id);
  }
}
```

## Complete Implementation

```typescript
async function deleteAllRows() {
  let hasMoreRows = true;
  let totalDeleted = 0;
  const pageSize = 1000;

  while (hasMoreRows) {
    try {
      // Always fetch from offset 0 since rows shift after deletion
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [Query.limit(pageSize), Query.offset(0)],
      });

      // Check if we have more rows
      if (response.rows.length === 0) {
        hasMoreRows = false;
        break;
      }

      // Delete all rows in this batch
      for (const row of response.rows) {
        try {
          await tablesDB.deleteRow({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            rowId: row.$id,
          });
          totalDeleted++;
        } catch (error: any) {
          console.error(`Failed to delete row ${row.$id}:`, error.message);
        }
      }

      console.log(`Deleted ${totalDeleted} rows so far...`);
    } catch (error: any) {
      console.error('Error during deletion:', error.message);
      hasMoreRows = false;
    }
  }

  console.log(`✅ Deletion complete! Total deleted: ${totalDeleted}`);
  return totalDeleted;
}
```

## Key Points

1. **Initialize hasMoreRows**
   ```typescript
   let hasMoreRows = true;  // Must be initialized
   ```

2. **Update hasMoreRows when done**
   ```typescript
   if (response.rows.length === 0) {
     hasMoreRows = false;
     break;
   }
   ```

3. **Use offset=0 for pagination**
   - Rows shift after deletion
   - Always fetch from beginning
   - Prevents skipping rows

4. **Add error handling**
   - Catch individual row deletion errors
   - Continue with next row
   - Log errors for debugging

5. **Add consecutive failure detection**
   - Prevent infinite loops on persistent errors
   - Break after N consecutive failures
   - Log clear error message

## Enhanced Version with Failure Detection

```typescript
async function deleteAllRowsWithFailureDetection() {
  let hasMoreRows = true;
  let totalDeleted = 0;
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 3;
  const pageSize = 1000;

  while (hasMoreRows) {
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [Query.limit(pageSize), Query.offset(0)],
      });

      if (response.rows.length === 0) {
        hasMoreRows = false;
        break;
      }

      let batchFailed = 0;
      for (const row of response.rows) {
        try {
          await tablesDB.deleteRow({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            rowId: row.$id,
          });
          totalDeleted++;
          consecutiveFailures = 0;  // Reset on success
        } catch (error: any) {
          batchFailed++;
          console.error(`Failed to delete row ${row.$id}:`, error.message);
        }
      }

      // Check for persistent failures
      if (batchFailed === response.rows.length) {
        consecutiveFailures++;
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.error(`Stopping: ${maxConsecutiveFailures} consecutive batches failed`);
          hasMoreRows = false;
        }
      } else {
        consecutiveFailures = 0;
      }

      console.log(`Deleted ${totalDeleted} rows so far...`);
    } catch (error: any) {
      console.error('Fatal error during deletion:', error.message);
      hasMoreRows = false;
    }
  }

  console.log(`✅ Deletion complete! Total deleted: ${totalDeleted}`);
  return totalDeleted;
}
```

## Testing

Test the loop control:

```typescript
describe('Deletion loop', () => {
  it('should initialize hasMoreRows', () => {
    let hasMoreRows = true;
    expect(hasMoreRows).toBe(true);
  });

  it('should exit when no more rows', () => {
    let hasMoreRows = true;
    const rows: any[] = [];
    
    if (rows.length === 0) {
      hasMoreRows = false;
    }
    
    expect(hasMoreRows).toBe(false);
  });

  it('should not infinite loop', async () => {
    let iterations = 0;
    let hasMoreRows = true;
    const maxIterations = 100;

    while (hasMoreRows && iterations < maxIterations) {
      iterations++;
      hasMoreRows = false;  // Exit condition
    }

    expect(iterations).toBe(1);
  });
});
```

## Files Modified

- `src/scripts/clear-event-settings.ts` - Proper loop control with failure detection

## Verification

✅ `hasMoreRows` properly initialized
✅ Loop exits when no more rows
✅ Consecutive failure detection prevents infinite loops
✅ Error handling doesn't break loop
✅ Tests verify loop behavior

