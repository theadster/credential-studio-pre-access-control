# Access Control Validation Fix

## Issue
When saving Access Control default values from the Event Settings form, users encountered a "Validation error" that prevented the settings from being saved.

## Root Cause
The `validateEventSettings()` function was requiring all core event fields (`eventName`, `eventDate`, `eventLocation`) to be present and non-empty for ALL requests, including partial updates. When updating only the Access Control defaults, these fields were either missing or empty, causing validation to fail.

## Solution
Modified the validation logic to support partial updates:

1. **Updated `validateEventSettings()` function** (`src/lib/validation.ts`):
   - Added optional `isUpdate` parameter (defaults to `false`)
   - When `isUpdate=true`, required fields are only validated if they're present in the update payload
   - This allows partial updates (e.g., only updating `accessControlDefaults`) while still validating fields that are provided

2. **Updated API endpoint** (`src/pages/api/event-settings/index.ts`):
   - PUT handler now passes `isUpdate: true` to validation
   - POST handler continues to use strict validation (all required fields must be present)

3. **Updated frontend form** (`src/components/EventSettingsForm/useEventSettingsForm.ts`):
   - Determines if operation is an update based on whether `eventSettings` exists
   - Passes appropriate `isUpdate` flag to validation

## Changes Made

### Files Modified
- `src/lib/validation.ts` - Added `isUpdate` parameter to `validateEventSettings()`
- `src/pages/api/event-settings/index.ts` - Pass `isUpdate: true` for PUT requests
- `src/components/EventSettingsForm/useEventSettingsForm.ts` - Determine and pass `isUpdate` flag
- `src/__tests__/lib/validation.test.ts` - Added tests for partial update validation

### Validation Behavior

**Before (Strict Validation):**
```typescript
// Always required, even for updates
validateEventSettings({ accessControlDefaults: {...} })
// ❌ Error: "eventName is required"
```

**After (Smart Validation):**
```typescript
// Create (isUpdate=false) - strict validation
validateEventSettings({ accessControlDefaults: {...} }, false)
// ❌ Error: "eventName is required"

// Update (isUpdate=true) - partial updates allowed
validateEventSettings({ accessControlDefaults: {...} }, true)
// ✅ Valid - only validates fields that are present

// Update with empty required field - still validates
validateEventSettings({ eventName: '', accessControlDefaults: {...} }, true)
// ❌ Error: "eventName is required"
```

## Testing
- All existing validation tests pass
- Added 4 new tests for partial update scenarios:
  - Partial updates allowed when `isUpdate=true`
  - Required fields still enforced when `isUpdate=false`
  - Present required fields validated even in update mode
  - Access Control defaults can be updated independently

## Impact
- ✅ Users can now save Access Control default values without errors
- ✅ Maintains strict validation for new event creation
- ✅ Allows partial updates for any event settings field
- ✅ Still validates fields that are provided in updates
- ✅ No breaking changes to existing functionality

## Date
December 7, 2025
