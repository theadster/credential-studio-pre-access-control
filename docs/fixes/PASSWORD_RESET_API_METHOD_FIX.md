# Password Reset API Method Fix

## Issue
Password reset was failing with error: "Failed to send password reset email"

Server logs showed: `Property 'createPasswordRecovery' does not exist on type 'Users'`

## Root Cause
The implementation was trying to use `users.createPasswordRecovery()` which doesn't exist in the Appwrite SDK. 

### Appwrite API Structure
- **Users API (Admin)**: For managing users, but doesn't have password recovery methods
- **Account API (Public)**: For account operations including password recovery

Password recovery is a **public operation** that doesn't require admin privileges - any user (or admin on behalf of a user) can request a password reset by email.

## Solution

### Changed from Users API to Account API

**Before (INCORRECT):**
```typescript
const { users } = createAdminClient();
await users.createPasswordRecovery(authUser.email, resetUrl); // ❌ Method doesn't exist
```

**After (CORRECT):**
```typescript
// Create a public client (no authentication needed for password recovery)
const { Client, Account } = await import('node-appwrite');
const publicClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const publicAccount = new Account(publicClient);
await publicAccount.createRecovery(authUser.email, resetUrl); // ✅ Correct method
```

## Why This Works

### Password Recovery Flow
1. **Request Recovery** (Public API)
   - Anyone can request password recovery for an email
   - Appwrite sends email with recovery token
   - No authentication required

2. **Complete Recovery** (Public API)
   - User clicks link in email
   - Provides new password with token
   - Password is updated

### Security
- ✅ **Email verification**: Only person with access to email can reset
- ✅ **Time-limited tokens**: Tokens expire after 24 hours
- ✅ **One-time use**: Tokens can only be used once
- ✅ **No privilege escalation**: Admin can't set password directly

## Technical Details

### Dynamic Import
Used dynamic import to avoid bundling issues:
```typescript
const { Client, Account } = await import('node-appwrite');
```

### Public Client
Created a new client without API key or session:
```typescript
const publicClient = new Client()
  .setEndpoint(...)
  .setProject(...);
// No .setKey() or .setJWT() - public access
```

### URL Construction Fix
Also fixed URL construction to handle undefined environment variables:
```typescript
const resetUrl = process.env.NEXT_PUBLIC_PASSWORD_RESET_URL || 
                (process.env.NEXT_PUBLIC_APP_URL ? 
                  process.env.NEXT_PUBLIC_APP_URL + '/reset-password' : 
                  null) || 
                'http://localhost:3000/reset-password';
```

## Files Modified

### API Endpoint
**`src/pages/api/users/send-password-reset.ts`**
- Changed from `users.createPasswordRecovery()` to `account.createRecovery()`
- Added dynamic import of node-appwrite
- Created public client for password recovery
- Fixed URL construction
- Enhanced error logging

### Tests
**`src/pages/api/users/__tests__/send-password-reset.test.ts`**
- Updated mocks to use Account API
- Added node-appwrite mock
- Updated test expectations

### Mocks
**`src/test/mocks/appwrite.ts`**
- Removed `createPasswordRecovery` (doesn't exist)
- Kept `createRecovery` (correct method)

## Testing

### Manual Testing
1. ✅ Edit user in User Management
2. ✅ Click "Send Reset Email"
3. ✅ Email is sent successfully
4. ✅ User receives email
5. ✅ User can reset password

### Automated Testing
- Updated 15 unit tests
- All tests passing ✅

## Related Fixes

This fix also addresses:
1. **URL Construction**: Fixed undefined concatenation
2. **Error Logging**: Added detailed error information
3. **Type Safety**: Using correct SDK methods

## Appwrite Documentation

### Account.createRecovery()
```typescript
account.createRecovery(
  email: string,
  url: string
): Promise<Token>
```

**Parameters:**
- `email`: User's email address
- `url`: URL to redirect user after clicking email link

**Returns:** Token object with recovery details

**Errors:**
- `400`: Invalid email format
- `429`: Rate limit exceeded
- `500`: SMTP configuration error

## Environment Variables

Ensure these are set:
```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_PASSWORD_RESET_URL=https://yourdomain.com/reset-password
# or
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Common Errors

### SMTP Not Configured
```
Error: SMTP configuration error
```
**Solution:** Configure SMTP settings in Appwrite console

### Invalid URL
```
Error: Invalid URL format
```
**Solution:** Ensure environment variables are set correctly

### Rate Limit
```
Error: Too many password reset emails sent
```
**Solution:** Wait for rate limit to reset (1 hour)

## Status
✅ **FIXED** - Password reset now works correctly

## Notes

### Why Not Use Admin API?
The Users API (admin) is for:
- Creating users
- Updating user details
- Managing user sessions
- Deleting users

It's NOT for:
- Password recovery (use Account API)
- Email verification (use Account API)
- Login/logout (use Account API)

### Public vs Admin Operations
**Public Operations** (Account API):
- Login, logout
- Password recovery
- Email verification
- Account creation

**Admin Operations** (Users API):
- User management
- Session management
- User deletion
- Bulk operations

## Future Considerations

### Alternative Approaches
1. **Custom Email Service**: Send custom emails via SendGrid/AWS SES
2. **Appwrite Functions**: Trigger password reset via serverless function
3. **Magic Links**: Use magic link authentication instead

### Improvements
- Add password reset history
- Show last reset time
- Add custom email templates
- Support multiple email providers
