# Fix: Added deletedAt Attribute to Custom Fields Collection

## Issue

The website was returning "Internal Server Error" with the following error in the terminal:

```
Invalid query: Attribute not found in schema: deletedAt
```

## Root Cause

During the implementation of soft delete functionality for custom fields (Task 2), we added the soft delete logic in the API code but forgot to create the corresponding `deletedAt` attribute in the Appwrite database schema.

The code in `src/pages/api/attendees/index.ts` was trying to query:

```typescript
const customFieldsResult = await databases.listDocuments(
  dbId,
  customFieldsCollectionId,
  [Query.isNull('deletedAt'), Query.orderAsc('order'), Query.limit(100)]
);
```

But the `deletedAt` attribute didn't exist in the `custom_fields` collection.

## Solution

Created and ran a migration script to add the `deletedAt` attribute to the custom_fields collection:

**Script**: `scripts/add-deleted-at-attribute.ts`

**Attribute Details**:
- **Name**: `deletedAt`
- **Type**: `datetime`
- **Required**: `false`
- **Default**: `null` (not deleted)

## Migration Steps

1. Created migration script with proper environment variable loading
2. Ran the script: `npx tsx scripts/add-deleted-at-attribute.ts`
3. Verified attribute was created and available in Appwrite

## Impact

This fix resolves:
- ✅ Internal server errors on the dashboard page
- ✅ Errors when fetching attendees list
- ✅ Errors when fetching custom fields
- ✅ Soft delete functionality now works correctly

## Files Modified

- **Created**: `scripts/add-deleted-at-attribute.ts` - Migration script
- **Created**: `docs/fixes/DELETED_AT_ATTRIBUTE_FIX.md` - This document

## Related Work

This attribute was part of the soft delete implementation in:
- Task 2: Default Fields Implementation
- `src/pages/api/custom-fields/[id].ts` - Soft delete logic
- `src/pages/api/custom-fields/index.ts` - Filter deleted fields
- `src/pages/api/attendees/index.ts` - Filter deleted custom fields

## Testing

After applying this fix:
1. ✅ Dashboard loads without errors
2. ✅ Attendees list displays correctly
3. ✅ Custom fields are fetched successfully
4. ✅ Soft-deleted custom fields are properly filtered out

## Prevention

To prevent similar issues in the future:
1. Always create database attributes before implementing queries that use them
2. Include database schema changes in migration scripts
3. Test API endpoints after schema changes
4. Document required database attributes in code comments

## Date

2025-10-10
