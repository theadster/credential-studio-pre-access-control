import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/roles/[id]';
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


describe('/api/roles/[id] - Single Role API', () => {
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

  // Helper to create fresh role copies (prevents mutation issues)
  const getFreshRole = (role: any) => JSON.parse(JSON.stringify(role));

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'GET',
      query: { id: 'role-viewer' },
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
    
    // Default transaction success
    mockTablesDB.createTransaction.mockResolvedValue({ $id: 'tx-123' });
    mockTablesDB.createOperations.mockResolvedValue(undefined);
    mockTablesDB.updateTransaction.mockResolvedValue(undefined);
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

    it('should return 400 if role ID is missing', async () => {
      mockReq.query = {};

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(getFreshRole(mockAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Role ID is required' });
    });

    it('should return 400 if role ID is not a string', async () => {
      mockReq.query = { id: ['array', 'value'] };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(getFreshRole(mockAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Role ID is required' });
    });
  });

  describe('GET /api/roles/[id]', () => {
    it('should return role with user count', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile lookup
        .mockResolvedValueOnce({ rows: [], total: 5 }); // User count for role

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role (will be parsed)
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)); // Requested role

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          $id: 'role-viewer',
          name: 'Viewer',
          description: 'Read-only access',
          _count: { users: 5 },
        })
      );
    });

    it('should return 403 if user does not have read permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ roles: { read: false } }),
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(getFreshRole(noPermRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should return 404 if role is not found', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      const notFoundError = new Error('Role not found');
      (notFoundError as any).code = 404;

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole))
        .mockRejectedValueOnce(notFoundError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Role not found' });
    });

    it('should create log entry for viewing role', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 3 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole))
        .mockResolvedValueOnce(getFreshRole(mockViewerRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'view',
          details: expect.stringContaining('role'),
        })
      );
    });

    it('should continue even if logging fails', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole))
        .mockResolvedValueOnce(getFreshRole(mockViewerRole));

      mockTablesDB.createRow.mockRejectedValueOnce(new Error('Logging failed'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalled();
    });
  });

  describe('PUT /api/roles/[id]', () => {
    beforeEach(() => {
      mockReq.method = 'PUT';
      mockReq.body = {
        name: 'Updated Viewer',
        description: 'Updated description',
        permissions: {
          users: { read: true },
          attendees: { read: true, create: true },
        },
      };
    });

    it('should update role successfully with transaction', async () => {
      const updatedRole = {
        $id: 'role-viewer',
        name: 'Updated Viewer',
        description: 'Updated description',
        permissions: JSON.stringify({
          users: { read: true },
          attendees: { read: true, create: true },
        }),
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-06T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile lookup
        .mockResolvedValueOnce({ rows: [], total: 0 }) // Name conflict check (no conflicts)
        .mockResolvedValueOnce({ rows: [], total: 3 }); // User count for updated role

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)) // Existing role
        .mockResolvedValueOnce(updatedRole); // Get updated role after transaction

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalled();
      
      // Verify operations were created (update + audit log)
      expect(mockTablesDB.createOperations).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        operations: expect.arrayContaining([
          expect.objectContaining({
            action: 'update',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID,
            rowId: 'role-viewer',
            data: expect.objectContaining({
              name: 'Updated Viewer',
              description: 'Updated description',
            }),
          }),
          expect.objectContaining({
            action: 'create',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
            data: expect.objectContaining({
              userId: mockAuthUser.$id,
              action: 'update',
            }),
          }),
        ]),
      });

      // Verify transaction was committed
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        commit: true,
      });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Viewer',
          _count: { users: 3 },
        })
      );
    });

    it('should return 403 if user does not have update permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ roles: { read: true, update: false } }),
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(getFreshRole(noPermRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should return 400 if name is missing', async () => {
      mockReq.body = { permissions: {} };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      // Mock current user's role - handler parses permissions so use fresh copy
      mockTablesDB.getRow.mockResolvedValueOnce(getFreshRole(mockAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if permissions is missing', async () => {
      mockReq.body = { name: 'Updated Role' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      // Mock current user's role - handler parses permissions so use fresh copy
      mockTablesDB.getRow.mockResolvedValueOnce(getFreshRole(mockAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if permissions is not a valid object', async () => {
      mockReq.body = {
        name: 'Updated Role',
        permissions: 'invalid-string',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      // Mock current user's role - handler parses permissions so use fresh copy
      mockTablesDB.getRow.mockResolvedValueOnce(getFreshRole(mockAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Permissions must be a valid JSON object' });
    });

    it('should return 404 if role to update is not found', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      const notFoundError = new Error('Role not found');
      (notFoundError as any).code = 404;

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockRejectedValueOnce(notFoundError); // Role to update not found

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Role not found' });
    });

    it('should return 400 if new name conflicts with another role', async () => {
      const conflictingRole = {
        $id: 'role-other',
        name: 'Updated Viewer',
        description: 'Another role',
        permissions: '{}',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [conflictingRole], total: 1 }); // Name conflict check

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)); // Existing role

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Role name already exists' });
    });

    it('should allow updating role with same name', async () => {
      mockReq.body.name = 'Viewer'; // Same as existing name

      const updatedRole = {
        ...mockViewerRole,
        description: 'Updated description',
        $updatedAt: '2024-01-06T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 2 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)); // Existing role

      mockTablesDB.updateRow.mockResolvedValue(updatedRole);
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      // Should not check for name conflict since name didn't change
      expect(mockTablesDB.listRows).toHaveBeenCalledTimes(2); // Only user profile and user count
    });

    it('should return 403 if trying to modify Super Administrator role as non-super admin', async () => {
      const managerRole = {
        $id: 'role-manager',
        name: 'Event Manager',
        description: 'Event management',
        permissions: JSON.stringify({
          roles: { read: true, update: true },
        }),
      };

      const superAdminRole = {
        $id: 'role-super',
        name: 'Super Administrator',
        description: 'Full access',
        permissions: JSON.stringify({
          roles: { read: true, update: true, delete: true },
        }),
      };

      mockReq.query = { id: 'role-super' };
      // Ensure body is set with valid data
      mockReq.body = {
        name: 'Super Administrator',
        description: 'Updated description',
        permissions: {
          roles: { read: true, update: true, delete: true },
        },
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [{ ...mockUserProfile, roleId: 'role-manager' }], total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(managerRole))
        .mockResolvedValueOnce(getFreshRole(superAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Cannot modify Super Administrator role' });
    });

    it('should allow Super Administrator to modify Super Administrator role', async () => {
      const superAdminRole = {
        $id: 'role-super',
        name: 'Super Administrator',
        description: 'Full access',
        permissions: JSON.stringify({
          roles: { read: true, update: true, delete: true },
        }),
      };

      mockReq.query = { id: 'role-super' };
      mockReq.body.name = 'Super Administrator'; // Keep same name

      const updatedRole = {
        ...superAdminRole,
        description: 'Updated description',
        $updatedAt: '2024-01-06T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [{ ...mockUserProfile, roleId: 'role-super' }], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(superAdminRole))
        .mockResolvedValueOnce(getFreshRole(superAdminRole));

      mockTablesDB.updateRow.mockResolvedValue(updatedRole);
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should include audit log in transaction', async () => {
      const updatedRole = {
        ...mockViewerRole,
        name: 'Updated Viewer',
        $updatedAt: '2024-01-06T00:00:00.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 })
        .mockResolvedValueOnce({ rows: [], total: 2 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)) // Existing role
        .mockResolvedValueOnce(updatedRole); // Get updated role after transaction

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify audit log is part of the transaction
      expect(mockTablesDB.createOperations).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        operations: expect.arrayContaining([
          expect.objectContaining({
            action: 'create',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
            data: expect.objectContaining({
              userId: mockAuthUser.$id,
              action: 'update',
              details: expect.stringContaining('role'),
            }),
          }),
        ]),
      });
    });

    it('should rollback transaction on failure', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)); // Existing role

      // Simulate transaction failure
      const txError = new Error('Transaction failed');
      mockTablesDB.createOperations.mockRejectedValueOnce(txError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify rollback was attempted
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        rollback: true,
      });

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should handle transaction conflict with retry', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 })
        .mockResolvedValueOnce({ rows: [], total: 2 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)) // Existing role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)); // Get updated role after transaction

      // Simulate conflict on first attempt, success on second
      const conflictError = new Error('Conflict');
      (conflictError as any).code = 409;
      
      mockTablesDB.createTransaction
        .mockResolvedValueOnce({ $id: 'tx-123' })
        .mockResolvedValueOnce({ $id: 'tx-456' });
      
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(undefined);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify retry occurred
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(2);
      
      // Verify success response
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('DELETE /api/roles/[id]', () => {
    beforeEach(() => {
      mockReq.method = 'DELETE';
    });

    it('should delete role successfully', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile lookup
        .mockResolvedValueOnce({ rows: [], total: 0 }); // Check users with role

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)); // Role to delete

      mockTablesDB.deleteRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.deleteRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID,
        'role-viewer'
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Role deleted successfully' });
    });

    it('should return 403 if user does not have delete permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ roles: { read: true, delete: false } }),
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(getFreshRole(noPermRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should return 404 if role to delete is not found', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      const notFoundError = new Error('Role not found');
      (notFoundError as any).code = 404;

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockRejectedValueOnce(notFoundError); // Role to delete not found

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Role not found' });
    });

    it('should return 403 if trying to delete Super Administrator role', async () => {
      const superAdminRole = {
        $id: 'role-super',
        name: 'Super Administrator',
        description: 'Full access',
        permissions: '{}',
      };

      mockReq.query = { id: 'role-super' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(superAdminRole)); // Role to delete

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Cannot delete Super Administrator role' });
    });

    it('should return 400 if role has assigned users', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [{ $id: 'user-1' }], total: 5 }); // 5 users with this role

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)); // Role to delete

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Cannot delete role with 5 assigned users. Please reassign users first.',
      });
    });

    it('should create log entry for role deletion', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)); // Role to delete

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
          details: expect.stringContaining('role'),
        })
      );
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'POST';

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(getFreshRole(mockAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'PUT', 'DELETE']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method POST not allowed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockRejectedValueOnce(new Error('Database error')); // Error getting role

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
