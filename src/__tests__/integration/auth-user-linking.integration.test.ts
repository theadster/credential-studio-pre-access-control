import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import usersHandler from '@/pages/api/users/index';
import searchHandler from '@/pages/api/users/search';
import verifyEmailHandler from '@/pages/api/users/verify-email';
import { mockAccount, mockTablesDB, mockAdminTablesDB, mockUsers, mockTeams, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    tablesDB: mockTablesDB,
  })),
  createAdminClient: vi.fn(() => ({
    users: mockUsers,
    tablesDB: mockTablesDB,
    teams: mockTeams,
  })),
}));

// Mock the permissions module
vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn((role: any, resource: string, action: string) => {
    if (!role) return false;
    const permissions = typeof role.permissions === 'string' 
      ? JSON.parse(role.permissions) 
      : role.permissions;
    return permissions?.[resource]?.[action] === true;
  }),
}));

// Mock the logSettings module
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(true)),
}));

// Mock rate limiter
vi.mock('@/lib/rateLimiter', () => ({
  default: {
    check: vi.fn(() => ({
      allowed: true,
      remaining: 10,
      resetAt: Date.now() + 3600000,
    })),
  },
}));

describe('Auth User Linking System - Integration Tests', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const mockAuthUser = {
    $id: 'admin-auth-123',
    email: 'admin@example.com',
    name: 'Admin User',
  };

  const mockUserProfile = {
    $id: 'profile-123',
    userId: 'admin-auth-123',
    email: 'admin@example.com',
    name: 'Admin User',
    roleId: 'role-admin',
    isInvited: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockAdminRole = {
    $id: 'role-admin',
    name: 'Super Administrator',
    description: 'Full system access',
    permissions: JSON.stringify({
      users: { create: true, read: true, update: true, delete: true },
      attendees: { create: true, read: true, update: true, delete: true },
      roles: { create: true, read: true, update: true, delete: true },
    }),
  };

  const mockViewerRole = {
    $id: 'role-viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: JSON.stringify({
      users: { read: true },
      attendees: { read: true },
    }),
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'GET',
      cookies: { 'appwrite-session': 'test-session' },
      body: {},
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockTablesDB.listRows.mockResolvedValue({
      rows: [mockUserProfile],
      total: 1,
    });
    mockTablesDB.getRow.mockResolvedValue(mockAdminRole);
    mockAdminTablesDB.getRow.mockResolvedValue(mockAdminRole);
    mockTablesDB.createRow.mockResolvedValue({
      $id: 'new-log-123',
      userId: mockAuthUser.$id,
      action: 'view',
      details: '{}',
    });
  });

  describe('Complete User Linking Flow', () => {
    it('should complete full user linking workflow: search -> select -> link', async () => {
      // Step 1: Search for auth users
      const searchReq = {
        ...mockReq,
        method: 'POST',
        body: { q: 'john', page: 1, limit: 25 },
        userProfile: { ...mockUserProfile, role: mockAdminRole },
      };

      const existingAuthUser = {
        $id: 'auth-user-john-123',
        email: 'john@example.com',
        name: 'John Doe',
        $createdAt: '2024-01-15T00:00:00.000Z',
        emailVerification: true,
        phoneVerification: false,
      };

      mockUsers.list.mockResolvedValue({
        users: [existingAuthUser],
        total: 1,
      });

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // Current user
        .mockResolvedValueOnce({ rows: [], total: 0 }); // No linked users yet

      await searchHandler(searchReq as any, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          users: expect.arrayContaining([
            expect.objectContaining({
              $id: 'auth-user-john-123',
              email: 'john@example.com',
              isLinked: false,
            }),
          ]),
        })
      );

      // Step 2: Link the selected user
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      
      const linkReq = {
        ...mockReq,
        method: 'POST',
        body: {
          authUserId: 'auth-user-john-123',
          roleId: 'role-viewer',
        },
      };

      const newUserDoc = {
        $id: 'new-user-doc-123',
        userId: 'auth-user-john-123',
        email: 'john@example.com',
        name: 'John Doe',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-15T00:00:00.000Z',
        $updatedAt: '2024-01-15T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // Current user
        .mockResolvedValueOnce({ rows: [], total: 0 }); // Check not already linked

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Current user's role
        .mockResolvedValueOnce(mockViewerRole); // New user's role

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockTablesDB.createRow
        .mockResolvedValueOnce(newUserDoc) // Create user profile
        .mockResolvedValueOnce({ $id: 'log-123' }); // Create log

      await usersHandler(linkReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockUsers.get).toHaveBeenCalledWith('auth-user-john-123');
      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: 'auth-user-john-123',
          email: 'john@example.com',
          name: 'John Doe',
          roleId: 'role-viewer',
          isInvited: false,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@example.com',
          userId: 'auth-user-john-123',
        })
      );
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.userProfile = { ...mockUserProfile, role: mockAdminRole } as any;
      
      // Setup default mocks for search tests
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // Current user
        .mockResolvedValueOnce({ rows: [], total: 0 }); // Linked users check
    });

    it('should search by email and return matching users', async () => {
      mockReq.body = { q: 'test@example.com', page: 1, limit: 25 };

      const matchingUser = {
        $id: 'auth-user-test',
        email: 'test@example.com',
        name: 'Test User',
        $createdAt: '2024-01-10T00:00:00.000Z',
        emailVerification: true,
        phoneVerification: false,
      };

      mockUsers.list.mockResolvedValue({
        users: [matchingUser],
        total: 1,
      });

      await searchHandler(mockReq as any, mockRes as NextApiResponse);

      expect(mockUsers.list).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          users: expect.arrayContaining([
            expect.objectContaining({
              email: 'test@example.com',
              isLinked: false,
            }),
          ]),
        })
      );
    });

    it('should search by name and return matching users', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockReq.body = { q: 'Jane', page: 1, limit: 25 };
      mockReq.userProfile = { ...mockUserProfile, role: mockAdminRole } as any;

      const matchingUser = {
        $id: 'auth-user-jane',
        email: 'jane@example.com',
        name: 'Jane Smith',
        $createdAt: '2024-01-12T00:00:00.000Z',
        emailVerification: false,
        phoneVerification: false,
      };

      mockUsers.list.mockResolvedValue({
        users: [matchingUser],
        total: 1,
      });

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      await searchHandler(mockReq as any, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          users: expect.arrayContaining([
            expect.objectContaining({
              name: 'Jane Smith',
              emailVerification: false,
            }),
          ]),
        })
      );
    });

    it('should mark already linked users correctly', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockReq.body = { q: '', page: 1, limit: 25 };
      mockReq.userProfile = { ...mockUserProfile, role: mockAdminRole } as any;

      const users = [
        {
          $id: 'auth-user-1',
          email: 'user1@example.com',
          name: 'User One',
          $createdAt: '2024-01-01T00:00:00.000Z',
          emailVerification: true,
          phoneVerification: false,
        },
        {
          $id: 'auth-user-2',
          email: 'user2@example.com',
          name: 'User Two',
          $createdAt: '2024-01-02T00:00:00.000Z',
          emailVerification: true,
          phoneVerification: false,
        },
      ];

      mockUsers.list.mockResolvedValue({
        users,
        total: 2,
      });

      // Mock the database calls:
      // 1. First call is for middleware to get current user profile
      // 2. Second call is for getting linked users in search handler
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // Middleware: current user profile
        .mockResolvedValueOnce({ rows: [{ userId: 'auth-user-2' }], total: 1 }); // Search: linked users

      await searchHandler(mockReq as any, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      
      const user1 = response.users.find((u: any) => u.$id === 'auth-user-1');
      const user2 = response.users.find((u: any) => u.$id === 'auth-user-2');
      
      expect(user1).toBeDefined();
      expect(user2).toBeDefined();
      expect(user1.isLinked).toBe(false);
      expect(user2.isLinked).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockReq.body = { q: '', page: 2, limit: 10 };
      mockReq.userProfile = { ...mockUserProfile, role: mockAdminRole } as any;

      const users = Array.from({ length: 10 }, (_, i) => ({
        $id: `auth-user-${i + 11}`,
        email: `user${i + 11}@example.com`,
        name: `User ${i + 11}`,
        $createdAt: '2024-01-01T00:00:00.000Z',
        emailVerification: true,
        phoneVerification: false,
      }));

      mockUsers.list.mockResolvedValue({
        users,
        total: 50,
      });

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      await searchHandler(mockReq as any, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: {
            page: 2,
            limit: 10,
            total: 50,
            totalPages: 5,
          },
        })
      );
    });

    it('should return empty results when no users match', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockReq.body = { q: 'nonexistent@example.com', page: 1, limit: 25 };
      mockReq.userProfile = { ...mockUserProfile, role: mockAdminRole } as any;

      mockUsers.list.mockResolvedValue({
        users: [],
        total: 0,
      });

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      await searchHandler(mockReq as any, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          users: [],
          pagination: expect.objectContaining({
            total: 0,
          }),
        })
      );
    });
  });

  describe('Email Verification', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.user = mockAuthUser as any;
      mockReq.userProfile = { ...mockUserProfile, role: mockAdminRole } as any;
    });

    it('should send verification email to unverified user', async () => {
      const unverifiedUser = {
        $id: 'auth-user-unverified',
        email: 'unverified@example.com',
        name: 'Unverified User',
        emailVerification: false,
        phoneVerification: false,
        $createdAt: '2024-01-10T00:00:00.000Z',
      };

      mockReq.body = { authUserId: 'auth-user-unverified' };

      mockUsers.get.mockResolvedValue(unverifiedUser);
      mockUsers.updateEmailVerification = vi.fn().mockResolvedValue({
        ...unverifiedUser,
        emailVerification: true,
      });

      mockTablesDB.createRow.mockResolvedValue({
        $id: 'log-123',
        userId: mockAuthUser.$id,
        action: 'verification_email_sent',
        details: '{}',
      });

      await verifyEmailHandler(mockReq as any, mockRes as NextApiResponse);

      expect(mockUsers.get).toHaveBeenCalledWith('auth-user-unverified');
      expect(mockUsers.updateEmailVerification).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Verification email sent successfully',
          userId: 'auth-user-unverified',
        })
      );
    });

    it('should reject verification for already verified user', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      
      const verifiedUser = {
        $id: 'auth-user-verified',
        email: 'verified@example.com',
        name: 'Verified User',
        emailVerification: true,
        phoneVerification: false,
        $createdAt: '2024-01-10T00:00:00.000Z',
      };

      mockReq.body = { authUserId: 'auth-user-verified' };
      mockReq.user = mockAuthUser as any;
      mockReq.userProfile = { ...mockUserProfile, role: mockAdminRole } as any;

      // Mock middleware database call for user profile
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockUsers.get.mockResolvedValue(verifiedUser);

      await verifyEmailHandler(mockReq as any, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Email is already verified',
          code: 'EMAIL_ALREADY_VERIFIED',
        })
      );
    });

    it('should log verification email send action', async () => {
      const unverifiedUser = {
        $id: 'auth-user-unverified',
        email: 'unverified@example.com',
        name: 'Unverified User',
        emailVerification: false,
        phoneVerification: false,
        $createdAt: '2024-01-10T00:00:00.000Z',
      };

      mockReq.body = { authUserId: 'auth-user-unverified' };

      mockUsers.get.mockResolvedValue(unverifiedUser);
      mockUsers.updateEmailVerification = vi.fn().mockResolvedValue({
        ...unverifiedUser,
        emailVerification: true,
      });

      await verifyEmailHandler(mockReq as any, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'verification_email_sent',
          details: expect.stringContaining('auth-user-unverified'),
        })
      );
    });
  });

  describe('Team Membership Creation', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'team-123';
    });

    it('should create team membership when addToTeam is true', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      
      const existingAuthUser = {
        $id: 'auth-user-team-test',
        email: 'teamuser@example.com',
        name: 'Team User',
        emailVerification: true,
      };

      mockReq.body = {
        authUserId: 'auth-user-team-test',
        roleId: 'role-viewer',
        addToTeam: true,
      };

      const newUserDoc = {
        $id: 'new-user-doc-123',
        userId: 'auth-user-team-test',
        email: 'teamuser@example.com',
        name: 'Team User',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-15T00:00:00.000Z',
        $updatedAt: '2024-01-15T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockViewerRole);

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockTablesDB.createRow
        .mockResolvedValueOnce(newUserDoc)
        .mockResolvedValueOnce({ $id: 'log-123' })
        .mockResolvedValueOnce({ $id: 'team-log-123' }); // Team membership log

      mockTeams.createMembership.mockResolvedValue({
        $id: 'membership-123',
        teamId: 'team-123',
        userId: 'auth-user-team-test',
        roles: ['member'],
      });

      await usersHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTeams.createMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 'team-123',
          roles: ['member'],
          userId: 'auth-user-team-test',
          email: 'teamuser@example.com',
          name: 'Team User',
        })
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'teamuser@example.com',
          teamMembership: expect.objectContaining({
            status: 'success',
          }),
        })
      );
    });

    it('should handle team membership failure gracefully', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      
      const existingAuthUser = {
        $id: 'auth-user-team-fail',
        email: 'teamfail@example.com',
        name: 'Team Fail User',
        emailVerification: true,
      };

      mockReq.body = {
        authUserId: 'auth-user-team-fail',
        roleId: 'role-viewer',
        addToTeam: true,
      };

      const newUserDoc = {
        $id: 'new-user-doc-456',
        userId: 'auth-user-team-fail',
        email: 'teamfail@example.com',
        name: 'Team Fail User',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-15T00:00:00.000Z',
        $updatedAt: '2024-01-15T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockViewerRole);

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockTablesDB.createRow
        .mockResolvedValueOnce(newUserDoc)
        .mockResolvedValueOnce({ $id: 'log-123' });

      mockTeams.createMembership.mockRejectedValue(new Error('Team API error'));

      await usersHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should still succeed with user linking
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'teamfail@example.com',
          teamMembership: expect.objectContaining({
            status: 'failed',
            error: expect.any(String),
          }),
        })
      );
    });

    it('should not create team membership when addToTeam is false', async () => {
      const existingAuthUser = {
        $id: 'auth-user-no-team',
        email: 'noteam@example.com',
        name: 'No Team User',
        emailVerification: true,
      };

      mockReq.body = {
        authUserId: 'auth-user-no-team',
        roleId: 'role-viewer',
        addToTeam: false,
      };

      const newUserDoc = {
        $id: 'new-user-doc-789',
        userId: 'auth-user-no-team',
        email: 'noteam@example.com',
        name: 'No Team User',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-15T00:00:00.000Z',
        $updatedAt: '2024-01-15T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockViewerRole);

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockTablesDB.createRow
        .mockResolvedValueOnce(newUserDoc)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await usersHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTeams.createMembership).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('Error Scenarios', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
    });

    it('should prevent linking already linked user', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      
      const existingAuthUser = {
        $id: 'auth-user-already-linked',
        email: 'linked@example.com',
        name: 'Already Linked User',
        emailVerification: true,
      };

      mockReq.body = {
        authUserId: 'auth-user-already-linked',
        roleId: 'role-viewer',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ 
          rows: [{ userId: 'auth-user-already-linked' }], 
          total: 1 
        });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockUsers.get.mockResolvedValue(existingAuthUser);

      await usersHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'This user is already linked to the application',
        code: 'USER_ALREADY_LINKED',
      });
    });

    it('should reject invalid auth user ID', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      
      mockReq.body = {
        authUserId: 'invalid-auth-user',
        roleId: 'role-viewer',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockUsers.get.mockRejectedValue(new Error('User not found'));

      await usersHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid auth user ID',
        code: 'INVALID_AUTH_USER',
      });
    });

    it('should reject invalid role ID', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      
      const existingAuthUser = {
        $id: 'auth-user-valid',
        email: 'valid@example.com',
        name: 'Valid User',
        emailVerification: true,
      };

      mockReq.body = {
        authUserId: 'auth-user-valid',
        roleId: 'invalid-role',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockRejectedValueOnce(new Error('Role not found'));

      mockUsers.get.mockResolvedValue(existingAuthUser);

      await usersHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid role ID',
          code: 'INVALID_ROLE',
        })
      );
    });

    it('should handle missing authUserId', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      
      mockReq.body = {
        roleId: 'role-viewer',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await usersHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Auth user ID is required'),
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should handle missing roleId', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      
      mockReq.body = {
        authUserId: 'auth-user-123',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await usersHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Role ID is required'),
          code: 'VALIDATION_ERROR',
        })
      );
    });
  });

  describe('Permission Checks', () => {
    const noPermRole = {
      $id: 'role-no-perm',
      name: 'No Permission Role',
      description: 'No permissions',
      permissions: JSON.stringify({
        users: { create: false, read: false, update: false, delete: false },
      }),
    };

    it('should reject search without users.read permission', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      
      mockReq.method = 'POST';
      mockReq.body = { q: 'test', page: 1, limit: 25 };
      
      // Create a user profile with no-permission role
      const noPermUserProfile = {
        ...mockUserProfile,
        roleId: 'role-no-perm',
      };
      
      mockReq.userProfile = { 
        ...noPermUserProfile, 
        role: {
          id: noPermRole.$id,
          name: noPermRole.name,
          description: noPermRole.description,
          permissions: JSON.parse(noPermRole.permissions)
        }
      } as any;

      // Mock middleware database call
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [noPermUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(noPermRole);

      await searchHandler(mockReq as any, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to search users',
        code: 'PERMISSION_DENIED',
      });
    });

    it('should reject user linking without users.create permission', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      
      mockReq.method = 'POST';
      mockReq.body = {
        authUserId: 'auth-user-123',
        roleId: 'role-viewer',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(noPermRole);

      await usersHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions to create users',
          code: 'PERMISSION_DENIED',
        })
      );
    });

    it('should reject verification email without users.create permission', async () => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      
      mockReq.method = 'POST';
      mockReq.body = { authUserId: 'auth-user-123' };
      mockReq.user = mockAuthUser as any;
      
      // Create a user profile with no-permission role
      const noPermUserProfile = {
        ...mockUserProfile,
        roleId: 'role-no-perm',
      };
      
      mockReq.userProfile = { 
        ...noPermUserProfile, 
        role: {
          id: noPermRole.$id,
          name: noPermRole.name,
          description: noPermRole.description,
          permissions: JSON.parse(noPermRole.permissions)
        }
      } as any;

      // Mock middleware database call
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [noPermUserProfile], total: 1 });

      const unverifiedUser = {
        $id: 'auth-user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerification: false,
        phoneVerification: false,
        $createdAt: '2024-01-10T00:00:00.000Z',
      };

      mockUsers.get.mockResolvedValue(unverifiedUser);

      await verifyEmailHandler(mockReq as any, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'PERMISSION_DENIED',
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockReq.method = 'POST';
      mockReq.user = mockAuthUser as any;
      mockReq.userProfile = { ...mockUserProfile, role: mockAdminRole } as any;
    });

    it('should enforce rate limit on verification emails', async () => {
      const unverifiedUser = {
        $id: 'auth-user-rate-limit',
        email: 'ratelimit@example.com',
        name: 'Rate Limit User',
        emailVerification: false,
        phoneVerification: false,
        $createdAt: '2024-01-10T00:00:00.000Z',
      };

      mockReq.body = { authUserId: 'auth-user-rate-limit' };

      mockUsers.get.mockResolvedValue(unverifiedUser);

      // Mock rate limiter to return not allowed
      const rateLimiter = await import('@/lib/rateLimiter');
      vi.mocked(rateLimiter.default.check).mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 1800000,
      });

      await verifyEmailHandler(mockReq as any, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VERIFICATION_RATE_LIMIT',
        })
      );
    });
  });

  describe('Logging and Audit Trail', () => {
    beforeEach(() => {
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockReq.method = 'POST';
    });

    it('should log user linking action', async () => {
      const existingAuthUser = {
        $id: 'auth-user-log-test',
        email: 'logtest@example.com',
        name: 'Log Test User',
        emailVerification: true,
      };

      mockReq.body = {
        authUserId: 'auth-user-log-test',
        roleId: 'role-viewer',
      };

      const newUserDoc = {
        $id: 'new-user-doc-log',
        userId: 'auth-user-log-test',
        email: 'logtest@example.com',
        name: 'Log Test User',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-15T00:00:00.000Z',
        $updatedAt: '2024-01-15T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockViewerRole);

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockTablesDB.createRow
        .mockResolvedValueOnce(newUserDoc)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await usersHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify that createRow was called for logging
      // The second call should be the log entry
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(2);
      
      const logCall = mockTablesDB.createRow.mock.calls[1];
      expect(logCall[0]).toBe(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID);
      expect(logCall[1]).toBe(process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID);
      expect(logCall[3]).toEqual(
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'user_linked',
          details: expect.stringContaining('user_linking'),
        })
      );
    });
  });
});
