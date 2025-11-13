import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../[id]';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock TablesDB
const mockTablesDB = {
  createTransaction: vi.fn(),
  createOperations: vi.fn(),
  updateTransaction: vi.fn(),
};

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
    tablesDB: mockTablesDB,
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
    mockDatabases.listDocuments.mockResolvedValue({
      documents: [mockUserProfile],
      total: 1,
    });
    mockDatabases.createDocument.mockResolvedValue({
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
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(getFreshRole(mockAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Role ID is required' });
    });

    it('should return 400 if role ID is not a string', async () => {
      mockReq.query = { id: ['array', 'value'] };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(getFreshRole(mockAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Role ID is required' });
    });
  });

  describe('GET /api/roles/[id]', () => {
    it('should return role with user count', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile lookup
        .mockResolvedValueOnce({ documents: [], total: 5 }); // User count for role

      mockDatabases.getDocument
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(getFreshRole(noPermRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should return 404 if role is not found', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      const notFoundError = new Error('Role not found');
      (notFoundError as any).code = 404;

      mockDatabases.getDocument
        .mockResolvedValueOnce(getFreshRole(mockAdminRole))
        .mockRejectedValueOnce(notFoundError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Role not found' });
    });

    it('should create log entry for viewing role', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 3 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(getFreshRole(mockAdminRole))
        .mockResolvedValueOnce(getFreshRole(mockViewerRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'view',
          details: expect.stringContaining('role'),
        })
      );
    });

    it('should continue even if logging fails', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(getFreshRole(mockAdminRole))
        .mockResolvedValueOnce(getFreshRole(mockViewerRole));

      mockDatabases.createDocument.mockRejectedValueOnce(new Error('Logging failed'));

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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile lookup
        .mockResolvedValueOnce({ documents: [], total: 0 }) // Name conflict check (no conflicts)
        .mockResolvedValueOnce({ documents: [], total: 3 }); // User count for updated role

      mockDatabases.getDocument
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
            tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID,
            rowId: 'role-viewer',
            data: expect.objectContaining({
              name: 'Updated Viewer',
              description: 'Updated description',
            }),
          }),
          expect.objectContaining({
            action: 'create',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(getFreshRole(noPermRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should return 400 if name is missing', async () => {
      mockReq.body = { permissions: {} };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      // Mock current user's role - handler parses permissions so use fresh copy
      mockDatabases.getDocument.mockResolvedValueOnce(getFreshRole(mockAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if permissions is missing', async () => {
      mockReq.body = { name: 'Updated Role' };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      // Mock current user's role - handler parses permissions so use fresh copy
      mockDatabases.getDocument.mockResolvedValueOnce(getFreshRole(mockAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if permissions is not a valid object', async () => {
      mockReq.body = {
        name: 'Updated Role',
        permissions: 'invalid-string',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      // Mock current user's role - handler parses permissions so use fresh copy
      mockDatabases.getDocument.mockResolvedValueOnce(getFreshRole(mockAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Permissions must be a valid JSON object' });
    });

    it('should return 404 if role to update is not found', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      const notFoundError = new Error('Role not found');
      (notFoundError as any).code = 404;

      mockDatabases.getDocument
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [conflictingRole], total: 1 }); // Name conflict check

      mockDatabases.getDocument
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 2 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)); // Existing role

      mockDatabases.updateDocument.mockResolvedValue(updatedRole);
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      // Should not check for name conflict since name didn't change
      expect(mockDatabases.listDocuments).toHaveBeenCalledTimes(2); // Only user profile and user count
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [{ ...mockUserProfile, roleId: 'role-manager' }], total: 1 });

      mockDatabases.getDocument
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [{ ...mockUserProfile, roleId: 'role-super' }], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 1 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(getFreshRole(superAdminRole))
        .mockResolvedValueOnce(getFreshRole(superAdminRole));

      mockDatabases.updateDocument.mockResolvedValue(updatedRole);
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should include audit log in transaction', async () => {
      const updatedRole = {
        ...mockViewerRole,
        name: 'Updated Viewer',
        $updatedAt: '2024-01-06T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [], total: 2 });

      mockDatabases.getDocument
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
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
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
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
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
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [], total: 2 });

      mockDatabases.getDocument
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
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile lookup
        .mockResolvedValueOnce({ documents: [], total: 0 }); // Check users with role

      mockDatabases.getDocument
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)); // Role to delete

      mockDatabases.deleteDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.deleteDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID,
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(getFreshRole(noPermRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should return 404 if role to delete is not found', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      const notFoundError = new Error('Role not found');
      (notFoundError as any).code = 404;

      mockDatabases.getDocument
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(superAdminRole)); // Role to delete

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Cannot delete Super Administrator role' });
    });

    it('should return 400 if role has assigned users', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [{ $id: 'user-1' }], total: 5 }); // 5 users with this role

      mockDatabases.getDocument
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)); // Role to delete

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Cannot delete role with 5 assigned users. Please reassign users first.',
      });
    });

    it('should create log entry for role deletion', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(getFreshRole(mockAdminRole)) // Current user's role
        .mockResolvedValueOnce(getFreshRole(mockViewerRole)); // Role to delete

      mockDatabases.deleteDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(getFreshRole(mockAdminRole));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'PUT', 'DELETE']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method POST not allowed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      mockDatabases.getDocument
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
