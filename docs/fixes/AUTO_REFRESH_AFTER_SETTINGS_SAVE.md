# Fix: Auto-Refresh Attendees After Custom Field Settings Save

## Issue

When saving custom field settings (including visibility changes):
- The settings would save successfully
- But the attendees page wouldn't reflect the changes immediately
- User had to manually refresh the browser to see the updated field visibility

## Root Cause

The `handleSaveEventSettings` function was only refreshing the event settings state, but not the attendees list. Since the attendees display depends on the custom field visibility settings, both need to be refreshed.

## Solution

Added a call to `refreshAttendees()` after saving event settings.

**File**: `src/pages/dashboard.tsx`

**Before:**
```typescript
await refreshEventSettings();

toast({
  title: "Success",
  description: eventSettings ? "Event settings updated successfully!" : "Event settings created successfully!",
});
```

**After:**
```typescript
await refreshEventSettings();

// Also refresh attendees to pick up custom field visibility changes
await refreshAttendees();

toast({
  title: "Success",
  description: eventSettings ? "Event settings updated successfully!" : "Event settings created successfully!",
});
```

## How It Works

When you save event settings:
1. ✅ Settings are saved to the database
2. ✅ `refreshEventSettings()` fetches the latest event settings (including custom fields)
3. ✅ `refreshAttendees()` fetches the latest attendees list
4. ✅ The attendees list re-renders with the updated custom field visibility
5. ✅ Changes are immediately visible without manual refresh

## User Experience

**Before:**
1. Toggle "Show on Main Page" to OFF
2. Save custom field settings
3. Return to Attendees tab
4. Field still visible (stale data)
5. Manual browser refresh required

**After:**
1. Toggle "Show on Main Page" to OFF
2. Save custom field settings
3. Return to Attendees tab
4. Field immediately hidden ✅
5. No manual refresh needed ✅

## Additional Benefits

This also ensures that any other custom field changes (name, type, options, etc.) are immediately reflected in the attendees list without requiring a manual refresh.

## Real-Time Subscription

The dashboard already has a real-time subscription that listens for custom field changes:

```typescript
useRealtimeSubscription({
  channels: [
    `databases.${dbId}.collections.${customFieldsCollectionId}.documents`
  ],
  callback: useCallback((response: any) => {
    setTimeout(() => refreshEventSettings(), 1000);
  }, [refreshEventSettings])
});
```

However, this has a 1-second delay and only refreshes event settings. The explicit refresh in `handleSaveEventSettings` provides immediate feedback.

## Files Modified

- `src/pages/dashboard.tsx` - Added `refreshAttendees()` call after saving event settings

## Testing

After applying this fix:
1. ✅ Open Event Settings
2. ✅ Toggle a custom field's "Show on Main Page" to OFF
3. ✅ Save and close the dialog
4. ✅ Return to Attendees tab
5. ✅ Field is immediately hidden (no manual refresh needed)
6. ✅ Toggle back to ON and save
7. ✅ Field immediately reappears

## Date

2025-10-10
