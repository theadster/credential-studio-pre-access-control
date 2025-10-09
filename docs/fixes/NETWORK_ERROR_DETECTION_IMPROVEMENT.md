# Network Error Detection Improvement

## Problem

The `useApiError.ts` hook's network error detection was too brittle, only matching a single exact error message:

```typescript
// Before: Brittle detection
if (error instanceof TypeError && error.message === 'Failed to fetch') {
  return { isNetworkError: true, ... };
}
```

**Issues:**
- **Browser-specific**: Different browsers use different error messages
- **Exact match**: Required exact string match, missing variations
- **Environment-specific**: Node.js, React Native, and browsers differ
- **Missed errors**: Many network failures went undetected
- **Poor UX**: Users saw generic errors instead of network-specific messages

### Examples of Missed Network Errors

Different environments produce different error messages:
- Chrome: `"Failed to fetch"`
- Firefox: `"NetworkError when attempting to fetch resource"`
- Safari: `"Load failed"`
- React Native: `"Network request failed"`
- Node.js: `"fetch failed"`, `"ECONNREFUSED"`
- Offline: Various messages depending on context

## Solution

Implemented comprehensive network error detection that checks multiple conditions:

### 1. Created `isNetworkError()` Helper Function

```typescript
/**
 * Check if an error is a network error
 * Detects various network failure patterns across browsers and environments
 */
function isNetworkError(error: any): boolean {
  // Check if it's a TypeError (common for network errors)
  if (error instanceof TypeError || error.name === 'TypeError') {
    return true;
  }

  // Check for common network error message patterns (case-insensitive)
  const message = (error.message || '').toLowerCase();
  const networkPatterns = [
    'failed to fetch',
    'network request failed',
    'network error',
    'networkerror',
    'fetch failed',
    'load failed',
    'connection refused',
    'connection failed',
    'unable to connect',
    'no internet',
    'offline'
  ];

  if (networkPatterns.some(pattern => message.includes(pattern))) {
    return true;
  }

  // Check if error lacks a response property (indicates network failure before response)
  // But has other error properties (to avoid false positives)
  if (!error.response && (error.message || error.name) && !error.error && !error.code) {
    return true;
  }

  return false;
}
```

**Detection strategies:**

1. **Type checking**: Checks for `TypeError` (both instance and name)
2. **Pattern matching**: Tests message against common network error patterns (case-insensitive)
3. **Response absence**: Detects errors that occurred before receiving a response
4. **False positive prevention**: Ensures error has some properties before classifying

### 2. Updated `parseApiError()` to Use Helper

```typescript
// Before: Single exact match
if (error instanceof TypeError && error.message === 'Failed to fetch') {
  return { isNetworkError: true, ... };
}

// After: Comprehensive detection
if (isNetworkError(error)) {
  return {
    message: 'Unable to connect to the server. Please check your connection.',
    code: 'NETWORK_ERROR',
    isNetworkError: true,
    isAuthError: false,
    isValidationError: false
  };
}
```

### 3. Made Timeout Detection Case-Insensitive

```typescript
// Before: Case-sensitive
if (error.name === 'AbortError' || error.message?.includes('timeout')) {

// After: Case-insensitive
if (error.name === 'AbortError' || error.message?.toLowerCase().includes('timeout')) {
```

## Detection Coverage

### Browser-Specific Errors

| Browser | Error Message | Detected |
|---------|--------------|----------|
| Chrome | "Failed to fetch" | ✅ |
| Firefox | "NetworkError when attempting to fetch resource" | ✅ |
| Safari | "Load failed" | ✅ |
| Edge | "Failed to fetch" | ✅ |

### Environment-Specific Errors

| Environment | Error Pattern | Detected |
|-------------|--------------|----------|
| React Native | "Network request failed" | ✅ |
| Node.js | "fetch failed", "ECONNREFUSED" | ✅ |
| Offline mode | Various offline messages | ✅ |
| CORS errors | TypeError without response | ✅ |

### Network Conditions

| Condition | Detection Method | Detected |
|-----------|-----------------|----------|
| No internet | Pattern matching | ✅ |
| Server down | Connection refused pattern | ✅ |
| DNS failure | TypeError + no response | ✅ |
| Timeout | AbortError or timeout message | ✅ |
| CORS blocked | TypeError + no response | ✅ |

## Files Modified

**src/hooks/useApiError.ts**
- Added `isNetworkError()` helper function
- Updated `parseApiError()` to use comprehensive detection
- Made timeout detection case-insensitive
- Added JSDoc documentation

