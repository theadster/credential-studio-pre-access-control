# Design Document

## Overview

This design document outlines the implementation approach for adding Notes search functionality to the advanced search feature in the attendees dashboard. The implementation will follow the existing patterns established for other text-based search fields (First Name, Last Name, Barcode) to ensure consistency and maintainability.

The Notes search will be integrated into the existing advanced search state management system and will use the same filtering logic patterns already established in the codebase.

## Architecture

### Component Structure

The Notes search feature will be implemented entirely within the existing `dashboard.tsx` component, following the established patterns for advanced search fields. No new components are required.

**Affected Component:**
- `src/pages/dashboard.tsx` - Main dashboard component containing the advanced search functionality

### State Management

The Notes search will integrate with the existing `advancedSearchFilters` state object, which already manages search criteria for multiple fields.

**Current State Structure:**
```typescript
const [advancedSearchFilters, setAdvancedSearchFilters] = useState<{
  firstName: { value: string; operator: string };
  lastName: { value: string; operator: string };
  barcode: { value: string; operator: string };
  photoFilter: 'all' | 'with' | 'without';
  customFields: { [key: string]: { value: string; operator: string } };
}>({
  firstName: { value: '', operator: 'contains' },
  lastName: { value: '', operator: 'contains' },
  barcode: { value: '', operator: 'contains' },
  photoFilter: 'all',
  customFields: {}
});
```

**Updated State Structure:**
```typescript
const [advancedSearchFilters, setAdvancedSearchFilters] = useState<{
  firstName: { value: string; operator: string };
  lastName: { value: string; operator: string };
  barcode: { value: string; operator: string };
  notes: { value: string; operator: string; hasNotes: boolean }; // NEW
  photoFilter: 'all' | 'with' | 'without';
  customFields: { [key: string]: { value: string; operator: string } };
}>({
  firstName: { value: '', operator: 'contains' },
  lastName: { value: '', operator: 'contains' },
  barcode: { value: '', operator: 'contains' },
  notes: { value: '', operator: 'contains', hasNotes: false }, // NEW
  photoFilter: 'all',
  customFields: {}
});
```

### Data Flow

1. **User Input** → User types in Notes search field or checks "Has Notes" checkbox
2. **State Update** → `handleAdvancedSearchChange` updates `advancedSearchFilters.notes`
3. **Filtering** → `filteredAttendees` computation applies Notes filter using `applyTextFilter` helper
4. **Re-render** → Component re-renders with filtered attendee list
5. **Pagination Reset** → Current page resets to 1 when filters change

## Components and Interfaces

### TypeScript Interfaces

**Attendee Interface (Existing):**
```typescript
interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  notes?: string; // Already exists
  photoUrl: string | null;
  credentialUrl?: string | null;
  credentialGeneratedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customFieldValues: CustomFieldValue[];
  [key: string]: unknown;
}
```

No changes needed to the Attendee interface as the `notes` field already exists.

### Filter Logic Implementation

The Notes search will use the existing `applyTextFilter` helper function that is already implemented in the `filteredAttendees` computation. This function handles all text-based operators:

**Existing Helper Function:**
```typescript
const applyTextFilter = (value: string, filter: { value: string; operator: string }) => {
  const { value: filterValue, operator } = filter;
  const lowerCaseValue = (value || '').toLowerCase();
  const lowerCaseFilterValue = (filterValue || '').toLowerCase();

  if (operator !== 'isEmpty' && operator !== 'isNotEmpty' && !filterValue) {
    return true; // No filter value provided for operators that need it
  }

  switch (operator) {
    case 'isEmpty':
      return !value;
    case 'isNotEmpty':
      return !!value;
    case 'contains':
      return lowerCaseValue.includes(lowerCaseFilterValue);
    case 'equals':
      return lowerCaseValue === lowerCaseFilterValue;
    case 'startsWith':
      return lowerCaseValue.startsWith(lowerCaseFilterValue);
    case 'endsWith':
      return lowerCaseValue.endsWith(lowerCaseFilterValue);
    default:
      return true;
  }
};
```

This function will be reused for Notes filtering without modification.

### Filtering Integration

