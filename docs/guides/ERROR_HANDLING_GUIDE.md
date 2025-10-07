# Error Handling Guide

## Overview

This guide documents the comprehensive error handling and validation system implemented for the auth user linking feature. The system provides standardized error responses, user-friendly messages, input validation, retry logic, and graceful error handling across both backend and frontend.

**Related Spec**: `.kiro/specs/auth-user-linking-system/`
**Task**: Task 10 - Add error handling and validation
**Requirements**: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7

## Architecture

### Backend Error Handling

**Location**: `src/lib/errorHandling.ts`

The backend error handling system provides:
- Standardized error codes and messages
- Custom `ApiError` class for structured errors
- Input validation utilities
- Retry logic for transient failures
- Centralized error response handling

### Frontend Error Handling

**Location**: `src/hooks/useApiError.ts`

The frontend error handling system provides:
- Error parsing and display
- Automatic retry for network failures
- Toast notifications for errors and success
- Consistent error messaging

## Error Codes

### Standard Error Codes

```typescript
enum ErrorCode {
  // Authentication & Authorization
  AUTH_FAILED = 'AUTH_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // User Linking
  USER_ALREADY_LINKED = 'USER_ALREADY_LINKED',
  INVALID_AUTH_USER = 'INVALID_AUTH_USER',
  INVALID_ROLE = 'INVALID_ROLE',
  
  // Team Membership
  TEAM_MEMBERSHIP_FAILED = 'TEAM_MEMBERSHIP_FAILED',
  TEAM_NOT_CONFIGURED = 'TEAM_NOT_CONFIGURED',
  
  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Email Verification
  EMAIL_ALREADY_VERIFIED = 'EMAIL_ALREADY_VERIFIED',
  VERIFICATION_RATE_LIMIT = 'VERIFICATION_RATE_LIMIT',
  VERIFICATION_SEND_FAILED = 'VERIFICATION_SEND_FAILED',
  
  // Search
  SEARCH_FAILED = 'SEARCH_FAILED',
  
  // Validation
  INVALID_REQUEST = 'INVALID_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Network
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Generic
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

### Error Messages

Each error code has a corresponding user-friendly message:

```typescript
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH_FAILED: 'Authentication failed. Please log in again.',
  PERMISSION_DENIED: 'You don\'t have permission to perform this action.',
  USER_ALREADY_LINKED: 'This user already has access to the application.',
  INVALID_AUTH_USER: 'Selected user not found in authentication system.',
  // ... etc
}
```

## Backend Usage

### Creating API Errors

```typescript
import { ApiError, ErrorCode } from '@/lib/errorHandling';

// Simple error
throw new ApiError(
  'User not found',
  ErrorCode.INVALID_AUTH_USER,
  404
);

// Error with details
throw new ApiError(
  'Validation failed',
  ErrorCode.VALIDATION_ERROR,
  400,
  { errors: ['Email is required', 'Password too short'] }
);

// Error with rate limit info
throw new ApiError(
  'Too many requests',
  ErrorCode.VERIFICATION_RATE_LIMIT,
  429,
  undefined,
  Date.now() + 60000 // Reset time
);
```

### Input Validation

```typescript
import { validateInput } from '@/lib/errorHandling';

// Validate request body
validateInput([
  {
    field: 'email',
    value: req.body.email,
    rules: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Valid email is required'
    }
  },
  {
    field: 'password',
    value: req.body.password,
    rules: {
      required: true,
      minLength: 8,
      message: 'Password must be at least 8 characters'
    }
  }
]);
```

### Retry Logic

```typescript
import { withRetry } from '@/lib/errorHandling';

// Retry API calls on transient failures
const user = await withRetry(
  () => adminClient.users.get(userId),
  { 
    maxRetries: 2,
    initialDelay: 1000,
    maxDelay: 5000
  }
);
```

### Centralized Error Handling

```typescript
import { handleApiError } from '@/lib/errorHandling';

export default async function handler(req, res) {
  try {
    // Your API logic here
  } catch (error) {
    // Automatically handles all error types
    handleApiError(error, res);
  }
}
```

## Frontend Usage

### Using the useApiError Hook

```typescript
import { useApiError } from '@/hooks/useApiError';

function MyComponent() {
  const { handleError, handleSuccess, fetchWithRetry } = useApiError();

  const handleSubmit = async () => {
    try {
      // Fetch with automatic retry on network errors
      const data = await fetchWithRetry('/api/users/search', {
        method: 'POST',
        body: JSON.stringify({ q: 'test' })
      });

      // Show success message
      handleSuccess('Search completed', `Found ${data.users.length} users`);
    } catch (error) {
      // Show error message with toast
      handleError(error, 'Failed to search users');
    }
  };
}
```

### Manual Error Parsing

```typescript
import { parseApiError } from '@/hooks/useApiError';

