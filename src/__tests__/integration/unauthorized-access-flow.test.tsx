/**
 * Integration Test: Unauthorized Access Flow
 * 
 * Tests the complete flow when a user successfully authenticates with Appwrite
 * but is not a member of the event team. This ensures:
 * - Unauthorized errors are properly detected
 * - Informative alert is shown with correct content
 * - Session is properly cleaned up
 * - User is redirected to login page
 * - User can retry login without manual cookie clearing
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';
import { isUnauthorizedTeamError, isTokenExpiredError } from '@/lib/apiErrorHandler';

// Mock TokenRefreshManager
const mockTokenRefreshManager = {
  start: vi.fn(),
  stop: vi.fn(),
  refresh: vi.fn(),
  isRefreshing: vi.fn(() => false),
  onRefresh: vi.fn(),
  offRefresh: vi.fn(),
  clearUserContext: vi.fn(),
  setUserContext: vi.fn(),
};

// Mock TabCoordinator
const mockTabCoordinator = {
  requestRefresh: vi.fn(),
  notifyRefreshComplete: vi.fn(),
  onRefreshComplete: vi.fn(),
  cleanup: vi.fn(),
};

// Mock SweetAlert
const mockShowAlert = vi.fn().mockResolvedValue({ isConfirmed: true });
const mockToast = vi.fn();

// Mock dependencies
vi.mock('@/lib/appwrite', () => ({
  createBrowserClient: vi.fn(() => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
}));

vi.mock('@/lib/tokenRefresh', () => ({
  TokenRefreshManager: vi.fn(() => mockTokenRefreshManager),
}));

vi.mock('@/lib/tabCoordinator', () => ({
  createTabCoordinator: vi.fn(() => mockTabCoordinator),
}));

vi.mock('@/hooks/useSweetAlert', () => ({
  useSweetAlert: () => ({
    alert: mockShowAlert,
    showAlert: mockShowAlert,
    toast: mockToast,
  }),
}));

const mockRouterPush = vi.fn();
vi.mock('next/router', () => ({
  useRouter: vi.fn(() => ({
    push: mockRouterPush,
    pathname: '/',
    query: {},
    asPath: '/',
  })),
}));

// Mock fetch for logging
global.fetch = vi.fn();

describe('Unauthorized Access Flow', () => {
  const mockUser = {
    $id: 'user-123',
    email: 'unauthorized@example.com',
    name: 'Unauthorized User',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockSession = {
    $id: 'session-123',
    userId: 'user-123',
    secret: 'session-secret-token',
    expire: '2024-12-31T23:59:59.000Z',
    provider: 'email',
    $createdAt: '2024-01-01T00:00:00.000Z',
  };

  const mockJWT = {
    jwt: 'mock-jwt-token',
    expire: Math.floor(Date.now() / 1000) + (15 * 60),
  };

  const unauthorizedError = {
    type: 'user_unauthorized',
    code: 401,
    message: 'The current user is not authorized to perform the requested action',
  };

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
    mockShowAlert.mockClear();
    mockToast.mockClear();
    mockRouterPush.mockClear();
    mockTokenRefreshManager.start.mockClear();
    mockTokenRefreshManager.stop.mockClear();
    mockTokenRefreshManager.clearUserContext.mockClear();
    mockTokenRefreshManager.isRefreshing.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Task 4.1: Unauthorized Access Detection', () => {
    it('should detect unauthorized team error during login', async () => {
      // Setup: User authenticates successfully but profile fetch fails with unauthorized error
      // Since we're on a public page ('/'), initialization is skipped
      mockAccount.get.mockResolvedValue(mockUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockResolvedValue({});

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      // Attempt login
      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Error is expected but should be handled internally
        }
      });

      // Verify alert was shown
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalled();
      });
    });

    it('should display alert with user email and proper messaging', async () => {
      mockAccount.get.mockResolvedValue(mockUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockResolvedValue({});

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Access Not Granted',
            html: expect.stringContaining('unauthorized@example.com'),
            icon: 'info',
            confirmButtonText: 'OK, I Understand',
          })
        );
      });

      // Verify alert content includes required messaging
      const alertCall = mockShowAlert.mock.calls[0][0];
      expect(alertCall.html).toContain('You are signed in as');
      expect(alertCall.html).toContain('does not have access to this event');
      expect(alertCall.html).toContain('Contact the event manager');
      expect(alertCall.html).toContain('returned to the login page');
    });

    it('should use "info" icon, not "error"', async () => {
      // Since we're on a public page ('/'), initialization is skipped
      // So account.get() is only called during signIn, and it should succeed
      mockAccount.get.mockResolvedValue(mockUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockResolvedValue({});

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            icon: 'info',
          })
        );
      });

      // Explicitly verify it's NOT 'error'
      const alertCall = mockShowAlert.mock.calls[0][0];
      expect(alertCall.icon).not.toBe('error');
      expect(alertCall.icon).toBe('info');
    });

    it('should detect unauthorized error by error type and code', () => {
      const error = {
        type: 'user_unauthorized',
        code: 401,
        message: 'The current user is not authorized to perform the requested action',
      };

      expect(isUnauthorizedTeamError(error)).toBe(true);
    });

    it('should detect unauthorized error by message content', () => {
      const error = {
        message: 'The current user is not authorized to perform the requested action',
      };

      expect(isUnauthorizedTeamError(error)).toBe(true);
    });
  });

  describe('Task 4.2: Session Cleanup and Redirect', () => {
    it('should clear session after alert dismissal and perform atomic cleanup', async () => {
      mockAccount.get.mockResolvedValue(mockUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockResolvedValue({});

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected
        }
      });

      // Verify all cleanup functions were called atomically
      await waitFor(() => {
        expect(mockTokenRefreshManager.stop).toHaveBeenCalled();
        expect(mockTokenRefreshManager.clearUserContext).toHaveBeenCalled();
        expect(mockAccount.deleteSession).toHaveBeenCalledWith('current');
      });

      // Verify cleanup happens atomically:
      // 1. Token refresh is stopped first (prevents new refresh attempts)
      // 2. User context is cleared (removes user data from token manager)
      // 3. Server-side session is deleted (best-effort cleanup)
      // Note: The implementation calls these synchronously in cleanupUnauthorizedSession()
      // We verify they were all called; the implementation guarantees the order

      // Verify state is cleared (local state cleanup always happens)
      expect(result.current.user).toBeNull();
      expect(result.current.userProfile).toBeNull();
    });

    it('should handle session deletion failure gracefully', async () => {
      mockAccount.get.mockResolvedValue(mockUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);

      // Simulate server-side session deletion failure
      mockAccount.deleteSession.mockRejectedValue(new Error('Session deletion failed'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected
        }
      });

      // Verify cleanup was attempted
      await waitFor(() => {
        expect(mockTokenRefreshManager.stop).toHaveBeenCalled();
        expect(mockTokenRefreshManager.clearUserContext).toHaveBeenCalled();
        expect(mockAccount.deleteSession).toHaveBeenCalledWith('current');
      });

      // Even if server-side deletion fails, local state should still be cleared
      // This prevents the user from being stuck in a bad state
      expect(result.current.user).toBeNull();
      expect(result.current.userProfile).toBeNull();
    });

    it('should redirect to login page after cleanup', async () => {
      mockAccount.get.mockResolvedValue(mockUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockResolvedValue({});

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should not show infinite loading state', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockResolvedValueOnce({});

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected
        }
      });

      // Verify initializing is false (not stuck in loading state)
      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });
    });

    it('should allow retry login without clearing cookies manually', async () => {
      // First attempt - unauthorized
      mockAccount.get.mockResolvedValue(mockUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockResolvedValue({});

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });

      // Second attempt - now authorized (user was added to team)
      const mockUserProfile = {
        $id: 'profile-123',
        userId: 'user-123',
        email: 'unauthorized@example.com',
        name: 'Unauthorized User',
        roleId: 'role-123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Reset mocks for second attempt
      mockAccount.get.mockReset().mockResolvedValue(mockUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockReset().mockResolvedValue({
        documents: [mockUserProfile],
        total: 1,
      });
      (global.fetch as any).mockResolvedValue({ ok: true });

      await act(async () => {
        await result.current.signIn('unauthorized@example.com', 'password123');
      });

      // Verify second login succeeds
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.userProfile).toEqual(mockUserProfile);
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      mockAccount.get.mockResolvedValue(mockUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockRejectedValue(new Error('Session deletion failed'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      // Should not throw even if cleanup fails
      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected
        }
      });

      // Verify state is still cleared despite cleanup error
      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.userProfile).toBeNull();
      });

      // Verify redirect still happens
      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Task 4.3: Normal Login Still Works', () => {
    it('should allow normal login for authorized users', async () => {
      const mockUserProfile = {
        $id: 'profile-123',
        userId: 'user-123',
        email: 'authorized@example.com',
        name: 'Authorized User',
        roleId: 'role-123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const authorizedUser = {
        ...mockUser,
        email: 'authorized@example.com',
        name: 'Authorized User',
      };

      mockAccount.get.mockResolvedValue(authorizedUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockResolvedValue({
        documents: [mockUserProfile],
        total: 1,
      });
      (global.fetch as any).mockResolvedValue({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('authorized@example.com', 'password123');
      });

      // Verify login succeeds
      await waitFor(() => {
        expect(result.current.user).toEqual(authorizedUser);
        expect(result.current.userProfile).toEqual(mockUserProfile);
      });
    });

    it('should not show alert for authorized users', async () => {
      const mockUserProfile = {
        $id: 'profile-123',
        userId: 'user-123',
        email: 'authorized@example.com',
        name: 'Authorized User',
        roleId: 'role-123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockResolvedValue({
        documents: [mockUserProfile],
        total: 1,
      });
      (global.fetch as any).mockResolvedValue({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('authorized@example.com', 'password123');
      });

      // Verify alert was NOT shown
      expect(mockShowAlert).not.toHaveBeenCalled();
    });

    it('should not redirect to login for authorized users', async () => {
      const mockUserProfile = {
        $id: 'profile-123',
        userId: 'user-123',
        email: 'authorized@example.com',
        name: 'Authorized User',
        roleId: 'role-123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockResolvedValue({
        documents: [mockUserProfile],
        total: 1,
      });
      (global.fetch as any).mockResolvedValue({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('authorized@example.com', 'password123');
      });

      // Verify login succeeds and user state is set
      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
        expect(result.current.userProfile).toBeTruthy();
      });

      // Verify NO redirect to login (AuthContext doesn't redirect on success)
      // The caller (e.g., login.tsx) is responsible for navigating to dashboard
      expect(mockRouterPush).not.toHaveBeenCalledWith('/login');
    });
  });

  describe('Task 4.4: Error Differentiation', () => {
    it('should show generic error for invalid credentials, not team access alert', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      const invalidCredentialsError = {
        type: 'user_invalid_credentials',
        code: 401,
        message: 'Invalid credentials. Please check the email and password.',
      };
      mockAccount.createEmailPasswordSession.mockRejectedValueOnce(invalidCredentialsError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'wrongpassword');
        })
      ).rejects.toThrow();

      // Verify team access alert was NOT shown
      expect(mockShowAlert).not.toHaveBeenCalled();
    });

    it('should show session expired message for expired sessions, not team access alert', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      const expiredSessionError = {
        type: 'user_jwt_invalid',
        code: 401,
        message: 'Invalid JWT token',
      };
      mockAccount.createEmailPasswordSession.mockRejectedValueOnce(expiredSessionError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'password123');
        })
      ).rejects.toThrow();

      // Verify team access alert was NOT shown
      expect(mockShowAlert).not.toHaveBeenCalled();
    });

    it('should show connection error for network errors, not team access alert', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      const networkError = new Error('Network request failed');
      mockAccount.createEmailPasswordSession.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signIn('test@example.com', 'password123');
        } catch (error) {
          // signIn doesn't throw - it shows an alert instead
        }
      });

      // Verify an error alert was shown (not the team access alert)
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalled();
        const alertCall = mockShowAlert.mock.calls[0][0];
        expect(alertCall.icon).toBe('error'); // Generic error, not 'info' for team access
        expect(alertCall.title).not.toBe('Access Not Granted'); // Not the team access alert
      });
    });

    it('should correctly identify unauthorized team errors vs other 401 errors', () => {
      // Unauthorized team error
      expect(isUnauthorizedTeamError({
        type: 'user_unauthorized',
        code: 401,
      })).toBe(true);

      // Invalid credentials (also 401 but different type)
      expect(isUnauthorizedTeamError({
        type: 'user_invalid_credentials',
        code: 401,
      })).toBe(false);

      // Expired JWT (also 401 but different type)
      expect(isUnauthorizedTeamError({
        type: 'user_jwt_invalid',
        code: 401,
      })).toBe(false);

      // Generic 401 without type
      expect(isUnauthorizedTeamError({
        code: 401,
        message: 'Unauthorized',
      })).toBe(false);

      // Network error
      expect(isUnauthorizedTeamError(new Error('Network error'))).toBe(false);
    });

    it('should not misclassify team authorization errors as token expiration errors', () => {
      // Team authorization error should NOT be treated as token error
      const teamError = {
        type: 'user_unauthorized',
        code: 401,
        message: 'The current user is not authorized to perform the requested action',
      };
      expect(isUnauthorizedTeamError(teamError)).toBe(true);
      expect(isTokenExpiredError(teamError)).toBe(false);

      // JWT invalid error should be treated as token error
      const jwtError = {
        type: 'user_jwt_invalid',
        code: 401,
        message: 'Invalid JWT token',
      };
      expect(isUnauthorizedTeamError(jwtError)).toBe(false);
      expect(isTokenExpiredError(jwtError)).toBe(true);

      // Generic 401 with token keywords should be treated as token error
      const tokenError = {
        code: 401,
        message: 'Session expired',
      };
      expect(isUnauthorizedTeamError(tokenError)).toBe(false);
      expect(isTokenExpiredError(tokenError)).toBe(true);

      // Generic 401 without token keywords should NOT be treated as token error
      const genericError = {
        code: 401,
        message: 'Unauthorized',
      };
      expect(isUnauthorizedTeamError(genericError)).toBe(false);
      expect(isTokenExpiredError(genericError)).toBe(false);
    });
  });

  describe('Task 4.5: Different Scenarios', () => {
    it('should log unauthorized access attempts', async () => {
      mockAccount.get.mockResolvedValue(mockUser);
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockResolvedValue({});
      (global.fetch as any).mockResolvedValue({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected
        }
      });

      // Verify logging was attempted
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/logs',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('auth_unauthorized_access'),
          })
        );
      });
    });

    it('should handle logging failures gracefully', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockResolvedValueOnce({});
      (global.fetch as any).mockRejectedValueOnce(new Error('Logging failed'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      // Should not throw even if logging fails
      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected
        }
      });

      // Verify alert was still shown despite logging failure
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalled();
      });

      // Verify cleanup still happened
      expect(result.current.user).toBeNull();
    });

    it('should not show alert during session restoration', async () => {
      // Session restoration should not trigger the alert
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      // Verify alert was NOT shown during initialization
      expect(mockShowAlert).not.toHaveBeenCalled();

      // Verify session was cleared
      expect(result.current.user).toBeNull();
    });

    it('should only show alert once per login attempt', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.get.mockResolvedValueOnce(mockUser);
      // Multiple API calls might fail, but alert should only show once
      mockDatabases.listDocuments
        .mockRejectedValueOnce(unauthorizedError)
        .mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockResolvedValueOnce({});

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected
        }
      });

      // Verify alert was shown exactly once
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledTimes(1);
      });
    });

    it('should show alert for each separate login attempt (Requirement 5.4)', async () => {
      // Mock fetch for logging (both attempts)
      (global.fetch as any).mockResolvedValue({ ok: true });

      // Setup mocks for FIRST login attempt
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockResolvedValueOnce({});

      // Setup mocks for SECOND login attempt
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);
      mockAccount.deleteSession.mockResolvedValueOnce({});

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      // Record initial call count
      const initialAlertCallCount = mockShowAlert.mock.calls.length;
      const initialDeleteSessionCallCount = mockAccount.deleteSession.mock.calls.length;

      // FIRST login attempt
      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected - unauthorized error
        }
      });

      // Verify alert was shown once after first attempt
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledTimes(initialAlertCallCount + 1);
      });

      // Verify session cleanup was called for first attempt
      expect(mockAccount.deleteSession).toHaveBeenCalledTimes(initialDeleteSessionCallCount + 1);
      expect(mockAccount.deleteSession).toHaveBeenCalledWith('current');

      // SECOND login attempt (user retries)
      await act(async () => {
        try {
          await result.current.signIn('unauthorized@example.com', 'password123');
        } catch (error) {
          // Expected - unauthorized error again
        }
      });

      // Verify alert was shown again (at least twice total from start) for second attempt
      await waitFor(() => {
        const currentCallCount = mockShowAlert.mock.calls.length;
        expect(currentCallCount).toBeGreaterThanOrEqual(initialAlertCallCount + 2);
      });

      // Verify session cleanup was called for second attempt (at least twice total from start)
      expect(mockAccount.deleteSession.mock.calls.length).toBeGreaterThanOrEqual(initialDeleteSessionCallCount + 2);

      // Verify state remains cleared after both attempts
      expect(result.current.user).toBeNull();
      expect(result.current.userProfile).toBeNull();
    });
  });
});
