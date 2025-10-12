/**
 * Validation Utilities
 * 
 * Centralized validation functions and error handling for the application.
 * Provides consistent error structure and reusable validation logic.
 */

/**
 * Custom validation error class
 * Extends Error with additional properties for structured error handling
 */
export class ValidationError extends Error {
  code: number;
  type: string;

  constructor(message: string, code: number = 400, type: string = 'validation_error') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.type = type;
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Email validation regex pattern
 * Matches standard email format: local@domain.tld
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email format
 * 
 * @param email - Email address to validate
 * @throws {ValidationError} When email format is invalid
 * @returns {void}
 * 
 * @example
 * ```typescript
 * try {
 *   validateEmail('user@example.com'); // passes
 *   validateEmail('invalid-email'); // throws ValidationError
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log(error.message, error.code, error.type);
 *   }
 * }
 * ```
 */
export function validateEmail(email: string): void {
  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError(
      'Please enter a valid email address',
      400,
      'invalid_email'
    );
  }
}
