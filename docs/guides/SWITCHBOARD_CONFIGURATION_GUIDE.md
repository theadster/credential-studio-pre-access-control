---
title: "Switchboard Canvas Configuration Guide"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/attendees/[id]/generate-credential.ts"]
---

# Switchboard Canvas Configuration Guide

## Testing Your Configuration

First, test your Switchboard configuration by calling:

```bash
GET /api/integrations/test-switchboard
```

This will validate your configuration and show any issues.

## Common Issues

### Issue: "Invalid request body template"

This means the Request Body template has invalid JSON syntax. Common causes:

1. **Missing commas** between JSON properties
2. **Trailing commas** (not allowed in JSON)
3. **Unescaped quotes** in string values
4. **Unclosed brackets** or braces
5. **Invalid placeholder syntax**

## Example Request Body Templates

### Basic Template

```json
{
  "template_id": "{{template_id}}",
  "data": {
    "firstName": "{{firstName}}",
    "lastName": "{{lastName}}",
    "barcodeNumber": "{{barcodeNumber}}",
    "photoUrl": "{{photoUrl}}"
  }
}
```

### Template with Custom Fields

```json
{
  "template_id": "{{template_id}}",
  "data": {
    "firstName": "{{firstName}}",
    "lastName": "{{lastName}}",
    "company": "{{company}}",
    "jobTitle": "{{jobTitle}}",
    "barcodeNumber": "{{barcodeNumber}}",
    "photoUrl": "{{photoUrl}}"
  }
}
```

### Template with Layers (Switchboard Canvas Specific)

```json
{
  "template_id": "{{template_id}}",
  "data": {
    "layers": [
      {
        "name": "firstName",
        "text": "{{firstName}}"
      },
      {
        "name": "lastName",
        "text": "{{lastName}}"
      },
      {
        "name": "company",
        "text": "{{company}}"
      },
      {
        "name": "barcode",
        "text": "{{barcodeNumber}}"
      },
      {
        "name": "photo",
        "image_url": "{{photoUrl}}"
      }
    ]
  }
}
```

## Available Placeholders

### Built-in Placeholders

These are always available:

- `{{firstName}}` - Attendee first name
- `{{lastName}}` - Attendee last name
- `{{barcodeNumber}}` - Attendee barcode
- `{{photoUrl}}` - Attendee photo URL
- `{{eventName}}` - Event name
- `{{eventDate}}` - Event date (YYYY-MM-DD format)
- `{{eventTime}}` - Event time
- `{{eventLocation}}` - Event location
- `{{template_id}}` - Switchboard template ID

### Custom Field Placeholders

For custom fields, you have two options:

#### Option 1: Use Internal Field Name
If your custom field has an "Internal Field Name" set (e.g., `company`):
```json
{
  "company": "{{company}}"
}
```

#### Option 2: Use Field Mappings
Configure field mappings in the Switchboard integration settings to map custom fields to JSON variables.

## Field Mappings Configuration

Field mappings allow you to:
1. Map custom fields to specific JSON variables
2. Transform values (e.g., "Yes" → 1, "No" → 0)
3. Handle different field types

### Example Field Mappings

```json
[
  {
    "fieldId": "custom-field-id-1",
    "fieldType": "text",
    "jsonVariable": "company",
    "valueMapping": null
  },
  {
    "fieldId": "custom-field-id-2",
    "fieldType": "boolean",
    "jsonVariable": "isVIP",
    "valueMapping": {
      "yes": 1,
      "no": 0
    }
  },
  {
    "fieldId": "custom-field-id-3",
    "fieldType": "select",
    "jsonVariable": "accessLevel",
    "valueMapping": {
      "VIP": "gold",
      "Regular": "silver",
      "Guest": "bronze"
    }
  }
]
```

Then use in your request body:
```json
{
  "template_id": "{{template_id}}",
  "data": {
    "company": "{{company}}",
    "isVIP": {{isVIP}},
    "accessLevel": "{{accessLevel}}"
  }
}
```

**Note**: Numeric values should NOT be quoted: `{{isVIP}}` not `"{{isVIP}}"`

