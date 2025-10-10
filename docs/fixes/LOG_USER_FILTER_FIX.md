# Log User Filter Fix

## Problem

When filtering Activity Logs by user, selecting any user showed 0 results. The filter appeared to not work at all.

## Root Cause

The user filter dropdown was using the wrong ID field:
- **Dropdown was using**: `user.id` (document ID from users collection)
- **Logs are stored with**: `userId` (Appwrite user ID, e.g., `user.$id`)

These are two different values, so the filter never matched any logs.

## Example of the Mismatch

**User Document**:
```json
{
  "$id": "65abc123...",           // Document ID (user.id)
  "userId": "user_xyz789",        // Appwrite user ID (user.userId)
  "email": "john@example.com",
  "name": "John Doe"
}
```

**Log Document**:
```json
{
  "$id": "log_123...",
  "userId": "user_xyz789",        // References Appwrite user ID
  "action": "create",
  "details": {...}
}
```

**The Problem**:
- Dropdown sent: `userId=65abc123...` (document ID)
- Logs have: `userId=user_xyz789` (Appwrite user ID)
- No match! 0 results.

## Solution

Updated the user filter dropdown to use `user.userId` instead of `user.id`.

### Changes Made

**File**: `src/pages/dashboard.tsx`

**1. Updated User Interface**:
```typescript
interface User {
  id: string;
  userId?: string; // Added: Appwrite user ID (used for filtering logs)
  email: string;
  name: string | null;
  // ...
}
```

**2. Updated Dropdown Value**:

**Before**:
```typescript
{users.map((user) => (
  <SelectItem key={user.id} value={user.id}>
    {user.name || user.email.split('@')[0]}
  </SelectItem>
))}
```

**After**:
```typescript
{users.map((user) => (
  <SelectItem key={user.id} value={user.userId || user.id}>
    {user.name || user.email.split('@')[0]}
  </SelectItem>
))}
```

## How It Works Now

1. Users API returns both `id` and `userId` for each user
2. Dropdown uses `userId` (Appwrite user ID) as the filter value
3. API filters logs by `userId` field
4. Logs match correctly and are displayed

## Testing

### Test User Filter
1. Go to Activity Logs tab
2. Click the "Filter by user" dropdown
3. Select a specific user
4. Verify:
   - [ ] Logs are displayed (not 0 results)
   - [ ] All logs shown are from the selected user
   - [ ] User name/email is correct in the logs

### Test Action Filter
1. Select "All Users" in user filter
2. Select a specific action (e.g., "Create")
3. Verify:
   - [ ] Logs are displayed
   - [ ] All logs shown have the selected action

### Test Combined Filters
1. Select a specific user
2. Select a specific action
3. Verify:
   - [ ] Logs are displayed
   - [ ] All logs match both user AND action

### Test "All Users"
1. Select "All Users" in dropdown
2. Verify:
   - [ ] All logs are displayed
   - [ ] Logs from all users are shown

## Related Code

### Users API Response
The `/api/users` endpoint returns:
```typescript
{
  id: userDoc.$id,        // Document ID
  userId: userDoc.userId, // Appwrite user ID ← Used for filtering
  email: userDoc.email,
  name: userDoc.name,
  // ...
}
```

### Logs API Filter
The `/api/logs` endpoint filters by:
```typescript
if (filterUserId && filterUserId !== 'all') {
  queries.push(Query.equal('userId', filterUserId));
}
```

### Log Storage
Logs are created with:
```typescript
{
  userId: user.$id,  // Appwrite user ID
  action: 'create',
  details: {...}
}
```

## Files Modified

1. ✅ `src/pages/dashboard.tsx` - Updated User interface and dropdown value
2. ✅ `docs/fixes/LOG_USER_FILTER_FIX.md` - This documentation

## Impact

✅ **User filter now works** - Shows correct logs for selected user  
✅ **No breaking changes** - Falls back to `user.id` if `userId` not available  
✅ **Type-safe** - Added `userId` to User interface  
✅ **Consistent** - Uses same ID field that logs are stored with  

## Prevention

To prevent similar issues in the future:
- Always use `userId` (Appwrite user ID) for user-related filters
- Use `id` (document ID) only for document operations (update, delete)
- Document which ID field is used for what purpose
- Add TypeScript interfaces to make ID fields explicit
