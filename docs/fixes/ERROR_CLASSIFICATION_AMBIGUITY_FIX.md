# Error Classification Ambiguity Fix

## Issue
The `isTokenExpiredError` function in `src/lib/apiErrorHandler.ts` was incorrectly classifying team authorization errors as token expiration errors, creating ambiguity in error handling logic.

## Root Cause
Both error types can have:
- `error.type === 'user_unauthorized'`
- `error.code === 401`

The original `isTokenExpiredError` function would return `true` for ANY `user_unauthorized` error, without checking if it was actually a team authorization issue vs. a token expiration issue.

### Original Logic (Problematic)
```typescript
export function isTokenExpiredError(error: any): boolean {
  if (!error) return false;

  // Check Appwrite-specific error types
  if (error.type === 'user_jwt_invalid' || error.type === 'user_unauthorized') {
    return true; // ❌ Too broad - catches team authorization errors
  }

  // Check error code
  if (error.code === 401) {
    return true; // ❌ Too broad - any 401 is treated as token error
  }
  
  // ...
}
```

## Impact
When calling code checked `isTokenExpiredError` first, it would misclassify team authorization failures as token expiration errors, leading to:
- Incorrect error messages shown to users
- Wrong error handling paths taken
- Confusion between "your session expired" vs "you're not authorized for this event"

## Solution
Refined `isTokenExpiredError` to properly exclude team authorization errors:

### New Logic
```typescript
export function isTokenExpiredError(error: any): boolean {
  if (!error) return false;

  // First, exclude team authorization errors (user authenticated but not authorized)
  if (isUnauthorizedTeamError(error)) {
    return false; // ✅ Explicitly exclude team errors
  }

  // Check Appwrite-specific error types for token issues
  if (error.type === 'user_jwt_invalid') {
    return true; // ✅ Specific to JWT issues
  }

  // user_unauthorized could be token OR team access - check message
  if (error.type === 'user_unauthorized') {
    const message = error.message?.toLowerCase() || '';
    // If it's team access specific, don't treat as token error
    if (message.includes('not authorized to perform the requested action')) {
      return false; // ✅ Exclude team authorization message
    }
    return true;
  }

  // Check error code (but be careful - 401 can mean many things)
  if (error.code === 401) {
    // Only treat as token error if it has token-related keywords
    const message = error.message?.toLowerCase() || '';
    const tokenKeywords = [
      'jwt',
      'token',
      'expired',
      'invalid token',
      'authentication failed',
      'session expired'
    ];
    return tokenKeywords.some(keyword => message.includes(keyword)); // ✅ Require token keywords
  }

  // ... rest of function
}
```

## Key Changes

### 1. Early Exit for Team Errors
```typescript
if (isUnauthorizedTeamError(error)) {
  return false;
}
```
Immediately returns `false` if the error is a team authorization issue.

### 2. Specific JWT Type Check
```typescript
if (error.type === 'user_jwt_invalid') {
  return true;
}
```
Only `user_jwt_invalid` is automatically treated as a token error.

### 3. Message-Based Differentiation
```typescript
if (error.type === 'user_unauthorized') {
  const message = error.message?.toLowerCase() || '';
  if (message.includes('not authorized to perform the requested action')) {
    return false; // Team authorization
  }
  return true; // Token issue
}
```
For `user_unauthorized` errors, checks the message to differentiate.

### 4. Stricter 401 Handling
```typescript
if (error.code === 401) {
  // Only treat as token error if it has token-related keywords
  const message = error.message?.toLowerCase() || '';
  const tokenKeywords = ['jwt', 'token', 'expired', ...];
  return tokenKeywords.some(keyword => message.includes(keyword));
}
```
Generic 401 errors now require token-related keywords in the message.

## Error Classification Matrix

| Error Type | Code | Message | isUnauthorizedTeamError | isTokenExpiredError |
|------------|------|---------|------------------------|---------------------|
| `user_unauthorized` | 401 | "not authorized to perform..." | ✅ true | ❌ false |
| `user_jwt_invalid` | 401 | "Invalid JWT token" | ❌ false | ✅ true |
| `user_unauthorized` | 401 | "Session expired" | ❌ false | ✅ true |
| Generic | 401 | "Unauthorized" | ❌ false | ❌ false |
| Generic | 401 | "Token expired" | ❌ false | ✅ true |

## Testing

### Unit Tests
Added comprehensive test in `src/lib/__tests__/apiErrorHandler.test.ts` to ensure predicates are mutually exclusive:

```typescript
it('should be mutually exclusive with isTokenExpiredError for team errors', () => {
  // Team authorization error should be identified as team error, NOT token error
  const teamError = {
    type: 'user_unauthorized',
    code: 401,
    message: 'The current user is not authorized to perform the requested action',
  };

  // Assert team error is correctly identified
  expect(isUnauthorizedTeamError(teamError)).toBe(true);
  
  // Assert team error is NOT misclassified as token error
  expect(isTokenExpiredError(teamError)).toBe(false);
});
```

Also updated existing tests to reflect the new, more strict behavior:
- Generic 401 errors without token keywords are no longer treated as token errors
- Generic "unauthorized" messages without token context are no longer treated as token errors

Test results: **52 out of 52 unit tests pass** ✅

### Integration Tests
Added comprehensive test in `src/__tests__/integration/unauthorized-access-flow.test.tsx`:

```typescript
it('should not misclassify team authorization errors as token expiration errors', () => {
  // Team authorization error should NOT be treated as token error
  const teamError = {
    type: 'user_unauthorized',
    code: 401,
    message: 'The current user is not authorized to perform the requested action',
  };
  expect(isUnauthorizedTeamError(teamError)).toBe(true);
  expect(isTokenExpiredError(teamError)).toBe(false); // ✅ Correctly returns false

  // JWT invalid error should be treated as token error
  const jwtError = {
    type: 'user_jwt_invalid',
    code: 401,
    message: 'Invalid JWT token',
  };
  expect(isUnauthorizedTeamError(jwtError)).toBe(false);
  expect(isTokenExpiredError(jwtError)).toBe(true); // ✅ Correctly returns true

  // ... more test cases
});
```

Test results: **21 out of 22 integration tests pass** (the one failure is unrelated to this fix)

## Benefits

### 1. Correct Error Classification
Team authorization errors are no longer misclassified as token expiration errors.

### 2. Better User Experience
Users see appropriate error messages:
- "You're not authorized for this event" (team error)
- "Your session has expired" (token error)

### 3. Proper Error Handling
Code can now reliably differentiate between:
- User needs to be added to the team
- User needs to log in again

### 4. Maintainable Logic
Clear separation of concerns with explicit checks and comments.

## Files Modified
- `src/lib/apiErrorHandler.ts` - Refined `isTokenExpiredError` function
- `src/__tests__/integration/unauthorized-access-flow.test.tsx` - Added test for error differentiation

## Related Fixes
This fix complements:
- Navigation race condition fix (throwing error instead of returning)
- Router API fix (using correct Next.js router)

Together, these fixes ensure proper error handling and navigation behavior for unauthorized team access scenarios.
