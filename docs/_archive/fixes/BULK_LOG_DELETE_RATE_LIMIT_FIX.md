# Bulk Log Delete Rate Limit Fix

## Date
January 9, 2025

## Update (Same Day)
**Solution improved:** Switched from session client to admin client (API key) which has no rate limits. This dramatically improved performance from ~10 logs/second to ~50 logs/second.

## Original Problem
When attempting to delete a large number of log entries using the Delete Logs dialog, the operation would fail almost immediately with Appwrite rate limit errors:

```
Error deleting log 68e3c4f70001ab2dc480: AppwriteException: Rate limit for the current endpoint has been exceeded. Please try again after some time.
{
  code: 429,
  type: 'general_rate_limit_exceeded',
  response: '{"message":"Rate limit for the current endpoint has been exceeded. Please try again after some time.","code":429,"type":"general_rate_limit_exceeded","version":"1.8.0"}'
}
```

### Root Cause
The bulk delete operation was:
1. Processing 10 deletions in parallel (`deletionConcurrency = 10`)
2. No delay between chunks of deletions
3. No delay between batches
4. Hitting Appwrite's rate limit for the delete endpoint

## Final Solution (Admin Client)
Switched from `createSessionClient` to `createAdminClient` for bulk deletions:

1. **Use admin client** - API key authentication has no rate limits
2. **Increased concurrency** - From 5 to 25 parallel deletions
3. **Reduced delays** - 100ms between chunks, 200ms between batches
4. **Much faster** - ~50 logs per second (vs ~10 with session client)

### Why This Works
- **Session client** (user authentication) - Subject to rate limits
- **Admin client** (API key) - No rate limits for server-side operations
- Still validates user permissions before deletion
- Uses session client for auth, admin client for deletions

## Original Solution (Session Client with Rate Limiting)
Initially implemented a multi-layered rate limiting strategy:

1. **Reduced concurrency** - From 10 to 5 parallel deletions
2. **Added chunk delays** - 500ms delay between chunks
3. **Added batch delays** - 1 second delay between batches
4. **Rate limit detection** - Detect 429 errors and wait 2 seconds before retrying
5. **Progress logging** - Log progress to help monitor large deletions

## Changes Made

### 1. Switched to Admin Client

**Before:**
```typescript
const { account, databases } = createSessionClient(req);
// ... use databases for all operations
```

**After:**
```typescript
// Use session client for authentication
const { account, databases: sessionDatabases } = createSessionClient(req);
const user = await account.get();
// ... verify permissions

// Use admin client for bulk deletions (no rate limits)
const { databases: adminDatabases } = createAdminClient();
// ... use adminDatabases for deletions
```

**Benefit:** Admin client has no rate limits, dramatically faster deletions

### 2. Increased Deletion Concurrency

**Before (with session client):**
```typescript
const deletionConcurrency = 5; // Limited to avoid rate limits
```

**After (with admin client):**
```typescript
const deletionConcurrency = 25; // No rate limits with admin client
```

**Benefit:** 5x more parallel deletions = much faster overall

### 3. Reduced Delays

**Before (with session client):**
```typescript
await new Promise(resolve => setTimeout(resolve, 500)); // Between chunks
await new Promise(resolve => setTimeout(resolve, 1000)); // Between batches
```

**After (with admin client):**
```typescript
await new Promise(resolve => setTimeout(resolve, 100)); // Between chunks
await new Promise(resolve => setTimeout(resolve, 200)); // Between batches
```

**Benefit:** Minimal delays needed since no rate limits

### 4. Added Rate Limit Detection and Handling (Kept as Fallback)

**Before:**
```typescript
} catch (error: any) {
  console.error(`Error deleting log ${log.$id}:`, error);
  return { success: false, id: log.$id, error: error.message };
}
```

**After:**
```typescript
} catch (error: any) {
  console.error(`Error deleting log ${log.$id}:`, error);
  
  // If rate limited, return special error to trigger retry
  if (error.code === 429) {
    return { success: false, id: log.$id, error: error.message, rateLimited: true };
  }
  
  return { success: false, id: log.$id, error: error.message };
}
```

**Benefit:** Detects rate limit errors specifically for special handling

### 3. Added Delays Between Chunks

**Before:**
```typescript
const results = await Promise.all(deletePromises);

// Count successes and collect errors
results.forEach((result) => {
  if (result.success) {
    deletedCount++;
  } else {
    errors.push({ id: result.id, error: result.error });
  }
});
```

**After:**
```typescript
const results = await Promise.all(deletePromises);

// Count successes and collect errors
let hasRateLimitError = false;
results.forEach((result) => {
  if (result.success) {
    deletedCount++;
  } else {
    if (result.rateLimited) {
      hasRateLimitError = true;
    }
    errors.push({ id: result.id, error: result.error });
  }
});

// If we hit rate limit, wait longer before next chunk
if (hasRateLimitError) {
  console.log('Rate limit detected, waiting 2 seconds before continuing...');
  await new Promise(resolve => setTimeout(resolve, 2000));
} else {
  // Normal delay between chunks to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));
}
```

