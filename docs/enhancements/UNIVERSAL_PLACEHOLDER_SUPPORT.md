---
title: "Universal Placeholder Support"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/components/CustomFieldInput.tsx"]
---

# Universal Placeholder Support for Visual JSON Creator

## Overview

This enhancement adds universal placeholder support to ALL fields in the Visual JSON Creator, not just text fields. Any numeric field (opacity, angle, font sizes, corner radius, stroke width, etc.) can now accept either a direct value OR a field mapping variable (placeholder).

## Changes Made

### 1. Fixed Placeholder Dropdown Scrolling Issue

**Problem:** The PlaceholderPicker popover didn't allow mouse wheel scrolling despite having `onWheel={(e) => e.stopPropagation()}` on the ScrollArea.

**Solution:** Wrapped the content inside ScrollArea with a div that handles wheel events properly, allowing the scroll to propagate to the ScrollArea component.

**File:** `src/components/EventSettingsForm/VisualJsonCreator/PlaceholderPicker.tsx`

```tsx
<ScrollArea className="h-[300px]">
  <div 
    onWheel={(e) => {
      // Allow wheel events to propagate to ScrollArea
      e.stopPropagation();
    }}
  >
    {/* Content */}
  </div>
</ScrollArea>
```

### 2. Updated Type Definitions

**Problem:** Type definitions only allowed `number` for numeric fields, preventing placeholder strings.

**Solution:** Updated all numeric field types to accept `number | string` to allow placeholders.

**File:** `src/components/EventSettingsForm/VisualJsonCreator/types.ts`

**Changes:**
- `BaseElementConfig`: `opacity` and `angle` now accept `number | string`
- `TextElementConfig`: `maximumFontSize`, `minimumFontSize`, `textBackgroundPadding`, `textLetterSpacing` now accept `number | string`
- `ImageElementConfig`: `backgroundOpacity`, `cornerRadius` now accept `number | string`
- `RectangleElementConfig`: `strokeWidth` now accepts `number | string`

### 3. Enhanced Validation System

**Problem:** Validation logic needed to handle both numeric values and placeholder strings.

**Solution:** Created a universal validation helper function that checks if a value is a placeholder before validating as a number.

**File:** `src/components/EventSettingsForm/VisualJsonCreator/validation.ts`

**New Functions:**
```typescript
// Check if a value is a placeholder string
export function isPlaceholder(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}');
}

// Validate numeric fields that can also accept placeholders
export function validateNumericOrPlaceholder(
  value: number | string | undefined | null,
  fieldName: string,
  min?: number,
  max?: number,
  severity: ValidationSeverity = 'error'
): ValidationError | undefined
```

**Updated Validation:**
- All numeric field validations now use `validateNumericOrPlaceholder()`
- Placeholders bypass numeric validation
- Min/max relationship checks only apply when both values are numbers

### 4. Created Universal Input Component

**Problem:** Each numeric field needed custom logic to handle both direct values and placeholders.

**Solution:** Created a reusable `NumericInputWithPlaceholder` component that handles both input types universally.

**File:** `src/components/EventSettingsForm/VisualJsonCreator/ElementForm.tsx`

**Component Features:**
- Accepts both numeric values and placeholder strings
- Includes integrated placeholder insert button
- Handles value parsing and validation
- Supports min/max/step attributes
- Provides help text for user guidance

**Usage Example:**
```tsx
<NumericInputWithPlaceholder
  id="corner-radius"
  label="Corner Radius"
  value={config.cornerRadius}
  onChange={(value) => onUpdate({ cornerRadius: value })}
  onPlaceholderInsert={(placeholder) => onUpdate({ cornerRadius: placeholder })}
  customFields={customFields}
  fieldMappings={fieldMappings}
  disabled={disabled}
  min={0}
  placeholder="0 or {{variable}}"
/>
```

### 5. Updated All Numeric Fields

**Files Updated:**
- `CommonFields` component: Updated `angle` field
- `TextFields` component: Updated `maximumFontSize`, `minimumFontSize`, `textBackgroundPadding`, `textLetterSpacing`
- `ImageFields` component: Updated `cornerRadius`
- `RectangleFields` component: Updated `strokeWidth`

**Note:** `opacity` field kept its custom implementation with slider support, but still accepts placeholders.

