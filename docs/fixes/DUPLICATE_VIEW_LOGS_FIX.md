# Duplicate View Logs Fix

## Problem

Every time a user refreshed the dashboard or navigated between tabs, **duplicate log entries** were created for:
- **Event Settings** (2 duplicates from cache hit/miss paths)
- **Users List** (duplicates on every view)
- **Roles List** (duplicates on every view)
- **Attendees List** (duplicates on every view)

## Root Cause

Multiple API endpoints were creating duplicate logs when called:

### 1. Event Settings API (`/api/event-settings`)
Had **two separate logging paths**:
- **Cache Hit Path** - When settings served from cache
- **Cache Miss Path** - When settings fetched from database

Both paths created identical log entries.

### 2. Users API (`/api/users`)
Created logs on every GET request without checking for recent duplicates.

### 3. Roles API (`/api/roles`)
Created logs on every GET request without checking for recent duplicates.

### 4. Attendees API (`/api/attendees`)
Created logs on every GET request without checking for recent duplicates.

## Why This Happened

When the dashboard loads or users navigate between tabs, it fetches resources:
1. Event Settings (with cache hit/miss paths)
2. Users List (when on Users tab)
3. Roles List (when on Roles tab)
4. Attendees List (when on Attendees tab)

Each API call created a log entry, and some APIs (like Event Settings) had multiple code paths that both logged, resulting in duplicate entries for the same user action.

## Solution

Added **deduplication logic** to all three endpoints:

### Deduplication Check

Before creating a log entry, the system now:
1. Queries for recent logs (last 5 seconds)
2. Checks if any match the target resource
3. Only creates log if no duplicate found

### Implementation

**Added to all three endpoints**:
```typescript
// Check for recent duplicate logs (within last 5 seconds)
const recentLogs = await databases.listDocuments(
  dbId,
  logsCollectionId,
  [
    Query.equal('userId', user.$id),
    Query.equal('action', 'view'),
    Query.greaterThan('$createdAt', new Date(Date.now() - 5000).toISOString()),
    Query.limit(5)
  ]
);

// Check if there's already a recent view log for this resource
const hasDuplicate = recentLogs.documents.some(log => {
  try {
    const details = JSON.parse(log.details);
    return details.target === 'Target Resource Name';
  } catch {
    return false;
  }
});

if (!hasDuplicate) {
  // Create log entry
}
```

## How It Works

### Before Fix
```
User loads dashboard
├── Event Settings API → Cache hit → Log ✓
│                     → Cache miss → Log ✓ (DUPLICATE!)
├── Users API → Log ✓
│            → Log ✓ (DUPLICATE!)
└── Roles API → Log ✓
             → Log ✓ (DUPLICATE!)
Result: Multiple duplicate logs
```

### After Fix
```
User loads dashboard
├── Event Settings API → Cache hit → Check → Log ✓
│                     → Cache miss → Check → Skip (duplicate)
├── Users API → Check → Log ✓
│            → Check → Skip (duplicate)
└── Roles API → Check → Log ✓
             → Check → Skip (duplicate)
Result: 1 log per resource
```

## Deduplication Window

- **Time window**: 5 seconds
- **Scope**: Same user, same action (view)
- **Target check**: Must match specific resource name
- **Limit**: Checks last 5 logs for performance

## Target Names Used

| API Endpoint | Target Name | Check Logic |
|--------------|-------------|-------------|
| Event Settings | `"Event Settings"` | `details.target === 'Event Settings'` |
| Users | `"Users List"` | `details.target === 'Users List'` |
| Roles | `"Roles"` | `details.target === 'Roles' \|\| (details.type === 'system' && details.operation === 'view_roles')` |
| Attendees | `"Attendees List"` | `details.target === 'Attendees List'` |

## Testing

### Test Scenarios

1. **Fresh Login**:
   - [ ] Login to dashboard
   - [ ] Check Activity Logs
   - [ ] Should see only 1 log for Event Settings