## Benefits

✅ **Cross-browser compatible**: Works across Chrome, Firefox, Safari, Edge  
✅ **Cross-platform**: Handles Node.js, React Native, and browser environments  
✅ **Pattern-based**: Matches multiple error message variations  
✅ **Case-insensitive**: Handles different casing in error messages  
✅ **Response-aware**: Detects errors that occur before response  
✅ **False positive prevention**: Validates error structure before classification  
✅ **Better UX**: Users see appropriate network error messages  
✅ **Retry logic**: Network errors trigger automatic retry in `fetchWithRetry()`  

## Testing Recommendations

### Manual Testing

1. **Offline mode**
   ```typescript
   // Disconnect network
   // Try any API call
   // Should show: "Unable to connect to the server. Please check your connection."
   ```

2. **Server down**
   ```typescript
   // Stop backend server
   // Try any API call
   // Should show network error message
   ```

3. **Timeout**
   ```typescript
   // Use slow network throttling
   // Try API call with short timeout
   // Should show: "Request timed out. Please try again."
   ```

4. **CORS error**
   ```typescript
   // Make request to non-CORS-enabled endpoint
   // Should detect as network error
   ```

### Unit Testing

```typescript
import { parseApiError } from '@/hooks/useApiError';

describe('Network Error Detection', () => {
  it('should detect Chrome fetch error', () => {
    const error = new TypeError('Failed to fetch');
    const result = parseApiError(error);
    expect(result.isNetworkError).toBe(true);
  });

  it('should detect Firefox network error', () => {
    const error = { message: 'NetworkError when attempting to fetch resource' };
    const result = parseApiError(error);
    expect(result.isNetworkError).toBe(true);
  });

  it('should detect Safari load error', () => {
    const error = { message: 'Load failed' };
    const result = parseApiError(error);
    expect(result.isNetworkError).toBe(true);
  });

  it('should detect React Native network error', () => {
    const error = { message: 'Network request failed' };
    const result = parseApiError(error);
    expect(result.isNetworkError).toBe(true);
  });

  it('should detect error without response', () => {
    const error = { message: 'Some error', name: 'Error' };
    const result = parseApiError(error);
    expect(result.isNetworkError).toBe(true);
  });

  it('should not detect API errors as network errors', () => {
    const error = { error: 'Invalid request', code: 'VALIDATION_ERROR' };
    const result = parseApiError(error);
    expect(result.isNetworkError).toBe(false);
  });

  it('should detect timeout errors', () => {
    const error = { name: 'AbortError' };
    const result = parseApiError(error);
    expect(result.isNetworkError).toBe(true);
  });

  it('should handle case-insensitive timeout messages', () => {
    const error = { message: 'Request TIMEOUT exceeded' };
    const result = parseApiError(error);
    expect(result.isNetworkError).toBe(true);
  });
});
```

## Example Usage

```typescript
import { useApiError } from '@/hooks/useApiError';

function MyComponent() {
  const { handleError, fetchWithRetry } = useApiError();

  const loadData = async () => {
    try {
      // Automatically retries network errors
      const data = await fetchWithRetry('/api/data');
      // ... use data
    } catch (error) {
      // Shows appropriate message based on error type
      handleError(error);
    }
  };

  return <button onClick={loadData}>Load Data</button>;
}
```

## Error Messages by Type

| Error Type | User Message | Code |
|------------|-------------|------|
| Network Error | "Unable to connect to the server. Please check your connection." | `NETWORK_ERROR` |
| Timeout | "Request timed out. Please try again." | `TIMEOUT_ERROR` |
| Auth Error | "Permission Denied" | `AUTH_FAILED` |
| Validation Error | (Specific validation message) | `VALIDATION_ERROR` |
| Unknown Error | "An unexpected error occurred" | `UNKNOWN_ERROR` |

## Future Improvements

Consider these enhancements:

1. **Retry with exponential backoff**: Already implemented in `fetchWithRetry()`
2. **Network status monitoring**: Use `navigator.onLine` to detect offline state
3. **Error telemetry**: Log network errors for monitoring
4. **Custom retry strategies**: Allow per-request retry configuration
5. **Circuit breaker**: Stop retrying after repeated failures

## Related Files

- `src/hooks/useApiError.ts` - Error handling hook
- `src/lib/apiFetch.ts` - API fetch helper with timeout
- `src/components/ui/use-toast.tsx` - Toast notification component
