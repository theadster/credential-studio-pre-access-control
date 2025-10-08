import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../index';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';

// Mock dependencies
vi.mock('@/lib/appwrite');
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handler: any) => handler,
  AuthenticatedRequest: {} as any,
}));
vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn((role: any, resource: string, action: string) => {
    if (!role) return false;
    const permissions = typeof role.permissions === 'string' 
      ? JSON.parse(role.permissions) 
      : role.permissions;
    return permissions?.[`${resource}.${action}`] === true;
  }),
}));

const mockCreateSessionClient = vi.mocked(createSessionClient);
const mockCreateAdminClient = vi.mocked(createAdminClient);

describe('User API - Backward Compatibility Tests', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let mockDatabases: any;
  let mockAdminUsers: any;
  let mockAdminTeams: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup request and response mocks
    req = {
      method: 'GET',
      headers: {},
      cookies: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };

    // Setup database mock
    mockDatabases = {
      listDocuments: vi.fn(),
      getDocument: vi.fn(),
      createDocument: vi.fn(),
      updateDocument: vi.fn(),
      deleteDocument: vi.fn(),
    };

    mockAdminUsers = {
      get: vi.fn(),
      delete: vi.fn(),
    };

    mockAdminTeams = {
      listMemberships: vi.fn(),
      deleteMembership: vi.fn(),
    };

    mockCreateSessionClient.mockReturnValue({
      databases: mockDatabases,
    } as any);

    mockCreateAdminClient.mockReturnValue({
      users: mockAdminUsers,
      teams: mockAdminTeams,
    } as any);

    // Mock auth middleware - attach user and userProfile
    (req as any).user = {
      $id: 'admin-user-id',
      email: 'admin@test.com',
      name: 'Admin User',
    };

    (req as any).userProfile = {
      $id: 'admin-profile-id',
      userId: 'admin-user-id',
      email: 'admin@test.com',
      name: 'Admin User',
      roleId: 'admin-role-id',
      role: {
        $id: 'admin-role-id',
        name: 'Super Administrator',
        permissions: {
          'users.read': true,
          'users.create': true,
          'users.update': true,
          'users.delete': true,
        },
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 6.1: Load existing user profiles correctly', () => {
    it('should load and display old user profiles with isInvited=true', async () => {
      const oldUserProfile = {
        $id: 'old-user-1',
        userId: 'auth-user-1',
        email: 'old@test.com',
        name: 'Old User',
        roleId: 'role-1',
        isInvited: true, // Legacy invited user
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'role-1',
        name: 'Event Manager',
        description: 'Manages events',
        permissions: JSON.stringify({ 'attendees.read': true }),
      };

      mockDatabases.listDocuments.mockResolvedValue({
        documents: [oldUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValue(mockRole);

      req.method = 'GET';

      await handler(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'old-user-1',
          userId: 'auth-user-1',
          email: 'old@test.com',
          name: 'Old User',
          roleId: 'role-1',
          isInvited: true, // Should preserve isInvited field
          role: expect.objectContaining({
            id: 'role-1',
            name: 'Event Manager',
          }),
        }),
      ]);
    });

    it('should load new user profiles with isInvited=false', async () => {
      const newUserProfile = {
        $id: 'new-user-1',
        userId: 'auth-user-2',
        email: 'new@test.com',
        name: 'New User',
        roleId: 'role-1',
        isInvited: false, // New linked user
        $createdAt: '2024-02-01T00:00:00.000Z',
        $updatedAt: '2024-02-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'role-1',
        name: 'Event Manager',
        description: 'Manages events',
        permissions: JSON.stringify({ 'attendees.read': true }),
      };

      mockDatabases.listDocuments.mockResolvedValue({
        documents: [newUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValue(mockRole);

      req.method = 'GET';

      await handler(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'new-user-1',
          isInvited: false,
        }),
      ]);
    });

    it('should load mixed old and new user profiles', async () => {
      const mixedProfiles = [
        {
          $id: 'old-user-1',
          userId: 'auth-user-1',
          email: 'old@test.com',
          name: 'Old User',
          roleId: 'role-1',
          isInvited: true,
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          $id: 'new-user-1',
          userId: 'auth-user-2',
          email: 'new@test.com',
          name: 'New User',
          roleId: 'role-1',
          isInvited: false,
          $createdAt: '2024-02-01T00:00:00.000Z',
          $updatedAt: '2024-02-01T00:00:00.000Z',
        },
      ];

      const mockRole = {
        $id: 'role-1',
        name: 'Event Manager',
        description: 'Manages events',
        permissions: JSON.stringify({ 'attendees.read': true }),
      };

      mockDatabases.listDocuments.mockResolvedValue({
        documents: mixedProfiles,
        total: 2,
      });

      mockDatabases.getDocument.mockResolvedValue(mockRole);

      req.method = 'GET';

      await handler(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as any).mock.calls[0][0];
      expect(response).toHaveLength(2);
      expect(response[0].isInvited).toBe(true);
      expect(response[1].isInvited).toBe(false);
    });
  });

  describe('Requirement 6.4: Edit existing user profiles', () => {
    it('should allow updating role for old user profiles', async () => {
      const oldUserProfile = {
        $id: 'old-user-1',
        userId: 'auth-user-1',
        email: 'old@test.com',
        name: 'Old User',
        roleId: 'role-2',
        isInvited: true,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-02-01T00:00:00.000Z',
      };

      const newRole = {
        $id: 'role-2',
        name: 'Viewer',
        description: 'Read-only access',
        permissions: JSON.stringify({ 'attendees.read': true }),
      };

      mockDatabases.getDocument.mockResolvedValue(newRole);
      mockDatabases.updateDocument.mockResolvedValue(oldUserProfile);
      mockDatabases.createDocument.mockResolvedValue({
        $id: 'log-1',
      });

      req.method = 'PUT';
      req.body = {
        id: 'old-user-1',
        name: 'Old User',
        roleId: 'role-2',
      };

      await handler(req as any, res as any);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        'old-user-1',
        expect.objectContaining({
          name: 'Old User',
          roleId: 'role-2',
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'old-user-1',
          isInvited: true,
        })
      );
    });

    it('should allow updating name for old user profiles', async () => {
      const oldUserProfile = {
        $id: 'old-user-1',
        userId: 'auth-user-1',
        email: 'old@test.com',
        name: 'Updated Name',
        roleId: 'role-1',
        isInvited: true,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-02-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'role-1',
        name: 'Event Manager',
        description: 'Manages events',
        permissions: JSON.stringify({ 'attendees.read': true }),
      };

      mockDatabases.getDocument.mockResolvedValue(mockRole);
      mockDatabases.updateDocument.mockResolvedValue(oldUserProfile);
      mockDatabases.createDocument.mockResolvedValue({
        $id: 'log-1',
      });

      req.method = 'PUT';
      req.body = {
        id: 'old-user-1',
        name: 'Updated Name',
        roleId: 'role-1',
      };

      await handler(req as any, res as any);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        'old-user-1',
        expect.objectContaining({
          name: 'Updated Name',
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Requirement 6.5: Display isInvited field correctly', () => {
    it('should preserve and return isInvited=true for old users', async () => {
      const oldUserProfile = {
        $id: 'old-user-1',
        userId: 'auth-user-1',
        email: 'old@test.com',
        name: 'Old User',
        roleId: 'role-1',
        isInvited: true,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'role-1',
        name: 'Event Manager',
        description: 'Manages events',
        permissions: JSON.stringify({ 'attendees.read': true }),
      };

      mockDatabases.listDocuments.mockResolvedValue({
        documents: [oldUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValue(mockRole);

      req.method = 'GET';

      await handler(req as any, res as any);

      const response = (res.json as any).mock.calls[0][0];
      expect(response[0]).toHaveProperty('isInvited', true);
    });

    it('should return isInvited=false for newly linked users', async () => {
      const newUserProfile = {
        $id: 'new-user-1',
        userId: 'auth-user-2',
        email: 'new@test.com',
        name: 'New User',
        roleId: 'role-1',
        isInvited: false,
        $createdAt: '2024-02-01T00:00:00.000Z',
        $updatedAt: '2024-02-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'role-1',
        name: 'Event Manager',
        description: 'Manages events',
        permissions: JSON.stringify({ 'attendees.read': true }),
      };

      mockDatabases.listDocuments.mockResolvedValue({
        documents: [newUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValue(mockRole);

      req.method = 'GET';

      await handler(req as any, res as any);

      const response = (res.json as any).mock.calls[0][0];
      expect(response[0]).toHaveProperty('isInvited', false);
    });
  });

  describe('Requirement 6.6: Delete old user profiles', () => {
    it('should support deleting old user profiles with deleteFromAuth=true', async () => {
      const oldUserProfile = {
        $id: 'old-user-1',
        userId: 'auth-user-1',
        email: 'old@test.com',
        name: 'Old User',
        roleId: 'role-1',
        isInvited: true,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDatabases.getDocument.mockResolvedValue(oldUserProfile);
      mockAdminUsers.delete.mockResolvedValue({});
      mockDatabases.deleteDocument.mockResolvedValue({});
      mockDatabases.createDocument.mockResolvedValue({
        $id: 'log-1',
      });

      req.method = 'DELETE';
      req.body = {
        id: 'old-user-1',
        deleteFromAuth: true,
      };

      await handler(req as any, res as any);

      expect(mockAdminUsers.delete).toHaveBeenCalledWith('auth-user-1');
      expect(mockDatabases.deleteDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        'old-user-1'
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedFromAuth: true,
          deletedFromDatabase: true,
        })
      );
    });

    it('should support deleting old user profiles with deleteFromAuth=false (unlink only)', async () => {
      const oldUserProfile = {
        $id: 'old-user-1',
        userId: 'auth-user-1',
        email: 'old@test.com',
        name: 'Old User',
        roleId: 'role-1',
        isInvited: true,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDatabases.getDocument.mockResolvedValue(oldUserProfile);
      mockDatabases.deleteDocument.mockResolvedValue({});
      mockDatabases.createDocument.mockResolvedValue({
        $id: 'log-1',
      });

      req.method = 'DELETE';
      req.body = {
        id: 'old-user-1',
        deleteFromAuth: false,
      };

      await handler(req as any, res as any);

      expect(mockAdminUsers.delete).not.toHaveBeenCalled();
      expect(mockDatabases.deleteDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        'old-user-1'
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedFromAuth: false,
          deletedFromDatabase: true,
          message: expect.stringContaining('unlinked from database'),
        })
      );
    });

    it('should handle auth deletion failure gracefully for old users', async () => {
      const oldUserProfile = {
        $id: 'old-user-1',
        userId: 'auth-user-1',
        email: 'old@test.com',
        name: 'Old User',
        roleId: 'role-1',
        isInvited: true,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDatabases.getDocument.mockResolvedValue(oldUserProfile);
      mockAdminUsers.delete.mockRejectedValue(new Error('Auth user not found'));
      mockDatabases.deleteDocument.mockResolvedValue({});
      mockDatabases.createDocument.mockResolvedValue({
        $id: 'log-1',
      });

      req.method = 'DELETE';
      req.body = {
        id: 'old-user-1',
        deleteFromAuth: true,
      };

      await handler(req as any, res as any);

      // Should still delete from database even if auth deletion fails
      expect(mockDatabases.deleteDocument).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedFromAuth: false,
          deletedFromDatabase: true,
          message: expect.stringContaining('database only'),
        })
      );
    });
  });

  describe('Requirement 6.2 & 6.3: Existing users can log in and profiles work', () => {
    it('should return complete user profile data for authentication', async () => {
      const userProfile = {
        $id: 'user-1',
        userId: 'auth-user-1',
        email: 'user@test.com',
        name: 'Test User',
        roleId: 'role-1',
        isInvited: true,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'role-1',
        name: 'Event Manager',
        description: 'Manages events',
        permissions: JSON.stringify({
          'attendees.read': true,
          'attendees.create': true,
        }),
      };

      mockDatabases.listDocuments.mockResolvedValue({
        documents: [userProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValue(mockRole);

      req.method = 'GET';

      await handler(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as any).mock.calls[0][0];
      
      // Verify all required fields are present
      expect(response[0]).toMatchObject({
        id: 'user-1',
        userId: 'auth-user-1',
        email: 'user@test.com',
        name: 'Test User',
        roleId: 'role-1',
        isInvited: true,
        role: {
          id: 'role-1',
          name: 'Event Manager',
          description: 'Manages events',
          permissions: {
            'attendees.read': true,
            'attendees.create': true,
          },
        },
      });
    });

    it('should handle users with null role gracefully', async () => {
      const userProfile = {
        $id: 'user-1',
        userId: 'auth-user-1',
        email: 'user@test.com',
        name: 'Test User',
        roleId: null,
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDatabases.listDocuments.mockResolvedValue({
        documents: [userProfile],
        total: 1,
      });

      req.method = 'GET';

      await handler(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as any).mock.calls[0][0];
      expect(response[0].role).toBeNull();
    });
  });
});
