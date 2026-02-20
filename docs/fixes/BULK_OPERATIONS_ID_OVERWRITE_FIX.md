---
title: Bulk Operations ID Overwrite Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-07-21
review_interval_days: 90
related_code: ["src/lib/bulkOperations.ts", "src/lib/__tests__/bulkOperations.unit.test.ts"]
---

## Issue

In `bulkImportWithFallback()`, user-supplied `$id` values in item data were silently overwriting the generated IDs due to incorrect object spread order.

### Root Cause

```typescript
// BEFORE (incorrect)
const rows = config.items.map(item => ({
  $id: ID.unique(),
  ...item.data  // This overwrites $id if item.data contains $id
}));
```

If a user passed `{ data: { $id: 'user-id', firstName: 'John' } }`, the generated ID would be lost.

## Fix

Reordered the spread to ensure generated IDs always take precedence:

```typescript
// AFTER (correct)
const rows = config.items.map(item => {
  // Validate item.data is not null/undefined before spreading
  if (!item.data || typeof item.data !== 'object') {
    throw new Error(`Invalid item data: expected object, got ${typeof item.data}`);
  }
  
  // Prevent prototype pollution - filter out dangerous keys
  const safeData = Object.fromEntries(
    Object.entries(item.data).filter(([key]) => 
      !['__proto__', 'constructor', 'prototype'].includes(key)
    )
  );
  
  return {
    ...safeData,
    $id: ID.unique()  // Always overrides any user-supplied $id
  };
});
```

**Security:** Added prototype pollution protection by filtering out `__proto__`, `constructor`, and `prototype` keys that could mutate object prototypes. Always override generated IDs to prevent user-supplied ID injection.

## Testing

Added regression test `should override user-supplied $id with generated ID` to verify:
- User-supplied `$id` values are properly overwritten
- Generated IDs are always used
- Other data fields are preserved

All tests pass: `npx vitest --run src/lib/__tests__/bulkOperations.unit.test.ts`
