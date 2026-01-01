---
title: "Bulk Delete Timestamp Attribute Fix"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/attendees/bulk-delete.ts"]
---

# Bulk Delete Timestamp Attribute Fix

## Issue Summary

When performing bulk delete operations, the system was encountering errors:

1. **Invalid document structure error**: `Unknown attribute: "timestamp"`
2. **Document not found errors**: After successful transactional deletion, the fallback mechanism was attempting to delete the same documents again

## Root Cause

### Problem 1: Timestamp Attribute
The logs collection schema in Appwrite only has these attributes:
- `userId` (string)
- `attendeeId` (string, optional)
- `action` (string)
- `details` (string)

However, the transaction helper functions and legacy fallback code were attempting to create log documents with a `timestamp` field that doesn't exist in the schema:

**In `src/lib/transactions.ts`:**
- `createBulkDeleteOperations()` - Added timestamp to audit log data
- `createBulkUpdateOperations()` - Added timestamp to audit log data
- `createBulkCreateOperations()` - Added timestamp to audit log data

**In `src/lib/bulkOperations.ts`:**
- `bulkDeleteWithFallback()` - Legacy fallback added timestamp
- `bulkEditWithFallback()` - Legacy fallback added timestamp
- `bulkImportWithFallback()` - Legacy fallback added timestamp

### Problem 2: Duplicate Delete Attempts
The error logs showed that documents were successfully deleted by the transactional API, but then the fallback mechanism tried to delete them again, resulting in "Document with the requested ID could not be found" errors.

This was happening because:
1. Transaction API successfully deleted all 125 documents
2. Transaction API failed to create the audit log (due to timestamp issue)
3. System interpreted the audit log failure as a transaction failure
4. Fallback mechanism was triggered and tried to delete the already-deleted documents

## Solution

### Fix 1: Remove Timestamp Field from Transaction Helpers
Removed the `timestamp` field from all audit log creation operations in transaction helper functions. The timestamp information should be included in the `details` JSON string if needed, not as a separate attribute.

**Files Modified:**
- `src/lib/transactions.ts` - Removed timestamp from 3 functions:
  - `createBulkDeleteOperations()`
  - `createBulkUpdateOperations()`
  - `createBulkCreateOperations()`
  
- `src/lib/bulkOperations.ts` - Removed timestamp from 3 legacy fallback functions:
  - `bulkDeleteWithFallback()`
  - `bulkEditWithFallback()`
  - `bulkImportWithFallback()`

### Fix 2: Move Timestamp into Details JSON in API Endpoints
Found and fixed additional transaction-based log creations in API endpoints that were also using timestamp as a separate field. Moved timestamp into the details JSON object.

**Additional Files Modified:**
- `src/pages/api/users/link.ts` - Fixed 2 instances (user linking and team membership logs)
- `src/pages/api/custom-fields/index.ts` - Fixed 1 instance (custom field creation)
- `src/pages/api/custom-fields/[id].ts` - Fixed 2 instances (custom field update and delete)
- `src/pages/api/attendees/index.ts` - Fixed 1 instance (attendee creation)
- `src/pages/api/attendees/[id].ts` - Fixed 2 instances (attendee update and delete)

### Changes Made

#### In `src/lib/transactions.ts`:

**Before:**
```typescript
operations.push({
  action: 'create',
  databaseId,
  tableId: auditLog.tableId,
  data: {
    userId: auditLog.userId,
    action: auditLog.action,
    details: JSON.stringify(auditLog.details),
    timestamp: new Date().toISOString()  // ❌ This field doesn't exist
  }
});
```

**After:**
```typescript
operations.push({
  action: 'create',
  databaseId,
  tableId: auditLog.tableId,
  data: {
    userId: auditLog.userId,
    action: auditLog.action,
    details: JSON.stringify(auditLog.details)  // ✅ Timestamp can be in details JSON
  }
});
```

#### In `src/lib/bulkOperations.ts`:

**Before:**
```typescript
await databases.createDocument(
  config.databaseId,
  config.auditLog.tableId,
  ID.unique(),
  {
    userId: config.auditLog.userId,
    action: config.auditLog.action,
    details: JSON.stringify(config.auditLog.details),
    timestamp: new Date().toISOString()  // ❌ This field doesn't exist
  }
);
```

**After:**
```typescript
await databases.createDocument(
  config.databaseId,
  config.auditLog.tableId,
  ID.unique(),
  {
    userId: config.auditLog.userId,
    action: config.auditLog.action,
    details: JSON.stringify(config.auditLog.details)  // ✅ Timestamp can be in details JSON
  }
);
```

## Expected Behavior After Fix

1. **Successful Transactional Deletes**: Bulk delete operations will complete successfully using the transactional API
2. **Proper Audit Logging**: Audit logs will be created without errors
3. **No Duplicate Attempts**: Fallback mechanism won't be triggered unnecessarily
4. **Clean Error Messages**: No more "Unknown attribute: timestamp" errors

## Testing Recommendations

1. **Test bulk delete with small batch** (5-10 items):
   - Verify all items are deleted
   - Verify audit log is created
   - Verify no error messages in console

2. **Test bulk delete with large batch** (100+ items):
   - Verify transactional API is used
   - Verify batching works correctly
   - Verify audit log contains correct count

3. **Test bulk edit operations**:
   - Verify updates are applied
   - Verify audit log is created

4. **Test bulk import operations**:
   - Verify items are created
   - Verify audit log is created

## Notes

- The Appwrite logs collection uses `$createdAt` and `$updatedAt` system attributes for timestamps
- If timestamp information is needed in logs, it should be included in the `details` JSON string
- The `details` field is a string that can contain JSON with any structure, including timestamps
- Most API endpoints already correctly include timestamps in the details JSON, not as separate fields

## Related Files

**Transaction Helpers:**
- `src/lib/transactions.ts` - Transaction helper functions
- `src/lib/bulkOperations.ts` - Bulk operation wrappers with fallback

**API Endpoints:**
- `src/pages/api/attendees/bulk-delete.ts` - Bulk delete API endpoint
- `src/pages/api/attendees/index.ts` - Attendee creation
- `src/pages/api/attendees/[id].ts` - Attendee update and delete
- `src/pages/api/custom-fields/index.ts` - Custom field creation
- `src/pages/api/custom-fields/[id].ts` - Custom field update and delete
- `src/pages/api/users/link.ts` - User linking and team membership

**Schema:**
- `scripts/setup-appwrite.ts` - Database schema definition

## Schema Reference

The logs collection schema (from `scripts/setup-appwrite.ts`):

```typescript
await databases.createStringAttribute(databaseId, COLLECTIONS.LOGS, 'userId', 255, true);
await databases.createStringAttribute(databaseId, COLLECTIONS.LOGS, 'attendeeId', 255, false);
await databases.createStringAttribute(databaseId, COLLECTIONS.LOGS, 'action', 255, true);
await databases.createStringAttribute(databaseId, COLLECTIONS.LOGS, 'details', 10000, false);
```

System attributes automatically added by Appwrite:
- `$id` - Document ID
- `$createdAt` - Creation timestamp
- `$updatedAt` - Last update timestamp
- `$permissions` - Document permissions
- `$collectionId` - Collection ID
- `$databaseId` - Database ID
