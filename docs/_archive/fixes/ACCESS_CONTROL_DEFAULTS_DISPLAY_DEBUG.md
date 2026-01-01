# Access Control Defaults Display Debugging

## Issue
Access Control default values are being saved to the database correctly, but they disappear when refreshing the Event Settings form. The values don't display in the form fields after a page refresh.

## Investigation Steps

### 1. Data Flow
```
Database (JSON string)
  ↓
API GET /api/event-settings
  ↓ transformEventSettingsResponse() - parses JSON string
EventSettings object
  ↓
Dashboard (passes to EventSettingsForm)
  ↓
useEventSettingsForm hook
  ↓ parseEventSettings() - should preserve accessControlDefaults
FormData state
  ↓
AccessControlTab component
  ↓
Form fields display values
```

### 2. Potential Issues

**Issue A: API not parsing JSON**
- `accessControlDefaults` stored as JSON string in database
- `transformEventSettingsResponse()` should parse it
- Check: Is the parsing working correctly?

**Issue B: Dashboard not passing defaults**
- Dashboard creates eventSettings object for AttendeeForm
- Check: Is `accessControlDefaults` included in the object?
- **FIX APPLIED**: Added `accessControlDefaults` to the eventSettings object passed to AttendeeForm

**Issue C: Form not parsing defaults**
- `parseEventSettings()` might not handle string values
- **FIX APPLIED**: Added defensive JSON parsing in `parseEventSettings()`

**Issue D: Form not initializing with defaults**
- `useAttendeeForm` might not depend on eventSettings changes
- **FIX APPLIED**: Added `eventSettings` to dependency array

### 3. Debugging Added

**Console Logs in EventSettingsForm:**
```typescript
console.log('[EventSettingsForm] Raw eventSettings:', eventSettings);
console.log('[EventSettingsForm] accessControlDefaults type:', typeof eventSettings.accessControlDefaults);
console.log('[EventSettingsForm] accessControlDefaults value:', eventSettings.accessControlDefaults);
console.log('[EventSettingsForm] Parsed eventSettings:', parsed);
console.log('[EventSettingsForm] Parsed accessControlDefaults:', parsed.accessControlDefaults);
```

**Console Logs in useAttendeeForm:**
```typescript
console.log('[useAttendeeForm] getInitialFormState called with:', {
  accessControlEnabled: eventSettings?.accessControlEnabled,
  accessControlDefaults: eventSettings?.accessControlDefaults,
  accessControlTimeMode: eventSettings?.accessControlTimeMode
});
console.log('[useAttendeeForm] Applying defaults:', defaults);
console.log('[useAttendeeForm] Final values:', { accessEnabled, validFrom, validUntil });
```

### 4. What to Check in Browser Console

When opening Event Settings form:
1. Check if `accessControlDefaults` is present in raw eventSettings
2. Check if it's a string or object
3. Check if parsing is successful
4. Check if formData contains the parsed values

When opening Add Attendee form:
1. Check if eventSettings is passed with accessControlDefaults
2. Check if defaults are being applied
3. Check final values being set

### 5. Expected Behavior

**Saving:**
- ✅ User sets defaults in Event Settings
- ✅ Values saved as JSON string in database
- ✅ Confirmed working (data is in database)

**Loading:**
- ❓ API fetches data and parses JSON string
- ❓ Dashboard receives parsed object
- ❓ EventSettingsForm displays values in fields
- ❌ Currently: Values disappear on refresh

**Applying to New Attendee:**
- ❓ AttendeeForm receives eventSettings with defaults
- ❓ useAttendeeForm applies defaults to form state
- ❓ AccessControlFields display pre-filled values
- ❌ Currently: Fields are empty

### 6. Files Modified

**For Event Settings Display:**
- `src/components/EventSettingsForm/utils.ts` - Added JSON parsing in `parseEventSettings()`
- `src/components/EventSettingsForm/useEventSettingsForm.ts` - Added debug logging

**For Attendee Form Defaults:**
- `src/pages/dashboard.tsx` - Added `accessControlDefaults` to eventSettings prop
- `src/hooks/useAttendeeForm.ts` - Added eventSettings to dependency array, added debug logging

### 7. Next Steps

1. **Open Event Settings form** and check console logs
2. **Identify where the data is lost** in the flow
3. **Fix the specific issue** based on console output
4. **Remove debug logging** once issue is resolved

### 8. Possible Root Causes

**Most Likely:**
- `transformEventSettingsResponse()` is parsing the JSON, but the parsed object isn't being used correctly
- The form is reading from a different source than where the data is stored

**Less Likely:**
- Database is storing data incorrectly (we confirmed it's there)
- API is not returning the field at all

**To Verify:**
- Check Network tab in browser DevTools
- Look at the response from GET `/api/event-settings`
- Confirm `accessControlDefaults` is in the response
- Confirm it's an object, not a string

## Date
December 7, 2025
