# Delete Logs Rate Limit Fix

## Problem

The delete logs functionality was experiencing two major issues:

1. **Progress Counter Issue**: The progress bar and counter kept counting well past the actual number of logs being deleted, showing inflated numbers (e.g., "8250 deleted" when only a few thousand existed)

2. **Rate Limit Errors**: Continuous 429 "Too Many Requests" errors were occurring during log deletion, caused by:
   - The logs page continuously refreshing via real-time subscription while deletion was in progress
   - Each deletion triggering a real-time event that caused the page to fetch logs
   - Multiple simultaneous API calls overwhelming Appwrite's rate limits

## Root Causes

### Progress Counter
The progress estimator in `LogsDeleteDialog.tsx` was using a time-based calculation that assumed ~50 logs per second deletion rate. However, the actual deletion rate is much slower (~10 logs per second) due to rate limiting protections. The estimator kept incrementing based on elapsed time rather than actual deletions.

### Rate Limiting
The real-time subscription for logs in `dashboard.tsx` was triggering a page refresh every time a log was deleted. During bulk deletions of thousands of logs, this caused:
- Hundreds of simultaneous real-time events
- Each event triggering a `loadLogs()` call after 2 seconds
- Multiple overlapping API requests to `/api/logs`
- Rate limit exhaustion (429 errors)

## Solutions Implemented

### 1. Simplified Progress Indicator

**File**: `src/components/LogsDeleteDialog.tsx`

- Removed time-based progress estimation
- Changed to simple "In progress..." state during deletion
- Only show actual count when deletion completes (100%)
- Updated messaging to indicate ~10 logs per second rate
- Removed misleading estimated time remaining

**Changes**:
```typescript
// Before: Time-based estimation with interval
const estimateProgress = () => {
  const elapsed = Date.now() - startTime;
  const estimatedLogsDeleted = Math.floor(elapsed / 20); // Wrong!
  // ...
};
progressInterval = setInterval(estimateProgress, 500);

// After: Simple progress state
setProgress({
  current: 0,
  total: 0,
  percentage: 5, // Just show it started
  estimatedTimeRemaining: 0
});
```

### 2. Pause Real-time Updates During Deletion

**Files**: 
- `src/components/LogsDeleteDialog.tsx`
- `src/pages/dashboard.tsx`

Added pause/resume mechanism for real-time log updates:

**LogsDeleteDialog.tsx**:
- Added `onDeleteStart` and `onDeleteEnd` callback props
- Call `onDeleteStart()` when deletion begins
- Call `onDeleteEnd()` when deletion completes or errors

**dashboard.tsx**:
- Added `pauseLogsRealtime` state
- Modified logs real-time subscription to check pause state
- Pass pause/resume callbacks to LogsDeleteDialog
- Skip `loadLogs()` calls when paused

**Changes**:
```typescript
// Dashboard: Pause state
const [pauseLogsRealtime, setPauseLogsRealtime] = useState(false);

// Dashboard: Real-time subscription with pause check
useRealtimeSubscription({
  channels: [`databases...logs...`],
  callback: useCallback((response: any) => {
    if (pauseLogsRealtime) {
      console.log('Logs change received but refresh paused during bulk operation');
      return; // Skip refresh
    }
    setTimeout(() => loadLogs(), 2000);
  }, [loadLogs, pauseLogsRealtime])
});

// Dashboard: Pass callbacks to dialog
<LogsDeleteDialog
  users={users}
  onDeleteSuccess={() => loadLogs(1, logsFilters)}
  onDeleteStart={() => setPauseLogsRealtime(true)}
  onDeleteEnd={() => setPauseLogsRealtime(false)}
>
```

### 3. Slower Deletion Rate

**File**: `src/pages/api/logs/delete.ts`

Previously updated to:
- Delete logs sequentially (one at a time) instead of 25 in parallel
- 100ms delay between each deletion (~10 per second)
- Smaller batch size (25 instead of 100)
- Longer recovery time on rate limit detection (3 seconds)

## Results

### Before
- Progress showed "8250 deleted" when only ~2000 logs existed
- Continuous 429 rate limit errors
- Page became unresponsive during deletion
- Multiple overlapping API requests

### After
- Progress shows simple "Processing..." until complete
- No rate limit errors during deletion
- Page remains responsive
- Single deletion operation without interference
- Clean completion with 3-second cooldown before refresh

## Performance

**Deletion Rate**: ~10 logs per second
- 600 logs per minute
- 36,000 logs per hour

**Wait Times**:
- 100 logs: ~10 seconds
- 1,000 logs: ~100 seconds (~1.7 minutes)
- 10,000 logs: ~1,000 seconds (~16.7 minutes)

## Testing

To test the fix:
1. Navigate to Activity Logs tab
2. Click "Delete Logs"
3. Select a date range with many logs
4. Click "Delete Logs"
5. Observe:
   - Progress shows "Processing..." without inflated counts
   - No 429 errors in console
   - Page doesn't refresh during deletion
   - Completion shows actual count deleted
   - Page refreshes 3 seconds after completion

## Files Modified

1. `src/components/LogsDeleteDialog.tsx`
   - Simplified progress indicator
   - Added pause/resume callbacks
   - Removed time-based estimation

2. `src/pages/dashboard.tsx`
   - Added pause state for real-time updates
   - Modified logs subscription to respect pause
   - Pass callbacks to LogsDeleteDialog

3. `src/pages/api/logs/delete.ts` (previously modified)
   - Sequential deletion with delays
   - Rate limit protection

## Related Issues

- Rate limiting during bulk operations
- Real-time subscription interference
- Progress estimation accuracy
- User experience during long-running operations
