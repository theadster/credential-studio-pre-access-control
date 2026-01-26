---
title: Attendee API Sensitive Error Exposure Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-26
review_interval_days: 90
related_code: ["src/pages/api/attendees/[id].ts"]
---

# Attendee API Sensitive Error Exposure Fix

## Problem

The attendee API photo update handler was potentially exposing sensitive internal error details to clients:

1. **Raw Error Objects**: Returning `result.error` directly in the response payload
2. **Stack Traces**: Potentially exposing internal stack traces and implementation details
3. **Undefined Values**: `retriesAttempted` could be undefined if `result.retriesUsed` was not set

### Security Risk

Exposing internal error details can:
- Reveal system architecture and implementation details
- Provide information useful for targeted attacks
- Violate security best practices for error handling
- Expose database or service internals

### Example Vulnerable Response

```json
{
  "code": "MAX_RETRIES_EXCEEDED",
  "documentId": "123",
  "error": {
    "type": "MAX_RETRIES_EXCEEDED",
    "message": "Failed to update document after 5 retries due to version conflicts",
    "originalError": {
      "stack": "Error: ...",
      "code": "INTERNAL_DB_ERROR"
    }
  },
  "retriesAttempted": undefined
}
```

## Solution

Implemented secure error handling with server-side logging and sanitized client responses:

```typescript
if (!result.success) {
  // Log full error server-side for debugging
  console.error('[Attendee Update] Photo field update failed:', result.error);
  
  // Extract only the error code for client
  const errorCode = result.error?.type 
    ? mapLockErrorToCode(result.error.type) 
    : ConcurrencyErrorCode.MAX_RETRIES_EXCEEDED;
  
  // Create sanitized response with no raw error objects
  const errorResponse = createConcurrencyErrorResponse({
    code: errorCode,
    documentId: id,
    operationType: OperationType.PHOTO_UPLOAD,
    // Safe default: use number if available, otherwise 0
    retriesAttempted: typeof result.retriesUsed === 'number' ? result.retriesUsed : 0,
    conflictingFields: ['photoUrl'],
  });
  
  return res.status(getHttpStatusForError(errorCode)).json(errorResponse);
}
```

## Security Improvements

### 1. Server-Side Logging
- Full error details logged server-side for debugging and monitoring
- Developers can investigate issues without exposing details to clients
- Audit trail for security analysis

### 2. Sanitized Client Response
- No raw error objects in response
- No stack traces or internal details
- Only error code, document ID, operation type, and conflicting fields
- Consistent error format across all endpoints

### 3. Safe Default Values
- `retriesAttempted` defaults to 0 if undefined
- Type-safe check: `typeof result.retriesUsed === 'number'`
- Prevents undefined values in JSON responses

### 4. Structured Error Codes
- Uses `mapLockErrorToCode()` to convert internal error types to safe codes
- Clients receive standardized error codes for handling
- No implementation details leaked through error messages

## Implementation Details

### Error Handling Flow

```
Internal Error
    ↓
Server-side logging (console.error)
    ↓
Extract error code (mapLockErrorToCode)
    ↓
Create sanitized response (createConcurrencyErrorResponse)
    ↓
Set HTTP status (getHttpStatusForError)
    ↓
Return to client (no raw error objects)
```

### Safe Defaults

- `retriesAttempted`: Defaults to 0 if not a number
- `code`: Defaults to MAX_RETRIES_EXCEEDED if error type not found
- `conflictingFields`: Always includes 'photoUrl' for photo operations
- `operationType`: Always set to PHOTO_UPLOAD for this endpoint

## Benefits

1. **Security**: No sensitive internals exposed to clients
2. **Debugging**: Full error details available server-side for investigation
3. **Consistency**: Standardized error format across endpoints
4. **Reliability**: Safe defaults prevent undefined values
5. **Compliance**: Follows security best practices for error handling

## Testing Recommendations

- Test with various error types (version conflicts, network errors, etc.)
- Verify error response contains no raw error objects
- Verify error response contains no stack traces
- Verify `retriesAttempted` is always a number (never undefined)
- Verify server logs contain full error details
- Test with missing or undefined `result.retriesUsed`
- Verify HTTP status codes are set correctly

## Related Documentation

- [Error Handling Guide](../guides/ERROR_HANDLING_GUIDE.md)
- [Integration Security Guide](../guides/INTEGRATION_SECURITY_GUIDE.md)
- [API Response Standards](../reference/API_TRANSACTIONS_REFERENCE.md)
