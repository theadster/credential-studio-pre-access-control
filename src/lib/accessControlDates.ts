/**
 * Access Control Date Utilities
 * 
 * Provides date interpretation functions for the Access Control feature.
 * Handles conversion between date-only and date-time modes based on event settings.
 * 
 * @see .kiro/specs/access-control-feature/design.md
 * @see Requirements 4.3, 4.4, 4.5, 4.6
 */

/**
 * Time mode for access control date interpretation
 */
export type AccessControlTimeMode = 'date_only' | 'date_time';

/**
 * Converts a date to the start of day (00:00:00.000) in the specified timezone.
 * Used for validFrom dates in date-only mode.
 * 
 * @param date - ISO date string or Date object
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns ISO string representing midnight (00:00:00.000) in UTC
 * 
 * @example
 * // For timezone 'America/New_York' (UTC-5 in winter)
 * startOfDay('2024-03-15', 'America/New_York')
 * // Returns: '2024-03-15T05:00:00.000Z' (midnight EST in UTC)
 */
export function startOfDay(date: string | Date, timezone: string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(inputDate.getTime())) {
    throw new Error('Invalid date provided to startOfDay');
  }
  
  // Format the date in the target timezone to get the local date components
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  // Get the date string in YYYY-MM-DD format for the target timezone
  const localDateStr = formatter.format(inputDate);
  
  // Find the UTC time that corresponds to midnight in the target timezone
  // by using a binary search approach or direct calculation
  return findUtcTimeForLocalTime(localDateStr, '00:00:00.000', timezone);
}

/**
 * Converts a date to the end of day (23:59:59.999) in the specified timezone.
 * Used for validUntil dates in date-only mode.
 * 
 * @param date - ISO date string or Date object
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns ISO string representing 23:59:59.999 in UTC
 * 
 * @example
 * // For timezone 'America/New_York' (UTC-5 in winter)
 * endOfDay('2024-03-15', 'America/New_York')
 * // Returns: '2024-03-16T04:59:59.999Z' (11:59:59.999 PM EST in UTC)
 */
export function endOfDay(date: string | Date, timezone: string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(inputDate.getTime())) {
    throw new Error('Invalid date provided to endOfDay');
  }
  
  // Format the date in the target timezone to get the local date components
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  // Get the date string in YYYY-MM-DD format for the target timezone
  const localDateStr = formatter.format(inputDate);
  
  // Find the UTC time that corresponds to 23:59:59.999 in the target timezone
  return findUtcTimeForLocalTime(localDateStr, '23:59:59.999', timezone);
}

/**
 * Finds the UTC time that corresponds to a specific local time in a timezone.
 * This handles DST transitions correctly by using an iterative approach.
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:mm:ss.sss format
 * @param timezone - IANA timezone string
 * @returns ISO string in UTC
 */
function findUtcTimeForLocalTime(dateStr: string, timeStr: string, timezone: string): string {
  // Parse the time components
  const [timePart, msPart] = timeStr.split('.');
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  const milliseconds = msPart ? parseInt(msPart, 10) : 0;
  
  // Parse the date components
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Validate parsed components
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes) || isNaN(seconds) || isNaN(milliseconds)) {
    throw new Error('Invalid date or time components');
  }
  
  // Create a formatter to check local time at any UTC time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
  } as Intl.DateTimeFormatOptions);
  
  // Helper to get local time components from a UTC date
  const getLocalComponents = (utcDate: Date) => {
    const parts = formatter.formatToParts(utcDate);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
    return {
      year: parseInt(getPart('year'), 10),
      month: parseInt(getPart('month'), 10),
      day: parseInt(getPart('day'), 10),
      hour: parseInt(getPart('hour'), 10),
      minute: parseInt(getPart('minute'), 10),
      second: parseInt(getPart('second'), 10),
      millisecond: parseInt(getPart('fractionalSecond') || '0', 10),
    };
  };
  
  // Start with a rough estimate: treat the local time as UTC
  let utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds));
  
  // Iterate to find the correct UTC time (usually converges in 1-2 iterations)
  for (let i = 0; i < 3; i++) {
    const local = getLocalComponents(utcGuess);
    
    // Calculate the difference between target and actual local time (in ms)
    const targetTimeMs = ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
    const actualTimeMs = ((local.hour * 60 + local.minute) * 60 + local.second) * 1000 + local.millisecond;
    
    // Calculate day difference as pure calendar days (not affected by local timezone)
    // Use Date.UTC to ensure consistent day calculation
    const targetDayNum = Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000);
    const actualDayNum = Date.UTC(local.year, local.month - 1, local.day) / (24 * 60 * 60 * 1000);
    const dayDiff = targetDayNum - actualDayNum;
    const dayDiffMs = dayDiff * 24 * 60 * 60 * 1000;
    
    // Total adjustment needed
    const adjustmentMs = (targetTimeMs - actualTimeMs) + dayDiffMs;
    
    // If we're close enough (within 1 ms), we're done
    if (Math.abs(adjustmentMs) <= 1) {
      break;
    }
    
    // Apply the adjustment
    utcGuess = new Date(utcGuess.getTime() + adjustmentMs);
  }
  
  return utcGuess.toISOString();
}

/**
 * Formats a date for display based on the time mode setting.
 * 
 * @param date - ISO date string or null
 * @param mode - 'date_only' or 'date_time'
 * @param timezone - IANA timezone string for display
 * @returns Formatted date string or empty string if null
 * 
 * @example
 * formatForDisplay('2024-03-15T10:30:00.000Z', 'date_only', 'America/New_York')
 * // Returns: 'Mar 15, 2024'
 * 
 * formatForDisplay('2024-03-15T10:30:00.000Z', 'date_time', 'America/New_York')
 * // Returns: 'Mar 15, 2024, 6:30 AM'
 */
