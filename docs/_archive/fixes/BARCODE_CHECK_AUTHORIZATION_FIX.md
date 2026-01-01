# Barcode Check Authorization Fix

**Date:** January 13, 2025  
**Issue:** Authorization error when checking barcode uniqueness during attendee creation  
**Status:** ✅ Fixed

---

## Problem Description

When creating a new attendee, the barcode uniqueness check was failing with a 401 authorization error:

```
Error checking barcode uniqueness: AppwriteException: The current user is not authorized to perform the requested action.
code: 401
type: 'user_unauthorized'
```

The error occurred repeatedly as the system tried to generate unique barcodes:
- Multiple failed attempts to check barcode uniqueness
- Each request returned 500 status code
- User unable to create new attendees

---

## Root Cause

The `/api/attendees/check-barcode` endpoint was using the **client-side** Appwrite database instance:

```typescript
import { databases } from '@/lib/appwrite';  // ❌ Client-side instance
```

This client-side instance doesn't have proper authentication context in API routes, causing authorization failures when trying to query the database.

---

## Solution

Updated the endpoint to use the **server-side** session client that properly handles user authentication:

```typescript
import { createSessionClient } from '@/lib/appwrite';  // ✅ Server-side with session

export default async function handler(req, res) {
  // Create session client with user's authentication
  const { databases } = createSessionClient(req);
  
  // Now database queries work with proper authorization
  const response = await databases.listDocuments(...);
}
```

---

## Changes Made

### File Modified
- `src/pages/api/attendees/check-barcode.ts`

### Changes
1. **Import Change:**
   - Before: `import { databases } from '@/lib/appwrite';`
   - After: `import { createSessionClient } from '@/lib/appwrite';`

2. **Database Client Initialization:**
   - Before: Used global `databases` instance
   - After: Created session-specific client: `const { databases } = createSessionClient(req);`

---

## Testing

### Before Fix
```
GET /api/attendees/check-barcode?barcode=5008882 500 in 135ms
Error: The current user is not authorized to perform the requested action.
```

### After Fix
```
GET /api/attendees/check-barcode?barcode=5008882 200 in 50ms
Response: { exists: false }
```

### Test Cases
- ✅ Check barcode uniqueness for new barcode (returns `exists: false`)
- ✅ Check barcode uniqueness for existing barcode (returns `exists: true`)
- ✅ Create new attendee with auto-generated barcode (succeeds)
- ✅ No authorization errors in console

---

## Impact

### Affected Features
- ✅ Attendee creation with barcode generation
- ✅ Barcode uniqueness validation
- ✅ Auto-retry logic for barcode generation

### User Experience
- Users can now create attendees without authorization errors
- Barcode uniqueness checks work correctly
- System can generate unique barcodes automatically

---

## Related Issues

This issue is similar to other API routes that were previously fixed to use `createSessionClient(req)` instead of the global client instance. This pattern should be followed for all API routes that need to access Appwrite services.

### Pattern to Follow
```typescript
// ✅ Correct pattern for API routes
import { createSessionClient } from '@/lib/appwrite';

export default async function handler(req, res) {
  const { databases, account, storage } = createSessionClient(req);
  // Use these instances for all Appwrite operations
}
```

### Pattern to Avoid
```typescript
// ❌ Incorrect pattern for API routes
import { databases, account, storage } from '@/lib/appwrite';

export default async function handler(req, res) {
  // These instances don't have proper authentication context
}
```

---

## Prevention

To prevent similar issues in the future:

1. **Code Review Checklist:**
   - All API routes should use `createSessionClient(req)` or `createAdminClient()`
   - Never import global instances (`databases`, `account`, etc.) in API routes
   - Verify authentication context is properly passed

2. **Testing:**
   - Test all API endpoints with actual user sessions
   - Verify authorization works correctly
   - Check console for authorization errors

3. **Documentation:**
   - Update API development guidelines
   - Add examples of correct patterns
   - Document common pitfalls

---

## Verification Steps

To verify the fix works:

1. Start development server: `npm run dev`
2. Login to the application
3. Navigate to attendee creation page
4. Fill in attendee details
5. Observe barcode generation (should work without errors)
6. Check browser console (should have no authorization errors)
7. Create attendee (should succeed)

---

## Related Files

- `src/pages/api/attendees/check-barcode.ts` - Fixed file
- `src/pages/api/attendees/index.ts` - Reference implementation
- `src/lib/appwrite.ts` - Appwrite client configuration

---

**Fix Verified:** ✅ Working correctly  
**Migration Impact:** None - This was a pre-existing issue that surfaced during manual testing  
**Next.js 16 Compatibility:** ✅ Compatible

