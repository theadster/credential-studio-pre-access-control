import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/roles/index';
import { mockAccount, mockTablesDB, mockAdminTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    tablesDB: mockTablesDB,
  })),
  createAdminClient: vi.fn(() => ({
    tablesDB: mockAdminTablesDB,
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


describe('/api/roles - Role Management API', () => {
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
      roles: { read: true },
    }),
  };

  const mockManagerRole = {
    $id: 'role-manager',
    name: 'Event Manager',
    description: 'Event management access',
    permissions: JSON.stringify({
      users: { read: true },
      attendees: { create: true, read: true, update: true, delete: true },
      roles: { read: true },
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

    // Reset TablesDB mocks
    mockTablesDB.createTransaction.mockReset();
    mockTablesDB.createOperations.mockReset();
    mockTablesDB.updateTransaction.mockReset();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).code = 401;
      mockAccount.get.mockRejectedValue(authError);

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

  describe('GET /api/roles', () => {
    it('should return list of roles with user counts', async () => {
      const mockRoles = [mockAdminRole, mockViewerRole, mockManagerRole];

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile lookup
        .mockResolvedValueOnce({ rows: mockRoles, total: 3 }) // Roles list
        .mockResolvedValueOnce({ rows: [], total: 2 }) // Admin role user count
        .mockResolvedValueOnce({ rows: [], total: 5 }) // Viewer role user count
        .mockResolvedValueOnce({ rows: [], total: 3 }); // Manager role user count

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Super Administrator',
            _count: { users: 2 },
          }),
          expect.objectContaining({
            name: 'Viewer',
            _count: { users: 5 },
          }),
          expect.objectContaining({
            name: 'Event Manager',
            _count: { users: 3 },
          }),
        ])
      );
    });

    it('should return roles ordered by creation date', async () => {
      const mockRoles = [mockAdminRole, mockViewerRole];

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: mockRoles, total: 2 })
        .mockResolvedValueOnce({ rows: [], total: 0 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify orderAsc was used
      expect(mockTablesDB.listRows).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID,
        expect.arrayContaining([expect.stringContaining('orderAsc')])
      );
    });

    it('should create log entry for viewing roles list', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockAdminRole], total: 1 })
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
          details: expect.stringContaining('roles_list'),
        })
      );
    });

    it('should handle empty roles list', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith([]);
    });

    it('should continue even if logging fails', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockAdminRole], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockTablesDB.createRow.mockRejectedValueOnce(new Error('Logging failed'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalled();
    });
  });

  describe('POST /api/roles', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.body = {
        name: 'New Role',
        description: 'A new custom role',
        permissions: {
          attendees: { read: true, create: true },
          users: { read: true },
        },
      };
    });

    it('should create a new role successfully with transaction', async () => {
      const newRole = {
        $id: 'new-role-123',
        name: 'New Role',
        description: 'A new custom role',
        permissions: JSON.stringify({
          attendees: { read: true, create: true },
          users: { read: true },
        }),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile lookup
        .mockResolvedValueOnce({ rows: [], total: 0 }); // Check existing role name

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Get user role
        .mockResolvedValueOnce(newRole); // Get created role

      // Mock transaction flow
      mockTablesDB.createTransaction.mockResolvedValueOnce({ $id: 'tx-123' });
      mockTablesDB.createOperations.mockResolvedValueOnce(undefined);
      mockTablesDB.updateTransaction.mockResolvedValueOnce(undefined);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalled();
      
      // Verify operations were created (role + audit log)
      expect(mockTablesDB.createOperations).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'tx-123',
          operations: expect.arrayContaining([
            expect.objectContaining({
              action: 'create',
              tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID,
              data: expect.objectContaining({
                name: 'New Role',
                description: 'A new custom role',
              }),
            }),
            expect.objectContaining({
              action: 'create',
              tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
            }),
          ]),
        })
      );

      // Verify transaction was committed
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'tx-123',
          commit: true,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Role',
          _count: { users: 0 },
        })
      );
    });

    it('should return 403 if user does not have create permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ roles: { read: true, create: false } }),
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should return 400 if name is missing', async () => {
      mockReq.body = { permissions: {} };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if permissions is missing', async () => {
      mockReq.body = { name: 'New Role' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if permissions is not a valid object', async () => {
      mockReq.body = {
        name: 'New Role',
        permissions: 'invalid-string',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Permissions must be a valid JSON object' });
    });

    it('should return 400 if role name already exists', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockAdminRole], total: 1 }); // Existing role with same name

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Role name already exists' });
    });

    it('should create role with empty description if not provided', async () => {
      mockReq.body = {
        name: 'New Role',
        permissions: { attendees: { read: true } },
      };

      const newRole = {
        $id: 'new-role-123',
        name: 'New Role',
        description: '',
        permissions: JSON.stringify({ attendees: { read: true } }),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(newRole);

      mockTablesDB.createTransaction.mockResolvedValueOnce({ $id: 'tx-123' });
      mockTablesDB.createOperations.mockResolvedValueOnce(undefined);
      mockTablesDB.updateTransaction.mockResolvedValueOnce(undefined);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createOperations).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                description: '',
              }),
            }),
          ]),
        })
      );
    });

    it('should create log entry for role creation in transaction', async () => {
      const newRole = {
        $id: 'new-role-123',
        name: 'New Role',
        description: 'A new custom role',
        permissions: JSON.stringify({
          attendees: { read: true, create: true },
          users: { read: true },
        }),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(newRole);

      mockTablesDB.createTransaction.mockResolvedValueOnce({ $id: 'tx-123' });
      mockTablesDB.createOperations.mockResolvedValueOnce(undefined);
      mockTablesDB.updateTransaction.mockResolvedValueOnce(undefined);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify audit log is included in transaction operations
      expect(mockTablesDB.createOperations).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.objectContaining({
              action: 'create',
              tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
              data: expect.objectContaining({
                userId: mockAuthUser.$id,
                action: 'create',
                details: expect.stringContaining('role'),
              }),
            }),
          ]),
        })
      );
    });

    it('should serialize permissions object to JSON string', async () => {
      const permissions = {
        attendees: { read: true, create: true, update: true },
        users: { read: true },
        roles: { read: true },
      };

      mockReq.body = {
        name: 'Complex Role',
        description: 'Role with complex permissions',
        permissions,
      };

      const newRole = {
        $id: 'new-role-123',
        name: 'Complex Role',
        description: 'Role with complex permissions',
        permissions: JSON.stringify(permissions),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(newRole);

      mockTablesDB.createTransaction.mockResolvedValueOnce({ $id: 'tx-123' });
      mockTablesDB.createOperations.mockResolvedValueOnce(undefined);
      mockTablesDB.updateTransaction.mockResolvedValueOnce(undefined);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createOperations).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                permissions: JSON.stringify(permissions),
              }),
            }),
          ]),
        })
      );
    });

    it('should rollback transaction on failure', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      mockTablesDB.createTransaction.mockResolvedValueOnce({ $id: 'tx-123' });
      mockTablesDB.createOperations.mockRejectedValueOnce(new Error('Transaction failed'));
      mockTablesDB.updateTransaction.mockResolvedValueOnce(undefined);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify rollback was attempted
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'tx-123',
          rollback: true,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should handle transaction conflict with retry', async () => {
      const newRole = {
        $id: 'new-role-123',
        name: 'New Role',
        description: 'A new custom role',
        permissions: JSON.stringify({
          attendees: { read: true, create: true },
          users: { read: true },
        }),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(newRole);

      // First attempt fails with conflict
      mockTablesDB.createTransaction
        .mockResolvedValueOnce({ $id: 'tx-123' })
        .mockResolvedValueOnce({ $id: 'tx-124' });
      
      const conflictError = new Error('Conflict');
      (conflictError as any).code = 409;
      
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(undefined);
      
      mockTablesDB.updateTransaction
        .mockResolvedValueOnce(undefined) // Rollback first attempt
        .mockResolvedValueOnce(undefined); // Commit second attempt

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should have retried
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'DELETE';

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method DELETE not allowed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockRejectedValueOnce(new Error('Database error'));

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('error'),
          code: 500,
          type: 'internal_error',
        })
      );
    });
  });
});
