# Credential Generation Fixes - Complete Summary

## Issues Fixed

We resolved multiple interconnected issues that were preventing credential generation from working.

---

## Issue 1: Custom Field Values Data Format Mismatch ✅ FIXED

### Problem
Custom field values were stored in **array format** in the database:
```json
[
  {"customFieldId": "field123", "value": "Company Name"},
  {"customFieldId": "field456", "value": "yes"}
]
```

But the credential generation code expected **object format**:
```json
{
  "field123": "Company Name",
  "field456": "yes"
}
```

This caused:
- `Object.keys(customFieldValues)` to return array indices `["0","1","2"]` instead of field IDs
- Field mappings to fail because it couldn't find values by field ID
- All custom field placeholders to remain unreplaced

### Solution
Updated credential generation code to detect and convert array format to object format:

**Files Modified:**
- `src/pages/api/attendees/[id]/generate-credential.ts`
- `src/pages/api/integrations/test-template-processing.ts`

**Code Added:**
```typescript
let customFieldValues: Record<string, string> = {};

if (attendee.customFieldValues) {
  const parsed = typeof attendee.customFieldValues === 'string' 
    ? JSON.parse(attendee.customFieldValues) 
    : attendee.customFieldValues;
  
  // Convert array format to object format
  if (Array.isArray(parsed)) {
    parsed.forEach((item: any) => {
      if (item.customFieldId && item.value !== undefined) {
        customFieldValues[item.customFieldId] = String(item.value);
      }
    });
  } else if (typeof parsed === 'object') {
    customFieldValues = parsed;
  }
}
```

---

## Issue 2: Missing Template ID Field in UI ✅ FIXED

### Problem
The Switchboard integration required a `templateId` field to be stored separately from the JSON template, but the input field was missing from the Event Settings form.

### Solution
Added Template ID input field to the Switchboard Canvas integration section.

**File Modified:**
- `src/components/EventSettingsForm.tsx`

**Field Added:**
- Label: "Template ID *"
- ID: `switchboardTemplateId`
- Placeholder: `template_abc123`
- Help text: "Your Switchboard Canvas template ID (will replace {{template_id}} placeholder)"

---

## Issue 3: Corrupted Regex Escape Sequences ✅ FIXED

### Problem
The placeholder replacement code had corrupted regex escape sequences (UUIDs instead of proper `\\$&`), causing:
- Placeholders not being replaced correctly
- Invalid JSON being generated
- Parse errors even with valid templates

### Solution
Completely rewrote the credential generation file with proper regex escaping.

**File Modified:**
- `src/pages/api/attendees/[id]/generate-credential.ts` (complete rewrite)

**Added Helper Function:**
```typescript
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

---

## Issue 4: Integration Architecture Mismatch ✅ FIXED

### Problem
The code was looking for Switchboard settings in the `event_settings` collection instead of the separate `switchboard_integrations` collection.

### Solution
Updated credential generation to fetch Switchboard integration from the correct collection.

**File Modified:**
- `src/pages/api/attendees/[id]/generate-credential.ts`

**Changes:**
- Added import: `import { getSwitchboardIntegration } from '@/lib/appwrite-integrations';`
- Fetch integration: `const switchboardIntegration = await getSwitchboardIntegration(databases, eventSettings.$id);`
- Use integration fields: `switchboardIntegration.apiEndpoint`, `switchboardIntegration.apiKey`, etc.

---

## Issue 5: Custom Field Values Not Displayed in API ✅ FIXED

### Problem
The attendees API was parsing custom field values from JSON but returning an empty array instead of converting to the array format the frontend expects.

### Solution
Updated the API to properly convert object format to array format.

**Files Modified:**
- `src/pages/api/attendees/index.ts` (GET list and POST create)
- `src/pages/api/attendees/[id].ts` (GET single and PUT update)

**Conversion Logic:**
```typescript
let parsedCustomFieldValues = [];
if (attendee.customFieldValues) {
  const parsed = typeof attendee.customFieldValues === 'string' 
    ? JSON.parse(attendee.customFieldValues) 
    : attendee.customFieldValues;
  
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    parsedCustomFieldValues = Object.entries(parsed).map(([customFieldId, value]) => ({
      customFieldId,
      value: String(value)
    }));
  } else if (Array.isArray(parsed)) {
    parsedCustomFieldValues = parsed;
  }
}
```

---

## Diagnostic Tools Created

To help debug these issues, we created several diagnostic tools:

### 1. Switchboard Configuration Debugger
**URL:** `http://localhost:3000/debug-switchboard`
- Shows integration status
- Validates configuration
- Displays all settings

### 2. JSON Template Fixer
**URL:** `http://localhost:3000/fix-switchboard-json`
- Shows JSON parse errors with line numbers
- Allows editing and fixing templates
- Validates JSON syntax

### 3. Template Processing Tester
**URL:** `http://localhost:3000/test-template-processing`
- Shows how placeholders are replaced
- Displays processed template
- Identifies unreplaced placeholders

### 4. Field Mappings Diagnostic
**URL:** `http://localhost:3000/debug-field-mappings`
- Shows custom field values from attendee
- Displays field mappings configuration
- Highlights matching values

### 5. Custom Fields Debug Endpoint
**URL:** `http://localhost:3000/api/attendees/debug-custom-fields?attendeeId=xxx`
- Shows raw custom field data
- Displays parsed values
- Identifies data format issues

