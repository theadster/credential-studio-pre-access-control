# Test Fix - Custom Fields Schema Corrections

## Issues

1. **First Error**:
```
❌ Test 5: Custom Fields Reorder (Atomic) (92ms)
Error: Invalid document structure: Missing required attribute "eventSettingsId"
```

2. **Second Error**:
```
❌ Test 5: Custom Fields Reorder (Atomic) (202ms)
Error: Invalid document structure: Unknown attribute: "version"
```

## Root Causes

1. The test was creating custom fields without all required fields
2. The test was using incorrect field names (`order` instead of `fieldOrder`, and non-existent `version`)
3. The API code was also using incorrect field names

## Fixes Applied

### 1. Updated `scripts/test-all-transactions.ts`

**Fetch event settings ID** before creating custom fields:
```typescript
const eventSettingsDocs = await databases.listDocuments(
  databaseId!,
  eventSettingsCollectionId
);
const eventSettingsId = eventSettingsDocs.documents[0].$id;
```

**Use correct field names** when creating test custom fields:
```typescript
const testFields = Array.from({ length: 5 }, (_, i) => ({
  $id: ID.unique(),
  eventSettingsId: eventSettingsId,  // Required
  fieldName: `${TEST_PREFIX}Field${i}`,  // Required
  internalFieldName: `${TEST_PREFIX}field${i}`,
  fieldType: 'text',  // Required
  fieldOptions: JSON.stringify({}),
  required: false,
  fieldOrder: i,  // ✅ Correct: 'fieldOrder' not 'order'
  showOnMainPage: true,
  printable: false
  // ✅ Removed: 'version' field doesn't exist
}));
```

**Use correct field name in reorder**:
```typescript
const rows = existingFields.map((field, index) => ({
  ...fieldData,
  fieldOrder: existingFields.length - index - 1,  // ✅ Correct field name
  $id: field.$id
}));
```

### 2. Fixed `src/pages/api/custom-fields/index.ts`

Changed from:
```typescript
order: fieldOrder,  // ❌ Wrong field name
version: 0  // ❌ Field doesn't exist
```

To:
```typescript
fieldOrder: fieldOrder,  // ✅ Correct field name
// ✅ Removed version field
```

### 3. Fixed `src/pages/api/custom-fields/reorder.ts`

Changed from:
```typescript
order,  // ❌ Wrong field name
```

To:
```typescript
fieldOrder: order,  // ✅ Correct field name
```

## Custom Fields Schema

Based on `scripts/setup-appwrite.ts`, the actual custom fields schema is:

### Required Fields
- `eventSettingsId` (string) - Reference to event settings document
- `fieldName` (string) - Display name of the field
- `fieldType` (string) - Type of field (text, number, boolean, etc.)
- `fieldOrder` (number) - Display order ⚠️ **Note: field is called `fieldOrder` not `order`**

### Optional Fields
- `internalFieldName` (string) - Internal identifier
- `fieldOptions` (string) - JSON string of field options
- `required` (boolean) - Whether field is required (default: false)
- `showOnMainPage` (boolean) - Whether to show on main page (default: true)
- `printable` (boolean) - Whether to include in printed credentials (default: false)

### Fields That Don't Exist
- ❌ `version` - This field does not exist in the schema
- ❌ `order` - The correct field name is `fieldOrder`

## Prerequisites for Test

The integration test now requires:
1. ✅ Event settings must be configured (at least one document exists)
2. ✅ `NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID` environment variable set

If event settings don't exist, the test will fail with:
```
Error: No event settings found. Please configure event settings first.
```

## Running the Test

```bash
# Ensure event settings exist first
# Then run the integration test
npx tsx scripts/test-all-transactions.ts
```

## Expected Result

```
🧪 Running: Test 5: Custom Fields Reorder (Atomic)
   ✓ Reordered 5 custom fields atomically
✅ PASS (XXXms)
```

## Summary of Changes

| File | Issue | Fix |
|------|-------|-----|
| `scripts/test-all-transactions.ts` | Missing `eventSettingsId`, wrong field names | Added fetch for event settings, use `fieldOrder`, removed `version` |
| `src/pages/api/custom-fields/index.ts` | Used `order` instead of `fieldOrder`, had non-existent `version` | Changed to `fieldOrder`, removed `version` |
| `src/pages/api/custom-fields/reorder.ts` | Used `order` instead of `fieldOrder` | Changed to `fieldOrder` |

## Impact

These fixes ensure:
- ✅ Custom fields are created with correct schema
- ✅ Custom field reordering works correctly
- ✅ Integration tests pass
- ✅ API endpoints use correct field names

## Testing

After these fixes, the integration test should pass:

```bash
npx tsx scripts/test-all-transactions.ts
```

Expected output:
```
🧪 Running: Test 5: Custom Fields Reorder (Atomic)
   ✓ Reordered 5 custom fields atomically
✅ PASS (XXXms)
```

## Related Files

- `scripts/test-all-transactions.ts` - Integration test (fixed)
- `scripts/setup-appwrite.ts` - Schema definition (reference)
- `src/pages/api/custom-fields/index.ts` - Custom field creation (fixed)
- `src/pages/api/custom-fields/reorder.ts` - Custom field reorder (fixed)

## Date
January 25, 2025
