import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isUnauthorizedTeamError,
  isTokenExpiredError,
  formatErrorResponse,
  handleApiError,
  createApiError,
  ApiError,
} from '../apiErrorHandler';
import { NextApiResponse } from 'next';

describe('apiErrorHandler', () => {
  let mockResponse: Partial<NextApiResponse>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockJson = vi.fn();
    mockStatus = vi.fn(() => ({ json: mockJson }));
    mockResponse = {
      status: mockStatus,
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isUnauthorizedTeamError', () => {
    it('should detect user_unauthorized error with 401 code', () => {
      const error = {
        type: 'user_unauthorized',
        code: 401,
        message: 'The current user is not authorized to perform the requested action',
      };

      expect(isUnauthorizedTeamError(error)).toBe(true);
    });

    it('should detect error message containing authorization failure', () => {
      const error = {
        code: 401,
        message: 'User is not authorized to perform the requested action',
      };

      expect(isUnauthorizedTeamError(error)).toBe(true);
    });

    it('should be case-insensitive for message check', () => {
      const error = {
        message: 'NOT AUTHORIZED TO PERFORM THE REQUESTED ACTION',
      };

      expect(isUnauthorizedTeamError(error)).toBe(true);
    });

    it('should return false for user_unauthorized without 401 code', () => {
      const error = {
        type: 'user_unauthorized',
        code: 403,
        message: 'Forbidden',
      };

      expect(isUnauthorizedTeamError(error)).toBe(false);
    });

    it('should return false for 401 code without user_unauthorized type', () => {
      const error = {
        type: 'user_jwt_invalid',
        code: 401,
        message: 'JWT token is invalid',
      };

      expect(isUnauthorizedTeamError(error)).toBe(false);
    });

    it('should return false for other error types', () => {
      const error = {
        type: 'database_error',
        code: 500,
        message: 'Database connection failed',
      };

      expect(isUnauthorizedTeamError(error)).toBe(false);
    });

    it('should return false for null error', () => {
      expect(isUnauthorizedTeamError(null)).toBe(false);
    });

    it('should return false for undefined error', () => {
      expect(isUnauthorizedTeamError(undefined)).toBe(false);
    });

    it('should return false for error without message or type', () => {
      const error = {
        code: 401,
      };

      expect(isUnauthorizedTeamError(error)).toBe(false);
    });

    it('should return false for generic unauthorized messages', () => {
      const error = {
        code: 401,
        message: 'Unauthorized access',
      };

      expect(isUnauthorizedTeamError(error)).toBe(false);
    });

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
  });

  describe('isTokenExpiredError', () => {
    it('should detect Appwrite JWT invalid error', () => {
      const error = {
        type: 'user_jwt_invalid',
        message: 'JWT token is invalid',
      };

      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('should detect Appwrite unauthorized error', () => {
      const error = {
        type: 'user_unauthorized',
        message: 'User is unauthorized',
      };

      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('should detect 401 status code with token keywords', () => {
      const error = {
        code: 401,
        message: 'Token expired',
      };

      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('should NOT detect generic 401 without token keywords', () => {
      const error = {
        code: 401,
        message: 'Unauthorized',
      };

      // Generic 401 without token keywords should not be treated as token error
      expect(isTokenExpiredError(error)).toBe(false);
    });

    it('should detect JWT keyword in message', () => {
      const error = {
        message: 'Invalid JWT token provided',
      };

      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('should detect token keyword in message', () => {
      const error = {
        message: 'Token has expired',
      };

      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('should detect expired keyword in message', () => {
      const error = {
        message: 'Session expired, please login again',
      };

      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('should detect invalid token in message', () => {
      const error = {
        message: 'Invalid token provided',
      };

      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('should NOT detect generic unauthorized without token context', () => {
      const error = {
        message: 'Unauthorized access',
      };

      // Generic "unauthorized" without token keywords should not be treated as token error
      expect(isTokenExpiredError(error)).toBe(false);
    });

    it('should detect authentication failed in message', () => {
      const error = {
        message: 'Authentication failed',
      };

      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('should detect session expired in message', () => {
      const error = {
        message: 'Your session expired',
      };

      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('should be case-insensitive', () => {
      const error = {
        message: 'JWT TOKEN EXPIRED',
      };

      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('should return false for non-token errors', () => {
      const error = {
        message: 'Database connection failed',
        code: 500,
      };

      expect(isTokenExpiredError(error)).toBe(false);
    });

    it('should return false for null error', () => {
      expect(isTokenExpiredError(null)).toBe(false);
    });

    it('should return false for undefined error', () => {
      expect(isTokenExpiredError(undefined)).toBe(false);
    });

    it('should return false for error without message', () => {
      const error = {
        code: 500,
      };

      expect(isTokenExpiredError(error)).toBe(false);
    });
  });

  describe('formatErrorResponse', () => {
    it('should format basic error response', () => {
      const error = {
        message: 'Something went wrong',
        code: 500,
        type: 'internal_error',
      };

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        error: 'Something went wrong',
        code: 500,
        type: 'internal_error',
        message: 'Something went wrong',
      });
    });

    it('should add tokenExpired flag for token errors', () => {
      const error = {
        type: 'user_jwt_invalid',
        message: 'JWT is invalid',
      };

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        error: 'JWT is invalid',
        code: 401,
        type: 'user_jwt_invalid',
        message: 'JWT is invalid',
        tokenExpired: true,
      });
    });

    it('should use default values for missing fields', () => {
      const error = {};

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        error: 'An unexpected error occurred',
        code: 500,
        type: 'internal_error',
        message: 'An unexpected error occurred',
      });
    });

    it('should use token_expired type for token errors without type', () => {
      const error = {
        message: 'Token has expired',
      };

      const result = formatErrorResponse(error);

      expect(result.type).toBe('token_expired');
      expect(result.tokenExpired).toBe(true);
    });

    it('should NOT treat generic 401 without message as token error', () => {
      const error = {
        code: 401,
      };

      const result = formatErrorResponse(error);

      // Generic 401 without token keywords should not be treated as token error
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.tokenExpired).toBeUndefined();
    });

    it('should include details when includeDetails is true', () => {
      const error = {
        message: 'Error occurred',
        details: { field: 'email', reason: 'invalid format' },
      };

      const result = formatErrorResponse(error, { includeDetails: true });

      expect(result.details).toEqual({
        field: 'email',
        reason: 'invalid format',
      });
    });

    it('should not include details when includeDetails is false', () => {
      const error = {
        message: 'Error occurred',
        details: { field: 'email' },
      };

      const result = formatErrorResponse(error, { includeDetails: false });

      expect(result.details).toBeUndefined();
    });

    it('should include stack trace in development when includeStack is true', () => {
      // Use vi.stubEnv to safely mock environment variable
      vi.stubEnv('NODE_ENV', 'development');

      try {
        const error = {
          message: 'Error occurred',
          stack: 'Error: Error occurred\n    at test.ts:10:5',
        };

        const result = formatErrorResponse(error, { includeStack: true });

        expect(result.details).toEqual({
          stack: 'Error: Error occurred\n    at test.ts:10:5',
        });
      } finally {
        // Always restore environment, even if test fails
        vi.unstubAllEnvs();
      }
    });

    it('should not include stack trace in production', () => {
      // Use vi.stubEnv to safely mock environment variable
      vi.stubEnv('NODE_ENV', 'production');

      try {
        const error = {
          message: 'Error occurred',
          stack: 'Error: Error occurred\n    at test.ts:10:5',
        };

        const result = formatErrorResponse(error, { includeStack: true });

        expect(result.details).toBeUndefined();
      } finally {
        // Always restore environment, even if test fails
        vi.unstubAllEnvs();
      }
    });

    it('should use error.code when available', () => {
      const error = {
        message: 'Not found',
        code: 404,
      };

      const result = formatErrorResponse(error);

      expect(result.code).toBe(404);
    });
  });

  describe('handleApiError', () => {
    it('should send formatted error response', () => {
      const error = {
        message: 'Database error',
        code: 500,
        type: 'database_error',
      };

      handleApiError(error, mockResponse as NextApiResponse);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Database error',
        code: 500,
        type: 'database_error',
        message: 'Database error',
      });
    });

    it('should handle token expiration errors', () => {
      const error = {
        type: 'user_jwt_invalid',
        message: 'JWT is invalid',
      };

      handleApiError(error, mockResponse as NextApiResponse);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenExpired: true,
          code: 401,
        })
      );
    });

    it('should log errors by default', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const error = {
        message: 'Test error',
        code: 500,
      };

      handleApiError(error, mockResponse as NextApiResponse);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API_ERROR'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should not log errors when logError is false', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const error = {
        message: 'Test error',
        code: 500,
      };

      handleApiError(error, mockResponse as NextApiResponse, { logError: false });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log token errors as warnings', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      const error = {
        type: 'user_jwt_invalid',
        message: 'JWT is invalid',
      };

      handleApiError(error, mockResponse as NextApiResponse);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('TOKEN_ERROR'),
        expect.any(Object)
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication failure detected'),
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should include context in logs', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const error = {
        message: 'Test error',
        code: 500,
      };

      const context = {
        userId: 'user-123',
        endpoint: '/api/test',
        method: 'POST',
      };

      handleApiError(error, mockResponse as NextApiResponse, {}, context);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: expect.objectContaining({
            userId: 'user-123',
            endpoint: '/api/test',
            method: 'POST',
          }),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should use "unknown" for missing context values', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const error = {
        message: 'Test error',
        code: 500,
      };

      handleApiError(error, mockResponse as NextApiResponse, {}, {});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: expect.objectContaining({
            userId: 'unknown',
            endpoint: 'unknown',
            method: 'unknown',
          }),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should include stack trace in development logs', () => {
      // Use vi.stubEnv to safely mock environment variable
      vi.stubEnv('NODE_ENV', 'development');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      try {
        const error = {
          message: 'Test error',
          code: 500,
          stack: 'Error: Test error\n    at test.ts:10:5',
        };

        handleApiError(error, mockResponse as NextApiResponse);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            stack: 'Error: Test error\n    at test.ts:10:5',
          })
        );
      } finally {
        // Always restore environment and mocks, even if test fails
        consoleSpy.mockRestore();
        vi.unstubAllEnvs();
      }
    });

    it('should pass options to formatErrorResponse', () => {
      const error = {
        message: 'Test error',
        code: 500,
        details: { field: 'test' },
      };

      handleApiError(
        error,
        mockResponse as NextApiResponse,
        { includeDetails: true }
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { field: 'test' },
        })
      );
    });
  });

  describe('createApiError', () => {
    it('should create basic error object', () => {
      const error = createApiError('Test error', 400, 'validation_error');

      expect(error).toEqual({
        error: 'Test error',
        code: 400,
        type: 'validation_error',
        message: 'Test error',
      });
    });

    it('should use default values', () => {
      const error = createApiError('Test error');

      expect(error).toEqual({
        error: 'Test error',
        code: 500,
        type: 'internal_error',
        message: 'Test error',
      });
    });

    it('should add tokenExpired flag when specified', () => {
      const error = createApiError(
        'Token expired',
        401,
        'token_expired',
        true
      );

      expect(error).toEqual({
        error: 'Token expired',
        code: 401,
        type: 'token_expired',
        message: 'Token expired',
        tokenExpired: true,
      });
    });

    it('should not add tokenExpired flag when false', () => {
      const error = createApiError('Test error', 500, 'internal_error', false);

      expect(error.tokenExpired).toBeUndefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete token expiration flow', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      const error = {
        type: 'user_jwt_invalid',
        code: 401,
        message: 'JWT token is invalid or expired',
      };

      const context = {
        userId: 'user-123',
        endpoint: '/api/profile',
        method: 'GET',
      };

      handleApiError(error, mockResponse as NextApiResponse, {}, context);

      // Should log as token error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('TOKEN_ERROR'),
        expect.objectContaining({
          type: 'user_jwt_invalid',
          code: 401,
          context: expect.objectContaining({
            userId: 'user-123',
            endpoint: '/api/profile',
          }),
        })
      );

      // Should log authentication warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication failure detected'),
        expect.any(Object)
      );

      // Should send 401 response with tokenExpired flag
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 401,
          type: 'user_jwt_invalid',
          tokenExpired: true,
        })
      );

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should handle generic errors without token issues', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const error = {
        message: 'Database connection failed',
        code: 503,
        type: 'service_unavailable',
      };

      handleApiError(error, mockResponse as NextApiResponse);

      // Should log as API error (not token error)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API_ERROR'),
        expect.any(Object)
      );

      // Should send 503 response without tokenExpired flag
      expect(mockStatus).toHaveBeenCalledWith(503);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 503,
          type: 'service_unavailable',
        })
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.not.objectContaining({
          tokenExpired: expect.anything(),
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
