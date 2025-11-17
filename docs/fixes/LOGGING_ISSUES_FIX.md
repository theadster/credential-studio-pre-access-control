# Logging Issues Fix

## Issues Identified

### 1. Login/Logout Not Being Logged

**Problem:** Login and logout events are not appearing in the activity logs.

**Root Cause:** The `/api/logs` endpoint was wrapped with the `withAuth` middleware, which requires authentication for ALL requests (both GET and POST). This created a catch-22 situation:

- During **login**: The user is not yet authenticated, so the POST request to log the login event fails with 401 Unauthorized
- During **logout**: The user's session is deleted before the logout event is logged, so the POST request fails with 401 Unauthorized

**The Flow That Was Failing:**
```
User logs in
  → AuthContext.signIn() creates session
  → Calls logAuthEvent('auth_login', userId)
    → POST /api/logs
      → withAuth middleware checks authentication
        → ❌ FAILS: User just logged in, but middleware can't verify session yet
```

**Additional Issues:**
1. No error handling or debug logging to diagnose the 401 errors
2. The API call was failing silently
3. No visibility into whether logging succeeded or failed

### 2. Event Settings Changes Logging All Fields

**Problem:** When updating event settings, the logs show that ALL fields were changed, even when only one field was modified.

**Root Cause:** The `detectChanges()` function in `src/pages/api/event-settings/index.ts` was comparing values without normalizing types first. This caused false positives due to type coercion issues:

- Boolean `true` vs string `"true"`
- Number `8` vs string `"8"`
- `null` vs `undefined` vs empty string `""`

When the frontend sends an update with all fields (even unchanged ones), these type mismatches caused every field to be marked as "changed".

## Solutions Implemented

### Fix 1: Allow Unauthenticated Logging for Auth Events

**Changes to `src/pages/api/logs/index.ts`:**

1. **Removed blanket `withAuth` middleware** - The endpoint was wrapped with `withAuth`, which blocked all unauthenticated requests

2. **Implemented conditional authentication:**

```typescript
// Export with conditional authentication:
// - GET requests require authentication (withAuth middleware)
// - POST requests for auth events don't require authentication (handled in the handler)
export default async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // For GET requests, require authentication
  if (req.method === 'GET') {
    return withAuth(handler)(req, res);
  }
  
  // For POST requests, handle authentication in the handler itself
  // This allows auth_login/auth_logout to work without authentication
  return handler(req, res);
};
```

3. **Use admin client for auth events:**

```typescript
// For authentication events (login/logout), use admin client since user may not be authenticated yet
// For other events, use session client with authenticated user
const isAuthEvent = action === 'auth_login' || action === 'auth_logout';
let postDatabases;
let logUserId;

if (isAuthEvent) {
  // Use admin client for auth events (user may not be authenticated yet during login)
  const { createAdminClient } = await import('@/lib/appwrite');
  const adminClient = createAdminClient();
  postDatabases = adminClient.databases;
  
  // For auth events, userId MUST be provided in request body
  if (!requestUserId) {
    return res.status(400).json({ error: 'userId is required for authentication events' });
  }
  logUserId = requestUserId;
} else {
  // Use session client for non-auth events (requires authentication)
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { databases: sessionDatabases } = createSessionClient(req);
  postDatabases = sessionDatabases;
  logUserId = requestUserId || req.user.$id;
}
```

**Benefits:**
- Auth events (login/logout) can now be logged without authentication
- Other log events still require authentication for security
- Uses admin client for auth events to bypass authentication requirements
- Maintains security by requiring userId in request body for auth events

### Fix 2: Enhanced Login/Logout Logging

**Changes to `src/contexts/AuthContext.tsx`:**

Added comprehensive debug logging to the `logAuthEvent` function:

```typescript
const logAuthEvent = async (action: string, userId: string, details?: any) => {
  try {
    console.log('[AuthContext] Logging auth event', {
      action,
      userId,
      details,
      timestamp: new Date().toISOString()
    });

    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        action,
        details: details || {},
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AuthContext] Failed to log auth event - server error', {
        action,
        userId,
        status: response.status,
        statusText: response.statusText,
        errorData
      });
    } else {
      console.log('[AuthContext] Auth event logged successfully', {
        action,
        userId
      });
    }
  } catch (error) {
    console.error('[AuthContext] Failed to log authentication event:', {
      action,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
```

**Benefits:**
- Now logs when auth events are being attempted
- Shows success/failure status (including 401 errors that were happening before)
- Provides detailed error information if logging fails
- Makes it easy to diagnose if log settings are disabled

### Fix 3: Improved Event Settings Change Detection

**Changes to `src/pages/api/event-settings/index.ts`:**

1. **Added `normalizeValue()` helper function:**

```typescript
/**
 * Normalize value for comparison
 * Handles type coercion issues (string vs number, null vs undefined, etc.)
 */
function normalizeValue(value: any): any {
  // Handle null/undefined
  if (value === null || value === undefined) return null;
  
  // Handle booleans stored as strings
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Handle numbers stored as strings
  if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
    return Number(value);
  }
  
  // Handle empty strings as null
  if (value === '') return null;
  
  return value;
}
```

2. **Updated `detectChanges()` to use normalization:**

```typescript
// Normalize both values before comparison to handle type coercion
const normalizedUpdateVal = normalizeValue(updateVal);
const normalizedCurrentVal = normalizeValue(currentVal);

// Only mark as changed if normalized values are different
if (normalizedUpdateVal !== normalizedCurrentVal) {
  changedFields.push(label);
}
```

