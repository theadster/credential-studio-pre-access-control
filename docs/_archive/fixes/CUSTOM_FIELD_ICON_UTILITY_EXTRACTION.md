# Custom Field Icon Utility Extraction

## Issue
The `getCustomFieldIcon` function was defined locally in `CustomFieldsSection.tsx`, which could lead to code duplication if the same icon mapping is needed elsewhere in the application.

**Severity:** LOW  
**Risk:** Code duplication if used elsewhere

## Solution
Extracted the icon mapping logic into a reusable utility module that can be imported anywhere in the application.

## Changes Made

### 1. Created New Utility File
**File:** `src/utils/customFieldIcons.tsx`

This new utility module provides two functions:

#### `getCustomFieldIcon(fieldType: string)`
Returns the appropriate icon component for a custom field type.

Supported field types:
- `text` → Type icon
- `number` → Hash icon
- `email` → Mail icon
- `url` → Link icon
- `date` → Calendar icon
- `select` → ChevronDown icon
- `boolean` → ToggleLeft icon
- `textarea` → FileText icon
- Default → FileText icon

All icons are styled with `h-4 w-4 text-muted-foreground` for consistency.

#### `getCustomFieldLabel(fieldType: string)`
Returns human-readable labels for field types.

Mappings:
- `text` → "Text"
- `number` → "Number"
- `email` → "Email"
- `url` → "URL"
- `date` → "Date"
- `select` → "Dropdown"
- `checkbox` → "Checkbox"
- `boolean` → "Yes/No"
- `textarea` → "Long Text"

### 2. Updated CustomFieldsSection Component
**File:** `src/components/AttendeeForm/CustomFieldsSection.tsx`

**Before:**
```typescript
import { Type, Hash, Mail, Link, Calendar, ChevronDown, ToggleLeft, FileText } from 'lucide-react';

function getCustomFieldIcon(fieldType: string) {
  switch (fieldType) {
    case 'text':
      return <Type className="h-4 w-4 text-muted-foreground" />;
    // ... more cases
  }
}
```

**After:**
```typescript
import { getCustomFieldIcon } from '@/utils/customFieldIcons';

// Function removed - now imported from utility
```

## Benefits

1. **Reusability**: Icon mapping can now be used in any component
2. **Consistency**: Single source of truth for field type icons
3. **Maintainability**: Changes to icon mappings only need to be made in one place
4. **Discoverability**: Utility functions are easier to find in a dedicated module
5. **Bonus Feature**: Added `getCustomFieldLabel` for field type labels

## Potential Use Cases

This utility can now be easily used in:
- Event Settings Form (field type selection)
- Dashboard custom field columns
- Export/Import field mapping UI
- Custom field management interfaces
- Any component that displays or manages custom fields

## Files Modified
- `src/utils/customFieldIcons.tsx` (NEW) - Utility module
- `src/components/AttendeeForm/CustomFieldsSection.tsx` - Updated to use utility

## Testing
- ✅ No TypeScript errors
- ✅ Icons display correctly in AttendeeForm
- ✅ Function is properly exported and importable
- ✅ All field types have appropriate icons

## Future Enhancements
Consider adding:
- Icon size variants (small, medium, large)
- Color variants for different contexts
- Additional field types as they're added to the system
- Icon-only vs icon-with-label rendering options
