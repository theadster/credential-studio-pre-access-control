# Switchboard Template Validation Fix

## Problem

The credential generation endpoint (`generate-credential.ts.backup`) contained fragile runtime JSON string manipulation that attempted to "fix" malformed JSON templates:

```typescript
// Fragile runtime patching
cleanedRequestBody = cleanedRequestBody.replace(/\t/g, '  ');
cleanedRequestBody = cleanedRequestBody.replace(/([}\]])\s*("[^"]+":)/g, '$1,\n$2');
```

This approach had several issues:
- **Unreliable**: Regex-based JSON "fixing" is inherently fragile and can fail in unexpected ways
- **Late detection**: Errors only discovered at credential generation time, not when template is saved
- **Poor UX**: Users wouldn't know their template was invalid until they tried to generate a credential
- **Maintenance burden**: Required ongoing maintenance as new edge cases were discovered

## Solution

Implemented authoritative validation at save time with clear error messages at runtime:

### 1. Template Validation at Save Time

Added JSON validation to `updateSwitchboardIntegration()` in `src/lib/appwrite-integrations.ts`:

```typescript
export async function updateSwitchboardIntegration(
  databases: Databases,
  eventSettingsId: string,
  data: Partial<Omit<SwitchboardIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<SwitchboardIntegration> {
  // Validate requestBody JSON if provided
  if (data.requestBody !== undefined && data.requestBody !== null && data.requestBody !== '') {
    try {
      JSON.parse(data.requestBody);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown JSON parse error';
      throw new Error(
        `Invalid JSON in Switchboard requestBody template. ${errorMessage}. ` +
        `Please ensure the template is valid JSON before saving.`
      );
    }
  }

  return updateIntegrationWithLocking<SwitchboardIntegration>(
    databases,
    SWITCHBOARD_COLLECTION_ID,
    'Switchboard',
    eventSettingsId,
    data,
    expectedVersion,
    () => getSwitchboardIntegration(databases, eventSettingsId)
  );
}
```

**Benefits:**
- Malformed templates are rejected immediately when user tries to save
- Clear error message tells user exactly what's wrong
- Prevents invalid templates from being stored in the database

### 2. Runtime Validation with Clear Error Messages

Updated `generate-credential.ts.backup` to validate JSON upfront and provide helpful error messages:

```typescript
// Validate that the template is valid JSON before processing
let templateJson;
try {
  templateJson = JSON.parse(requestBody);
} catch (jsonError) {
  const errorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError);
  return res.status(400).json({
    error: 'Invalid JSON template in Switchboard Canvas configuration',
    details: `The saved template contains invalid JSON: ${errorMessage}. Please update the Switchboard configuration with valid JSON.`,
    hint: 'Go to Event Settings > Integrations > Switchboard Canvas and fix the Request Body template.'
  });
}
```

**Benefits:**
- Fails fast with clear error message if template is somehow invalid
- Provides actionable guidance to user on how to fix the issue
- No fragile string manipulation that could introduce new errors

### 3. Removed Fragile String Manipulation

**Before:**
```typescript
// Fix common JSON syntax issues
let cleanedRequestBody = requestBody;
cleanedRequestBody = cleanedRequestBody.replace(/\t/g, '  ');
cleanedRequestBody = cleanedRequestBody.replace(/([}\]])\s*("[^"]+":)/g, '$1,\n$2');
```

**After:**
```typescript
// Validate that the template is valid JSON before processing
let templateJson;
try {
  templateJson = JSON.parse(requestBody);
} catch (jsonError) {
  // Return clear error with actionable guidance
}
```

## Files Modified

1. **src/lib/appwrite-integrations.ts**
   - Added JSON validation to `updateSwitchboardIntegration()`
   - Validates `requestBody` field when provided
   - Throws descriptive error if JSON is invalid

2. **src/pages/api/attendees/[id]/generate-credential.ts.backup**
   - Removed fragile regex-based JSON "fixing" (lines 80-83)
   - Added upfront JSON validation with clear error messages
   - Improved error handling for placeholder replacement issues

## Testing Recommendations

### Test Invalid Template Rejection at Save Time

1. Go to Event Settings > Integrations > Switchboard Canvas
2. Try to save a template with invalid JSON (e.g., missing comma, trailing comma, unquoted keys)
3. Verify that save fails with clear error message
4. Fix the JSON and verify save succeeds

### Test Runtime Validation

1. If an invalid template somehow exists in the database (e.g., from migration)
2. Try to generate a credential
3. Verify clear error message is returned with guidance on how to fix

### Test Valid Templates Still Work

1. Save a valid Switchboard template with placeholders
2. Generate credentials for attendees
3. Verify credentials are generated successfully

## Benefits

✅ **Fail Fast**: Invalid templates rejected at save time, not at credential generation time  
✅ **Clear Errors**: Descriptive error messages with actionable guidance  
✅ **Maintainable**: No fragile regex-based JSON manipulation to maintain  
✅ **Reliable**: Standard JSON.parse() validation instead of custom string manipulation  
✅ **Better UX**: Users know immediately if their template is invalid  

## Related Files

- `src/lib/appwrite-integrations.ts` - Integration update functions with validation
- `src/pages/api/attendees/[id]/generate-credential.ts.backup` - Credential generation endpoint
- `src/pages/api/event-settings/index.ts` - Event settings endpoint that calls integration updates
