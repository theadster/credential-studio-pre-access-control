---
title: Empty 200 Response JSON Parsing Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-02-23
review_interval_days: 90
related_code:
  - src/pages/dashboard.tsx
---

# Empty 200 Response JSON Parsing Fix

## Issue

The refresh functions in the Dashboard component (`refreshRoles`, `refreshUsers`, `refreshEventSettings`) called `.json()` on HTTP responses without checking if the response body was empty. When an API returned 200 OK with an empty body, `.json()` would throw an error, causing the refresh flow to abort silently.

## Root Cause

HTTP 200 OK responses can have empty bodies in certain scenarios (e.g., bulk operations that complete successfully but return no data). Calling `.json()` on an empty body throws a `SyntaxError`, which was caught by the outer try-catch but prevented proper state updates.

```typescript
// BEFORE (buggy)
if (rolesResponse.ok) {
  const rolesData = await rolesResponse.json(); // Throws if body is empty
  setRoles(rolesArray);
}
```

## Solution

Added content-length header checks before parsing JSON. If content-length is '0', treat it as an empty response and set appropriate default state:

```typescript
// AFTER (fixed)
if (rolesResponse.ok) {
  const contentLength = rolesResponse.headers.get('content-length');
  if (contentLength === '0') {
    setRoles([]);
    rolesFreshnessRef.current?.markFresh();
    return;
  }
  const rolesData = await rolesResponse.json();
  setRoles(rolesArray);
}
```

## Impact

- **Scope**: Dashboard refresh functions for roles, users, and event settings
- **Severity**: Medium - Prevents data refresh on empty 200 responses
- **User-facing**: Yes - Users may see stale data if refresh fails
- **Performance**: None - No performance impact

## Functions Fixed

1. `refreshRoles` - Added content-length check before `.json()`
2. `refreshUsers` - Added content-length check before `.json()`
3. `refreshEventSettings` - Added content-length check before `.json()`

## Testing

Verify the fix by:
1. Configuring an API endpoint to return 200 OK with empty body
2. Confirming that state is properly set to defaults (empty array or null)
3. Verifying no errors are logged to console
4. Confirming data freshness is marked after empty response
