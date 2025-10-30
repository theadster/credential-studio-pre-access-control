# Boolean Field Documentation - Comments Added

## Summary

Added comprehensive documentation comments throughout the codebase to prevent future boolean field format issues. All comments emphasize that boolean custom fields MUST use `'yes'/'no'` format (NOT `'true'/'false'`).

---

## Files Modified with Comments

### 1. `src/components/AttendeeForm/CustomFieldInput.tsx`

**File Header Comment:**
```typescript
/**
 * Custom Field Input Component
 * 
 * CRITICAL BOOLEAN FIELD FORMAT:
 * Boolean custom fields MUST use 'yes'/'no' format (NOT 'true'/'false')
 * - Default value: 'no'
 * - Checked state: 'yes'
 * - Unchecked state: 'no'
 * 
 * DO NOT change boolean format to 'true'/'false' - it will:
 * - Corrupt database data
 * - Break Switchboard integration field mappings
 * - Break import/export functionality
 * - Break bulk edit operations
 * - Cause inconsistencies across the application
 * 
 * See: docs/fixes/BOOLEAN_FIELD_DATA_CORRUPTION_FIX.md
 */
```

**Boolean Case Comment:**
```typescript
case 'boolean':
  // CRITICAL: Boolean custom fields MUST use 'yes'/'no' format (NOT 'true'/'false')
  // - Default value: 'no'
  // - Checked state: 'yes'
  // - Unchecked state: 'no'
  // This format is required for:
  // - Database consistency
  // - Switchboard integration field mappings
  // - Import/export functionality
  // - Bulk edit operations
  // DO NOT change to 'true'/'false' - it will corrupt data and break integrations
```

### 2. `src/hooks/useAttendeeForm.ts`

**Initialization Comment:**
```typescript
// CRITICAL: Boolean custom fields default to 'no' (NOT 'false')
// Boolean format: 'yes'/'no' (never 'true'/'false')
// This ensures consistency across the application and Switchboard integration
customFields.forEach(field => {
  if (field.fieldType === 'boolean' && !initialCustomFieldValues[field.id]) {
    initialCustomFieldValues[field.id] = 'no';
  }
});
```

### 3. `src/pages/dashboard.tsx`

**Display Logic Comment:**
```typescript
// CRITICAL: Boolean fields use 'yes'/'no' format (NOT 'true'/'false')
// For boolean fields, always show Yes/No, defaulting to No if no value is set
displayValue = (displayValue === 'yes') ? 'Yes' : 'No';
```

### 4. `src/pages/api/attendees/import.ts`

**Import Conversion Comment:**
```typescript
// CRITICAL: Boolean fields MUST be stored as 'yes'/'no' (NOT 'true'/'false')
// Convert various input formats (YES/NO, TRUE/FALSE, 1/0) to standardized 'yes'/'no'
// This ensures consistency with:
// - Form Switch component
// - Switchboard integration field mappings
// - Bulk edit operations
// - Database queries and display logic
if (fieldInfo?.fieldType === 'boolean') {
  const truthyValues = ['yes', 'true', '1'];
  const falsyValues = ['no', 'false', '0'];
  const lowerValue = String(value).toLowerCase().trim();
  
  if (truthyValues.includes(lowerValue)) {
    processedValue = 'yes';  // Always store as 'yes', never 'true'
  } else if (falsyValues.includes(lowerValue)) {
    processedValue = 'no';   // Always store as 'no', never 'false'
  } else {
    // Default to 'no' for unrecognized values
    processedValue = 'no';
  }
}
```

### 5. `src/pages/api/attendees/export.ts`

**Export Format Comment:**
```typescript
// CRITICAL: Boolean fields are stored as 'yes'/'no' in database
// Format for CSV export as 'Yes'/'No' for readability
// Note: Database stores 'yes'/'no' (lowercase), NOT 'true'/'false'
if (customField.fieldType === 'boolean') {
  const truthyValues = ['yes', 'true', '1', true];
  value = truthyValues.includes(String(value).toLowerCase()) ? 'Yes' : 'No';
}
```

### 6. `src/pages/api/attendees/[id]/generate-credential.ts`

