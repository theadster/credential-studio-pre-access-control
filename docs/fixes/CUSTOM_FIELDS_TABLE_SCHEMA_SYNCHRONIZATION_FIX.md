---
title: Custom Fields Table Schema Synchronization Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-07-22
review_interval_days: 90
related_code:
  - scripts/setup-appwrite.ts
  - src/pages/api/event-settings/custom-fields/index.ts
  - src/pages/api/event-settings/custom-fields/[id].ts
---

# Custom Fields Table Schema Synchronization Fix

## Problem

The `custom_fields` table schema in the Appwrite setup script was out of sync with the actual database and codebase usage:

1. **Missing columns**: `defaultValue` and `order` columns were not defined in the setup script
2. **Unused columns**: `fieldOrder` column existed but was never used in the codebase
3. **Missing defaults**: `required` column had no default value
4. **Schema mismatch**: Setup script used inline column definitions, causing failures when table already existed

## Root Cause

The setup script was using inline column definitions in the `createTable()` call, which fails when the table already exists. Additionally, the schema had accumulated legacy fields (`fieldOrder`) that were replaced by the `order` field throughout the codebase.

## Solution

### 1. Added Missing Columns

- **`order` (integer, required)**: Primary field for sorting custom fields. Used throughout all API endpoints for ordering custom fields in event settings.
- **`defaultValue` (varchar 1000, optional)**: Stores default values for custom fields when attendees don't provide input.

### 2. Modified Existing Columns

- **`required` (boolean)**: Added default value of `false` to ensure consistent behavior for existing records.

### 3. Removed Unused Columns

- **`fieldOrder` (integer)**: Removed as it was legacy code. The codebase uses `order` field exclusively.
- **`fieldOrder_idx` (index)**: Removed as it was indexing the unused `fieldOrder` column.

### 4. Refactored Table Creation Pattern

Changed `createCustomFieldsTable()` from inline column definitions to individual column creation:

```typescript
// Before: Inline columns (fails on existing tables)
await tablesDB.createTable({
  databaseId,
  tableId,
  columns: [...]
});

// After: Individual column creation (handles existing tables)
const table = await tablesDB.getTable({ databaseId, tableId });
const existingColumns = table.columns.map(col => col.key);

for (const column of columnsToCreate) {
  if (!existingColumns.includes(column.key)) {
    await createColumn(column);
  }
}
```

This pattern matches other tables in the setup script and properly handles both first-time creation and subsequent runs.

### 5. Added Soft Delete Support

Added `deletedAt` (datetime, optional) column to support the soft delete strategy used throughout the codebase:

- **Soft delete pattern**: Custom fields are marked as deleted by setting `deletedAt` timestamp instead of hard deletion
- **Data preservation**: Enables recovery from accidental deletions and maintains complete audit trails
- **Query filtering**: All custom field queries use `Query.isNull('deletedAt')` to exclude deleted fields
- **Orphaned data handling**: Attendee documents retain deleted field values in `customFieldValues` JSON, but UI filters them out

## Final Schema

### Columns (11 total)

| Column | Type | Size | Required | Default | Purpose |
|--------|------|------|----------|---------|---------|
| `eventSettingsId` | varchar | 255 | Yes | - | Foreign key to event settings |
| `fieldName` | varchar | 255 | Yes | - | Display name of custom field |
| `internalFieldName` | varchar | 255 | No | - | Internal identifier for field |
| `fieldType` | varchar | 50 | Yes | - | Type of field (text, select, etc.) |
| `fieldOptions` | varchar | 5000 | No | - | JSON options for field (for select types) |
| `required` | boolean | - | No | false | Whether field is required for attendees |
| `order` | integer | - | Yes | - | Sort order for displaying fields |
| `showOnMainPage` | boolean | - | No | true | Whether to show on main attendee page |
| `printable` | boolean | - | No | false | Whether field is printable on credentials |
| `defaultValue` | varchar | 1000 | No | - | Default value if attendee doesn't provide |
| `deletedAt` | datetime | - | No | - | Soft delete timestamp (null = active) |

### Indexes (3 total)

- `eventSettingsId_idx`: Key index on `eventSettingsId` for fast lookups by event
- `showOnMainPage_idx`: Key index on `showOnMainPage` for filtering visible fields
- `order_idx`: Key index on `order` for efficient sorting by display order

## Impact

- **Fixes schema mismatches** between setup script and actual database
- **Enables default values** for custom fields (new capability)
- **Improves ordering** with dedicated `order` field
- **Removes technical debt** by eliminating unused `fieldOrder` column
- **Improves reliability** of setup script for both new and existing installations

## Testing

The fix has been validated:

```bash
npx tsx scripts/setup-appwrite.ts
```

- First run: Creates all tables and columns successfully
- Subsequent runs: Verifies schema and adds any missing columns without errors
- All 16 tables created/verified with correct schema

## Related Documentation

- [Appwrite TablesDB API Standard](../appwrite-tablesdb-api.md)
- [Appwrite Index Creation Timing Fix](./APPWRITE_INDEX_CREATION_TIMING_FIX.md)
- [Appwrite TablesDB Tables](https://appwrite.io/docs/products/databases/tables)

</content>
</invoke>