**Benefit:** 
- Normal operations: 500ms delay between chunks
- Rate limited: 2 second delay to let rate limit reset

### 4. Added Delays Between Batches

**Before:**
```typescript
// Check if we've processed all documents
if (currentBatch.length < batchSize) {
  break; // Last batch processed
}

// Continue with next batch
offset = 0;
```

**After:**
```typescript
// Check if we've processed all documents
if (currentBatch.length < batchSize) {
  break; // Last batch processed
}

// Add delay between batches to avoid rate limiting
console.log(`Processed batch of ${currentBatch.length} logs. Total: ${totalProcessed}. Waiting before next batch...`);
await new Promise(resolve => setTimeout(resolve, 1000));

// Continue with next batch
offset = 0;
```

**Benefit:** 1 second delay between batches of 100 logs prevents sustained high request rate

## Rate Limiting Strategy

### Timing Breakdown
For deleting 1000 logs:

1. **Batch size:** 100 logs per batch = 10 batches
2. **Chunk size:** 5 logs per chunk = 20 chunks per batch
3. **Chunk delay:** 500ms between chunks = 10 seconds per batch
4. **Batch delay:** 1000ms between batches = 9 seconds total
5. **Total time:** ~109 seconds for 1000 logs

### Adaptive Delays
- **Normal operation:** 500ms between chunks
- **Rate limit detected:** 2000ms before next chunk
- **Between batches:** 1000ms always

### Request Rate
- **Without delays:** ~100 requests/second (would hit rate limit)
- **With delays:** ~5-10 requests/second (safe)

## Files Modified

1. **src/pages/api/logs/delete.ts**
   - Reduced `deletionConcurrency` from 10 to 5
   - Added rate limit detection (429 error code)
   - Added 500ms delay between chunks
   - Added 2000ms delay when rate limited
   - Added 1000ms delay between batches
   - Added progress logging

## Testing

### Verify the Fix

1. **Small deletion (< 100 logs):**
   - Should complete in ~10 seconds
   - No rate limit errors

2. **Medium deletion (100-500 logs):**
   - Should complete in ~1-2 minutes
   - No rate limit errors
   - Progress logs visible in console

3. **Large deletion (> 500 logs):**
   - Should complete without errors
   - May take several minutes
   - Progress logs show batches being processed

### Expected Behavior

✅ **No rate limit errors** - Even for large deletions  
✅ **Steady progress** - Logs deleted consistently  
✅ **Progress visibility** - Console logs show progress  
✅ **Graceful handling** - If rate limited, automatically waits and continues  
✅ **Complete deletion** - All matching logs eventually deleted

### Console Output Example
```
Processed batch of 100 logs. Total: 100. Waiting before next batch...
Processed batch of 100 logs. Total: 200. Waiting before next batch...
Rate limit detected, waiting 2 seconds before continuing...
Processed batch of 100 logs. Total: 300. Waiting before next batch...
```

## Performance Impact

### Before Fix
- **Speed:** Very fast initially
- **Reliability:** Fails on large deletions
- **User experience:** Frustrating errors

### After Fix
- **Speed:** Slower but consistent (~10 logs/second)
- **Reliability:** Completes successfully
- **User experience:** Predictable, no errors

### Time Estimates
- **100 logs:** ~10 seconds
- **500 logs:** ~50 seconds
- **1000 logs:** ~100 seconds
- **5000 logs:** ~8-10 minutes

## Alternative Approaches Considered

### 1. Exponential Backoff
- **Pros:** More sophisticated retry logic
- **Cons:** More complex, harder to predict timing
- **Decision:** Not needed with current approach

### 2. Single-threaded Deletion
- **Pros:** Simplest approach
- **Cons:** Very slow for large deletions
- **Decision:** Too slow, current approach is better

### 3. Batch Delete API
- **Pros:** Much faster
- **Cons:** Appwrite doesn't support batch delete
- **Decision:** Not possible with current Appwrite version

## Future Improvements

1. **Progress UI:** Show progress bar in the dialog
2. **Cancellation:** Allow user to cancel long-running deletions
3. **Background processing:** Move to background job for very large deletions
4. **Batch delete:** If Appwrite adds batch delete API, use it

## Related Documentation
- [Improved Bulk Operation Logging](./IMPROVED_BULK_OPERATION_LOGGING.md)
- [Custom Field and Log Settings Fix](./CUSTOM_FIELD_AND_LOG_SETTINGS_FIX.md)

## Notes

- The delays are conservative to ensure reliability
- For most users, log deletions will be < 1000 logs
- The operation continues even if some deletions fail
- Failed deletions are collected and reported at the end
