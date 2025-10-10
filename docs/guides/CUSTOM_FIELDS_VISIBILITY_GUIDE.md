# Custom Fields Visibility Control Guide

## Overview

The Custom Fields Visibility Control feature allows event administrators to control which custom fields appear as columns in the main attendees table. This helps keep the interface clean and focused on the most important information while maintaining access to all fields in edit and create forms.

## Feature Description

### What It Does

- **Main Page Control**: Determines which custom fields appear as columns in the main attendees table
- **Form Access**: All custom fields remain visible in attendee edit and create forms regardless of visibility setting
- **Export Inclusion**: All custom fields are included in exports regardless of visibility setting
- **Default Behavior**: New custom fields are visible by default (showOnMainPage = true)

### Use Cases

1. **Declutter Main View**: Hide rarely-used fields from the main table to improve readability
2. **Focus on Key Data**: Show only the most important fields for quick scanning
3. **Flexible Data Collection**: Collect detailed information without overwhelming the main interface
4. **Role-Based Views**: Different teams can focus on different fields

## Database Schema

### Custom Fields Collection

The `custom_fields` collection includes a `showOnMainPage` boolean attribute:

```typescript
interface CustomField {
  $id: string;
  eventSettingsId: string;
  fieldName: string;
  internalFieldName: string;
  fieldType: string;
  fieldOptions: string | null;
  required: boolean;
  order: number;
  showOnMainPage: boolean;  // NEW: Controls visibility on main page
  version: number;
  deletedAt: string | null;
  $createdAt: string;
  $updatedAt: string;
}
```

### Default Values

- **New Fields**: `showOnMainPage = true` (visible by default)
- **Existing Fields**: `showOnMainPage = undefined` → treated as `true` (backward compatibility)
- **Hidden Fields**: `showOnMainPage = false` (explicitly hidden)

## API Endpoints

### Create Custom Field

**Endpoint**: `POST /api/custom-fields`

**Request Body**:
```json
{
  "eventSettingsId": "event123",
  "fieldName": "Company Name",
  "fieldType": "text",
  "required": false,
  "order": 3,
  "showOnMainPage": true  // Optional, defaults to true
}
```

**Response**:
```json
{
  "$id": "field123",
  "eventSettingsId": "event123",
  "fieldName": "Company Name",
  "internalFieldName": "company_name",
  "fieldType": "text",
  "required": false,
  "order": 3,
  "showOnMainPage": true,
  "version": 0,
  "$createdAt": "2024-01-15T10:00:00.000Z"
}
```

### Update Custom Field

**Endpoint**: `PUT /api/custom-fields/[id]`

**Request Body**:
```json
{
  "fieldName": "Company Name",
  "fieldType": "text",
  "required": false,
  "order": 3,
  "version": 0,
  "showOnMainPage": false  // Toggle visibility
}
```

**Response**:
```json
{
  "$id": "field123",
  "fieldName": "Company Name",
  "showOnMainPage": false,
  "version": 1,
  "$updatedAt": "2024-01-15T11:00:00.000Z"
}
```

### Get Attendees (with Visibility Filtering)

**Endpoint**: `GET /api/attendees`

**Behavior**:
- Returns only custom field values for visible fields (showOnMainPage !== false)
- Hidden field values are excluded from the response
- Reduces payload size and improves performance

**Response**:
```json
[
  {
    "id": "attendee123",
    "firstName": "John",
    "lastName": "Doe",
    "barcodeNumber": "ABC123",
    "customFieldValues": [
      {
        "customFieldId": "field123",
        "value": "Acme Corp"
      }
      // Hidden fields are NOT included
    ]
  }
]
```

## UI Components

### EventSettingsForm - Visibility Toggle

The Event Settings Form includes a visibility toggle for each custom field:

```tsx
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label htmlFor="showOnMainPage">Show on Main Page</Label>
    <div className="text-sm text-muted-foreground">
      Display this field as a column in the attendees table
    </div>
  </div>
  <Switch
    id="showOnMainPage"
    checked={editingField.showOnMainPage !== false}
    onCheckedChange={(checked) =>
      setEditingField({ ...editingField, showOnMainPage: checked })
    }
  />
</div>
```

