---
title: Roles Initialization Success Toast Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-02-23
review_interval_days: 90
related_code:
  - src/pages/dashboard.tsx
---

# Roles Initialization Success Toast Fix

## Issue

The `handleInitializeRoles` function displayed a success toast even if reloading the roles list failed. This provided false positive feedback to the user.

**The Problem:**
- Line 2760: Fetches `/api/roles` to reload the roles list
- Line 2761: Checks `if (rolesResponse.ok)` but doesn't throw an error if the fetch fails
- Line 2781: Success toast is displayed regardless of whether the roles reload succeeded
- If the roles reload fails, user sees "Roles initialized successfully!" but the roles list wasn't updated

## Root Cause

The success toast was displayed outside the conditional block that checks if the roles reload succeeded. If the roles fetch failed, the code would silently continue and display success anyway.

## Solution

Added error handling to throw an exception if the roles reload fails:

```typescript
// BEFORE (buggy)
const rolesResponse = await fetch('/api/roles');
if (rolesResponse.ok) {
  // ... update roles
}
// Success toast displayed regardless of rolesResponse status
success("Success", "Roles initialized successfully!");

// AFTER (fixed)
const rolesResponse = await fetch('/api/roles');
if (rolesResponse.ok) {
  // ... update roles
} else {
  throw new Error('Failed to reload roles after initialization');
}
// Success toast only displayed if we reach here
success("Success", "Roles initialized successfully!");
```

## Impact

- **Scope**: Role initialization flow
- **Severity**: Medium - False positive feedback degrades UX
- **User-facing**: Yes - Users now see error if roles reload fails
- **Performance**: None - No performance impact

## Testing

Verify the fix by:
1. Mock the `/api/roles` endpoint to return an error
2. Click "Initialize Roles"
3. Confirm error toast is displayed instead of success toast
4. Confirm roles list is not updated