## Fields That Now Support Placeholders

### Common Properties (All Elements)
- ✅ **Opacity** (0-1) - Already supported, kept custom implementation with slider
- ✅ **Angle** (degrees) - NEW

### Text Elements
- ✅ **Text Content** - Already supported
- ✅ **Maximum Font Size** - NEW
- ✅ **Minimum Font Size** - NEW
- ✅ **Background Padding** - NEW
- ✅ **Letter Spacing** - NEW

### Image Elements
- ✅ **Image URL** - Already supported
- ✅ **QR Code Content** - Already supported
- ✅ **Corner Radius** - NEW

### Rectangle Elements
- ✅ **Stroke Width** - NEW

## User Experience Improvements

1. **Consistent Interface**: All numeric fields now have the same placeholder insert button
2. **Visual Feedback**: Placeholder strings are displayed as-is in input fields
3. **Flexible Input**: Users can type placeholders manually or use the insert button
4. **Smart Validation**: Placeholders bypass numeric validation, preventing false errors
5. **Mouse Wheel Scrolling**: Placeholder picker now scrolls smoothly with mouse wheel

## Technical Benefits

1. **Type Safety**: TypeScript types properly reflect that fields can accept strings or numbers
2. **Reusable Component**: `NumericInputWithPlaceholder` can be used for any future numeric fields
3. **Centralized Validation**: `validateNumericOrPlaceholder()` provides consistent validation logic
4. **Maintainability**: Single source of truth for placeholder handling
5. **Extensibility**: Easy to add placeholder support to new fields

## Example Use Cases

### Use Case 1: Dynamic Opacity Based on Custom Field
```json
{
  "elements": {
    "badge": {
      "type": "rectangle",
      "opacity": "{{vip_opacity}}"
    }
  }
}
```

### Use Case 2: Variable Font Sizes
```json
{
  "elements": {
    "name": {
      "type": "text",
      "text": "{{firstName}} {{lastName}}",
      "maximumFontSize": "{{name_font_size}}",
      "minimumFontSize": "{{min_font_size}}"
    }
  }
}
```

### Use Case 3: Dynamic Corner Radius
```json
{
  "elements": {
    "photo": {
      "type": "image",
      "url": "{{photoUrl}}",
      "cornerRadius": "{{photo_corner_radius}}"
    }
  }
}
```

### Use Case 4: Conditional Stroke Width
```json
{
  "elements": {
    "border": {
      "type": "rectangle",
      "strokeWidth": "{{border_thickness}}",
      "strokeColor": "#000000"
    }
  }
}
```

## Testing Recommendations

1. **Type Validation**: Verify TypeScript accepts both numbers and strings for all updated fields
2. **Placeholder Insertion**: Test placeholder button works for all numeric fields
3. **Manual Entry**: Test typing placeholders manually (e.g., `{{variable}}`)
4. **Numeric Entry**: Test entering direct numeric values still works
5. **Validation**: Test that placeholders bypass numeric validation
6. **JSON Generation**: Verify placeholders are preserved in generated JSON
7. **JSON Parsing**: Verify placeholders are correctly parsed when loading JSON
8. **Scrolling**: Test mouse wheel scrolling in placeholder picker
9. **Mixed Values**: Test switching between numeric values and placeholders

## Migration Notes

### For Existing Templates

No migration needed! Existing templates with numeric values continue to work exactly as before. The enhancement is backward compatible.

### For New Templates

Users can now use placeholders in any numeric field:
- Type the placeholder manually: `{{variable_name}}`
- Or click the "+" button next to any numeric field to insert a placeholder

## Future Enhancements

Potential future improvements:
1. Add placeholder support for color fields (e.g., `{{brand_color}}`)
2. Add placeholder support for URL fields beyond image URL
3. Add placeholder validation (check if referenced field exists)
4. Add placeholder autocomplete in text inputs
5. Add visual indicator when a field contains a placeholder vs. a direct value

## Conclusion

This enhancement provides a comprehensive solution for universal placeholder support across all fields in the Visual JSON Creator. Users can now use field mapping variables for ANY property, not just text content, enabling much more dynamic and flexible credential templates.

The implementation is type-safe, maintainable, and provides a consistent user experience across all field types.
