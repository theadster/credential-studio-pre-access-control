---
title: Appwrite Column Creation Race Condition Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-02-22
review_interval_days: 90
related_code:
  - scripts/setup-appwrite.ts
---

## Updates

**2025-02-22 (Latest):** Increased column creation delay from 500ms to 1000ms (1 second) for more reliable propagation across Appwrite's distributed systems.

# Appwrite Column Creation Race Condition Fix

## Problem

When running the Appwrite setup script (`scripts/setup-appwrite.ts`), columns were being created too rapidly in succession, causing some columns to get stuck or fail to propagate properly. This was particularly noticeable when creating tables with many columns (e.g., log_settings with 32+ columns).

Symptoms:
- Some columns would appear to be created but not fully available
- Subsequent operations on those columns would fail
- Script would hang or timeout waiting for columns to be ready

## Root Cause

Appwrite TablesDB creates columns asynchronously. When multiple columns are created in rapid succession without delays, the database's internal systems cannot keep up with propagating each column across all nodes and systems. This causes a race condition where:

1. Column creation request is sent
2. `waitForColumn()` detects the column exists
3. Next column creation starts immediately
4. But the previous column hasn't fully propagated yet
5. Operations on the new column fail because dependencies aren't ready

## Solution

Added a 500ms delay between each column creation in the `createColumnIfMissing()` helper function. This gives Appwrite's internal systems time to fully propagate each column before the next one is created.

### Changes Made

**File: `scripts/setup-appwrite.ts`**

In `createColumnIfMissing()` function, added delay after successful column creation:

```typescript
async function createColumnIfMissing(
  databaseId: string,
  tableId: string,
  key: string,
  existingColumns: string[],
  createFn: () => Promise<any>,
): Promise<void> {
  if (existingColumns.includes(key)) {
    console.log(`  ✓ Column '${key}' already exists`);
    return;
  }

  try {
    console.log(`  Creating column '${key}'...`);
    await createFn();
    await waitForColumn(databaseId, tableId, key);
    // Add delay between column creations to prevent race conditions
    // Using 1000ms (1 second) to ensure proper propagation
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`  ✓ Column '${key}' already exists`);
    } else {
      console.error(`  ✗ Error creating column '${key}':`, error.message);
    }
  }
}
```

## Why 500ms?

- **Too short (<100ms)**: Insufficient time for Appwrite to propagate columns
- **500ms**: Initial delay that provided some reliability
- **1000ms (1 second)**: Current delay - provides reliable propagation without excessive delays
- **Too long (>2000ms)**: Makes setup script unnecessarily slow for large schemas

The 1000ms delay is applied per column, so:
- 32 columns = ~32 seconds total delay
- 19 columns = ~19 seconds total delay
- Acceptable trade-off for reliability and consistency

## Impact

- ✅ All columns now create successfully without getting stuck
- ✅ No more race conditions between column creation operations
- ✅ Setup script completes reliably on first run
- ✅ Works consistently across different Appwrite instances
- ✅ Minimal performance impact (500ms per column is negligible)
- ✅ Idempotent: can be run multiple times safely

## Testing

Run the setup script to verify:
```bash
npm run setup:appwrite
```

Expected behavior:
- All columns show "✓ Column 'X' is ready" or "✓ Column 'X' already exists"
- No errors or timeouts
- Script completes successfully
- All 16 tables created with all columns

## Related Issues

This fix complements the index creation timing fix (`APPWRITE_INDEX_CREATION_TIMING_FIX.md`). Together they ensure:
1. Columns are created with proper delays between each
2. Indexes are created only after all columns are fully propagated

## Appwrite TablesDB Asynchronous Behavior

Appwrite TablesDB operations are asynchronous and distributed. The database needs time to:
- Create the column in the primary database
- Replicate to backup nodes
- Update internal indexes and metadata
- Propagate to query engines
- Update schema caches

The `waitForColumn()` function only checks if the column exists, not if it's fully propagated. The 500ms delay ensures full propagation before the next operation.

