# Bulk Credential Generation Error Display Fix

## Issue
When bulk generating credentials failed, the error message shown to users was generic and unhelpful:
- Only showed "Failed to generate credential with Switchboard Canvas"
- Didn't include the detailed error information from the API
- Error messages said "Check console for details" instead of showing actual errors

## Root Cause
The dashboard's bulk credential generation handler was:
1. Not extracting the `details` field from API error responses
2. Not displaying the actual error messages to users in the final result modal

## Solution

### 1. Enhanced Error Message Extraction
**File:** `src/pages/dashboard.tsx` (line ~1782)

**Before:**
```typescript
if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.error || 'Failed to generate credential');
}
```

**After:**
```typescript
if (!response.ok) {
  const errorData = await response.json();
  // Include detailed error information if available
  const errorMessage = errorData.details 
    ? `${errorData.error}: ${errorData.details}`
    : errorData.error || 'Failed to generate credential';
  throw new Error(errorMessage);
}
```

**Impact:** Users now see the full error message including details like:
- "Failed to generate credential with Switchboard Canvas: API returned 401: Unauthorized"
- "Invalid request body template in Switchboard Canvas settings: JSON parse error at position 123"
- "Switchboard Canvas integration not found"

### 2. Improved Error Display in Results Modal
**File:** `src/pages/dashboard.tsx` (line ~1822)

**Before:**
```typescript
if (successCount > 0 && errorCount > 0) {
  warning("Partial Success", `Generated ${successCount} credential(s), ${errorCount} failed. Check console for details.`);
} else {
  error("Generation Failed", `Failed to generate any credentials. ${errors.length > 0 ? 'Check console for details.' : ''}`);
}
```

**After:**
```typescript
if (successCount > 0 && errorCount > 0) {
  const errorList = errors.slice(0, 3).join('\n');
  const moreErrors = errors.length > 3 ? `\n...and ${errors.length - 3} more` : '';
  warning("Partial Success", `Generated ${successCount} credential(s), ${errorCount} failed:\n\n${errorList}${moreErrors}`);
} else {
  const errorList = errors.slice(0, 3).join('\n');
  const moreErrors = errors.length > 3 ? `\n...and ${errors.length - 3} more` : '';
  error("Generation Failed", `Failed to generate any credentials:\n\n${errorList}${moreErrors}`);
}
```

**Impact:** 
- Shows up to 3 actual error messages directly in the modal
- Indicates if there are more errors beyond the first 3
- No need to check console for basic troubleshooting

## Example Error Messages Users Will Now See

### Switchboard API Error
```
John Doe: Failed to generate credential with Switchboard Canvas: API returned 401: Unauthorized
Jane Smith: Failed to generate credential with Switchboard Canvas: API returned 401: Unauthorized
Bob Johnson: Failed to generate credential with Switchboard Canvas: API returned 401: Unauthorized
...and 5 more
```

### Configuration Error
```
John Doe: Switchboard Canvas integration not found
```

### Template Error
```
John Doe: Invalid request body template in Switchboard Canvas settings: JSON parse error: Unexpected token } at position 234
```

## Benefits

1. **Better User Experience:** Users immediately see what went wrong without checking console
2. **Faster Debugging:** Detailed error messages help identify configuration issues quickly
3. **Actionable Information:** Users can see if it's an auth issue, config issue, or template issue
4. **Batch Context:** Shows which attendees failed and why

## Common Errors Users Might See

| Error Message | Likely Cause | Solution |
|--------------|--------------|----------|
| API returned 401: Unauthorized | Invalid or missing SWITCHBOARD_API_KEY | Check environment variable |
| API returned 404: Not Found | Wrong API endpoint URL | Verify Switchboard integration settings |
| Switchboard Canvas integration not found | Integration not configured | Set up Switchboard integration in event settings |
| JSON parse error | Invalid template syntax | Check request body template in integration settings |
| No credential URL returned | Unexpected API response format | Verify Switchboard API response structure |

## Testing Recommendations

To verify the fix works:

1. **Test with invalid API key:**
   - Temporarily set wrong SWITCHBOARD_API_KEY
   - Try bulk generating credentials
   - Should see: "Failed to generate credential with Switchboard Canvas: API returned 401: Unauthorized"

2. **Test with missing integration:**
   - Disable Switchboard integration
   - Try bulk generating credentials
   - Should see: "Switchboard Canvas integration is not enabled"

3. **Test with invalid template:**
   - Add syntax error to request body template
   - Try bulk generating credentials
   - Should see: "Invalid request body template: JSON parse error..."

4. **Test successful generation:**
   - With valid configuration
   - Should see: "Successfully generated X credentials"

## Files Modified

- `src/pages/dashboard.tsx` - Enhanced error extraction and display

## Related Documentation

- API endpoint: `src/pages/api/attendees/[id]/generate-credential.ts`
- Switchboard integration guide: `docs/guides/SWITCHBOARD_CONFIGURATION_GUIDE.md`