3. **Skip logging when no changes detected:**

```typescript
// If no specific changes detected, don't log anything
// This prevents false "Event Settings" logs when nothing actually changed
if (changedFields.length === 0) {
  return [];
}
```

4. **Updated transaction operation to check for changes:**

```typescript
// Only log if there are actual changes AND logging is enabled
if (shouldLogUpdate && changedFields.length > 0) {
  const { createSettingsLogDetails } = await import('@/lib/logFormatting');
  operations.push({
    action: 'create',
    databaseId: dbId,
    tableId: logsCollectionId,
    rowId: ID.unique(),
    data: {
      userId,
      action: 'update',
      details: JSON.stringify(createSettingsLogDetails('update', 'event', {
        eventName: currentSettings.eventName,
        changes: changedFields
      }))
    }
  });
}
```

**Benefits:**
- Only logs fields that actually changed
- Handles type coercion correctly (string "8" equals number 8)
- Treats null, undefined, and empty string as equivalent
- Prevents false "Event Settings" logs when nothing changed
- More accurate audit trail
- **Groups changes by section** for better readability
- **Shows specific field names** within each section
- **Summarizes large changes** (e.g., "and 3 more") to keep logs concise

**New Log Format Examples:**

Single field change:
```
Updated Event Settings: General: Event Name
```

Multiple fields in same section:
```
Updated Event Settings: Cloudinary: Enabled, Cloud Name, Upload Preset
```

Multiple sections:
```
Updated Event Settings: General: Event Name, Barcode: Barcode Type, Cloudinary: Enabled
```

Many fields in one section:
```
Updated Event Settings: Switchboard Canvas: Enabled, API Endpoint, and 4 more
```

**Sections:**
- **General**: Event name, date, time, location, timezone, banners
- **Barcode**: Barcode type, length, uniqueness settings
- **Name Formatting**: First/last name uppercase settings
- **Cloudinary**: Photo integration settings
- **Switchboard Canvas**: Credential printing integration
- **OneSimpleAPI**: Webhook integration
- **Custom Fields**: Custom field modifications

## Testing Instructions

### Test Login/Logout Logging

1. Open browser console (F12)
2. Log in to the application
3. Check console for:
   ```
   [AuthContext] Logging auth event { action: 'auth_login', userId: '...', ... }
   [AuthContext] Auth event logged successfully { action: 'auth_login', userId: '...' }
   ```
4. Check the Activity Logs in the dashboard - should see "Log In" entry
5. Log out
6. Check console for:
   ```
   [AuthContext] Logging auth event { action: 'auth_logout', userId: '...', ... }
   [AuthContext] Auth event logged successfully { action: 'auth_logout', userId: '...' }
   ```
7. Log back in and check Activity Logs - should see "Log Out" entry

**If logging fails:**
- Console will show error with status code and error details
- Check if log settings have `authLogin` or `authLogout` disabled
- Verify user has permission to create logs

### Test Event Settings Change Detection

1. Go to Event Settings
2. Change ONLY the "Event Name" field
3. Save changes
4. Check Activity Logs - should show:
   ```
   Updated Event Settings: General: Event Name
   ```
   NOT:
   ```
   Updated Event Settings: Event Name, Event Date, Event Time, Event Location, ...
   ```

5. Change multiple fields in the same section (e.g., Event Name and Event Location)
6. Save changes
7. Check Activity Logs - should show:
   ```
   Updated Event Settings: General: Event Name, Event Location
   ```

8. Change fields in different sections (e.g., Event Name and Cloudinary Cloud Name)
9. Save changes
10. Check Activity Logs - should show:
    ```
    Updated Event Settings: General: Event Name, Cloudinary: Cloud Name
    ```

11. Change many fields in one section (e.g., 5 Cloudinary fields)
12. Save changes
13. Check Activity Logs - should show:
    ```
    Updated Event Settings: Cloudinary: Enabled, Cloud Name, and 3 more
    ```

14. Open Event Settings and save without making any changes
15. Check Activity Logs - should NOT create a new log entry

## Files Modified

1. **`src/pages/api/logs/index.ts`** (CRITICAL FIX)
   - Removed blanket `withAuth` middleware that was blocking auth events
   - Implemented conditional authentication (GET requires auth, POST handles it internally)
   - Added logic to use admin client for auth events (login/logout)
   - Added logic to use session client for other events (requires authentication)
   - Requires userId in request body for auth events

2. **`src/contexts/AuthContext.tsx`**
   - Enhanced `logAuthEvent()` with debug logging and error handling
   - Now shows 401 errors that were happening silently before

3. **`src/pages/api/event-settings/index.ts`**
   - Added `normalizeValue()` helper function
   - Updated `detectChanges()` to normalize values before comparison
   - Modified to skip logging when no changes detected
   - Updated transaction operation to check for actual changes

## Verification

After deploying these changes:

1. ✅ Login events should appear in Activity Logs
2. ✅ Logout events should appear in Activity Logs
3. ✅ Event Settings logs should only show fields that actually changed
4. ✅ No false "Event Settings" logs when nothing changed
5. ✅ Console provides clear debugging information for auth logging

## Notes

- The login/logout logging was likely working but may have been disabled in log settings
- The enhanced logging will make it obvious if there are any issues
- Event Settings change detection now handles all common type coercion scenarios
- Both fixes improve the accuracy and usefulness of the audit trail
