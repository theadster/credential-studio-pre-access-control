# Kiro IDE Browser Cookie Blocking Issue

## Problem
When logging into the application using the Kiro IDE preview browser, authentication succeeds but the user has no role assigned. The same account works correctly in Chrome with the role properly assigned.

## Root Cause
The Kiro IDE preview browser **blocks cookies entirely** when running in its iframe/preview context. This is a browser security feature to prevent third-party cookie tracking.

### Evidence
- Chrome: Cookie is set and sent with API requests ✓
- Kiro Browser: Cookie is NOT set at all ✗
- Debug endpoint `/api/debug/session-info` shows:
  - Chrome: `"cookies": ["appwrite-session"]` with full user profile and role
  - Kiro: `"error": "No JWT cookie found"`

## Technical Details
- The application uses cookie-based authentication (JWT stored in `appwrite-session` cookie)
- API routes use `createSessionClient(req)` which reads the JWT from `req.cookies`
- Kiro IDE browser blocks cookies in iframe contexts for security
- Without cookies, API routes cannot authenticate the user

## Attempted Fixes
1. ✗ Changed SameSite policy (Lax, None, removed)
2. ✗ Removed SameSite attribute for localhost
3. ✗ Added `credentials: 'include'` to fetch requests
4. ✓ Added localStorage fallback (but doesn't help API routes)
5. ✓ Added detection and user warning

## Current Solution
The code now:
- Detects when cookies are blocked
- Shows a toast notification: "Cookie Blocked - Try opening in external browser"
- Logs detailed error information to console
- Stores JWT in localStorage as fallback (for client-side use only)

## Workarounds
1. **Use Chrome for debugging** (recommended)
2. **Open preview in external browser** - Look for "Open in Browser" button in Kiro
3. **Use Kiro for code editing only** - Test authentication features in Chrome

## Why We Can't Fix This
- Cookie blocking is a browser security feature
- API routes require cookies for authentication (server-side)
- Changing to header-based auth would require major refactor
- This is a limitation of the Kiro IDE browser, not the application

## Files Modified
- `src/contexts/AuthContext.tsx` - Added cookie detection and warnings
- `src/lib/tokenRefresh.ts` - Updated cookie settings
- `src/pages/api/debug/session-info.ts` - Debug endpoint
- `src/pages/debug/session-info.tsx` - Debug UI

## Recommendation
**Use Chrome or external browser for testing authentication features.**
The Kiro IDE browser is excellent for code editing but has cookie restrictions that prevent full authentication testing.
