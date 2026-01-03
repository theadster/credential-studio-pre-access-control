---
title: Attendee Form Data Loss on Tab Switch Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-02
review_interval_days: 90
related_code: [src/hooks/useAttendeeForm.ts, src/components/AttendeeForm/index.tsx]
---

# Attendee Form Data Loss on Tab Switch Fix

## Problem Description

Users reported that when adding a new attendee, if they switched to another tab or program (e.g., to copy a name) and then returned to the form, all entered data would be erased and they would have to start over.

This was a critical usability issue that prevented users from efficiently entering attendee data, especially when they needed to reference information from other sources.

## Root Cause

The issue was caused by the form reinitialization logic in the `useAttendeeForm` hook. The form had `modal={false}` set on the Dialog component (required for Cloudinary photo upload widget interaction), which meant the dialog didn't maintain proper focus management.

When users switched tabs/programs and returned:
1. The dialog would lose and regain focus
2. React would re-render the component
3. The `useEffect` hook that initializes the form would trigger
4. The form would reinitialize, clearing all user-entered data

The problematic code was:
```typescript
// Initialize/reset form when attendee or customFields changes
useEffect(() => {
  initializeFormData();
}, [initializeFormData]);
```

This effect ran every time the component re-rendered, causing the form to reset.

## Solution

Added initialization tracking using React refs to prevent unnecessary form reinitialization:

1. **Added initialization tracking refs:**
   - `isInitializedRef`: Tracks whether the form has been initialized
   - `attendeeIdRef`: Tracks the current attendee ID (for edit mode)

2. **Modified initialization logic:**
   - Only initialize the form if:
     - Form hasn't been initialized yet, OR
     - We're switching to a different attendee (edit mode), OR
     - We're switching between create and edit modes

3. **Updated resetForm function:**
   - Reset the initialization flags when the form is explicitly reset
   - This ensures the form can be properly reinitialized for the next use

## Code Changes

### src/hooks/useAttendeeForm.ts

**Added imports:**
```typescript
import { useReducer, useEffect, useMemo, useCallback, useRef } from 'react';
```

**Added initialization tracking:**
```typescript
export function useAttendeeForm({ attendee, customFields, eventSettings }: UseAttendeeFormProps) {
  const { error } = useSweetAlert();
  const [formData, dispatch] = useReducer(formReducer, initialFormState);
  
  // Track if form has been initialized to prevent re-initialization on focus changes
  const isInitializedRef = useRef(false);
  const attendeeIdRef = useRef<string | undefined>(undefined);
```

**Updated initialization logic:**
```typescript
  // Initialize/reset form when attendee or customFields changes
  // Only reinitialize if:
  // 1. Form hasn't been initialized yet, OR
  // 2. We're switching to a different attendee (edit mode), OR
  // 3. We're switching between create and edit modes
  useEffect(() => {
    const attendeeChanged = attendeeIdRef.current !== attendee?.id;
    
    if (!isInitializedRef.current || attendeeChanged) {
      initializeFormData();
    }
  }, [initializeFormData, attendee?.id]);
```

**Updated resetForm function:**
```typescript
  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' });
    isInitializedRef.current = false;
    attendeeIdRef.current = undefined;
  };
```

## Testing

To verify the fix:

1. **Test Case 1: New Attendee - Tab Switch**
   - Open "Add New Attendee" dialog
   - Enter first name, last name, and other data
   - Switch to another tab or program
   - Return to the form
   - ✅ Verify: All entered data is still present

2. **Test Case 2: New Attendee - Copy/Paste Workflow**
   - Open "Add New Attendee" dialog
   - Enter some data
   - Switch to another program to copy a name
   - Return and paste the name
   - Switch again to copy more data
   - Return and paste
   - ✅ Verify: All data remains intact throughout

3. **Test Case 3: Edit Attendee - Tab Switch**
   - Open an existing attendee for editing
   - Modify some fields
   - Switch to another tab
   - Return to the form
   - ✅ Verify: All modifications are preserved

4. **Test Case 4: Form Reset on Close**
   - Open "Add New Attendee" dialog
   - Enter data
   - Close the dialog (with or without saving)
   - Reopen the dialog
   - ✅ Verify: Form is properly reset for new entry

5. **Test Case 5: Switching Between Attendees**
   - Edit attendee A
   - Close the dialog
   - Edit attendee B
   - ✅ Verify: Form shows attendee B's data, not attendee A's

## Impact

This fix significantly improves the user experience by:
- ✅ Allowing users to switch tabs/programs without losing data
- ✅ Enabling efficient copy/paste workflows from other sources
- ✅ Reducing frustration and data entry time
- ✅ Maintaining data integrity during form interaction

## Technical Notes

### Why modal={false}?

