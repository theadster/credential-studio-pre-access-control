import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../verify-email';
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

describe('/api/users/verify-email', () => {
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
    emailVerification: false,
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
      get: vi.fn().mockResolvedValue(mockAuthUser),
      createEmailToken: vi.fn().mockResolvedValue({
        $id: 'token-123',
        userId: 'auth-user-456',
        secret: 'verification-secret',
        expire: new Date(Date.now() + 86400000).toISOString()
      })
    };

    const mockAccount = {
      createVerification: vi.fn().mockResolvedValue({
        $id: 'verification-123',
        userId: 'auth-user-456'
      })
    };

    const mockDatabases = {
      createDocument: vi.fn().mockResolvedValue({
        $id: 'log-123',
        userId: mockUser.$id,
        action: 'verification_email_sent',
        details: '{}'
      })
    };

    vi.mocked(createAdminClient).mockReturnValue({
      users: mockUsers,
      account: mockAccount,
      databases: mockDatabases
    } as any);

    vi.mocked(createSessionClient).mockReturnValue({
      databases: mockDatabases
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
    it('should reject requests without users.create permission', async () => {
      vi.mocked(hasPermission).mockReturnValue(false);
      req.body = { authUserId: 'auth-user-456' };

      await expect(handler(req as any, res as NextApiResponse)).rejects.toThrow('Insufficient permissions to send verification emails');

      expect(hasPermission).toHaveBeenCalledWith(
        mockUserProfile.role,
        'users',
        'create'
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

      // The validation passes because 123 is truthy, but Appwrite will reject it
      // This test verifies the endpoint doesn't crash with unexpected types
      expect(statusMock).toHaveBeenCalled();
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
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'User not found',
        code: 'INVALID_AUTH_USER'
      });
    });

    it('should reject request for already verified user', async () => {
      req.body = { authUserId: 'auth-user-456' };

      const mockUsers = vi.mocked(createAdminClient()).users;
      vi.mocked(mockUsers.get).mockResolvedValue({
        ...mockAuthUser,
        emailVerification: true
      } as any);

      await handler(req as any, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Email is already verified',
        code: 'EMAIL_ALREADY_VERIFIED'
      });
    });
  });

  describe('Rate limiting', () => {
    it('should enforce per-user rate limit', async () => {
      req.body = { authUserId: 'auth-user-456' };

      const resetAt = Date.now() + 1800000; // 30 minutes
      vi.mocked(rateLimiter.check)
        .mockReturnValueOnce({
          allowed: false,
          remaining: 0,
          resetAt
        });

      await handler(req as any, res as NextApiResponse);

      expect(rateLimiter.check).toHaveBeenCalledWith(
        'verify-email:user:auth-user-456',
        3,
        3600000
      );
      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VERIFICATION_RATE_LIMIT',
          resetAt
        })
      );
    });

    it('should enforce per-admin rate limit', async () => {
      req.body = { authUserId: 'auth-user-456' };

      const resetAt = Date.now() + 1800000; // 30 minutes
      vi.mocked(rateLimiter.check)
        .mockReturnValueOnce({ allowed: true, remaining: 2, resetAt: Date.now() + 3600000 })
        .mockReturnValueOnce({
          allowed: false,
          remaining: 0,
          resetAt
        });

      await handler(req as any, res as NextApiResponse);

      expect(rateLimiter.check).toHaveBeenCalledWith(
        'verify-email:admin:admin-user-123',
        20,
        3600000
      );
      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VERIFICATION_RATE_LIMIT',
          resetAt
        })
      );
    });

    it('should allow request when under rate limits', async () => {
      req.body = { authUserId: 'auth-user-456' };

      await handler(req as any, res as NextApiResponse);

      expect(rateLimiter.check).toHaveBeenCalledTimes(2);
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Verification email sending', () => {
    it('should send verification email successfully', async () => {
      req.body = { authUserId: 'auth-user-456' };
      const expectedVerificationUrl = `${process.env.NEXT_PUBLIC_VERIFICATION_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/verify-email'}`;

      await handler(req as any, res as NextApiResponse);

      const mockUsers = vi.mocked(createAdminClient()).users;
      expect(mockUsers.createEmailToken).toHaveBeenCalledWith('auth-user-456', expectedVerificationUrl);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Verification email sent successfully. User must click the link in their email to verify.',
        userId: 'auth-user-456',
        email: 'user@example.com'
      });
    });

    it('should handle verification email send failure', async () => {
      req.body = { authUserId: 'auth-user-456' };

      const mockUsers = vi.mocked(createAdminClient()).users;
      vi.mocked(mockUsers.createEmailToken).mockRejectedValue(
        new Error('API error')
      );

      await handler(req as any, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to send verification email. Please try again.',
          code: 'VERIFICATION_SEND_FAILED'
        })
      );
    });
  });

  describe('Logging', () => {
    it('should log verification email send', async () => {
      req.body = { authUserId: 'auth-user-456' };

      await handler(req as any, res as NextApiResponse);

      const mockDatabases = vi.mocked(createSessionClient(req as any)).databases;
      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        {
          userId: mockUser.$id,
          action: 'verification_email_sent',
          details: expect.stringContaining('auth-user-456')
        }
      );

      // Verify the details contain all required fields
      const createDocumentMock = vi.mocked(mockDatabases.createDocument);
      const callArgs = createDocumentMock.mock.calls[0];
      const logData = callArgs[3] as any;
      const details = JSON.parse(logData.details);
      expect(details).toMatchObject({
        type: 'email_verification',
        operation: 'send',
        targetUserId: 'auth-user-456',
        targetUserEmail: expect.any(String),
        targetUserName: expect.any(String),
        administratorId: mockUser.$id,
        administratorEmail: mockUser.email,
        administratorName: mockUser.name,
        timestamp: expect.any(String)
      });
    });

    it('should not fail request if logging fails', async () => {
      req.body = { authUserId: 'auth-user-456' };

      const mockDatabases = vi.mocked(createSessionClient(req as any)).databases;
      vi.mocked(mockDatabases.createDocument).mockRejectedValue(
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
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTH_FAILED'
        })
      );
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
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'PERMISSION_DENIED'
        })
      );
    });

    it('should handle unexpected errors', async () => {
      req.body = { authUserId: 'auth-user-456' };

      const mockUsers = vi.mocked(createAdminClient()).users;
      vi.mocked(mockUsers.get).mockRejectedValue(
        new Error('Unexpected error')
      );

      await handler(req as any, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'An unexpected error occurred. Please try again.',
          code: 'INTERNAL_ERROR'
        })
      );
    });
  });
});