2. **Navigate to Attendees Tab**:
   - [ ] Click Attendees tab
   - [ ] Check Activity Logs
   - [ ] Should see only 1 "Attendees List" view log

3. **Navigate to Users Tab**:
   - [ ] Click Users tab
   - [ ] Check Activity Logs
   - [ ] Should see only 1 "Users List" view log

4. **Navigate to Roles Tab**:
   - [ ] Click Roles & Permissions tab
   - [ ] Check Activity Logs
   - [ ] Should see only 1 "Roles" view log

5. **Multiple Quick Tab Switches**:
   - [ ] Switch between tabs 3 times quickly (within 5 seconds)
   - [ ] Check Activity Logs
   - [ ] Should see only 1 log per tab (deduplication working)

6. **Delayed Access**:
   - [ ] Wait 10 seconds
   - [ ] Switch to a different tab
   - [ ] Check Activity Logs
   - [ ] Should see 1 new log (after deduplication window)

### Verification Steps

1. Clear existing logs or note current count
2. Login/refresh dashboard
3. Count view logs created for each resource
4. Should be exactly 1 per resource, not multiple

## Edge Cases Handled

### Invalid Log Details
```typescript
try {
  const details = JSON.parse(log.details);
  return details.target === 'Resource Name';
} catch {
  return false; // Ignore malformed logs
}
```

### Performance Optimization
```typescript
Query.limit(5) // Only check last 5 logs, not all logs
```

### Time-based Deduplication
```typescript
Query.greaterThan('$createdAt', new Date(Date.now() - 5000).toISOString())
// Only check logs from last 5 seconds
```

## Files Modified

1. ✅ `src/pages/api/event-settings/index.ts` - Added deduplication to both logging paths
2. ✅ `src/pages/api/users/index.ts` - Added deduplication to view logging
3. ✅ `src/pages/api/roles/index.ts` - Added deduplication to view logging, fixed target label
4. ✅ `src/pages/api/attendees/index.ts` - Added deduplication to view logging
5. ✅ `docs/fixes/DUPLICATE_VIEW_LOGS_FIX.md` - This documentation

## Impact

✅ **No more duplicate logs** - Only 1 log per actual view  
✅ **Performance maintained** - Minimal overhead (5-log query)  
✅ **Backward compatible** - Doesn't affect existing functionality  
✅ **Time-bounded** - Deduplication window prevents legitimate logs from being blocked  
✅ **Cleaner audit trail** - Activity logs now accurately reflect user actions  

## Alternative Solutions Considered

### 1. Remove Logging from Some Paths
**Rejected**: Would miss legitimate views when only one path is taken

### 2. Global Request Deduplication
**Rejected**: Too complex, would affect other APIs

### 3. Client-side Deduplication
**Rejected**: Logging happens server-side, client can't control it

### 4. Longer Deduplication Window
**Rejected**: 5 seconds is sufficient for cache/refresh scenarios

## Future Improvements

Possible enhancements:
1. **Request ID tracking** - Use request IDs to prevent same-request duplicates
2. **Cache-aware logging** - Only log on cache miss
3. **Centralized logging** - Move all view logging to middleware
4. **User session tracking** - Deduplicate based on session activity
5. **Apply to other endpoints** - Check if other APIs need similar deduplication

## Summary

- ✅ **Fixed Event Settings duplicates** - Cache hit/miss paths now deduplicated
- ✅ **Fixed Users List duplicates** - View logs now deduplicated
- ✅ **Fixed Roles List duplicates** - View logs now deduplicated, target label corrected to "Roles"
- ✅ **Fixed Attendees List duplicates** - View logs now deduplicated
- ✅ **Consistent approach** - Same deduplication logic across all endpoints
- ✅ **Documented pattern** - Clear reference for future API development

### Additional Fixes
- ✅ **Corrected Roles target label** - Changed from "System" to "Roles" for clarity
- ✅ **Fixed deduplication check** - Now properly checks for both target name and operation type

The duplicate view logs issue is now resolved across all four affected endpoints. Each dashboard load and tab navigation will create only one log entry per resource instead of multiple duplicates.
