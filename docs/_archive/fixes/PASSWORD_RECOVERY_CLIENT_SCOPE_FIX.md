# Password Recovery Client Scope Fix

## Problem

The `complete-recovery.ts` API endpoint was using an admin-scoped client to call `account.updateRecovery()`, which is incorrect for password recovery operations:

```typescript
// Before: Using admin client for user-scoped operation
import { createAdminClient } from '@/lib/appwrite';

const { account } = createAdminClient();
await account.updateRecovery(userId, secret, password);
```

**Issues:**
- **Wrong scope**: Password recovery is a user-facing operation that doesn't require admin privileges
- **Security concern**: Using admin client for operations that should be user-scoped
- **Best practice violation**: Admin clients should only be used for operations requiring elevated permissions
- **Potential issues**: May cause unexpected behavior or permission issues

## Solution

Replaced the admin client with a user-scoped public client for the password recovery operation.

### Implementation

**Before:**
```typescript
import { createAdminClient } from '@/lib/appwrite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ...
  
  // Use admin client to complete the password recovery
  const { account } = createAdminClient();
  
  // Complete the recovery by updating the password
  await account.updateRecovery(userId, secret, password);
  
  // ...
}
```

**After:**
```typescript
import { Client, Account } from 'appwrite';

/**
 * Creates a public client for user-scoped operations
 * Used for password recovery which doesn't require admin privileges
 */
const createPublicClient = () => {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

  return {
    client,
    account: new Account(client),
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ...
  
  // Use public client to complete the password recovery
  // This is a user-scoped operation that doesn't require admin privileges
  const { account } = createPublicClient();
  
  // Complete the recovery by updating the password
  await account.updateRecovery(userId, secret, password);
  
  // ...
}
```

### Key Changes

1. **Removed admin client import**
   - Removed `import { createAdminClient } from '@/lib/appwrite'`
   - Added `import { Client, Account } from 'appwrite'` (user-scoped SDK)

2. **Created public client factory**
   - Added `createPublicClient()` function that creates a user-scoped client
   - Uses the standard `appwrite` SDK (not `node-appwrite`)
   - Configures endpoint and project ID without API key

3. **Updated recovery call**
   - Changed from admin client to public client
   - Added clear comment explaining this is a user-scoped operation
   - Maintains the same API signature: `account.updateRecovery(userId, secret, password)`

## Why This Matters

### Security & Best Practices

**Admin Client Should Be Used For:**
- Creating/managing users programmatically
- Accessing all users' data
- Bypassing permissions
- Server-side operations requiring elevated privileges

**Public Client Should Be Used For:**
- User authentication (login, logout, password recovery)
- User-facing operations
- Operations that work with user-provided tokens/secrets
- Client-side equivalent operations on the server

### Password Recovery Flow

The password recovery flow works as follows:

1. **User requests recovery** (client-side)
   - Calls `account.createRecovery(email, url)`
   - Appwrite sends email with recovery link containing `userId` and `secret`

2. **User clicks link** (client-side)
   - Redirected to reset password page with `userId` and `secret` in URL

3. **User submits new password** (this endpoint)
   - Calls `account.updateRecovery(userId, secret, password)`
   - The `secret` acts as a one-time token proving the user owns the email
   - This is a user-scoped operation - no admin privileges needed

Using an admin client for step 3 is unnecessary and violates the principle of least privilege.

## Files Modified

**src/pages/api/auth/complete-recovery.ts**
- Removed `createAdminClient` import
- Added `Client` and `Account` imports from `appwrite` SDK
- Created `createPublicClient()` helper function
- Updated to use public client for `account.updateRecovery()`
- Added clarifying comments

## Testing

To verify the fix works correctly:

1. **Request password recovery**
   ```typescript
   // On login page or forgot password page
   await account.createRecovery('user@example.com', 'http://localhost:3000/reset-password');
   ```

2. **Check email for recovery link**
   - Should receive email with link containing `userId` and `secret`

3. **Complete recovery**
   - Click link, enter new password
   - Should successfully update password using the public client

4. **Verify login**
   - Try logging in with new password
   - Should work correctly

## Benefits

✅ **Correct scope**: Uses user-scoped client for user-facing operations  
✅ **Security**: Follows principle of least privilege  
✅ **Best practices**: Aligns with Appwrite SDK usage patterns  
✅ **Maintainability**: Clear separation between admin and user operations  
✅ **Consistency**: Matches client-side recovery flow  

## Related Operations

Other user-scoped operations that should use public client (not admin):

- `account.createRecovery()` - Request password recovery
- `account.updateRecovery()` - Complete password recovery (this fix)
- `account.createVerification()` - Request email verification
- `account.updateVerification()` - Complete email verification
- `account.createMagicURLSession()` - Magic URL login
- `account.updateMagicURLSession()` - Complete magic URL login

Admin client should only be used for:
- `users.create()` - Create user programmatically
- `users.list()` - List all users
- `users.delete()` - Delete user
- `users.updatePassword()` - Admin password reset (different from user recovery)
- Other operations requiring elevated permissions

## References

- [Appwrite Account API](https://appwrite.io/docs/references/cloud/client-web/account)
- [Appwrite Password Recovery](https://appwrite.io/docs/products/auth/password-recovery)
- [Appwrite Server SDK vs Client SDK](https://appwrite.io/docs/sdks)
