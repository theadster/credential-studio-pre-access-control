# Fix: Show on Main Page Toggle Not Persisting

## Issue

When toggling the "Show on Main Page" setting for a custom field and saving:
- The toggle would appear to save
- But when reopening the field settings, it would be back to enabled
- The value was not being persisted to the database

## Root Cause

There were TWO issues preventing the `showOnMainPage` toggle from persisting:

**Issue 1: Missing from database operations**
1. `handleCustomFieldModifications()` - When updating existing fields
2. `handleCustomFieldAdditions()` - When creating new fields

Both functions were updating/creating custom field documents but were **not including the `showOnMainPage` property** in the data sent to Appwrite.

**Issue 2: Not detected as a modification (THE MAIN ISSUE)**
The code that determines if a custom field has been modified was checking:
- `fieldName`
- `fieldType`
- `required`
- `fieldOptions`

But it was **NOT checking `showOnMainPage`**! So when you only changed the visibility toggle, the field wasn't detected as "modified" and the update function never ran.

## Solution Applied

### 1. Added showOnMainPage to Modification Detection (CRITICAL FIX)
**File**: `src/pages/api/event-settings/index.ts`

**Before:**
```typescript
return existingField.fieldName !== incomingField.fieldName ||
  existingField.fieldType !== incomingField.fieldType ||
  existingField.required !== incomingField.required ||
  JSON.stringify(existingField.fieldOptions) !== JSON.stringify(incomingField.fieldOptions);
  // showOnMainPage was missing from the comparison!
```

**After:**
```typescript
return existingField.fieldName !== incomingField.fieldName ||
  existingField.fieldType !== incomingField.fieldType ||
  existingField.required !== incomingField.required ||
  existingField.showOnMainPage !== incomingField.showOnMainPage || // ✅ Added
  JSON.stringify(existingField.fieldOptions) !== JSON.stringify(incomingField.fieldOptions);
```

This ensures that when you toggle `showOnMainPage`, the field is properly detected as modified and the update function runs.

### 2. Fixed Custom Field Updates
**File**: `src/pages/api/event-settings/index.ts`

**Before:**
```typescript
await databases.updateDocument(dbId, customFieldsCollectionId, modifiedField.id, {
  fieldName: modifiedField.fieldName,
  internalFieldName: modifiedField.internalFieldName || generateInternalFieldName(modifiedField.fieldName),
  fieldType: modifiedField.fieldType,
  fieldOptions: fieldOptionsStr,
  required: modifiedField.required || false,
  order: modifiedField.order,
  // showOnMainPage was missing!
});
```

**After:**
```typescript
await databases.updateDocument(dbId, customFieldsCollectionId, modifiedField.id, {
  fieldName: modifiedField.fieldName,
  internalFieldName: modifiedField.internalFieldName || generateInternalFieldName(modifiedField.fieldName),
  fieldType: modifiedField.fieldType,
  fieldOptions: fieldOptionsStr,
  required: modifiedField.required || false,
  order: modifiedField.order,
  showOnMainPage: modifiedField.showOnMainPage !== undefined ? modifiedField.showOnMainPage : true,
});
```

### 3. Fixed Custom Field Creation
**File**: `src/pages/api/event-settings/index.ts`

**Before:**
```typescript
await databases.createDocument(dbId, customFieldsCollectionId, ID.unique(), {
  eventSettingsId: currentSettings.$id,
  fieldName: field.fieldName,
  internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName),
  fieldType: field.fieldType,
  fieldOptions: fieldOptionsStr,
  required: field.required || false,
  order: field.order || totalFieldsCount,
  // showOnMainPage was missing!
});
```

**After:**
```typescript
await databases.createDocument(dbId, customFieldsCollectionId, ID.unique(), {
  eventSettingsId: currentSettings.$id,
  fieldName: field.fieldName,
  internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName),
  fieldType: field.fieldType,
  fieldOptions: fieldOptionsStr,
  required: field.required || false,
  order: field.order || totalFieldsCount,
  showOnMainPage: field.showOnMainPage !== undefined ? field.showOnMainPage : true,
});
```

## Default Behavior

The fix includes proper default handling:
- If `showOnMainPage` is explicitly set to `true` → Field is visible
- If `showOnMainPage` is explicitly set to `false` → Field is hidden
- If `showOnMainPage` is `undefined` → Defaults to `true` (visible)

This ensures backward compatibility with existing fields that don't have this property set.

## Data Flow

1. **User toggles switch** in EventSettingsForm
2. **Local state updates** with `showOnMainPage` value
3. **Form submits** with `customFields` array including `showOnMainPage`
4. **API receives** the data in event-settings endpoint
5. **Database updates** now include `showOnMainPage` property ✅
6. **Value persists** and is reflected on next load ✅

## Files Modified

- `src/pages/api/event-settings/index.ts` - Added `showOnMainPage` to both update and create operations

## Testing

After applying this fix:
1. ✅ Toggle "Show on Main Page" to OFF and save
2. ✅ Reopen the field settings
3. ✅ Toggle remains OFF (persisted correctly)
4. ✅ Field is hidden from main attendees page
5. ✅ Toggle back to ON and save
6. ✅ Field reappears on main attendees page

## Related Issues

This fix completes the visibility control feature implementation:
- ✅ UI toggle works correctly
- ✅ Value persists to database
- ✅ Dashboard respects the setting
- ✅ All fields still appear in forms

## Date

2025-10-10
