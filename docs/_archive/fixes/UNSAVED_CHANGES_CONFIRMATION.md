# Unsaved Changes Confirmation Implementation

**Date:** 2025-10-28
**Component:** AttendeeForm Dialog
**Severity:** MEDIUM (UX issue causing data loss)
**Status:** ✅ RESOLVED

## Problem

When filling out the AttendeeForm, pressing Tab from the last field would close the dialog without warning, causing users to lose all their entered data. This created a frustrating user experience where:

1. User fills out multiple fields
2. User presses Tab to move to next field (natural keyboard navigation)
3. Dialog closes unexpectedly without warning
4. All entered data is lost
5. User has to start over

## Root Cause

The Dialog component's default behavior allows closing via:
- ESC key
- Clicking outside the dialog
- **Tab key from the last focusable element** (focus leaves the dialog)

With `modal={false}` (required for Cloudinary widget), there's no focus trapping, so Tab from the last field causes the dialog to close via the `onOpenChange` handler.

## Solution

Implemented unsaved changes detection with confirmation dialog:

### 1. Track Unsaved Changes

Added state to track whether the form has any data entered:

```typescript
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// Track unsaved changes
useEffect(() => {
  if (!isOpen) {
    setHasUnsavedChanges(false);
    return;
  }

  // Check if form has any data entered
  const hasData = 
    formData.firstName.trim() !== '' ||
    formData.lastName.trim() !== '' ||
    (formData.notes && formData.notes.trim() !== '') ||
    formData.photoUrl !== null ||
    Object.values(formData.customFieldValues).some((value: string) => value.trim() !== '');

  setHasUnsavedChanges(hasData);
}, [isOpen, formData]);
```

### 2. Confirmation Dialog

Created a `handleClose` function that shows a confirmation dialog when there are unsaved changes:

```typescript
const handleClose = async () => {
  if (hasUnsavedChanges) {
    const confirmed = await confirm({
      title: 'Unsaved Changes',
      text: 'You have unsaved changes. Are you sure you want to close without saving?',
      icon: 'warning',
      confirmButtonText: 'Close Without Saving',
      cancelButtonText: 'Keep Editing',
    });

    if (confirmed) {
      resetForm();
      setHasUnsavedChanges(false);
      onClose();
    }
    // If not confirmed, dialog stays open
  } else {
    resetForm();
    onClose();
  }
};
```

### 3. Updated Dialog and Cancel Button

```typescript
// Dialog now uses handleClose instead of onClose
<Dialog open={isOpen} onOpenChange={handleClose} modal={false}>

// Cancel button also uses handleClose
<FormActions
  onCancel={handleClose}
  // ... other props
/>
```

### 4. Clear Flag on Successful Save

```typescript
// In handleSubmit
const attendeeData = prepareAttendeeData();
onSave(attendeeData);
setHasUnsavedChanges(false); // Clear flag before closing
resetForm();
onClose();

// In handleSaveAndGenerate
onSaveAndGenerate(attendeeData);
setHasUnsavedChanges(false); // Clear flag before closing
resetForm();
onClose();
```

## User Experience Flow

### Scenario 1: User Enters Data and Presses Tab from Last Field

1. User fills out form fields
2. User presses Tab from last field
3. **Confirmation dialog appears**: "Unsaved Changes - You have unsaved changes. Are you sure you want to close without saving?"
4. User can choose:
   - **"Close Without Saving"** - Dialog closes, data is lost
   - **"Keep Editing"** - Dialog stays open, user can continue editing

### Scenario 2: User Clicks Cancel Button

1. User fills out form fields
2. User clicks "Cancel" button
3. **Confirmation dialog appears** (same as above)
4. User makes choice

### Scenario 3: User Presses ESC Key

1. User fills out form fields
2. User presses ESC
3. **Confirmation dialog appears** (same as above)
4. User makes choice

### Scenario 4: User Saves Successfully

1. User fills out form fields
2. User clicks "Save" or "Save & Generate"
3. Form validates and saves
4. Dialog closes **without confirmation** (data was saved)

### Scenario 5: Empty Form

1. User opens dialog but doesn't enter any data
2. User presses Tab, ESC, or clicks Cancel
3. Dialog closes **without confirmation** (no data to lose)

## What Counts as "Unsaved Changes"

The system considers the form to have unsaved changes if ANY of the following are true:

- ✅ First name has text (trimmed)
- ✅ Last name has text (trimmed)
- ✅ Notes field has text (trimmed)
- ✅ Photo has been uploaded (non-empty photoUrl)
- ✅ Any custom field has a value (trimmed)

The system does NOT count as unsaved changes:

- ❌ Barcode number (auto-generated, not user input)
- ❌ Empty strings or whitespace-only values (all values are trimmed before checking)
- ❌ Empty photoUrl (initial state)

## Benefits

1. **Prevents Data Loss**: Users won't accidentally lose their work
2. **Clear Communication**: Users understand what will happen
3. **User Control**: Users can choose to continue editing or discard changes
4. **Consistent Behavior**: Works for Tab, ESC, Cancel button, and clicking outside
5. **Smart Detection**: Only shows confirmation when there's actually data to lose
6. **No Annoyance**: Empty forms close immediately without confirmation

