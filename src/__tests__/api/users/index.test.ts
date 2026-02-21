import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/users/index';
import { mockAccount, mockTablesDB, mockAdminTablesDB, mockUsers, mockTeams, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    tablesDB: mockTablesDB,
  })),
  createAdminClient: vi.fn(() => ({
    users: mockUsers,
    tablesDB: mockAdminTablesDB,
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


describe('/api/users - User Management API', () => {
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

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAccount.get.mockRejectedValue(new Error('Unauthorized'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          code: 401,
          tokenExpired: true,
        })
      );
    });

    it('should return 404 if user profile is not found', async () => {
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'User profile not found',
          code: 404,
          type: 'profile_not_found',
        })
      );
    });
  });

  describe('GET /api/users', () => {
    it('should return list of users with roles for authorized user', async () => {
      const mockUsers = [
        {
          $id: 'user-1',
          userId: 'auth-user-1',
          email: 'user1@example.com',
          name: 'User One',
          roleId: 'role-admin',
          isInvited: false,
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          $id: 'user-2',
          userId: 'auth-user-2',
          email: 'user2@example.com',
          name: 'User Two',
          roleId: 'role-viewer',
          isInvited: true,
          $createdAt: '2024-01-02T00:00:00.000Z',
          $updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile lookup
        .mockResolvedValueOnce({ rows: mockUsers, total: 2 }); // Users list

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Current user's role
        .mockResolvedValueOnce(mockAdminRole) // User 1's role
        .mockResolvedValueOnce(mockViewerRole); // User 2's role

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'user-1',
            email: 'user1@example.com',
            role: expect.objectContaining({ name: 'Super Administrator' }),
          }),
          expect.objectContaining({
            id: 'user-2',
            email: 'user2@example.com',
            role: expect.objectContaining({ name: 'Viewer' }),
          }),
        ])
      );
    });

    it('should return 403 if user does not have read permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ users: { read: false } }),
      };

      mockTablesDB.getRow.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to view users',
      });
    });

    it('should handle users without roles gracefully', async () => {
      const userWithoutRole = {
        $id: 'user-3',
        userId: 'auth-user-3',
        email: 'user3@example.com',
        name: 'User Three',
        roleId: null,
        isInvited: false,
        $createdAt: '2024-01-03T00:00:00.000Z',
        $updatedAt: '2024-01-03T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [userWithoutRole], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'user-3',
          email: 'user3@example.com',
          role: null,
        }),
      ]);
    });

    it('should create log entry for viewing users list', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'view',
          details: expect.stringContaining('users_list'),
        })
      );
    });
  });

  describe('POST /api/users', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.body = {
        authUserId: 'existing-auth-user-123',
        roleId: 'role-viewer',
      };
    });

    it('should link an existing auth user successfully', async () => {
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

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // Current user lookup
        .mockResolvedValueOnce({ rows: [], total: 0 }); // Check if user already linked

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Current user's role
        .mockResolvedValueOnce(mockViewerRole); // New user's role

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockTablesDB.createRow
        .mockResolvedValueOnce(newUserDoc) // Create user profile
        .mockResolvedValueOnce({ $id: 'log-123' }); // Create log

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockUsers.get).toHaveBeenCalledWith('existing-auth-user-123');

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: 'existing-auth-user-123',
          email: 'newuser@example.com',
          name: 'New User',
          roleId: 'role-viewer',
          isInvited: false,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          name: 'New User',
          userId: 'existing-auth-user-123',
          isInvited: false,
        })
      );
      
      // Should NOT have temporary password or invitation sent
      expect(jsonMock).not.toHaveBeenCalledWith(
        expect.objectContaining({
          temporaryPassword: expect.any(String),
        })
      );
    });

    it('should return 403 if user does not have create permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ users: { create: false, read: true } }),
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions to create users',
          code: 'PERMISSION_DENIED',
        })
      );
    });

    it('should return 400 if authUserId is missing', async () => {
      mockReq.body = { roleId: 'role-viewer' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Auth user ID is required'),
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should return 400 if roleId is missing', async () => {
      mockReq.body = { authUserId: 'existing-auth-user-123' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Role ID is required'),
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should return 400 if authUserId is invalid', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      mockUsers.get.mockRejectedValue(new Error('User not found'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid auth user ID',
        code: 'INVALID_AUTH_USER',
      });
    });

    it('should return 409 if user is already linked', async () => {
      const existingAuthUser = {
        $id: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [{ userId: 'existing-auth-user-123' }], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockUsers.get.mockResolvedValue(existingAuthUser);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'This user is already linked to the application',
        code: 'USER_ALREADY_LINKED',
      });
    });

    it('should return 400 if roleId is invalid', async () => {
      const existingAuthUser = {
        $id: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockRejectedValueOnce(new Error('Role not found'));

      mockUsers.get.mockResolvedValue(existingAuthUser);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid role ID',
          code: 'INVALID_ROLE',
        })
      );
    });

    it('should create log entry for user linking', async () => {
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

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'user_linked',
          details: expect.stringContaining('user_linking'),
        })
      );
    });
  });

  describe('PUT /api/users', () => {
    beforeEach(() => {
      mockReq.method = 'PUT';
      mockReq.body = {
        id: 'user-to-update',
        name: 'Updated Name',
        roleId: 'role-viewer',
      };
    });

    it('should update user successfully', async () => {
      const updatedUserDoc = {
        $id: 'user-to-update',
        userId: 'auth-user-456',
        email: 'user@example.com',
        name: 'Updated Name',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-06T00:00:00.000Z',
      };

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Current user's role
        .mockResolvedValueOnce(mockViewerRole); // Updated user's role

      mockTablesDB.updateRow.mockResolvedValue(updatedUserDoc);
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID,
        'user-to-update',
        expect.objectContaining({
          name: 'Updated Name',
          roleId: 'role-viewer',
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-to-update',
          name: 'Updated Name',
          roleId: 'role-viewer',
        })
      );
    });

    it('should return 403 if user does not have update permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ users: { update: false, read: true } }),
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to update users',
      });
    });

    it('should return 400 if user ID is missing', async () => {
      mockReq.body = { name: 'Updated Name' };

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User ID is required' });
    });

    it('should return 400 if roleId is invalid', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockRejectedValueOnce(new Error('Role not found'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid role ID' });
    });

    it('should update only name if roleId is not provided', async () => {
      mockReq.body = {
        id: 'user-to-update',
        name: 'Updated Name Only',
      };

      const updatedUserDoc = {
        $id: 'user-to-update',
        userId: 'auth-user-456',
        email: 'user@example.com',
        name: 'Updated Name Only',
        roleId: null,
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-06T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockTablesDB.updateRow.mockResolvedValue(updatedUserDoc);
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID,
        'user-to-update',
        expect.objectContaining({
          name: 'Updated Name Only',
        })
      );
    });

    it('should create log entry for user update', async () => {
      const updatedUserDoc = {
        $id: 'user-to-update',
        userId: 'auth-user-456',
        email: 'user@example.com',
        name: 'Updated Name',
        roleId: 'role-viewer',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-06T00:00:00.000Z',
      };

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockViewerRole);

      mockTablesDB.updateRow.mockResolvedValue(updatedUserDoc);
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'user_updated',
          details: expect.stringContaining('user'),
        })
      );
    });
  });

  describe('DELETE /api/users', () => {
    beforeEach(() => {
      mockReq.method = 'DELETE';
      mockReq.body = {
        id: 'user-to-delete',
        deleteFromAuth: true,
      };
    });

    it('should delete user from both database and auth', async () => {
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

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Current user's role
        .mockResolvedValueOnce(userToDelete); // User to delete

      mockUsers.delete.mockResolvedValue({ success: true });
      mockTablesDB.deleteRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockUsers.delete).toHaveBeenCalledWith('auth-user-to-delete');
      expect(mockTablesDB.deleteRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID,
        'user-to-delete'
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User deleted successfully from both database and authentication',
          deletedFromAuth: true,
          deletedFromDatabase: true,
        })
      );
    });

    it('should return 403 if user does not have delete permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ users: { delete: false, read: true } }),
      };

      mockTablesDB.getRow.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to delete users',
      });
    });

    it('should return 400 if user ID is missing', async () => {
      mockReq.body = { deleteFromAuth: true };

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User ID is required' });
    });

    it('should return 404 if user to delete is not found', async () => {
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockRejectedValueOnce(new Error('User not found'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 400 if trying to delete own account', async () => {
      const userToDelete = {
        $id: 'user-to-delete',
        userId: mockAuthUser.$id, // Same as current user
        email: 'admin@example.com',
        name: 'Admin User',
        roleId: 'role-admin',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(userToDelete);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Cannot delete your own account',
      });
    });

    it('should delete from database only if deleteFromAuth is false', async () => {
      mockReq.body.deleteFromAuth = false;

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

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(userToDelete);

      mockTablesDB.deleteRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockUsers.delete).not.toHaveBeenCalled();
      expect(mockTablesDB.deleteRow).toHaveBeenCalled();

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User unlinked from database (authentication account preserved)',
          deletedFromAuth: false,
          deletedFromDatabase: true,
        })
      );
    });

    it('should continue with database deletion if auth deletion fails', async () => {
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

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(userToDelete);

      mockUsers.delete.mockRejectedValue(new Error('Auth user not found'));
      mockTablesDB.deleteRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.deleteRow).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User deleted from database only (authentication deletion failed)',
          deletedFromAuth: false,
          deletedFromDatabase: true,
        })
      );
    });

    it('should create log entry for user deletion', async () => {
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

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(userToDelete);

      mockUsers.delete.mockResolvedValue({ success: true });
      mockTablesDB.deleteRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'delete',
          details: expect.stringContaining('user'),
        })
      );
    });

    it('should remove team membership when removeFromTeam is true', async () => {
      try {
        // Set environment variables for team membership
        process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
        process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'test-team-123';

        mockReq.body = {
          id: 'user-to-delete',
          deleteFromAuth: true,
          removeFromTeam: true,
        };

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

        const mockMembership = {
          $id: 'membership-123',
          userId: 'auth-user-to-delete',
          teamId: 'test-team-123',
          roles: ['member'],
        };

        mockTablesDB.getRow
          .mockResolvedValueOnce(mockAdminRole)
          .mockResolvedValueOnce(userToDelete);

        mockTeams.listMemberships.mockResolvedValue({
          memberships: [mockMembership],
          total: 1,
        });
        mockTeams.deleteMembership.mockResolvedValue({ success: true });
        mockUsers.delete.mockResolvedValue({ success: true });
        mockTablesDB.deleteRow.mockResolvedValue({ success: true });
        mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(mockTeams.listMemberships).toHaveBeenCalledWith({
          teamId: 'test-team-123',
          queries: expect.any(Array),
        });
        expect(mockTeams.deleteMembership).toHaveBeenCalledWith({
          teamId: 'test-team-123',
          membershipId: 'membership-123',
        });

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            deletedFromAuth: true,
            deletedFromDatabase: true,
            removedFromTeam: true,
          })
        );
      } finally {
        // Clean up
        delete process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED;
        delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;
      }
    });

    it('should continue deletion if team membership removal fails', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'test-team-123';

      mockReq.body = {
        id: 'user-to-delete',
        deleteFromAuth: true,
        removeFromTeam: true,
      };

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

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(userToDelete);

      mockTeams.listMemberships.mockRejectedValue(new Error('Team API error'));
      mockUsers.delete.mockResolvedValue({ success: true });
      mockTablesDB.deleteRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should still delete user even if team removal fails
      expect(mockUsers.delete).toHaveBeenCalled();
      expect(mockTablesDB.deleteRow).toHaveBeenCalled();

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedFromAuth: true,
          deletedFromDatabase: true,
          removedFromTeam: false,
        })
      );

      // Clean up
      delete process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED;
      delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;
    });

    it('should not attempt team removal if removeFromTeam is false', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'test-team-123';

      mockReq.body = {
        id: 'user-to-delete',
        deleteFromAuth: true,
        removeFromTeam: false,
      };

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

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(userToDelete);

      mockUsers.delete.mockResolvedValue({ success: true });
      mockTablesDB.deleteRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTeams.listMemberships).not.toHaveBeenCalled();
      expect(mockTeams.deleteMembership).not.toHaveBeenCalled();

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedFromAuth: true,
          deletedFromDatabase: true,
          removedFromTeam: false,
        })
      );

      // Clean up
      delete process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED;
      delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;
    });

    it('should log deletion details including team removal status', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'test-team-123';

      mockReq.body = {
        id: 'user-to-delete',
        deleteFromAuth: true,
        removeFromTeam: true,
      };

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

      const mockMembership = {
        $id: 'membership-123',
        userId: 'auth-user-to-delete',
        teamId: 'test-team-123',
        roles: ['member'],
      };

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(userToDelete);

      mockTeams.listMemberships.mockResolvedValue({
        memberships: [mockMembership],
        total: 1,
      });
      mockTeams.deleteMembership.mockResolvedValue({ success: true });
      mockUsers.delete.mockResolvedValue({ success: true });
      mockTablesDB.deleteRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'delete',
          details: expect.stringContaining('deletedFromAuth'),
        })
      );

      // Parse the details to verify all fields are present
      const logCall = mockTablesDB.createRow.mock.calls.find(
        call => call[2] && call[3]?.action === 'delete'
      );
      const details = JSON.parse(logCall![3].details);
      
      expect(details).toMatchObject({
        type: 'user',
        email: 'delete@example.com',
        name: 'User To Delete',
        deletedFromAuth: true,
        deleteFromAuthRequested: true,
        removedFromTeam: true,
        removeFromTeamRequested: true,
      });

      // Clean up
      delete process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED;
      delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;
    });
  });

  describe('Unsupported Methods', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'PATCH';

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Method PATCH not allowed',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (dbError as any).code = 500;
      mockTablesDB.listRows.mockRejectedValue(dbError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database connection failed',
          code: 500,
          type: 'internal_error',
        })
      );
    });

    it('should handle unexpected errors during user linking', async () => {
      mockReq.method = 'POST';
      mockReq.body = {
        authUserId: 'existing-auth-user-123',
        roleId: 'role-viewer',
      };

      const existingAuthUser = {
        $id: 'existing-auth-user-123',
        email: 'newuser@example.com',
        name: 'New User',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockViewerRole);

      mockUsers.get.mockResolvedValue(existingAuthUser);
      mockTablesDB.createRow.mockRejectedValue(new Error('Database error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to link user account. Please try again.',
          code: 'DATABASE_ERROR',
        })
      );
    });
  });
});
