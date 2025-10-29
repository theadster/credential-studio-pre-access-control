# Save Button Unsaved Changes Dialog Fix

## Issue
When editing an attendee and clicking either "Update Attendee" or "Update & Generate Credential" buttons, the unsaved changes confirmation dialog would incorrectly appear, asking "You have unsaved changes. Are you sure you want to close without saving?"

This was confusing because:
1. The user just clicked a save button
2. The changes were being saved
3. The dialog shouldn't appear for save actions

## Root Cause
The issue was a race condition in the dialog close flow:

1. User clicks "Update Attendee" or "Update & Generate Credential"
2. `handleSubmit` or `handleSaveAndGenerate` is called
3. These functions set `hasUnsavedChanges` to `false` and call `onClose()`
4. `onClose()` triggers `handleDialogOpenChange(false)`
5. `handleDialogOpenChange` calls `handleCloseWithConfirmation()`
6. At this point, the state update might not have propagated yet
7. `handleCloseWithConfirmation()` checks `hasUnsavedChanges` and finds it still `true`
8. The confirmation dialog appears incorrectly

The problem was that React state updates are asynchronous, so even though we set `hasUnsavedChanges` to `false`, the check in `handleCloseWithConfirmation()` was happening before the state update completed.

## Solution
Use the existing `isClosingRef` flag to indicate that we're intentionally closing the dialog after a save operation. This ref is checked immediately (synchronously) and prevents the confirmation dialog from appearing.

### Changes Made

**In `handleSubmit` (Update Attendee button):**
```typescript
// Mark as closing to prevent unsaved changes dialog
isClosingRef.current = true;
setHasUnsavedChanges(false);

onSave(attendeeData);
resetForm();
onClose();
```

**In `handleSaveAndGenerate` (Update & Generate Credential button):**
```typescript
// Mark as closing to prevent unsaved changes dialog
isClosingRef.current = true;
setHasUnsavedChanges(false);

onSaveAndGenerate(attendeeData);
resetForm();
onClose();
```

**Error Handling:**
Both functions reset the flag if an error occurs:
```typescript
catch (err) {
  // ...error handling...
  // Reset closing flag on error
  isClosingRef.current = false;
}
```

## How It Works

The `isClosingRef` flag is used in `handleCloseWithConfirmation()`:

```typescript
const handleCloseWithConfirmation = () => {
  // Prevent re-entry while already processing a close
  if (isClosingRef.current) {
    return;  // Exit early, no confirmation needed
  }
  
  // If no unsaved changes, close immediately
  if (!hasUnsavedChanges) {
    resetForm();
    onClose();
    return;
  }
  
  // Show confirmation dialog...
};
```

When the flag is `true`, the function exits early without showing the confirmation dialog.

## Files Modified
- `src/components/AttendeeForm/index.tsx` - Updated `handleSubmit` and `handleSaveAndGenerate`

## Testing Scenarios

### ✅ Should NOT show dialog:
1. Edit an attendee and click "Update Attendee" → No dialog, saves successfully
2. Edit an attendee and click "Update & Generate Credential" → No dialog, saves and generates
3. Create a new attendee and click "Create Attendee" → No dialog, creates successfully
4. Open form, make no changes, click X or Cancel → No dialog (no changes to save)

### ✅ Should show dialog:
1. Edit an attendee, make changes, click X or Cancel → Shows confirmation
2. Create new attendee, enter data, click X or Cancel → Shows confirmation
3. Edit an attendee, make changes, click outside dialog → Shows confirmation

## Benefits
- Eliminates confusing UX where save buttons trigger "unsaved changes" warnings
- Maintains protection against accidental data loss when closing without saving
- Uses synchronous ref check to avoid race conditions with async state updates
- Properly handles error cases by resetting the flag

## Related
- Original unsaved changes implementation: `docs/fixes/UNSAVED_CHANGES_CONFIRMATION.md`
- The `isClosingRef` was already in place for preventing re-entry, now also used for save operations
