# Mobile App Integration Guide

## Quick Start

Update your mobile app to use `customFieldValuesByInternalName` for approval profile rule evaluation.

## Required Changes

### 1. Update Attendee Sync Handler

**Location**: Where you process the `/api/mobile/sync/attendees` response

**Before:**
```typescript
// Processing sync response
attendees.forEach(attendee => {
  const cachedAttendee = {
    id: attendee.id,
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    barcodeNumber: attendee.barcodeNumber,
    photoUrl: attendee.photoUrl,
    customFieldValues: attendee.customFieldValues, // ❌ Uses field IDs
    accessEnabled: attendee.accessControl.accessEnabled,
    validFrom: attendee.accessControl.validFrom,
    validUntil: attendee.accessControl.validUntil
  };
  
  // Store in local database
  saveToCache(cachedAttendee);
});
```

**After:**
```typescript
// Processing sync response
attendees.forEach(attendee => {
  const cachedAttendee = {
    id: attendee.id,
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    barcodeNumber: attendee.barcodeNumber,
    photoUrl: attendee.photoUrl,
    customFieldValues: attendee.customFieldValuesByInternalName, // ✅ Uses internal names
    accessEnabled: attendee.accessControl.accessEnabled,
    validFrom: attendee.accessControl.validFrom,
    validUntil: attendee.accessControl.validUntil
  };
  
  // Store in local database
  saveToCache(cachedAttendee);
});
```

### 2. Update TypeScript Types (if applicable)

**Before:**
```typescript
interface SyncAttendeeResponse {
  id: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  photoUrl: string | null;
  customFieldValues: Record<string, any>; // Field IDs as keys
  customFieldValuesByName: Record<string, any>; // Display names as keys
  accessControl: {
    accessEnabled: boolean;
    validFrom: string | null;
    validUntil: string | null;
  };
  updatedAt: string;
}
```

**After:**
```typescript
interface SyncAttendeeResponse {
  id: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  photoUrl: string | null;
  customFieldValues: Record<string, any>; // Field IDs as keys
  customFieldValuesByName: Record<string, any>; // Display names as keys
  customFieldValuesByInternalName: Record<string, any>; // Internal names as keys ✨ NEW
  accessControl: {
    accessEnabled: boolean;
    validFrom: string | null;
    validUntil: string | null;
  };
  updatedAt: string;
}
```

### 3. Keep Display Names for UI

**Important**: Continue using `customFieldValuesByName` for displaying custom field values in the UI:

```typescript
// For displaying in UI
function displayCustomField(attendee: CachedAttendee, fieldDisplayName: string) {
  // Use the original API response, not the cached version
  const apiResponse = getOriginalApiResponse(attendee.id);
  return apiResponse.customFieldValuesByName[fieldDisplayName];
}

// Example: Display "VIP Room" field
const vipRoom = displayCustomField(attendee, "VIP Room");
// Shows: "Gold"
```

## Verification

### Test Approval Profile Rules

After making the changes, test that approval profile rules work correctly:

```typescript
// Example approval profile rule
const rule = {
  field: "customFieldValues.vip_room",
  operator: "equals",
  value: "Gold"
};

// Get cached attendee
const attendee = getCachedAttendee("12345");

// Evaluate rule (using your existing rule engine)
const result = evaluateRule(rule, attendee);

// Should return true if attendee has vip_room = "Gold"
console.log("Rule evaluation result:", result);
```

### Expected Behavior

**Before the fix:**
- Rule field path: `customFieldValues.vip_room`
- Cached attendee has: `customFieldValues["field-abc123"]`
- Result: ❌ Rule fails (field not found)

**After the fix:**
- Rule field path: `customFieldValues.vip_room`
- Cached attendee has: `customFieldValues["vip_room"]`
- Result: ✅ Rule passes (field found and matches)

## Testing Checklist

- [ ] Update attendee sync handler to use `customFieldValuesByInternalName`
- [ ] Update TypeScript types (if applicable)
- [ ] Test approval profile rule evaluation
- [ ] Verify custom field display in UI still works
- [ ] Test with various custom field types (text, select, boolean)
- [ ] Test with attendees that have no custom fields
- [ ] Test with attendees that have multiple custom fields
- [ ] Test backward compatibility (old cached data)

## Backward Compatibility

### Handling Old Cached Data

If you have attendees cached before this update, they'll have field IDs in `customFieldValues`. You have two options:

**Option 1: Re-sync all attendees** (Recommended)
```typescript
// Force a full sync to get new data structure
await syncAttendees({ since: null }); // Full sync
```

**Option 2: Transform old cached data**
```typescript
// Transform old cached data to new format
async function migrateOldCachedData() {
  const customFields = await fetchCustomFields();
  const fieldIdToInternalName = new Map(
    customFields.map(f => [f.id, f.internalFieldName])
  );
  
  const attendees = await getAllCachedAttendees();
  
  for (const attendee of attendees) {
    // Check if using old format (field IDs as keys)
    const firstKey = Object.keys(attendee.customFieldValues)[0];
    if (firstKey && firstKey.startsWith('field-')) {
      // Transform to internal names
      const transformed: Record<string, any> = {};
      for (const [fieldId, value] of Object.entries(attendee.customFieldValues)) {
        const internalName = fieldIdToInternalName.get(fieldId) || fieldId;
        transformed[internalName] = value;
      }
      attendee.customFieldValues = transformed;
      await updateCachedAttendee(attendee);
    }
  }
}
```

## Troubleshooting

### Issue: Approval profile rules still failing

**Check:**
1. Verify you're using `customFieldValuesByInternalName` in sync handler
2. Check that cached attendees have internal names as keys
3. Verify approval profile rules use correct internal names
4. Check rule engine is using dot-notation correctly

**Debug:**
```typescript
// Log the cached attendee structure
console.log("Cached attendee:", JSON.stringify(cachedAttendee, null, 2));

// Log the rule being evaluated
console.log("Rule:", JSON.stringify(rule, null, 2));

// Log the field value extraction
const fieldPath = rule.field; // "customFieldValues.vip_room"
const parts = fieldPath.split('.');
let value: any = cachedAttendee;
for (const part of parts) {
  console.log(`Accessing: ${part}, Current value:`, value);
  value = value?.[part];
}
console.log("Final value:", value);
```

### Issue: Custom fields not displaying in UI

**Check:**
1. Verify you're using `customFieldValuesByName` for UI display
2. Make sure you're accessing the original API response, not cached data
3. Check that display names match exactly (case-sensitive)

### Issue: Old cached data causing issues

**Solution:**
Force a full re-sync or run the migration script (see Backward Compatibility section above)

## API Endpoints Updated

All three mobile API endpoints now provide `customFieldValuesByInternalName`:

1. **Sync Attendees**: `GET /api/mobile/sync/attendees`
2. **Debug Attendee (Query)**: `GET /api/mobile/debug/attendee?barcode={barcode}`
3. **Debug Attendee (Route)**: `GET /api/mobile/debug/attendee/{barcode}`

## Questions?

See the detailed documentation:
- **Analysis**: `docs/fixes/CUSTOM_FIELD_NAMING_DISCREPANCY_ANALYSIS.md`
- **Implementation**: `docs/fixes/CUSTOM_FIELD_INTERNAL_NAMES_IMPLEMENTATION.md`
- **Quick Summary**: `CUSTOM_FIELD_FIX_SUMMARY.md`
