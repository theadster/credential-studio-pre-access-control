# Delete Logs Progress Display Fix

## Problem

The delete logs dialog was not showing any progress information during deletion:
- No count of logs being deleted
- No indication of how many have been deleted
- Just showed "Processing..." without numbers
- Terminal showed progress but UI didn't

## Solution

Added proper progress tracking with estimated counts during deletion and actual counts when complete.

## Changes Made

### 1. API Enhancement (`src/pages/api/logs/delete.ts`)

**Added total count before deletion:**
```typescript
// First, get a count of logs to be deleted
const countResponse = await adminDatabases.listDocuments(
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
  [...queries, Query.limit(1)]
);
const totalToDelete = countResponse.total;
```

**Updated response to include total:**
```typescript
res.status(200).json({
  success: true,
  deletedCount,
  totalProcessed,
  totalToDelete,  // NEW: Total count found
  message: `Successfully deleted ${deletedCount} of ${totalToDelete} log entries`,
  errors: errors.length > 0 ? errors : undefined
});
```

### 2. Dialog Enhancement (`src/components/LogsDeleteDialog.tsx`)

**Added progress estimator:**
```typescript
// Start a progress estimator based on time elapsed (~10 logs per second)
const progressInterval = setInterval(() => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const estimatedDeleted = elapsed * 10;
  
  setProgress(prev => ({
    ...prev,
    current: estimatedDeleted,
    percentage: prev.total > 0 ? Math.min(95, (estimatedDeleted / prev.total) * 100) : 0
  }));
}, 1000);
```

**Enhanced progress display:**
```typescript
// Shows during deletion
{progress.current > 0
  ? `~${progress.current} deleted${progress.total > 0 ? ` of ${progress.total}` : '...'}`
  : 'Initializing...'}

// Shows when complete
{progress.percentage === 100 
  ? `${progress.current} of ${progress.total} deleted`
  : ...}
```

## How It Works

### Phase 1: Counting (< 1 second)
1. API receives delete request
2. Queries database to count matching logs
3. Logs: "Found X logs matching criteria"
4. Returns total count in response

### Phase 2: Deleting (varies by count)
1. Dialog shows estimated progress based on time
2. Updates every second: elapsed_seconds × 10 = estimated_deleted
3. Shows: "~150 deleted of 1000" (example after 15 seconds)
4. Progress bar shows percentage if total is known

### Phase 3: Complete
1. API returns actual deleted count
2. Dialog shows: "1000 of 1000 deleted"
3. Progress bar shows 100%
4. Success message displayed

## Display Examples

### During Deletion (after 10 seconds)
```
Deleting logs...
[████████░░░░░░░░░░░░] 10%

~100 deleted of 1000                    ~90s remaining

Please wait while logs are being deleted...
```

### When Complete
```
Deleting logs...
[████████████████████] 100%

1000 of 1000 deleted

Please wait while logs are being deleted...
```

### Small Deletion (< 100 logs)
```
Deleting logs...
[████████████████████] 100%

~50 deleted...                          

Please wait while logs are being deleted...
```

## Benefits

✅ **Visible Progress** - Users see estimated count updating  
✅ **Total Count** - Shows "X of Y" when total is known  
✅ **Time Estimate** - Shows remaining time based on rate  
✅ **Accurate Completion** - Final count is exact, not estimated  
✅ **No Inflation** - Estimates cap at 95% until actual completion  

## Technical Details

### Estimation Rate
- **10 logs per second** - Based on actual deletion rate with delays
- Updates every 1 second
- Caps at 95% to avoid showing 100% before actual completion

### Count Accuracy
- **Estimated during**: Based on time × rate
- **Exact at completion**: From API response
- **Total known**: From initial count query

### Performance Impact
- Initial count query: < 1 second (uses limit=1, just gets total)
- No additional overhead during deletion
- Progress updates: Client-side only, no API calls

## Testing

Verify the following scenarios:

### Small Deletion (< 100 logs)
- [ ] Shows estimated count
- [ ] Completes quickly
- [ ] Shows exact final count

### Medium Deletion (100-1000 logs)
- [ ] Shows "X of Y deleted"
- [ ] Progress bar moves smoothly
- [ ] Time estimate is reasonable
- [ ] Final count is accurate

### Large Deletion (> 1000 logs)
- [ ] Shows progress throughout
- [ ] Doesn't freeze or hang
- [ ] Time estimate updates
- [ ] Completes successfully

### Edge Cases
- [ ] No logs match filters: Shows "0 of 0 deleted"
- [ ] Partial failure: Shows "X of Y deleted (Z failed)"
- [ ] Network error: Shows error message, clears progress

## Related Files

- `src/pages/api/logs/delete.ts` - API endpoint with count logic
- `src/components/LogsDeleteDialog.tsx` - Dialog with progress display
- `docs/fixes/DELETE_LOGS_RATE_LIMIT_FIX.md` - Original rate limit fix

## Future Enhancements

Possible improvements:
1. Server-sent events for real-time progress
2. Pause/resume functionality
3. Cancel deletion mid-process
4. Show which logs are being deleted (first few names)
5. Progress persistence across page refresh
