# Bulk Credential Generation Error Handling Fix

## Issue
When bulk generating credentials, if a single credential encountered an error, it would show as an ugly Next.js runtime error instead of being caught and displayed in the final SweetAlert modal:

```
Runtime Error
Failed to generate credential with Switchboard Canvas: API returned 400: 
{"id":"9db1c637-6ffe-4b16-a278-e0b74653a5b0","success":false,"errorMessage":"The request object was invalid"}
at handleBulkGenerateCredentials (src/pages/dashboard.tsx:1807:19)
```

This resulted in:
- Bulk operation stopping at the first error
- No summary of which attendees succeeded/failed
- Scary red error screen instead of user-friendly modal
- Loss of progress information

## Root Cause
The error handling in the bulk generation loop had three issues:

1. **Error parsing could fail:** When parsing the error response JSON failed, it would throw another error that wasn't caught
2. **React Error Boundary:** Throwing errors in async event handlers can be caught by React's error boundary before the catch block, causing the Next.js error screen
3. **Error propagation:** Even with proper try-catch, React's error handling can intercept thrown errors

The code structure was:
```typescript
try {
  const response = await fetch(...);
  if (!response.ok) {
    const errorData = await response.json();  // ← Could throw if response isn't JSON
    throw new Error(errorMessage);  // ← Caught by React error boundary!
  }
} catch (error) {
  // This catch block never executes because React intercepts the error
}
```

## Solution

### 1. Replaced Throw with Flag-Based Error Handling
**File:** `src/pages/dashboard.tsx` (handleBulkGenerateCredentials)

