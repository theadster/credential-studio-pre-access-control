# Template ID Field Fix

## Issue

When trying to generate credentials, the error "Template ID is not configured" appeared even though the template ID was included in the JSON request body.

## Root Cause

The Switchboard integration requires the Template ID to be stored in a **separate database field** (`templateId`), not just in the JSON request body. This is because:

1. The Template ID is used to replace the `{{template_id}}` placeholder in your request body
2. The system needs to know the template ID before processing the JSON
3. It's a required field for the Switchboard integration

However, the **Template ID input field was missing from the Event Settings form UI**.

## Solution

Added the Template ID input field to the Event Settings form in the Switchboard Canvas integration section.

### File Modified

**src/components/EventSettingsForm.tsx**:
- Added Template ID input field after the API Key field
- Field ID: `switchboardTemplateId`
- Placeholder: `template_abc123`
- Help text: "Your Switchboard Canvas template ID (will replace {{template_id}} placeholder)"

## How to Configure

1. **Go to Event Settings** → Integrations → Switchboard Canvas

2. **Enable Switchboard Canvas** (toggle to ON)

3. **Fill in all required fields**:
   - ✓ API Endpoint (e.g., `https://api.switchboard.com/v1/render`)
   - ✓ Auth Header Type (usually "Bearer")
   - ✓ API Key (your Switchboard API key)
   - ✓ **Template ID** (e.g., `template_abc123`) ← **NEW FIELD**
   - ✓ Request Body (JSON template)

4. **In your Request Body JSON**, use the placeholder:
   ```json
   {
     "template_id": "{{template_id}}",
     "data": {
       "firstName": "{{firstName}}",
       "lastName": "{{lastName}}"
     }
   }
   ```

5. **Save** your settings

## How It Works

### Data Flow

1. **You configure**:
   - Template ID field: `template_abc123`
   - Request Body: `{"template_id": "{{template_id}}"}`

2. **When generating a credential**:
   - System reads Template ID from database: `template_abc123`
   - System replaces `{{template_id}}` in JSON with `template_abc123`
   - Final JSON sent to API: `{"template_id": "template_abc123"}`

### Why Both Are Needed

- **Template ID field**: Stores the actual template ID value
- **{{template_id}} placeholder**: Marks where to insert the value in the JSON

This separation allows you to:
- Change the template ID without editing the JSON
- Use the same JSON structure for different templates
- Validate the template ID is configured before processing

## Testing

After adding the Template ID:

1. **Test configuration**:
   ```
   http://localhost:3000/debug-switchboard
   ```
   Should show: ✓ Template ID configured

2. **Try generating a credential** for an attendee

3. **Check the test endpoint** shows no issues:
   ```
   GET /api/integrations/test-switchboard
   ```

## Related Fields

All Switchboard configuration fields:

| Field | Required | Purpose |
|-------|----------|---------|
| Enabled | Yes | Enable/disable integration |
| API Endpoint | Yes | Switchboard API URL |
| Auth Header Type | No | Default: "Bearer" |
| API Key | Yes | Authentication |
| **Template ID** | **Yes** | **Template to use** |
| Request Body | Yes | JSON template with placeholders |
| Field Mappings | No | Map custom fields to JSON variables |

## Common Mistakes

### ❌ Wrong: Only putting template ID in JSON
```json
{
  "template_id": "template_abc123"
}
```
**Problem**: Template ID field is empty, so `{{template_id}}` won't be replaced.

### ✓ Correct: Set both
- **Template ID field**: `template_abc123`
- **Request Body**: `{"template_id": "{{template_id}}"}`

## Migration Note

If you previously configured Switchboard without the Template ID field:

1. The field was missing from the UI but may have been stored in the database
2. Check your current configuration at `/debug-switchboard`
3. If Template ID shows as "Not configured", add it now
4. Your existing JSON template doesn't need to change

## Summary

✅ **Fixed**: Added Template ID input field to Event Settings form  
✅ **Location**: Event Settings → Integrations → Switchboard Canvas  
✅ **Required**: Yes, must be filled in to generate credentials  
✅ **Purpose**: Replaces `{{template_id}}` placeholder in request body  