**Features**:
- Clear label and description
- Switch component for easy toggling
- Defaults to checked (visible) for new fields
- Updates immediately when toggled

### Dashboard - Visibility Indicator

Custom fields in the list show a visibility badge:

```tsx
{field.showOnMainPage !== false && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="text-xs">
          <Eye className="h-3 w-3 mr-1" />
          Visible
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>This field is visible on the main attendees page</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

**Features**:
- Eye icon for visual recognition
- Tooltip explains what "Visible" means
- Only shown for visible fields

### Dashboard - Filtered Table Columns

The attendees table dynamically renders columns based on visibility:

```tsx
// Filter visible fields
const visibleCustomFields = useMemo(() => 
  eventSettings?.customFields?.filter(
    (field: any) => field.showOnMainPage !== false
  ) || [],
  [eventSettings?.customFields]
);

// Render table headers
{visibleCustomFields.map((field: any) => (
  <TableHead key={field.id}>{field.fieldName}</TableHead>
))}

// Render table cells
{visibleCustomFields.map((field: any) => {
  const fieldValue = attendee.customFieldValues?.find(
    (cfv: any) => cfv.customFieldId === field.id
  );
  return (
    <TableCell key={field.id}>
      {fieldValue?.value || '-'}
    </TableCell>
  );
})}
```

**Features**:
- Performance optimized with useMemo
- Dynamic column rendering
- Handles missing values gracefully

## Default Fields

### Credential Type

**Properties**:
- Field Name: "Credential Type"
- Internal Name: "credential_type"
- Field Type: "select"
- Options: Empty (to be configured by admin)
- Required: false
- Order: 1
- Show on Main Page: true

**Purpose**: Categorize attendees (VIP, Staff, Press, General Admission, etc.)

### Notes

**Properties**:
- Field Name: "Notes"
- Internal Name: "notes"
- Field Type: "textarea"
- Options: null
- Required: false
- Order: 2
- Show on Main Page: true

**Purpose**: Capture additional attendee information (special requirements, dietary restrictions, etc.)

## Visibility Logic

### Decision Tree

```
Is showOnMainPage defined?
├─ Yes
│  ├─ Is it true? → VISIBLE
│  └─ Is it false? → HIDDEN
└─ No (undefined/null) → VISIBLE (backward compatibility)
```

### Code Implementation

```typescript
// API filtering
const visibleFieldIds = new Set(
  customFieldsResult.documents
    .filter((field: any) => field.showOnMainPage !== false)
    .map((field: any) => field.$id)
);

// UI filtering
const visibleCustomFields = useMemo(() => 
  eventSettings?.customFields?.filter(
    (field: any) => field.showOnMainPage !== false
  ) || [],
  [eventSettings?.customFields]
);
```

## Backward Compatibility

### Existing Fields

Fields created before this feature was implemented:
- Do NOT have the `showOnMainPage` attribute
- Are treated as visible (showOnMainPage !== false evaluates to true)
- Continue to appear in the main table
- Can be hidden by explicitly setting showOnMainPage = false

### Migration

No migration is required:
- New attribute has a default value (true)
- Existing fields without the attribute are treated as visible
- No breaking changes to existing functionality

## Performance Considerations

### API Level

**Optimization**: Filter custom field values before sending to client
- Reduces payload size
- Improves network performance
- Faster page loads

**Implementation**:
```typescript
// Only include visible field values in response
parsedCustomFieldValues = Object.entries(parsed)
  .filter(([customFieldId]) => visibleFieldIds.has(customFieldId))
  .map(([customFieldId, value]) => ({
    customFieldId,
    value: String(value)
  }));
