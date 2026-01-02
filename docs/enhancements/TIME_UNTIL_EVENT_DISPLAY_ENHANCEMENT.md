---
title: Time Until Event Display Enhancement
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-01
review_interval_days: 90
related_code: [src/pages/dashboard.tsx]
---

# Time Until Event Display Enhancement

## Overview

Enhanced the dashboard's event countdown display to show dynamic time units (days/hours) and a completed state after the event ends. This provides better user experience by showing more granular time information as the event approaches.

## Problem Statement

The previous "Days Until Event" display had three issues:

1. **Inaccurate on event day**: Showed "0 days" even when the event hadn't started yet (e.g., January 3rd at 6:15 PM would show 0 days at 9 AM)
2. **Limited information**: Only showed days, making it unclear how much time remained when less than 24 hours away
3. **No completion state**: No visual indication that an event had ended
4. **Data format mismatch**: Appwrite returns dates as ISO strings (e.g., `2025-01-03T00:00:00.000Z`), but the code expected simple `YYYY-MM-DD` format, causing NaN errors

## Solution

Replaced the simple day counter with a dynamic time display that:

- Shows **days** when more than 24 hours remain
- Shows **hours** when less than 24 hours remain
- Shows **"Event Ended"** after the event time has passed
- Dynamically updates the label and card styling based on state

## Technical Changes

### 1. Calculation Logic (`src/pages/dashboard.tsx`, lines 1021-1095)

**Old Implementation:**
```typescript
const daysUntilEvent = useMemo(() => {
  // Only compared dates at midnight, ignoring event time
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}, [eventSettings?.eventDate]);
```

**New Implementation:**
```typescript
const timeUntilEvent = useMemo(() => {
  if (!eventSettings?.eventDate) return null;
  
  const dateValue = eventSettings.eventDate;
  const dateStr = typeof dateValue === 'string' ? dateValue : String(dateValue);
  
  // Extract date part from ISO string (e.g., "2025-01-03T00:00:00.000Z" -> "2025-01-03")
  let datePart = dateStr;
  if (dateStr.includes('T')) {
    datePart = dateStr.split('T')[0];
  }
  
  // Validate date format
  const dateParts = datePart.split('-');
  if (dateParts.length !== 3) return null;
  
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10);
  const day = parseInt(dateParts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  
  // Parse event time (format: "HH:MM")
  let eventHours = 23, eventMinutes = 59;
  if (eventSettings?.eventTime) {
    const timeParts = eventSettings.eventTime.split(':');
    if (timeParts.length >= 2) {
      const parsedHours = parseInt(timeParts[0], 10);
      const parsedMinutes = parseInt(timeParts[1], 10);
      if (!isNaN(parsedHours) && !isNaN(parsedMinutes)) {
        eventHours = parsedHours;
        eventMinutes = parsedMinutes;
      }
    }
  }
  
  // Create event datetime in local timezone
  const eventDateTime = new Date(year, month - 1, day, eventHours, eventMinutes, 0, 0);
  const now = new Date();
  const diffMs = eventDateTime.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { value: 'Event Ended', unit: '', isCompleted: true };
  }
  
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  if (diffHours < 24) {
    const hours = Math.ceil(diffHours);
    return { value: hours, unit: hours === 1 ? 'Hour' : 'Hours', isCompleted: false };
  }
  
  // Use Math.round for intuitive display (2.04 days = "2 Days", not "3 Days")
  const days = Math.max(1, Math.round(diffDays));
  return { value: days, unit: days === 1 ? 'Day' : 'Days', isCompleted: false };
}, [eventSettings?.eventDate, eventSettings?.eventTime]);
```

**Key improvements:**
- Handles ISO string format from Appwrite (e.g., `2025-01-03T00:00:00.000Z`)
- Validates date format has exactly 3 parts before parsing
- Uses `parseInt(value, 10)` with explicit radix to prevent parsing issues
- Uses `Math.round()` instead of `Math.ceil()` for more intuitive day counting
- Validates all parsed numeric values to prevent NaN results
- Includes `eventSettings?.eventTime` in dependency array for accurate calculations
- Returns object with `{ value, unit, isCompleted }` for flexible UI rendering
- Properly handles singular/plural forms ("1 Hour" vs "2 Hours")
- Compares against full datetime, not just date at midnight
- Gracefully handles missing or invalid time values

### 2. UI Display (`src/pages/dashboard.tsx`, lines 2971-2989)

