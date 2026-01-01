# Multi-Select Filter - Quick Porting Guide

## Overview
Quick reference for porting the multi-select dropdown filter feature to other branches.

## Files to Copy

### 1. New Component File
```bash
# Copy the multi-select component
cp src/components/ui/multi-select.tsx <target-branch>/src/components/ui/multi-select.tsx
```

**Component Features:**
- Compact display showing "X options selected" (no badge overflow)
- Checkbox-style selection interface
- Searchable dropdown with scroll area
- Selection counter and "Clear all" button
- Matches existing design system
- Full keyboard and accessibility support

## Code Changes Required

### 1. Dashboard State Type (src/pages/dashboard.tsx)

**Find this:**
```typescript
customFields: { [key: string]: { value: string; operator: string } };
```

**Replace with:**
```typescript
customFields: { [key: string]: { value: string | string[]; operator: string } };
```

---

### 2. Import Statement (src/pages/dashboard.tsx)

**Find this:**
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
```

**Replace with:**
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
```

---

### 3. Handler Function Signature (src/pages/dashboard.tsx)

**Find this:**
```typescript
const handleCustomFieldSearchChange = (fieldId: string, value: string, operator?: string) => {
```

**Replace with:**
```typescript
const handleCustomFieldSearchChange = (fieldId: string, value: string | string[], operator?: string) => {
```

---

### 4. Filtering Logic (src/pages/dashboard.tsx)

**Find this section in the `filteredAttendees` useMemo:**
```typescript
// If no operator or value (for operators that need it), match all
if (!filter.operator || (filter.operator !== 'isEmpty' && filter.operator !== 'isNotEmpty' && !filter.value)) {
  return true;
}

switch (filter.operator) {
  case 'isEmpty':
    return !hasValue;
  case 'isNotEmpty':
    return hasValue;
  case 'contains':
    return hasValue && attendeeValue.toLowerCase().includes(filter.value.toLowerCase());
  case 'equals':
    return hasValue && attendeeValue.toLowerCase() === filter.value.toLowerCase();
  case 'startsWith':
    return hasValue && attendeeValue.toLowerCase().startsWith(filter.value.toLowerCase());
  case 'endsWith':
    return hasValue && attendeeValue.toLowerCase().endsWith(filter.value.toLowerCase());
  default:
    // For select and boolean, it's an equals check
    return hasValue && attendeeValue.toLowerCase() === filter.value.toLowerCase();
}
```

**Replace with:**
```typescript
// If no operator or value (for operators that need it), match all
if (!filter.operator || (filter.operator !== 'isEmpty' && filter.operator !== 'isNotEmpty' && !filter.value)) {
  return true;
}

// Handle multi-select for dropdown fields (when filter.value is an array)
if (Array.isArray(filter.value)) {
  if (filter.value.length === 0) {
    return true; // No filter applied
  }
  // Check if attendee value matches ANY of the selected options (OR logic)
  return filter.value.some(filterVal => 
    hasValue && attendeeValue.toLowerCase() === filterVal.toLowerCase()
  );
}

// Handle single value filters
const filterValue = typeof filter.value === 'string' ? filter.value : '';

switch (filter.operator) {
  case 'isEmpty':
    return !hasValue;
  case 'isNotEmpty':
    return hasValue;
  case 'contains':
    return hasValue && attendeeValue.toLowerCase().includes(filterValue.toLowerCase());
  case 'equals':
    return hasValue && attendeeValue.toLowerCase() === filterValue.toLowerCase();
  case 'startsWith':
    return hasValue && attendeeValue.toLowerCase().startsWith(filterValue.toLowerCase());
  case 'endsWith':
    return hasValue && attendeeValue.toLowerCase().endsWith(filterValue.toLowerCase());
  default:
    // For select and boolean, it's an equals check
    return hasValue && attendeeValue.toLowerCase() === filterValue.toLowerCase();
}
```

---

### 5. hasAdvancedFilters Function (src/pages/dashboard.tsx)

**Find this:**
```typescript
Object.values(advancedSearchFilters.customFields).some(field => field.value || field.operator === 'isEmpty' || field.operator === 'isNotEmpty');
```

**Replace with:**
```typescript
Object.values(advancedSearchFilters.customFields).some(field => {
  const hasValue = Array.isArray(field.value) ? field.value.length > 0 : !!field.value;
  return hasValue || field.operator === 'isEmpty' || field.operator === 'isNotEmpty';
});
```

---

### 6. Filter Count Badge (src/pages/dashboard.tsx)

**Find this:**
```typescript
count += Object.values(advancedSearchFilters.customFields).filter(field => field.value || field.operator === 'isEmpty' || field.operator === 'isNotEmpty').length;
```

