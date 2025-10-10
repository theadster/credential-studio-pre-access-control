# Implementation: Notes Field as Permanent Field

## Overview

Added a "Notes" field that appears as a permanent field in the Basic Information section of the Attendee form, even though it's technically stored as a custom field due to database limitations.

## Challenge

The attendees collection in Appwrite has reached its attribute limit, preventing us from adding a new permanent `notes` column to the database.

## Solution

Created "Notes" as a custom field but displayed it prominently in the Basic Information section, making it feel like a permanent field to users.

### Implementation Steps

#### 1. Created Notes Custom Field
**Script**: `scripts/add-notes-field.ts`

Created a "Notes" custom field with:
- **Type**: textarea
- **Order**: 11 (at the end of custom fields)
- **Visible**: true (shows on main page)
- **Required**: false

#### 2. Modified AttendeeForm Component
**File**: `src/components/AttendeeForm.tsx`

**Changes Made:**

1. **Added Notes field in Basic Information section** (after Barcode field):
```tsx
{/* Notes Field - Displayed in Basic Information */}
{customFields.find(f => f.internalFieldName === 'notes') && (
  <div className="col-span-2 space-y-2">
    <Label htmlFor="notes" className="flex items-center gap-2">
      <FileText className="h-4 w-4 text-muted-foreground" />
      Notes
    </Label>
    <Textarea
      id="notes"
      value={formData.customFieldValues['notes'] || ''}
      onChange={(e) => setFormData(prev => ({
        ...prev,
        customFieldValues: {
          ...prev.customFieldValues,
          notes: e.target.value
        }
      }))}
      placeholder="Add any additional notes about this attendee..."
      rows={4}
      className="resize-none"
    />
  </div>
)}
```

2. **Filtered Notes from Custom Fields section**:
```tsx
{customFields.filter(f => f.internalFieldName !== 'notes').length > 0 && (
  // Custom Fields section
)}

// And in the rendering:
{customFields
  .filter(f => f.internalFieldName !== 'notes') // Exclude notes
  .sort((a, b) => a.order - b.order)
  .map((field) => (
    // Render custom field
  ))}
```

## User Experience

### Form Layout

**Basic Information Section:**
- First Name *
- Last Name *
- Barcode Number * [Generate button]
- **Notes** ← New field here (4 rows, full width)

**Additional Information Section:**
- All other custom fields (excluding Notes)

### Key Features

1. **Prominent Placement**: Notes appears in the Basic Information section, making it feel like a core field
2. **Full Width**: Takes up 2 columns (col-span-2) for better visibility
3. **Multi-line**: 4 rows by default with resize disabled for consistent UI
4. **Placeholder Text**: Helpful hint about what to enter
5. **No Duplication**: Filtered out from the Additional Information section

## Technical Details

### Data Storage

- Stored in `customFieldValues` JSON field (like other custom fields)
- Key: `notes`
- Value: String (up to 10,000 characters)

### Form Handling

- Integrated with existing `formData.customFieldValues` state
- Saves/loads automatically with other custom field values
- No special API changes needed

### Visibility

- Shows on main attendees page (under attendee name) by default
- Can be hidden using the "Show on Main Page" toggle in Event Settings
- Appears in all attendee forms (create/edit)

## Benefits

1. **Feels Permanent**: Users see it as a standard field, not a custom field
2. **Universal**: Available for all attendees across all events
3. **Flexible**: Can still be managed through Event Settings if needed
4. **No Database Changes**: Works within existing schema limitations

## Files Modified

- `src/components/AttendeeForm.tsx` - Added Notes field to Basic Information section
- `scripts/add-notes-field.ts` - Script to create the Notes custom field

## Testing

After applying these changes:
1. ✅ Refresh your browser
2. ✅ Click "Add New Attendee"
3. ✅ Notes field appears in Basic Information section (after Barcode)
4. ✅ Enter some notes and save
5. ✅ Edit the attendee - notes are preserved
6. ✅ Notes appear under attendee name on main page
7. ✅ Notes field does NOT appear in Additional Information section

## Future Considerations

If you need to add more permanent fields in the future and hit database limits again, this pattern can be reused:
1. Create as a custom field
2. Display in a prominent location in the form
3. Filter out from the custom fields section

## Date

2025-10-10
