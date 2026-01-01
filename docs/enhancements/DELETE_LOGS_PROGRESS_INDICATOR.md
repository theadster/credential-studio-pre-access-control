---
title: "Delete Logs Progress Indicator"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/logs/delete.ts"]
---

# Delete Logs Progress Indicator

## Date
January 9, 2025

## Enhancement
Added a visual progress indicator to the Delete Logs dialog to show real-time progress during bulk log deletion operations.

## Problem
When deleting large numbers of logs, users had no visibility into:
- How long the operation would take
- How many logs had been deleted
- Whether the operation was still running or stuck
- Estimated time remaining

This created a poor user experience, especially for large deletions that could take several minutes.

## Solution
Implemented a comprehensive progress indicator with:
1. **Progress bar** - Visual representation of completion percentage
2. **Deletion counter** - Shows number of logs deleted
3. **Percentage display** - Shows completion percentage
4. **Time estimate** - Shows estimated time remaining
5. **Status messages** - Clear feedback about what's happening
6. **Loading animation** - Visual confirmation that work is in progress

## Features

### 1. Progress Bar
- Smooth animated progress bar
- Updates every 500ms during deletion
- Shows 0-95% during operation, 100% when complete
- Uses shadcn/ui Progress component

### 2. Deletion Counter
- Shows "X deleted" as logs are removed
- Updates in real-time based on estimated progress
- Shows actual count when operation completes

### 3. Percentage Display
- Shows completion percentage (0-100%)
- Displayed prominently next to "Deleting logs..." text
- Rounds to nearest whole number for clarity

### 4. Time Estimate
- Calculates estimated time remaining
- Based on ~10 logs per second deletion rate
- Updates every 500ms
- Shows in seconds (e.g., "~45s remaining")
- Disappears when operation completes

### 5. Status Messages
- **Starting:** "Initializing..."
- **In Progress:** "Deleting logs..." with percentage
- **Complete:** Shows final count before closing
- **Info Alert:** "Please wait while logs are being deleted..."

### 6. Visual Feedback
- Animated spinner icon during deletion
- Blue info alert with helpful message
- Progress bar with smooth transitions
- Disabled buttons during operation

## Implementation Details

### Progress Estimation Algorithm

Since the API doesn't stream progress, we estimate based on time elapsed:

```typescript
const estimateProgress = () => {
  const elapsed = Date.now() - startTime;
  const estimatedLogsDeleted = Math.floor(elapsed / 100); // ~10 logs per second
  
  // Cap at 95% until we get actual results
  const percentage = Math.min(95, (elapsed / 60000) * 100); // Assume max 1 minute
  
  setProgress(prev => ({
    ...prev,
    current: estimatedLogsDeleted,
    percentage: percentage,
    estimatedTimeRemaining: Math.max(0, 60000 - elapsed)
  }));
};
```

**Key Points:**
- Updates every 500ms
- Estimates ~10 logs per second (based on rate limiting)
- Caps at 95% until actual completion
- Assumes maximum 1 minute for estimation
- Shows actual results when API returns

### State Management

```typescript
const [progress, setProgress] = useState({
  current: 0,        // Number of logs deleted
  total: 0,          // Total logs to delete (set at completion)
  percentage: 0,     // Completion percentage (0-100)
  estimatedTimeRemaining: 0  // Milliseconds remaining
});
```

### Progress UI Structure

```tsx
{isDeleting && (
  <div className="space-y-3 pt-4 border-t">
    {/* Header with percentage */}
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium">Deleting logs...</span>
      <span className="text-muted-foreground">
        {progress.percentage > 0 ? `${Math.round(progress.percentage)}%` : 'Starting...'}
      </span>
    </div>
    
    {/* Progress bar */}
    <Progress value={progress.percentage} className="h-2" />
    
    {/* Counter and time estimate */}
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        {progress.current > 0 ? `${progress.current} deleted` : 'Initializing...'}
      </span>
      {progress.estimatedTimeRemaining > 0 && (
        <span>
          ~{Math.ceil(progress.estimatedTimeRemaining / 1000)}s remaining
        </span>
      )}
    </div>
    
    {/* Info alert */}
    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
        Please wait while logs are being deleted. This may take a few minutes for large deletions.
      </AlertDescription>
    </Alert>
  </div>
)}
```

## User Experience Flow

### 1. Before Deletion
- User selects filters
- Clicks "Delete Logs" button
- Dialog remains open

