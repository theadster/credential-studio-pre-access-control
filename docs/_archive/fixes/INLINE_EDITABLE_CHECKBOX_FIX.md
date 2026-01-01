# Inline Editable Checkbox Field Fix

## Issue
The "Quick Edit on Main Page" toggle for checkbox custom fields was not saving. When users enabled this setting in the Event Settings form, the value was not persisted to the database.

## Root Cause
The `inlineEditable` attribute was missing from the database schema for the `custom_fields` collection. While the frontend form was correctly capturing the value and the TypeScript types included it, the database schema and API endpoints were not configured to save this field.

## Changes Made

### 1. Database Schema Migration
**File:** `scripts/add-inline-editable-attribute.ts`

Created a migration script to add the `inlineEditable` boolean attribute to the `custom_fields` collection:
- Type: Boolean
- Required: false
- Default: false
- Purpose: Allows checkbox fields to be edited directly on the main attendees page

**To run the migration:**
```bash
npx tsx scripts/add-inline-editable-attribute.ts
```

### 2. API Updates

#### Event Settings API (`src/pages/api/event-settings/index.ts`)
Multiple fixes were required:

1. **Added `inlineEditable` to CustomFieldInput interface** - The TypeScript interface was missing this field
2. **Updated field creation/modification functions** - Both `handleCustomFieldModifications` and `handleCustomFieldAdditions` now include `inlineEditable`
3. **Fixed custom field parsing** - Three places where custom fields are mapped from database to response were missing `inlineEditable`:
   - After transaction update (line ~593)
   - In GET request handler (line ~1427)
   - In POST request handler (line ~2200)

```typescript
// When updating fields
inlineEditable: modifiedField.inlineEditable !== undefined ? modifiedField.inlineEditable : false,

// When creating fields
inlineEditable: field.inlineEditable !== undefined ? field.inlineEditable : false,

// When parsing fields from database
inlineEditable: field.inlineEditable !== undefined ? field.inlineEditable : false,
```

#### Custom Fields Create API (`src/pages/api/custom-fields/index.ts`)
- Added `inlineEditable` to the custom field data object
- Updated API documentation to include the new field
- Default value: false (not inline editable by default)

#### Custom Fields Update API (`src/pages/api/custom-fields/[id].ts`)
- Added `inlineEditable` to the update data object
- Updated API documentation to include the new field
- Maintains the same default behavior as create

### 3. Frontend (No Changes Required)
The frontend was already correctly implemented:
- `CustomFieldForm.tsx` component properly captures the toggle state
- `CustomField` TypeScript interface includes the `inlineEditable` property
- Form submission passes the value to the API

## Testing

### Manual Testing Steps
1. Run the migration script to add the database attribute
2. Open Event Settings
3. Edit a checkbox custom field
4. Enable "Quick Edit on Main Page" toggle
5. Save the field
6. Verify the setting persists after closing and reopening the form
7. Check that the checkbox appears as inline editable on the main attendees page

### Expected Behavior
- The toggle state should persist after saving
- Checkbox fields with `inlineEditable: true` should allow direct editing on the main attendees page
- Changes should save automatically without opening the edit dialog

## Files Modified
1. `scripts/add-inline-editable-attribute.ts` (new)
2. `src/pages/api/event-settings/index.ts`
3. `src/pages/api/custom-fields/index.ts`
4. `src/pages/api/custom-fields/[id].ts`

## Migration Required
⚠️ **Important:** Run the migration script before deploying this fix:
```bash
npx tsx scripts/add-inline-editable-attribute.ts
```

## Related Features
- Custom Fields Management
- Event Settings Form
- Attendee Main Page Quick Edit
- Checkbox Custom Fields

## Notes
- The default value for `inlineEditable` is `false` to maintain backward compatibility
- Only checkbox fields should use this feature (enforced in the UI)
- The feature allows users to check/uncheck fields directly on the main page without opening the edit dialog
