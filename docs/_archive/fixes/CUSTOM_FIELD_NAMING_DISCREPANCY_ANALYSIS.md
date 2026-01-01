# Custom Field Naming Discrepancy Analysis

## Problem Summary

There is a naming inconsistency between how custom fields are referenced in Approval Profiles versus how they are sent to the mobile app:

- **Approval Profiles**: Use `internalFieldName` format (e.g., `customFieldValues.vip_room`)
- **Mobile API**: Sends `fieldName` format (e.g., `VIP Room`)

This causes approval profile rules to fail because the mobile app doesn't have the internal field names needed to evaluate the rules.

## Current Architecture

### 1. Custom Field Storage (Database)

Custom fields in the database have THREE name properties:

```typescript
{
  $id: "field-abc123",           // Unique field ID
  fieldName: "VIP Room",         // Display name (user-facing)
  internalFieldName: "vip_room", // Internal name (kebab-case, used in templates)
  fieldType: "select",
  // ... other properties
}
```

### 2. Attendee Custom Field Values (Database)

Attendee custom field values are stored as JSON with **field IDs as keys**:

```json
{
  "customFieldValues": {
    "field-abc123": "Gold",
    "field-def456": "Engineering"
  }
}
```

### 3. Mobile API Response (`/api/mobile/sync/attendees`)

The mobile API sends TWO versions of custom field values:

```json
{
  "customFieldValues": {
    "field-abc123": "Gold",      // Field IDs as keys (original format)
    "field-def456": "Engineering"
  },
  "customFieldValuesByName": {
    "VIP Room": "Gold",           // Display names as keys (NEW)
    "Department": "Engineering"
  }
}
```

**Note**: The API provides `customFieldValuesByName` but the mobile app is currently using `customFieldValues` with field IDs.

### 4. Approval Profile Rules

Approval profiles reference custom fields using **internal field names**:

```json
{
  "logic": "AND",
  "conditions": [
    {
      "field": "customFieldValues.vip_room",  // Uses internalFieldName
      "operator": "equals",
      "value": "Gold"
    }
  ]
}
```

### 5. Rule Engine Evaluation (`src/lib/ruleEngine.ts`)

The rule engine uses dot-notation to access fields:

```typescript
// For field path "customFieldValues.vip_room"
// It looks for: attendee.customFieldValues.vip_room
// But mobile app has: attendee.customFieldValues["field-abc123"]
```

## The Discrepancy

### What Approval Profiles Expect:
```typescript
attendee.customFieldValues = {
  "vip_room": "Gold",        // internalFieldName as key
  "department": "Engineering"
}
```

### What Mobile App Actually Has:
```typescript
attendee.customFieldValues = {
  "field-abc123": "Gold",    // Field ID as key
  "field-def456": "Engineering"
}
```

### What Mobile App Also Has (But Doesn't Use):
```typescript
attendee.customFieldValuesByName = {
  "VIP Room": "Gold",        // Display name as key
  "Department": "Engineering"
}
```

## Root Cause

The issue stems from a mismatch in data structure expectations:

