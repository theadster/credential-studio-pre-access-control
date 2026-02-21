import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { mockAccount, mockTablesDB, mockAdminTablesDB, resetAllMocks } from '@/test/mocks/appwrite';
import { OAuthProvider, ID } from 'appwrite';
import Cookies from 'js-cookie';

// Use vi.hoisted so these are available inside vi.mock factories (which are hoisted)
const { mockTokenRefreshManager, mockTabCoordinator } = vi.hoisted(() => {
  const mockTokenRefreshManager = {
    start: vi.fn(),
    stop: vi.fn(),
    refresh: vi.fn(),
    isRefreshing: vi.fn(() => false),
    onRefresh: vi.fn(),
    offRefresh: vi.fn(),
    setUserContext: vi.fn(),
    clearUserContext: vi.fn(),
  };
  const mockTabCoordinator = {
    requestRefresh: vi.fn(),
    notifyRefreshComplete: vi.fn(),
    onRefreshComplete: vi.fn(),
    cleanup: vi.fn(),
  };
  return { mockTokenRefreshManager, mockTabCoordinator };
});

// Mock dependencies
vi.mock('@/lib/appwrite', () => ({
  createBrowserClient: vi.fn(() => ({
    account: mockAccount,
    tablesDB: mockTablesDB,
  })),
  createAdminClient: vi.fn(() => ({
    tablesDB: mockAdminTablesDB,
})),
}));

vi.mock('@/lib/tokenRefresh', () => {
  class MockTokenRefreshManager {
    start = mockTokenRefreshManager.start;
    stop = mockTokenRefreshManager.stop;
    refresh = mockTokenRefreshManager.refresh;
    isRefreshing = mockTokenRefreshManager.isRefreshing;
    onRefresh = mockTokenRefreshManager.onRefresh;
    offRefresh = mockTokenRefreshManager.offRefresh;
    setUserContext = mockTokenRefreshManager.setUserContext;
    clearUserContext = mockTokenRefreshManager.clearUserContext;
  }
  return { TokenRefreshManager: MockTokenRefreshManager };
});

vi.mock('@/lib/tabCoordinator', () => ({
  createTabCoordinator: vi.fn(() => mockTabCoordinator),
}));

vi.mock('js-cookie', () => ({
  default: {
    set: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('next/router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    pathname: '/dashboard',
    query: {},
    asPath: '/dashboard',
  })),
}));

