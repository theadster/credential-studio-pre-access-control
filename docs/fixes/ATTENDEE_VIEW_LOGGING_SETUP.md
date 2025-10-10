# Attendee View Logging Setup

## Issue

Attendee list views are not being logged, even though Event Settings, Roles, and Users views are being logged.

## Root Cause

The `systemViewAttendeeList` log setting is **disabled by default** and needs to be manually enabled in the Log Settings dialog.

All "view" log settings are disabled by default:
- `systemViewEventSettings: false` ← You enabled this
- `systemViewAttendeeList: false` ← **This needs to be enabled**
- `systemViewRolesList: false` ← You enabled this
- `systemViewUsersList: false` ← You enabled this

## Solution

Enable the "View Attendee List" setting in the Log Settings dialog.

### Steps to Enable

1. **Open Log Settings**:
   - Go to Activity Logs tab
   - Click the "Log Settings" button (gear icon)

2. **Find System Operations Section**:
   - Scroll to the "System Operations" section
   - Look for "View Attendee List" toggle

3. **Enable the Setting**:
   - Toggle "View Attendee List" to ON (blue)
   - Click "Save Settings"

4. **Verify**:
   - Navigate to Attendees tab
   - Check Activity Logs
   - Should now see "Attendees List" view logs

## Log Settings UI Location

The toggle is in the Log Settings dialog under **System Operations**:

```
System Operations
├─ View Event Settings      [Toggle]
├─ View Attendee List       [Toggle] ← Enable this one
├─ View Roles List          [Toggle]
└─ View Users List          [Toggle]
```

## Technical Details

### Default Settings
All view logging is disabled by default in `src/lib/logSettings.ts`:

```typescript
const DEFAULT_LOG_SETTINGS = {
  systemViewEventSettings: false,
  systemViewAttendeeList: false,  // ← Disabled by default
  systemViewRolesList: false,
  systemViewUsersList: false
};
```

### API Implementation
The attendees API checks this setting before logging:

```typescript
// src/pages/api/attendees/index.ts (line 212)
if (await shouldLog('systemViewAttendeeList')) {
  // Create log entry for viewing attendees list
}
```

### Deduplication
The attendee view logging includes deduplication (within 5 seconds) to prevent duplicate logs on quick refreshes or tab switches.

## Why Other Views Are Logged

If you're seeing logs for Event Settings, Roles, and Users, it means you previously enabled those settings in the Log Settings dialog. The same needs to be done for Attendees.

## Alternative: Enable by Default

If you want attendee view logging enabled by default for all users, you can modify the default settings:

### Option 1: Change Default in Code
Edit `src/lib/logSettings.ts`:

```typescript
const DEFAULT_LOG_SETTINGS = {
  // ... other settings
  systemViewAttendeeList: true,  // Change from false to true
  // ... other settings
};
```

### Option 2: Database Update
If you have existing log settings in the database, update them directly in Appwrite:

1. Go to Appwrite Console
2. Navigate to your database
3. Find the `log_settings` collection
4. Update the document
5. Set `systemViewAttendeeList` to `true`

## Summary

✅ **Attendee view logging is implemented** - Code is working correctly  
✅ **Deduplication is in place** - Won't create duplicate logs  
⚠️ **Setting is disabled** - Needs to be enabled in Log Settings dialog  

The logging functionality is ready to use, it just needs to be turned on via the UI toggle.
