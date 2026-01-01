# Access Control Defaults Application Fix

## Issue
After saving Access Control default values in the Event Settings, these defaults were not being applied when creating a new attendee. The form fields remained empty instead of being pre-filled with the configured defaults.

## Root Cause
The `useAttendeeForm` hook did not include access control fields (`validFrom`, `validUntil`, `accessEnabled`) in its form state management. The AttendeeForm component was managing these fields separately with `useState`, and the initialization logic was not properly applying the defaults from event settings.

## Solution

### 1. Enhanced `useAttendeeForm` Hook
Added access control fields to the form state and implemented default value application:

**Changes to `src/hooks/useAttendeeForm.ts`:**

- Added access control fields to `FormData` interface:
  ```typescript
  interface FormData {
    // ... existing fields
    validFrom: string;
    validUntil: string;
    accessEnabled: boolean;
  }
  ```

- Created `getInitialFormState()` function that applies defaults:
  ```typescript
  const getInitialFormState = (eventSettings?: EventSettings): FormData => {
    let accessEnabled = true;
    let validFrom = '';
    let validUntil = '';

    if (eventSettings?.accessControlEnabled && eventSettings.accessControlDefaults) {
      const defaults = eventSettings.accessControlDefaults;
      
      // Apply default access status
      if (defaults.accessEnabled !== undefined) {
        accessEnabled = defaults.accessEnabled;
      }

      // Apply default validFrom
      if (defaults.validFromUseToday) {
        // Use today's date
        const today = new Date();
        if (eventSettings.accessControlTimeMode === 'date_time') {
          validFrom = today.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
        } else {
          validFrom = today.toISOString().slice(0, 10); // YYYY-MM-DD
        }
      } else if (defaults.validFrom) {
        validFrom = defaults.validFrom;
      }

      // Apply default validUntil
      if (defaults.validUntil) {
        validUntil = defaults.validUntil;
      }
    }

    return { /* ... all fields including access control */ };
  };
  ```

- Updated form initialization to use defaults for new attendees
- Updated `prepareAttendeeData()` to include access control fields
- Updated `updateField()` to accept boolean values for `accessEnabled`

### 2. Simplified AttendeeForm Component
Removed duplicate state management and used form data from the hook:

**Changes to `src/components/AttendeeForm/index.tsx`:**

- Removed separate `useState` for access control fields:
  ```typescript
  // REMOVED:
  const [validFrom, setValidFrom] = useState<string | null>(...);
  const [validUntil, setValidUntil] = useState<string | null>(...);
  const [accessEnabled, setAccessEnabled] = useState<boolean>(...);
  ```

- Removed manual initialization `useEffect` (now handled by hook)

- Updated `AccessControlFields` to use `formData`:
  ```typescript
  <AccessControlFields
    validFrom={formData.validFrom}
    validUntil={formData.validUntil}
    accessEnabled={formData.accessEnabled}
    onValidFromChange={(value) => updateField('validFrom', value || '')}
    onValidUntilChange={(value) => updateField('validUntil', value || '')}
    onAccessEnabledChange={(value) => updateField('accessEnabled', value)}
  />
  ```

- Simplified save handlers (no need to merge access control fields manually)

## Default Application Logic

### For New Attendees
When creating a new attendee, defaults are applied based on event settings:

1. **Access Status**: Uses `accessControlDefaults.accessEnabled` (defaults to `true` if not set)

2. **Valid From**:
   - If `validFromUseToday` is `true`: Uses today's date
     - Date-only mode: `YYYY-MM-DD`
     - Date-time mode: `YYYY-MM-DDTHH:mm` (current time)
   - Otherwise: Uses `accessControlDefaults.validFrom` or empty string

3. **Valid Until**: Uses `accessControlDefaults.validUntil` or empty string

### For Existing Attendees
When editing an attendee, the existing values are preserved:
- `validFrom`: Attendee's current value
- `validUntil`: Attendee's current value
- `accessEnabled`: Attendee's current value (defaults to `true` if undefined)

## Files Modified

### Core Logic
- `src/hooks/useAttendeeForm.ts` - Added access control fields to form state and default application logic

### UI Components
- `src/components/AttendeeForm/index.tsx` - Removed duplicate state management, connected to form data

## Testing Scenarios

### ✅ Scenario 1: New Attendee with Defaults
1. Configure access control defaults in Event Settings
2. Open "Add Attendee" form
3. **Expected**: Access control fields are pre-filled with defaults
4. **Result**: ✅ Fields show configured defaults

### ✅ Scenario 2: "Use Today's Date" Default
1. Enable "Always use today's date" for Valid From
2. Open "Add Attendee" form
3. **Expected**: Valid From shows today's date
4. **Result**: ✅ Shows current date in correct format

### ✅ Scenario 3: Edit Existing Attendee
1. Edit an attendee with existing access control values
2. **Expected**: Shows attendee's current values, not defaults
3. **Result**: ✅ Preserves existing values

### ✅ Scenario 4: Access Control Disabled
1. Disable access control in Event Settings
2. Open "Add Attendee" form
3. **Expected**: Access control fields not shown
4. **Result**: ✅ Fields hidden correctly

## Impact
- ✅ Access control defaults are now properly applied to new attendees
- ✅ "Use today's date" option works correctly
- ✅ Existing attendee values are preserved when editing
- ✅ Simplified code - single source of truth for form state
- ✅ No breaking changes to existing functionality
- ✅ Consistent behavior across create and edit modes

## Related Fixes
- [ACCESS_CONTROL_VALIDATION_FIX.md](./ACCESS_CONTROL_VALIDATION_FIX.md) - Fixed validation to allow partial updates
- [ACCESS_CONTROL_DEFAULTS_JSON_FIX.md](./ACCESS_CONTROL_DEFAULTS_JSON_FIX.md) - Fixed JSON storage format

## Date
December 7, 2025
