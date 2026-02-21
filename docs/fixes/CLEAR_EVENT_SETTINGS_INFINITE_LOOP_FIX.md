---
title: Clear Event Settings Infinite Loop Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-02-20
review_interval_days: 90
related_code:
  - src/scripts/clear-event-settings.ts
---

# Clear Event Settings Infinite Loop Fix

## Problem

The `clear-event-settings.ts` script had a potential infinite loop when row deletions failed due to permissions or transient errors.

### Root Cause

The deletion loop used `offset=0` to always fetch the first batch of rows (since rows shift after deletion). However, if all rows in a batch failed to delete, the script would:

1. Fetch the same batch again (offset=0)
2. Attempt deletion again
3. Fail again
4. Loop infinitely without exit condition

This could occur when:
- Insufficient permissions to delete rows
- Transient API errors that persist across retries
- Database constraints preventing deletion

## Solution

Added a **consecutive failure counter** that breaks the loop after 3 consecutive batches where all rows fail to delete.

### Changes

- Added `consecutiveFailures` counter (initialized to 0)
- Added `maxConsecutiveFailures` constant (set to 3)
- Track `batchFailed` count per batch
- Reset counter on successful deletions
- Exit loop with error message when threshold reached

### Code Changes

```typescript
let consecutiveFailures = 0;
const maxConsecutiveFailures = 3;

// Inside batch processing loop:
let batchFailed = 0;
for (const row of allRowsResponse.rows) {
  try {
    // deletion logic
    consecutiveFailures = 0; // Reset on success
  } catch (error) {
    batchFailed++;
  }
}

// After batch processing:
if (batchFailed === allRowsResponse.rows.length) {
  consecutiveFailures++;
  if (consecutiveFailures >= maxConsecutiveFailures) {
    log(`Stopping: ${maxConsecutiveFailures} consecutive batches failed...`);
    hasMoreRows = false;
  }
} else {
  consecutiveFailures = 0;
}
```

## Impact

- **Prevents infinite loops** when deletions fail persistently
- **Allows partial failures** (some rows delete, some don't)
- **Graceful exit** with clear error message directing users to check permissions
- **No breaking changes** to script behavior on success

## Testing

Run the script in a test environment:

```bash
npx tsx src/scripts/clear-event-settings.ts
```

Verify:
- Script completes successfully when permissions are correct
- Script exits gracefully with error message when permissions are insufficient
- No infinite loops occur in either scenario
