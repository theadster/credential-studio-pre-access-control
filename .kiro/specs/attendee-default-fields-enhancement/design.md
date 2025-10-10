# Design Document

## Overview

This design document outlines the technical approach for enhancing the attendee data model with two new default fields (Credential Type and Notes) and implementing visibility control for custom fields on the main Attendees page.

The solution involves:
1. Database schema updates to add a `showOnMainPage` boolean attribute to the custom_fields collection
2. Event initialization logic to automatically create Credential Type and Notes fields
3. API modifications to handle visibility filtering when fetching attendees
4. UI updates to display visibility controls and respect visibility settings

## Architecture

### High-Level Flow

1. **Event Initialization**: When event settings are created, automatically create Credential Type and Notes custom fields
2. **Custom Field Management**: Administrators can edit these fields including visibility settings
3. **Attendees List View**: Dashboard queries only visible custom fields and displays them as columns
4. **Attendee Edit/Create**: Form displays all custom fields regardless of visibility setting

### Data Flow

```
Event Creation → Create Default Fields (Credential Type, Notes)
                ↓
Custom Fields Management → Edit Properties + Visibility Toggle
                ↓
Attendees Page Load → Fetch Visible Fields → Display Filtered Columns
                ↓
Attendee Edit Form → Show ALL Fields (ignore visibility)
```

## Components and Interfaces

### 1. Database Schema Changes

Add new attribute to `custom_fields` collection:

```typescript
showOnMainPage: boolean (default: true)
```

**Implementation in `scripts/setup-appwrite.ts`**:

```typescript
await databases.createBooleanAttribute(
  databaseId, 
  COLLECTIONS.CUSTOM_FIELDS, 
  'showOnMainPage', 
  false,  // not required
  true    // default value = true (visible)
);
```

### 2. Event Settings Initialization

**Location**: `src/pages/api/event-settings/index.ts`

Create new function to generate default custom fields:

```typescript
async function createDefaultCustomFields(
  databases: any,
  dbId: string,
  customFieldsCollectionId: string,
  eventSettingsId: string
): Promise<void> {
  // Create Credential Type field
  await databases.createDocument(
    dbId,
    customFieldsCollectionId,
    ID.unique(),
    {
      eventSettingsId,
      fieldName: 'Credential Type',
      internalFieldName: 'credential_type',
      fieldType: 'select',
      fieldOptions: JSON.stringify({ options: [] }),
      required: false,
      order: 1,
      showOnMainPage: true,
      version: 0
    }
  );

  // Create Notes field
  await databases.createDocument(
    dbId,
    customFieldsCollectionId,
    ID.unique(),
    {
      eventSettingsId,
      fieldName: 'Notes',
      internalFieldName: 'notes',
      fieldType: 'textarea',
      fieldOptions: null,
      required: false,
      order: 2,
      showOnMainPage: true,
      version: 0
    }
  );
}
```

Call this function after creating event settings in POST handler.

### 3. Custom Fields API Updates

**Location**: `src/pages/api/custom-fields/index.ts`

POST endpoint - set default showOnMainPage:
```typescript
const newCustomField = await databases.createDocument(
  dbId,
  customFieldsCollectionId,
  ID.unique(),
  {
    // ... existing fields
    showOnMainPage: true, // NEW: Default to visible
    version: 0
  }
);
```

**Location**: `src/pages/api/custom-fields/[id].ts`

PUT endpoint - allow updating showOnMainPage:
```typescript
const { showOnMainPage } = req.body;

const updatedField = await databases.updateDocument({
  // ... existing params
  data: {
    // ... existing fields
    showOnMainPage: showOnMainPage !== undefined ? showOnMainPage : true,
    version: currentVersion + 1
  }
});
```

### 4. Attendees API Updates

**Location**: `src/pages/api/attendees/index.ts`

Add filtering logic in GET endpoint:

```typescript
// Fetch custom fields to determine visibility
const customFieldsResult = await databases.listDocuments(
  dbId,
  customFieldsCollectionId,
  [Query.isNull('deletedAt'), Query.orderAsc('order'), Query.limit(100)]
);

// Create set of visible field IDs (for main page view)
const visibleFieldIds = new Set(
  customFieldsResult.documents
    .filter((field: any) => field.showOnMainPage !== false)
    .map((field: any) => field.$id)
);

// Filter custom field values when mapping attendees
const attendees = attendeesResult.documents.map((attendee: any) => {
  let parsedCustomFieldValues = [];
  if (attendee.customFieldValues) {
    const parsed = JSON.parse(attendee.customFieldValues);
    parsedCustomFieldValues = Object.entries(parsed)
      .filter(([customFieldId]) => visibleFieldIds.has(customFieldId))
      .map(([customFieldId, value]) => ({
        customFieldId,
        value: String(value)
      }));
  }
  return { ...attendee, customFieldValues: parsedCustomFieldValues };
});
```

### 5. UI Component Updates

**Location**: `src/components/EventSettingsForm.tsx`

