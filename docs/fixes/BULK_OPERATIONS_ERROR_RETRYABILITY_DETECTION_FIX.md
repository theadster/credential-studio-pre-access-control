---
title: Bulk Operations Error Retryability Detection Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-26
review_interval_days: 90
related_code: ["src/lib/bulkOperations.ts"]
---

# Bulk Operations Error Retryability Detection Fix

## Problem

The bulk operations error handling was marking all failures as non-retryable (`retryable: false`), regardless of error type. This prevented transient errors (network timeouts, rate limits, server errors) from being retried, leading to unnecessary failures that could have succeeded on retry.

### Example Scenario

```typescript
// Network timeout (transient, should retry)
// Before: retryable: false (incorrect)
// After: retryable: true (correct)

// Rate limit 429 (transient, should retry)
// Before: retryable: false (incorrect)
// After: retryable: true (correct)

// Validation error (permanent, should not retry)
// Before: retryable: false (correct)
// After: retryable: false (correct)
```

## Solution

Implemented `isTransientError()` helper function that intelligently detects transient/retryable errors:

```typescript
function isTransientError(error: any): boolean {
  // Check for explicit transient flag
  if (error.isTransient === true) {
    return true;
  }

  // Check error code for network issues
  const code = error.code || error.message || '';
  const transientCodes = [
    'ECONNRESET',      // Connection reset by peer
    'ETIMEDOUT',       // Connection timeout
    'ECONNREFUSED',    // Connection refused
    'EHOSTUNREACH',    // Host unreachable
    'ENETUNREACH',     // Network unreachable
    'ENOTFOUND',       // DNS resolution failed
    'ECONNABORTED',    // Connection aborted
  ];

  if (transientCodes.some(transientCode => code.includes(transientCode))) {
    return true;
  }

  // Check HTTP status codes
  const status = error.status || error.statusCode || error.code;
  if (status) {
    // 429 = Too Many Requests (rate limit)
    // 5xx = Server errors (transient)
    if (status === 429 || (status >= 500 && status < 600)) {
      return true;
    }
  }

  // Check for Appwrite-specific transient errors
  if (error.type === 'service_unavailable' || error.type === 'rate_limit_exceeded') {
    return true;
  }

  return false;
}
```

## Error Categories

### Transient Errors (retryable: true)

- **Network Issues**: ECONNRESET, ETIMEDOUT, ECONNREFUSED, EHOSTUNREACH, ENETUNREACH, ENOTFOUND, ECONNABORTED
- **Rate Limiting**: HTTP 429
- **Server Errors**: HTTP 5xx (500, 502, 503, 504, etc.)
- **Appwrite Errors**: service_unavailable, rate_limit_exceeded
- **Explicit Flag**: error.isTransient === true

### Permanent Errors (retryable: false)

- Validation errors
- Authentication/authorization errors
- Not found errors (404)
- Client errors (4xx except 429)
- Any error not matching transient patterns

## Implementation Details

- **Helper Function**: `isTransientError()` checks multiple error properties
- **Fallback Checks**: Handles various error object structures (code, status, statusCode, type)
- **Appwrite Integration**: Recognizes Appwrite-specific error types
- **No Breaking Changes**: Only affects error classification, not error handling flow

## Benefits

1. **Improved Reliability**: Transient errors are now retried automatically
2. **Better Error Handling**: Permanent errors fail fast without unnecessary retries
3. **Rate Limit Resilience**: 429 errors trigger retries with backoff
4. **Network Resilience**: Temporary network issues don't cause permanent failures
5. **Appwrite Compatibility**: Recognizes Appwrite-specific error types

## Usage

The helper is used in the bulk operations catch block:

```typescript
catch (updateError: any) {
  errors.push({
    id: update.rowId,
    error: updateError.message,
    retryable: isTransientError(updateError),  // Intelligent detection
  });
}
```

## Testing Recommendations

- Test with network timeout errors (ETIMEDOUT)
- Test with connection reset errors (ECONNRESET)
- Test with HTTP 429 rate limit responses
- Test with HTTP 5xx server errors
- Test with validation errors (should not be retryable)
- Test with 404 not found errors (should not be retryable)
- Test with Appwrite service_unavailable errors
- Verify error messages are preserved in error objects

## Related Documentation

- [Bulk Operations Performance](../guides/BULK_OPERATIONS_PERFORMANCE.md)
- [Error Handling Guide](../guides/ERROR_HANDLING_GUIDE.md)
- [Bulk Operations Canonical](../misc/BULK_OPERATIONS_CANONICAL.md)
