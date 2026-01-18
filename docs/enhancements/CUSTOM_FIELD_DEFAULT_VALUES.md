---
title: Custom Field Default Values
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-17
review_interval_days: 90
related_code:
  - src/components/EventSettingsForm/CustomFieldForm.tsx
  - src/hooks/useAttendeeForm.ts
  - src/pages/api/attendees/import.ts
  - src/types/customFields.ts
  - scripts/add-default-value-attribute.ts
---

# Custom Field Default Values

This enhancement adds the ability to configure default values for custom fields. When creating new attendees or importing records, fields with configured defaults will be automatically pre-filled.

## Overview

Default values streamline data entry by:
- Pre-filling form fields when creating new attendees
- Applying values during CSV import for fields not included in the import file
- Ensuring consistent data for commonly-used field values

## Configuration

### Setting Default Values

1. Navigate to **Event Settings** → **Custom Fields**
2. Click on a custom field to edit it (or create a new one)
3. Scroll to the **Default Value** section
4. Enter or select the default value based on field type
5. Save the custom field

### Field Type Behavior

| Field Type | Default Value Input | Notes |
|------------|---------------------|-------|
| Text | Text input | Supports any text value |
| Number | Number input | Numeric values only |
| Email | Email input | Must be valid email format |
| Date | Date picker | YYYY-MM-DD format |
| URL | URL input | Full URL including protocol |
| Select | Dropdown | Choose from configured options |
| Checkbox | Dropdown | "No default", "Unchecked", or "Checked" |
| Boolean (Yes/No) | Dropdown | "Yes" or "No" (defaults to "No") |
| Textarea | Multi-line text | Supports longer text content |

## Application Priority

When determining field values, the system uses this priority:

1. **Explicit value** - Value provided by user or in CSV import
2. **Default value** - Configured default for the custom field
3. **Field type default** - Built-in defaults (e.g., "no" for boolean fields)

## Use Cases

### New Attendee Creation

When opening the "Add Attendee" form:
- All custom fields with default values are pre-populated
- Users can modify or clear these values as needed
- Required fields with defaults still show as pre-filled

### CSV Import

When importing attendees via CSV:
- Fields not included in the CSV use their default values
- Fields included in the CSV override any defaults
- Boolean fields without values default to "no" unless a default is configured

### Example Scenarios

**Scenario 1: Event-specific defaults**
- Field: "Meal Preference" (Select)
- Default: "Standard"
- Result: All new attendees default to "Standard" meal unless changed

**Scenario 2: Boolean field defaults**
- Field: "VIP Access" (Boolean)
- Default: "No"
- Result: New attendees don't have VIP access by default

**Scenario 3: Pre-filled text**
- Field: "Company" (Text)
- Default: "Acme Corp"
- Result: Useful when most attendees are from the same organization

## Migration

For existing installations, run the migration script to add the `defaultValue` attribute:

```bash
npx tsx scripts/add-default-value-attribute.ts
```

This adds the attribute to the Appwrite custom_fields collection. Existing fields will have no default value (null) until configured.

## Technical Details

### Data Storage

- Default values are stored as strings in the `defaultValue` attribute
- Maximum length: 1000 characters
- Null/empty means no default

### Type Definitions

```typescript
interface CustomField {
  id?: string;
  fieldName: string;
  fieldType: string;
  // ... other fields
  defaultValue?: string;  // New field
}
```

### Files Modified

- `src/types/customFields.ts` - Type definition
- `src/components/EventSettingsForm/types.ts` - Form type definition
- `src/components/EventSettingsForm/CustomFieldForm.tsx` - UI for setting defaults
- `src/hooks/useAttendeeForm.ts` - Apply defaults in attendee form
- `src/pages/api/attendees/import.ts` - Apply defaults during import
