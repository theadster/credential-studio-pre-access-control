/**
 * Tests for usePasswordReset hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePasswordReset } from '../usePasswordReset';
import type { User } from '../../types';

// Create mock functions that can be reassigned
const mockHandleError = vi.fn();
const mockHandleSuccess = vi.fn();
const mockFetchWithRetry = vi.fn();

// Mock useApiError hook
vi.mock('@/hooks/useApiError', () => ({
  useApiError: () => ({
    handleError: mockHandleError,
    handleSuccess: mockHandleSuccess,
    fetchWithRetry: mockFetchWithRetry,
  }),
}));

describe('usePasswordReset', () => {
  const mockUser: User = {
    id: 'user-123',
    userId: 'auth-123',
    email: 'test@example.com',
    name: 'Test User',
    role: {
      id: 'role-123',
      name: 'Admin',
      permissions: {},
    },
    isInvited: false,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockUserWithoutAuth: User = {
    ...mockUser,
    userId: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockFetchWithRetry.mockResolvedValue({});
  });

  describe('Initialization', () => {
    it('should initialize with sending false', () => {
      const { result } = renderHook(() => usePasswordReset());

      expect(result.current.sending).toBe(false);
      expect(typeof result.current.sendPasswordReset).toBe('function');
    });
  });

  describe('sendPasswordReset', () => {
    it('should successfully send password reset', async () => {
      mockFetchWithRetry.mockResolvedValue({});

      const { result } = renderHook(() => usePasswordReset());

      expect(result.current.sending).toBe(false);

      await act(async () => {
        await result.current.sendPasswordReset(mockUser);
      });

      // Should call fetchWithRetry with correct params
      expect(mockFetchWithRetry).toHaveBeenCalledWith(
        '/api/users/send-password-reset',
        {
          method: 'POST',
          body: JSON.stringify({
            authUserId: 'auth-123',
          }),
        }
      );

      // Should call handleSuccess
      expect(mockHandleSuccess).toHaveBeenCalledWith(
        'Password Reset Email Sent',
        expect.stringContaining('test@example.com')
      );

      // Should reset sending state
      await waitFor(() => {
        expect(result.current.sending).toBe(false);
      });
    });

    it('should handle user without auth account', async () => {
      const { result } = renderHook(() => usePasswordReset());

      await act(async () => {
        await result.current.sendPasswordReset(mockUserWithoutAuth);
      });

      // Should call handleError
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        'Cannot send password reset'
      );

      // Should not be sending
      expect(result.current.sending).toBe(false);
    });

    it('should handle API errors', async () => {
      mockFetchWithRetry.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => usePasswordReset());

      await act(async () => {
        await result.current.sendPasswordReset(mockUser);
      });

      // Should call handleError
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        'Failed to send password reset email'
      );

      // Should reset sending state
      await waitFor(() => {
        expect(result.current.sending).toBe(false);
      });
    });

    it('should handle rate limiting errors', async () => {
      mockFetchWithRetry.mockRejectedValue(
        new Error('Too many password reset attempts')
      );

      const { result } = renderHook(() => usePasswordReset());

      await act(async () => {
        await result.current.sendPasswordReset(mockUser);
      });

      // Should call handleError with rate limit message
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        'Rate limit exceeded. Please wait before trying again.'
      );
    });

    it('should set sending state during operation', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>(resolve => {
        resolvePromise = resolve;
      });

      mockFetchWithRetry.mockReturnValue(promise);

      const { result } = renderHook(() => usePasswordReset());

      expect(result.current.sending).toBe(false);

      // Start password reset
      act(() => {
        result.current.sendPasswordReset(mockUser);
      });

      // Should be sending
      await waitFor(() => {
        expect(result.current.sending).toBe(true);
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!();
        await promise;
      });

      // Should not be sending anymore
      await waitFor(() => {
        expect(result.current.sending).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-Error objects', async () => {
      mockFetchWithRetry.mockRejectedValue('String error');

      const { result } = renderHook(() => usePasswordReset());

      await act(async () => {
        await result.current.sendPasswordReset(mockUser);
      });

      // Should still call handleError
      expect(mockHandleError).toHaveBeenCalled();
    });

    it('should always reset sending state even on error', async () => {
      mockFetchWithRetry.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => usePasswordReset());

      await act(async () => {
        await result.current.sendPasswordReset(mockUser);
      });

      // Should reset sending state
      expect(result.current.sending).toBe(false);
    });
  });
});
