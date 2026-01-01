---
title: "Mobile Custom Fields Enhancement Summary"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/mobile/"]
---

# Mobile Custom Fields Enhancement Summary

## What Was Added

The mobile sync attendees API (`GET /api/mobile/sync/attendees`) now returns custom field values with both internal field names and user-friendly display names.

## The Problem

Previously, the mobile API only returned custom field values with internal field names:

```json
{
  "customFieldValues": {
    "empl_id": "E12345",
    "dept": "Engineering",
    "lvl": "Senior"
  }
}
```

This meant mobile apps had to either:
1. Show technical internal names to users (poor UX)
2. Maintain their own mapping of internal names to display names (maintenance burden)

## The Solution

The API now includes a new `customFieldValuesByName` object with display names as keys:

```json
{
  "customFieldValues": {
    "empl_id": "E12345",
    "dept": "Engineering",
    "lvl": "Senior"
  },
  "customFieldValuesByName": {
    "Employee ID": "E12345",
    "Department": "Engineering",
    "Level": "Senior"
  }
}
```

## How to Use

### Display Custom Fields with Full Names

```typescript
// Use customFieldValuesByName for UI display
attendee.customFieldValuesByName.forEach((value, fieldName) => {
  console.log(`${fieldName}: ${value}`);
});

// Output:
// Employee ID: E12345
// Department: Engineering
// Level: Senior
```

### React Component Example

```typescript
export function AttendeeDetails({ attendee }) {
  return (
    <div>
      <h2>{attendee.firstName} {attendee.lastName}</h2>
      <dl>
        {Object.entries(attendee.customFieldValuesByName).map(([fieldName, value]) => (
          <div key={fieldName}>
            <dt>{fieldName}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

## API Changes

### Endpoint
`GET /api/mobile/sync/attendees`

### New Response Field
```json
{
  "customFieldValuesByName": {
    "[Display Field Name]": "[Value]",
    "[Display Field Name]": "[Value]"
  }
}
```

### Backward Compatibility
- ✅ Original `customFieldValues` object still included
- ✅ No breaking changes to existing mobile apps
- ✅ Existing code continues to work

## Benefits

1. **Better User Experience** - Mobile apps can display user-friendly field names
2. **No Maintenance Burden** - No need to maintain field name mappings in mobile app
3. **Automatic Updates** - When field names change in admin panel, mobile app automatically shows new names
4. **Backward Compatible** - Existing mobile apps continue to work without changes

## Implementation Details

### How It Works

1. Mobile app calls `/api/mobile/sync/attendees`
2. Server fetches custom field definitions (fieldName and internalFieldName)
3. Server creates mapping: `internalFieldName` → `fieldName`
4. Server transforms custom field values using the mapping
5. Response includes both `customFieldValues` (internal names) and `customFieldValuesByName` (display names)

### Performance

- **No additional API calls** - Field mapping happens in a single request
- **Minimal overhead** - Mapping is done server-side during sync
- **Same bandwidth** - Same data, just organized differently
- **Cached efficiently** - Works with existing delta sync mechanism

## Files Modified

- `src/pages/api/mobile/sync/attendees.ts` - Added custom field name mapping logic

## Documentation

- **[Mobile Custom Field Names Guide](./MOBILE_CUSTOM_FIELD_NAMES.md)** - Detailed implementation guide with examples
- **[Mobile API Reference](../reference/MOBILE_API_REFERENCE.md)** - Updated API documentation
- **[Mobile Event Info API](./MOBILE_EVENT_INFO_API.md)** - Updated with custom field info

## Migration Guide

### For New Mobile Apps
Use `customFieldValuesByName` from the start:

```typescript
const fieldValue = attendee.customFieldValuesByName['Employee ID'];
```

### For Existing Mobile Apps
No changes required! Continue using `customFieldValues` or migrate to `customFieldValuesByName`:

```typescript
// Old way (still works)
const fieldValue = attendee.customFieldValues['empl_id'];

// New way (recommended)
const fieldValue = attendee.customFieldValuesByName['Employee ID'];
```

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
        "photoUrl": "https://example.com/photo.jpg",
        "customFieldValues": {
          "empl_id": "E12345",
          "dept": "Engineering",
          "lvl": "Senior",
          "start_date": "2020-01-15"
        },
        "customFieldValuesByName": {
          "Employee ID": "E12345",
          "Department": "Engineering",
          "Level": "Senior",
          "Start Date": "2020-01-15"
        },
        "accessControl": {
          "accessEnabled": true,
          "validFrom": "2024-06-15T00:00:00Z",
          "validUntil": "2024-06-16T23:59:59Z"
        },
        "updatedAt": "2024-06-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    },
    "syncTimestamp": "2024-06-15T10:35:00.000Z"
  }
}
```

## Testing

### Manual Test
```bash
curl -X GET "http://localhost:3000/api/mobile/sync/attendees" \
  -H "Cookie: appwrite-session=YOUR_SESSION_COOKIE"
```

Look for both `customFieldValues` and `customFieldValuesByName` in the response.

### Automated Test
```typescript
describe('Mobile Sync Attendees - Custom Field Names', () => {
  it('should return custom field values with display names', async () => {
    const response = await fetch('/api/mobile/sync/attendees', {
      credentials: 'include'
    });
    
    const result = await response.json();
    const attendee = result.data.attendees[0];
    
    // Check both objects exist
    expect(attendee.customFieldValues).toBeDefined();
    expect(attendee.customFieldValuesByName).toBeDefined();
    
    // Check display names are readable
    const displayNames = Object.keys(attendee.customFieldValuesByName);
    expect(displayNames.some(name => name.includes(' '))).toBe(true);
  });
});
```

## Troubleshooting

### Not seeing display names
- Ensure custom fields are configured in event settings
- Check that attendees have custom field values set
- Verify API response includes `customFieldValuesByName`

### Seeing internal names instead of display names
- You may be using `customFieldValues` instead of `customFieldValuesByName`
- Switch to `customFieldValuesByName` for display names

### Missing fields
- Some attendees may not have values for all custom fields
- Use optional chaining: `attendee.customFieldValuesByName[fieldName] ?? 'N/A'`

## Next Steps

1. Update your mobile app to use `customFieldValuesByName` for display
2. Test with your custom fields to ensure names display correctly
3. Refer to [Mobile Custom Field Names Guide](./MOBILE_CUSTOM_FIELD_NAMES.md) for implementation examples

## Related Documentation

- [Mobile Custom Field Names Guide](./MOBILE_CUSTOM_FIELD_NAMES.md)
- [Mobile API Reference](../reference/MOBILE_API_REFERENCE.md)
- [Mobile Event Info API](./MOBILE_EVENT_INFO_API.md)
- [Mobile App Event Display](./MOBILE_APP_EVENT_DISPLAY.md)
