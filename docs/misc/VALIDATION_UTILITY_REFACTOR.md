# Validation Utility Refactor

## Overview
Extracted inline email validation from `AuthContext.tsx` into a centralized, reusable validation utility module.

## Changes Made

### 1. Created `src/lib/validation.ts`
New utility module providing:

- **`ValidationError` class**: Custom error class extending `Error` with structured properties
  - `message`: Error message (string)
  - `code`: HTTP-style error code (number, default: 400)
  - `type`: Error type identifier (string, default: 'validation_error')
  - Maintains proper stack traces for debugging

- **`EMAIL_REGEX` constant**: Centralized email validation pattern
  - Pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - Matches standard email format: `local@domain.tld`

- **`validateEmail(email: string)` function**: Email validation function
  - Throws `ValidationError` when email format is invalid
  - Returns `void` when email is valid
  - Provides consistent error structure across the application

### 2. Updated `src/contexts/AuthContext.tsx`
Refactored email validation in the `signIn` method (lines 476-484):

**Before:**
```typescript
// Inline regex and plain object error
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  throw {
    code: 400,
    type: 'invalid_email',
    message: 'Please enter a valid email address'
  };
}
```

**After:**
```typescript
// Centralized validation utility
import { validateEmail } from '@/lib/validation';

// In signIn method:
validateEmail(email);
```

### 3. Created `src/lib/__tests__/validation.test.ts`
Comprehensive test suite with 11 tests covering:

- `ValidationError` class behavior
  - Default values
  - Custom code and type
  - Stack trace maintenance
  - Error catching

- `EMAIL_REGEX` pattern matching
  - Valid email formats
  - Invalid email formats

- `validateEmail()` function
  - Valid email handling
  - Invalid email error throwing
  - Error properties validation
  - Try-catch usage
  - Edge cases

**Test Results:** ✅ All 11 tests passing

## Benefits

### 1. **Centralization**
- Single source of truth for email validation logic
- Consistent error structure across the application
- Easy to update validation rules in one place

### 2. **Reusability**
- Can be imported and used anywhere in the codebase
- No code duplication
- Consistent behavior across all email validation points

### 3. **Type Safety**
- Proper TypeScript class with typed properties
- Better IDE autocomplete and type checking
- Compile-time error detection

### 4. **Maintainability**
- Clear, documented API
- Comprehensive test coverage
- Easy to extend with additional validation functions

### 5. **Error Handling**
- Structured error objects instead of plain objects
- Proper Error inheritance for better error handling
- Stack traces for debugging

## Usage Examples

### Basic Validation
```typescript
import { validateEmail } from '@/lib/validation';

try {
  validateEmail('user@example.com'); // passes
  validateEmail('invalid-email'); // throws ValidationError
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.message); // "Please enter a valid email address"
    console.log(error.code);    // 400
    console.log(error.type);    // "invalid_email"
  }
}
```

### Using EMAIL_REGEX Directly
```typescript
import { EMAIL_REGEX } from '@/lib/validation';

if (EMAIL_REGEX.test(email)) {
  // Email is valid
}
```

### Creating Custom ValidationErrors
```typescript
import { ValidationError } from '@/lib/validation';

throw new ValidationError(
  'Custom validation message',
  422,
  'custom_validation_type'
);
```

## Future Enhancements

The validation utility can be extended with additional validators:

- `validatePassword(password: string)` - Password strength validation
- `validatePhone(phone: string)` - Phone number format validation
- `validateUrl(url: string)` - URL format validation
- `validateRequired(value: any, fieldName: string)` - Required field validation
- `validateLength(value: string, min: number, max: number)` - Length validation

## Files Modified

- ✅ `src/lib/validation.ts` (created)
- ✅ `src/lib/__tests__/validation.test.ts` (created)
- ✅ `src/contexts/AuthContext.tsx` (refactored)

## Testing

All tests pass:
```bash
npx vitest --run src/lib/__tests__/validation.test.ts
# ✓ 11 tests passed
```

No TypeScript errors:
```bash
# src/lib/validation.ts: No diagnostics found
# src/contexts/AuthContext.tsx: No diagnostics found
```

## Conclusion

This refactor improves code quality by:
- Eliminating inline validation logic
- Providing a reusable, well-tested utility
- Establishing a pattern for future validation needs
- Improving error handling consistency
- Making the codebase more maintainable

The validation utility is now ready to be used throughout the application wherever email validation is needed.
