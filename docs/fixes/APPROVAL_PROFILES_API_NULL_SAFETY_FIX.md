---
title: Approval Profiles API Null-Safety and API Standardization Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 90
related_code: ["src/pages/api/approval-profiles/[id].ts"]
---

# Approval Profiles API Null-Safety and API Standardization Fix

## Overview

Fixed critical null-safety issues in `src/pages/api/approval-profiles/[id].ts` where `userProfile` was being dereferenced without proper null checks, and standardized deprecated TablesDB API calls to use the new named-parameter format.

## Issues Fixed

### 1. Null-Safety Issue in handleGet (Lines 55-77)

**Problem:** The authorization block lacked null-safety for `userProfile` before accessing `userProfile.id`.

**Before (UNSAFE):**
```typescript
const userProfile = (req as any).userProfile;
if (!userProfile?.role?.permissions?.approvalProfiles?.read) {
  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions to read approval profiles',
  });
}

// ... later ...

// Verify user owns this profile (per-resource access control)
if (profile.ownerId !== userProfile.id) {  // ❌ UNSAFE: userProfile could be undefined
  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions to access this profile',
  });
}
```

**After (SAFE):**
```typescript
// Check authorization - guard on userProfile first
const userProfile = (req as any).userProfile;
if (!userProfile) {
  return res.status(401).json({
    success: false,
    error: 'Unauthorized - user profile not found',
  });
}

if (!userProfile?.role?.permissions?.approvalProfiles?.read) {
  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions to read approval profiles',
  });
}

// ... later ...

// Verify user owns this profile (per-resource access control)
if (profile.ownerId !== userProfile.id) {  // ✅ SAFE: userProfile is guaranteed to exist
  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions to access this profile',
  });
}
```

### 2. Null-Safety Issue in handlePut (Line 145)

**Problem:** Same null-safety issue - `userProfile` was accessed without null check.

**Before (UNSAFE):**
```typescript
// Get current profile
const currentProfile = await tablesDB.getRow({
  databaseId,
  tableId,
  rowId: id,
});

// Verify user owns this profile (per-resource access control)
const userProfile = (req as any).userProfile;
if (currentProfile.ownerId !== userProfile.id) {  // ❌ UNSAFE
  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions to modify this profile',
  });
}
```

**After (SAFE):**
```typescript
// Get current profile
const currentProfile = await tablesDB.getRow({
  databaseId,
  tableId,
  rowId: id,
});

// Verify user owns this profile (per-resource access control) - guard on userProfile first
const userProfile = (req as any).userProfile;
if (!userProfile) {
  return res.status(401).json({
    success: false,
    error: 'Unauthorized - user profile not found',
  });
}

if (currentProfile.ownerId !== userProfile.id) {  // ✅ SAFE
  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions to modify this profile',
  });
}
```

### 3. Null-Safety Issue in handleDelete (Line 217)

**Problem:** Same null-safety issue - `userProfile` was accessed without null check.

**Before (UNSAFE):**
```typescript
// Get current profile
const currentProfile = await tablesDB.getRow({
  databaseId,
  tableId,
  rowId: id,
});

// Verify user owns this profile (per-resource access control)
const userProfile = (req as any).userProfile;
if (currentProfile.ownerId !== userProfile.id) {  // ❌ UNSAFE
  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions to delete this profile',
  });
}
```

**After (SAFE):**
```typescript
// Get current profile
const currentProfile = await tablesDB.getRow({
  databaseId,
  tableId,
  rowId: id,
});

// Verify user owns this profile (per-resource access control) - guard on userProfile first
const userProfile = (req as any).userProfile;
if (!userProfile) {
  return res.status(401).json({
    success: false,
    error: 'Unauthorized - user profile not found',
  });
}

if (currentProfile.ownerId !== userProfile.id) {  // ✅ SAFE
  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions to delete this profile',
  });
}
```

### 4. Deprecated TablesDB API Call (Line 161)

**Problem:** Used positional-parameter API instead of named-parameter API.

**Before (Deprecated):**
```typescript
const existingProfiles = await tablesDB.listRows(
  databaseId,
  tableId,
  [
    Query.equal('name', input.name),
    Query.equal('isDeleted', false),
    Query.notEqual('$id', id),
  ]
);
```

**After (Current Standard):**
```typescript
const existingProfiles = await tablesDB.listRows({
  databaseId,
  tableId,
  queries: [
    Query.equal('name', input.name),
    Query.equal('isDeleted', false),
    Query.notEqual('$id', id),
  ]
});
```

## Impact

- ✅ Prevents potential runtime errors from accessing undefined `userProfile.id`
- ✅ Ensures proper 401 Unauthorized responses when user profile is missing
- ✅ Maintains consistent authorization flow across all three HTTP methods (GET, PUT, DELETE)
- ✅ Standardizes API calls to use current Appwrite TablesDB API format
- ✅ Improves code safety and maintainability

## Security Implications

These fixes prevent potential security issues where:
- Missing user profile could bypass authorization checks
- Undefined `userProfile.id` could cause unexpected behavior
- Proper null-safety ensures per-resource access control is always enforced

## Verification

- ✅ All 3 functions now have explicit null-safety guards for `userProfile`
- ✅ All `userProfile.id` accesses are protected by null checks
- ✅ TablesDB API call standardized to named-parameter format
- ✅ TypeScript diagnostics pass with no errors

## Related Standards

- **Appwrite TablesDB API**: See `appwrite-tablesdb-api.md` for API standards
- **Authorization Pattern**: Per-resource access control with owner verification
- **File**: `src/pages/api/approval-profiles/[id].ts` - Approval profiles GET/PUT/DELETE endpoint
