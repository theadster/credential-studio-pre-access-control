---
title: TablesDB Setup Scripts Migration
type: runbook
status: active
owner: "@team"
last_verified: 2026-02-19
review_interval_days: 180
related_code:
  - scripts/setup-appwrite.ts
  - scripts/verify-appwrite-setup.ts
  - src/scripts/inspect-event-settings.ts
  - src/scripts/clear-event-settings.ts
---

# TablesDB Setup Scripts Migration

Migrates the Appwrite infrastructure scripts from the legacy `Databases` API to the new `TablesDB` API.

## What Changed

| Script | Change |
|--------|--------|
| `scripts/setup-appwrite.ts` | `Databases` → `TablesDB`, `createCollection` → `createTable` with inline columns/indexes, `createStringAttribute` → `createVarcharColumn`, `createBooleanAttribute` → `createBooleanColumn`, `createIntegerAttribute` → `createIntegerColumn`, `createDatetimeAttribute` → `createDatetimeColumn`, all positional params → object-style params |
| `scripts/verify-appwrite-setup.ts` | `Databases` → `TablesDB`, `listCollections` → `listTables`, updated output terminology |
| `src/scripts/inspect-event-settings.ts` | `Databases` → `TablesDB`, `getCollection` → `getTable`, `listDocuments` → `listRows` |
| `src/scripts/clear-event-settings.ts` | `Databases` → `TablesDB`, `listDocuments` → `listRows`, `deleteDocument` → `deleteRow` |

## Key API Differences

The `TablesDB` `createTable` method supports inline column and index definitions, eliminating the need for sequential attribute creation calls:

```typescript
// Old pattern (Databases)
await databases.createCollection(dbId, collId, 'Users', permissions);
await databases.createStringAttribute(dbId, collId, 'email', 255, true);
await databases.createIndex(dbId, collId, 'email_idx', IndexType.Unique, ['email']);

// New pattern (TablesDB)
await tablesDB.createTable({
  databaseId: dbId,
  tableId: tableId,
  name: 'Users',
  permissions,
  columns: [{ key: 'email', type: 'varchar', size: 255, required: true }],
  indexes: [{ key: 'email_idx', type: 'unique', attributes: ['email'] }],
});
```

String columns use `createVarcharColumn` (max size 16381 chars). For larger text use `createLongtextColumn` or `createMediumtextColumn`.

## Running the Scripts

**IMPORTANT:** All scripts require `.env.local` to be loaded before running. The scripts use `dotenv.config()` to explicitly load environment variables from `.env.local`.

### Setup

1. Create `.env.local` in the project root with required variables (see Environment Variables section below)
2. Run the scripts using `npx tsx` - the scripts will load `.env.local` via `dotenv.config()`

```bash
# Provision a new environment
npx tsx scripts/setup-appwrite.ts

# Verify existing setup
npx tsx scripts/verify-appwrite-setup.ts

# Inspect event settings table
npx tsx src/scripts/inspect-event-settings.ts

# Clear event settings rows (use with caution)
npx tsx src/scripts/clear-event-settings.ts
```

**Note:** If running in CI/CD, ensure `.env.local` is available or set environment variables directly in your CI system. The scripts will not automatically load environment variables from the system - they must be explicitly loaded via `dotenv.config()` or set in the environment before the script runs.

## Environment Variables

All scripts require these variables in `.env.local`:

```
NEXT_PUBLIC_APPWRITE_ENDPOINT
NEXT_PUBLIC_APPWRITE_PROJECT_ID
APPWRITE_API_KEY
NEXT_PUBLIC_APPWRITE_DATABASE_ID
```
