# Mobile Custom Field Names Guide

## Overview

The mobile sync attendees API now returns custom field values using both internal field names and display field names, allowing mobile apps to show user-friendly field labels instead of technical internal names.

## What Changed

### Before
Custom field values were only available with internal field names (short, technical names):

```json
{
  "customFieldValues": {
    "empl_id": "12345",
    "dept": "Engineering",
    "lvl": "Senior"
  }
}
```

### After
Custom field values are now available with both internal names (for backward compatibility) and display names (recommended for UI):

```json
{
  "customFieldValues": {
    "empl_id": "12345",
    "dept": "Engineering",
    "lvl": "Senior"
  },
  "customFieldValuesByName": {
    "Employee ID": "12345",
    "Department": "Engineering",
    "Level": "Senior"
  }
}
```

## Using Display Field Names

### Recommended Approach

Use `customFieldValuesByName` to display field values with their full, user-friendly names:

```typescript
// Display custom fields with full names
attendee.customFieldValuesByName.forEach((value, fieldName) => {
  console.log(`${fieldName}: ${value}`);
});

// Output:
// Employee ID: 12345
// Department: Engineering
// Level: Senior
```

### Backward Compatibility

The original `customFieldValues` object is still available for backward compatibility:

```typescript
// Old approach (still works, but shows internal names)
attendee.customFieldValues.forEach((value, internalName) => {
  console.log(`${internalName}: ${value}`);
});

// Output:
// empl_id: 12345
// dept: Engineering
// lvl: Senior
```

## React Component Example

### Display Custom Fields with Full Names

```typescript
import React from 'react';

interface AttendeeProps {
  attendee: {
    firstName: string;
    lastName: string;
    customFieldValuesByName: Record<string, any>;
  };
}

export function AttendeeDetails({ attendee }: AttendeeProps) {
  return (
    <div className="attendee-details">
      <h2>{attendee.firstName} {attendee.lastName}</h2>
      
      {Object.entries(attendee.customFieldValuesByName).length > 0 && (
        <div className="custom-fields">
          <h3>Additional Information</h3>
          <dl>
            {Object.entries(attendee.customFieldValuesByName).map(([fieldName, value]) => (
              <div key={fieldName} className="field">
                <dt>{fieldName}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
```

### Display in a Table

```typescript
export function AttendeeTable({ attendees }: { attendees: Attendee[] }) {
  // Get all unique field names from all attendees
  const allFieldNames = new Set<string>();
  attendees.forEach(attendee => {
    Object.keys(attendee.customFieldValuesByName).forEach(name => {
      allFieldNames.add(name);
    });
  });

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Badge</th>
          {Array.from(allFieldNames).map(fieldName => (
            <th key={fieldName}>{fieldName}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {attendees.map(attendee => (
          <tr key={attendee.id}>
            <td>{attendee.firstName} {attendee.lastName}</td>
            <td>{attendee.barcodeNumber}</td>
            {Array.from(allFieldNames).map(fieldName => (
              <td key={fieldName}>
                {attendee.customFieldValuesByName[fieldName] ?? '-'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## React Native Example

```typescript
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface AttendeeProps {
  attendee: {
    firstName: string;
    lastName: string;
    customFieldValuesByName: Record<string, any>;
  };
}

export function AttendeeCard({ attendee }: AttendeeProps) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.name}>
        {attendee.firstName} {attendee.lastName}
      </Text>
      
      {Object.entries(attendee.customFieldValuesByName).map(([fieldName, value]) => (
        <View key={fieldName} style={styles.field}>
          <Text style={styles.fieldLabel}>{fieldName}</Text>
          <Text style={styles.fieldValue}>{String(value)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff'
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16
  },
  field: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  fieldLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  fieldValue: {
    fontSize: 16,
    color: '#000'
  }
});
```

## API Response Example

### Full Response with Custom Fields

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

## Field Name Mapping

The mobile API automatically maps internal field names to display names:

| Internal Name | Display Name | Example Value |
|---------------|--------------|---------------|
| `empl_id` | `Employee ID` | E12345 |
| `dept` | `Department` | Engineering |
| `lvl` | `Level` | Senior |
| `start_date` | `Start Date` | 2020-01-15 |
| `phone` | `Phone Number` | 555-1234 |

## Handling Missing Fields

When displaying custom fields, some attendees may not have values for all fields:

```typescript
// Safe approach - use optional chaining and nullish coalescing
const fieldValue = attendee.customFieldValuesByName[fieldName] ?? 'N/A';

// Or check if field exists
if (fieldName in attendee.customFieldValuesByName) {
  console.log(attendee.customFieldValuesByName[fieldName]);
} else {
  console.log('Field not set for this attendee');
}
```

## Performance Considerations

- **Field name mapping is automatic** - No additional API calls needed
- **Minimal overhead** - Mapping happens server-side during sync
- **Backward compatible** - Both `customFieldValues` and `customFieldValuesByName` are included
- **No bandwidth increase** - Same data, just organized differently

## Migration Guide

If you're currently using `customFieldValues` with internal names:

### Before
```typescript
// Display internal field names
Object.entries(attendee.customFieldValues).forEach(([key, value]) => {
  console.log(`${key}: ${value}`); // Shows: empl_id: E12345
});
```

### After
```typescript
// Display user-friendly field names
Object.entries(attendee.customFieldValuesByName).forEach(([key, value]) => {
  console.log(`${key}: ${value}`); // Shows: Employee ID: E12345
});
```

## Troubleshooting

### Field names not showing
- Ensure you're using `customFieldValuesByName` instead of `customFieldValues`
- Check that custom fields are configured in the event settings
- Verify the API response includes both objects

### Seeing internal names instead of display names
- You may be using the old `customFieldValues` object
- Switch to `customFieldValuesByName` for display names
- Keep `customFieldValues` if you need internal names for data processing

### Missing fields in the mapping
- Some attendees may not have values for all custom fields
- Use optional chaining: `attendee.customFieldValuesByName[fieldName] ?? 'N/A'`
- Check that the field is configured in event settings

## Related Documentation

- [Mobile API Reference](../reference/MOBILE_API_REFERENCE.md)
- [Mobile Sync Attendees API](../guides/MOBILE_EVENT_INFO_API.md)
- [Mobile App Event Display](../guides/MOBILE_APP_EVENT_DISPLAY.md)