1. **Database Storage**: Uses field IDs as keys (correct for relational integrity)
2. **Approval Profiles**: Reference fields by `internalFieldName` (for template consistency)
3. **Mobile API**: Provides both field IDs and display names, but NOT internal names
4. **Mobile App**: Uses field IDs to access values (doesn't match approval profile expectations)

## Solution Options

### Option 1: Add `customFieldValuesByInternalName` to Mobile API ✅ RECOMMENDED

**Changes Required**: Backend only (no mobile app changes)

**Implementation**:
1. Modify `/api/mobile/sync/attendees` to include a third mapping
2. Modify `/api/mobile/custom-fields` to include `internalFieldName` in response

**Pros**:
- No mobile app code changes required
- Maintains backward compatibility
- Provides all three naming formats for flexibility
- Aligns with existing template system (Switchboard, OneSimpleAPI)

**Cons**:
- Slightly larger API response payload
- Three different ways to access same data (could be confusing)

### Option 2: Change Approval Profiles to Use Field IDs

**Changes Required**: Backend and potentially existing approval profiles

**Implementation**:
1. Change approval profile field references from `customFieldValues.vip_room` to `customFieldValues.field-abc123`
2. Update UI to use field IDs when building rules
3. Migrate existing approval profiles

**Pros**:
- Matches current mobile app implementation
- No mobile app changes needed
- Uses stable field IDs (won't break if field renamed)

**Cons**:
- Less readable approval profile rules
- Breaks consistency with template system
- Requires migration of existing profiles
- Field IDs are not user-friendly

### Option 3: Change Mobile App to Restructure Custom Field Values

**Changes Required**: Mobile app only

**Implementation**:
1. Mobile app transforms `customFieldValues` from field IDs to internal names
2. Requires custom field metadata to be available for transformation

**Pros**:
- Backend stays consistent
- Aligns with template system

**Cons**:
- Requires mobile app code changes
- More complex mobile app logic
- Potential for transformation errors
- Requires custom field metadata to be cached

### Option 4: Change Approval Profiles to Use Display Names

**Changes Required**: Backend only

**Implementation**:
1. Change approval profile field references from `customFieldValues.vip_room` to `customFieldValues.VIP Room`
2. Mobile app uses `customFieldValuesByName` instead of `customFieldValues`

**Pros**:
- User-friendly field references
- Mobile app already has the data structure

**Cons**:
- Display names can change (breaks rules)
- Spaces in field paths are awkward
- Inconsistent with template system
- Case-sensitive matching issues

## Recommended Solution: Option 1

Add `customFieldValuesByInternalName` to the mobile API response. This provides the best balance of:
- No mobile app changes required
- Backward compatibility
- Consistency with existing template system
- Future flexibility

### Implementation Plan

#### Step 1: Update Mobile Sync API

**File**: `src/pages/api/mobile/sync/attendees.ts`

Add a third mapping alongside `customFieldValues` and `customFieldValuesByName`:

```typescript
// After line 176, add:
let customFieldValuesByInternalName: Record<string, any> = {}; // Internal names as keys

// After line 188, add mapping logic:
Object.entries(customFieldValues).forEach(([fieldId, value]) => {
  const displayName = customFieldMap.get(fieldId) || fieldId;
  const internalName = customFieldInternalMap.get(fieldId) || fieldId;
  customFieldValuesByName[displayName] = value;
  customFieldValuesByInternalName[internalName] = value;
});

// Update return object (line 204):
return {
  id: attendee.$id,
  firstName: attendee.firstName,
  lastName: attendee.lastName,
  barcodeNumber: attendee.barcodeNumber,
  photoUrl: attendee.photoUrl || null,
  customFieldValues, // Field IDs as keys (backward compatibility)
  customFieldValuesByName, // Display names as keys
  customFieldValuesByInternalName, // Internal names as keys (NEW)
  accessControl,
  updatedAt: attendee.$updatedAt
};
```

#### Step 2: Update Custom Fields API

**File**: `src/pages/api/mobile/custom-fields.ts`

Ensure `internalFieldName` is included in the response (already present at line 72).

#### Step 3: Update Mobile App

**File**: Mobile app caching/storage layer

Change the cached attendee structure to use `customFieldValuesByInternalName` for rule evaluation:

```typescript
// When caching attendee data:
const cachedAttendee: CachedAttendee = {
  id: attendee.id,
  firstName: attendee.firstName,
  lastName: attendee.lastName,
  barcodeNumber: attendee.barcodeNumber,
  photoUrl: attendee.photoUrl,
  customFieldValues: attendee.customFieldValuesByInternalName, // Use internal names
  accessEnabled: attendee.accessControl.accessEnabled,
  validFrom: attendee.accessControl.validFrom,
  validUntil: attendee.accessControl.validUntil
};
```

#### Step 4: Update Debug API

**File**: `src/pages/api/mobile/debug/attendee.ts`

Add the same `customFieldValuesByInternalName` mapping for consistency.

#### Step 5: Update Tests

Add tests to verify the new mapping works correctly.

## Migration Path

### Phase 1: Backend Changes (No Breaking Changes)
1. Add `customFieldValuesByInternalName` to mobile sync API
2. Add `internalFieldName` to custom fields API (already present)
3. Deploy backend changes

### Phase 2: Mobile App Changes
1. Update mobile app to use `customFieldValuesByInternalName` for rule evaluation
2. Keep `customFieldValuesByName` for display purposes
3. Deploy mobile app update

### Phase 3: Validation
1. Test approval profile rules with various custom field types
2. Verify backward compatibility with old mobile app versions
3. Monitor for any issues

## Testing Requirements

1. **Unit Tests**: Test custom field name mapping logic
2. **Integration Tests**: Test approval profile evaluation with custom fields
3. **Mobile App Tests**: Test rule evaluation with new data structure
4. **Backward Compatibility**: Ensure old mobile app versions still work

## Documentation Updates

1. Update mobile API documentation to explain all three custom field mappings
2. Update approval profile documentation to clarify field path format
3. Add migration guide for mobile app developers

## Alternative Quick Fix (If Mobile App Changes Are Not Possible)

If mobile app changes cannot be made immediately, we can add a transformation layer in the rule engine:

**File**: `src/lib/ruleEngine.ts`

```typescript
// Add field ID to internal name mapping
export function transformFieldPath(
  fieldPath: string,
  customFieldMap: Map<string, string> // Maps field ID to internal name
): string {
  // If path is "customFieldValues.internalName"
  // Transform to "customFieldValues.fieldId"
  const parts = fieldPath.split('.');
  if (parts[0] === 'customFieldValues' && parts.length === 2) {
    const internalName = parts[1];
    // Find field ID by internal name
    for (const [fieldId, internalFieldName] of customFieldMap.entries()) {
      if (internalFieldName === internalName) {
        return `customFieldValues.${fieldId}`;
      }
    }
  }
  return fieldPath;
}
```

However, this approach is NOT recommended because:
- Adds complexity to rule engine
- Requires custom field metadata in mobile app
- Doesn't solve the fundamental data structure mismatch

## Conclusion

The recommended solution is **Option 1**: Add `customFieldValuesByInternalName` to the mobile API. This provides:

1. **Immediate fix**: Mobile app can use the correct data structure
2. **No breaking changes**: Backward compatible with existing mobile apps
3. **Consistency**: Aligns with template system (Switchboard, OneSimpleAPI)
4. **Flexibility**: Provides all three naming formats for different use cases

The implementation is straightforward and requires minimal changes to both backend and mobile app.