**Old Implementation:**
```tsx
<p className="text-sm font-medium text-blue-700 dark:text-blue-300">Days Until Event</p>
<p className="text-4xl font-bold text-blue-900 dark:text-blue-100">
  {daysUntilEvent !== null ? daysUntilEvent : '--'}
</p>
```

**New Implementation:**
```tsx
<Card className={`bg-gradient-to-br ${timeUntilEvent?.isCompleted ? 'from-slate-50 to-slate-100 border-slate-200 dark:from-slate-950/50 dark:to-slate-900/50 dark:border-slate-800/50' : 'from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950/50 dark:to-blue-900/50 dark:border-blue-800/50'} hover:shadow-lg transition-all duration-300 hover:scale-105`}>
  <CardContent className="flex items-center p-4">
    <div className={`p-3 rounded-lg ${timeUntilEvent?.isCompleted ? 'bg-slate-500/20 dark:bg-slate-400/20' : 'bg-blue-500/20 dark:bg-blue-400/20'}`}>
      <Calendar className={`h-8 w-8 ${timeUntilEvent?.isCompleted ? 'text-slate-600 dark:text-slate-400' : 'text-blue-600 dark:text-blue-400'}`} />
    </div>
    <div className="ml-4">
      <p className={`text-sm font-medium ${timeUntilEvent?.isCompleted ? 'text-slate-700 dark:text-slate-300' : 'text-blue-700 dark:text-blue-300'}`}>
        {timeUntilEvent?.isCompleted ? 'Event Status' : `${timeUntilEvent?.unit || 'Time'} Until Event`}
      </p>
      <p className={`text-4xl font-bold ${timeUntilEvent?.isCompleted ? 'text-slate-900 dark:text-slate-100 text-2xl' : 'text-blue-900 dark:text-blue-100'}`}>
        {timeUntilEvent ? timeUntilEvent.value : '--'}
      </p>
    </div>
  </CardContent>
</Card>
```

**Key improvements:**
- Dynamic label: "Days Until Event" / "Hours Until Event" / "Event Status"
- Conditional styling: Blue theme for active countdown, slate gray for completed
- Smaller font size for "Event Ended" text (text-2xl vs text-4xl)
- Responsive to `isCompleted` state for visual feedback

## Display Examples

### More than 24 hours away
- Label: "Days Until Event"
- Value: "5"
- Color: Blue gradient

### Less than 24 hours away
- Label: "Hours Until Event"
- Value: "12"
- Color: Blue gradient

### Event has ended
- Label: "Event Status"
- Value: "Event Ended"
- Color: Slate gray gradient

## Behavior Details

- **Date format handling**: Appwrite returns dates as ISO strings (e.g., `2025-01-03T00:00:00.000Z`). The code extracts the date part and validates the format before parsing.
- **Validation**: Uses `parseInt(value, 10)` with explicit radix and validates array length to prevent NaN errors across different browsers/environments.
- **Rounding**: Uses `Math.round()` for days (more intuitive: 2.04 days = "2 Days") and `Math.ceil()` for hours (conservative: 0.5 hours = "1 Hour")
- **Singular/Plural**: Automatically adjusts unit text ("1 Hour" vs "2 Hours", "1 Day" vs "2 Days")
- **Fallback**: If no event time is set, uses end of day (23:59) for comparison
- **Timezone**: The calculation uses the browser's local timezone. The stored date represents the intended local date of the event.
- **Real-time**: Updates on every render as time passes (consider adding interval if needed for live updates)

## Testing Considerations

When testing this feature, verify:

1. **Day boundary**: Event on Jan 3 at 6:15 PM shows correct countdown at 9 AM on Jan 3
2. **Hour transition**: Transitions from "1 Day" to "24 Hours" at the 24-hour mark
3. **Event completion**: Shows "Event Ended" after event time passes
4. **No event time**: Falls back gracefully when event time is not set
5. **Dark mode**: Colors display correctly in both light and dark themes
6. **Singular/plural**: Correctly shows "1 Hour" and "1 Day" (not "1 Hours" or "1 Days")
7. **ISO date format**: Correctly parses Appwrite's ISO date format (e.g., `2025-01-03T00:00:00.000Z`)
8. **Invalid dates**: Gracefully handles malformed date strings without showing NaN

## Related Files

- `src/pages/dashboard.tsx` - Main implementation
- Event settings stored in Appwrite with `eventDate` (YYYY-MM-DD) and `eventTime` (HH:MM) fields

## Future Enhancements

- Add live countdown updates using `setInterval` for real-time display
- Add timezone awareness for multi-timezone events
- Add countdown animation as event approaches
- Add sound/notification alerts at specific intervals
