---
title: "Notes Export and Text Sanitization Enhancement"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/attendees/export.ts"]
---

# Notes Export and Text Sanitization Enhancement

## Overview
Added Notes field to the export options and implemented text sanitization to ensure all text fields export cleanly on a single line in CSV format.

## Changes Made

### 1. Added Notes Field to Export Options

**File: `src/components/ExportDialog.tsx`**
- Added `notes` field to the basic fields section
- Field ID: `notes`
- Field Name: "Notes"
- Description: "Additional notes or comments"
- Category: Basic Information

### 2. Implemented Text Sanitization

**File: `src/pages/api/attendees/export.ts`**

#### New `sanitizeText()` Function
```typescript
const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  
  // Replace newlines, carriage returns, and tabs with spaces
  let sanitized = text
    .replace(/\r\n/g, ' ')  // Windows line endings
    .replace(/\n/g, ' ')     // Unix line endings
    .replace(/\r/g, ' ')     // Old Mac line endings
    .replace(/\t/g, ' ')     // Tabs
    .replace(/\s+/g, ' ')    // Multiple spaces to single space
    .trim();                 // Remove leading/trailing whitespace
  
  return sanitized;
};
```

#### Applied Sanitization To:
1. **Basic Fields**:
   - First Name
   - Last Name
   - Barcode Number
   - Notes

2. **Custom Fields**:
   - All text-type custom field values
   - (Boolean fields remain as Yes/No)

## Problem Solved

### Before
Multi-line notes and custom field values would break CSV formatting:
```csv
First Name,Last Name,Notes
John,Doe,"This is a note
with multiple lines
that breaks the CSV"
```

This caused issues when opening in Excel or other spreadsheet applications:
- Rows would span multiple lines
- Data would be misaligned
- Parsing errors in some applications

### After
All text is sanitized to single lines:
```csv
First Name,Last Name,Notes
John,Doe,"This is a note with multiple lines that breaks the CSV"
```

Clean, single-line output that:
- Opens correctly in all spreadsheet applications
- Maintains data integrity
- Preserves readability

## Technical Details

### Sanitization Process
1. **Line Ending Removal**: Converts all types of line endings to spaces
   - `\r\n` (Windows/CRLF)
   - `\n` (Unix/LF)
   - `\r` (Old Mac/CR)

2. **Tab Removal**: Converts tabs to spaces

3. **Space Normalization**: Collapses multiple consecutive spaces to a single space

4. **Whitespace Trimming**: Removes leading and trailing whitespace

### CSV Escaping
After sanitization, the standard CSV escaping still applies:
- Values containing commas, quotes, or newlines are wrapped in quotes
- Internal quotes are escaped as double quotes (`""`)

### Performance
- Sanitization is applied during export processing
- No impact on database storage (original values preserved)
- Minimal performance overhead (simple string operations)

## Usage

### For Users
1. Open Export Dialog
2. Select "Notes" field from Basic Information section
3. Export as usual
4. Notes will appear on single lines in the CSV

### Example Export

**Database Values:**
```
First Name: John
Last Name: Doe
Notes: "Important attendee
VIP access required
Contact: john@example.com"
```

**Exported CSV:**
```csv
First Name,Last Name,Notes
John,Doe,"Important attendee VIP access required Contact: john@example.com"
```

## Benefits

1. **Clean CSV Output**: All text fields export on single lines
2. **Excel Compatible**: No parsing issues in spreadsheet applications
3. **Data Integrity**: Original data preserved in database
4. **Consistent Formatting**: All text fields sanitized uniformly
5. **User-Friendly**: Notes field now available for export
6. **Backward Compatible**: Existing exports continue to work

## Files Modified

- `src/components/ExportDialog.tsx` - Added Notes field to export options
- `src/pages/api/attendees/export.ts` - Added sanitization function and applied to text fields

## Related Enhancements

- Access Control Export Enhancement (ACCESS_CONTROL_EXPORT_ENHANCEMENT.md)
- Custom Fields Export (already supported, now with sanitization)

## Testing Recommendations

1. **Multi-line Notes**: Create attendee with notes containing multiple lines
2. **Tabs in Text**: Test notes with tab characters
3. **Special Characters**: Test with various special characters
4. **Empty Notes**: Verify empty notes export as empty strings
5. **Custom Fields**: Test text custom fields with multi-line content
6. **Excel Import**: Open exported CSV in Excel to verify formatting
7. **Google Sheets**: Test import in Google Sheets
8. **Large Text**: Test with very long notes (1000+ characters)

## Future Enhancements

- Option to preserve line breaks (export as multi-line CSV)
- Configurable sanitization rules
- Preview of sanitized text before export
- Character limit warnings for very long text fields