---

## Configuration Guide

### Complete Switchboard Setup

1. **Go to Event Settings → Integrations → Switchboard Canvas**

2. **Enable Integration**
   - Toggle "Enable Switchboard Canvas" to ON

3. **Configure API Settings**
   - API Endpoint: `https://api.switchboard.com/v1/render`
   - Auth Header Type: `Bearer` (or your provider's type)
   - API Key: Your Switchboard API key
   - **Template ID**: Your template ID (e.g., `template_abc123`)

4. **Create Request Body Template**
   - Valid JSON with placeholders
   - Example:
     ```json
     {
       "template_id": "{{template_id}}",
       "data": {
         "firstName": "{{firstName}}",
         "lastName": "{{lastName}}",
         "company": "{{company}}"
       }
     }
     ```

5. **Configure Field Mappings** (if needed)
   - Map custom fields to JSON variables
   - Set up value transformations
   - Example:
     ```json
     [
       {
         "fieldId": "68e351ad001a939881bb",
         "fieldType": "select",
         "jsonVariable": "credential_type_variable",
         "valueMapping": {
           "VIP": "https://url-to-vip-bg.png",
           "Regular": "https://url-to-regular-bg.png"
         }
       }
     ]
     ```

6. **Test Configuration**
   - Visit `/debug-switchboard` to validate
   - Visit `/test-template-processing` to test with real data

7. **Generate Credentials**
   - Select an attendee
   - Click "Generate Credential"
   - Should work without errors!

---

## Data Flow

### Storage Format (Database)
Custom field values stored as JSON string in array format:
```json
"[{\"customFieldId\":\"field123\",\"value\":\"Company\"}]"
```

### API Response Format (for UI)
Converted to array of objects:
```json
[
  {"customFieldId": "field123", "value": "Company"}
]
```

### Credential Generation Format (internal)
Converted to object for placeholder lookup:
```json
{
  "field123": "Company"
}
```

### Final Output (to Switchboard)
Placeholders replaced with actual values:
```json
{
  "template_id": "template_abc123",
  "data": {
    "company": "Company"
  }
}
```

---

## Key Learnings

1. **Data Format Consistency**: The same data needs different formats for different purposes (storage, UI, processing)
2. **Integration Architecture**: Appwrite uses separate collections for integrations, linked by `eventSettingsId`
3. **Regex Escaping**: Always use a helper function for regex escaping to avoid corruption
4. **Diagnostic Tools**: Creating debug endpoints saved hours of troubleshooting
5. **Array vs Object**: JavaScript's `Object.keys()` on an array returns indices, not the actual keys

---

## Files Modified Summary

### Core Fixes
- `src/pages/api/attendees/[id]/generate-credential.ts` - Complete rewrite with proper data handling
- `src/pages/api/attendees/index.ts` - Fixed custom field value transformation
- `src/pages/api/attendees/[id].ts` - Fixed custom field value transformation
- `src/components/EventSettingsForm.tsx` - Added Template ID field

### Diagnostic Tools Created
- `src/pages/debug-switchboard.tsx`
- `src/pages/fix-switchboard-json.tsx`
- `src/pages/test-template-processing.tsx`
- `src/pages/debug-field-mappings.tsx`
- `src/pages/api/integrations/test-switchboard.ts`
- `src/pages/api/integrations/fix-switchboard-json.ts`
- `src/pages/api/integrations/test-template-processing.ts`
- `src/pages/api/attendees/debug-custom-fields.ts`

### Documentation Created
- `CUSTOM_FIELD_VALUES_FIX.md`
- `INTEGRATION_ARCHITECTURE_FIX.md`
- `TEMPLATE_ID_FIX.md`
- `REGEX_ESCAPE_BUG_FIX.md`
- `SWITCHBOARD_CONFIGURATION_GUIDE.md`
- `CREDENTIAL_GENERATION_FIXES_SUMMARY.md` (this file)

---

## Status: ✅ COMPLETE

Credential generation is now fully functional with:
- ✅ Custom field values properly recognized
- ✅ Field mappings working correctly
- ✅ Value transformations applied
- ✅ Placeholders replaced accurately
- ✅ Valid JSON sent to Switchboard API
- ✅ Credentials successfully generated

---

## Maintenance Notes

### If Credential Generation Fails in Future

1. **Check configuration**: Visit `/debug-switchboard`
2. **Test template processing**: Visit `/test-template-processing`
3. **Verify custom field data**: Use `/api/attendees/debug-custom-fields?attendeeId=xxx`
4. **Check field mappings**: Visit `/debug-field-mappings`
5. **Review server logs**: Check terminal for detailed error messages

### Common Issues

- **"Template ID not configured"**: Add Template ID in Event Settings
- **"Invalid JSON"**: Use `/fix-switchboard-json` to identify and fix syntax errors
- **Unreplaced placeholders**: Check field mappings or set internal field names
- **Empty values**: Verify attendee has custom field values filled in
- **Wrong values**: Check value mappings match exactly (case-sensitive)

---

## Success! 🎉

The credential generation system is now working end-to-end with full support for:
- Custom fields
- Field mappings
- Value transformations
- Multiple credential types
- Dynamic placeholder replacement
