---
title: "Access Control Export Enhancement"
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-17
review_interval_days: 90
related_code: ["src/pages/api/attendees/export.ts", "src/components/ExportDialog.tsx"]
---

# Access Control Export Enhancement

## Overview
Enhanced the attendee export functionality to include Access Control fields with customizable date and time formatting options. This allows administrators to export access control data (access status, valid from/until dates) along with attendee information.

## Changes Made

### 1. ExportDialog Component (`src/components/ExportDialog.tsx`)

#### New Features
- **Access Control Fields Section**: Added three new exportable fields when Access Control is enabled:
  - `accessEnabled`: Access Status (Active/Inactive)
  - `validFrom`: Access validity start date/time
  - `validUntil`: Access validity end date/time

- **Notes Field**: Added Notes as an exportable basic field
  - Category: Basic Information
  - Description: Additional notes or comments

- **Date & Time Format Options**: Added a new configuration card that appears when any date/time fields are selected:
  - **Date Format Options**:
    - Compact: `3/15/24` (M/D/YY)
    - US Format: `03/15/2024` (MM/DD/YYYY)
    - ISO Format: `2024-03-15` (YYYY-MM-DD)
  
  - **Time Format Options**:
    - 12-Hour: `2:30 PM` (with AM/PM)
    - 24-Hour: `14:30` (military time)

#### UI Improvements
- Access Control fields section only appears when `accessControlEnabled` is true in event settings
- Added Calendar icon to Access Control section header
- Added Clock icon to Date & Time Format section header
- Informational note displays the current Access Control time mode (date-only vs date-time)
- Format options show helpful descriptions of the output format

#### State Management
- Added `dateFormat` state: `'iso' | 'us' | 'compact'` (default: `'compact'`)
- Added `timeFormat` state: `'24h' | '12h'` (default: `'12h'`)
- Both format preferences are sent to the API with the export request

### 2. Export API (`src/pages/api/attendees/export.ts`)

#### New Request Parameters
```typescript
interface ExportRequest {
  // ... existing fields
  dateFormat?: 'iso' | 'us' | 'compact';
  timeFormat?: '24h' | '12h';
}
```

#### New Field Mappings
Added to `fieldMap`:
- `accessEnabled`: 'Access Status'
- `validFrom`: 'Valid From'
- `validUntil`: 'Valid Until'

#### Date Formatting Functions

**`formatDate(dateStr, includeTime)`**
- Formats standard ISO timestamps (createdAt, updatedAt, credentialGeneratedAt)
- Respects user's date format preference (compact/us/iso)
- Optionally includes time in user's preferred format (12h/24h)

**`formatAccessControlDate(dateStr)`**
- Specialized formatter for Access Control dates
- Handles both date-only (`YYYY-MM-DD`) and datetime-local (`YYYY-MM-DDTHH:mm`) formats
- Respects event's `accessControlTimeMode` setting:
  - `date_only`: Only exports the date portion
  - `date_time`: Exports both date and time
- Applies user's format preferences

#### Text Sanitization
Added `sanitizeText()` helper function to ensure all text fields export on a single line:
- Removes Windows line endings (`\r\n`)
- Removes Unix line endings (`\n`)
- Removes old Mac line endings (`\r`)
- Removes tabs (`\t`)
- Collapses multiple spaces to single space
- Trims leading/trailing whitespace

Applied to:
- First Name, Last Name, Barcode (basic fields)
- Notes field
- All custom field text values

#### Export Logic
```typescript
case 'notes':
  value = sanitizeText(attendee.notes);
  break;
case 'accessEnabled':
  value = attendee.accessEnabled === true ? 'Active' : 'Inactive';
  break;
case 'validFrom':
  value = formatAccessControlDate(attendee.validFrom);
  break;
case 'validUntil':
  value = formatAccessControlDate(attendee.validUntil);
  break;
```

## Usage

### For Users

1. **Enable Access Control** via environment variable:
   - Set `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=true` in your `.env.local` file
   - Restart the application for the change to take effect
2. Navigate to the Attendees tab
3. Click the **Export** button
4. In the Export Dialog:
   - Select export scope (All or Filtered)
   - Check the **Access Control** fields you want to export
   - Choose your preferred **Date Format** (Compact, US, or ISO)
   - Choose your preferred **Time Format** (12-hour or 24-hour)
5. Click **Export CSV**

### Export Examples

#### Date-Only Mode (accessControlTimeMode: 'date_only')
```csv
First Name,Last Name,Access Status,Valid From,Valid Until
John,Doe,Active,3/15/24,3/20/24
Jane,Smith,Inactive,3/16/24,3/21/24
```

#### Date-Time Mode (accessControlTimeMode: 'date_time')
```csv
First Name,Last Name,Access Status,Valid From,Valid Until
John,Doe,Active,3/15/24 9:00 AM,3/20/24 5:00 PM
Jane,Smith,Inactive,3/16/24 10:30 AM,3/21/24 6:00 PM
```

