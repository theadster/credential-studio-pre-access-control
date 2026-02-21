/**
 * Integration tests for API middleware (withAuth)
 * Tests authentication, token validation, user profile fetching, and error handling
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import { Models } from 'node-appwrite';
import { withAuth, AuthenticatedRequest, hasPermission, withPermission } from '@/lib/apiMiddleware';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

// Mock the cache to prevent cross-test contamination
vi.mock('@/lib/userProfileCache', () => ({
  userProfileCache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    invalidate: vi.fn(),
  },
  CachedUserProfile: {},
}));

import { createSessionClient, createAdminClient } from '@/lib/appwrite';

describe('API Middleware Integration Tests', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockAccount: any;
  let mockTablesDB: any;
  let jsonSpy: any;
  let statusSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock request
    mockReq = {
      method: 'GET',
      url: '/api/test',
      headers: {},
      cookies: {
        'appwrite-session': 'valid-jwt-token',
      },
    };

    // Setup mock response with spies
    jsonSpy = vi.fn().mockReturnThis();
    statusSpy = vi.fn().mockReturnThis();

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
      setHeader: vi.fn().mockReturnThis(),
    };

    // Setup mock Appwrite clients
    mockAccount = {
      get: vi.fn(),
    };

    mockTablesDB = {
      listRows: vi.fn(),
      getRow: vi.fn(),
    };

    (createSessionClient as any).mockReturnValue({
      account: mockAccount,
      tablesDB: mockTablesDB,
    });

    (createAdminClient as any).mockReturnValue({
      tablesDB: mockTablesDB,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 5.1: API calls with valid tokens', () => {
    it('should successfully authenticate with valid JWT token', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerification: true,
        phoneVerification: false,
        prefs: {},
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        roleId: null,
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        res.status(200).json({ success: true, userId: req.user.$id });
      });

      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockAccount.get).toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        userId: 'user123',
      });
    });

    it('should attach user and userProfile to request object', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user456',
        email: 'user@test.com',
        name: 'User Name',
        emailVerification: true,
        phoneVerification: false,
        prefs: {},
      };

      const mockUserProfile = {
        $id: 'profile456',
        userId: 'user456',
        email: 'user@test.com',
        name: 'User Name',
        roleId: 'role123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'role123',
        name: 'Admin',
        description: 'Administrator',
        permissions: { canManageUsers: true, canViewLogs: true },
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });
      mockTablesDB.getRow.mockResolvedValue(mockRole);

      let capturedReq: AuthenticatedRequest | null = null;

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        capturedReq = req;
        res.status(200).json({ success: true });
      });

      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(capturedReq).not.toBeNull();
      expect(capturedReq!.user).toEqual(mockUser);
      expect(capturedReq!.userProfile).toMatchObject({
        userId: 'user456',
        email: 'user@test.com',
        name: 'User Name',
        roleId: 'role123',
        role: {
          id: 'role123',
          name: 'Admin',
          permissions: { canManageUsers: true, canViewLogs: true },
        },
      });
    });
  });

  describe('Requirement 5.2: API calls with expired tokens', () => {
    it('should return 401 with tokenExpired flag for expired JWT', async () => {
      mockAccount.get.mockRejectedValue({
        code: 401,
        type: 'user_jwt_invalid',
        message: 'Invalid JWT token',
      });

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(handler).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenExpired: true,
          code: 401,
          type: 'user_jwt_invalid',
        })
      );
    });

    it('should detect token expiration from error message', async () => {
      mockAccount.get.mockRejectedValue({
        code: 401,
        message: 'JWT token has expired',
      });

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenExpired: true,
        })
      );
    });

    it('should handle unauthorized errors consistently', async () => {
      mockAccount.get.mockRejectedValue({
        code: 401,
        type: 'user_unauthorized',
        message: 'User is not authorized',
      });

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 401,
          type: 'user_unauthorized',
        })
      );
    });
  });

  describe('Requirement 5.3: Error response format consistency', () => {
    it('should return consistent error format for authentication failures', async () => {
      mockAccount.get.mockRejectedValue({
        code: 401,
        type: 'user_jwt_invalid',
        message: 'Invalid JWT',
      });

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          code: 401,
          type: expect.any(String),
          message: expect.any(String),
          tokenExpired: true,
        })
      );
    });

    it('should return consistent error format for missing user profile', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user789',
        email: 'noProfile@test.com',
        name: 'No Profile User',
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(handler).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'User profile not found',
        code: 404,
        type: 'profile_not_found',
        message: 'User profile does not exist in the database',
      });
    });

    it('should return consistent error format for unexpected errors', async () => {
      mockAccount.get.mockRejectedValue(new Error('Network error'));

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          code: 500,
          type: expect.any(String),
          message: expect.any(String),
        })
      );
    });
  });

  describe('Requirement 5.4: User profile fetching in middleware', () => {
    it('should fetch user profile from database', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user999',
        email: 'profile@test.com',
        name: 'Profile User',
      };

      const mockUserProfile = {
        $id: 'profile999',
        userId: 'user999',
        email: 'profile@test.com',
        name: 'Profile User',
        roleId: null,
        isInvited: true,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        res.status(200).json({ profile: req.userProfile });
      });

      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.listRows).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID,
        expect.any(Array)
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        profile: expect.objectContaining({
          userId: 'user999',
          email: 'profile@test.com',
          isInvited: true,
        }),
      });
    });

    it('should fetch and attach role information when user has a role', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user888',
        email: 'admin@test.com',
        name: 'Admin User',
      };

      const mockUserProfile = {
        $id: 'profile888',
        userId: 'user888',
        email: 'admin@test.com',
        name: 'Admin User',
        roleId: 'adminRole',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'adminRole',
        name: 'Super Admin',
        description: 'Full system access',
        permissions: JSON.stringify({
          canManageUsers: true,
          canManageRoles: true,
          canViewLogs: true,
          canDeleteLogs: true,
        }),
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });
      mockTablesDB.getRow.mockResolvedValue(mockRole);

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        res.status(200).json({ role: req.userProfile.role });
      });

      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.getRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID,
        'adminRole'
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        role: {
          id: 'adminRole',
          name: 'Super Admin',
          description: 'Full system access',
          permissions: {
            canManageUsers: true,
            canManageRoles: true,
            canViewLogs: true,
            canDeleteLogs: true,
          },
        },
      });
    });

    it('should handle role fetch failures gracefully', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user777',
        email: 'user@test.com',
        name: 'User',
      };

      const mockUserProfile = {
        $id: 'profile777',
        userId: 'user777',
        email: 'user@test.com',
        name: 'User',
        roleId: 'missingRole',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });
      mockTablesDB.getRow.mockRejectedValue(new Error('Role not found'));

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        res.status(200).json({ role: req.userProfile.role });
      });

      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should still succeed but with null role
      expect(handler).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        role: null,
      });
    });
  });

  describe('Requirement 5.5: Permission checking', () => {
    it('should correctly identify when user has permission', () => {
      const userProfile = {
        id: 'profile1',
        userId: 'user1',
        email: 'test@test.com',
        name: 'Test',
        roleId: 'role1',
        isInvited: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        role: {
          id: 'role1',
          name: 'Admin',
          description: 'Admin role',
          permissions: {
            canManageUsers: true,
            canViewLogs: true,
          },
        },
      };

      expect(hasPermission(userProfile, 'canManageUsers')).toBe(true);
      expect(hasPermission(userProfile, 'canViewLogs')).toBe(true);
    });

    it('should correctly identify when user lacks permission', () => {
      const userProfile = {
        id: 'profile2',
        userId: 'user2',
        email: 'test@test.com',
        name: 'Test',
        roleId: 'role2',
        isInvited: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        role: {
          id: 'role2',
          name: 'Viewer',
          description: 'Viewer role',
          permissions: {
            canViewLogs: true,
            canManageUsers: false,
          },
        },
      };

      expect(hasPermission(userProfile, 'canManageUsers')).toBe(false);
      expect(hasPermission(userProfile, 'canViewLogs')).toBe(true);
    });

    it('should return false when user has no role', () => {
      const userProfile = {
        id: 'profile3',
        userId: 'user3',
        email: 'test@test.com',
        name: 'Test',
        roleId: null,
        isInvited: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        role: null,
      };

      expect(hasPermission(userProfile, 'canManageUsers')).toBe(false);
    });

    it('should enforce permissions with withPermission middleware', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user666',
        email: 'viewer@test.com',
        name: 'Viewer',
      };

      const mockUserProfile = {
        $id: 'profile666',
        userId: 'user666',
        email: 'viewer@test.com',
        name: 'Viewer',
        roleId: 'viewerRole',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'viewerRole',
        name: 'Viewer',
        description: 'Read-only access',
        permissions: {
          canViewLogs: true,
          canManageUsers: false,
        },
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });
      mockTablesDB.getRow.mockResolvedValue(mockRole);

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        res.status(200).json({ success: true });
      });

      const wrappedHandler = withPermission('canManageUsers', handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(handler).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Forbidden',
        code: 403,
        type: 'insufficient_permissions',
        message: 'You do not have permission to perform this action. Required: canManageUsers',
      });
    });

    it('should allow access when user has required permission', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user555',
        email: 'admin@test.com',
        name: 'Admin',
      };

      const mockUserProfile = {
        $id: 'profile555',
        userId: 'user555',
        email: 'admin@test.com',
        name: 'Admin',
        roleId: 'adminRole',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'adminRole',
        name: 'Admin',
        description: 'Full access',
        permissions: {
          canViewLogs: true,
          canManageUsers: true,
        },
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });
      mockTablesDB.getRow.mockResolvedValue(mockRole);

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        res.status(200).json({ success: true });
      });

      const wrappedHandler = withPermission('canManageUsers', handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(handler).toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Requirement 5.2 (continued): Automatic retry support', () => {
    it('should provide tokenExpired flag to enable client-side retry', async () => {
      // This test verifies that the middleware provides the necessary information
      // for the client to detect token expiration and trigger an automatic retry
      mockAccount.get.mockRejectedValue({
        code: 401,
        type: 'user_jwt_invalid',
        message: 'JWT expired',
      });

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify the response includes tokenExpired flag
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenExpired: true,
          code: 401,
        })
      );

      // This flag allows the client to:
      // 1. Detect that the token expired (not other auth errors)
      // 2. Trigger token refresh
      // 3. Retry the original request with new token
    });

    it('should allow successful request after token refresh (simulated)', async () => {
      // Simulate the retry flow: first call fails, second succeeds after refresh
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user111',
        email: 'retry@test.com',
        name: 'Retry User',
      };

      const mockUserProfile = {
        $id: 'profile111',
        userId: 'user111',
        email: 'retry@test.com',
        name: 'Retry User',
        roleId: null,
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // First call: expired token
      mockAccount.get.mockRejectedValueOnce({
        code: 401,
        type: 'user_jwt_invalid',
        message: 'JWT expired',
      });

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        res.status(200).json({ success: true, userId: req.user.$id });
      });

      const wrappedHandler = withAuth(handler);
      
      // First attempt - should fail
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(handler).not.toHaveBeenCalled();

      // Reset mocks for second attempt
      vi.clearAllMocks();
      jsonSpy = vi.fn().mockReturnThis();
      statusSpy = vi.fn().mockReturnThis();
      mockRes.status = statusSpy;
      mockRes.json = jsonSpy;

      // Second call: valid token (after client refreshed)
      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      // Second attempt - should succeed
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(handler).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        userId: 'user111',
      });
    });
  });

  describe('Additional edge cases', () => {
    it('should handle missing JWT cookie', async () => {
      mockReq.cookies = {};

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(handler).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should handle database connection errors', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user444',
        email: 'test@test.com',
        name: 'Test',
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockRejectedValue(new Error('Database connection failed'));

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(handler).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(500);
    });

    it('should parse role permissions from JSON string', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user333',
        email: 'test@test.com',
        name: 'Test',
      };

      const mockUserProfile = {
        $id: 'profile333',
        userId: 'user333',
        email: 'test@test.com',
        name: 'Test',
        roleId: 'role333',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'role333',
        name: 'Test Role',
        description: 'Test',
        permissions: '{"canTest": true}', // JSON string
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });
      mockTablesDB.getRow.mockResolvedValue(mockRole);

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        res.status(200).json({ permissions: req.userProfile.role?.permissions });
      });

      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(jsonSpy).toHaveBeenCalledWith({
        permissions: { canTest: true },
      });
    });
  });
});
