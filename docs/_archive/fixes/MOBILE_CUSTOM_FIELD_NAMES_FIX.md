# Mobile Custom Field Names Fix

## Issue
The mobile sync attendees API (`GET /api/mobile/sync/attendees`) was returning database IDs instead of actual field names in the `customFieldValuesByName` object.

### What Was Happening
```json
{
  "customFieldValuesByName": {
    "field-vip-status": "Gold",
    "field-department": "Engineering"
  }
}
```

### What Should Happen
```json
{
  "customFieldValuesByName": {
    "VIP Status": "Gold",
    "Department": "Engineering"
  }
}
```

## Root Cause
The mobile sync endpoint was trying to map custom field values using `internalFieldName` as the key, but the actual stored values use the field **ID** (the database document ID `$id`) as the key.

The mapping logic was:
```typescript
// WRONG - using internalFieldName
customFieldsResult.documents.forEach((field: any) => {
  if (field.internalFieldName && field.fieldName) {
    customFieldMap.set(field.internalFieldName, field.fieldName);
  }
});
```

But custom field values are stored with field IDs:
```json
{
  "customFieldValues": {
    "field-vip-status": "Gold",
    "field-department": "Engineering"
  }
}
```

## Solution
Updated the mapping to use field IDs (`$id`) instead of `internalFieldName`:

```typescript
// CORRECT - using field.$id
customFieldsResult.documents.forEach((field: any) => {
  if (field.$id && field.fieldName) {
    customFieldMap.set(field.$id, field.fieldName);
  }
});
```

And updated the mapping application:
```typescript
// Create mapping with display names
// customFieldValues keys are field IDs, map them to display names
Object.entries(customFieldValues).forEach(([fieldId, value]) => {
  const displayName = customFieldMap.get(fieldId) || fieldId;
  customFieldValuesByName[displayName] = value;
});
```

## Files Modified
- `src/pages/api/mobile/sync/attendees.ts` - Fixed custom field name mapping logic

## Testing
The fix has been verified to:
1. Correctly map field IDs to display names
2. Handle missing field definitions gracefully (falls back to field ID)
3. Handle empty custom field values
4. Handle null customFieldValues
5. Maintain backward compatibility with `customFieldValues` object (still contains field IDs)

## Impact
- Mobile apps now receive user-friendly field names in `customFieldValuesByName`
- No breaking changes - `customFieldValues` still contains field IDs for backward compatibility
- Automatic updates when field names change in admin panel

## Example Response
```json
{
  "success": true,
  "data": {
    "attendees": [
      {
        "id": "attendee_123",
        "firstName": "John",
        "lastName": "Doe",
        "barcodeNumber": "BADGE-001",
        "customFieldValues": {
          "field-vip-status": "Gold",
          "field-department": "Engineering"
        },
        "customFieldValuesByName": {
          "VIP Status": "Gold",
          "Department": "Engineering"
        },
        "accessControl": {
          "accessEnabled": true,
          "validFrom": "2024-06-15T00:00:00Z",
          "validUntil": "2024-06-16T23:59:59Z"
        }
      }
    ]
  }
}
```

## Verification Steps
1. Call `/api/mobile/sync/attendees` with a valid session
2. Check the response for `customFieldValuesByName` object
3. Verify field names are display names (e.g., "VIP Status") not IDs (e.g., "field-vip-status")
4. Verify `customFieldValues` still contains field IDs for backward compatibility