The Notes filter will be added to the existing `filteredAttendees` computation:

**Current Filtering Logic (Simplified):**
```typescript
const filteredAttendees = attendees.filter(attendee => {
  if (showAdvancedSearch) {
    const firstNameMatch = applyTextFilter(attendee.firstName, advancedSearchFilters.firstName);
    const lastNameMatch = applyTextFilter(attendee.lastName, advancedSearchFilters.lastName);
    const barcodeMatch = applyTextFilter(attendee.barcodeNumber, advancedSearchFilters.barcode);
    const photoMatch = /* photo filter logic */;
    const customFieldsMatch = /* custom fields logic */;
    
    return firstNameMatch && lastNameMatch && barcodeMatch && photoMatch && customFieldsMatch;
  }
  // ... basic search logic
});
```

**Updated Filtering Logic:**
```typescript
const filteredAttendees = attendees.filter(attendee => {
  if (showAdvancedSearch) {
    const firstNameMatch = applyTextFilter(attendee.firstName, advancedSearchFilters.firstName);
    const lastNameMatch = applyTextFilter(attendee.lastName, advancedSearchFilters.lastName);
    const barcodeMatch = applyTextFilter(attendee.barcodeNumber, advancedSearchFilters.barcode);
    
    // NEW: Notes filtering
    const notesMatch = applyTextFilter(attendee.notes || '', advancedSearchFilters.notes);
    const hasNotesMatch = !advancedSearchFilters.notes.hasNotes || 
                          (attendee.notes && attendee.notes.trim().length > 0);
    const notesFilterMatch = notesMatch && hasNotesMatch;
    
    const photoMatch = /* photo filter logic */;
    const customFieldsMatch = /* custom fields logic */;
    
    return firstNameMatch && lastNameMatch && barcodeMatch && 
           notesFilterMatch && photoMatch && customFieldsMatch;
  }
  // ... basic search logic
});
```

## Data Models

No database schema changes are required. The `notes` field already exists in the Attendee model as an optional string field.

**Existing Attendee Schema (Appwrite):**
- `notes` (string, optional) - Already exists in the database

## UI Components

### Notes Search Field Layout

The Notes search field will be added to the Advanced Search dialog grid, positioned after the Photo Status field. The dialog uses a responsive grid layout:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Existing fields: First Name, Last Name, Barcode */}
  
  {/* Photo Status field */}
  <div className="space-y-2">
    <Label htmlFor="photoFilter" className="flex items-center space-x-2">
      <Image className="h-4 w-4 text-muted-foreground" />
      <span>Photo Status</span>
    </Label>
    <Select /* ... */ />
  </div>
  
  {/* NEW: Notes search field */}
  <div className="space-y-2">
    <Label htmlFor="notes" className="flex items-center space-x-2">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <span>Notes</span>
    </Label>
    <div className="space-y-2">
      <div className="flex space-x-2">
        <Select /* operator dropdown */ />
        <Input /* search text input */ />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox /* "Has Notes" checkbox */ />
        <Label>Has Notes</Label>
      </div>
    </div>
  </div>
  
  {/* Custom fields continue below */}
