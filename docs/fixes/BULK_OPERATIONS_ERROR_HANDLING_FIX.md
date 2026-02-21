---
title: Bulk Operations Error Handling Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-07-21
review_interval_days: 90
related_code: ["src/lib/bulkOperations.ts"]
---

# Bulk Operations Error Handling Fix

## Overview

Fixed critical error handling gaps in `src/lib/bulkOperations.ts` where `bulkDeleteWithFallback` and `bulkImportWithFallback` functions had empty catch blocks that silently swallowed errors without logging or recording them. This prevented visibility into operation failures and made debugging difficult.

## Problem

### Before
- `bulkDeleteWithFallback` catch block: Empty, no error recording or logging
- `bulkImportWithFallback` catch block: Empty, no error recording or logging
- `bulkEditWithFallback`: Already had proper error handling (reference implementation)
- Inconsistent error handling patterns across the three bulk operation functions
- No visibility into which items failed during fallback operations
- Audit logs didn't include error counts or details

### Impact
- Silent failures during bulk delete/import operations
- No way to identify which rows failed to delete or import
- Audit trail incomplete - no record of errors
- Difficult to debug production issues
- Inconsistent behavior compared to `bulkEditWithFallback`

## Solution

### Changes Made

#### 1. Updated Return Type Signatures
Added `errors` field to return types to match implementation:

```typescript
// bulkDeleteWithFallback
Promise<{
  deletedCount: number;
  usedTransactions: boolean;
  batchCount?: number;
  errors?: Array<{ id: string; error: string; retryable?: boolean }>;
}>

// bulkImportWithFallback
Promise<{
  createdCount: number;
  usedTransactions: boolean;
  batchCount?: number;
  errors?: Array<{ index: number; error: string; retryable?: boolean }>;
}>
```

#### 2. Enhanced bulkDeleteWithFallback Error Handling
- Records each failed deletion with `{ id, error, retryable }` structure
- Emits `console.error()` for immediate visibility
- Includes error count in audit log
- Returns errors array in response for caller handling

```typescript
catch (deleteError: any) {
  errors.push({
    id: rowId,
    error: deleteError.message,
    retryable: isTransientError(deleteError),
  });
  console.error(`[Bulk Delete Fallback] Failed to delete row ${rowId}:`, deleteError.message);
}
```

#### 3. Enhanced bulkImportWithFallback Error Handling
- Records each failed import with `{ index, error, retryable }` structure
- Emits `console.error()` for immediate visibility
- Includes error count in audit log
- Returns errors array in response for caller handling

```typescript
catch (createError: any) {
  errors.push({
    index,
    error: createError.message,
    retryable: isTransientError(createError),
  });
  console.error(`[Bulk Import Fallback] Failed to create item at index ${index}:`, createError.message);
}
```

#### 4. Audit Log Enhancement
Both functions now include error details in audit logs with proper null checks:

```typescript
// For delete operations
const auditDetails = config.auditLog?.details ? JSON.parse(config.auditLog.details) : {};
details: JSON.stringify({
  ...auditDetails,
  usedFallback: true,
  errors: errors.length,
  deletedCount,
})

// For import operations
const auditDetails = config.auditLog?.details ? JSON.parse(config.auditLog.details) : {};
details: JSON.stringify({
  ...auditDetails,
  usedFallback: true,
  errors: errors.length,
  createdCount,
})
```

## Error Handling Pattern

All three bulk operation functions now follow the same consistent pattern:

1. **Record errors** in array with descriptive structure
2. **Log errors** with `console.error()` for visibility
3. **Include in audit log** with error count
4. **Return errors** in response for caller handling
5. **Distinguish retryable errors** using `isTransientError()` helper

## Testing Considerations

Callers of these functions should now:
- Check the `errors` field in the response
- Handle retryable errors (e.g., implement retry logic)
- Log non-retryable errors for investigation
- Use error information for user feedback

## Files Modified

- `src/lib/bulkOperations.ts` - Error handling implementation and return type signatures

## Verification

✅ TypeScript compilation: No errors
✅ Return type signatures: Updated to include `errors` field
✅ Error recording: Consistent with `bulkEditWithFallback` pattern
✅ Logging: `console.error()` calls added for visibility
✅ Audit trail: Error counts included in audit logs