Instead of throwing errors (which React's error boundary can catch), we now use flags:

```typescript
let hasError = false;
let errorMessage = '';

try {
  const response = await fetch(...);
  
  if (!response.ok) {
    hasError = true;
    errorMessage = 'Failed to generate credential';
    try {
      const errorData = await response.json();
      errorMessage = errorData.details 
        ? `${errorData.error}: ${errorData.details}`
        : errorData.error || errorMessage;
    } catch (parseError) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
  } else {
    // Process success...
    successCount++;
  }
} catch (err) {
  hasError = true;
  errorMessage = err instanceof Error ? err.message : 'Unknown error';
}

// Record error if one occurred
if (hasError) {
  errorCount++;
  errors.push(`${attendeeName}: ${errorMessage}`);
}
```

**Benefits:**
- No thrown errors means React error boundary won't interfere
- Handles cases where error response isn't valid JSON
- Falls back to HTTP status code and text
- Gracefully continues to next attendee

### 2. Separated Error Handling from Success Path
The code now clearly separates the error path from the success path:

```typescript
if (!response.ok) {
  hasError = true;
  // Handle error...
} else {
  // Handle success...
  successCount++;
}
```

This makes the code flow more explicit and easier to understand.

### 3. Deferred Error Recording
Errors are recorded after the try-catch block completes:

```typescript
if (hasError) {
  errorCount++;
  errors.push(`${attendeeName}: ${errorMessage}`);
}
```

This ensures error recording happens regardless of where the error occurred.

## Error Handling Flow

### Before
```
Attendee 1: ✓ Success
Attendee 2: ✗ Error → [CRASH - Red Next.js error screen]
Attendee 3: [Never processed]
Attendee 4: [Never processed]
```

### After
```
Attendee 1: ✓ Success
Attendee 2: ✗ Error → [Caught, added to errors array]
Attendee 3: ✓ Success
Attendee 4: ✓ Success

[Shows SweetAlert modal with summary]
```

## Error Message Fallbacks

The error handling now has multiple fallback levels:

### Level 1: Detailed API Error
```
Failed to generate credential with Switchboard Canvas: API returned 400: 
{"id":"...", "success":false, "errorMessage":"The request object was invalid"}
```

### Level 2: Simple API Error
```
Switchboard Canvas integration not found
```

### Level 3: HTTP Status
```
HTTP 400: Bad Request
```

### Level 4: Generic Fallback
```
Failed to generate credential
```

## Test Cases

### Test 1: Valid JSON Error Response
**Setup:** API returns proper JSON error
```json
{
  "error": "Switchboard Canvas integration not found",
  "details": "Please configure integration in event settings"
}
```

**Expected Result:**
- Error caught and added to errors array
- Message: "Switchboard Canvas integration not found: Please configure integration in event settings"
- Bulk operation continues to next attendee

### Test 2: Invalid JSON Error Response
**Setup:** API returns non-JSON error (e.g., HTML error page)

**Expected Result:**
- JSON parsing fails but is caught
- Fallback message: "HTTP 400: Bad Request"
- Bulk operation continues to next attendee

### Test 3: Network Error
**Setup:** Network failure during fetch

**Expected Result:**
- Fetch throws network error
- Error caught with message: "Failed to fetch" or similar
- Bulk operation continues to next attendee

### Test 4: Multiple Errors
**Setup:** 10 attendees, 3 have errors

**Expected Result:**
- 7 succeed, 3 fail
- All 10 are processed
- Final modal shows:
  - ✓ Successfully generated: 7 credentials
  - ✗ Failed to generate: 3 credentials
  - List of 3 failed attendees with error messages

## Code Comparison

### Before (Throwing Errors)
```typescript
if (!response.ok) {
  const errorData = await response.json();  // ← Could throw
  const errorMessage = errorData.details 
    ? `${errorData.error}: ${errorData.details}`
    : errorData.error || 'Failed to generate credential';
  throw new Error(errorMessage);  // ← Caught by React error boundary
}
```

**Problems:**
- `response.json()` could throw if response isn't JSON
- `throw new Error()` can be caught by React's error boundary
- Would show Next.js error screen instead of SweetAlert

### After (Flag-Based Handling)
```typescript
let hasError = false;
let errorMessage = '';

if (!response.ok) {
  hasError = true;
  errorMessage = 'Failed to generate credential';
  try {
    const errorData = await response.json();
    errorMessage = errorData.details 
      ? `${errorData.error}: ${errorData.details}`
      : errorData.error || errorMessage;
  } catch (parseError) {
    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  }
}

if (hasError) {
  errorCount++;
  errors.push(`${attendeeName}: ${errorMessage}`);
}
```

**Benefits:**
- No thrown errors = no React error boundary interference
- Safely handles JSON parsing errors
- Always provides a meaningful error message
- Shows SweetAlert modal as intended

## Related Issues Fixed

This fix also resolves:
1. **HTML error pages:** When API returns HTML instead of JSON
2. **Empty responses:** When API returns no body
3. **Malformed JSON:** When API returns invalid JSON
4. **Network timeouts:** When response is incomplete

## Files Modified

- `src/pages/dashboard.tsx` - Enhanced error handling in handleBulkGenerateCredentials

## Testing Recommendations

1. **Test with valid API errors:**
   - Disable Switchboard integration
   - Bulk generate credentials
   - Should see: SweetAlert modal with all failed attendees listed

2. **Test with network errors:**
   - Disconnect internet mid-generation
   - Should see: Errors for failed attendees, successes for completed ones

3. **Test with mixed results:**
   - Have some attendees with valid data, some with invalid
   - Should see: Partial success modal with both counts

4. **Test error message quality:**
   - Verify error messages are readable and helpful
   - Check that attendee names are included
   - Ensure no "undefined" or "[object Object]" messages

## Best Practices Applied

1. **Defensive Programming:** Assume any operation can fail
2. **Graceful Degradation:** Provide fallback error messages
3. **User Experience:** Never crash, always show progress
4. **Error Context:** Include attendee name with each error
5. **Logging:** Console.error for debugging while showing user-friendly messages

## Future Enhancements

Consider adding:
1. **Retry Logic:** Automatically retry failed credentials
2. **Error Categorization:** Group errors by type
3. **Detailed Logging:** Send error details to logging service
4. **Error Recovery:** Suggest fixes based on error type
5. **Partial Retry:** Button to retry only failed attendees

## Related Documentation

- Credential Generation Error Acknowledgment: `docs/enhancements/CREDENTIAL_GENERATION_ERROR_ACKNOWLEDGMENT.md`
- Error Modal Examples: `docs/enhancements/CREDENTIAL_ERROR_MODAL_EXAMPLES.md`
- SweetAlert Error Handling: `docs/fixes/SWEETALERT_ERROR_VARIABLE_CONFLICT_FIX.md`