</div>
```

### Visual Design Specifications

**Icon:** `FileText` from lucide-react (consistent with notes/text content)

**Field Structure:**
1. Label with icon (FileText)
2. Operator dropdown (120px width, same as other text fields)
3. Text input (flexible width, fills remaining space)
4. Checkbox with label below the input field

**Styling:**
- Follows existing shadcn/ui component styling
- Uses `space-y-2` for vertical spacing between elements
- Uses `flex space-x-2` for horizontal layout of operator and input
- Checkbox uses `flex items-center space-x-2` for alignment with label

**Responsive Behavior:**
- On mobile (< 768px): Single column, full width
- On tablet (768px - 1024px): 2 columns
- On desktop (> 1024px): 3 columns

### Operator Dropdown Options

The operator dropdown will include the same options as other text fields:

1. **Contains** (default) - Case-insensitive substring match
2. **Equals** - Exact match (case-insensitive)
3. **Starts With** - Matches beginning of notes
4. **Ends With** - Matches end of notes
5. **Is Empty** - Notes field is null or empty string
6. **Is Not Empty** - Notes field has content

**Behavior:**
- When "Is Empty" or "Is Not Empty" is selected, the text input is disabled
- When "Has Notes" checkbox is checked with "Is Empty" operator, the checkbox takes precedence
- Default operator is "Contains" for intuitive searching

### "Has Notes" Checkbox

**Purpose:** Provides a quick way to filter for attendees who have any notes content, without requiring text input.

**Behavior:**
- Unchecked (default): No additional filtering based on notes presence
- Checked: Only show attendees with non-empty notes
- Works in combination with text search (AND logic)
- Disabled when operator is "Is Empty" or "Is Not Empty" (redundant)

**Implementation:**
```tsx
<div className="flex items-center space-x-2">
  <Checkbox
    id="hasNotes"
    checked={advancedSearchFilters.notes.hasNotes}
    onCheckedChange={(checked) => {
      setAdvancedSearchFilters(prev => ({
        ...prev,
        notes: {
          ...prev.notes,
          hasNotes: checked as boolean
        }
      }));
    }}
    disabled={['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.notes.operator)}
  />
  <Label 
    htmlFor="hasNotes" 
    className="text-sm font-normal cursor-pointer"
  >
    Has Notes
  </Label>
</div>
```

## State Management Functions

### Handler Functions

**1. handleAdvancedSearchChange (Update Existing)**

This function already handles First Name, Last Name, Barcode, and Photo Filter. It needs to be extended to handle Notes:

```typescript
const handleAdvancedSearchChange = (
  field: 'firstName' | 'lastName' | 'barcode' | 'notes' | 'photoFilter', // Add 'notes'
  value: string,
  property: 'value' | 'operator' = 'value'
) => {
  setAdvancedSearchFilters(prev => {
    if (field === 'photoFilter') {
      return { ...prev, photoFilter: value as 'all' | 'with' | 'without' };
    }

    const newFieldState = {
      ...prev[field],
      [property]: value,
    };

    // Clear value when operator doesn't need it
    if (property === 'operator' && ['isEmpty', 'isNotEmpty'].includes(value)) {
      newFieldState.value = '';
    }

    return {
      ...prev,
      [field]: newFieldState,
    };
  });
};
```

**2. handleNotesHasNotesChange (New)**

A dedicated handler for the "Has Notes" checkbox:

```typescript
const handleNotesHasNotesChange = (checked: boolean) => {
  setAdvancedSearchFilters(prev => ({
    ...prev,
    notes: {
      ...prev.notes,
      hasNotes: checked
    }
  }));
};
```

**3. clearAdvancedSearch (Update Existing)**

This function needs to include Notes in the reset:

```typescript
const clearAdvancedSearch = () => {
  const customFields: { [key: string]: { value: string; operator: string } } = {};
  eventSettings?.customFields?.forEach((field: any) => {
    customFields[field.id] = { value: '', operator: 'contains' };
  });
  setAdvancedSearchFilters({
    firstName: { value: '', operator: 'contains' },
    lastName: { value: '', operator: 'contains' },
    barcode: { value: '', operator: 'contains' },
    notes: { value: '', operator: 'contains', hasNotes: false }, // NEW
    photoFilter: 'all',
    customFields
  });
};
```

**4. hasAdvancedFilters (Update Existing)**

This function checks if any advanced filters are active. It needs to include Notes:

```typescript
const hasAdvancedFilters = () => {
  return advancedSearchFilters.firstName.value || 
         ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.firstName.operator) ||
         advancedSearchFilters.lastName.value || 
         ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.lastName.operator) ||
         advancedSearchFilters.barcode.value || 
         ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.barcode.operator) ||
         advancedSearchFilters.notes.value ||  // NEW
         ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.notes.operator) || // NEW
         advancedSearchFilters.notes.hasNotes || // NEW
         advancedSearchFilters.photoFilter !== 'all' ||
         Object.values(advancedSearchFilters.customFields).some(
           field => field.value || field.operator === 'isEmpty' || field.operator === 'isNotEmpty'
         );
};
```

**5. handleAdvancedSearchToggle (Update Existing)**

Initialize Notes field when opening advanced search:

```typescript
const handleAdvancedSearchToggle = () => {
  setShowAdvancedSearch(!showAdvancedSearch);
  if (!showAdvancedSearch) {
    const customFields: { [key: string]: { value: string; operator: string } } = {};
    eventSettings?.customFields?.forEach((field: any) => {
      customFields[field.id] = { value: '', operator: 'contains' };
    });
    setAdvancedSearchFilters({
      firstName: { value: '', operator: 'contains' },
      lastName: { value: '', operator: 'contains' },
      barcode: { value: '', operator: 'contains' },
      notes: { value: '', operator: 'contains', hasNotes: false }, // NEW
      photoFilter: 'all',
      customFields
    });
  }
};
```

## Error Handling

### Null/Undefined Notes Handling

The filtering logic must safely handle cases where `attendee.notes` is `null` or `undefined`:

```typescript
// Safe access with fallback to empty string
const notesMatch = applyTextFilter(attendee.notes || '', advancedSearchFilters.notes);

