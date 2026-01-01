# Custom Fields Soft Delete Implementation

## Overview
Implemented soft delete strategy for custom fields using a `deletedAt` timestamp to handle orphaned customFieldValues in attendee documents safely and efficiently.

## Problem Statement
When deleting a custom field, the field definition is removed but attendee documents still contain values for that field in their `customFieldValues` JSON. This creates orphaned data that needs to be handled appropriately.

## Solution: Soft Delete with deletedAt Timestamp

### Approach Chosen
**Soft Delete** - Mark fields as deleted with a timestamp instead of physically removing them.

### Tradeoffs Analysis

#### ✅ Advantages
1. **Instant Operation**: No expensive batch processing during deletion
2. **Data Recovery**: Accidental deletions can be reversed
3. **Audit Trail**: Complete history of what was deleted and when
4. **No Timeout Risk**: Works reliably regardless of dataset size
5. **Queryable History**: Orphaned values remain accessible for reporting/analytics
6. **Safe**: No risk of partial updates or data corruption
7. **Simple**: Easy to implement and maintain

#### ⚠️ Disadvantages
1. **Orphaned Data**: Values remain in attendee.customFieldValues JSON
2. **Query Filtering**: All queries must filter `deletedAt IS NULL`
3. **Storage**: Deleted records consume storage until purged
4. **Cleanup Required**: Optional periodic job needed for permanent deletion

### Alternative Approaches Considered

#### Option A: Hard Delete with Immediate Batch Cleanup
```typescript
// Rejected approach
await databases.deleteDocument(dbId, collectionId, id);
const attendees = await databases.listDocuments(dbId, attendeesCollection);
for (const attendee of attendees.documents) {
  // Remove field from customFieldValues
  delete attendee.customFieldValues[fieldId];
  await databases.updateDocument(dbId, attendeesCollection, attendee.$id, attendee);
}
```

**Why Rejected:**
- Risk of timeout with large datasets (1000+ attendees)
- Not atomic - partial failures leave inconsistent state
- Blocks API response until all updates complete
- No easy rollback if something goes wrong

#### Option B: Hard Delete with Background Job
```typescript
// Rejected approach
await databases.deleteDocument(dbId, collectionId, id);
await queueCleanupJob({ fieldId: id, type: 'custom_field_cleanup' });
```

**Why Rejected:**
- Requires job queue infrastructure
- Complex retry and idempotency logic
- Eventual consistency issues (field deleted but values still present)
- Harder to debug and monitor
- More moving parts to maintain

#### Option C: Soft Delete (CHOSEN)
```typescript
// Implemented approach
await databases.updateDocument(dbId, collectionId, id, {
  deletedAt: new Date().toISOString(),
  version: currentVersion + 1
});
```

**Why Chosen:**
- Simple, reliable, and safe
- Instant response time
- Easy to implement and test
- Provides recovery option
- No infrastructure dependencies

## Implementation Details

### 1. Database Schema Changes

#### Add deletedAt Attribute
```javascript
// Using Appwrite SDK or Console
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

### 2. API Endpoints Updated

#### DELETE /api/custom-fields/[id]
- Sets `deletedAt` timestamp instead of deleting document
- Increments `version` for optimistic locking consistency
- Returns 410 Gone if already deleted
- Logs detailed deletion information

```typescript
// Soft delete implementation
const deletedAt = new Date().toISOString();
await databases.updateDocument(dbId, collectionId, id, {
  deletedAt,
  version: (currentField.version || 0) + 1
});
```

#### GET /api/custom-fields
- Filters out soft-deleted fields using `Query.isNull('deletedAt')`
- Only returns active fields to clients

```typescript
const result = await databases.listDocuments(dbId, collectionId, [
  Query.isNull('deletedAt'),  // Exclude deleted fields
  Query.orderAsc('order'),
  Query.limit(100)
]);
```

#### GET /api/custom-fields/[id]
- Returns 410 Gone if field is soft-deleted
- Includes `deletedAt` timestamp in error response

```typescript
if (customField.deletedAt) {
  return res.status(410).json({ 
    error: 'Custom field has been deleted',
    deletedAt: customField.deletedAt
  });
}
```

#### PUT /api/custom-fields/[id]
- Prevents updating soft-deleted fields
- Returns 410 Gone if attempting to update deleted field

```typescript
if (currentField.deletedAt) {
  return res.status(410).json({ 
    error: 'Cannot update deleted custom field',
    deletedAt: currentField.deletedAt
  });
}
```

### 3. Logging and Monitoring

#### Structured Logging
All delete operations include comprehensive logging:

```typescript
console.log('[CUSTOM_FIELD_DELETE] Starting soft delete', {
  fieldId: id,
  fieldName: fieldToDelete.fieldName,
  fieldType: fieldToDelete.fieldType,
  deletedBy: user.$id,
  deletedAt
});

