---
title: Approval Profiles Authorization Bypass Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 90
related_code: ["src/pages/api/approval-profiles/[id].ts"]
---

# Approval Profiles Authorization Bypass Fix

## Issue

The approval profiles API endpoint (`GET /api/approval-profiles/[id]`) was missing per-resource access control. Any user with the global `approvalProfiles.read` permission could fetch any approval profile by ID, regardless of ownership.

**Severity**: High (Authorization Bypass)

## Root Cause

The endpoint only checked for global permission (`userProfile?.role?.permissions?.approvalProfiles?.read`) but did not verify that the requesting user owned or had access to the specific profile being accessed.

## Solution

Added per-resource ownership verification to all approval profile endpoints:

- **GET**: Verify `profile.ownerId === userProfile.id` before returning profile
- **PUT**: Verify `profile.ownerId === userProfile.id` before allowing updates
- **DELETE**: Verify `profile.ownerId === userProfile.id` before allowing deletion

## Implementation Details

Each handler now includes an ownership check after fetching the profile:

```typescript
// Verify user owns this profile (per-resource access control)
if (profile.ownerId !== userProfile.id) {
  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions to access this profile',
  });
}
```

## Database Schema Requirement

This fix assumes the `approval_profiles` table has an `ownerId` field. If this field doesn't exist, it must be added to the schema:

- Field name: `ownerId`
- Type: String (references user profile ID)
- Required: Yes

## Testing

Verify the fix by:
1. Creating an approval profile as User A
2. Attempting to fetch/modify/delete as User B
3. Confirm 403 Forbidden response is returned

## Related Changes

- Updated all database calls to use new named-parameter API per project standards
- No breaking changes to API response format
