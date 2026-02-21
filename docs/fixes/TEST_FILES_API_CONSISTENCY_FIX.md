---
title: Test Files API Consistency and Indentation Fixes
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 90
related_code: ["src/__tests__/api/attendees/crud-transactions.test.ts", "src/__tests__/e2e/auth-flow.test.ts", "src/__tests__/integration/session-lifecycle.test.ts"]
---

# Test Files API Consistency and Indentation Fixes

## Overview

Fixed three critical issues across test files to ensure consistency with Appwrite TablesDB API standards and proper code formatting:

1. **Indentation inconsistencies** in `crud-transactions.test.ts`
2. **Incorrect property names** in `session-lifecycle.test.ts`
3. **Mixed API call styles** in `auth-flow.test.ts`

## Issues Fixed

### Issue 1: Indentation Misalignment in crud-transactions.test.ts

**Problem**: Multiple instances of `mockAdminTablesDB.getRow.mockResolvedValue()` calls had incorrect indentation (4 spaces instead of 6), causing inconsistent formatting with surrounding mock setup code.

**Locations**: Lines 166, 434, 539, 600, 626, 702, 747, 800, 841, 890, 945

**Fix**: Standardized all indentation to 6 spaces to match surrounding mock setup calls and maintain consistent code formatting.

**Impact**: Improves code readability and maintains consistent style across the test file.

### Issue 2: Incorrect Property Name in session-lifecycle.test.ts

**Problem**: Mock return objects from `createSessionClient` used incorrect property name `databases: mockTablesDB` instead of the expected `tablesDB: mockTablesDB`.

**Locations**: 13 instances across the file (lines 245, 283, 312, 346, 405, 428, 461, 491, 514, 552, 597, 623, 670)

**Fix**: Replaced all instances of `databases: mockTablesDB` with `tablesDB: mockTablesDB` to match the actual API contract and other test files.

**Impact**: Ensures test mocks accurately reflect the real API structure, preventing false positives in testing.

### Issue 3: Mixed TablesDB API Call Styles in auth-flow.test.ts

**Problem**: Test mixed two API call styles:
- `mockTablesDB.createRow()` used object-parameter form (correct)
- `mockTablesDB.listRows()` and `mockTablesDB.getRow()` used positional parameters (deprecated)

**Locations**: Lines 225-237

**Fix**: Standardized all TablesDB API calls to use the new named-parameter API:

```typescript
// Before (positional parameters - WRONG)
const userProfile = await mockTablesDB.listRows(
  'db-id',
  'users-table',
  [Query.equal('userId', user.$id)]
);

const role = await mockTablesDB.getRow(
  'db-id',
  'roles-table',
  userProfile.rows[0].roleId
);

// After (named parameters - CORRECT)
const userProfile = await mockTablesDB.listRows({
  databaseId: 'db-id',
  tableId: 'users-table',
  queries: [Query.equal('userId', user.$id)]
});

const role = await mockTablesDB.getRow({
  databaseId: 'db-id',
  tableId: 'roles-table',
  rowId: userProfile.rows[0].roleId
});
```

**Impact**: Ensures test code follows the Appwrite TablesDB API standard (see `appwrite-tablesdb-api.md`), preventing inconsistencies between test mocks and production code.

## Verification

All fixes have been verified:
- ✅ No remaining indentation issues in crud-transactions.test.ts
- ✅ No remaining `databases:` property references in session-lifecycle.test.ts
- ✅ All TablesDB API calls in auth-flow.test.ts use named-parameter form
- ✅ TypeScript diagnostics pass (except expected mock import errors)

## Related Standards

- **Appwrite TablesDB API**: See `appwrite-tablesdb-api.md` for API standards
- **Test Organization**: See `documentation-organization.md` for test file structure guidelines
- **Code Style**: Consistent indentation and formatting per project standards

## Files Modified

1. `src/__tests__/api/attendees/crud-transactions.test.ts` - Fixed 10 indentation issues
2. `src/__tests__/integration/session-lifecycle.test.ts` - Fixed 13 property name issues
3. `src/__tests__/e2e/auth-flow.test.ts` - Fixed 2 API call style issues