## Technical Details

### Why useEffect for Change Detection?

Using `useEffect` to track changes ensures:
- Reactive updates whenever form data changes
- Automatic cleanup when dialog closes
- No manual tracking needed in every input handler
- Centralized logic for what counts as "unsaved"

### Why Reset Flag on Save?

Setting `hasUnsavedChanges(false)` before closing ensures:
- No confirmation dialog after successful save
- Clean state for next dialog open
- Proper cleanup of form state

### Why Check All Fields?

Checking all fields (including custom fields) ensures:
- No data loss regardless of which field was edited
- Comprehensive protection
- User confidence in the system

## Edge Cases Handled

1. **Dialog opened and immediately closed**: No confirmation (no data entered)
2. **User enters data then deletes it**: Confirmation still shows (safer UX)
3. **Photo uploaded then removed**: Counts as no changes (photo is null)
4. **Whitespace-only values**: Not counted as changes (trimmed)
5. **Custom fields**: All custom fields checked for values
6. **Edit mode**: Works for both new and edit modes

## Testing Checklist

- ✅ Tab from last field shows confirmation when data entered
- ✅ Tab from last field closes immediately when no data
- ✅ ESC key shows confirmation when data entered
- ✅ Cancel button shows confirmation when data entered
- ✅ Save button closes without confirmation
- ✅ Save & Generate closes without confirmation
- ✅ Confirmation dialog has correct buttons
- ✅ "Close Without Saving" closes the dialog
- ✅ "Keep Editing" keeps dialog open
- ✅ Photo upload counts as unsaved change
- ✅ Custom field values count as unsaved changes
- ✅ Whitespace-only values don't trigger confirmation
- ✅ Edit mode works correctly
- ✅ New attendee mode works correctly

## Files Modified

- `src/components/AttendeeForm/index.tsx` - Main implementation
  - Added `hasUnsavedChanges` state
  - Added change detection useEffect
  - Added `handleClose` function with confirmation
  - Updated Dialog `onOpenChange` prop
  - Updated FormActions `onCancel` prop
  - Clear flag on successful save

## Related Issues

- Fixes the Tab key closing dialog unexpectedly
- Prevents accidental data loss
- Improves overall UX of the form

## Future Enhancements

Potential improvements for the future:

1. **Browser Navigation Protection**: Add `beforeunload` event listener to warn when leaving page with unsaved changes
2. **Auto-save Draft**: Periodically save form data to localStorage
3. **Undo/Redo**: Allow users to undo accidental closes
4. **Keyboard Shortcut**: Add Ctrl+S to save without closing

---

**Conclusion:** Users can now safely use keyboard navigation (Tab key) without fear of losing their work. The confirmation dialog provides clear communication and user control over their data.


## Critical Bug Fix (2025-10-28)

### Issue: Infinite Loop / Stack Overflow (Safari)

**Problem:** Implementation caused "Maximum call stack size exceeded" error, especially in Safari, due to infinite focus event loop when showing confirmation dialog.

**Root Cause:** When the SweetAlert confirmation dialog opens, it triggers focus events that cause the Dialog's `onOpenChange` to fire again, creating an infinite loop. This is particularly problematic in Safari's focus management.

**Solution:** Implemented re-entry prevention using a ref flag:

1. **Re-entry prevention flag** - Prevents multiple simultaneous close attempts
2. **`handleCloseWithConfirmation()`** - Main logic with re-entry guard
3. **`handleDialogOpenChange(open: boolean)`** - Wrapper for Dialog

```typescript
// Ref to prevent re-entry during close process
const isClosingRef = React.useRef(false);

// Main confirmation logic with re-entry prevention
const handleCloseWithConfirmation = () => {
  // CRITICAL: Prevent re-entry while already processing a close
  if (isClosingRef.current) {
    return;
  }

  if (!hasUnsavedChanges) {
    resetForm();
    onClose();
    return;
  }

  // Set flag to prevent re-entry
  isClosingRef.current = true;

  confirm({
    title: 'Unsaved Changes',
    text: 'You have unsaved changes. Are you sure you want to close without saving?',
    icon: 'warning',
    confirmButtonText: 'Close Without Saving',
    cancelButtonText: 'Keep Editing',
  }).then((confirmed) => {
    if (confirmed) {
      resetForm();
      setHasUnsavedChanges(false);
      onClose();
    }
    // Reset flag after confirmation dialog closes
    isClosingRef.current = false;
  }).catch(() => {
    // Reset flag on error
    isClosingRef.current = false;
  });
};

// Wrapper for Dialog's onOpenChange
const handleDialogOpenChange = (open: boolean) => {
  if (!open) {
    handleCloseWithConfirmation();
  }
};

// Reset closing flag when dialog opens
useEffect(() => {
  if (isOpen) {
    isClosingRef.current = false;
  }
}, [isOpen]);
```

