# Credential Generation Empty Placeholder Fix

## Issue
When generating credentials with empty or unmapped custom field values, the system produced invalid JSON that caused the error:

```
Error: Invalid request body template in Switchboard Canvas settings
JSON Parse Error: Expected ',' or '}' after property value in JSON at position 380
```

## Root Cause

### The Problem
When a placeholder like `{{company}}` had no value or wasn't mapped to a custom field, the system would replace it with `""` (two quote characters as a string), creating invalid JSON:

```json
"company": {"text": """"}
           ↑ Invalid - three quotes in a row
```

### Why This Happened

In `src/pages/api/attendees/[id]/generate-credential.ts`, unreplaced placeholders were being replaced with the string `'""'`:

```typescript
// OLD CODE - INCORRECT
bodyString = bodyString.replace(new RegExp(escapedPlaceholder, 'g'), '""');
```

This was meant to provide an empty string value, but since the placeholder is already within a JSON string context (`"text": "{{company}}"`), replacing `{{company}}` with `""` resulted in:

```json
"text": """"  // Invalid JSON!
```

### Example from Logs

```
Unreplaced placeholders found: [ '{{company}}' ]
Processed template: {
  "company": {"text": """"}  // ← Invalid JSON
}
JSON Parse Error: Expected ',' or '}' after property value
```

## Solution

Replace unreplaced placeholders with an empty string (no quotes), since they're already within a JSON string context:

```typescript
// NEW CODE - CORRECT
bodyString = bodyString.replace(new RegExp(escapedPlaceholder, 'g'), '');
```

Now the replacement works correctly:
- Template: `"text": "{{company}}"`
- After replacement: `"text": ""`
- Result: Valid JSON ✅

## Why Placeholders Go Unreplaced

Placeholders can be unreplaced for several reasons:

1. **Custom field not mapped**: The custom field exists but isn't mapped in Switchboard field mappings
2. **Custom field deleted**: The field was deleted but still referenced in the template
3. **Typo in template**: The placeholder name doesn't match any field
4. **Missing custom field value**: The attendee doesn't have a value for that field

## Testing

### Before Fix
1. Create attendee without a "company" custom field value
2. Try to generate credential
3. **Result**: "Invalid request body template" error ❌

### After Fix
1. Create attendee without a "company" custom field value
2. Try to generate credential
3. **Result**: Credential generates successfully with empty company field ✅

### Test Cases

**Test Case 1: Empty Custom Field**
- Attendee has no value for mapped custom field
- Expected: Credential generates with empty string
- Result: ✅ Works

**Test Case 2: Unmapped Placeholder**
- Template has `{{company}}` but no field mapping
- Expected: Credential generates with empty string
- Result: ✅ Works

**Test Case 3: Deleted Custom Field**
- Attendee has value for deleted custom field
- Expected: Credential generates, ignoring deleted field
- Result: ✅ Works

## Related Issues

This fix addresses the same category of issues as:
- [Custom Field Values Fix](./CUSTOM_FIELD_VALUES_FIX.md) - Array/object format handling
- [Custom Field Validation Fix](./CUSTOM_FIELD_VALIDATION_FIX.md) - Deleted field handling

## Data Format Issue

The logs also show a data format issue with custom field values:

```javascript
Raw customFieldValues: {
  "0": {"customFieldId": "68e351ad0021e663e157", "value": "COMPANY"},
  "1": {"customFieldId": "68e351ad002cef10e3dd", "value": "OWNER"},
  // ...
  "68e351ad001a939881bb": "TALENT"  // ← Mixed format!
}
```

The data is stored as an object with numeric keys (array-like) AND direct field ID keys. This is the result of the earlier fix for custom field values, but it shows the data needs to be cleaned up.

### Recommended Data Migration

Run a script to convert all custom field values to the proper array format:

```javascript
// Convert from mixed object format
{
  "0": {"customFieldId": "abc", "value": "x"},
  "abc": "x"
}

// To clean array format
[
  {"customFieldId": "abc", "value": "x"}
]
```

## Files Modified

- `src/pages/api/attendees/[id]/generate-credential.ts` - Fixed empty placeholder replacement

## Prevention

To prevent similar issues:

1. **Validate Templates**: Add template validation to check for unreplaced placeholders
2. **Field Mapping UI**: Show warnings for unmapped placeholders in templates
3. **Default Values**: Allow setting default values for empty fields
4. **Template Testing**: Add a "Test Template" feature to preview with sample data

## Debugging

The logs now show helpful information when placeholders aren't replaced:

```
Unreplaced placeholders found: [ '{{company}}' ]
Available placeholders: ['{{firstName}}', '{{lastName}}', ...]
Available numeric placeholders: [ '{{vip_room_variable}}', ... ]
```

This helps identify:
- Which placeholders are missing
- What placeholders are available
- Whether it's a mapping issue or data issue

## Related Documentation

- [Credential Generation Fixes](./CREDENTIAL_GENERATION_FIXES_SUMMARY.md)
- [Custom Field Values Fix](./CUSTOM_FIELD_VALUES_FIX.md)
- [Switchboard Configuration Guide](../guides/SWITCHBOARD_CONFIGURATION_GUIDE.md)
