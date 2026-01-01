# Multi-Select Filter Porting Guide

## Overview
Step-by-step guide for porting the multi-select dropdown filter enhancement to other branches.

## Prerequisites

Before starting, ensure the target branch has:
- shadcn/ui Popover component
- shadcn/ui Command component
- TypeScript 5.x
- React 19.x or compatible version

## Step-by-Step Porting Instructions

### Step 1: Update State Type Definition

**File:** `src/pages/dashboard.tsx`

**Location:** Find the `advancedSearchFilters` state definition (around line 260)

**Change:**
```typescript
// Find this line:
customFields: { [key: string]: { value: string; operator: string } };

// Replace with:
customFields: { [key: string]: { value: string | string[]; operator: string } };
```

**Why:** This allows custom fields to store either a single value (string) or multiple values (array).

---

### Step 2: Add Required Imports

**File:** `src/pages/dashboard.tsx`

**Location:** Top of file, in the imports section (around line 60)

**Find:**
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

**Replace with:**
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
```

**Why:** These components are needed for the searchable multi-select dropdown.

---

### Step 3: Update Handler Function

**File:** `src/pages/dashboard.tsx`

**Location:** Find `handleCustomFieldSearchChange` function (around line 1415)

**Find:**
```typescript
const handleCustomFieldSearchChange = (fieldId: string, value: string, operator?: string) => {
```

**Replace with:**
```typescript
const handleCustomFieldSearchChange = (fieldId: string, value: string | string[], operator?: string) => {
```

**Why:** The handler needs to accept both string and array values.

---

### Step 4: Update Filtering Logic

**File:** `src/pages/dashboard.tsx`

**Location:** Find the `customFieldsMatch` logic (around line 1148)

**Find this section:**
```typescript
// If no operator or value (for operators that need it), match all
if (!filter.operator || (filter.operator !== 'isEmpty' && filter.operator !== 'isNotEmpty' && !filter.value)) {
  return true;
}

switch (filter.operator) {
```

**Add this code BEFORE the switch statement:**
```typescript
// Handle multi-select for select fields (array of values)
if (Array.isArray(filter.value)) {
  // If empty array, match all (no filter applied)
  if (filter.value.length === 0) {
    return true;
  }
  // For multi-select, check if attendee value matches ANY of the selected options
  return filter.value.some(selectedValue => 
    hasValue && attendeeValue.toLowerCase() === selectedValue.toLowerCase()
  );
}
```

**Also update the switch cases to cast to string:**
```typescript
case 'contains':
  return hasValue && attendeeValue.toLowerCase().includes((filter.value as string).toLowerCase());
case 'equals':
  return hasValue && attendeeValue.toLowerCase() === (filter.value as string).toLowerCase();
case 'startsWith':
  return hasValue && attendeeValue.toLowerCase().startsWith((filter.value as string).toLowerCase());
case 'endsWith':
  return hasValue && attendeeValue.toLowerCase().endsWith((filter.value as string).toLowerCase());
default:
  return hasValue && attendeeValue.toLowerCase() === (filter.value as string).toLowerCase();
```

**Why:** This adds OR logic for multi-select and ensures type safety.

---

### Step 5: Update Clear Function

**File:** `src/pages/dashboard.tsx`

**Location:** Find `clearAdvancedSearch` function (around line 1443)

**Find:**
```typescript
const clearAdvancedSearch = () => {
  const customFields: { [key: string]: { value: string; operator: string } } = {};
  eventSettings?.customFields?.forEach((field: any) => {
    customFields[field.id] = { value: '', operator: 'contains' };
  });
```

**Replace with:**
```typescript
const clearAdvancedSearch = () => {
  const customFields: { [key: string]: { value: string | string[]; operator: string } } = {};
  eventSettings?.customFields?.forEach((field: any) => {
    // Use empty array for select fields, empty string for others
    customFields[field.id] = { 
      value: field.fieldType === 'select' ? [] : '', 
      operator: 'contains' 
    };
  });
```

**Why:** Select fields should initialize with empty arrays instead of empty strings.

---

### Step 6: Replace UI Component

**File:** `src/pages/dashboard.tsx`

**Location:** Find the select field rendering in advanced filters (around line 3574)

**Find this entire block:**
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
```

**Replace with:**
```typescript
) : field.fieldType === 'select' ? (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        className="w-full justify-between bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {(() => {
          const selectedValues = Array.isArray(advancedSearchFilters.customFields[field.id]?.value) 
            ? advancedSearchFilters.customFields[field.id]?.value as string[]
            : [];
          
          if (selectedValues.length === 0) {
            return <span className="text-muted-foreground">Select options...</span>;
          } else if (selectedValues.length === 1) {
            return <span>{selectedValues[0]}</span>;
          } else {
            return <span>{selectedValues.length} options selected</span>;
          }
        })()}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[300px] p-0" align="start">
      <Command>
        <CommandInput placeholder={`Search ${field.fieldName.toLowerCase()}...`} />
        <CommandList>
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandGroup>
            {field.fieldOptions?.options?.filter((option: string) => option && option.trim() !== '').map((option: string, index: number) => {
              const selectedValues = Array.isArray(advancedSearchFilters.customFields[field.id]?.value) 
                ? advancedSearchFilters.customFields[field.id]?.value as string[]
                : [];
              const isSelected = selectedValues.includes(option);
              
              return (
                <CommandItem
                  key={index}
                  value={option}
                  onSelect={() => {
                    const currentValues = Array.isArray(advancedSearchFilters.customFields[field.id]?.value) 
                      ? advancedSearchFilters.customFields[field.id]?.value as string[]
                      : [];
                    
                    let newValues: string[];
                    if (isSelected) {
                      // Remove the option
                      newValues = currentValues.filter(v => v !== option);
                    } else {
                      // Add the option
                      newValues = [...currentValues, option];
                    }
                    
                    handleCustomFieldSearchChange(field.id, newValues, 'equals');
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={`flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50'
                    }`}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span>{option}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
      {(() => {
        const selectedValues = Array.isArray(advancedSearchFilters.customFields[field.id]?.value) 
          ? advancedSearchFilters.customFields[field.id]?.value as string[]
          : [];
        
        if (selectedValues.length > 0) {
          return (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => handleCustomFieldSearchChange(field.id, [], 'equals')}
              >
                Clear Selection
              </Button>
            </div>
          );
        }
        return null;
      })()}
    </PopoverContent>
  </Popover>
```

**Why:** This replaces the single-select dropdown with a searchable multi-select component.

---

### Step 7: Update Export Dialog

**File:** `src/components/ExportDialog.tsx`

**Location:** Find the custom field filter display logic (around line 215)

**Find:**
```typescript
if (advancedFilters.customFields) {
  Object.entries(advancedFilters.customFields).forEach(([fieldId, filter]) => {
    if (filter.value) {
      filters.push(`Custom Field: "${filter.value}"`);
    }
    if (filter.searchEmpty) {
      filters.push(`Empty Custom Field`);
    }
  });
}
```

**Replace with:**
```typescript
if (advancedFilters.customFields) {
  Object.entries(advancedFilters.customFields).forEach(([fieldId, filter]) => {
    if (filter.value) {
      // Handle both string and array values
      if (Array.isArray(filter.value) && filter.value.length > 0) {
        filters.push(`Custom Field: "${filter.value.join(', ')}"`);
      } else if (typeof filter.value === 'string' && filter.value) {
        filters.push(`Custom Field: "${filter.value}"`);
      }
    }
    if (filter.searchEmpty) {
      filters.push(`Empty Custom Field`);
    }
  });
}
```

**Why:** The export dialog needs to handle both string and array values when displaying filters.

---

## Verification Steps

After applying all changes:

### 1. TypeScript Compilation
```bash
npm run build
```
Should complete without type errors.

### 2. Visual Inspection
- Open the Advanced Filters dialog
- Find a dropdown custom field
- Verify it shows the new multi-select UI

### 3. Functional Testing

**Test 1: Single Selection**
1. Click dropdown
2. Select one option
3. Verify button shows option name
4. Apply filter
5. Verify correct attendees shown

**Test 2: Multiple Selections**
1. Click dropdown
2. Select 2-3 options
3. Verify button shows "X options selected"
4. Apply filter
5. Verify attendees with ANY selected option are shown

**Test 3: Search**
1. Click dropdown
2. Type in search box
3. Verify options filter
4. Select filtered option
5. Verify selection works

**Test 4: Clear**
1. Select multiple options
2. Click "Clear Selection"
3. Verify all deselected
4. Verify all attendees shown

**Test 5: Export**
1. Apply multi-select filter
2. Open Export dialog
3. Verify filter summary shows all selected options

### 4. Edge Cases

Test these scenarios:
- Empty dropdown (no options)
- Single option dropdown
- Very long option names
- Special characters in options
- Combining with other filters

## Troubleshooting

### Issue: TypeScript Errors

**Problem:** Type errors about `string | string[]`

**Solution:** Ensure all type definitions are updated:
- State definition
- Handler function parameter
- Clear function
- Filtering logic casts

### Issue: Component Not Found

**Problem:** `Popover` or `Command` not found

**Solution:** Install shadcn/ui components:
```bash
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add command
```

### Issue: Filtering Not Working

**Problem:** Multi-select doesn't filter correctly

**Solution:** Verify the filtering logic includes:
- Array check before switch statement
- Empty array returns true
- `Array.some()` for OR logic

### Issue: Clear Not Working

**Problem:** Clear button doesn't reset select fields

**Solution:** Verify `clearAdvancedSearch` initializes select fields with `[]` not `''`

### Issue: Export Shows Wrong Values

**Problem:** Export dialog shows `[object Object]` or wrong format

**Solution:** Verify ExportDialog handles arrays with `Array.isArray()` check and `.join(', ')`

## Rollback Instructions

If you need to rollback:

1. Revert state type to `value: string`
2. Revert handler parameter to `value: string`
3. Remove array handling in filtering logic
4. Revert UI to original `<Select>` component
5. Revert clear function to use `''` for all fields
6. Revert ExportDialog to original logic

## Additional Notes

### Performance Considerations
- The multi-select uses efficient `Array.some()` for filtering
- No performance impact expected for typical use cases
- For very large option lists (>100), consider virtualization

### Accessibility
- Component maintains keyboard navigation
- Screen reader compatible
- Focus management handled by Radix UI

### Browser Compatibility
- Works in all modern browsers
- Requires JavaScript enabled
- No IE11 support (as per Next.js 16 requirements)

## Support

If you encounter issues during porting:

1. Check the main documentation: `CUSTOM_FIELD_MULTI_SELECT_FILTER_ENHANCEMENT.md`
2. Compare with the reference implementation in the main branch
3. Verify all prerequisites are met
4. Test each step individually

## Conclusion

Following these steps should successfully port the multi-select filter enhancement to your branch. The changes are backward compatible and maintain type safety throughout.