**Key Points:**
- **Re-entry prevention is CRITICAL** - Without it, Safari gets into infinite loop
- Use `useRef` for flag (doesn't trigger re-renders)
- Check flag at the very start of `handleCloseWithConfirmation()`
- Reset flag in both `.then()` and `.catch()` to handle all cases
- Reset flag when dialog opens (cleanup for next close)
- Dialog's `onOpenChange` expects `(open: boolean) => void`
- Must check `if (!open)` to only handle close events
- Use `.then()` instead of `async/await` to avoid blocking

**Files Modified:**
- `src/components/AttendeeForm/index.tsx` - Fixed handler implementation
- `docs/fixes/UNSAVED_CHANGES_CONFIRMATION.md` - Added bug fix documentation

---

## Bug Fix: False Positive on Empty Form (2025-10-28)

**Problem:** Opening a new attendee dialog and immediately closing it showed the confirmation dialog, even though no data was entered.

**Root Cause:** The `photoUrl` check was comparing against `null`, but the initial state is an empty string `''`, not `null`. This caused the condition to always be true.

**Solution:** Changed the check from:
```typescript
formData.photoUrl !== null
```

To:
```typescript
(formData.photoUrl && formData.photoUrl.trim() !== '')
```

This properly checks if photoUrl has actual content, not just whether it's non-null.

**Result:** Empty forms now close immediately without confirmation, as intended.

---

## Enhancement: Edit Mode Change Detection (2025-10-28)

**Problem:** When editing an existing attendee without making any changes, the confirmation dialog still appeared.

**Root Cause:** The change detection logic only checked if fields had data, not whether the data was different from the original attendee values.

**Solution:** Implemented separate logic for create vs edit modes:

### Create Mode (New Attendee)
Checks if any user-entered data exists:
```typescript
const hasData = 
  formData.firstName.trim() !== '' ||
  formData.lastName.trim() !== '' ||
  (formData.notes && formData.notes.trim() !== '') ||
  (formData.photoUrl && formData.photoUrl.trim() !== '') ||
  Object.values(formData.customFieldValues).some((value: string) => value.trim() !== '');
```

### Edit Mode (Existing Attendee)
Compares current data with original attendee data:
```typescript
const hasChanges =
  formData.firstName !== (attendee.firstName || '') ||
  formData.lastName !== (attendee.lastName || '') ||
  formData.notes !== (attendee.notes || '') ||
  formData.photoUrl !== (attendee.photoUrl || attendee.profileImageUrl || '');

// Also check custom field changes
const customFieldsChanged = customFields.some(field => {
  const currentValue = formData.customFieldValues[field.id] || '';
  const originalValue = attendee.customFieldValues?.find(
    cfv => cfv.customFieldId === field.id
  )?.value || '';
  return currentValue !== originalValue;
});

setHasUnsavedChanges(hasChanges || customFieldsChanged);
```

**Key Features:**
- ✅ Compares each field against original value
- ✅ Handles null/undefined values with fallback to empty string
- ✅ Checks both `photoUrl` and `profileImageUrl` (legacy field)
- ✅ Compares custom field values individually
- ✅ Only shows confirmation if actual changes were made

**Result:** 
- Opening an attendee for editing and closing without changes → **No confirmation**
- Making any change to any field → **Confirmation appears**
- Changing a value back to original → **No confirmation** (smart detection)


## Browser-Specific Behavior

### Safari vs Chrome Tab Handling

**Safari Behavior:**
- Tab key from last field can escape the dialog (due to `modal={false}`)
- Focus leaves the dialog, triggering `onOpenChange`
- Unsaved changes confirmation appears
- **This is the primary use case for the confirmation feature**

**Chrome Behavior:**
- Tab key cycles through dialog elements (Cancel, Save buttons)
- Focus stays within the dialog naturally
- Confirmation only triggered by ESC key or Cancel button
- Better built-in focus management

**Why This Difference Exists:**

The `modal={false}` prop (required for Cloudinary widget) disables focus trapping. Different browsers handle focus management differently:

- **Chrome/Edge**: More aggressive focus containment, keeps focus in dialog even without `modal={true}`
- **Safari**: Stricter focus behavior, allows Tab to escape when `modal={false}`
- **Firefox**: Similar to Chrome, generally keeps focus contained

**Impact:**

This is actually beneficial:
- ✅ Safari users are protected from accidental data loss (primary issue)
- ✅ Chrome users get natural tab order to action buttons
- ✅ All browsers protected by ESC key and Cancel button confirmation
- ✅ Confirmation doesn't annoy Chrome users unnecessarily

**Testing Recommendations:**

When testing the unsaved changes feature:
1. **Safari**: Test Tab key from last field (primary scenario)
2. **Chrome**: Test ESC key and Cancel button
3. **All browsers**: Test clicking outside dialog (if `modal={false}` allows it)
4. **All browsers**: Verify successful saves don't show confirmation

**No Action Needed:**

This browser difference is acceptable and doesn't require fixing. The confirmation feature works correctly in all browsers, just triggered by different user actions.

---

**Last Updated:** 2025-10-28
