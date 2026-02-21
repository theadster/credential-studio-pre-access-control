import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, withPermission, hasPermission, AuthenticatedRequest, UserProfile } from '../apiMiddleware';
import * as appwrite from '../appwrite';
import * as apiErrorHandler from '../apiErrorHandler';

// Mock dependencies
vi.mock('../appwrite');
vi.mock('../apiErrorHandler');
vi.mock('../userProfileCache', () => ({
  userProfileCache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    invalidate: vi.fn(),
  },
  CachedUserProfile: {},
}));

describe('apiMiddleware', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockAccount: any;
  let mockTablesDB: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock request and response
    mockReq = {
      method: 'GET',
      cookies: {
        'appwrite-session': 'mock-jwt-token'
      }
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };

    // Setup mock Appwrite clients
    mockAccount = {
      get: vi.fn()
    };

    mockTablesDB = {
      listRows: vi.fn(),
      getRow: vi.fn()
    };

    vi.mocked(appwrite.createSessionClient).mockReturnValue({
      client: {} as any,
      account: mockAccount,
      tablesDB: mockTablesDB,
      storage: {} as any,
      functions: {} as any
    });

    vi.mocked(appwrite.createAdminClient).mockReturnValue({
      tablesDB: mockTablesDB,
    } as any);
  });

  describe('withAuth', () => {
    it('should authenticate user and attach user and profile to request', async () => {
      // Mock successful authentication
      const mockUser = {
        $id: 'user123',
        email: '[email]',
        name: 'Test User'
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: '[email]',
        name: 'Test User',
        roleId: null,
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile]
      });

      // Create handler that checks authenticated request
      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        expect(req.user).toEqual(mockUser);
        expect(req.userProfile).toBeDefined();
        expect(req.userProfile.userId).toBe('user123');
        res.status(200).json({ success: true });
      });

      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockAccount.get).toHaveBeenCalled();
      expect(mockTablesDB.listRows).toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });

    it('should fetch and attach role information when user has a role', async () => {
      const mockUser = {
        $id: 'user123',
        email: '[email]',
        name: 'Test User'
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: '[email]',
        name: 'Test User',
        roleId: 'role123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockRole = {
        $id: 'role123',
        name: 'Admin',
        description: 'Administrator role',
        permissions: { canManageUsers: true, canViewLogs: true }
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile]
      });
      mockTablesDB.getRow.mockResolvedValue(mockRole);

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        expect(req.userProfile.role).toBeDefined();
        expect(req.userProfile.role?.name).toBe('Admin');
        expect(req.userProfile.role?.permissions.canManageUsers).toBe(true);
        res.status(200).json({ success: true });
      });

      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.getRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID,
        'role123'
      );
    });

    it('should parse role permissions if stored as string', async () => {
      const mockUser = {
        $id: 'user123',
        email: '[email]',
        name: 'Test User'
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: '[email]',
        name: 'Test User',
        roleId: 'role123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockRole = {
        $id: 'role123',
        name: 'Admin',
        description: 'Administrator role',
        permissions: '{"canManageUsers":true,"canViewLogs":true}'
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile]
      });
      mockTablesDB.getRow.mockResolvedValue(mockRole);

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        expect(req.userProfile.role?.permissions).toEqual({
          canManageUsers: true,
          canViewLogs: true
        });
        res.status(200).json({ success: true });
      });

      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    });

    it('should handle authentication failure with error handler', async () => {
      const authError = {
        code: 401,
        type: 'user_jwt_invalid',
        message: 'Invalid JWT token'
      };

      mockAccount.get.mockRejectedValue(authError);

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(apiErrorHandler.handleApiError).toHaveBeenCalledWith(
        authError,
        mockRes,
        { logError: true },
        {
          endpoint: 'unknown',
          method: 'GET',
          userId: 'unauthenticated',
        }
      );
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return 404 when user profile not found', async () => {
      const mockUser = {
        $id: 'user123',
        email: '[email]',
        name: 'Test User'
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: []
      });

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User profile not found',
        code: 404,
        type: 'profile_not_found',
        message: 'User profile does not exist in the database'
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should continue if role fetch fails', async () => {
      const mockUser = {
        $id: 'user123',
        email: '[email]',
        name: 'Test User'
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: '[email]',
        name: 'Test User',
        roleId: 'role123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile]
      });
      mockTablesDB.getRow.mockRejectedValue(new Error('Role not found'));

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        expect(req.userProfile.role).toBeNull();
        res.status(200).json({ success: true });
      });

      const wrappedHandler = withAuth(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle unexpected errors with error handler', async () => {
      const unexpectedError = new Error('Database connection failed');

      mockAccount.get.mockRejectedValue(unexpectedError);

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(apiErrorHandler.handleApiError).toHaveBeenCalledWith(
        unexpectedError,
        mockRes,
        expect.objectContaining({ logError: true }),
        expect.objectContaining({
          endpoint: 'unknown',
          method: 'GET',
        })
      );
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has the permission', () => {
      const userProfile: UserProfile = {
        id: 'profile123',
        userId: 'user123',
        email: '[email]',
        name: 'Test User',
        roleId: 'role123',
        isInvited: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        role: {
          id: 'role123',
          name: 'Admin',
          description: 'Administrator',
          permissions: {
            canManageUsers: true,
            canViewLogs: false
          }
        }
      };

      expect(hasPermission(userProfile, 'canManageUsers')).toBe(true);
    });

    it('should return false when user does not have the permission', () => {
      const userProfile: UserProfile = {
        id: 'profile123',
        userId: 'user123',
        email: '[email]',
        name: 'Test User',
        roleId: 'role123',
        isInvited: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        role: {
          id: 'role123',
          name: 'Admin',
          description: 'Administrator',
          permissions: {
            canManageUsers: true,
            canViewLogs: false
          }
        }
      };

      expect(hasPermission(userProfile, 'canViewLogs')).toBe(false);
    });

    it('should return false when user has no role', () => {
      const userProfile: UserProfile = {
        id: 'profile123',
        userId: 'user123',
        email: '[email]',
        name: 'Test User',
        roleId: null,
        isInvited: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        role: null
      };

      expect(hasPermission(userProfile, 'canManageUsers')).toBe(false);
    });

    it('should return false when permission does not exist', () => {
      const userProfile: UserProfile = {
        id: 'profile123',
        userId: 'user123',
        email: '[email]',
        name: 'Test User',
        roleId: 'role123',
        isInvited: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        role: {
          id: 'role123',
          name: 'Admin',
          description: 'Administrator',
          permissions: {
            canManageUsers: true
          }
        }
      };

      expect(hasPermission(userProfile, 'nonExistentPermission')).toBe(false);
    });
  });

  describe('withPermission', () => {
    it('should allow access when user has required permission', async () => {
      const mockUser = {
        $id: 'user123',
        email: '[email]',
        name: 'Test User'
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: '[email]',
        name: 'Test User',
        roleId: 'role123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockRole = {
        $id: 'role123',
        name: 'Admin',
        description: 'Administrator role',
        permissions: { canManageUsers: true }
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile]
      });
      mockTablesDB.getRow.mockResolvedValue(mockRole);

      const handler = vi.fn(async (req: AuthenticatedRequest, res: NextApiResponse) => {
        res.status(200).json({ success: true });
      });

      const wrappedHandler = withPermission('canManageUsers', handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(handler).toHaveBeenCalled();
    });

    it('should return 403 when user lacks required permission', async () => {
      const mockUser = {
        $id: 'user123',
        email: '[email]',
        name: 'Test User'
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: '[email]',
        name: 'Test User',
        roleId: 'role123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const mockRole = {
        $id: 'role123',
        name: 'Viewer',
        description: 'Viewer role',
        permissions: { canViewUsers: true }
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile]
      });
      mockTablesDB.getRow.mockResolvedValue(mockRole);

      const handler = vi.fn();
      const wrappedHandler = withPermission('canManageUsers', handler);
      
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        code: 403,
        type: 'insufficient_permissions',
        message: 'You do not have permission to perform this action. Required: canManageUsers'
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return 403 when user has no role', async () => {
      const mockUser = {
        $id: 'user123',
        email: '[email]',
        name: 'Test User'
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: '[email]',
        name: 'Test User',
        roleId: null,
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile]
      });

      const handler = vi.fn();
      const wrappedHandler = withPermission('canManageUsers', handler);
      
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
