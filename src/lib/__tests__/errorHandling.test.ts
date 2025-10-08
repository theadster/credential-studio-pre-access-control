/**
 * Tests for centralized error handling utilities
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ErrorCode,
  ApiError,
  getErrorMessage,
  parseApiError,
  withRetry,
  validateInput,
  handleApiError,
  formatRateLimitTime,
  ERROR_MESSAGES
} from '../errorHandling';

describe('ErrorCode and ERROR_MESSAGES', () => {
  it('should have error messages for all error codes', () => {
    Object.values(ErrorCode).forEach(code => {
      expect(ERROR_MESSAGES[code]).toBeDefined();
      expect(typeof ERROR_MESSAGES[code]).toBe('string');
    });
  });
});

describe('ApiError', () => {
  it('should create an ApiError with all properties', () => {
    const error = new ApiError(
      'Test error',
      ErrorCode.VALIDATION_ERROR,
      400,
      { field: 'email' },
      Date.now() + 60000
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ field: 'email' });
    expect(error.resetAt).toBeDefined();
  });

  it('should convert to JSON correctly', () => {
    const error = new ApiError('Test error', ErrorCode.INVALID_REQUEST, 400);
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'Test error',
      code: ErrorCode.INVALID_REQUEST,
      details: undefined,
      resetAt: undefined
    });
  });
});

describe('getErrorMessage', () => {
  it('should return correct message for known error code', () => {
    const message = getErrorMessage(ErrorCode.USER_ALREADY_LINKED);
    expect(message).toBe(ERROR_MESSAGES[ErrorCode.USER_ALREADY_LINKED]);
  });

  it('should return fallback for unknown error code', () => {
    const message = getErrorMessage('UNKNOWN_CODE', 'Custom fallback');
    expect(message).toBe('Custom fallback');
  });

  it('should return default message when no fallback provided', () => {
    const message = getErrorMessage('UNKNOWN_CODE');
    expect(message).toBe(ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR]);
  });
});

describe('parseApiError', () => {
  it('should parse ApiError instances', () => {
    const error = new ApiError('Test error', ErrorCode.AUTH_FAILED, 401);
    const parsed = parseApiError(error);

    expect(parsed.message).toBe('Test error');
    expect(parsed.code).toBe(ErrorCode.AUTH_FAILED);
  });

  it('should parse API response errors', () => {
    const error = {
      response: {
        data: {
          error: 'Permission denied',
          code: ErrorCode.PERMISSION_DENIED
        }
      }
    };
    const parsed = parseApiError(error);

    expect(parsed.message).toBe('Permission denied');
    expect(parsed.code).toBe(ErrorCode.PERMISSION_DENIED);
  });

  it('should handle network errors', () => {
    const error = new Error('Network Error');
    const parsed = parseApiError(error);

    expect(parsed.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(parsed.message).toBe(ERROR_MESSAGES[ErrorCode.NETWORK_ERROR]);
  });

  it('should handle timeout errors', () => {
    const error = { code: 'ECONNREFUSED' };
    const parsed = parseApiError(error);

    expect(parsed.code).toBe(ErrorCode.TIMEOUT_ERROR);
  });

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong');
    const parsed = parseApiError(error);

    expect(parsed.message).toBe('Something went wrong');
    expect(parsed.code).toBe(ErrorCode.UNKNOWN_ERROR);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on network errors', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ message: 'Network Error' })
      .mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 2, initialDelay: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(
      new ApiError('Validation failed', ErrorCode.VALIDATION_ERROR, 400)
    );

    await expect(withRetry(fn, { maxRetries: 2 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should exhaust retries and throw last error', async () => {
    const fn = vi.fn().mockRejectedValue({ message: 'Network Error' });

    await expect(
      withRetry(fn, { maxRetries: 2, initialDelay: 10 })
    ).rejects.toThrow();
    
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});

describe('validateInput', () => {
  it('should pass validation for valid input', () => {
    expect(() => {
      validateInput([
        {
          field: 'email',
          value: 'test@example.com',
          rules: {
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          }
        }
      ]);
    }).not.toThrow();
  });

  it('should throw error for missing required field', () => {
    expect(() => {
      validateInput([
        {
          field: 'email',
          value: '',
          rules: {
            required: true
          }
        }
      ]);
    }).toThrow(ApiError);
  });

  it('should throw error for minLength violation', () => {
    expect(() => {
      validateInput([
        {
          field: 'password',
          value: '123',
          rules: {
            minLength: 6
          }
        }
      ]);
    }).toThrow(ApiError);
  });

  it('should throw error for maxLength violation', () => {
    expect(() => {
      validateInput([
        {
          field: 'name',
          value: 'a'.repeat(200),
          rules: {
            maxLength: 100
          }
        }
      ]);
    }).toThrow(ApiError);
  });

  it('should throw error for pattern mismatch', () => {
    expect(() => {
      validateInput([
        {
          field: 'email',
          value: 'invalid-email',
          rules: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          }
        }
      ]);
    }).toThrow(ApiError);
  });

  it('should throw error for custom validation failure', () => {
    expect(() => {
      validateInput([
        {
          field: 'age',
          value: 15,
          rules: {
            custom: (val) => val >= 18,
            message: 'Must be 18 or older'
          }
        }
      ]);
    }).toThrow('Must be 18 or older');
  });

  it('should skip validation for empty non-required fields', () => {
    expect(() => {
      validateInput([
        {
          field: 'middleName',
          value: '',
          rules: {
            minLength: 2
          }
        }
      ]);
    }).not.toThrow();
  });
});

describe('handleApiError', () => {
  it('should handle ApiError instances', () => {
    const error = new ApiError('Test error', ErrorCode.VALIDATION_ERROR, 400);
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    handleApiError(error, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(error.toJSON());
  });

  it('should handle Appwrite auth errors', () => {
    const error = { code: 401, message: 'Unauthorized' };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    handleApiError(error, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.AUTH_FAILED
      })
    );
  });

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong');
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    handleApiError(error, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.INTERNAL_ERROR
      })
    );
  });
});

describe('formatRateLimitTime', () => {
  it('should return "now" for past timestamps', () => {
    const pastTime = Date.now() - 1000;
    expect(formatRateLimitTime(pastTime)).toBe('now');
  });

  it('should return "1 minute" for singular', () => {
    const futureTime = Date.now() + 30000; // 30 seconds
    expect(formatRateLimitTime(futureTime)).toBe('1 minute');
  });

  it('should return plural minutes', () => {
    const futureTime = Date.now() + 150000; // 2.5 minutes
    expect(formatRateLimitTime(futureTime)).toBe('3 minutes');
  });
});
