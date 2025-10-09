# Custom Fields API Enhancements Summary

## Overview
Implemented two critical enhancements to the custom fields API to improve data integrity, concurrency control, and safe deletion handling.

## Enhancements Implemented

### 1. Optimistic Locking (Version Control)
**Problem:** Concurrent updates could overwrite each other without detection.

**Solution:** Version-based optimistic locking using a `version` field.

**Key Features:**
- Version field initialized to 0 on creation
- Version required in all update requests
- Version comparison before update
- 409 Conflict response on version mismatch
- Automatic version increment on successful update

**Documentation:** [CUSTOM_FIELDS_OPTIMISTIC_LOCKING.md](./CUSTOM_FIELDS_OPTIMISTIC_LOCKING.md)

### 2. Soft Delete with Orphaned Data Handling
**Problem:** Deleting custom fields left orphaned values in attendee documents without proper cleanup strategy.

**Solution:** Soft delete using `deletedAt` timestamp with comprehensive logging.

**Key Features:**
- Soft delete with deletedAt timestamp
- Automatic filtering of deleted fields in queries
- 410 Gone responses for deleted fields
- Structured logging for monitoring
- Optional cleanup script for permanent deletion
- Orphaned values preserved for historical reporting

**Documentation:** [CUSTOM_FIELDS_SOFT_DELETE.md](./CUSTOM_FIELDS_SOFT_DELETE.md)

## Database Schema Changes

### New Attributes Required

#### 1. version (integer)
```javascript
await databases.createIntegerAttribute(
  databaseId,
  customFieldsCollectionId,
  'version',
  false,  // not required (for backward compatibility)
  0,      // default value
  null,   // min
  null    // max
);
```

#### 2. deletedAt (datetime)
```javascript
await databases.createDatetimeAttribute(
  databaseId,
  customFieldsCollectionId,
  'deletedAt',
  false,  // not required
  null    // no default value
);

// Create index for efficient filtering
await databases.createIndex(
  databaseId,
  customFieldsCollectionId,
  'idx_deletedAt',
  'key',
  ['deletedAt']
);
```

## API Changes

### Endpoints Modified

#### GET /api/custom-fields
**Before:**
```typescript
// Returned all fields
const fields = await databases.listDocuments(dbId, collectionId);
```

**After:**
```typescript
// Filters out soft-deleted fields
const fields = await databases.listDocuments(dbId, collectionId, [
  Query.isNull('deletedAt'),
  Query.orderAsc('order'),
  Query.limit(100)
]);
```

#### GET /api/custom-fields/[id]
**New Behavior:**
- Returns 410 Gone if field is soft-deleted
- Includes deletedAt timestamp in error response

#### POST /api/custom-fields
**New Behavior:**
- Initializes version to 0 on creation

#### PUT /api/custom-fields/[id]
**New Requirements:**
- `version` field required in request body
- Returns 400 Bad Request if version missing
- Returns 409 Conflict if version mismatch
- Returns 410 Gone if field is soft-deleted
- Increments version on successful update

**Before:**
```json
{
  "fieldName": "Updated Name",
  "fieldType": "text"
}
```

**After:**
```json
{
  "fieldName": "Updated Name",
  "fieldType": "text",
  "version": 2
}
```

#### DELETE /api/custom-fields/[id]
**Changed from Hard Delete to Soft Delete:**

**Before:**
```typescript
await databases.deleteDocument(dbId, collectionId, id);
```

**After:**
```typescript
await databases.updateDocument(dbId, collectionId, id, {
  deletedAt: new Date().toISOString(),
  version: currentVersion + 1
});
```

**New Responses:**
- 200 OK with deletedAt timestamp
- 410 Gone if already deleted

## Migration Steps

### Step 1: Database Schema
```bash
# Run migration script to add attributes
npx ts-node scripts/add-deleted-at-to-custom-fields.ts
```

This script:
- Adds `deletedAt` datetime attribute
- Creates index on `deletedAt`
- Waits for attribute to be available
- Validates completion

### Step 2: Deploy Code
```bash
git pull origin main
npm install
npm run build
# Deploy to production
```

### Step 3: Update Existing Records (if needed)
If you have existing custom fields without version field:
```typescript
// Migration script
const fields = await databases.listDocuments(dbId, collectionId);
for (const field of fields.documents) {
  if (field.version === undefined) {
    await databases.updateDocument(dbId, collectionId, field.$id, {
      version: 0
    });
  }
}
```

### Step 4: Update Frontend
Ensure frontend code:
1. Includes `version` in all PUT requests
2. Handles 409 Conflict responses (version mismatch)
3. Handles 410 Gone responses (deleted fields)
4. Refreshes data after conflicts

### Step 5: Optional Cleanup Job
Set up periodic cleanup for permanent deletion:
```bash
# Add to crontab
0 2 1 * * cd /path/to/app && npx ts-node scripts/cleanup-deleted-custom-fields.ts
```

## HTTP Status Codes

### New Status Codes Used

#### 409 Conflict
**When:** Version mismatch during update
```json
{
  "error": "Conflict: Document has been modified by another user",
  "details": {
    "message": "The document version you are trying to update is outdated",
    "currentVersion": 5,
    "providedVersion": 2
  }
}
```

#### 410 Gone
**When:** Attempting to access/modify soft-deleted field
```json
{
  "error": "Custom field has been deleted",
  "deletedAt": "2025-10-08T15:30:00.000Z"
}
```

## Logging and Monitoring

### Structured Logs
All operations include structured logging:

```typescript
// Delete operation
console.log('[CUSTOM_FIELD_DELETE] Starting soft delete', {
  fieldId: id,
  fieldName: fieldToDelete.fieldName,
  fieldType: fieldToDelete.fieldType,
  deletedBy: user.$id,
  deletedAt
});
```

