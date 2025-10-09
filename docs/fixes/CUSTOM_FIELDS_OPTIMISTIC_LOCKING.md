# Custom Fields Optimistic Locking Implementation

## Overview
Implemented optimistic locking for custom field updates to prevent concurrent modification conflicts and ensure data consistency when multiple users attempt to update the same custom field simultaneously.

## Changes Made

### 1. Version Field Addition
- Added `version` field to custom field documents
- Initialized to `0` on creation
- Incremented on each successful update

### 2. Update Endpoint (`src/pages/api/custom-fields/[id].ts`)

#### Request Validation
- **Required Field**: `version` must be included in the request body
- **Type Check**: Version must be a number
- **Error Response**: Returns 400 Bad Request if version is missing or invalid

```typescript
if (typeof version !== 'number') {
  return res.status(400).json({ 
    error: 'Version field is required for update operations',
    details: 'Include the current version number from the document you are updating'
  });
}
```

#### Optimistic Locking Flow
1. **Fetch Current Document**: Retrieve the latest version from the database
2. **Version Comparison**: Compare client version with current version
3. **Conflict Detection**: If versions don't match, reject with 409 Conflict
4. **Update with Increment**: If versions match, update with `version + 1`

```typescript
// Fetch current document
const currentField = await databases.getDocument(dbId, customFieldsCollectionId, id);

// Check version mismatch
const currentVersion = currentField.version || 0;
if (currentVersion !== version) {
  return res.status(409).json({ 
    error: 'Conflict: Document has been modified by another user',
    details: {
      message: 'The document version you are trying to update is outdated',
      currentVersion,
      providedVersion: version
    }
  });
}

// Update with incremented version
await databases.updateDocument(dbId, customFieldsCollectionId, id, {
  // ... other fields
  version: currentVersion + 1
});
```

### 3. Creation Endpoint (`src/pages/api/custom-fields/index.ts`)
- New custom fields are created with `version: 0`
- Ensures all documents have a version field from creation

## API Contract

### Update Request
```json
{
  "fieldName": "Updated Field Name",
  "fieldType": "text",
  "fieldOptions": null,
  "required": false,
  "order": 1,
  "version": 2
}
```

### Success Response (200 OK)
```json
{
  "$id": "field123",
  "fieldName": "Updated Field Name",
  "fieldType": "text",
  "version": 3,
  // ... other fields
}
```

### Conflict Response (409 Conflict)
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

### Validation Error (400 Bad Request)
```json
{
  "error": "Version field is required for update operations",
  "details": "Include the current version number from the document you are updating"
}
```

## Client Implementation Guide

### Fetching for Update
```typescript
// 1. Fetch the current custom field
const response = await fetch(`/api/custom-fields/${fieldId}`);
const customField = await response.json();

// 2. Store the version
const currentVersion = customField.version;
```

### Performing Update
```typescript
// 3. Include version in update request
const updateResponse = await fetch(`/api/custom-fields/${fieldId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fieldName: 'New Name',
    fieldType: 'text',
    fieldOptions: null,
    required: false,
    order: 1,
    version: currentVersion  // Include the version
  })
});

// 4. Handle conflict
if (updateResponse.status === 409) {
  const conflict = await updateResponse.json();
  // Notify user and refetch latest data
  alert('This field was modified by another user. Please refresh and try again.');
  // Refetch and retry
}
```

### Retry Logic
```typescript
async function updateWithRetry(fieldId: string, updates: any, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Fetch latest version
    const current = await fetch(`/api/custom-fields/${fieldId}`).then(r => r.json());
    
    // Attempt update
    const response = await fetch(`/api/custom-fields/${fieldId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, version: current.version })
    });
    
    if (response.status === 409) {
      // Conflict - retry
      continue;
    }
    
    if (response.ok) {
      return await response.json();
    }
    
    throw new Error(`Update failed: ${response.status}`);
  }
  
  throw new Error('Max retries exceeded');
}
```

## Database Schema Update Required

### Appwrite Collection Attribute
Add a new integer attribute to the custom fields collection:

```javascript
// Using Appwrite SDK or Console
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

### Migration for Existing Records
If you have existing custom fields without a version field:

```javascript
// Migration script
const { databases } = createAdminClient();
const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const collectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID;

// Fetch all custom fields
const result = await databases.listDocuments(dbId, collectionId, [Query.limit(500)]);

// Update each document to add version: 0
for (const doc of result.documents) {
  if (doc.version === undefined) {
    await databases.updateDocument(dbId, collectionId, doc.$id, {
      version: 0
    });
  }
}
```

## Benefits

1. **Prevents Lost Updates**: Ensures concurrent modifications don't overwrite each other
2. **Data Integrity**: Maintains consistency across concurrent operations
3. **User Feedback**: Clear error messages when conflicts occur
4. **Automatic Detection**: No manual conflict resolution needed
5. **Backward Compatible**: Defaults to version 0 for existing records

## Testing Scenarios

### Test 1: Successful Update
1. User A fetches custom field (version: 2)
2. User A updates field with version: 2
3. Update succeeds, returns version: 3

### Test 2: Conflict Detection
1. User A fetches custom field (version: 2)
2. User B fetches custom field (version: 2)
3. User B updates field with version: 2 → succeeds (version: 3)
4. User A updates field with version: 2 → fails with 409 Conflict

### Test 3: Missing Version
1. Client sends update without version field
2. API returns 400 Bad Request with clear error message

### Test 4: New Field Creation
1. Create new custom field
2. Verify version is set to 0
3. First update increments to version 1

## Related Files
- `src/pages/api/custom-fields/[id].ts` - Update endpoint with optimistic locking
- `src/pages/api/custom-fields/index.ts` - Creation endpoint with version initialization
- `docs/fixes/CUSTOM_FIELDS_SOFT_DELETE.md` - Soft delete implementation (also uses version field)

## Next Steps
1. Add version attribute to Appwrite custom fields collection
2. Run migration script for existing records
3. Update frontend components to include version in update requests
4. Add conflict handling UI with retry logic
5. Update API documentation for clients