#### ISO Format with 24-Hour Time
```csv
First Name,Last Name,Access Status,Valid From,Valid Until
John,Doe,Active,2024-03-15 09:00,2024-03-20 17:00
Jane,Smith,Inactive,2024-03-16 10:30,2024-03-21 18:00
```

## Technical Details

### Conditional Rendering
The Access Control section only appears when access control is enabled both globally (via environment variable) AND for the specific event:
```typescript
// Check if Access Control is enabled using the helper function
// This checks both the global environment variable AND the event-specific setting
isAccessControlEnabledForEvent(eventSettings?.accessControlEnabled)
```

The helper function `isAccessControlEnabledForEvent()` from `@/lib/accessControlFeature` ensures that:
1. The global feature flag `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL` is set to `'true'`
2. The event has access control enabled (`eventSettings.accessControlEnabled === true`)

The Date & Time Format card only appears when any date/time field is selected:
```typescript
selectedFields.includes('createdAt') || 
selectedFields.includes('updatedAt') || 
selectedFields.includes('credentialGeneratedAt') ||
selectedFields.includes('validFrom') ||
selectedFields.includes('validUntil')
```

### Date Format Handling
The system intelligently handles different date storage formats:
- **Simple date strings** (`YYYY-MM-DD`): Formatted as dates only
- **Datetime-local strings** (`YYYY-MM-DDTHH:mm`): Formatted with optional time based on mode
- **ISO timestamps** (`YYYY-MM-DDTHH:mm:ss.sssZ`): Converted to local time and formatted

### Time Mode Awareness
The export respects the event's `accessControlTimeMode`:
- **date_only**: Only the date portion is exported for validFrom/validUntil
- **date_time**: Both date and time are exported for validFrom/validUntil

## Benefits

1. **Comprehensive Data Export**: Users can now export all access control information and notes
2. **Flexible Formatting**: Multiple date/time format options accommodate different regional preferences and use cases
3. **Consistent with UI**: Export formats match the display formats used throughout the application
4. **Mode-Aware**: Respects the event's time mode setting to avoid confusion
5. **User-Friendly**: Clear labels and descriptions help users understand what they're exporting
6. **Clean CSV Output**: Text sanitization ensures multi-line notes and custom fields export properly on single lines
7. **Excel Compatible**: Sanitized text prevents CSV parsing issues in Excel and other spreadsheet applications

## Files Modified

- `src/components/ExportDialog.tsx` - Added Access Control fields and format options
- `src/pages/api/attendees/export.ts` - Added date formatting and Access Control field handling with proper data fetching
- `src/pages/dashboard.tsx` - Updated to pass accessControlEnabled and accessControlTimeMode to ExportDialog

## Technical Implementation Details

### Access Control Data Fetching

The Access Control data is stored in a separate table (`access_control`) and needs to be joined with attendee data during export. The export API now:

1. Fetches all attendees based on export scope and filters
2. Fetches Access Control records from the separate table in batches
3. Maps Access Control data by attendeeId
4. Attaches Access Control fields (accessEnabled, validFrom, validUntil) to each attendee
5. Formats and exports the combined data

This matches the pattern used in the main attendees API (`src/pages/api/attendees/index.ts`).

## Dependencies

- Access Control feature enabled via `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=true` environment variable
- `src/lib/accessControlDates.ts` - Date formatting utilities (referenced for consistency)
- Event Settings with `accessControlTimeMode` property

## Testing Recommendations

1. **With Access Control Disabled**: Verify Access Control section doesn't appear
   - Set `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=false` in `.env.local`
   - Restart application
   - Open Export Dialog and verify Access Control fields are hidden
2. **With Access Control Enabled**: Verify all three fields are available
   - Set `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=true` in `.env.local`
   - Restart application
   - Open Export Dialog and verify Access Control fields appear
3. **Date-Only Mode**: Verify only dates are exported (no times)
4. **Date-Time Mode**: Verify both dates and times are exported
5. **Format Options**: Test all combinations of date and time formats
6. **Empty Values**: Verify null/empty access control dates export as empty strings
7. **Mixed Data**: Test export with some attendees having access control data and others not
8. **Notes Field**: Test exporting notes with:
   - Multi-line text (should export on single line)
   - Text with tabs (should be converted to spaces)
   - Text with special characters
   - Empty notes
9. **Custom Fields**: Test text custom fields with multi-line content
10. **CSV Integrity**: Open exported CSV in Excel/Google Sheets to verify proper formatting

## Future Enhancements

- Add timezone selection for exports (currently uses event timezone)
- Add option to export access control status as boolean (true/false) instead of Active/Inactive
- Add filtering by access control status in the export dialog
- Add preview of formatted dates before export

## Migration Note (January 17, 2026)

Access Control is now enabled via the `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL` environment variable instead of through Event Settings. This is a global feature flag that enables/disables the entire Access Control feature across the application. The `accessControlTimeMode` setting remains in Event Settings to control whether Access Control uses date-only or date-time mode.
