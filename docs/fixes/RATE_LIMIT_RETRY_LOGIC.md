# Rate Limit Retry Logic for Log Fetching

## Date
January 9, 2025

## Problem
After deleting a large number of logs (700+), when the page tried to refresh and fetch the updated logs, it would hit rate limit errors (429) on the authentication check itself:

```
AppwriteException: Too Many Requests
userId: 'unauthenticated'
endpoint: '/api/logs?page=1&limit=50&action=all&userId=all'
code: 429
```

### Root Cause
1. Bulk deletion uses many API calls (even with admin client)
2. After deletion completes, page immediately tries to refresh
3. The authentication middleware uses session client
4. Session client has rate limits
5. The `account.get()` call in middleware hits rate limit
6. User sees "Too Many Requests" error

## Solution
Implemented a two-part solution:

### 1. Retry Logic with Exponential Backoff
Added automatic retry logic to the `loadLogs` function with exponential backoff:
- **1st retry:** Wait 1 second
- **2nd retry:** Wait 2 seconds  
- **3rd retry:** Wait 4 seconds
- **Max retries:** 3 attempts

### 2. Delayed Refresh After Deletion
Added a 2-second delay before triggering the page refresh after deletion completes:
- Shows 100% progress for 1.5 seconds
- Waits additional 2 seconds before refreshing
- Total delay: 3.5 seconds
- Allows rate limits to reset

## Implementation

### Retry Logic in Dashboard

**Before:**
```typescript
const loadLogs = useCallback(async (page = 1, filters = logsFilters) => {
  setLogsLoading(true);
  try {
    const response = await fetch(`/api/logs?${params}`);
    if (response.ok) {
      const data = await response.json();
      setLogs(data.logs || []);
      // ...
    } else {
      setLogs([]);
    }
  } catch (error) {
    // ...
  }
}, []);
```