try {
  const response = await fetch('/api/users');
  const data = await response.json();
  
  if (!response.ok) {
    throw data;
  }
} catch (error) {
  const parsed = parseApiError(error);
  
  if (parsed.isAuthError) {
    // Redirect to login
  } else if (parsed.isNetworkError) {
    // Show offline message
  } else {
    // Show generic error
  }
}
```

## API Endpoint Examples

### Search Endpoint with Error Handling

```typescript
// src/pages/api/users/search.ts
export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // Permission check with ApiError
  if (!hasPermission(role, 'users', 'read')) {
    throw new ApiError(
      'Insufficient permissions to search users',
      ErrorCode.PERMISSION_DENIED,
      403
    );
  }

  try {
    // Input validation
    validateInput([
      {
        field: 'page',
        value: page,
        rules: {
          custom: (val) => !isNaN(val) && val > 0,
          message: 'Page must be a positive number'
        }
      }
    ]);

    // API call with retry
    const authUsersResponse = await withRetry(
      () => users.list(queries),
      { maxRetries: 2 }
    );

    return res.status(200).json({ users: authUsersResponse.users });
  } catch (error) {
    // Centralized error handling
    handleApiError(error, res);
  }
});
```

### Verify Email Endpoint with Rate Limiting

```typescript
// src/pages/api/users/verify-email.ts
export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    // Input validation
    validateInput([
      {
        field: 'authUserId',
        value: authUserId,
        rules: {
          required: true,
          message: 'Auth user ID is required'
        }
      }
    ]);

    // Check if already verified
    if (authUser.emailVerification) {
      throw new ApiError(
        'Email is already verified',
        ErrorCode.EMAIL_ALREADY_VERIFIED,
        409
      );
    }

    // Rate limiting
    if (!userRateLimit.allowed) {
      throw new ApiError(
        `Too many verification emails sent. Try again in ${formatRateLimitTime(userRateLimit.resetAt)}.`,
        ErrorCode.VERIFICATION_RATE_LIMIT,
        429,
        undefined,
        userRateLimit.resetAt
      );
    }

    // Send verification
    await users.updateEmailVerification({ userId: authUserId, emailVerification: true });

    return res.status(200).json({ success: true });
  } catch (error) {
    handleApiError(error, res);
  }
});
```

## Component Examples

### Search Component with Error Handling

```typescript
// src/components/AuthUserSearch.tsx
export default function AuthUserSearch({ onSelect }: Props) {
  const { handleError, fetchWithRetry } = useApiError();
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (query: string) => {
    setError(null);
    
    try {
      // Automatic retry on network errors
      const data = await fetchWithRetry('/api/users/search', {
        method: 'POST',
        body: JSON.stringify({ q: query })
      });
      
      setAuthUsers(data.users);
    } catch (err) {
      // Show error toast and set local error state
      const parsed = handleError(err, 'Failed to search users');
      setError(parsed.message);
    }
  }, [handleError, fetchWithRetry]);

  return (
    <div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* Rest of component */}
    </div>
  );
}
```

### Form Component with Validation

```typescript
// src/components/UserForm.tsx
export default function UserForm({ onSave }: Props) {
  const { handleError } = useApiError();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Frontend validation
      if (!selectedAuthUser) {
        handleError(
          { error: 'Please select a user to link', code: 'VALIDATION_ERROR' },
          'Please select a user to link'
        );
        return;
      }

      if (!formData.roleId) {
        handleError(
          { error: 'Please select a role', code: 'VALIDATION_ERROR' },
          'Please select a role for this user'
        );
        return;
      }

      // Submit form
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };
}
```

## Error Response Format

### Standard Error Response

```json
{
  "error": "User-friendly error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "additional context"
  }
}
```

### Rate Limit Error Response

```json
{
  "error": "Too many verification emails sent. Try again in 5 minutes.",
  "code": "VERIFICATION_RATE_LIMIT",
  "resetAt": 1234567890000
}
```

### Validation Error Response

```json
{
  "error": "Email is required, Password must be at least 8 characters",
  "code": "VALIDATION_ERROR",
  "details": {
    "errors": [
      "Email is required",
      "Password must be at least 8 characters"
    ]
  }
}
```

## Validation Rules

### Available Validation Rules

```typescript
interface ValidationRule {
  field: string;
  value: any;
  rules: {
    required?: boolean;           // Field must have a value
    minLength?: number;            // Minimum string length
    maxLength?: number;            // Maximum string length
    pattern?: RegExp;              // Regex pattern match
    custom?: (value: any) => boolean;  // Custom validation function
    message?: string;              // Custom error message
  };
}
```

### Common Validation Patterns

```typescript
// Email validation
{
  field: 'email',
  value: email,
  rules: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Valid email address is required'
  }
}

// Password validation
{
  field: 'password',
  value: password,
  rules: {
    required: true,
    minLength: 8,
    maxLength: 128,
    message: 'Password must be 8-128 characters'
  }
}