**Replace with:**
```typescript
count += Object.values(advancedSearchFilters.customFields).filter(field => {
  const hasValue = Array.isArray(field.value) ? field.value.length > 0 : !!field.value;
  return hasValue || field.operator === 'isEmpty' || field.operator === 'isNotEmpty';
}).length;
```

---

### 7. Select Field Rendering (src/pages/dashboard.tsx)

**Find this:**
```typescript
) : field.fieldType === 'select' ? (
  <Select
    value={advancedSearchFilters.customFields[field.id]?.value || 'all'}
    onValueChange={(value) => handleCustomFieldSearchChange(field.id, value === 'all' ? '' : value, 'equals')}
  >
    <SelectTrigger className="bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600">
      <SelectValue placeholder={`Select ${field.fieldName.toLowerCase()}...`} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All options</SelectItem>
      {field.fieldOptions?.options?.filter((option: string) => option && option.trim() !== '').map((option: string, index: number) => (
        <SelectItem key={index} value={option}>
          {option}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
) : field.fieldType === 'boolean' || field.fieldType === 'checkbox' ? (
```

**Replace with:**
```typescript
) : field.fieldType === 'select' ? (
  <MultiSelect
    options={field.fieldOptions?.options
      ?.filter((option: string) => option && option.trim() !== '')
      .map((option: string) => ({
        label: option,
        value: option
      })) || []}
    selected={Array.isArray(advancedSearchFilters.customFields[field.id]?.value) 
      ? advancedSearchFilters.customFields[field.id]?.value as string[]
      : advancedSearchFilters.customFields[field.id]?.value 
        ? [advancedSearchFilters.customFields[field.id]?.value as string]
        : []}
    onChange={(values) => handleCustomFieldSearchChange(field.id, values, 'equals')}
    placeholder={`Select ${field.fieldName.toLowerCase()}...`}
  />
) : field.fieldType === 'boolean' || field.fieldType === 'checkbox' ? (
```

---

### 8. Export Dialog (src/components/ExportDialog.tsx)

**Find this:**
```typescript
// Add custom field filters
Object.entries(advancedFilters.customFields).forEach(([fieldId, filter]) => {
  if (filter.value) {
    filters.push(`Custom Field: "${filter.value}"`);
  }
  if (filter.searchEmpty) {
    filters.push(`Empty Custom Field`);
  }
});
```

**Replace with:**
```typescript
// Add custom field filters
Object.entries(advancedFilters.customFields).forEach(([fieldId, filter]) => {
  if (filter.value) {
    // Handle array values (multi-select)
    if (Array.isArray(filter.value)) {
      if (filter.value.length > 0) {
        filters.push(`Custom Field: "${filter.value.join(', ')}"`);
      }
    } else {
      filters.push(`Custom Field: "${filter.value}"`);
    }
  }
  if (filter.searchEmpty) {
    filters.push(`Empty Custom Field`);
  }
});
```

---

## Testing Checklist

After porting, test the following:

- [ ] Single option selection works
- [ ] Multiple option selection works
- [ ] Badge display shows selected options
- [ ] X button removes individual selections
- [ ] "Clear all" button works
- [ ] Search within dropdown works
- [ ] Filter count badge updates correctly
- [ ] Export dialog shows multi-select values
- [ ] Dark mode styling is correct
- [ ] Keyboard navigation works
- [ ] Empty selection shows all attendees
- [ ] Other custom field types (text, number, boolean) still work

## Common Issues

### Issue 1: TypeScript Errors
**Problem:** Type errors about `string | string[]`

**Solution:** Make sure you updated the state type definition in step 1

---

### Issue 2: Component Not Found
**Problem:** `Cannot find module '@/components/ui/multi-select'`

**Solution:** Make sure you copied the multi-select.tsx file to the correct location

---

### Issue 3: Styling Issues
**Problem:** Component doesn't match design system

**Solution:** Ensure your target branch has the same shadcn/ui components (Popover, Command, Badge, Button, Separator)

---

### Issue 4: Filter Not Working
**Problem:** Selecting multiple options doesn't filter correctly

**Solution:** Make sure you updated the filtering logic in step 4 with the array handling code

---

## Verification

After porting, verify the feature works by:

1. Create a custom field with type "select" and add multiple options
2. Add some attendees with different values for that field
3. Open Advanced Filters
4. Select multiple options from the dropdown
5. Verify that attendees with ANY of the selected options are shown
6. Check that the filter count badge shows the correct number
7. Export and verify the filter description includes all selected options

## Support

If you encounter issues during porting, refer to:
- Full documentation: `docs/fixes/CUSTOM_FIELD_MULTI_SELECT_FILTER.md`
- Original implementation: Compare with the source branch
- Test the feature in the source branch to understand expected behavior