export function formatForDisplay(
  date: string | null,
  mode: AccessControlTimeMode,
  timezone: string
): string {
  if (!date) {
    return '';
  }
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  if (mode === 'date_time') {
    options.hour = 'numeric';
    options.minute = '2-digit';
    options.hour12 = true;
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
}

/**
 * Parses a date input for storage based on the time mode setting.
 * 
 * In date-only mode:
 * - validFrom dates are interpreted as start of day (00:00:00)
 * - validUntil dates are interpreted as end of day (23:59:59.999)
 * 
 * In date-time mode:
 * - The exact timestamp is preserved without modification
 * 
 * @param date - Date string from user input
 * @param mode - 'date_only' or 'date_time'
 * @param timezone - IANA timezone string for interpretation
 * @param isEndDate - Whether this is a validUntil date (affects date-only interpretation)
 * @returns ISO string for storage, or null if input is empty/null
 * 
 * @example
 * // Date-only mode for validFrom
 * parseForStorage('2024-03-15', 'date_only', 'America/New_York', false)
 * // Returns: '2024-03-15T05:00:00.000Z' (midnight EST in UTC)
 * 
 * // Date-only mode for validUntil
 * parseForStorage('2024-03-15', 'date_only', 'America/New_York', true)
 * // Returns: '2024-03-16T04:59:59.999Z' (11:59:59.999 PM EST in UTC)
 * 
 * // Date-time mode (exact storage)
 * parseForStorage('2024-03-15T10:30:00.000Z', 'date_time', 'America/New_York', false)
 * // Returns: '2024-03-15T10:30:00.000Z' (unchanged)
 */
export function parseForStorage(
  date: string | null | undefined,
  mode: AccessControlTimeMode,
  timezone: string,
  isEndDate: boolean
): string | null {
  if (!date || date.trim() === '') {
    return null;
  }
  
  const inputDate = new Date(date);
  
  if (isNaN(inputDate.getTime())) {
    return null;
  }
  
  // In date-time mode, preserve the exact timestamp
  if (mode === 'date_time') {
    return inputDate.toISOString();
  }
  
  // In date-only mode, interpret as start or end of day
  if (isEndDate) {
    return endOfDay(inputDate, timezone);
  } else {
    return startOfDay(inputDate, timezone);
  }
}

/**
 * Extracts just the date portion for display in date-only mode.
 * Useful for populating date-only input fields.
 * 
 * @param date - ISO date string or null
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format, or empty string if null
 */
export function extractDateOnly(date: string | null, timezone: string): string {
  if (!date) {
    return '';
  }
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  return formatter.format(dateObj);
}

/**
 * Validates that a date range is valid (validFrom <= validUntil).
 * 
 * @param validFrom - Start date ISO string or null
 * @param validUntil - End date ISO string or null
 * @returns true if the range is valid, false otherwise
 */
export function isValidDateRange(
  validFrom: string | null,
  validUntil: string | null
): boolean {
  // If either is null, the range is valid
  if (!validFrom || !validUntil) {
    return true;
  }
  
  const fromDate = new Date(validFrom);
  const untilDate = new Date(validUntil);
  
  // If either is invalid, consider the range invalid
  if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
    return false;
  }
  
  return fromDate.getTime() <= untilDate.getTime();
}

/**
 * Converts a UTC ISO string to event-local datetime-local input format (YYYY-MM-DDTHH:mm).
 * This is used to populate datetime-local input fields with the correct local time
 * in the event's timezone.
 * 
 * @param utcString - ISO UTC date string or null
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns Datetime-local input format string (YYYY-MM-DDTHH:mm) or empty string if null/invalid
 * 
 * @example
 * // For UTC time 2024-03-15T10:30:00Z in America/New_York (UTC-4 during DST)
 * convertUtcToEventLocalForInput('2024-03-15T10:30:00.000Z', 'America/New_York')
 * // Returns: '2024-03-15T06:30' (6:30 AM EDT)
 */
export function convertUtcToEventLocalForInput(
  utcString: string | null,
  timezone: string
): string {
  if (!utcString) return '';
  
  const date = new Date(utcString);
  if (isNaN(date.getTime())) return '';
  
  // Format the UTC date in the target timezone to get local components
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  } as Intl.DateTimeFormatOptions);
  
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Converts an event-local datetime-local input value (YYYY-MM-DDTHH:mm) to UTC ISO string.
 * This interprets the input as a local time in the event's timezone and converts it to UTC.
 * 
 * @param localString - Datetime-local input format string (YYYY-MM-DDTHH:mm) or empty
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns ISO UTC date string or null if input is empty/invalid
 * 
 * @example
 * // For local time 2024-03-15T06:30 in America/New_York (UTC-4 during DST)
 * convertEventLocalToUtcForStorage('2024-03-15T06:30', 'America/New_York')
 * // Returns: '2024-03-15T10:30:00.000Z' (10:30 AM UTC)
 */
export function convertEventLocalToUtcForStorage(
  localString: string,
  timezone: string
): string | null {
  if (!localString) return null;
  
  // Parse the datetime-local format (YYYY-MM-DDTHH:mm)
  const match = localString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  
  const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  
  // Validate the parsed values
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  
  // Use findUtcTimeForLocalTime to convert the local time to UTC
  const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
  const timeStr = `${hourStr}:${minuteStr}:00.000`;
  
  return findUtcTimeForLocalTime(dateStr, timeStr, timezone);
}
