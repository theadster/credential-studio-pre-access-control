import { NextApiResponse } from 'next';

/**
 * Standardized API error response structure
 */
export interface ApiError {
  error: string;
  code: number;
  type: string;
  message: string;
  tokenExpired?: boolean;
  details?: any;
}

/**
 * Configuration options for error handler
 */
export interface ErrorHandlerOptions {
  logError?: boolean;
  includeStack?: boolean;
  includeDetails?: boolean;
}

/**
 * Check if an error is related to JWT token expiration or invalidity
 * 
 * @param error - The error object to check
 * @returns true if the error is token-related
 */
export function isTokenExpiredError(error: any): boolean {
  if (!error) return false;

  // Check Appwrite-specific error types
  if (error.type === 'user_jwt_invalid' || error.type === 'user_unauthorized') {
    return true;
  }

  // Check error code
  if (error.code === 401) {
    return true;
  }

  // Check error message for JWT-related keywords
  const message = error.message?.toLowerCase() || '';
  const tokenKeywords = [
    'jwt',
    'token',
    'expired',
    'invalid token',
    'unauthorized',
    'authentication failed',
    'session expired'
  ];

  return tokenKeywords.some(keyword => message.includes(keyword));
}

/**
 * Format error response with standardized structure
 * 
 * @param error - The error object to format
 * @param options - Configuration options for formatting
 * @returns Formatted API error object
 */
export function formatErrorResponse(
  error: any,
  options: ErrorHandlerOptions = {}
): ApiError {
  const { includeStack = false, includeDetails = false } = options;

  // Check if it's a token expiration error
  const tokenExpired = isTokenExpiredError(error);

  // Determine error code
  const code = error.code || error.status || (tokenExpired ? 401 : 500);

  // Determine error type
  let type = error.type || 'internal_error';
  if (tokenExpired && !error.type) {
    type = 'token_expired';
  }

  // Determine error message
  let message = error.message || 'An unexpected error occurred';
  if (tokenExpired && !error.message) {
    message = 'Your session has expired. Please log in again.';
  }

  // Build base error response
  const errorResponse: ApiError = {
    error: message,
    code,
    type,
    message,
    ...(tokenExpired && { tokenExpired: true })
  };

  // Add optional details
  if (includeDetails && error.details) {
    errorResponse.details = error.details;
  }

  // Add stack trace in development only
  if (includeStack && process.env.NODE_ENV === 'development' && error.stack) {
    errorResponse.details = {
      ...errorResponse.details,
      stack: error.stack
    };
  }

  return errorResponse;
}

/**
 * Sanitize context object to prevent logging sensitive data
 * 
 * @param context - Raw context object that may contain sensitive fields
 * @returns Sanitized context with only safe fields
 */
function sanitizeContext(context?: {
  userId?: string;
  endpoint?: string;
  method?: string;
  [key: string]: any;
}): Record<string, any> {
  if (!context) {
    return {
      userId: 'unknown',
      endpoint: 'unknown',
      method: 'unknown'
    };
  }

  // Start with known-safe fields
  const sanitized: Record<string, any> = {
    userId: context.userId || 'unknown',
    endpoint: context.endpoint || 'unknown',
    method: context.method || 'unknown'
  };

  // Allowlist of additional safe keys
  const safeKeys = [
    'attendeeId',
    'eventId',
    'roleId',
    'customFieldId',
    'targetId',
    'invitationId',
    'logId',
    'action',
    'resource',
    'timestamp',
    'ipAddress',
    'userAgent'
  ];

  // Pattern to detect sensitive keys
  const sensitivePattern = /token|secret|password|key|auth|credential|session|cookie|jwt|bearer/i;

  // Add additional safe keys from context
  for (const key of Object.keys(context)) {
    // Skip if already added
    if (key in sanitized) continue;

    // Skip if key matches sensitive pattern
    if (sensitivePattern.test(key)) continue;

    // Add if in allowlist
    if (safeKeys.includes(key)) {
      sanitized[key] = context[key];
    }
  }

  return sanitized;
}

/**
 * Centralized error handler for API routes
 * Provides consistent error responses and logging
 * 
 * @param error - The error object to handle
 * @param res - Next.js API response object
 * @param options - Configuration options for error handling
 * @param context - Additional context for logging (userId, endpoint, etc.)
 */
export function handleApiError(
  error: any,
  res: NextApiResponse,
  options: ErrorHandlerOptions = {},
  context?: {
    userId?: string;
    endpoint?: string;
    method?: string;
    [key: string]: any;
  }
): void {
  const { logError = true } = options;

  // Log error if enabled
  if (logError) {
    const timestamp = new Date().toISOString();
    const isTokenError = isTokenExpiredError(error);
    const errorType = isTokenError ? 'TOKEN_ERROR' : 'API_ERROR';
    const logLevel = isTokenError ? 'WARN' : 'ERROR';

    // Sanitize context to prevent logging sensitive data
    const sanitizedContext = sanitizeContext(context);

    console.error(`[${timestamp}] [${logLevel}] ${errorType}:`, {
      timestamp,
      type: error.type || 'unknown',
      code: error.code || 'unknown',
      message: error.message || 'Unknown error',
      context: sanitizedContext,
      ...(error.stack && process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    // Additional warning for authentication failures
    if (isTokenError) {
      console.warn(`[${timestamp}] [WARN] Authentication failure detected`, {
        timestamp,
        userId: sanitizedContext.userId,
        endpoint: sanitizedContext.endpoint,
        errorType: error.type || 'unknown',
        message: 'User may need to re-authenticate',
      });
    }
  }

  // Format error response
  const errorResponse = formatErrorResponse(error, options);

  // Send response
  res.status(errorResponse.code).json(errorResponse);
}

/**
 * Helper function to create a standardized error object
 * 
 * @param message - Error message
 * @param code - HTTP status code
 * @param type - Error type identifier
 * @param tokenExpired - Whether this is a token expiration error
 * @returns Formatted error object
 */
export function createApiError(
  message: string,
  code: number = 500,
  type: string = 'internal_error',
  tokenExpired: boolean = false
): ApiError {
  return {
    error: message,
    code,
    type,
    message,
    ...(tokenExpired && { tokenExpired: true })
  };
}