Add showOnMainPage to CustomField interface:
```typescript
interface CustomField {
  // ... existing fields
  showOnMainPage?: boolean;
}
```

Add visibility toggle in custom field editor:
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

Add visibility indicator in fields list:
```tsx
{field.showOnMainPage !== false && (
  <Badge variant="outline" className="text-xs">
    <Eye className="h-3 w-3 mr-1" />
    Visible
  </Badge>
)}
```

**Location**: `src/pages/dashboard.tsx`

Filter visible custom fields:
```typescript
const visibleCustomFields = eventSettings?.customFields?.filter(
  (field: any) => field.showOnMainPage !== false
) || [];
```

Update table headers to only show visible fields:
```tsx
{visibleCustomFields.map((field: any) => (
  <TableHead key={field.id}>{field.fieldName}</TableHead>
))}
```

Update table rows to only show visible field values:
```tsx
{visibleCustomFields.map((field: any) => {
  const fieldValue = attendee.customFieldValues?.find(
    (cfv: any) => cfv.customFieldId === field.id
  );
  return <TableCell key={field.id}>{fieldValue?.value || '-'}</TableCell>;
})}
```

**Location**: `src/components/AttendeeForm.tsx`

No changes needed - form already displays all custom fields.

## Data Models

### Custom Field Model (Updated)

```typescript
interface CustomField {
  id: string;
  eventSettingsId: string;
  fieldName: string;
  internalFieldName: string;
  fieldType: string;
  fieldOptions: string | null;
  required: boolean;
  order: number;
  showOnMainPage: boolean;  // NEW
  version: number;
  deletedAt: string | null;
  $createdAt: string;
  $updatedAt: string;
}
```

### Default Fields Configuration

```typescript
const DEFAULT_FIELDS = [
  {
    fieldName: 'Credential Type',
    internalFieldName: 'credential_type',
    fieldType: 'select',
    fieldOptions: { options: [] },
    required: false,
    order: 1,
    showOnMainPage: true
  },
  {
    fieldName: 'Notes',
    internalFieldName: 'notes',
    fieldType: 'textarea',
    fieldOptions: null,
    required: false,
    order: 2,
    showOnMainPage: true
  }
];
```

## Error Handling

### Event Initialization Errors
If default fields fail to create, log error but don't fail event settings creation.

### Visibility Toggle Errors
Display toast notification and revert toggle state on failure.

### Missing Attribute Handling
Default to visible if showOnMainPage attribute is missing:
```typescript
const isVisible = field.showOnMainPage !== false;
```

## Testing Strategy

### Unit Tests

1. **Default Fields Creation** (`src/pages/api/event-settings/__tests__/`)
   - Verify fields created on event initialization
   - Verify correct properties and order

2. **Visibility Control** (`src/pages/api/custom-fields/__tests__/`)
   - Test showOnMainPage defaults to true
   - Test updating visibility via PUT

3. **Visibility Filtering** (`src/pages/api/attendees/__tests__/`)
   - Test filtering by visibility
   - Test missing attribute defaults to visible

### Integration Tests

Test complete workflow:
1. Create event settings
2. Verify default fields exist
3. Add options to Credential Type
4. Create attendee with field values
5. Toggle visibility
6. Verify table display changes
7. Verify edit form shows all fields

### Manual Testing

- Create event and verify default fields
- Edit Credential Type options
- Create attendee with both fields
- Toggle visibility and verify table updates
- Verify edit form always shows all fields
- Delete default field and verify removal

## Performance Considerations

### Database Optimization
Add index on showOnMainPage:
```typescript
await databases.createIndex(
  databaseId, 
  COLLECTIONS.CUSTOM_FIELDS, 
  'showOnMainPage_idx', 
  IndexType.Key, 
  ['showOnMainPage']
);
```

### Frontend Optimization
Memoize visible fields calculation:
```typescript
const visibleCustomFields = useMemo(() => 
  eventSettings?.customFields?.filter(
    (field: any) => field.showOnMainPage !== false
  ) || [],
  [eventSettings?.customFields]
);
```

## Security Considerations

All operations respect existing RBAC permissions:
- Read: `customFields.read` or `all`
- Create: `customFields.create` or `all`
- Update: `customFields.update` or `all`
- Delete: `customFields.delete` or `all`

Validate showOnMainPage is boolean type in API endpoints.

## Rollout Plan

### Phase 1: Database Schema
- Add showOnMainPage attribute
- Verify creation

### Phase 2: Backend Implementation
- Implement default fields creation
- Update API endpoints
- Write unit tests

### Phase 3: Frontend Implementation
- Update EventSettingsForm
- Update Dashboard
- Write integration tests

### Phase 4: Testing & QA
- Manual testing
- Performance testing
- Cross-browser testing

### Phase 5: Deployment
- Deploy to staging
- Final QA
- Deploy to production

## Future Enhancements

1. Bulk visibility toggle for multiple fields
2. Field groups with shared visibility
3. User-specific column preferences
4. Drag-and-drop column reordering
5. Conditional visibility based on field values
