---
title: Setup Appwrite Helper Extraction
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-29
review_interval_days: 90
related_code: ["scripts/setup-appwrite.ts"]
---

# Setup Appwrite Helper Extraction

## Summary

Extracted the duplicated `createAttributeIfMissing` helper function from `scripts/setup-appwrite.ts` to a module-level utility, eliminating code duplication between `createAttendeesCollection` and `createReportsCollection` functions.

## Problem

The `createAttributeIfMissing` helper was defined locally within both `createAttendeesCollection` (line ~217) and `createReportsCollection` (line ~503), creating unnecessary duplication with identical error handling and logging behavior.

## Solution

### Module-Level Helper

Created a shared `createAttributeIfMissing` function at module scope (after `waitForAttribute`) with the following signature:

```typescript
async function createAttributeIfMissing(
  databaseId: string,
  collectionId: string,
  key: string,
  existingAttributes: string[],
  createFn: () => Promise<any>,
): Promise<void>
```

**Parameters:**
- `databaseId`: Database ID for attribute creation
- `collectionId`: Collection ID where attribute belongs
- `key`: Attribute key name
- `existingAttributes`: Array of existing attribute keys (for early exit)
- `createFn`: Async function that creates the attribute

**Behavior:**
- Checks if attribute already exists in `existingAttributes` array
- Logs and returns early if attribute exists
- Attempts to create attribute via `createFn()`
- Waits for attribute to be ready via `waitForAttribute()`
- Handles 409 conflicts gracefully (attribute already exists)
- Logs errors for other failure modes

### Updated Call Sites

Both `createAttendeesCollection` and `createReportsCollection` now call the module-level helper:

```typescript
await createAttributeIfMissing(
  databaseId,
  COLLECTIONS.ATTENDEES,
  'firstName',
  existingAttributes,
  () => databases.createStringAttribute(databaseId, COLLECTIONS.ATTENDEES, 'firstName', 255, true),
);
```

## Benefits

1. **DRY Principle**: Single source of truth for attribute creation logic
2. **Consistency**: Identical error handling and logging across both collections
3. **Maintainability**: Changes to attribute creation logic only need to be made once
4. **Testability**: Helper can be tested independently if needed

## Files Modified

- `scripts/setup-appwrite.ts`
  - Added module-level `createAttributeIfMissing` function (lines ~68-88)
  - Updated `createAttendeesCollection` to use module-level helper (lines ~240-287)
  - Updated `createReportsCollection` to use module-level helper (lines ~530-577)

## Verification

- No TypeScript diagnostics or errors
- Both collection functions maintain identical behavior
- Error handling for 409 conflicts preserved
- Logging output unchanged
- All attribute creation calls updated to use new signature
