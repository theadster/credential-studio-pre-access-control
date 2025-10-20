# Custom Field Dialog Scrolling Fix

## Issue

The "Edit Custom Field" dialog window in the Event Settings page had a usability issue where:
- Forms with many select options or other multi-variable data would make the dialog too tall
- The dialog did not have scrolling capability
- Users could not reach the Save button at the bottom when the form content exceeded the viewport height

This was particularly problematic for:
- Custom fields with many select options
- The new "Printable Field" toggle and description added additional height
- Users with smaller screens or lower resolution displays

## Solution

Updated both custom field dialogs in `src/components/EventSettingsForm.tsx` to include proper scrolling by restructuring the dialog layout:

### 1. Custom Field Form Dialog (Add/Edit Custom Field)

**Changes:**
- Removed default padding and gap from DialogContent (`p-0 gap-0`)
- Added `max-h-[90vh]` to limit dialog height to 90% of viewport height
- Added `overflow-hidden` to DialogContent to prevent outer scroll
- Restructured form with explicit height constraint (`max-h-[90vh]`)
- Wrapped header in a padded container with `flex-shrink-0`
- Made the form content scrollable with `overflow-y-auto flex-1`
- Wrapped footer in a padded container with `flex-shrink-0` and border separator

**Before:**
```tsx
<DialogContent className="max-w-lg">
  <form onSubmit={handleSubmit}>
    <DialogHeader>...</DialogHeader>
    <div className="space-y-5 py-6">...</div>
    <DialogFooter>...</DialogFooter>
  </form>
</DialogContent>
```

**After:**
```tsx
<DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden">
  <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
    <div className="px-6 pt-6 pb-4 flex-shrink-0">
      <DialogHeader>...</DialogHeader>
    </div>
    <div className="space-y-5 px-6 py-4 overflow-y-auto flex-1">...</div>
    <div className="px-6 pb-6 pt-4 flex-shrink-0 border-t">
      <DialogFooter>...</DialogFooter>
    </div>
  </form>
</DialogContent>
```

### 2. Field Mapping Form Dialog

Applied the same scrolling pattern to the Field Mapping dialog for consistency and to handle cases with many value mappings.

## Technical Details

The key to making this work was:

1. **Remove default padding/gap**: The shadcn Dialog component has built-in `p-6` and `gap-4` which interferes with custom scrolling layouts
2. **Explicit height constraints**: Both DialogContent and form need `max-h-[90vh]` to establish the scrolling boundary
3. **Overflow control**: `overflow-hidden` on DialogContent prevents double scrollbars
4. **Manual padding**: Apply padding to individual sections (header, content, footer) instead of the container
5. **Flexbox layout**: Use `flex flex-col` with `flex-shrink-0` for fixed sections and `flex-1` for scrollable content

## Benefits

1. **Accessibility**: Users can now access all form fields and the Save button regardless of form height
2. **Responsive**: Works on all screen sizes and resolutions
3. **User Experience**: 
   - Header and footer remain visible and fixed while scrolling
   - Clear visual separation between scrollable content and fixed elements
   - Smooth scrolling behavior with visible scrollbar
   - No layout shift or double scrollbars
4. **Consistency**: Follows similar patterns used in other large forms in the application

## Testing

To test the fix:
1. Navigate to Event Settings → Custom Fields
2. Create or edit a custom field with type "Select"
3. Add many select options (10+)
4. Verify the dialog is scrollable
5. Verify the header stays at the top and footer at the bottom
6. Verify the Save button is always accessible

## Related Components

Other dialogs that already had proper scrolling implemented:
- `AttendeeForm.tsx` - Already had `max-h-[90vh] overflow-y-auto`
- `RoleForm.tsx` - Already had `max-h-[90vh] overflow-y-auto`

## Files Modified

- `src/components/EventSettingsForm.tsx`
  - Custom Field Form dialog (lines ~2000-2170)
  - Field Mapping Form dialog (lines ~2265-2400)

## Visual Design

The implementation follows the visual design system:
- Uses Tailwind utility classes for consistency
- Maintains proper spacing with `space-y-5 py-6`
- Adds visual separator with `border-t` on footer
- Respects the 90vh max height convention used elsewhere in the app

## Future Considerations

If more complex forms are added in the future, consider:
- Using a two-column layout for very wide forms
- Implementing collapsible sections for better organization
- Adding a progress indicator for multi-step forms