## Configuration Steps

### 1. Enable Switchboard Integration

In Event Settings → Integrations → Switchboard Canvas:
- Toggle "Enable Switchboard Canvas" to ON

### 2. Configure API Settings

- **API Endpoint**: Your Switchboard Canvas API endpoint (e.g., `https://api.switchboard.com/v1/render`)
- **Auth Header Type**: Usually "Bearer" or "X-API-Key"
- **API Key**: Your Switchboard Canvas API key
- **Template ID**: The ID of your Switchboard Canvas template (e.g., `template_abc123`)
  - This will replace the `{{template_id}}` placeholder in your request body

### 3. Create Request Body Template

- Copy one of the example templates above
- Customize it to match your Switchboard Canvas template structure
- Ensure valid JSON syntax (no trailing commas, proper quotes)
- Use placeholders for dynamic values

### 4. Configure Field Mappings (Optional)

If you have custom fields:
- Add field mappings to map custom fields to JSON variables
- Configure value transformations if needed

### 5. Test Configuration

Call the test endpoint:
```bash
GET /api/integrations/test-switchboard
```

This will validate:
- ✓ Integration is enabled
- ✓ API endpoint is configured
- ✓ API key is configured
- ✓ Template ID is configured
- ✓ Request body is valid JSON
- ✓ Field mappings are valid JSON
- ✓ Placeholders are identified

### 6. Generate Test Credential

Try generating a credential for an attendee to verify everything works.

## Troubleshooting

### Error: "Invalid request body template"

**Solution**: 
1. Call `/api/integrations/test-switchboard` to see the exact error
2. Copy your request body to a JSON validator (e.g., jsonlint.com)
3. Fix any syntax errors
4. Common fixes:
   - Remove trailing commas
   - Ensure all strings are properly quoted
   - Check for unclosed brackets/braces
   - Verify placeholder syntax: `{{name}}` not `{name}` or `{{ name }}`

### Error: "No credential URL returned"

**Solution**:
The Switchboard API response doesn't contain a URL field. Check:
1. The API response structure from Switchboard
2. Update the code to extract the URL from the correct field
3. Common fields: `url`, `imageUrl`, `downloadUrl`, `sizes[0].url`

### Error: "Failed to connect to Switchboard Canvas API"

**Solution**:
1. Verify API endpoint is correct
2. Check API key is valid
3. Ensure network connectivity
4. Check Switchboard API status

### Placeholders Not Replaced

**Solution**:
1. Verify placeholder syntax: `{{name}}` (double curly braces)
2. Check spelling matches exactly
3. For custom fields, ensure field mapping is configured or internal field name is set
4. Call test endpoint to see which placeholders are detected

## Example: Complete Configuration

### Event Settings
- Event Name: "Tech Conference 2025"
- Event Date: "2025-03-15"
- Event Time: "09:00 AM"
- Event Location: "Convention Center"

### Switchboard Integration
- **Enabled**: Yes
- **API Endpoint**: `https://api.switchboard.com/v1/render`
- **Auth Header Type**: `Bearer`
- **API Key**: `sb_live_xxxxxxxxxxxxx`
- **Template ID**: `template_abc123`

### Request Body
```json
{
  "template_id": "{{template_id}}",
  "data": {
    "layers": [
      {
        "name": "firstName",
        "text": "{{firstName}}"
      },
      {
        "name": "lastName",
        "text": "{{lastName}}"
      },
      {
        "name": "eventName",
        "text": "{{eventName}}"
      },
      {
        "name": "barcode",
        "text": "{{barcodeNumber}}"
      },
      {
        "name": "photo",
        "image_url": "{{photoUrl}}"
      }
    ]
  }
}
```

### Field Mappings
```json
[]
```
(Empty if not using custom fields)

## Need Help?

1. Use the test endpoint: `GET /api/integrations/test-switchboard`
2. Check the browser console for detailed error messages
3. Verify your Switchboard Canvas template structure matches your request body
4. Ensure all required fields in your template have corresponding placeholders
