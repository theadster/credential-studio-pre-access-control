# Attendee View Logging - Marked as Inoperable

## Summary

Attendee view logging has been temporarily disabled and marked as inoperable in the UI while we investigate the underlying issue.

## Changes Made

### 1. API Endpoints - Logging Disabled

**Attendees List API** (`src/pages/api/attendees/index.ts`)
- Removed all debug console.log statements
- Commented out the `systemViewAttendeeList` logging code
- Added TODO comment for future implementation
- Kept deduplication logic structure for when we re-enable it

**Individual Attendee API** (`src/pages/api/attendees/[id].ts`)
- Removed all debug console.log statements
- Commented out the `attendeeView` logging code
- Added TODO comment for future implementation

### 2. Log Settings UI - Marked as Inoperable

**Log Settings Dialog** (`src/components/LogSettingsDialog.tsx`)

Both attendee view settings are now:
- ✅ **Visually disabled** - Reduced opacity (50%)
- ✅ **Labeled as inoperable** - Shows "(Inoperable)" text
- ✅ **Switch disabled** - Cannot be toggled
- ✅ **Always shows as OFF** - Checked state forced to false

#### UI Changes:

**Before:**
```tsx
<Label htmlFor="attendeeView">View Attendee</Label>
<Switch
  checked={settings.attendeeView}
  onCheckedChange={(checked) => updateSetting('attendeeView', checked)}
/>
```

**After:**
```tsx
<Label htmlFor="attendeeView" className="text-gray-500">
  View Attendee <span className="text-xs">(Inoperable)</span>
</Label>
<Switch
  checked={false}
  disabled={true}
/>
```

## What Users Will See

In the Log Settings dialog:

### Attendee Operations Section
- Create Attendee ✓ (working)
- Update Attendee ✓ (working)
- Delete Attendee ✓ (working)
- **View Attendee (Inoperable)** ← Grayed out, disabled
- Bulk Delete ✓ (working)
- Import ✓ (working)
- Export ✓ (working)

### System Operations Section
- View Event Settings ✓ (working)
- **View Attendee List (Inoperable)** ← Grayed out, disabled
- View Roles List ✓ (working)
- View Users List ✓ (working)

## Working Logging

All other logging continues to work normally:
- ✅ Event Settings view
- ✅ Users List view
- ✅ Roles List view
- ✅ Attendee create/update/delete
- ✅ All other operations

## Code Preserved for Future Fix

The logging code structure has been preserved (commented out) so it can be easily re-enabled once the underlying issue is resolved:

```typescript
// TODO: Attendee list view logging is currently inoperable
// Keeping the code structure for future implementation
// if (await shouldLog('systemViewAttendeeList')) {
//   // Check for recent duplicate logs (within last 5 seconds)
//   // Create log entry if no duplicate found
// }
```

## Files Modified

1. ✅ `src/pages/api/attendees/index.ts` - Disabled logging, removed debug code
2. ✅ `src/pages/api/attendees/[id].ts` - Disabled logging, removed debug code
3. ✅ `src/components/LogSettingsDialog.tsx` - Marked settings as inoperable in UI
4. ✅ `docs/fixes/ATTENDEE_VIEW_LOGGING_DISABLED.md` - This documentation

## Future Investigation

When we're ready to fix this, we need to investigate:
1. Why `shouldLog('systemViewAttendeeList')` isn't working
2. Why `shouldLog('attendeeView')` isn't working
3. Whether there's a database/cache issue
4. Whether the settings are being saved correctly

The deduplication logic is already in place and ready to use once logging is re-enabled.

## Related Documentation

- `docs/fixes/DUPLICATE_VIEW_LOGS_FIX.md` - Deduplication implementation for other views
- `docs/fixes/ATTENDEE_VIEW_LOGGING_SETUP.md` - Original setup instructions (now obsolete)
- `docs/fixes/ATTENDEE_LOGGING_DEBUG.md` - Debug guide (now obsolete)
