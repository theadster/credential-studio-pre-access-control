/**
 * Centralized error handling utilities for the auth user linking system
 * Provides standardized error codes, messages, and handling logic
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

// Standard error codes for the auth user linking system
export enum ErrorCode {
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

// User-friendly error messages mapped to error codes
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_FAILED]: 'Authentication failed. Please log in again.',
  [ErrorCode.PERMISSION_DENIED]: 'You don\'t have permission to perform this action.',
  [ErrorCode.USER_ALREADY_LINKED]: 'This user already has access to the application.',
  [ErrorCode.INVALID_AUTH_USER]: 'Selected user not found in authentication system.',
  [ErrorCode.INVALID_ROLE]: 'The selected role is invalid.',
  [ErrorCode.TEAM_MEMBERSHIP_FAILED]: 'User linked successfully but team membership failed.',
  [ErrorCode.TEAM_NOT_CONFIGURED]: 'Team membership is not configured.',
  [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again.',
  [ErrorCode.EMAIL_ALREADY_VERIFIED]: 'This user\'s email is already verified.',
  [ErrorCode.VERIFICATION_RATE_LIMIT]: 'Too many verification emails sent. Please try again later.',
  [ErrorCode.VERIFICATION_SEND_FAILED]: 'Failed to send verification email. Please try again.',
  [ErrorCode.SEARCH_FAILED]: 'Failed to search users. Please try again.',
  [ErrorCode.INVALID_REQUEST]: 'Invalid request. Please check your input.',
  [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorCode.NETWORK_ERROR]: 'Unable to connect to the server. Please check your connection.',
  [ErrorCode.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again.',
  [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred. Please try again.'
};

// API Error Response Interface
export interface ApiErrorResponse {
  error: string;
  code: ErrorCode | string;
  details?: any;
  resetAt?: number; // For rate limiting
}

// Standardized API Error Class
export class ApiError extends Error {
  code: ErrorCode | string;
  statusCode: number;
  details?: any;
  resetAt?: number;

  constructor(
    message: string,
    code: ErrorCode | string = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    details?: any,
    resetAt?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.resetAt = resetAt;
  }

  toJSON(): ApiErrorResponse {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
      resetAt: this.resetAt
    };
  }
}

/**
 * Get user-friendly error message from error code
 */
export function getErrorMessage(code: ErrorCode | string, fallback?: string): string {
  if (code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as ErrorCode];
  }
  return fallback || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR];
}

/**
 * Parse API error response and return user-friendly message
 */
export function parseApiError(error: any): { message: string; code: string; resetAt?: number } {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return {
      message: error.message,
      code: error.code,
      resetAt: error.resetAt
    };
  }

  // Handle fetch response errors
  if (error.response) {
    const data = error.response.data || {};
    const code = data.code || ErrorCode.UNKNOWN_ERROR;
    const message = data.error || getErrorMessage(code);
    return {
      message,
      code,
      resetAt: data.resetAt
    };
  }

  // Handle network errors
  if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
    return {
      message: ERROR_MESSAGES[ErrorCode.NETWORK_ERROR],
      code: ErrorCode.NETWORK_ERROR
    };
  }

  // Handle timeout errors
  if (error.code === 'ECONNREFUSED' || error.message?.includes('timeout')) {
    return {
      message: ERROR_MESSAGES[ErrorCode.TIMEOUT_ERROR],
      code: ErrorCode.TIMEOUT_ERROR
    };
  }

  // Handle generic errors with message
  if (error.message) {
    return {
      message: error.message,
      code: ErrorCode.UNKNOWN_ERROR
    };
  }

  // Fallback
  return {
    message: ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR],
    code: ErrorCode.UNKNOWN_ERROR
  };
}

/**
 * Retry logic for transient failures
 * Requirement 7.5: Add retry logic for transient failures
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: ErrorCode[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT_ERROR,
    ErrorCode.INTERNAL_ERROR
  ]
};

/**
 * Execute a function with retry logic for transient failures
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const parsedError = parseApiError(error);
      const isRetryable = opts.retryableErrors.includes(parsedError.code as ErrorCode);
      
      // Don't retry if not retryable or if we've exhausted retries
      if (!isRetryable || attempt === opts.maxRetries) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
      
      console.log(`Retrying after error (attempt ${attempt + 1}/${opts.maxRetries}):`, parsedError.message);
    }
  }

  throw lastError;
}

/**
 * Validate input data and throw validation errors
 * Requirement 7.3: Validate all inputs on frontend and backend
 */
export interface ValidationRule {
  field: string;
  value: any;
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean;
    message?: string;
  };
}

export function validateInput(rules: ValidationRule[]): void {
  const errors: string[] = [];

  for (const rule of rules) {
    const { field, value, rules: validationRules } = rule;

    // Required check
    if (validationRules.required && !value) {
      errors.push(validationRules.message || `${field} is required`);
      continue;
    }

    // Skip other validations if value is empty and not required
    if (!value && !validationRules.required) {
      continue;
    }

    // Min length check
    if (validationRules.minLength && value.length < validationRules.minLength) {
      errors.push(
        validationRules.message || 
        `${field} must be at least ${validationRules.minLength} characters`
      );
    }

    // Max length check
    if (validationRules.maxLength && value.length > validationRules.maxLength) {
      errors.push(
        validationRules.message || 
        `${field} must be at most ${validationRules.maxLength} characters`
      );
    }

    // Pattern check
    if (validationRules.pattern && !validationRules.pattern.test(value)) {
      errors.push(validationRules.message || `${field} format is invalid`);
    }

    // Custom validation
    if (validationRules.custom && !validationRules.custom(value)) {
      errors.push(validationRules.message || `${field} validation failed`);
    }
  }

  if (errors.length > 0) {
    throw new ApiError(
      errors.join(', '),
      ErrorCode.VALIDATION_ERROR,
      400,
      { errors }
    );
  }
}

/**
 * Handle API errors in Next.js API routes
 * Requirement 7.1: Implement standardized error responses with codes
 */
export function handleApiError(error: any, res: any): void {
  console.error('API Error:', error);

  // Handle ApiError instances
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  // Handle Appwrite errors
  if (error.code) {
    const statusCode = error.code === 401 ? 401 : error.code === 403 ? 403 : 500;
    const errorCode = error.code === 401 
      ? ErrorCode.AUTH_FAILED 
      : error.code === 403 
        ? ErrorCode.PERMISSION_DENIED 
        : ErrorCode.INTERNAL_ERROR;
    
    return res.status(statusCode).json({
      error: error.message || getErrorMessage(errorCode),
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  // Generic error
  return res.status(500).json({
    error: ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR],
    code: ErrorCode.INTERNAL_ERROR,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

/**
 * Format time remaining for rate limit errors
 */
export function formatRateLimitTime(resetAt: number): string {
  const now = Date.now();
  const diff = resetAt - now;
  
  if (diff <= 0) {
    return 'now';
  }
  
  const minutes = Math.ceil(diff / 60000);
  
  if (minutes === 1) {
    return '1 minute';
  }
  
  return `${minutes} minutes`;
}
