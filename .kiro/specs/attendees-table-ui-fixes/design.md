# Design Document

## Overview

This design addresses two visual polish issues in the attendees table on the dashboard page. The fixes are CSS-focused and require minimal code changes to improve the visual alignment and interaction feedback of the table.

## Architecture

### Affected Components

- **File**: `src/pages/dashboard.tsx`
- **Component**: Attendees table within the Dashboard component
- **Sections**:
  - TableHeader (column headers)
  - TableBody (table cells with content)
  - Name cell button (clickable attendee name)

### Design Approach

The fixes will be implemented using:
1. **CSS utility classes** - Tailwind CSS classes for alignment
2. **Focus management** - CSS pseudo-classes to control focus ring visibility
3. **No structural changes** - Maintain existing table structure and functionality

## Components and Interfaces

### 1. Column Header Alignment Fix

**Current State:**
```tsx
<TableHead className="w-32">Barcode</TableHead>
<TableHead className="w-24">Credential</TableHead>
<TableHead className="w-32">Status</TableHead>
<TableHead className="w-24">Actions</TableHead>
```

**Problem Analysis:**
- Headers have width constraints but no text alignment specified
- Content cells have centered or left-aligned content
- Default text alignment is left, causing misalignment with centered content

**Solution:**
Add `text-center` class to column headers that contain centered content:
- Barcode column: Contains centered badge with icon
- Credential column: Contains centered icon button
- Status column: Contains centered badge
- Actions column: Contains centered dropdown menu

**Design Decision:**
Use Tailwind's `text-center` utility class rather than custom CSS for consistency with the existing codebase styling approach.

### 2. Purple Border Flash Fix

**Current State:**
```tsx
<button
  onClick={...}
  className="text-left group w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
  ...
>
```

**Problem Analysis:**
- The button has `focus:ring-2 focus:ring-primary` classes
- When clicked with a mouse, the button receives focus and shows the ring
- The ring appears briefly before the dialog opens
- This creates a distracting purple flash

**Solution:**
Use the `focus-visible:` variant instead of `focus:` to only show focus rings for keyboard navigation:
- `focus-visible:outline-none` - Remove outline only for keyboard focus
- `focus-visible:ring-2` - Show ring only for keyboard focus
- `focus-visible:ring-primary` - Use primary color for keyboard focus
- `focus-visible:ring-offset-2` - Add offset for keyboard focus

**Design Decision:**
The `focus-visible` pseudo-class is the modern, accessibility-friendly approach that:
- Shows focus indicators for keyboard users (required for accessibility)
- Hides focus indicators for mouse users (better visual experience)
- Is supported by all modern browsers
- Aligns with WCAG 2.1 accessibility guidelines

## Data Models

No data model changes required. This is a pure UI/CSS fix.

## Error Handling

No error handling changes required. The fixes do not affect functionality or data flow.

## Testing Strategy

### Manual Testing

1. **Column Alignment Testing:**
   - View the attendees table in light mode
   - View the attendees table in dark mode
   - Verify all column headers are centered above their content
   - Test on different screen sizes (mobile, tablet, desktop)
   - Verify alignment with and without custom fields visible

2. **Focus Ring Testing:**
   - Click attendee name with mouse → No purple border should appear
   - Tab to attendee name with keyboard → Purple focus ring should appear
   - Press Enter on focused name → Dialog should open with focus ring visible
   - Click outside and back → Focus ring should only appear with keyboard navigation

### Visual Regression Testing

- Take screenshots before and after changes
- Compare alignment of column headers
- Verify no unintended visual changes to other table elements

### Accessibility Testing

- Verify keyboard navigation still works correctly
- Ensure focus indicators are visible when using Tab key
- Test with screen reader to ensure no accessibility regressions
- Verify WCAG 2.1 Level AA compliance for focus indicators

## Implementation Notes

### CSS Classes to Add

**Column Headers:**
```tsx
<TableHead className="w-32 text-center">Barcode</TableHead>
<TableHead className="w-24 text-center">Credential</TableHead>
<TableHead className="w-32 text-center">Status</TableHead>
<TableHead className="w-24 text-center">Actions</TableHead>
```

**Name Button:**
```tsx
<button
  onClick={...}
  className="text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
  ...
>
```

### Browser Compatibility

- `text-center`: Supported by all browsers
- `focus-visible`: Supported by all modern browsers (Chrome 86+, Firefox 85+, Safari 15.4+)
- Fallback: Older browsers will show focus ring for both mouse and keyboard (acceptable degradation)

### Performance Impact

- Zero performance impact
- No JavaScript changes
- Pure CSS modifications
- No additional DOM elements

## Design Rationale

### Why Text-Center for Headers?

1. **Visual Consistency**: Content in these columns is centered, headers should match
2. **Professional Appearance**: Centered headers over centered content is a standard table design pattern
3. **Minimal Change**: Simple CSS class addition, no structural changes needed

### Why Focus-Visible Instead of Removing Focus Rings?

1. **Accessibility**: Keyboard users need visible focus indicators (WCAG requirement)
2. **User Experience**: Mouse users don't need focus indicators (reduces visual noise)
3. **Modern Standard**: `focus-visible` is the recommended approach in modern web development
4. **Future-Proof**: Aligns with evolving web accessibility standards

### Alternative Approaches Considered

**Alternative 1: Remove focus rings entirely**
- ❌ Violates WCAG accessibility guidelines
- ❌ Makes keyboard navigation difficult
- ❌ Not recommended

**Alternative 2: Use JavaScript to detect input method**
- ❌ More complex implementation
- ❌ Requires additional code maintenance
- ❌ CSS solution is simpler and more performant

**Alternative 3: Custom CSS with :focus:not(:focus-visible)**
- ✅ Works but more verbose
- ❌ Tailwind's focus-visible: variant is cleaner
- ❌ Less maintainable

## Conclusion

These fixes are straightforward CSS improvements that enhance the visual polish of the attendees table without affecting functionality or accessibility. The changes align with modern web development best practices and maintain the application's commitment to accessibility.
