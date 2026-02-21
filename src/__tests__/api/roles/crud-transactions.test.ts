/**
 * Integration tests for role CRUD operations with transactions
 * 
 * Tests the atomic CRUD functionality using TablesDB transactions API
 * to ensure role operations and audit logs are created atomically.
 * 
 * Requirements tested:
 * - 14.1: Unit tests covering success and failure cases
 * - 14.2: Integration tests verifying atomic behavior
 * - 14.3: Tests verify rollback behavior on failure
 * 
 * Task: 43. Write integration tests for role operations
 * - Test atomic create with audit log
 * - Test atomic update with audit log
 * - Test atomic delete with audit log
 * - Test rollback when audit log fails
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import indexHandler from '@/pages/api/roles/index';
import idHandler from '@/pages/api/roles/[id]';
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

// Mock the API middleware to bypass authentication
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handler: any) => handler,
  AuthenticatedRequest: {} as any,
}));

// Mock log settings
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(true)),
}));

// Mock log formatting
vi.mock('@/lib/logFormatting', () => ({
  createRoleLogDetails: vi.fn((action, role, extra = {}) => ({
    type: 'system',
    target: role.name,
    description: `${action} role "${role.name}"`,
    roleName: role.name,
    ...(role.id && { roleId: role.id }),
    ...extra,
  })),
}));

// Mock role user count utilities
vi.mock('@/lib/getRoleUserCount', () => ({
  getRoleUserCount: vi.fn(() => Promise.resolve(0)),
}));

vi.mock('@/lib/roleUserCountCache', () => ({
  invalidateRoleUserCount: vi.fn(),
}));

// Mock permission validation
vi.mock('@/lib/validatePermissions', () => ({
  validatePermissions: vi.fn((permissions) => ({
    valid: true,
    permissions,
  })),
}));

describe('/api/roles CRUD - Transaction Integration Tests', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let originalEnv: NodeJS.ProcessEnv;

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
    roleId: 'role-super-admin',
    isInvited: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockSuperAdminRole = {
    $id: 'role-super-admin',
    name: 'Super Administrator',
    description: 'Full system access',
    permissions: JSON.stringify({
      roles: { create: true, read: true, update: true, delete: true },
      all: true,
    }),
  };

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    
    originalEnv = { ...process.env };
    
    // Enable transactions for roles
    process.env.ENABLE_TRANSACTIONS = 'true';
    process.env.TRANSACTIONS_ENDPOINTS = 'roles';
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'POST',
      cookies: { 'appwrite-session': 'test-session' },
      user: mockAuthUser,
      userProfile: { 
        ...mockUserProfile, 
        role: {
          ...mockSuperAdminRole,
          permissions: {
            roles: { create: true, read: true, update: true, delete: true },
            all: true,
          }
        }
      },
    } as any;
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('POST /api/roles - Create with Transaction', () => {
    it('should create role atomically with audit log', async () => {
      const mockTx = { $id: 'tx-create-123' };
      const newRole = {
        $id: 'role-123',
        name: 'Test Role',
        description: 'Test role description',
        permissions: JSON.stringify({
          attendees: { read: true, write: true },
        }),
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock transaction flow
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock role name uniqueness check
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      // Mock getRow to return created role
      mockTablesDB.getRow.mockResolvedValue(newRole);
    mockAdminTablesDB.getRow.mockResolvedValue(newRole);

      mockReq.method = 'POST';
      mockReq.body = {
        name: 'Test Role',
        description: 'Test role description',
        permissions: {
          attendees: { read: true, write: true },
        },
      };

      await indexHandler(mockReq as any, mockRes as any);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);

      // Verify operations include both role creation and audit log
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(1);
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      expect(operations).toHaveLength(2); // role + audit log

      // Verify role creation operation
      expect(operations[0]).toMatchObject({
        action: 'create',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID,
        data: {
          name: 'Test Role',
          description: 'Test role description',
          permissions: JSON.stringify({
            attendees: { read: true, write: true },
          }),
        },
      });

      // Verify audit log operation
      expect(operations[1]).toMatchObject({
        action: 'create',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        data: {
          userId: mockAuthUser.$id,
          action: 'create',
        },
      });

      // Verify transaction was committed
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: mockTx.$id,
        commit: true,
      });

      // Verify success response
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'role-123',
          name: 'Test Role',
          description: 'Test role description',
        })
      );
    });

    it('should rollback when audit log fails', async () => {
      const mockTx = { $id: 'tx-create-fail-123' };

      // Mock transaction creation
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      
      // Mock operations to fail (simulating audit log failure)
      mockTablesDB.createOperations.mockRejectedValue(
        new Error('Failed to create audit log')
      );
      
      // Mock rollback
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock role name uniqueness check
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      mockReq.method = 'POST';
      mockReq.body = {
        name: 'Test Role',
        description: 'Test role description',
        permissions: {
          attendees: { read: true, write: true },
        },
      };

      await indexHandler(mockReq as any, mockRes as any);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);

      // Verify rollback was called
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: mockTx.$id,
        rollback: true,
      });

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });

    it('should reject duplicate role names', async () => {
      // Mock existing role with same name
      mockTablesDB.listRows.mockResolvedValue({
        rows: [{ $id: 'existing-role', name: 'Test Role' }],
        total: 1,
      });

      mockReq.method = 'POST';
      mockReq.body = {
        name: 'Test Role',
        description: 'Test role description',
        permissions: {
          attendees: { read: true, write: true },
        },
      };

      await indexHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Role name already exists',
        })
      );
    });

    it('should validate required fields', async () => {
      mockReq.method = 'POST';
      mockReq.body = {
        name: 'Test Role',
        // Missing permissions
      };

      await indexHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required fields',
        })
      );
    });
  });

  describe('PUT /api/roles/[id] - Update with Transaction', () => {
    const roleId = 'role-update-123';
    const existingRole = {
      $id: roleId,
      name: 'Original Role',
      description: 'Original description',
      permissions: JSON.stringify({
        attendees: { read: true },
      }),
      $createdAt: '2024-01-01T00:00:00.000Z',
      $updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('should update role atomically with audit log', async () => {
      const mockTx = { $id: 'tx-update-123' };
      const updatedRole = {
        ...existingRole,
        name: 'Updated Role',
        description: 'Updated description',
        permissions: JSON.stringify({
          attendees: { read: true, write: true },
        }),
        $updatedAt: '2024-01-02T00:00:00.000Z',
      };

      // Mock transaction flow
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock user profile and role fetch
      mockTablesDB.listRows
        .mockResolvedValueOnce({ // User profile fetch
          rows: [mockUserProfile],
          total: 1,
        })
        .mockResolvedValueOnce({ // Role name uniqueness check
          rows: [],
          total: 0,
        });

      // Mock getRow to return existing role first, then updated
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockSuperAdminRole) // User's role
        .mockResolvedValueOnce(existingRole) // Existing role to update
        .mockResolvedValueOnce(updatedRole); // After update

      mockReq.method = 'PUT';
      mockReq.query = { id: roleId };
      mockReq.body = {
        name: 'Updated Role',
        description: 'Updated description',
        permissions: {
          attendees: { read: true, write: true },
        },
      };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);

      // Verify operations include both role update and audit log
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(1);
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      expect(operations).toHaveLength(2); // update + audit log

      // Verify update operation
      expect(operations[0]).toMatchObject({
        action: 'update',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID,
        rowId: roleId,
        data: expect.objectContaining({
          name: 'Updated Role',
          description: 'Updated description',
        }),
      });

      // Verify audit log operation
      expect(operations[1]).toMatchObject({
        action: 'create',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        data: {
          userId: mockAuthUser.$id,
          action: 'update',
        },
      });

      // Verify transaction was committed
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: mockTx.$id,
        commit: true,
      });

      // Verify success response
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should rollback when audit log fails during update', async () => {
      const mockTx = { $id: 'tx-update-fail-123' };

      // Mock transaction creation
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      
      // Mock operations to fail
      mockTablesDB.createOperations.mockRejectedValue(
        new Error('Failed to create audit log')
      );
      
      // Mock rollback
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock user profile and role fetch
      mockTablesDB.listRows
        .mockResolvedValueOnce({ // User profile fetch
          rows: [mockUserProfile],
          total: 1,
        })
        .mockResolvedValueOnce({ // Role name uniqueness check
          rows: [],
          total: 0,
        });

      // Mock getRow to return roles
      const mockSuperAdminRoleWithStringPerms = {
        ...mockSuperAdminRole,
        permissions: JSON.stringify(mockSuperAdminRole.permissions),
      };
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockSuperAdminRoleWithStringPerms) // User's role
        .mockResolvedValueOnce(existingRole); // Existing role to update

      mockReq.method = 'PUT';
      mockReq.query = { id: roleId };
      mockReq.body = {
        name: 'Updated Role',
        description: 'Updated description',
        permissions: {
          attendees: { read: true, write: true },
        },
      };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);

      // Verify rollback was called
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: mockTx.$id,
        rollback: true,
      });

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should prevent updating non-existent role', async () => {
      // Mock user profile fetch
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      // Mock getRow to return user's role, then throw 404 for target role
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockSuperAdminRole) // User's role
        .mockRejectedValueOnce(
          Object.assign(new Error('Role not found'), { code: 404 })
        );

      mockReq.method = 'PUT';
      mockReq.query = { id: 'non-existent-role' };
      mockReq.body = {
        name: 'Updated Role',
        description: 'Updated description',
        permissions: {
          attendees: { read: true, write: true },
        },
      };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Role not found',
        })
      );
    });

    it('should prevent modifying Super Administrator role by non-super admin', async () => {
      const staffRole = {
        $id: 'role-staff',
        name: 'Staff',
        description: 'Staff role',
        permissions: JSON.stringify({
          roles: { read: true, update: true },
        }),
      };

      const superAdminRole = {
        $id: 'role-super-admin-target',
        name: 'Super Administrator',
        description: 'Full system access',
        permissions: JSON.stringify({ all: true }),
      };

      // Mock user profile fetch
      mockTablesDB.listRows.mockResolvedValue({
        rows: [{
          ...mockUserProfile,
          roleId: 'role-staff',
        }],
        total: 1,
      });

      // Mock getRow to return staff role and super admin role
      mockTablesDB.getRow
        .mockResolvedValueOnce(staffRole) // User's role
        .mockResolvedValueOnce(superAdminRole); // Target role to update

      mockReq.method = 'PUT';
      mockReq.query = { id: 'role-super-admin-target' };
      mockReq.body = {
        name: 'Super Administrator',
        description: 'Modified description',
        permissions: { all: true },
      };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Cannot modify Super Administrator role',
        })
      );
    });
  });

  describe('DELETE /api/roles/[id] - Delete with Transaction', () => {
    const roleId = 'role-delete-123';
    const existingRole = {
      $id: roleId,
      name: 'Test Role',
      description: 'Test role description',
      permissions: JSON.stringify({
        attendees: { read: true },
      }),
      $createdAt: '2024-01-01T00:00:00.000Z',
      $updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('should delete role atomically with audit log', async () => {
      const mockTx = { $id: 'tx-delete-123' };

      // Mock transaction flow
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock user profile fetch
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      // Mock getRow to return user's role and existing role
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockSuperAdminRole) // User's role
        .mockResolvedValueOnce(existingRole); // Role to delete

      mockReq.method = 'DELETE';
      mockReq.query = { id: roleId };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);

      // Verify operations include both role deletion and audit log
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(1);
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      expect(operations).toHaveLength(2); // delete + audit log

      // Verify delete operation
      expect(operations[0]).toMatchObject({
        action: 'delete',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID,
        rowId: roleId,
      });

      // Verify audit log operation
      expect(operations[1]).toMatchObject({
        action: 'create',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        data: {
          userId: mockAuthUser.$id,
          action: 'delete',
        },
      });

      // Verify transaction was committed
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: mockTx.$id,
        commit: true,
      });

      // Verify success response
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Role deleted successfully',
      });
    });

    it('should rollback when audit log fails during delete', async () => {
      const mockTx = { $id: 'tx-delete-fail-123' };

      // Mock transaction creation
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      
      // Mock operations to fail
      mockTablesDB.createOperations.mockRejectedValue(
        new Error('Failed to create audit log')
      );
      
      // Mock rollback
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock user profile fetch
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      // Mock getRow to return roles
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockSuperAdminRole) // User's role
        .mockResolvedValueOnce(existingRole); // Role to delete

      mockReq.method = 'DELETE';
      mockReq.query = { id: roleId };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);

      // Verify rollback was called
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: mockTx.$id,
        rollback: true,
      });

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should prevent deleting Super Administrator role', async () => {
      const superAdminRole = {
        $id: 'role-super-admin-delete',
        name: 'Super Administrator',
        description: 'Full system access',
        permissions: JSON.stringify({ all: true }),
      };

      // Mock user profile fetch
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      // Mock getRow to return roles
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockSuperAdminRole) // User's role
        .mockResolvedValueOnce(superAdminRole); // Role to delete

      mockReq.method = 'DELETE';
      mockReq.query = { id: 'role-super-admin-delete' };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Cannot delete Super Administrator role',
        })
      );
    });

    it('should prevent deleting role with assigned users', async () => {
      const { getRoleUserCount } = await import('@/lib/getRoleUserCount');
      vi.mocked(getRoleUserCount).mockResolvedValue(5); // 5 users assigned

      // Mock user profile fetch
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      // Mock getRow to return roles
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockSuperAdminRole) // User's role
        .mockResolvedValueOnce(existingRole); // Role to delete

      mockReq.method = 'DELETE';
      mockReq.query = { id: roleId };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Cannot delete role with 5 assigned users'),
        })
      );
    });

    it('should return 404 when role not found', async () => {
      // Mock user profile fetch
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      // Mock getRow to return user's role, then throw 404 for target role
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockSuperAdminRole) // User's role
        .mockRejectedValueOnce(
          Object.assign(new Error('Role not found'), { code: 404 })
        );

      mockReq.method = 'DELETE';
      mockReq.query = { id: 'non-existent-role' };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Role not found',
        })
      );
    });
  });

  describe('Transaction Retry Logic', () => {
    it('should retry on conflict error during create', async () => {
      const mockTx = { $id: 'tx-retry-123' };
      const conflictError = Object.assign(new Error('Conflict'), { code: 409 });
      const newRole = {
        $id: 'role-retry-123',
        name: 'Test Role',
        description: 'Test description',
        permissions: JSON.stringify({
          attendees: { read: true },
        }),
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock transaction to fail first, then succeed
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError) // First attempt fails
        .mockResolvedValueOnce(undefined); // Second attempt succeeds
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock role name uniqueness check
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      // Mock getRow to return created role
      mockTablesDB.getRow.mockResolvedValue(newRole);
    mockAdminTablesDB.getRow.mockResolvedValue(newRole);

      mockReq.method = 'POST';
      mockReq.body = {
        name: 'Test Role',
        description: 'Test description',
        permissions: {
          attendees: { read: true },
        },
      };

      await indexHandler(mockReq as any, mockRes as any);

      // Verify transaction was retried
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(2);

      // Verify success response after retry
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should retry on conflict error during update', async () => {
      const roleId = 'role-retry-update-123';
      const mockTx = { $id: 'tx-retry-update-123' };
      const conflictError = Object.assign(new Error('Conflict'), { code: 409 });
      const existingRole = {
        $id: roleId,
        name: 'Original Role',
        description: 'Original description',
        permissions: JSON.stringify({
          attendees: { read: true },
        }),
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock transaction to fail first, then succeed
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock user profile and role fetch
      mockTablesDB.listRows
        .mockResolvedValue({ // User profile fetch
          rows: [mockUserProfile],
          total: 1,
        });

      // Mock getRow
      mockTablesDB.getRow
        .mockResolvedValue(mockSuperAdminRole) // User's role (multiple calls)
        .mockResolvedValueOnce(existingRole) // Existing role first call
        .mockResolvedValueOnce(existingRole); // Existing role retry call

      mockReq.method = 'PUT';
      mockReq.query = { id: roleId };
      mockReq.body = {
        name: 'Updated Role',
        description: 'Updated description',
        permissions: {
          attendees: { read: true, write: true },
        },
      };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was retried
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(2);

      // Verify success response after retry
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should retry on conflict error during delete', async () => {
      const roleId = 'role-retry-delete-123';
      const mockTx = { $id: 'tx-retry-delete-123' };
      const conflictError = Object.assign(new Error('Conflict'), { code: 409 });
      const existingRole = {
        $id: roleId,
        name: 'Test Role',
        description: 'Test description',
        permissions: JSON.stringify({
          attendees: { read: true },
        }),
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock transaction to fail first, then succeed
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock user profile fetch
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      // Mock getRow
      mockTablesDB.getRow
        .mockResolvedValue(mockSuperAdminRole) // User's role (multiple calls)
        .mockResolvedValueOnce(existingRole) // Role to delete first call
        .mockResolvedValueOnce(existingRole); // Role to delete retry call

      mockReq.method = 'DELETE';
      mockReq.query = { id: roleId };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was retried
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(2);

      // Verify success response after retry
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should fail after max retries', async () => {
      const mockTx = { $id: 'tx-max-retry-123' };
      const conflictError = Object.assign(new Error('Conflict'), { code: 409 });

      // Mock transaction to always fail
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockRejectedValue(conflictError);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock role name uniqueness check
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      mockReq.method = 'POST';
      mockReq.body = {
        name: 'Test Role',
        description: 'Test description',
        permissions: {
          attendees: { read: true },
        },
      };

      await indexHandler(mockReq as any, mockRes as any);

      // Verify transaction was retried 3 times (default max retries)
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(3);
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(3);

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          retryable: true,
        })
      );
    });
  });

  describe('Audit Log Integration', () => {
    it('should include role details in audit log for create', async () => {
      const mockTx = { $id: 'tx-audit-create-123' };
      const newRole = {
        $id: 'role-audit-123',
        name: 'Test Role',
        description: 'Test description',
        permissions: JSON.stringify({
          attendees: { read: true },
        }),
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      mockTablesDB.getRow.mockResolvedValue(newRole);
    mockAdminTablesDB.getRow.mockResolvedValue(newRole);

      mockReq.method = 'POST';
      mockReq.body = {
        name: 'Test Role',
        description: 'Test description',
        permissions: {
          attendees: { read: true },
        },
      };

      await indexHandler(mockReq as any, mockRes as any);

      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const auditLogOp = operations[1];

      // Verify audit log contains role details
      expect(auditLogOp.data.details).toBeDefined();
      const details = JSON.parse(auditLogOp.data.details);
      expect(details).toMatchObject({
        type: 'system',
        target: 'Test Role',
        roleName: 'Test Role',
      });
    });

    it('should include change details in audit log for update', async () => {
      const roleId = 'role-audit-update-123';
      const mockTx = { $id: 'tx-audit-update-123' };
      const existingRole = {
        $id: roleId,
        name: 'Original Role',
        description: 'Original description',
        permissions: JSON.stringify({
          attendees: { read: true },
        }),
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock user profile and role fetch
      mockTablesDB.listRows
        .mockResolvedValueOnce({ // User profile fetch
          rows: [mockUserProfile],
          total: 1,
        })
        .mockResolvedValueOnce({ // Role name uniqueness check
          rows: [],
          total: 0,
        });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockSuperAdminRole) // User's role
        .mockResolvedValueOnce(existingRole) // Existing role
        .mockResolvedValueOnce(existingRole); // After update

      mockReq.method = 'PUT';
      mockReq.query = { id: roleId };
      mockReq.body = {
        name: 'Updated Role',
        description: 'Updated description',
        permissions: {
          attendees: { read: true, write: true },
        },
      };

      await idHandler(mockReq as any, mockRes as any);

      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const auditLogOp = operations[1];

      // Verify audit log contains change details
      expect(auditLogOp.data.details).toBeDefined();
      const details = JSON.parse(auditLogOp.data.details);
      expect(details.changes).toBeDefined();
      expect(Array.isArray(details.changes)).toBe(true);
    });

    it('should include role name in audit log for delete', async () => {
      const roleId = 'role-audit-delete-123';
      const mockTx = { $id: 'tx-audit-delete-123' };
      const existingRole = {
        $id: roleId,
        name: 'Test Role',
        description: 'Test description',
        permissions: JSON.stringify({
          attendees: { read: true },
        }),
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock user profile fetch
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockSuperAdminRole) // User's role
        .mockResolvedValueOnce(existingRole); // Role to delete

      mockReq.method = 'DELETE';
      mockReq.query = { id: roleId };

      await idHandler(mockReq as any, mockRes as any);

      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const auditLogOp = operations[1];

      // Verify audit log contains role details
      expect(auditLogOp.data.details).toBeDefined();
      const details = JSON.parse(auditLogOp.data.details);
      expect(details).toMatchObject({
        type: 'system',
        target: 'Test Role',
        roleName: 'Test Role',
      });
    });
  });

  describe('Permission Checks', () => {
    it('should deny create without permission', async () => {
      const staffRole = {
        $id: 'role-staff',
        name: 'Staff',
        description: 'Staff role',
        permissions: JSON.stringify({
          roles: { read: true }, // No create permission
        }),
      };

      mockReq.userProfile = {
        ...mockUserProfile,
        role: {
          ...staffRole,
          permissions: {
            roles: { read: true },
          },
        },
      } as any;

      mockReq.method = 'POST';
      mockReq.body = {
        name: 'Test Role',
        description: 'Test description',
        permissions: {
          attendees: { read: true },
        },
      };

      await indexHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions',
        })
      );
    });

    it('should deny update without permission', async () => {
      const staffRole = {
        $id: 'role-staff',
        name: 'Staff',
        description: 'Staff role',
        permissions: JSON.stringify({
          roles: { read: true }, // No update permission
        }),
      };

      // Mock user profile fetch
      mockTablesDB.listRows.mockResolvedValue({
        rows: [{
          ...mockUserProfile,
          roleId: 'role-staff',
        }],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValue(staffRole);
    mockAdminTablesDB.getRow.mockResolvedValue(staffRole);

      mockReq.method = 'PUT';
      mockReq.query = { id: 'role-123' };
      mockReq.body = {
        name: 'Updated Role',
        description: 'Updated description',
        permissions: {
          attendees: { read: true },
        },
      };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions',
        })
      );
    });

    it('should deny delete without permission', async () => {
      const staffRole = {
        $id: 'role-staff',
        name: 'Staff',
        description: 'Staff role',
        permissions: JSON.stringify({
          roles: { read: true }, // No delete permission
        }),
      };

      // Mock user profile fetch
      mockTablesDB.listRows.mockResolvedValue({
        rows: [{
          ...mockUserProfile,
          roleId: 'role-staff',
        }],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValue(staffRole);
    mockAdminTablesDB.getRow.mockResolvedValue(staffRole);

      mockReq.method = 'DELETE';
      mockReq.query = { id: 'role-123' };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions',
        })
      );
    });
  });
});