### Activity Logs
All changes recorded in logs collection:
```json
{
  "userId": "user123",
  "action": "delete",
  "details": {
    "type": "custom_field",
    "fieldId": "field123",
    "fieldName": "Company Name",
    "fieldType": "text",
    "internalFieldName": "company_name",
    "deletedAt": "2025-10-08T15:30:00.000Z",
    "deleteType": "soft_delete",
    "note": "Field soft-deleted. Orphaned values remain in attendee documents."
  }
}
```

### Monitoring Queries
```bash
# Watch for delete operations
tail -f logs/app.log | grep CUSTOM_FIELD_DELETE

# Count soft-deleted fields
# Via Appwrite Console or API:
# Query: isNotNull('deletedAt')

# Find fields ready for cleanup (>30 days old)
# Query: isNotNull('deletedAt') AND lessThan('deletedAt', '2025-09-08T00:00:00.000Z')
```

## Testing Checklist

### Optimistic Locking Tests
- [ ] Create field (verify version = 0)
- [ ] Update field with correct version (succeeds)
- [ ] Update field with wrong version (409 Conflict)
- [ ] Update field without version (400 Bad Request)
- [ ] Concurrent updates (second fails with 409)

### Soft Delete Tests
- [ ] Delete field (verify deletedAt set)
- [ ] List fields (deleted field not returned)
- [ ] Get deleted field (410 Gone)
- [ ] Update deleted field (410 Gone)
- [ ] Delete already deleted field (410 Gone)
- [ ] Verify orphaned values in attendees
- [ ] Verify UI ignores orphaned values

### Integration Tests
- [ ] Create → Update → Delete workflow
- [ ] Concurrent update attempts
- [ ] Cleanup script dry-run
- [ ] Cleanup script actual deletion
- [ ] Frontend conflict handling
- [ ] Frontend deleted field handling

## Scripts Provided

### 1. Migration Script
**File:** `scripts/add-deleted-at-to-custom-fields.ts`

**Purpose:** Add deletedAt attribute and index to collection

**Usage:**
```bash
npx ts-node scripts/add-deleted-at-to-custom-fields.ts
```

### 2. Cleanup Script
**File:** `scripts/cleanup-deleted-custom-fields.ts`

**Purpose:** Permanently delete old soft-deleted fields and orphaned values

**Usage:**
```bash
# Dry run (preview)
npx ts-node scripts/cleanup-deleted-custom-fields.ts --dry-run

# Delete fields older than 30 days
npx ts-node scripts/cleanup-deleted-custom-fields.ts

# Delete fields older than 90 days
npx ts-node scripts/cleanup-deleted-custom-fields.ts --retention-days 90
```

**Features:**
- Configurable retention period
- Dry-run mode for testing
- Batched processing (no timeouts)
- Progress logging
- Error handling
- Idempotent (safe to re-run)

## Benefits

### Data Integrity
✅ Prevents lost updates from concurrent modifications  
✅ Ensures version consistency across operations  
✅ Safe deletion with recovery option  
✅ Complete audit trail of all changes  

### Performance
✅ Instant deletion (no batch processing delays)  
✅ Efficient query filtering with indexes  
✅ No timeout risks on large datasets  
✅ Optional cleanup runs offline  

### User Experience
✅ Clear error messages for conflicts  
✅ Automatic retry guidance  
✅ No data loss from accidental deletions  
✅ Transparent orphaned data handling  

### Maintainability
✅ Simple implementation  
✅ Comprehensive logging  
✅ Easy to monitor and debug  
✅ Well-documented tradeoffs  

## Rollback Plan

If issues arise, rollback is straightforward:

### 1. Revert Code
```bash
git revert <commit-hash>
npm run build
# Deploy previous version
```

### 2. Database Cleanup (if needed)
```typescript
// Remove version requirement (make updates work without version)
// Keep deletedAt for audit trail

// Or restore soft-deleted fields
const deletedFields = await databases.listDocuments(dbId, collectionId, [
  Query.isNotNull('deletedAt')
]);

for (const field of deletedFields.documents) {
  await databases.updateDocument(dbId, collectionId, field.$id, {
    deletedAt: null  // Restore field
  });
}
```

## Future Enhancements

### Potential Additions
1. **Admin UI for Deleted Fields**
   - View soft-deleted fields
   - Restore deleted fields
   - Manually trigger cleanup

2. **Automatic Cleanup Scheduling**
   - Built-in cleanup job
   - Configurable retention period
   - Email notifications

3. **Bulk Operations**
   - Bulk restore
   - Bulk permanent delete
   - Bulk version reset

4. **Enhanced Conflict Resolution**
   - Three-way merge for conflicts
   - Automatic retry with exponential backoff
   - Conflict resolution UI

## Related Documentation
- [Custom Fields Optimistic Locking](./CUSTOM_FIELDS_OPTIMISTIC_LOCKING.md) - Detailed version control documentation
- [Custom Fields Soft Delete](./CUSTOM_FIELDS_SOFT_DELETE.md) - Detailed soft delete documentation

## Files Modified
- `src/pages/api/custom-fields/[id].ts` - GET, PUT, DELETE endpoints
- `src/pages/api/custom-fields/index.ts` - GET, POST endpoints
- `scripts/add-deleted-at-to-custom-fields.ts` - Migration script (new)
- `scripts/cleanup-deleted-custom-fields.ts` - Cleanup script (new)

## Support
For issues or questions:
1. Check structured logs: `grep CUSTOM_FIELD_DELETE logs/app.log`
2. Review activity logs in Appwrite console
3. Run cleanup script in dry-run mode to preview state
4. Consult detailed documentation in `docs/fixes/`