**After:**
```typescript
const loadLogs = useCallback(async (page = 1, filters = logsFilters, retryCount = 0) => {
  setLogsLoading(true);
  try {
    const response = await fetch(`/api/logs?${params}`);
    
    // Handle rate limiting with exponential backoff
    if (response.status === 429 && retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      console.log(`Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/3)...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return loadLogs(page, filters, retryCount + 1);
    }
    
    if (response.ok) {
      const data = await response.json();
      setLogs(data.logs || []);
      // ...
    } else {
      setLogs([]);
    }
  } catch (error) {
    // ...
  }
}, []);
```

### Delayed Refresh in Delete Dialog

**Before:**
```typescript
// Wait a moment to show 100% before closing
setTimeout(() => {
  setIsOpen(false);
  setFilters({ beforeDate: '', action: '', userId: '' });
  setProgress({ current: 0, total: 0, percentage: 0, estimatedTimeRemaining: 0 });
  onDeleteSuccess(); // Immediately triggers refresh
}, 1500);
```

**After:**
```typescript
// Wait a moment to show 100% and let rate limits reset before closing
setTimeout(() => {
  setIsOpen(false);
  setFilters({ beforeDate: '', action: '', userId: '' });
  setProgress({ current: 0, total: 0, percentage: 0, estimatedTimeRemaining: 0 });
  // Wait an additional 2 seconds before refreshing to let rate limits reset
  setTimeout(() => {
    onDeleteSuccess(); // Delayed refresh
  }, 2000);
}, 1500);
```

## How It Works

### Scenario: Delete 700 Logs

1. **User clicks "Delete Logs"**
   - Deletion starts with progress indicator

2. **Deletion completes (~14 seconds)**
   - Progress bar shows 100%
   - Success toast appears

3. **Dialog closes (1.5 seconds later)**
   - User sees completion
   - Dialog disappears

4. **Wait period (2 seconds)**
   - Rate limits reset
   - No visible action to user

5. **Page refresh triggered**
   - Calls `loadLogs()`
   - If rate limited (429):
     - Wait 1 second, retry
     - If still rate limited:
       - Wait 2 seconds, retry
       - If still rate limited:
         - Wait 4 seconds, retry
         - If still fails: Show error

6. **Logs displayed**
   - Updated log list shown
   - No rate limit errors

## Benefits

### User Experience
✅ **No error messages** - Automatic retry handles rate limits  
✅ **Seamless operation** - User doesn't notice retries  
✅ **Reliable refresh** - Logs always load eventually  
✅ **Clear feedback** - Console logs show retry attempts

### Technical
✅ **Exponential backoff** - Standard retry pattern  
✅ **Limited retries** - Prevents infinite loops  
✅ **Graceful degradation** - Shows error after 3 attempts  
✅ **Rate limit friendly** - Gives time for limits to reset

## Files Modified

1. **src/pages/dashboard.tsx**
   - Added `retryCount` parameter to `loadLogs`
   - Added 429 status check
   - Added exponential backoff logic
   - Added console logging for retries

2. **src/components/LogsDeleteDialog.tsx**
   - Added 2-second delay before `onDeleteSuccess()`
   - Nested setTimeout for delayed refresh
   - Updated comment to explain delay

## Testing

### Test Scenarios

1. **Normal operation (no rate limits)**
   - Delete logs
   - Page refreshes immediately
   - No retries needed

2. **Single rate limit hit**
   - Delete many logs
   - First refresh attempt rate limited
   - Waits 1 second
   - Second attempt succeeds

3. **Multiple rate limits**
   - Delete many logs quickly
   - Multiple refresh attempts rate limited
   - Retries with increasing delays
   - Eventually succeeds

4. **Persistent rate limiting**
   - Extreme case (very unlikely)
   - All 3 retries fail
   - Error shown to user
   - User can manually refresh later

### Expected Behavior

✅ First attempt usually succeeds (due to 2s delay)  
✅ If rate limited, automatic retry after 1s  
✅ Console shows retry attempts  
✅ User sees loading state during retries  
✅ Eventually succeeds or shows error

## Console Output Example

```
Rate limited, retrying in 1000ms (attempt 1/3)...
Rate limited, retrying in 2000ms (attempt 2/3)...
✓ Logs loaded successfully
```

## Alternative Solutions Considered

### 1. Use Admin Client in Middleware
- **Pros:** No rate limits at all
- **Cons:** Would affect all endpoints, security concerns
- **Decision:** Too broad, current solution is targeted

### 2. Longer Initial Delay
- **Pros:** Simpler, no retry logic needed
- **Cons:** Always slow, even when not needed
- **Decision:** Retry is better UX

### 3. Polling with Backoff
- **Pros:** More sophisticated
- **Cons:** More complex, unnecessary
- **Decision:** Current solution is sufficient

## Limitations

### Still Uses Session Client
- Authentication still subject to rate limits
- Retry logic is a workaround, not a fix
- Admin client in middleware would be better long-term

### Fixed Retry Count
- Maximum 3 retries
- After that, user sees error
- Could be increased if needed

### No User Feedback During Retries
- User just sees loading state
- Could add toast notification
- Current approach is less intrusive

## Future Improvements

### 1. Admin Client for Read Operations
- Use admin client for fetching logs
- Would eliminate rate limits entirely
- Requires middleware changes

### 2. Retry Notification
- Show toast when retrying
- "Rate limited, retrying..."
- More transparent to user

### 3. Configurable Retry Logic
- Make retry count configurable
- Adjust delays based on response headers
- More sophisticated backoff

### 4. Request Queuing
- Queue requests when rate limited
- Process when limits reset
- More elegant solution

## Related Documentation
- [Admin Client for Bulk Deletions](./ADMIN_CLIENT_FOR_BULK_DELETIONS.md)
- [Delete Logs Progress Indicator](../enhancements/DELETE_LOGS_PROGRESS_INDICATOR.md)
- [Bulk Log Delete Rate Limit Fix](./BULK_LOG_DELETE_RATE_LIMIT_FIX.md)

## Notes

- The 2-second delay before refresh is usually sufficient
- Retry logic is a safety net for edge cases
- Most users won't notice the retry happening
- Console logs help with debugging
- This is a client-side solution to a server-side rate limit
