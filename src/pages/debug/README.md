# Debug Tools

This directory contains diagnostic and debugging tools for troubleshooting the CredentialStudio application.

## Available Tools

### 🔍 Switchboard Configuration Debugger
**URL:** `/debug/switchboard`  
**Purpose:** Validate Switchboard Canvas integration configuration

**Features:**
- Shows integration status (enabled/disabled)
- Validates all required fields (API endpoint, key, template ID)
- Checks request body JSON syntax
- Displays field mappings configuration
- Identifies configuration issues

**Use When:**
- Setting up Switchboard integration for the first time
- Troubleshooting "integration not configured" errors
- Verifying all settings are correct

---

### 🗺️ Field Mappings Diagnostic
**URL:** `/debug/field-mappings`  
**Purpose:** Visualize custom field values and field mappings

**Features:**
- Shows custom field values from attendee
- Displays configured field mappings
- Highlights which mappings match attendee data
- Shows value transformations
- Lists all available custom fields

**Use When:**
- Custom field placeholders aren't being replaced
- Value mappings aren't working correctly
- Need to see what data an attendee has

---

### 🔄 Template Processing Tester
**URL:** `/debug/template-processing`  
**Purpose:** Test how Switchboard templates are processed with placeholder replacement

**Features:**
- Shows original template
- Displays processed template (after placeholder replacement)
- Lists all placeholders that were replaced
- Identifies unreplaced placeholders
- Shows the final JSON that would be sent to Switchboard
- Displays any JSON parse errors

**Use When:**
- Placeholders aren't being replaced
- Getting "Invalid JSON" errors
- Need to see the exact output before sending to Switchboard
- Debugging template syntax issues

---

### 🔧 JSON Template Fixer
**URL:** `/debug/fix-json`  
**Purpose:** Edit and fix Switchboard request body JSON templates

**Features:**
- Shows JSON parse errors with line numbers
- Highlights the exact line with the error
- Provides an editor to fix the template
- Validates JSON syntax
- Allows saving fixed templates back to database

**Use When:**
- Getting JSON syntax errors
- Need to fix trailing commas or other syntax issues
- Want to edit the template with immediate validation

---

## API Endpoints

These endpoints power the debug pages and can also be called directly:

### `/api/debug/test-switchboard`
**Method:** GET  
**Returns:** Switchboard configuration validation results

### `/api/debug/test-template-processing`
**Method:** GET  
**Query Params:** `attendeeId` (optional)  
**Returns:** Template processing results with placeholder replacement

### `/api/debug/fix-switchboard-json`
**Method:** GET | POST  
**GET:** Returns current template with line numbers and error details  
**POST:** Updates template with fixed JSON

### `/api/debug/attendee-custom-fields`
**Method:** GET  
**Query Params:** `attendeeId` (required)  
**Returns:** Detailed custom field data for a specific attendee

---

## Common Workflows

### Troubleshooting Credential Generation

1. **Check configuration:** Visit `/debug/switchboard`
2. **Test template processing:** Visit `/debug/template-processing`
3. **Verify custom field data:** Visit `/debug/field-mappings`
4. **Fix JSON errors:** Visit `/debug/fix-json`

### Setting Up New Integration

1. Configure Switchboard in Event Settings
2. Visit `/debug/switchboard` to validate
3. Visit `/debug/template-processing` to test with real data
4. Generate a test credential

### Debugging Placeholder Issues

1. Visit `/debug/template-processing` to see what's being replaced
2. Visit `/debug/field-mappings` to verify attendee has data
3. Check that field IDs in mappings match actual custom field IDs
4. Verify value mappings match exactly (case-sensitive)

---

## Development Notes

These tools are meant for:
- Development and debugging
- Initial setup and configuration
- Troubleshooting production issues
- Training and documentation

They should NOT be:
- Exposed to end users (consider adding authentication)
- Used in production workflows
- Relied upon for critical operations

---

## Removing Debug Tools

If you want to remove these tools from production:

1. Delete the `/src/pages/debug` directory
2. Delete the `/src/pages/api/debug` directory
3. Remove any references in documentation

Or keep them but add authentication:
```typescript
// Add to each debug page
import { useAuth } from '@/contexts/AuthContext';

export default function DebugPage() {
  const { currentUser } = useAuth();
  
  // Only allow admins
  if (currentUser?.role?.name !== 'Super Administrator') {
    return <div>Access Denied</div>;
  }
  
  // ... rest of component
}
```

---

## Related Documentation

- `CREDENTIAL_GENERATION_FIXES_SUMMARY.md` - Overview of all fixes
- `SWITCHBOARD_CONFIGURATION_GUIDE.md` - Setup guide
- `INTEGRATION_ARCHITECTURE_FIX.md` - Architecture details