### 2. During Deletion
- Button changes to "Deleting..." with spinner
- Progress section appears with:
  - "Deleting logs..." header
  - Animated progress bar
  - "X deleted" counter
  - "~Ys remaining" estimate
  - Blue info alert with spinner
- All controls disabled
- Dialog cannot be closed

### 3. After Completion
- Progress bar reaches 100%
- Shows actual deletion count
- Success toast appears
- Dialog closes after 1.5 seconds
- Page refreshes to show updated logs

## Files Modified

1. **src/components/LogsDeleteDialog.tsx**
   - Added progress state management
   - Added progress estimation logic
   - Added progress UI components
   - Added interval-based progress updates
   - Added cleanup on completion/error

## Visual Design

### Progress Bar
- Height: 2px (h-2)
- Color: Primary theme color
- Smooth transitions
- Rounded corners

### Text Hierarchy
- **Header:** "Deleting logs..." - font-medium, text-sm
- **Percentage:** Muted foreground, text-sm
- **Counter:** Muted foreground, text-xs
- **Time:** Muted foreground, text-xs

### Colors
- **Progress bar:** Primary theme color
- **Info alert:** Blue (border-blue-200, bg-blue-50)
- **Spinner:** Blue (text-blue-600)
- **Text:** Blue-800 (light), Blue-200 (dark)

## Benefits

### User Experience
✅ **Visibility** - Users can see progress in real-time  
✅ **Confidence** - Clear indication that operation is working  
✅ **Predictability** - Time estimates help set expectations  
✅ **Feedback** - Multiple indicators confirm progress  
✅ **Professional** - Polished, modern UI

### Technical
✅ **Non-blocking** - UI remains responsive  
✅ **Accurate** - Shows actual results when complete  
✅ **Efficient** - Updates every 500ms (not too frequent)  
✅ **Clean** - Proper cleanup of intervals  
✅ **Error handling** - Clears progress on errors

## Testing

### Test Scenarios

1. **Small deletion (< 100 logs)**
   - Progress bar should fill quickly
   - Time estimate should be accurate
   - Should complete in ~10 seconds

2. **Medium deletion (100-500 logs)**
   - Progress bar should advance steadily
   - Counter should update smoothly
   - Time estimate should decrease
   - Should complete in ~1-2 minutes

3. **Large deletion (> 500 logs)**
   - Progress bar should advance gradually
   - Time estimate should be reasonable
   - Should show "Please wait" message
   - Should complete successfully

4. **Error handling**
   - Progress should reset on error
   - Interval should be cleared
   - Dialog should remain open
   - Error toast should appear

### Expected Behavior

✅ Progress bar starts at 0%  
✅ Updates every 500ms  
✅ Shows estimated count and time  
✅ Reaches 95% before completion  
✅ Shows 100% with actual count  
✅ Dialog closes after 1.5s  
✅ Page refreshes automatically

## Limitations

### Estimation Accuracy
- Progress is estimated, not real-time
- Based on average deletion rate (~10/sec)
- May be faster or slower depending on:
  - Network latency
  - Server load
  - Number of logs
  - Rate limiting

### No Cancellation
- Operation cannot be cancelled once started
- Dialog cannot be closed during deletion
- User must wait for completion

### No Pause/Resume
- Operation runs continuously
- Cannot pause and resume
- Must complete or fail

## Future Enhancements

### 1. Real-time Progress (Advanced)
- Implement Server-Sent Events (SSE)
- Stream actual progress from API
- Show exact counts in real-time
- More accurate time estimates

### 2. Cancellation Support
- Add "Cancel" button during deletion
- Implement abort controller
- Stop deletion gracefully
- Show partial results

### 3. Batch Information
- Show which batch is being processed
- Display "Batch X of Y"
- Show errors per batch
- More detailed progress breakdown

### 4. Historical Data
- Remember average deletion speed
- Use historical data for better estimates
- Adapt estimates based on actual performance

## Related Documentation
- [Bulk Log Delete Rate Limit Fix](../fixes/BULK_LOG_DELETE_RATE_LIMIT_FIX.md)
- [Improved Bulk Operation Logging](../fixes/IMPROVED_BULK_OPERATION_LOGGING.md)

## Notes

- Progress estimation is conservative (assumes 1 minute max)
- Actual deletion may be faster or slower
- Progress bar intentionally caps at 95% until completion
- This prevents showing 100% prematurely
- Final 100% is only shown with actual results
