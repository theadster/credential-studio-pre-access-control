---
title: Appwrite TablesDB Index Creation Timing Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-07-22
review_interval_days: 90
related_code:
  - scripts/setup-appwrite.ts
---

# Appwrite TablesDB Index Creation Timing Fix

## Problem

When running the Appwrite setup script (`scripts/setup-appwrite.ts`), index creation was failing with the error:

```
Error creating roleId index: The requested column 'roleId' is not yet available. Please try again later.
```

This occurred despite the script successfully creating the columns beforehand.

## Root Cause

Appwrite TablesDB creates columns asynchronously. While the `waitForColumn()` function waits for each individual column to be available, there's a race condition when creating multiple columns in rapid succession followed immediately by index creation.

The database needs additional time to fully propagate all columns across its internal systems before indexes can reference them. Individual column availability checks don't guarantee the database is ready for index operations.

## Solution

Added a 2-second delay before attempting to create indexes on newly created tables. This ensures all columns are fully propagated in the database before index creation is attempted.

### Changes Made

**File: `scripts/setup-appwrite.ts`**

In `createUsersTable()` and `createAttendeesTable()` functions, added:

```typescript
if (!tableExists) {
  console.log('  Creating indexes...');
  // Wait for all columns to be fully available before creating indexes
  await new Promise(resolve => setTimeout(resolve, 2000));
  try {
    await tablesDB.createIndex({ databaseId, tableId, key, type, columns });
    // ... rest of index creation
  }
}
```

## Impact

- Fixes index creation failures during initial database setup
- Adds minimal overhead (2 seconds) only on first-time table creation
- No impact on existing tables or subsequent runs
- Improves reliability of the setup script

## Testing

The fix has been validated to resolve the timing issue when running:

```bash
npx tsx scripts/setup-appwrite.ts
```

All indexes now create successfully without "column not yet available" errors.

## Related Documentation

- [Appwrite TablesDB API Standard](../appwrite-tablesdb-api.md)
- [Appwrite TablesDB Indexes](https://appwrite.io/docs/products/databases/indexes)
