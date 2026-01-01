# Enhanced Credential Generation Error Messages

## Overview
Improved error messages for credential generation to provide comprehensive debugging information when failures occur. This enhancement affects both the API layer and frontend display of errors.

## Changes Made

### API Layer (`src/pages/api/attendees/[id]/generate-credential.ts`)

Enhanced all error responses to include detailed information:

#### 1. Permission Errors
- Added `requiredPermission` field
- Added `userRole` field to show current user's role
- Provides clear explanation of what permission is needed

#### 2. Configuration Errors
- **Event Settings**: Added hint to configure event settings first
- **Integration Not Found**: Added navigation hint to Event Settings > Integrations
- **Integration Disabled**: Clear message about enabling the integration
- **Missing Configuration**: Lists specific missing items (API key, endpoint, etc.)

#### 3. Switchboard Canvas API Errors
- **Connection Failures**: 
  - Added `errorType: 'NetworkError'`
  - Includes endpoint URL
  - Shows actual error message from fetch
  
- **API Response Errors**:
  - Includes HTTP status code and status text
  - Shows response body (parsed as JSON if possible)
  - Includes endpoint URL for debugging
  
- **Invalid Response Format**:
  - Shows what was expected vs. what was received
  - Includes first 500 characters of response body
  - Provides endpoint information

#### 4. Response Processing Errors
- **Missing Credential URL**:
  - Lists all fields found in response
  - Shows expected field names
  - Includes full response for debugging
  
- **JSON Parse Errors**:
  - Shows position of error in JSON
  - Includes snippet around error location
  - Shows both processed and original template
  - Lists available placeholders

#### 5. Generic Errors
- Added `errorType` field
- Includes error message
- In development mode, includes stack trace (first 3 lines)
- Appwrite errors include error code

### Frontend Layer (`src/pages/dashboard.tsx`)

#### Single Credential Generation
- Changed from simple paragraph to `<pre>` tag for better formatting
- Increased modal width to 600px for better readability
- Added scrollable container (max-height: 400px) for long errors
- Displays all error details in monospace font
- Added helpful tip about checking integration settings
- Shows multi-line error messages properly formatted

#### Bulk Credential Generation
- Enhanced error message construction to include:
  - Error details
  - Status code
  - Error type
  - Response body (truncated to 200 chars for list view)
- Improved error list styling with word-break for long messages
- Better font sizing for readability

## Error Information Now Included

All credential generation errors now provide:

1. **Primary Error Message**: Clear, user-friendly description
2. **Details**: Technical details about what went wrong
3. **Error Type**: Classification of the error (NetworkError, TemplateProcessingError, etc.)
4. **Context Information**:
   - Endpoint URL (when applicable)
   - Status codes
   - Response bodies
   - Configuration state
5. **Hints**: Actionable suggestions for fixing the issue
6. **Debug Information**: 
   - Available placeholders
   - Field mappings
   - Response structure
   - Stack traces (development only)

## Benefits

1. **Faster Debugging**: Developers can immediately see what went wrong without checking server logs
2. **Better User Experience**: Users get actionable information instead of generic error messages
3. **Reduced Support Burden**: Clear error messages help users self-diagnose configuration issues
4. **Improved Troubleshooting**: All relevant context is available in the error message
5. **Development Efficiency**: Stack traces in development mode speed up bug fixing

## Example Error Messages

### Before
```
Failed to generate credential with Switchboard Canvas
```

### After
```
Failed to generate credential with Switchboard Canvas

Details: API returned 400 Bad Request

API Response: {
  "error": "Missing required field",
  "field": "template_id"
}

Endpoint: https://api.switchboardcanvas.com/v1/generate

Status Code: 400
```

## Testing

Existing tests continue to pass as they use `expect.objectContaining()` which allows additional fields in the response.

## Files Modified

1. `src/pages/api/attendees/[id]/generate-credential.ts` - Enhanced all error responses
2. `src/pages/dashboard.tsx` - Improved error display in UI

## Future Enhancements

Consider adding:
- Error categorization for better filtering in logs
- Retry suggestions based on error type
- Link to documentation for specific error types
- Error reporting/tracking integration