// Custom validation
{
  field: 'age',
  value: age,
  rules: {
    custom: (val) => val >= 18 && val <= 120,
    message: 'Age must be between 18 and 120'
  }
}
```

## Retry Configuration

### Default Retry Options

```typescript
{
  maxRetries: 3,              // Maximum number of retry attempts
  initialDelay: 1000,         // Initial delay in ms (1 second)
  maxDelay: 10000,            // Maximum delay in ms (10 seconds)
  backoffMultiplier: 2,       // Exponential backoff multiplier
  retryableErrors: [          // Errors that trigger retry
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT_ERROR,
    ErrorCode.INTERNAL_ERROR
  ]
}
```

### Custom Retry Configuration

```typescript
// Quick retry for less critical operations
await withRetry(fn, {
  maxRetries: 1,
  initialDelay: 500
});

// Aggressive retry for critical operations
await withRetry(fn, {
  maxRetries: 5,
  initialDelay: 2000,
  maxDelay: 30000
});
```

## Testing

### Running Error Handling Tests

```bash
# Run all error handling tests
npx vitest --run src/lib/__tests__/errorHandling.test.ts

# Run with coverage
npx vitest --run --coverage src/lib/__tests__/errorHandling.test.ts
```

### Test Coverage

The error handling tests cover:
- ✅ Error code and message mapping
- ✅ ApiError creation and serialization
- ✅ Error message retrieval
- ✅ API error parsing
- ✅ Retry logic with exponential backoff
- ✅ Input validation (required, minLength, maxLength, pattern, custom)
- ✅ Centralized error handling
- ✅ Rate limit time formatting

## Best Practices

### Backend

1. **Always use ApiError for known error conditions**
   ```typescript
   // ✅ Good
   throw new ApiError('User not found', ErrorCode.INVALID_AUTH_USER, 404);
   
   // ❌ Bad
   return res.status(404).json({ error: 'User not found' });
   ```

2. **Validate input early**
   ```typescript
   // ✅ Good - validate before processing
   validateInput([...rules]);
   const user = await processUser(data);
   
   // ❌ Bad - validate after processing
   const user = await processUser(data);
   if (!user.email) throw new Error('Email required');
   ```

3. **Use retry for external API calls**
   ```typescript
   // ✅ Good
   const user = await withRetry(() => users.get(id));
   
   // ❌ Bad
   const user = await users.get(id);
   ```

4. **Use centralized error handling**
   ```typescript
   // ✅ Good
   try {
     // logic
   } catch (error) {
     handleApiError(error, res);
   }
   
   // ❌ Bad
   try {
     // logic
   } catch (error) {
     res.status(500).json({ error: error.message });
   }
   ```

### Frontend

1. **Use useApiError hook**
   ```typescript
   // ✅ Good
   const { handleError, fetchWithRetry } = useApiError();
   
   // ❌ Bad
   const { toast } = useToast();
   ```

2. **Show user-friendly errors**
   ```typescript
   // ✅ Good
   handleError(error, 'Failed to save user');
   
   // ❌ Bad
   toast({ title: 'Error', description: error.toString() });
   ```

3. **Validate before submission**
   ```typescript
   // ✅ Good
   if (!email) {
     handleError({ code: 'VALIDATION_ERROR' }, 'Email is required');
     return;
   }
   await submitForm();
   
   // ❌ Bad
   await submitForm(); // Let backend handle validation
   ```

## Troubleshooting

### Common Issues

**Issue**: Errors not showing user-friendly messages
- **Solution**: Ensure error codes are defined in `ErrorCode` enum and have corresponding messages in `ERROR_MESSAGES`

**Issue**: Retry not working for API calls
- **Solution**: Check that error code is in `retryableErrors` array

**Issue**: Validation errors not displaying
- **Solution**: Ensure `validateInput` is called before processing and errors are caught

**Issue**: Rate limit errors not showing time remaining
- **Solution**: Ensure `resetAt` timestamp is included in ApiError

## Related Files

- `src/lib/errorHandling.ts` - Backend error handling utilities
- `src/hooks/useApiError.ts` - Frontend error handling hook
- `src/lib/__tests__/errorHandling.test.ts` - Error handling tests
- `src/pages/api/users/search.ts` - Example: Search endpoint with error handling
- `src/pages/api/users/verify-email.ts` - Example: Verify email with rate limiting
- `src/pages/api/users/index.ts` - Example: User linking with validation
- `src/components/AuthUserSearch.tsx` - Example: Search component with error handling
- `src/components/AuthUserList.tsx` - Example: List component with error handling
- `src/components/UserForm.tsx` - Example: Form component with validation

## Summary

The error handling system provides:

✅ **Standardized error responses** (Requirement 7.1)
✅ **User-friendly error messages** (Requirement 7.2)
✅ **Input validation** (Requirement 7.3)
✅ **Graceful network failure handling** (Requirement 7.4)
✅ **Retry logic for transient failures** (Requirement 7.5)
✅ **Appropriate error messages in UI** (Requirement 7.6)
✅ **Comprehensive error handling** (Requirement 7.7)

All requirements from Task 10 have been successfully implemented and tested.