console.log('[CUSTOM_FIELD_DELETE] Soft delete successful', {
  fieldId: id,
  fieldName: fieldToDelete.fieldName,
  newVersion: softDeletedField.version
});
```

#### Activity Logs
Deletion is recorded in the logs collection:

```typescript
await databases.createDocument(dbId, logsCollectionId, ID.unique(), {
  userId: user.$id,
  action: 'delete',
  details: JSON.stringify({
    type: 'custom_field',
    fieldId: id,
    fieldName: fieldToDelete.fieldName,
    fieldType: fieldToDelete.fieldType,
    internalFieldName: fieldToDelete.internalFieldName,
    deletedAt,
    deleteType: 'soft_delete',
    note: 'Field soft-deleted. Orphaned values remain in attendee documents.'
  })
});
```

#### Error Handling
Failures are logged with context:

```typescript
catch (deleteError: any) {
  console.error('[CUSTOM_FIELD_DELETE] Soft delete failed', {
    fieldId: id,
    fieldName: fieldToDelete.fieldName,
    error: deleteError.message,
    code: deleteError.code
  });
  throw deleteError;
}
```

## API Contract

### DELETE Request
```http
DELETE /api/custom-fields/field123
Authorization: Bearer <token>
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Custom field deleted successfully",
  "deletedAt": "2025-10-08T15:30:00.000Z",
  "note": "Field has been soft-deleted. Existing values in attendee records are preserved but will not be displayed."
}
```

### Already Deleted (410 Gone)
```json
{
  "error": "Custom field already deleted",
  "deletedAt": "2025-10-08T15:30:00.000Z"
}
```

### Not Found (404 Not Found)
```json
{
  "error": "Custom field not found"
}
```

### Insufficient Permissions (403 Forbidden)
```json
{
  "error": "Insufficient permissions to delete custom fields"
}
```

## Orphaned Data Handling

### Current Behavior
When a custom field is soft-deleted:
1. Field definition is marked with `deletedAt` timestamp
2. Attendee documents retain the field in `customFieldValues` JSON
3. UI/queries filter out deleted fields automatically
4. Orphaned values don't cause errors (just ignored)

### Example Attendee Document
```json
{
  "$id": "attendee123",
  "firstName": "John",
  "lastName": "Doe",
  "customFieldValues": {
    "field_active": "Active Value",
    "field_deleted": "Orphaned Value"  // Field was deleted
  }
}
```

The orphaned value `field_deleted` remains in the document but:
- Won't be displayed in UI (field definition not found)
- Won't cause validation errors
- Can be queried for historical reporting
- Will be cleaned up by optional purge job

### Optional: Permanent Cleanup Job

For organizations that want to reclaim storage, implement a periodic cleanup job:

```typescript
// scripts/cleanup-deleted-custom-fields.ts
import { databases, Query } from './appwrite';

async function cleanupDeletedFields() {
  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const customFieldsCollection = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
  const attendeesCollection = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
  
  // Find fields deleted more than 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const deletedFields = await databases.listDocuments(
    dbId,
    customFieldsCollection,
    [
      Query.isNotNull('deletedAt'),
      Query.lessThan('deletedAt', thirtyDaysAgo.toISOString()),
      Query.limit(100)
    ]
  );
  
  console.log(`Found ${deletedFields.documents.length} fields to purge`);
  
  for (const field of deletedFields.documents) {
    const fieldId = field.$id;
    const internalFieldName = field.internalFieldName;
    
    console.log(`Purging field: ${fieldId} (${field.fieldName})`);
    
    // Remove orphaned values from attendees (batched)
    let offset = 0;
    const batchSize = 100;
    let hasMore = true;
    
    while (hasMore) {
      const attendees = await databases.listDocuments(
        dbId,
        attendeesCollection,
        [Query.limit(batchSize), Query.offset(offset)]
      );
      
      for (const attendee of attendees.documents) {
        const customFieldValues = attendee.customFieldValues || {};
        
        if (customFieldValues[internalFieldName]) {
          delete customFieldValues[internalFieldName];
          
          await databases.updateDocument(
            dbId,
            attendeesCollection,
            attendee.$id,
            { customFieldValues }
          );
          
          console.log(`  Cleaned attendee: ${attendee.$id}`);
        }
      }
      
      hasMore = attendees.documents.length === batchSize;
      offset += batchSize;
    }
    
    // Hard delete the field definition
    await databases.deleteDocument(dbId, customFieldsCollection, fieldId);
    console.log(`  Field definition deleted: ${fieldId}`);
  }
  
  console.log('Cleanup complete');
}