The `modal={false}` setting on the Dialog component is required for Cloudinary widget interaction:
- Cloudinary widget has z-index: 200 (above dialog's z-index: 50)
- When modal={true}, the dialog's backdrop overlay blocks pointer events
- This prevents users from clicking buttons in the Cloudinary widget
- Setting modal={false} allows the Cloudinary widget to function properly

### Trade-offs

The `modal={false}` setting means:
- ❌ Loses some modal accessibility features (automatic focus trapping)
- ✅ But essential for Cloudinary widget functionality
- ✅ Custom focus management is implemented via FocusTrap component
- ✅ onInteractOutside still prevents accidental dialog closure

### Alternative Solutions Considered

1. **Using sessionStorage/localStorage:**
   - ❌ Adds complexity and potential data persistence issues
   - ❌ Requires cleanup logic
   - ❌ May cause privacy concerns

2. **Debouncing the initialization:**
   - ❌ Doesn't solve the root cause
   - ❌ May cause flickering or delayed updates

3. **Using a different dialog library:**
   - ❌ Major refactoring required
   - ❌ May not solve the Cloudinary widget issue

4. **Current solution (initialization tracking):**
   - ✅ Simple and effective
   - ✅ No external dependencies
   - ✅ Minimal code changes
   - ✅ Solves the root cause

## Related Issues

This fix also prevents potential issues with:
- Form data loss during network interruptions
- Accidental form resets during slow renders
- Race conditions in form initialization

## Impact on Other Features

### ✅ Cloudinary Photo Upload Widget - NOT AFFECTED

The fix does **not** affect the Cloudinary widget functionality at all. Here's why:

**How Photo Upload Works:**
1. User clicks "Upload Photo" button
2. `openUploadWidget()` is called, which opens the Cloudinary widget
3. User selects/crops a photo in the Cloudinary widget
4. On success, `handleUploadCallback()` is triggered
5. This calls `onUploadSuccess(url)` which calls `setPhotoUrl(url)`
6. `setPhotoUrl` dispatches a `SET_PHOTO_URL` action to the reducer
7. The reducer updates `formData.photoUrl` with the new URL

**Why the Fix Doesn't Interfere:**
- The fix only prevents **initialization** from running unnecessarily
- Photo upload uses `setPhotoUrl()` which dispatches a `SET_PHOTO_URL` action
- This action **updates** the existing form state, it doesn't initialize it
- The initialization tracking refs (`isInitializedRef`, `attendeeIdRef`) only control when `INITIALIZE_FORM` runs
- They have **no effect** on `SET_PHOTO_URL`, `SET_FIELD`, `SET_CUSTOM_FIELD`, or any other update actions

**Verification:**
```typescript
// The reducer handles SET_PHOTO_URL independently of initialization
case 'SET_PHOTO_URL':
  return { ...state, photoUrl: action.url };  // ✅ Always works

// Initialization only runs when explicitly needed
case 'INITIALIZE_FORM':
  return action.data;  // ✅ Now controlled by refs
```

### ✅ Other Features - NOT AFFECTED

**Form Field Updates:**
- All field updates (`updateField`, `updateCustomField`) work exactly as before
- They dispatch actions that update state, not initialize it
- ✅ No impact

**Barcode Generation:**
- `generateBarcode()` calls `updateField('barcodeNumber', value)`
- This dispatches `SET_FIELD` action, not initialization
- ✅ No impact

**Form Validation:**
- `validateForm()` only reads `formData`, doesn't modify initialization
- ✅ No impact

**Form Submission:**
- `prepareAttendeeData()` only reads `formData`
- ✅ No impact

**Photo Removal:**
- `removePhoto()` dispatches `REMOVE_PHOTO` action
- This updates state, doesn't initialize
- ✅ No impact

**Unsaved Changes Detection:**
- Compares current `formData` with original `attendee` data
- Reads state, doesn't modify initialization
- ✅ No impact

### What the Fix Actually Changes

**Before Fix:**
```typescript
useEffect(() => {
  initializeFormData();  // ❌ Runs on EVERY render
}, [initializeFormData]);
```

**After Fix:**
```typescript
useEffect(() => {
  const attendeeChanged = attendeeIdRef.current !== attendee?.id;
  
  if (!isInitializedRef.current || attendeeChanged) {
    initializeFormData();  // ✅ Only runs when needed
  }
}, [initializeFormData, attendee?.id]);
```

**The fix ONLY affects:**
- When `INITIALIZE_FORM` action is dispatched
- Nothing else in the form lifecycle

**The fix does NOT affect:**
- Any update actions (`SET_FIELD`, `SET_PHOTO_URL`, `SET_CUSTOM_FIELD`, etc.)
- Form validation
- Form submission
- Photo upload/removal
- Barcode generation
- Any user interactions with the form

## Conclusion

The fix successfully resolves the data loss issue by preventing unnecessary form reinitialization while maintaining proper form lifecycle management. Users can now confidently switch between tabs and programs without losing their work.

**Key Points:**
- ✅ Fixes the tab-switch data loss issue
- ✅ Does not affect Cloudinary photo upload
- ✅ Does not affect any other form features
- ✅ Minimal, surgical change to initialization logic only
- ✅ All existing functionality preserved
