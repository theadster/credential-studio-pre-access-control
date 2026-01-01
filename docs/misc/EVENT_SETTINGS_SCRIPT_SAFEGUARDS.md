---
title: "Event Settings Recreation Script - Safeguards Implementation"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/scripts/recreate-event-settings-fresh.ts"]
---

# Event Settings Recreation Script - Safeguards Implementation

## Overview
Added comprehensive safeguards to `src/scripts/recreate-event-settings-fresh.ts` to prevent accidental data loss during the destructive collection deletion operation.

## Changes Made

### 1. Environment Variable Validation
Before any operations, the script validates all required environment variables:
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `NEXT_PUBLIC_APPWRITE_DATABASE_ID`

If any are missing or empty:
- Logs clear error messages listing missing/invalid variables
- Provides example configuration
- Exits immediately with error code 1
- Prevents any destructive operations

### 2. CLI Flags
- `--confirm-delete`: Explicitly confirm deletion without interactive prompt
- `--dry-run`: Preview all operations without making any changes

### 3. Interactive Confirmation
When `--confirm-delete` flag is not provided, the script prompts the user to type "DELETE" to confirm the destructive operation.

### 4. Automatic Backup
Before deleting the collection, the script:
- Fetches all documents from the existing collection
- Creates a timestamped backup file in `backups/event-settings/`
- Stores complete collection data including metadata
- Fails the deletion if backup creation fails (unless collection doesn't exist)

### 5. Dry Run Mode
When using `--dry-run`, the script:
- Shows what would be deleted
- Lists all documents that would be migrated
- Displays the collection structure that would be created
- Makes zero changes to the database

## Usage Examples

### Safe Preview (Recommended First Step)
```bash
npx tsx src/scripts/recreate-event-settings-fresh.ts --dry-run
```

### Execute with Confirmation Flag
```bash
npx tsx src/scripts/recreate-event-settings-fresh.ts --confirm-delete
```

### Execute with Interactive Prompt
```bash
npx tsx src/scripts/recreate-event-settings-fresh.ts
# Will prompt: Type "DELETE" to confirm
```

## Backup Structure

Backups are stored in: `backups/event-settings/event-settings-backup-[timestamp].json`

Example backup file structure:
```json
{
  "timestamp": "2025-10-07T12:34:56.789Z",
  "collectionId": "event_settings",
  "databaseId": "...",
  "documentCount": 5,
  "documents": [...]
}
```

## Safety Features

1. **Environment validation**: Validates all required env vars before any operations
2. **Pre-deletion backup**: Automatic backup before any deletion
3. **Backup validation**: Deletion aborts if backup fails
4. **Explicit confirmation**: Requires either flag or typed confirmation
5. **Dry run capability**: Test without making changes
6. **Clear logging**: All operations are logged with timestamps
7. **Backup location tracking**: Script outputs backup file path
8. **No non-null assertions**: Uses validated values instead of `!` operator

## Error Handling

- If env vars are missing: Exits immediately with clear error message
- If collection doesn't exist: Warns but continues (no backup needed)
- If backup fails: Aborts deletion immediately
- If user cancels: Exits gracefully without changes
- If migration fails: Logs errors but backup remains available

### Environment Variable Error Example
```
❌ Environment Variable Validation Failed

========================================

Missing required environment variables:
  - APPWRITE_API_KEY
  - NEXT_PUBLIC_APPWRITE_DATABASE_ID

Please ensure all required environment variables are set in .env.local:
  NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
  NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
  APPWRITE_API_KEY=your-api-key
  NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id

========================================
```

## Recovery

If something goes wrong, restore from backup:
1. Locate backup file in `backups/event-settings/`
2. Use Appwrite dashboard or API to recreate collection
3. Import documents from backup JSON file

## Implementation Details

### New Functions
- `validateEnvironment()`: Validates all required env vars before any operations
- `ensureBackupDirectory()`: Creates backup directory structure
- `backupCollectionData()`: Fetches and saves collection data
- `promptForConfirmation()`: Interactive user confirmation

### Modified Functions
- Script initialization: Validates env vars before creating clients
- `deleteExistingCollection()`: Now includes all safeguards
- `createNewCollection()`: Respects dry-run mode
- `migrateData()`: Respects dry-run mode
- `main()`: Validates flags and shows warnings

### Code Quality Improvements
- Removed all non-null assertions (`!`) on `process.env` values
- Uses validated environment object throughout
- Type-safe environment variable access
- Early exit on configuration errors

## Testing

To test the safeguards:
1. Run with `--dry-run` to verify preview mode
2. Run without flags to test interactive prompt
3. Run with `--confirm-delete` to test automatic execution
4. Verify backup files are created in `backups/event-settings/`

## Date
October 7, 2025