// Run monthly via cron job
cleanupDeletedFields().catch(console.error);
```

**Schedule with cron:**
```bash
# Run on the 1st of each month at 2 AM
0 2 1 * * node scripts/cleanup-deleted-custom-fields.ts
```

## Frontend Integration

### Fetching Active Fields
```typescript
// Automatically filtered by API
const response = await fetch('/api/custom-fields');
const activeFields = await response.json();
// Only returns fields where deletedAt IS NULL
```

### Handling Deleted Field Errors
```typescript
async function getCustomField(fieldId: string) {
  const response = await fetch(`/api/custom-fields/${fieldId}`);
  
  if (response.status === 410) {
    const error = await response.json();
    // Field was deleted
    console.log(`Field deleted at: ${error.deletedAt}`);
    return null;
  }
  
  return await response.json();
}
```

### Deleting a Field
```typescript
async function deleteCustomField(fieldId: string) {
  const response = await fetch(`/api/custom-fields/${fieldId}`, {
    method: 'DELETE'
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log(result.message);
    console.log(`Deleted at: ${result.deletedAt}`);
    // Refresh field list
  }
}
```

## Testing Scenarios

### Test 1: Soft Delete Success
1. Create a custom field
2. Delete the field via API
3. Verify `deletedAt` is set
4. Verify field not returned in list
5. Verify GET returns 410 Gone

### Test 2: Prevent Double Delete
1. Soft delete a field
2. Attempt to delete again
3. Verify returns 410 Gone with original deletedAt

### Test 3: Prevent Update After Delete
1. Soft delete a field
2. Attempt to update the field
3. Verify returns 410 Gone

### Test 4: Orphaned Values Ignored
1. Create field and add values to attendees
2. Soft delete the field
3. Verify attendee documents still contain values
4. Verify UI doesn't display the field
5. Verify no errors when loading attendees

### Test 5: Logging and Monitoring
1. Delete a field
2. Verify console logs contain structured data
3. Verify activity log entry created
4. Verify log includes deleteType: 'soft_delete'

## Migration Guide

### Step 1: Add deletedAt Attribute
```bash
# Via Appwrite Console or SDK
# Add datetime attribute 'deletedAt' to custom_fields collection
# Make it optional (not required)
# Create index on deletedAt for efficient filtering
```

### Step 2: Deploy Code Changes
```bash
git pull origin main
npm install
npm run build
# Deploy to production
```

### Step 3: Update Frontend Queries
Ensure all frontend code uses the API endpoints (which automatically filter deleted fields). No changes needed if using the API.

### Step 4: Monitor Logs
```bash
# Watch for soft delete operations
tail -f logs/app.log | grep CUSTOM_FIELD_DELETE
```

### Step 5: Optional Cleanup Job
If desired, set up the periodic cleanup job to purge old deleted fields.

## Benefits Summary

1. **Reliability**: No risk of timeout or partial failures
2. **Safety**: Data can be recovered if needed
3. **Performance**: Instant deletion response
4. **Auditability**: Complete deletion history
5. **Simplicity**: Easy to implement and maintain
6. **Flexibility**: Optional cleanup job for storage reclamation

## Related Files
- `src/pages/api/custom-fields/[id].ts` - Soft delete implementation
- `src/pages/api/custom-fields/index.ts` - List filtering
- `docs/fixes/CUSTOM_FIELDS_OPTIMISTIC_LOCKING.md` - Related optimistic locking feature

## Next Steps
1. ✅ Add `deletedAt` attribute to Appwrite collection
2. ✅ Create index on `deletedAt` for query performance
3. ✅ Deploy updated API endpoints
4. ✅ Update frontend to handle 410 Gone responses
5. ⏳ (Optional) Implement periodic cleanup job
6. ⏳ (Optional) Add admin UI to view/restore deleted fields
