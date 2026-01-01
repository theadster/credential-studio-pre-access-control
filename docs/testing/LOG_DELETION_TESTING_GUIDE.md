---
title: "Log Deletion Testing Guide"
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/logs/delete.ts"]
---

# Log Deletion Testing Guide

This guide explains how to test the delete logs functionality using the test data injection script.

## Quick Start

### 1. Inject Test Logs

Run the test script to create 1000 log entries:

```bash
npm run test:inject-logs
```

Or directly:

```bash
npx tsx scripts/inject-test-logs.ts
```

### 2. What Gets Created

The script creates 1000 log entries with:
- **Random actions**: create, update, delete, view, print, login, logout, export, import, delete_logs
- **Random dates**: Between October 1-6, 2025 (stored in details field)
- **Real users**: Randomly assigned from your existing users
- **Real attendees**: Randomly assigned to some logs (50% chance)
- **Realistic details**: Action-specific details (e.g., "Created new attendee", "Updated settings")

### 3. Test the Delete Functionality

#### Test Case 1: Delete by Date Range
1. Go to **Activity Logs** tab
2. Click **Delete Logs** button
3. Select "Delete logs before date": Choose today's date
4. Click **Delete Logs**
5. **Expected**: All 1000 logs should be deleted (since they were just created)

#### Test Case 2: Delete by Action Type
1. Run `npm run test:inject-logs` again to create fresh logs
2. Go to **Activity Logs** tab
3. Click **Delete Logs** button
4. Select "Delete logs of specific type": Choose "Create"
5. Click **Delete Logs**
6. **Expected**: Only logs with action "create" are deleted (~100 logs)

#### Test Case 3: Delete by User
1. Run `npm run test:inject-logs` again
2. Go to **Activity Logs** tab
3. Click **Delete Logs** button
4. Select "Delete logs from specific user": Choose a user
5. Click **Delete Logs**
6. **Expected**: Only logs from that user are deleted

#### Test Case 4: Combined Filters
1. Run `npm run test:inject-logs` again
2. Go to **Activity Logs** tab
3. Click **Delete Logs** button
4. Select multiple filters (e.g., before date + action type)
5. Click **Delete Logs**
6. **Expected**: Only logs matching ALL criteria are deleted

## What to Observe

### ✅ Expected Behavior

1. **Progress Indicator**:
   - Shows "Processing..." during deletion
   - Shows "5%" initially to indicate it started
   - Shows "100%" when complete with actual count
   - No inflated numbers or continuous counting

2. **No Rate Limit Errors**:
   - Console should be clean (no 429 errors)
   - No "Too Many Requests" messages
   - Page remains responsive

3. **Page Refresh Behavior**:
   - Page does NOT refresh during deletion
   - Real-time updates are paused
   - Page refreshes 3 seconds after completion
   - Updated log count reflects deletions

4. **Performance**:
   - ~10 logs deleted per second
   - 100 logs: ~10 seconds
   - 1000 logs: ~100 seconds (~1.7 minutes)

### ❌ Issues to Watch For

1. **Progress counter going past actual count** - FIXED
2. **429 rate limit errors in console** - FIXED
3. **Page becoming unresponsive** - FIXED
4. **Multiple overlapping API requests** - FIXED

## Performance Benchmarks

| Logs to Delete | Expected Time | Rate |
|----------------|---------------|------|
| 100 | ~10 seconds | 10/sec |
| 500 | ~50 seconds | 10/sec |
| 1000 | ~100 seconds | 10/sec |
| 5000 | ~8.3 minutes | 10/sec |
| 10000 | ~16.7 minutes | 10/sec |

## Cleanup

To remove all test logs:

```bash
# Option 1: Via UI
1. Go to Activity Logs tab
2. Click "Delete Logs"
3. Select "before" tomorrow's date
4. Click "Delete Logs"

# Option 2: Run the script again and delete
npm run test:inject-logs  # Creates 1000 logs
# Then delete via UI
```

## Troubleshooting

### Script Fails: "No users found"
**Solution**: Create at least one user in your application first.

### Script Fails: "APPWRITE_API_KEY not found"
**Solution**: Add `APPWRITE_API_KEY` to your `.env.local` file.

### Logs created with current date instead of test dates
**Note**: This is expected. Appwrite doesn't allow setting custom `$createdAt` timestamps via API. The intended test dates are stored in the `details` field. For testing, use "before today's date" as the deletion criteria.

### Rate limit errors during injection
**Solution**: The script already includes delays between batches. If you still see errors, increase the `delayBetweenBatches` value in the script (currently 500ms).

## Script Configuration

You can modify these values in `scripts/inject-test-logs.ts`:

```typescript
const totalLogs = 1000;        // Number of logs to create
const batchSize = 10;          // Logs per batch
const delayBetweenBatches = 500; // Milliseconds between batches
```

## Related Documentation

- [Delete Logs Rate Limit Fix](../fixes/DELETE_LOGS_RATE_LIMIT_FIX.md)
- [Scripts README](../../scripts/README.md)
