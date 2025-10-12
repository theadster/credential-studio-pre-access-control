# Bulk Import API Key Enhancement

## Overview
Updated the bulk attendee import endpoint to use the Appwrite API key (admin client) for bulk operations instead of session-based authentication. This prevents rate limiting issues when importing large numbers of attendees.

## Problem
The bulk import endpoint was using session-based authentication for all operations, which could lead to rate limiting when importing large CSV files with hundreds or thousands of attendees.

## Solution
Following the same pattern established in the bulk delete endpoint, the import now uses:

1. **Session client** - For validation and reading configuration (event settings, custom fields)
2. **Admin client** - For bulk operations (fetching existing barcodes, creating attendees, logging)

## Changes Made

### File Modified
- `src/pages/api/attendees/import.ts`

### Key Updates

1. **Import admin client**
   ```typescript
   import { createSessionClient, createAdminClient } from '@/lib/appwrite';
   ```

2. **Initialize both clients**
   ```typescript
   // Use session client for validation and reading settings
   const { databases: sessionDatabases } = createSessionClient(req);
   
   // Use admin client for bulk operations to avoid rate limiting
   const { databases: adminDatabases } = createAdminClient();
   ```

3. **Use session client for configuration reads**
   - Event settings lookup
   - Custom fields lookup
   - These are small, one-time operations that benefit from user context

4. **Use admin client for bulk operations**
   - Fetching existing barcodes (pagination through all attendees)
   - Creating attendee documents (potentially hundreds/thousands)
   - Creating audit log entries

5. **Added rate limiting protection**
   ```typescript
   const delayBetweenCreations = 50; // 50ms delay (20 per second)
   
   // If rate limited, wait longer before continuing
   if (error.code === 429) {
     console.log('[Import] Rate limit detected, waiting 2 seconds...');
     await new Promise(resolve => setTimeout(resolve, 2000));
   }
   ```

6. **Added log truncation for large imports**
   - Prevents exceeding Appwrite's 10,000 character limit for string attributes
   - Truncates attendee names and error lists when necessary
   - Falls back to minimal log if still too large

7. **Enhanced logging**
   - Added console logs for debugging and monitoring
   - Tracks progress through import phases
   - Logs rate limit encounters

## Benefits

1. **No Rate Limiting** - API key has higher rate limits than session-based auth
2. **Better Performance** - Faster bulk operations with admin client
3. **Consistent Pattern** - Matches bulk delete implementation
4. **Robust Logging** - Handles large imports without log failures
5. **Better Monitoring** - Console logs help track import progress

## Testing Recommendations

1. **Small Import** - Test with 10-20 attendees to verify basic functionality
2. **Medium Import** - Test with 100-200 attendees to verify rate limiting protection
3. **Large Import** - Test with 500+ attendees to verify:
   - No rate limiting issues
   - Log truncation works correctly
   - Performance is acceptable
4. **Error Handling** - Test with invalid data to verify error reporting
5. **Permissions** - Verify import permission checks still work correctly

## Related Files
- `src/pages/api/attendees/bulk-delete.ts` - Similar pattern for bulk delete
- `src/lib/appwrite.ts` - Admin client configuration
- `docs/fixes/BULK_DELETE_LOG_SIZE_FIX.md` - Related bulk delete enhancement

## Notes
- The session client is still used for validation to ensure the user has proper access
- Permission checks remain unchanged - users still need import permission
- The admin client is only used for the actual bulk operations, not for authorization
