import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/users/send-password-reset';
import { createAdminClient, createSessionClient } from '@/lib/appwrite';
import { hasPermission } from '@/lib/permissions';
import rateLimiter from '@/lib/rateLimiter';

// Mock dependencies
vi.mock('@/lib/appwrite');
vi.mock('@/lib/permissions');
vi.mock('@/lib/rateLimiter');
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handler: any) => handler,
}));

// Mock node-appwrite for password recovery
vi.mock('node-appwrite', async () => {
  const actual = await vi.importActual('node-appwrite');
  return {
    ...actual,
    Client: vi.fn(() => ({
      setEndpoint: vi.fn().mockReturnThis(),
      setProject: vi.fn().mockReturnThis(),
    })),
    Account: vi.fn(() => ({
      createRecovery: vi.fn().mockResolvedValue({
        $id: 'recovery-123',
        userId: 'auth-user-456',
      }),
    })),
  };
});

describe('/api/users/send-password-reset', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;

  const mockUser = {
    $id: 'admin-user-123',
    email: 'admin@example.com',
    name: 'Admin User'
  };

  const mockUserProfile = {
    $id: 'profile-123',
    userId: 'admin-user-123',
    email: 'admin@example.com',
    name: 'Admin User',
    roleId: 'role-123',
    role: {
      $id: 'role-123',
      name: 'Super Administrator',
      permissions: {
        users: { create: true, read: true, update: true, delete: true }
      }
    }
  };

  const mockAuthUser = {
    $id: 'auth-user-456',
    email: 'user@example.com',
    name: 'Test User',
    emailVerification: true,
    phoneVerification: false,
    $createdAt: '2024-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    setHeaderMock = vi.fn();

    req = {
      method: 'POST',
      body: {},
      cookies: { 'appwrite-session': 'mock-jwt-token' },
      user: mockUser,
      userProfile: mockUserProfile
    } as any;

    res = {
      status: statusMock,
      setHeader: setHeaderMock,
      json: jsonMock
    } as any;

    // Reset mocks
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(hasPermission).mockReturnValue(true);

    vi.mocked(rateLimiter.check).mockReturnValue({
      allowed: true,
      remaining: 2,
      resetAt: Date.now() + 3600000
    });

    const mockUsers = {
      get: vi.fn().mockResolvedValue(mockAuthUser)
    };
    
    const mockAccount = {
      createRecovery: vi.fn().mockResolvedValue({
        $id: 'recovery-123',
        userId: 'auth-user-456',
        secret: 'recovery-secret',
        expire: new Date(Date.now() + 86400000).toISOString()
      })
    };

    const mockTablesDB = {
      createRow: vi.fn().mockResolvedValue({
        $id: 'log-123',
        userId: mockUser.$id,
        action: 'password_reset_email_sent',
        details: '{}'
      })
    };

    vi.mocked(createAdminClient).mockReturnValue({
      users: mockUsers,
      tablesDB: mockTablesDB
    } as any);

    vi.mocked(createSessionClient).mockReturnValue({
      tablesDB: mockTablesDB
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Method validation', () => {
    it('should reject non-POST requests', async () => {
      req.method = 'GET';

      await handler(req as any, res as NextApiResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['POST']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Method GET not allowed'
      });
    });
  });

  describe('Permission checks', () => {
    it('should reject requests without users.update permission', async () => {
      vi.mocked(hasPermission).mockReturnValue(false);
      req.body = { authUserId: 'auth-user-456' };

      await expect(handler(req as any, res as NextApiResponse)).rejects.toThrow('Insufficient permissions to send password reset emails');

      expect(hasPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: mockUserProfile.role.permissions
        }),
        'users',
        'update'
      );
    });
  });

  describe('Input validation', () => {
    it('should reject request without authUserId', async () => {
      req.body = {};

      await handler(req as any, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Auth user ID is required',
          code: 'VALIDATION_ERROR'
        })
      );
    });

    it('should handle request with non-string authUserId', async () => {
      req.body = { authUserId: 123 };

      await handler(req as any, res as NextApiResponse);

      // The validation converts numbers to strings, so this should succeed
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('User validation', () => {
    it('should reject request for non-existent user', async () => {
      req.body = { authUserId: 'non-existent-user' };

      const mockUsers = vi.mocked(createAdminClient()).users;
      vi.mocked(mockUsers.get).mockRejectedValue({
        code: 404,
        type: 'user_not_found'
      });

      await handler(req as any, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'User not found',
          code: 'INVALID_AUTH_USER'
        })
      );
    });
  });

  describe('Rate limiting', () => {
    it('should enforce per-user rate limit', async () => {
      req.body = { authUserId: 'auth-user-456' };

      vi.mocked(rateLimiter.check).mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 1800000 // 30 minutes
      });

      await handler(req as any, res as NextApiResponse);

      expect(rateLimiter.check).toHaveBeenCalledWith(
        'password-reset:user:auth-user-456',
        3,
        3600000
      );
      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VERIFICATION_RATE_LIMIT'
        })
      );
    });

    it('should enforce per-admin rate limit', async () => {
      req.body = { authUserId: 'auth-user-456' };

      vi.mocked(rateLimiter.check)
        .mockReturnValueOnce({ allowed: true, remaining: 2, resetAt: Date.now() + 3600000 })
        .mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 1800000 });

      await handler(req as any, res as NextApiResponse);

      expect(rateLimiter.check).toHaveBeenCalledWith(
        'password-reset:admin:admin-user-123',
        20,
        3600000
      );
      expect(statusMock).toHaveBeenCalledWith(429);
    });

    it('should allow request when under rate limits', async () => {
      req.body = { authUserId: 'auth-user-456' };

      await handler(req as any, res as NextApiResponse);

      expect(rateLimiter.check).toHaveBeenCalledTimes(2);
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Password reset email sending', () => {
    it('should send password reset email successfully', async () => {
      req.body = { authUserId: 'auth-user-456' };

      await handler(req as any, res as NextApiResponse);

      // Note: We can't easily test the dynamic import mock, but we verify the response
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset email sent successfully. User must click the link in their email to reset their password.',
        userId: 'auth-user-456',
        email: 'user@example.com'
      });
    });

    it('should handle password reset email send failure', async () => {
      req.body = { authUserId: 'auth-user-456' };

      // Mock the node-appwrite import to throw an error
      vi.doMock('node-appwrite', () => ({
        Client: vi.fn(() => ({
          setEndpoint: vi.fn().mockReturnThis(),
          setProject: vi.fn().mockReturnThis(),
        })),
        Account: vi.fn(() => ({
          createRecovery: vi.fn().mockRejectedValue(new Error('API error')),
        })),
      }));

      await handler(req as any, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to send password reset email. Please try again.',
          code: 'VERIFICATION_SEND_FAILED'
        })
      );
    });
  });

  describe('Logging', () => {
    it('should log password reset email send', async () => {
      req.body = { authUserId: 'auth-user-456' };

      await handler(req as any, res as NextApiResponse);

      const mockTablesDB = vi.mocked(createSessionClient(req as any)).tablesDB;
      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockUser.$id,
          action: 'password_reset_email_sent',
          details: expect.stringContaining('password_reset')
        })
      );
    });

    it('should not fail request if logging fails', async () => {
      req.body = { authUserId: 'auth-user-456' };

      const mockTablesDB = vi.mocked(createSessionClient(req as any)).tablesDB;
      vi.mocked(mockTablesDB.createRow).mockRejectedValue(
        new Error('Database error')
      );

      await handler(req as any, res as NextApiResponse);

      // Should still return success
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle authentication errors', async () => {
      req.body = { authUserId: 'auth-user-456' };

      const mockUsers = vi.mocked(createAdminClient()).users;
      vi.mocked(mockUsers.get).mockRejectedValue({
        code: 401,
        message: 'Unauthorized'
      });

      await handler(req as any, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle permission errors', async () => {
      req.body = { authUserId: 'auth-user-456' };

      const mockUsers = vi.mocked(createAdminClient()).users;
      vi.mocked(mockUsers.get).mockRejectedValue({
        code: 403,
        message: 'Forbidden'
      });

      await handler(req as any, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should handle unexpected errors', async () => {
      req.body = { authUserId: 'auth-user-456' };

      const mockUsers = vi.mocked(createAdminClient()).users;
      vi.mocked(mockUsers.get).mockRejectedValue(
        new Error('Unexpected error')
      );

      await handler(req as any, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});
