import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApiError, parseApiError, formatRateLimitTime } from '../useApiError';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/useSweetAlert', () => ({
  useSweetAlert: () => ({ toast: mockToast })
}));

describe('useApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseApiError', () => {
    it('should parse network errors', () => {
      const error = new TypeError('Failed to fetch');
      const parsed = parseApiError(error);

      expect(parsed.message).toBe('Unable to connect to the server. Please check your connection.');
      expect(parsed.code).toBe('NETWORK_ERROR');
      expect(parsed.isNetworkError).toBe(true);
      expect(parsed.isAuthError).toBe(false);
    });

    it('should parse timeout errors', () => {
      const error = { name: 'AbortError', message: 'Request timeout' };
      const parsed = parseApiError(error);

      expect(parsed.message).toBe('Request timed out. Please try again.');
      expect(parsed.code).toBe('TIMEOUT_ERROR');
      expect(parsed.isNetworkError).toBe(true);
    });

    it('should parse API error responses', () => {
      const error = {
        error: 'User not found',
        code: 'INVALID_AUTH_USER'
      };
      const parsed = parseApiError(error);

      expect(parsed.message).toBe('User not found');
      expect(parsed.code).toBe('INVALID_AUTH_USER');
      expect(parsed.isNetworkError).toBe(false);
      expect(parsed.isAuthError).toBe(false);
    });

    it('should parse authentication errors', () => {
      const error = {
        error: 'Unauthorized',
        code: 'AUTH_FAILED'
      };
      const parsed = parseApiError(error);

      expect(parsed.message).toBe('Unauthorized');
      expect(parsed.code).toBe('AUTH_FAILED');
      expect(parsed.isAuthError).toBe(true);
    });

    it('should parse permission errors', () => {
      const error = {
        error: 'Insufficient permissions',
        code: 'PERMISSION_DENIED'
      };
      const parsed = parseApiError(error);

      expect(parsed.message).toBe('Insufficient permissions');
      expect(parsed.code).toBe('PERMISSION_DENIED');
      expect(parsed.isAuthError).toBe(true);
    });

    it('should parse validation errors', () => {
      const error = {
        error: 'Invalid input',
        code: 'VALIDATION_ERROR'
      };
      const parsed = parseApiError(error);

      expect(parsed.message).toBe('Invalid input');
      expect(parsed.code).toBe('VALIDATION_ERROR');
      expect(parsed.isValidationError).toBe(true);
    });

    it('should parse rate limit errors with resetAt', () => {
      const resetAt = Date.now() + 1800000; // 30 minutes
      const error = {
        error: 'Too many requests',
        code: 'VERIFICATION_RATE_LIMIT',
        resetAt
      };
      const parsed = parseApiError(error);

      expect(parsed.message).toBe('Too many requests');
      expect(parsed.code).toBe('VERIFICATION_RATE_LIMIT');
      expect(parsed.resetAt).toBe(resetAt);
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');
      const parsed = parseApiError(error);

      expect(parsed.message).toBe('Something went wrong');
      expect(parsed.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('formatRateLimitTime', () => {
    it('should format time in minutes', () => {
      const resetAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      const formatted = formatRateLimitTime(resetAt);

      expect(formatted).toBe('5 minutes');
    });

    it('should format 1 minute correctly', () => {
      const resetAt = Date.now() + 60 * 1000; // 1 minute
      const formatted = formatRateLimitTime(resetAt);

      expect(formatted).toBe('1 minute');
    });

    it('should handle expired time', () => {
      const resetAt = Date.now() - 1000; // 1 second ago
      const formatted = formatRateLimitTime(resetAt);

      expect(formatted).toBe('now');
    });

    it('should round up partial minutes', () => {
      const resetAt = Date.now() + 90 * 1000; // 1.5 minutes
      const formatted = formatRateLimitTime(resetAt);

      expect(formatted).toBe('2 minutes');
    });
  });

  describe('handleError', () => {
    it('should display error toast', () => {
      const { result } = renderHook(() => useApiError());

      act(() => {
        result.current.handleError({ error: 'Test error', code: 'TEST_ERROR' });
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Test error'
      });
    });

    it('should display auth error with appropriate title', () => {
      const { result } = renderHook(() => useApiError());

      act(() => {
        result.current.handleError({ error: 'Unauthorized', code: 'AUTH_FAILED' });
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Unauthorized'
      });
    });

    it('should include rate limit time in description', () => {
      const { result } = renderHook(() => useApiError());
      const resetAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      act(() => {
        result.current.handleError({
          error: 'Too many requests',
          code: 'VERIFICATION_RATE_LIMIT',
          resetAt
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Too many requests. Try again in 5 minutes.'
      });
    });

    it('should use custom message when provided', () => {
      const { result } = renderHook(() => useApiError());

      act(() => {
        result.current.handleError(
          { error: 'API error', code: 'TEST_ERROR' },
          'Custom error message'
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Custom error message'
      });
    });

    it('should handle network errors', () => {
      const { result } = renderHook(() => useApiError());

      act(() => {
        result.current.handleError(new TypeError('Failed to fetch'));
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Unable to connect to the server. Please check your connection.'
      });
    });
  });

  describe('handleSuccess', () => {
    it('should display success toast', () => {
      const { result } = renderHook(() => useApiError());

      act(() => {
        result.current.handleSuccess('Success', 'Operation completed');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Operation completed'
      });
    });

    it('should display success toast without description', () => {
      const { result } = renderHook(() => useApiError());

      act(() => {
        result.current.handleSuccess('Success');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: undefined
      });
    });
  });

  describe('fetchWithRetry', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should fetch successfully on first attempt', async () => {
      const mockData = { success: true };
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      } as Response);

      const { result } = renderHook(() => useApiError());
      const data = await result.current.fetchWithRetry('/api/test');

      expect(data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response);

      const { result } = renderHook(() => useApiError());
      const data = await result.current.fetchWithRetry('/api/test');

      expect(data).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-network errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Bad request', code: 'VALIDATION_ERROR' })
      } as Response);

      const { result } = renderHook(() => useApiError());

      await expect(result.current.fetchWithRetry('/api/test')).rejects.toEqual({
        error: 'Bad request',
        code: 'VALIDATION_ERROR'
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new TypeError('Failed to fetch'));

      const { result } = renderHook(() => useApiError());

      await expect(result.current.fetchWithRetry('/api/test', {}, 2)).rejects.toThrow('Failed to fetch');

      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should include headers in request', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const { result } = renderHook(() => useApiError());
      await result.current.fetchWithRetry('/api/test', {
        method: 'POST',
        headers: { 'X-Custom': 'value' }
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'value'
        }
      });
    });
  });

  describe('Rate limiting integration', () => {
    it('should handle per-user rate limit error', () => {
      const { result } = renderHook(() => useApiError());
      const resetAt = Date.now() + 30 * 60 * 1000; // 30 minutes

      act(() => {
        result.current.handleError({
          error: 'Too many verification emails sent for this user. Please try again in 30 minutes.',
          code: 'VERIFICATION_RATE_LIMIT',
          resetAt
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: expect.stringContaining('Too many verification emails sent for this user')
      });
    });

    it('should handle per-admin rate limit error', () => {
      const { result } = renderHook(() => useApiError());
      const resetAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      act(() => {
        result.current.handleError({
          error: 'You have sent too many verification emails. Please try again in 15 minutes.',
          code: 'VERIFICATION_RATE_LIMIT',
          resetAt
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: expect.stringContaining('You have sent too many verification emails')
      });
    });
  });
});