// Safe check for "Has Notes" checkbox
const hasNotesMatch = !advancedSearchFilters.notes.hasNotes || 
                      (attendee.notes && attendee.notes.trim().length > 0);
```

### Edge Cases

1. **Whitespace-only notes:** Treated as having content (not empty)
   - `attendee.notes.trim().length > 0` ensures whitespace-only is considered empty for "Has Notes"

2. **Empty string vs null:** Both treated as empty
   - `attendee.notes || ''` normalizes both to empty string

3. **Case sensitivity:** All text searches are case-insensitive
   - Handled by `applyTextFilter` which converts to lowercase

4. **Special characters:** No escaping needed, simple string comparison
   - JavaScript string methods handle special characters correctly

## Testing Strategy

### Unit Testing Approach

While this spec focuses on implementation, the following areas should be tested:

1. **Filter Logic Testing:**
   - Test `applyTextFilter` with notes field for all operators
   - Test "Has Notes" checkbox logic
   - Test combination of text search and "Has Notes" checkbox
   - Test null/undefined notes handling
   - Test empty string notes handling
   - Test whitespace-only notes handling

2. **State Management Testing:**
   - Test state updates when typing in Notes field
   - Test state updates when changing operator
   - Test state updates when toggling "Has Notes" checkbox
   - Test state reset when clearing filters
   - Test state initialization when opening advanced search

3. **Integration Testing:**
   - Test Notes filter with other advanced filters (AND logic)
   - Test pagination reset when Notes filter changes
   - Test "Advanced filters active" badge with Notes filter
   - Test "Clear All" button with Notes filter

### Manual Testing Checklist

1. **Basic Functionality:**
   - [ ] Notes field appears after Photo Status in advanced search
   - [ ] Typing in Notes field filters attendees correctly
   - [ ] Operator dropdown changes filtering behavior
   - [ ] "Has Notes" checkbox filters correctly
   - [ ] Clear All button resets Notes filter

2. **Operator Testing:**
   - [ ] "Contains" operator works correctly
   - [ ] "Equals" operator works correctly
   - [ ] "Starts With" operator works correctly
   - [ ] "Ends With" operator works correctly
   - [ ] "Is Empty" operator works correctly and disables input
   - [ ] "Is Not Empty" operator works correctly and disables input

3. **Edge Cases:**
   - [ ] Attendees with null notes are handled correctly
   - [ ] Attendees with empty string notes are handled correctly
   - [ ] Attendees with whitespace-only notes are handled correctly
   - [ ] Case-insensitive search works correctly
   - [ ] Special characters in notes are handled correctly

4. **Integration:**
   - [ ] Notes filter works with other text filters
   - [ ] Notes filter works with photo filter
   - [ ] Notes filter works with custom field filters
   - [ ] Pagination resets when Notes filter changes
   - [ ] "Advanced filters active" badge shows when Notes filter is active

5. **UI/UX:**
   - [ ] Notes field has correct icon (FileText)
   - [ ] Notes field has correct styling
   - [ ] Operator dropdown has correct width (120px)
   - [ ] Input field has correct placeholder
   - [ ] "Has Notes" checkbox is properly aligned
   - [ ] Checkbox is disabled when operator is "Is Empty" or "Is Not Empty"
   - [ ] Responsive layout works on mobile, tablet, and desktop

## Performance Considerations

### Filtering Performance

The Notes filter uses the same `applyTextFilter` function as other text fields, which is already optimized:

1. **Early Return:** If no filter value is provided (and operator needs one), returns `true` immediately
2. **Case Conversion:** Converts to lowercase once per filter application
3. **Simple String Operations:** Uses native JavaScript string methods (includes, startsWith, endsWith)

### State Update Performance

1. **Minimal Re-renders:** State updates only trigger re-renders when filter values change
2. **Memoization:** The `filteredAttendees` computation is already optimized with proper dependencies
3. **Pagination:** Limits rendered attendees to 25 per page, preventing performance issues with large lists

### Memory Considerations

1. **No Additional Data Structures:** Uses existing attendee data without duplication
2. **Lightweight State:** Notes filter state is minimal (value, operator, hasNotes boolean)
3. **No Memory Leaks:** Uses React state management, automatically cleaned up on unmount

## Accessibility

### Keyboard Navigation

1. **Tab Order:** Notes field follows natural tab order after Photo Status
2. **Operator Dropdown:** Fully keyboard accessible (Space/Enter to open, Arrow keys to navigate)
3. **Text Input:** Standard input, fully keyboard accessible
4. **Checkbox:** Space to toggle, fully keyboard accessible

### Screen Reader Support

1. **Label Association:** Label properly associated with input using `htmlFor`
2. **Icon Semantics:** Icon is decorative, doesn't interfere with screen readers
3. **Checkbox Label:** Properly associated with checkbox for screen reader announcement
4. **Operator Dropdown:** Uses shadcn/ui Select component with built-in ARIA support

### Visual Accessibility

1. **Color Contrast:** Uses theme colors that meet WCAG AA standards
2. **Focus Indicators:** Visible focus rings on all interactive elements
3. **Disabled State:** Clear visual indication when input is disabled (opacity, cursor)
4. **Icon Size:** 16px (h-4 w-4) for clear visibility

## Security Considerations

### Input Sanitization

1. **No SQL Injection Risk:** Appwrite handles query sanitization
2. **No XSS Risk:** React automatically escapes rendered content
3. **No Special Character Issues:** JavaScript string methods handle all characters safely

### Data Privacy

1. **No Sensitive Data Exposure:** Notes are already visible to users with attendee read permissions
2. **Permission Checks:** Existing RBAC system controls access to attendees and their notes
3. **No Logging of Search Terms:** Search terms are not logged or stored

## Migration and Deployment

### No Database Migration Required

The `notes` field already exists in the Attendee schema. No database changes are needed.

### Deployment Steps

1. **Code Changes:** Update `src/pages/dashboard.tsx` with Notes search implementation
2. **Testing:** Perform manual testing checklist
3. **Deploy:** Standard deployment process (no special steps required)
4. **Verification:** Verify Notes search works in production environment

### Backward Compatibility

1. **Existing Data:** All existing attendees will work with Notes search
2. **Null Notes:** Attendees without notes will be handled correctly
3. **State Management:** New state fields have default values, won't break existing functionality
4. **UI Layout:** Responsive grid accommodates new field without breaking layout

## Future Enhancements

Potential future improvements (not in scope for this implementation):

1. **Regex Search:** Add regex operator for advanced pattern matching
2. **Full-Text Search:** Implement full-text search across all text fields
3. **Search History:** Save and recall previous search queries
4. **Saved Filters:** Allow users to save commonly used filter combinations
5. **Export Filtered Results:** Export only the filtered attendees
6. **Bulk Edit Filtered:** Apply bulk edits to filtered attendees only

## Conclusion

This design provides a comprehensive implementation plan for adding Notes search functionality to the advanced search feature. The implementation follows existing patterns in the codebase, ensuring consistency and maintainability. The design accounts for edge cases, performance, accessibility, and security considerations.

The Notes search will seamlessly integrate with the existing advanced search system, providing users with a powerful tool to find and filter attendees based on their notes content.
