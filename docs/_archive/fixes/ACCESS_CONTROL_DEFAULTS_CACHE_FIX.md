# Access Control Defaults Cache Fix

## Issue
Access Control defaults saved in Event Settings were not being applied when creating a new attendee via the "Add New Attendee" dialog.

## Root Cause
The event settings API was caching the response data BEFORE transformation, but sending the TRANSFORMED response to the client. This caused a mismatch:

1. Fresh API calls: `accessControlDefaults` was properly parsed from string to object by `transformEventSettingsResponse()`
2. Cached API calls: `accessControlDefaults` remained as a string because the untransformed data was cached

When the dashboard received cached data with `accessControlDefaults` as a string, the `useAttendeeForm` hook couldn't apply the defaults because it expected an object.

## Fix
Changed the cache to store the TRANSFORMED response instead of the raw data:

```typescript
// BEFORE (incorrect):
eventSettingsCache.set(cacheKey, eventSettingsWithFields);
const transformedResponse = transformEventSettingsResponse(eventSettingsWithFields);
res.status(200).json(transformedResponse);

// AFTER (correct):
const transformedResponse = transformEventSettingsResponse(eventSettingsWithFields);
eventSettingsCache.set(cacheKey, transformedResponse);
res.status(200).json(transformedResponse);
```

## Files Modified
- `src/pages/api/event-settings/index.ts` - Fixed cache to store transformed response
- `src/hooks/useAttendeeForm.ts` - Added enhanced debug logging
- `src/components/AttendeeForm/index.tsx` - Added debug logging for form data

## Debug Logging Added
The following console logs were added to help trace the data flow:

1. `[AttendeeForm] eventSettings received:` - Shows what eventSettings the form receives
2. `[AttendeeForm] formData after hook:` - Shows the form data values after hook initialization
3. `[useAttendeeForm] getInitialFormState called with:` - Shows the eventSettings passed to initial state
4. `[useAttendeeForm] shouldApplyDefaults:` - Shows whether defaults should be applied
5. `[useAttendeeForm] Applying defaults:` - Shows the defaults being applied
6. `[useAttendeeForm] Final values:` - Shows the final access control values

## Testing
After this fix:
1. Clear browser cache or wait for cache to expire (5 minutes)
2. Open Event Settings and configure Access Control defaults
3. Save the settings
4. Click "Add New Attendee"
5. The Access Control fields should now show the configured defaults

## Related Fixes
- ACCESS_CONTROL_VALIDATION_FIX.md - Fixed validation error when saving defaults
- ACCESS_CONTROL_DEFAULTS_JSON_FIX.md - Fixed malformed JSON storage
- ACCESS_CONTROL_DEFAULTS_APPLICATION_FIX.md - Initial attempt to fix defaults application
