# Password Reset User ID Fix

## Issue
When clicking "Send Reset Email" in the Edit User dialog, users received an error: "Failed to send password reset email."

## Root Cause
The password reset handler was trying to fetch the user's auth ID (`userId`) by making an API call to `/api/users?id=${user.id}`, but:
1. The GET endpoint doesn't support filtering by a specific user ID
2. The `userId` field was not included in the User interface
3. The user object passed to UserForm already contains the `userId` field from the parent component

## Solution

### 1. Updated User Interface
Added `userId` field to the User interface:
```typescript
interface User {
  id: string;
  userId?: string; // Appwrite auth user ID
  email: string;
  name: string | null;
  // ... other fields
}
```

### 2. Simplified Password Reset Handler
Removed the unnecessary API call and used the `userId` directly:

**Before:**
```typescript
const userResponse = await fetchWithRetry(`/api/users?id=${user.id}`);
const userData = userResponse.users?.[0];

if (!userData?.userId) {
  throw new Error('User auth ID not found');
}

await fetchWithRetry('/api/users/send-password-reset', {
  method: 'POST',
  body: JSON.stringify({
    authUserId: userData.userId,
  }),
});
```

**After:**
```typescript
if (!user.userId) {
  handleError(
    new Error('This user does not have an associated auth account...'),
    'Cannot send password reset'
  );
  return;
}

await fetchWithRetry('/api/users/send-password-reset', {
  method: 'POST',
  body: JSON.stringify({
    authUserId: user.userId,
  }),
});
```

### 3. Improved UI Logic
Updated the alert card to only show for users with auth accounts:

```typescript
{user && user.userId && (
  <Alert>
    {/* Password reset UI */}
  </Alert>
)}
```

### 4. Added Helpful Message for Invited Users
Added an informational alert for invited users who haven't created their accounts yet:

```typescript
{user && !user.userId && user.isInvited && (
  <Alert className="border-blue-200 bg-blue-50">
    <Mail className="h-4 w-4 text-blue-600" />
    <AlertDescription>
      This user was invited but hasn't created their account yet. 
      Password reset will be available after they complete signup.
    </AlertDescription>
  </Alert>
)}
```

## Benefits

### Performance
✅ **Faster**: No unnecessary API call  
✅ **Simpler**: Direct access to userId  
✅ **More reliable**: No network dependency  

### User Experience
✅ **Clear feedback**: Shows why password reset isn't available  
✅ **Better UX**: Only shows button when applicable  
✅ **Helpful messages**: Explains invited user status  

### Code Quality
✅ **Cleaner**: Removed unnecessary complexity  
✅ **Type-safe**: Added userId to interface  
✅ **Maintainable**: Simpler logic flow  

## Testing

### Scenarios Tested
- ✅ User with auth account (userId present) - Shows password reset button
- ✅ Invited user without auth account - Shows informational message
- ✅ Password reset sends successfully
- ✅ Error handling works correctly

### Edge Cases
- ✅ User without userId - Button hidden, helpful message shown
- ✅ Invited user - Informational message explains status
- ✅ Network errors - Proper error handling

## Files Modified

**`src/components/UserForm.tsx`**
- Added `userId?: string` to User interface
- Simplified `handleSendPasswordReset` function
- Updated UI to check for `user.userId` before showing button
- Added informational alert for invited users without auth accounts

## Related Issues

This fix addresses the error that occurred when:
1. Editing a user in the User Management interface
2. Clicking "Send Reset Email" button
3. Receiving "Failed to send password reset email" error

## Status
✅ **FIXED** - Password reset now works correctly in Edit User dialog

## Notes

### Why userId Might Be Missing
A user might not have a `userId` (auth account) if:
1. They were invited but haven't signed up yet
2. They were created through a legacy system
3. There was an error during account creation

### Future Considerations
- Consider adding a "Resend Invitation" button for invited users without auth accounts
- Add ability to manually link users to auth accounts if needed
- Show last login date if available