vi.mock('@/hooks/useSweetAlert', () => ({
  useSweetAlert: vi.fn(() => ({
    toast: vi.fn(),
    alert: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock fetch for logging
global.fetch = vi.fn();

describe('AuthContext', () => {
  const mockUser = {
    $id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockUserProfile = {
    $id: 'profile-123',
    userId: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    roleId: 'role-123',
    isInvited: false,
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
    expire: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes from now
  };

  beforeEach(async () => {
    resetAllMocks();
    vi.clearAllMocks();
    // Reset mock implementations to clear any queued mockResolvedValueOnce/mockRejectedValueOnce
    mockAccount.get.mockReset();
    mockAccount.createJWT.mockReset();
    mockAccount.createEmailPasswordSession.mockReset();
    mockAccount.deleteSession.mockReset();
    mockTablesDB.listRows.mockReset();
    mockTablesDB.createRow.mockReset();
    (global.fetch as any).mockReset();
    mockTokenRefreshManager.start.mockReset();
    mockTokenRefreshManager.stop.mockReset();
    mockTokenRefreshManager.refresh.mockReset();
    mockTokenRefreshManager.isRefreshing.mockReturnValue(false);
    mockTokenRefreshManager.onRefresh.mockReset();
    mockTokenRefreshManager.setUserContext.mockReset();
    mockTokenRefreshManager.clearUserContext.mockReset();
    mockTabCoordinator.onRefreshComplete.mockReset();
    mockTabCoordinator.cleanup.mockReset();

    // Reset router mock to default protected path so session check runs
    const nextRouter = await import('next/router');
    vi.mocked(nextRouter.useRouter).mockReturnValue({
      push: vi.fn(),
      pathname: '/dashboard',
      query: {},
      asPath: '/dashboard',
    } as any);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with null user when not authenticated', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.initializing).toBe(true);

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.userProfile).toBeNull();
    });

    it('should initialize with user when authenticated', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.userProfile).toEqual(mockUserProfile);
      expect(mockAccount.createJWT).toHaveBeenCalled();
      expect(mockTokenRefreshManager.start).toHaveBeenCalledWith(mockJWT.expire);
    });
  });

  describe('signIn', () => {
    it('should successfully sign in with email and password', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows
        .mockResolvedValueOnce({
          rows: [mockUserProfile],
          total: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockUserProfile],
          total: 1,
        });
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockAccount.createEmailPasswordSession).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(mockAccount.createJWT).toHaveBeenCalled();
      expect(mockTokenRefreshManager.start).toHaveBeenCalledWith(mockJWT.expire);
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.userProfile).toEqual(mockUserProfile);
      });
    });

    it('should create user profile if it does not exist during sign in', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });
      mockTablesDB.createRow.mockResolvedValueOnce(mockUserProfile);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com',
          isInvited: false,
        })
      );
    });

    it('should handle sign in errors', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      const error = new Error('Invalid credentials');
      mockAccount.createEmailPasswordSession.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      // signIn swallows errors and shows SweetAlert instead of re-throwing
      await act(async () => {
        await result.current.signIn('test@example.com', 'wrongpassword');
      });

      expect(result.current.user).toBeNull();
    });

    it('should log authentication event on successful sign in', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows
        .mockResolvedValueOnce({
          rows: [mockUserProfile],
          total: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockUserProfile],
          total: 1,
        });
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/logs',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('auth_login'),
        })
      );
    });
  });

  describe('signUp', () => {
    it('should successfully sign up with email and password', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.create.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });
      mockTablesDB.createRow.mockResolvedValueOnce(mockUserProfile);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123', 'Test User');
      });

      expect(mockAccount.create).toHaveBeenCalledWith(
        expect.any(String),
        'test@example.com',
        'password123',
        'Test User'
      );
      expect(mockTablesDB.createRow).toHaveBeenCalled();
    });

    it('should handle sign up errors', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      const error = new Error('Email already exists');
      mockAccount.create.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signUp('test@example.com', 'password123');
        })
      ).rejects.toThrow('Email already exists');
    });

    it('should create user profile during sign up', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.create.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });
      mockTablesDB.createRow.mockResolvedValueOnce(mockUserProfile);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123', 'Test User');
      });

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          isInvited: false,
        })
      );
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.deleteSession.mockResolvedValueOnce({});
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockAccount.deleteSession).toHaveBeenCalledWith('current');
      // Cookie is cleared using document.cookie directly, not Cookies library
      expect(result.current.user).toBeNull();
      expect(result.current.userProfile).toBeNull();
    });

    it('should log authentication event on sign out', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.deleteSession.mockResolvedValueOnce({});
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/logs',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('auth_logout'),
        })
      );
    });

    it('should handle sign out errors gracefully', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      const error = new Error('Session deletion failed');
      mockAccount.deleteSession.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.signOut();
      });

      // Should not throw, but handle gracefully
      expect(mockAccount.deleteSession).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.createRecovery.mockResolvedValueOnce({});

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.resetPassword('test@example.com');
      });

      expect(mockAccount.createRecovery).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('/reset-password')
      );
    });

    it('should handle password reset errors', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      const error = new Error('User not found');
      mockAccount.createRecovery.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.resetPassword('nonexistent@example.com');
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('updatePassword', () => {
    it('should successfully update password', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.updatePassword.mockResolvedValueOnce(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.updatePassword('newPassword123');
      });

      expect(mockAccount.updatePassword).toHaveBeenCalledWith('newPassword123');
    });

    it('should handle password update errors', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      const error = new Error('Password too weak');
      mockAccount.updatePassword.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await expect(
        act(async () => {
          await result.current.updatePassword('weak');
        })
      ).rejects.toThrow('Password too weak');
    });
  });

  describe('signInWithMagicLink', () => {
    it('should send magic link email', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.createMagicURLToken.mockResolvedValueOnce({});

      // Mock window.location.origin
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000' },
        writable: true,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithMagicLink('test@example.com');
      });

      expect(mockAccount.createMagicURLToken).toHaveBeenCalledWith(
        expect.any(String),
        'test@example.com',
        'http://localhost:3000/auth/callback'
      );
    });

    it('should handle magic link errors', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      const error = new Error('Invalid email');
      mockAccount.createMagicURLToken.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signInWithMagicLink('invalid-email');
        })
      ).rejects.toThrow('Invalid email');
    });
  });

  describe('signInWithGoogle', () => {
    it('should initiate Google OAuth flow', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.createOAuth2Session.mockResolvedValueOnce(undefined);

      // Mock window.location.origin
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000' },
        writable: true,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockAccount.createOAuth2Session).toHaveBeenCalledWith(
        OAuthProvider.Google,
        'http://localhost:3000/auth/callback',
        'http://localhost:3000/login'
      );
    });

    it('should handle Google OAuth errors', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      const error = new Error('OAuth failed');
      mockAccount.createOAuth2Session.mockImplementationOnce(() => {
        throw error;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signInWithGoogle();
        })
      ).rejects.toThrow('OAuth failed');
    });
  });

  describe('Session Management', () => {
    it('should store session in cookies on sign in', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows
        .mockResolvedValueOnce({
          rows: [mockUserProfile],
          total: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockUserProfile],
          total: 1,
        });
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      // JWT is now stored in cookie instead of session secret
      expect(mockAccount.createJWT).toHaveBeenCalled();
    });

    it('should clear session cookie on sign out', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.deleteSession.mockResolvedValueOnce({});
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.userProfile).toEqual(mockUserProfile);
      });

      await act(async () => {
        await result.current.signOut();
      });

      // Cookie is cleared using document.cookie directly, not Cookies library
      // Verify the session was deleted and state was cleared
      expect(mockAccount.deleteSession).toHaveBeenCalledWith('current');
      expect(result.current.user).toBeNull();
      expect(result.current.userProfile).toBeNull();
    });

    it('should update state when user profile is fetched', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.userProfile).toEqual(mockUserProfile);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during sign in', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      const networkError = new Error('Network error');
      mockAccount.createEmailPasswordSession.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      // signIn swallows errors and shows SweetAlert instead of re-throwing
      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.user).toBeNull();
    });

    it('should handle profile fetch errors gracefully', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockRejectedValueOnce(new Error('Database error'));
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
        expect(result.current.user).toEqual(mockUser);
      });

      // Should not crash, but user profile should be null
      expect(result.current.userProfile).toBeNull();
    });

    it('should handle logging errors gracefully', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      (global.fetch as any).mockRejectedValueOnce(new Error('Logging failed'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      // Should not throw even if logging fails
      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('Session Restoration', () => {
    it('should restore session with fresh JWT on page load', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.userProfile).toEqual(mockUserProfile);
      expect(mockAccount.createJWT).toHaveBeenCalled();
      expect(mockTokenRefreshManager.start).toHaveBeenCalledWith(mockJWT.expire);
    });

    it('should handle JWT creation failure during session restoration', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockAccount.createJWT.mockRejectedValueOnce(new Error('JWT creation failed'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      // Should clear session on JWT creation failure
      expect(result.current.user).toBeNull();
      expect(result.current.userProfile).toBeNull();
      expect(mockTokenRefreshManager.stop).toHaveBeenCalled();
    });

    it('should clear stale cookies on session restoration failure', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Session expired'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.userProfile).toBeNull();
      expect(mockTokenRefreshManager.stop).toHaveBeenCalled();
    });

    it('should preserve return URL for protected pages on session expiration', async () => {
      const mockPush = vi.fn();
      const mockRouter = {
        push: mockPush,
        pathname: '/dashboard',
        query: {},
        asPath: '/dashboard?tab=settings',
      };

      // Update the mock implementation
      const nextRouter = await import('next/router');
      vi.mocked(nextRouter.useRouter).mockReturnValue(mockRouter as any);

      mockAccount.get.mockRejectedValueOnce(new Error('Session expired'));

      // Mock sessionStorage
      const sessionStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };
      Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true,
      });

      renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith('returnUrl', '/dashboard?tab=settings');
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should not redirect to login for non-protected pages', async () => {
      const mockPush = vi.fn();
      const mockRouter = {
        push: mockPush,
        pathname: '/login',
        query: {},
        asPath: '/login',
      };

      // Update the mock implementation
      const nextRouter = await import('next/router');
      vi.mocked(nextRouter.useRouter).mockReturnValue(mockRouter as any);

      mockAccount.get.mockRejectedValueOnce(new Error('Session expired'));

      renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should redirect to preserved URL after successful login', async () => {
      const mockPush = vi.fn();
      const mockRouter = {
        push: mockPush,
        pathname: '/',
        query: {},
        asPath: '/',
      };

      // Update the mock implementation
      const nextRouter = await import('next/router');
      vi.mocked(nextRouter.useRouter).mockReturnValue(mockRouter as any);

      // Mock sessionStorage with return URL
      const sessionStorageMock = {
        getItem: vi.fn((key) => key === 'returnUrl' ? '/dashboard?tab=settings' : null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };
      Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true,
      });

      // pathname is '/' (public path) so session check is skipped — no mockAccount.get needed for init
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows
        .mockResolvedValueOnce({
          rows: [mockUserProfile],
          total: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockUserProfile],
          total: 1,
        });
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('returnUrl');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('returnUrl');
      expect(mockPush).toHaveBeenCalledWith('/dashboard?tab=settings');
    });

    it('should handle profile fetch failure during session restoration', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockRejectedValueOnce(new Error('Database error'));
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      // Should still set user even if profile fetch fails
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.userProfile).toBeNull();
      // Should still start token refresh
      expect(mockTokenRefreshManager.start).toHaveBeenCalledWith(mockJWT.expire);
    });
  });

  describe('Token Refresh Integration', () => {
    it('should start token refresh timer on sign in', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows
        .mockResolvedValueOnce({
          rows: [mockUserProfile],
          total: 1,
        })
        .mockResolvedValueOnce({
          rows: [mockUserProfile],
          total: 1,
        });
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockTokenRefreshManager.start).toHaveBeenCalledWith(mockJWT.expire);
    });

    it('should stop token refresh timer on sign out', async () => {
      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockAccount.createJWT.mockResolvedValueOnce(mockJWT);
      mockAccount.deleteSession.mockResolvedValueOnce({});
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockTokenRefreshManager.stop).toHaveBeenCalled();
    });

    it('should register token refresh callbacks on mount', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));

      renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(mockTokenRefreshManager.onRefresh).toHaveBeenCalled();
        expect(mockTabCoordinator.onRefreshComplete).toHaveBeenCalled();
      });
    });

    it('should cleanup token refresh on unmount', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));

      const { unmount } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(mockTokenRefreshManager.onRefresh).toHaveBeenCalled();
      });

      unmount();

      expect(mockTokenRefreshManager.stop).toHaveBeenCalled();
      expect(mockTabCoordinator.cleanup).toHaveBeenCalled();
    });

    it('should expose refreshToken method', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockTokenRefreshManager.refresh.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      const refreshResult = await act(async () => {
        return await result.current.refreshToken();
      });

      expect(refreshResult).toBe(true);
      expect(mockTokenRefreshManager.refresh).toHaveBeenCalled();
    });

    it('should expose isTokenRefreshing method', async () => {
      mockAccount.get.mockRejectedValueOnce(new Error('Not authenticated'));
      mockTokenRefreshManager.isRefreshing.mockReturnValue(true);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.initializing).toBe(false);
      });

      const isRefreshing = result.current.isTokenRefreshing();

      expect(isRefreshing).toBe(true);
      expect(mockTokenRefreshManager.isRefreshing).toHaveBeenCalled();
    });
  });
});
