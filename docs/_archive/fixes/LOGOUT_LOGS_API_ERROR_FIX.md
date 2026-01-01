# Logout Logs API Error Fix

## Issue
When logging out, users encountered a 401 authentication error:
```
User (role: guests) missing scopes (["account"])
```

This error occurred because the dashboard was attempting to fetch logs after the user session was cleared during logout.

## Root Cause
The issue was caused by a race condition in the dashboard's `loadLogs` function:

1. User clicks logout
2. `signOut()` in AuthContext clears the session and sets `user` to `null`
3. The state change triggers a useEffect in dashboard.tsx (line 2329)
4. The useEffect calls `loadLogs()` before the user is redirected away
5. The API call fails with 401 because the session is now invalid

## Solution
Added authentication guards to prevent logs from being loaded when the user is not authenticated:

### Changes Made

1. **Updated `loadLogs` function** (src/pages/dashboard.tsx)
   - Added early return if `currentUser` is null
   - Added `currentUser` to the useCallback dependencies
   - Prevents API calls when user is not authenticated

2. **Updated logs tab useEffect** (src/pages/dashboard.tsx)
   - Changed condition from `currentUser?.role` to `currentUser`
   - Ensures the entire user object exists before loading logs
   - Updated dependency array to watch `currentUser` instead of just `currentUser?.role`

## Technical Details

### Before
```typescript
const loadLogs = useCallback(async (page = 1, filters = logsFilters, retryCount = 0) => {
  setLogsLoading(true);
  try {
    const params = new URLSearchParams({...});
    const response = await fetch(`/api/logs?${params}`);
    // ...
  }
}, [logsPagination.limit, logsFilters]);

useEffect(() => {
  if (activeTab === 'logs' && canAccessTab(currentUser?.role, 'logs')) {
    loadLogs();
  }
}, [activeTab, currentUser?.role, loadLogs]);
```

### After
```typescript
const loadLogs = useCallback(async (page = 1, filters = logsFilters, retryCount = 0) => {
  // Don't load logs if user is not authenticated
  if (!currentUser) {
    console.log('Skipping logs load - user not authenticated');
    return;
  }

  setLogsLoading(true);
  try {
    const params = new URLSearchParams({...});
    const response = await fetch(`/api/logs?${params}`);
    // ...
  }
}, [logsPagination.limit, logsFilters, currentUser]);

useEffect(() => {
  // Only load logs if user is authenticated and has permission
  if (currentUser && activeTab === 'logs' && canAccessTab(currentUser?.role, 'logs')) {
    loadLogs();
  }
}, [activeTab, currentUser, loadLogs]);
```

## Testing
- ✅ No TypeScript errors
- ✅ Logout flow no longer triggers 401 errors
- ✅ Logs still load correctly when authenticated
- ✅ Real-time updates still work for authenticated users

## Impact
- **User Experience**: Eliminates confusing error messages during logout
- **Console Cleanliness**: Removes unnecessary 401 errors from logs
- **Performance**: Prevents unnecessary API calls during logout
- **Security**: Ensures logs API is only called when user is authenticated

## Files Modified
- `src/pages/dashboard.tsx` - Added authentication guards to loadLogs function and useEffect

## Related Issues
This fix addresses the race condition between logout and dashboard state updates, ensuring a clean logout experience without API errors.
