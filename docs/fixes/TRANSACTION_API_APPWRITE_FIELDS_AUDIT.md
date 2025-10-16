# Transaction API - Appwrite Internal Fields Audit

## Issue
Event Settings API was failing with errors:
1. `Invalid document structure: Unknown attribute: "$databaseId"`
2. `Invalid document structure: Attribute "$sequence" has invalid type`

This occurred because Appwrite internal fields (prefixed with `$`) were being included in transaction update operations.

## Root Cause
In `src/pages/api/event-settings/index.ts`, the `getCoreEventSettingsFields()` function used destructuring to exclude specific fields but kept all remaining fields with `...coreFields`. This inadvertently included Appwrite's internal metadata fields.

## Fix Applied
Changed from explicit field exclusion to filtering ALL fields starting with `$`:

```typescript
function getCoreEventSettingsFields(updateData: any) {
  // First, exclude known integration and special fields
  const {
    // ... integration fields ...
    customFields,
    timestamp,
    ...remainingFields
  } = updateData;

  // Filter out ALL Appwrite internal fields (anything starting with $)
  const coreFields: any = {};
  for (const [key, value] of Object.entries(remainingFields)) {
    if (!key.startsWith('$')) {
      coreFields[key] = value;
    }
  }

  return coreFields;
}
```

This approach is more robust and will automatically handle any new internal fields Appwrite might add in the future.

## Comprehensive Audit Results

### ✅ All Transaction-Based Endpoints Checked

#### 1. **src/pages/api/users/link.ts**
- ✅ **SAFE** - Creates new documents with explicit fields
- No update operations that could include internal fields
- Uses explicit field mapping:
  ```typescript
  data: {
    userId: authUser.$id,
    email: authUser.email,
    name: authUser.name,
    roleId: roleId,
    isInvited: false
  }
  ```

#### 2. **src/pages/api/custom-fields/index.ts** (POST)
- ✅ **SAFE** - Creates new documents with explicit `customFieldData` object
- All fields explicitly defined
- No spread operators used

#### 3. **src/pages/api/custom-fields/[id].ts** (PUT)
- ✅ **SAFE** - Uses explicit `updateData` object:
  ```typescript
  const updateData = {
    fieldName,
    internalFieldName,
    fieldType,
    fieldOptions,
    required,
    order,
    showOnMainPage,
    version: currentVersion + 1
  };
  ```

#### 4. **src/pages/api/custom-fields/[id].ts** (DELETE)
- ✅ **SAFE** - Only updates specific fields:
  ```typescript
  data: {
    deletedAt,
    version: currentVersion + 1
  }
  ```

#### 5. **src/pages/api/custom-fields/reorder.ts**
- ✅ **SAFE** - Only updates `order` field:
  ```typescript
  data: { order }
  ```

#### 6. **src/pages/api/roles/index.ts** (POST)
- ✅ **SAFE** - Creates with explicit fields:
  ```typescript
  data: {
    name,
    description: description || '',
    permissions: JSON.stringify(permissions)
  }
  ```

#### 7. **src/pages/api/roles/[id].ts** (PUT)
- ✅ **SAFE** - Updates with explicit fields:
  ```typescript
  data: {
    name,
    description: description || '',
    permissions: JSON.stringify(permissions)
  }
  ```

#### 8. **src/pages/api/roles/[id].ts** (DELETE)
- ✅ **SAFE** - No transaction used (uses direct delete)

#### 9. **src/pages/api/attendees/[id].ts** (PUT)
- ✅ **SAFE** - Builds explicit `updateData` object:
  ```typescript
  const updateData: any = {
    firstName: firstName || existingAttendee.firstName,
    lastName: lastName || existingAttendee.lastName,
    barcodeNumber: barcodeNumber || existingAttendee.barcodeNumber,
    notes: notes !== undefined ? notes : existingAttendee.notes,
    photoUrl: photoUrl !== undefined ? photoUrl : existingAttendee.photoUrl,
    lastSignificantUpdate: ...,
    customFieldValues: ...
  };
  ```
- No Appwrite internal fields included

#### 10. **src/pages/api/attendees/[id].ts** (DELETE)
- ✅ **SAFE** - No transaction used (uses direct delete)

#### 11. **src/pages/api/attendees/bulk-edit.ts**
- ✅ **SAFE** - Only updates `customFieldValues`:
  ```typescript
  data: {
    customFieldValues: JSON.stringify(updatedCustomFieldValues)
  }
  ```

#### 12. **src/pages/api/attendees/index.ts** (POST)
- ✅ **SAFE** - Creates with explicit fields, no transaction used

#### 13. **src/pages/api/event-settings/index.ts** (PUT)
- ✅ **FIXED** - Now filters out all `$` prefixed fields
- Custom fields handled separately in transaction
- Core fields properly filtered

## Appwrite Internal Fields Reference

Fields that should NEVER be included in document updates (all start with `$`):
- `$id` - Document ID (read-only)
- `$collectionId` - Collection ID (read-only)
- `$databaseId` - Database ID (read-only)
- `$createdAt` - Creation timestamp (read-only)
- `$updatedAt` - Update timestamp (managed by Appwrite)
- `$permissions` - Document permissions (managed separately)
- `$sequence` - Internal sequence number (read-only)

## Best Practices

### ✅ DO:
1. **Build explicit update objects** with only the fields you want to update
2. **Filter out `$` prefixed fields** if using spread operators or rest parameters
3. **Use destructuring** to exclude unwanted fields
4. **Validate update data** doesn't contain internal fields before sending

### ❌ DON'T:
1. **Spread entire document objects** into update operations
2. **Use `...rest` patterns** without explicitly excluding internal fields
3. **Pass request body directly** to update operations without filtering
4. **Assume you know all internal fields** - filter by `$` prefix instead

## Code Pattern Examples

### ✅ Good Pattern - Explicit Fields
```typescript
const updateData = {
  name: newName,
  description: newDescription,
  updatedField: newValue
};

operations.push({
  action: 'update',
  data: updateData
});
```

### ✅ Good Pattern - Filter Internal Fields
```typescript
const { $id, $collectionId, $databaseId, $createdAt, $updatedAt, $permissions, ...safeFields } = document;

// Or better - filter by prefix:
const safeFields: any = {};
for (const [key, value] of Object.entries(document)) {
  if (!key.startsWith('$')) {
    safeFields[key] = value;
  }
}
```

### ❌ Bad Pattern - Spread Without Filtering
```typescript
const updateData = {
  ...fetchedDocument,  // ❌ Contains $id, $createdAt, etc.
  name: newName
};
```

### ❌ Bad Pattern - Direct Request Body
```typescript
const updateData = req.body;  // ❌ Might contain internal fields
operations.push({
  action: 'update',
  data: updateData
});
```

## Testing Recommendations

When adding new transaction-based updates:

1. **Add debug logging** to inspect data before transaction:
   ```typescript
   console.log('Transaction data:', JSON.stringify(data, null, 2));
   ```

2. **Verify no `$` fields** are present in the data object

3. **Test with actual Appwrite instance** to catch validation errors early

4. **Check error logs** for "Invalid document structure" errors

5. **Add unit tests** that verify internal fields are filtered out

## Related Issues Fixed

1. ✅ Event Settings `$databaseId` error
2. ✅ Event Settings `$sequence` error  
3. ✅ Switchboard field mappings data loss (frontend issue)

## Status
✅ **RESOLVED** - All transaction-based API endpoints audited and confirmed safe.

- **event-settings**: Fixed with robust `$` prefix filtering
- **All other endpoints**: Confirmed safe with explicit field construction

## Date
2025-10-16
