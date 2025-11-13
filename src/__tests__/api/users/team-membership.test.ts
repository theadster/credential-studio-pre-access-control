import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../index';
import { mockAccount, mockDatabases, mockUsers, mockTeams, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
  createAdminClient: vi.fn(() => ({
    users: mockUsers,
    databases: mockDatabases,
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

describe('/api/users - Team Membership', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const mockAuthUser = {
    $id: 'auth-user-123',
    email: 'admin@example.com',
    name: 'Admin User',
  };

  const mockUserProfile = {
    $id: 'profile-123',
    userId: 'auth-user-123',
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
    }),
  };

  const mockViewerRole = {
    $id: 'role-viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: JSON.stringify({
      users: { read: true },
    }),
  };

  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'POST',
      cookies: { 'appwrite-session': 'test-session' },
      body: {
        authUserId: 'existing-auth-user-123',
        roleId: 'role-viewer',
      },
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockDatabases.listDocuments.mockResolvedValue({
      documents: [mockUserProfile],
      total: 1,
    });
    mockDatabases.getDocument.mockResolvedValue(mockAdminRole);
    mockDatabases.createDocument.mockResolvedValue({
      $id: 'new-log-123',
      userId: mockAuthUser.$id,
      action: 'create',
      details: '{}',
    });
  });

  afterEach(() => {
    // Restore original env vars
    process.env = { ...originalEnv };
  });

  describe('POST /api/users with team membership', () => {
    it('should create team membership when addToTeam is true and feature is enabled', async () => {
      // Enable team membership feature
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'test-team-123';

      mockReq.body = {
        authUserId: 'existing-auth-user-123',
        roleId: 'role-viewer',
        addToTeam: true,
      };

      const existingAuthUser = {
        $id: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
        emailVerification: true,
      };

      const newUserDoc = {
        $id: 'new-user-doc-123',
        userId: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      const mockMembership = {
        $id: 'membership-123',
        teamId: 'test-team-123',
        userId: 'existing-auth-user-123',
        roles: ['member'],
        invited: '2024-01-05T00:00:00.000Z',
        joined: '2024-01-05T00:00:00.000Z',
        confirm: true,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockViewerRole);

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockTeams.createMembership.mockResolvedValue(mockMembership);
      mockDatabases.createDocument
        .mockResolvedValueOnce(newUserDoc)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTeams.createMembership).toHaveBeenCalledWith({
        teamId: 'test-team-123',
        roles: ['member'],
        userId: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
      });

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          teamMembership: {
            status: 'success',
            teamId: 'test-team-123',
            membershipId: 'membership-123',
            roles: ['member'],
          },
        })
      );
    });

    it('should map Super Administrator role to owner team role', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'test-team-123';

      mockReq.body = {
        authUserId: 'existing-auth-user-123',
        roleId: 'role-admin',
        addToTeam: true,
      };

      const existingAuthUser = {
        $id: 'existing-auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      const newUserDoc = {
        $id: 'new-user-doc-123',
        userId: 'existing-auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
        roleId: 'role-admin',
        isInvited: false,
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAdminRole);

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockTeams.createMembership.mockResolvedValue({ $id: 'membership-123' });
      mockDatabases.createDocument
        .mockResolvedValueOnce(newUserDoc)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTeams.createMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['owner'],
        })
      );
    });

    it('should use custom teamRole if provided', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'test-team-123';

      mockReq.body = {
        authUserId: 'existing-auth-user-123',
        roleId: 'role-viewer',
        addToTeam: true,
        teamRole: 'custom-role',
      };

      const existingAuthUser = {
        $id: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
      };

      const newUserDoc = {
        $id: 'new-user-doc-123',
        userId: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockViewerRole);

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockTeams.createMembership.mockResolvedValue({ $id: 'membership-123' });
      mockDatabases.createDocument
        .mockResolvedValueOnce(newUserDoc)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTeams.createMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['custom-role'],
        })
      );
    });

    it('should handle team membership failure gracefully', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'test-team-123';

      mockReq.body = {
        authUserId: 'existing-auth-user-123',
        roleId: 'role-viewer',
        addToTeam: true,
      };

      const existingAuthUser = {
        $id: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
      };

      const newUserDoc = {
        $id: 'new-user-doc-123',
        userId: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockViewerRole);

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockTeams.createMembership.mockRejectedValue(new Error('Team membership failed'));
      mockDatabases.createDocument
        .mockResolvedValueOnce(newUserDoc)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should still create user profile
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          teamMembership: {
            status: 'failed',
            error: 'Team membership failed',
          },
        })
      );
    });

    it('should not create team membership when addToTeam is false', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'test-team-123';

      mockReq.body = {
        authUserId: 'existing-auth-user-123',
        roleId: 'role-viewer',
        addToTeam: false,
      };

      const existingAuthUser = {
        $id: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
      };

      const newUserDoc = {
        $id: 'new-user-doc-123',
        userId: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockViewerRole);

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockDatabases.createDocument
        .mockResolvedValueOnce(newUserDoc)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTeams.createMembership).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.not.objectContaining({
          teamMembership: expect.anything(),
        })
      );
    });

    it('should not create team membership when feature is disabled', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'false';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'test-team-123';

      mockReq.body = {
        authUserId: 'existing-auth-user-123',
        roleId: 'role-viewer',
        addToTeam: true,
      };

      const existingAuthUser = {
        $id: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
      };

      const newUserDoc = {
        $id: 'new-user-doc-123',
        userId: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockViewerRole);

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockDatabases.createDocument
        .mockResolvedValueOnce(newUserDoc)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTeams.createMembership).not.toHaveBeenCalled();
    });

    it('should fail gracefully when team ID is not configured', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;

      mockReq.body = {
        authUserId: 'existing-auth-user-123',
        roleId: 'role-viewer',
        addToTeam: true,
      };

      const existingAuthUser = {
        $id: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
      };

      const newUserDoc = {
        $id: 'new-user-doc-123',
        userId: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockViewerRole);

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockDatabases.createDocument
        .mockResolvedValueOnce(newUserDoc)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTeams.createMembership).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          teamMembership: {
            status: 'failed',
            error: 'Team ID not configured',
          },
        })
      );
    });
  });

  describe('DELETE /api/users with team membership removal', () => {
    beforeEach(() => {
      mockReq.method = 'DELETE';
      mockReq.body = {
        id: 'user-to-delete',
        deleteFromAuth: true,
        removeFromTeam: true,
      };
    });

    it('should remove team membership when removeFromTeam is true', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'test-team-123';

      const userToDelete = {
        $id: 'user-to-delete',
        userId: 'auth-user-to-delete',
        email: 'delete@example.com',
        name: 'User To Delete',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockMemberships = {
        memberships: [
          {
            $id: 'membership-123',
            teamId: 'test-team-123',
            userId: 'auth-user-to-delete',
          },
        ],
        total: 1,
      };

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(userToDelete);

      mockTeams.listMemberships.mockResolvedValue(mockMemberships);
      mockTeams.deleteMembership.mockResolvedValue({});
      mockUsers.delete.mockResolvedValue({ success: true });
      mockDatabases.deleteDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTeams.listMemberships).toHaveBeenCalledWith({
        teamId: 'test-team-123',
        queries: [expect.stringContaining('auth-user-to-delete')],
      });

      expect(mockTeams.deleteMembership).toHaveBeenCalledWith({
        teamId: 'test-team-123',
        membershipId: 'membership-123',
      });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          removedFromTeam: true,
        })
      );
    });

    it('should handle team membership removal failure gracefully', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'test-team-123';

      const userToDelete = {
        $id: 'user-to-delete',
        userId: 'auth-user-to-delete',
        email: 'delete@example.com',
        name: 'User To Delete',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(userToDelete);

      mockTeams.listMemberships.mockRejectedValue(new Error('Team not found'));
      mockUsers.delete.mockResolvedValue({ success: true });
      mockDatabases.deleteDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should still delete user
      expect(mockDatabases.deleteDocument).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          removedFromTeam: false,
        })
      );
    });

    it('should not remove team membership when removeFromTeam is false', async () => {
      mockReq.body.removeFromTeam = false;

      const userToDelete = {
        $id: 'user-to-delete',
        userId: 'auth-user-to-delete',
        email: 'delete@example.com',
        name: 'User To Delete',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(userToDelete);

      mockUsers.delete.mockResolvedValue({ success: true });
      mockDatabases.deleteDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTeams.listMemberships).not.toHaveBeenCalled();
      expect(mockTeams.deleteMembership).not.toHaveBeenCalled();
    });
  });
});
