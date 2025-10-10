# Attendee Logging Debug Guide

## Issue

Attendee view logging is not working even though the settings are enabled.

## Debug Logging Added

We've added comprehensive logging to trace the issue. The logs will appear in your **server console** (terminal where `npm run dev` is running), NOT in the browser console.

### Logs Added

#### 1. API Entry Point
```
=== ATTENDEES API GET REQUEST ===
User: [email]
User ID: [id]
Permissions OK, proceeding with attendees fetch...
```

#### 2. Logging Check
```
[Attendees API] shouldLog result: true/false
```

#### 3. Log Creation Attempt
```
[Attendees API] Attempting to create view log...
```

#### 4. Duplicate Check
```
[Attendees API] No duplicate found, creating log entry...
OR
[Attendees API] Duplicate found, skipping log creation
```

#### 5. Success/Failure
```
[Attendees API] Log created successfully: [log_id]
OR
[Attendees API] Error logging view action: [error]
OR
[Attendees API] Logging disabled for systemViewAttendeeList
```

#### 6. API Exit
```
=== ATTENDEES API RETURNING X attendees ===
```

## How to Test

### Step 1: Check Server Console
1. Open your terminal where `npm run dev` is running
2. Clear the console or scroll to the bottom
3. Refresh your dashboard
4. Look for the logs above

### Step 2: What to Look For

**If you see:**
- ✅ `=== ATTENDEES API GET REQUEST ===` - API is being called
- ✅ `shouldLog result: true` - Setting is enabled
- ✅ `Attempting to create view log...` - Trying to log
- ✅ `Log created successfully` - Logging worked!
- ❌ `shouldLog result: false` - Setting is disabled
- ❌ `Duplicate found` - Deduplication is blocking it
- ❌ `Error logging view action` - There's an error

**If you DON'T see any logs:**
- The API isn't being called at all
- Check browser network tab to see if request is made
- Check for errors in browser console

### Step 3: Check Individual Attendee View

1. Click on an attendee to view details
2. Check server console for:
```
[Attendee View API] shouldLog result: true/false
[Attendee View API] Creating view log for attendee: [id]
[Attendee View API] Log created successfully: [log_id]
```

## Common Issues

### Issue 1: Setting is Disabled
**Symptom:** `shouldLog result: false`

**Solution:** 
1. Go to Activity Logs tab
2. Click Log Settings
3. Enable "View Attendee List" toggle
4. Save settings
5. Wait 60 seconds (cache duration)
6. Try again

### Issue 2: Duplicate Detection
**Symptom:** `Duplicate found, skipping log creation`

**Cause:** You viewed attendees within the last 5 seconds

**Solution:** Wait 5+ seconds and try again

### Issue 3: Permission Error
**Symptom:** `Permission denied for user: [email]`

**Solution:** User doesn't have attendees read permission

### Issue 4: API Not Called
**Symptom:** No logs in server console at all

**Check:**
1. Browser Network tab - is `/api/attendees` called?
2. Browser Console - any JavaScript errors?
3. Are you on the Attendees tab?

## Settings to Check

### Log Settings (Database)
Check in Appwrite Console:
- Collection: `log_settings`
- Field: `systemViewAttendeeList` should be `true`
- Field: `attendeeView` should be `true` (for individual view)

### Cache
The log settings are cached for 60 seconds. After changing settings:
1. Wait 60 seconds, OR
2. Restart the dev server

## Files Modified

- ✅ `src/pages/api/attendees/index.ts` - Added debug logging
- ✅ `src/pages/api/attendees/[id].ts` - Added debug logging
- ✅ `docs/fixes/ATTENDEE_LOGGING_DEBUG.md` - This guide

## Next Steps

1. **Refresh dashboard** and check server console
2. **Share the console output** so we can diagnose the issue
3. Based on the logs, we'll know exactly what's wrong

The debug logs will tell us:
- Is the API being called?
- Is the setting enabled?
- Is logging being attempted?
- Is it succeeding or failing?
- What error (if any) is occurring?