**Field Mapping Comments:**
```typescript
// CRITICAL: Boolean fields are stored as 'yes'/'no' (lowercase) in database
// Normalize case for consistent field mapping lookup
if (mapping.fieldType === 'boolean') {
  lookupKey = originalValue.toLowerCase();  // Should be 'yes' or 'no'
}

// CRITICAL: Boolean fields default to 'no' (NOT 'false')
// If no value exists, use the mapping for 'no' or fallback to '0'
if (mapping.fieldType === 'boolean') {
  finalValue = mapping.valueMapping['no'] || '0';
}
```

---

## New File Created

### `src/lib/customFieldConstants.ts`

Created a comprehensive constants file with:

**Constants:**
- `BOOLEAN_TRUE_VALUE = 'yes'` - Standard value for checked state
- `BOOLEAN_FALSE_VALUE = 'no'` - Standard value for unchecked state
- `BOOLEAN_DEFAULT_VALUE = 'no'` - Default value for boolean fields

**Type Definitions:**
- `BooleanFieldValue` - Type for 'yes' | 'no'
- `isBooleanFieldValue()` - Type guard function

**Utility Functions:**
- `normalizeBooleanValue()` - Convert various formats to 'yes'/'no'
- `formatBooleanDisplay()` - Convert to display format ('Yes'/'No')
- `validateBooleanFieldValue()` - Validate and throw error if 'true'/'false' detected

**Documentation:**
```typescript
/**
 * CRITICAL: Boolean Custom Field Format
 * 
 * Boolean custom fields MUST use 'yes'/'no' format (NOT 'true'/'false')
 * 
 * This standard is enforced across:
 * - Form inputs (Switch component)
 * - Database storage
 * - Import/export operations
 * - Bulk edit operations
 * - Switchboard integration field mappings
 * - Display logic
 * 
 * DO NOT change to 'true'/'false' - it will corrupt data and break integrations.
 * 
 * See: docs/fixes/BOOLEAN_FIELD_DATA_CORRUPTION_FIX.md
 */
```

---

## Benefits

### 1. **Clear Documentation**
Every file that handles boolean fields now has explicit comments explaining the format requirement.

### 2. **Prevention**
Future developers will see warnings before making changes that could corrupt data.

### 3. **Consistency**
All comments reference the same standard and point to the same documentation.

### 4. **Centralized Constants**
The new constants file provides a single source of truth with utility functions.

### 5. **Type Safety**
TypeScript types and type guards help catch format issues at compile time.

---

## Usage Examples

### Using Constants in New Code

```typescript
import { 
  BOOLEAN_TRUE_VALUE, 
  BOOLEAN_FALSE_VALUE,
  normalizeBooleanValue,
  formatBooleanDisplay 
} from '@/lib/customFieldConstants';

// Setting a boolean field
customFieldValues[fieldId] = BOOLEAN_TRUE_VALUE;  // 'yes'

// Converting user input
const normalized = normalizeBooleanValue('TRUE');  // 'yes'

// Displaying to user
const display = formatBooleanDisplay('yes');  // 'Yes'
```

### Validation Example

```typescript
import { validateBooleanFieldValue } from '@/lib/customFieldConstants';

// This will throw an error if value is 'true' or 'false'
validateBooleanFieldValue(value, 'VIP Access');
```

---

## Files Summary

| File | Purpose | Comments Added |
|------|---------|----------------|
| `CustomFieldInput.tsx` | Form input component | File header + case comment |
| `useAttendeeForm.ts` | Form state management | Initialization comment |
| `dashboard.tsx` | Display logic | Display format comment |
| `import.ts` | CSV import | Conversion logic comment |
| `export.ts` | CSV export | Export format comment |
| `generate-credential.ts` | Switchboard integration | Field mapping comments |
| `customFieldConstants.ts` | Constants & utilities | NEW FILE - Complete documentation |

---

## Verification

All files have been verified:
- ✅ No TypeScript errors
- ✅ Comments are clear and consistent
- ✅ All references point to documentation
- ✅ Constants file provides utilities
- ✅ Type safety enforced

---

## Next Steps for Developers

When working with boolean custom fields:

1. **Read the comments** - They explain why the format matters
2. **Use the constants** - Import from `customFieldConstants.ts`
3. **Never use 'true'/'false'** - Always use 'yes'/'no'
4. **Validate inputs** - Use `validateBooleanFieldValue()` if needed
5. **Reference documentation** - See `BOOLEAN_FIELD_DATA_CORRUPTION_FIX.md`

---

**Date:** October 30, 2025  
**Status:** ✅ Complete  
**Impact:** Prevents future data corruption issues