```

### UI Level

**Optimization**: Use useMemo to prevent unnecessary recalculations
- Only recalculates when custom fields change
- Efficient for large numbers of fields
- Improves rendering performance

**Implementation**:
```typescript
const visibleCustomFields = useMemo(() => 
  eventSettings?.customFields?.filter(
    (field: any) => field.showOnMainPage !== false
  ) || [],
  [eventSettings?.customFields]
);
```

## Error Handling

### Validation

**Type Validation**:
```typescript
if (showOnMainPage !== undefined && typeof showOnMainPage !== 'boolean') {
  return res.status(400).json({
    error: 'Invalid showOnMainPage value',
    details: 'showOnMainPage must be a boolean value'
  });
}
```

**Error Response**:
```json
{
  "error": "Invalid showOnMainPage value",
  "details": "showOnMainPage must be a boolean value"
}
```

### Graceful Degradation

If visibility filtering fails:
- API falls back to returning all fields
- UI shows all fields in table
- No data loss or application errors
- Error is logged for debugging

## Testing

### Unit Tests

Test visibility filtering logic:
```typescript
describe('Custom Field Visibility', () => {
  it('should include fields with showOnMainPage = true', () => {
    const fields = [
      { id: '1', showOnMainPage: true },
      { id: '2', showOnMainPage: false }
    ];
    const visible = fields.filter(f => f.showOnMainPage !== false);
    expect(visible).toHaveLength(1);
  });

  it('should include fields with showOnMainPage = undefined', () => {
    const fields = [
      { id: '1', showOnMainPage: undefined },
      { id: '2', showOnMainPage: false }
    ];
    const visible = fields.filter(f => f.showOnMainPage !== false);
    expect(visible).toHaveLength(1);
  });
});
```

### Integration Tests

Test end-to-end visibility control:
1. Create custom field with showOnMainPage = true
2. Verify field appears in attendees table
3. Update field to showOnMainPage = false
4. Verify field is hidden from attendees table
5. Verify field still appears in edit form

### Manual Testing

1. **Create Event**: Verify default fields (Credential Type, Notes) are visible
2. **Add Custom Field**: Verify new field is visible by default
3. **Toggle Visibility**: Verify field appears/disappears from table
4. **Edit Attendee**: Verify all fields appear in form
5. **Export Data**: Verify all fields included in export

## Best Practices

### When to Hide Fields

**Good Candidates for Hiding**:
- Rarely accessed fields
- Internal tracking fields
- Detailed notes or comments
- Technical identifiers
- Fields used only for specific workflows

**Keep Visible**:
- Frequently accessed information
- Key identifying information
- Status indicators
- Fields used for sorting/filtering

### Field Organization

1. **Order Matters**: Place most important fields first (lower order numbers)
2. **Group Related Fields**: Keep related fields together in order
3. **Visibility Strategy**: Hide detailed fields, show summary fields
4. **User Feedback**: Ask users which fields they need to see

### Performance Tips

1. **Limit Visible Fields**: Keep visible fields to 5-10 for best table performance
2. **Use Appropriate Types**: Choose field types that display well in tables
3. **Consider Mobile**: Fewer visible fields work better on mobile devices
4. **Monitor Payload**: Check network tab to ensure reasonable response sizes

## Troubleshooting

### Field Not Appearing in Table

**Check**:
1. Is showOnMainPage set to false?
2. Is the field soft-deleted (deletedAt is not null)?
3. Is the field properly saved in the database?
4. Are there any console errors?

**Solution**: Toggle visibility in Event Settings

### Field Appearing When It Shouldn't

**Check**:
1. Is showOnMainPage explicitly set to false?
2. Is the cache stale? (Refresh the page)
3. Is there a version mismatch?

**Solution**: Explicitly set showOnMainPage = false and save

### All Fields Hidden

**Check**:
1. Are all fields set to showOnMainPage = false?
2. Is eventSettings loading correctly?
3. Are there any API errors?

**Solution**: Set at least one field to visible

## Related Documentation

- [Custom Fields API Guide](./CUSTOM_FIELDS_API_GUIDE.md)
- [Event Settings Guide](./EVENT_SETTINGS_GUIDE.md)
- [Attendee Management Guide](./ATTENDEE_MANAGEMENT_GUIDE.md)
- [Migration Guide](../migration/CUSTOM_FIELDS_VISIBILITY_MIGRATION.md)

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial implementation of visibility control
- Added showOnMainPage attribute to custom_fields collection
- Implemented API filtering for visible fields
- Added UI toggle in Event Settings Form
- Added visibility indicator in custom fields list
- Implemented dynamic table columns in Dashboard
- Created default fields (Credential Type, Notes)

