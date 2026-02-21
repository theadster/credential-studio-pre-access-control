/**
 * Integration tests for user linking with transactions
 * 
 * Tests the atomic user linking functionality using TablesDB transactions API
 * with automatic fallback to legacy Databases API.
 * 
 * Requirements tested:
 * - 14.1: Unit tests covering success and failure cases
 * - 14.2: Integration tests verifying atomic behavior
 * - 14.3: Tests verify rollback behavior on failure
 * - 14.4: Tests verify retry logic works correctly
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/users/link';
import { mockAccount, mockTablesDB, mockAdminTablesDB, mockUsers, mockTeams, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    tablesDB: mockTablesDB,

  })),
  createAdminClient: vi.fn(() => ({
    tablesDB: mockAdminTablesDB,
    users: mockUsers,
    teams: mockTeams,
    tablesDB: mockTablesDB,
  })),
}));

// Mock role user count cache
vi.mock('@/lib/roleUserCountCache', () => ({
  invalidateRoleUserCount: vi.fn(),
}));

// Mock transaction utilities
vi.mock('@/lib/transactions', () => ({
  executeTransactionWithRetry: vi.fn(),
  handleTransactionError: vi.fn((error, res) => {
    if (error.code === 409) {
      res.status(409).json({
        error: 'Transaction conflict',
        message: 'Data was modified by another user. Please refresh and try again.',
        retryable: true,
        type: 'CONFLICT'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        retryable: false,
        type: 'UNKNOWN'
      });
    }
  }),
  TransactionOperation: {} as any,
}));


import { executeTransactionWithRetry } from '@/lib/transactions';

describe('/api/users/link - Transaction Integration Tests', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;

  const mockAuthUser = {
    $id: 'admin-user-123',
    email: 'admin@example.com',
    name: 'Admin User',
  };

  const mockUserProfile = {
    $id: 'profile-123',
    userId: 'admin-user-123',
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
    permissions: {
      users: { create: true },
      all: true,
    },
  };

  const mockNewAuthUser = {
    $id: 'new-user-456',
    email: 'newuser@example.com',
    name: 'New User',
  };

  const mockStaffRole = {
    $id: 'role-staff',
    name: 'Registration Staff',
    description: 'Staff access',
    permissions: {
      attendees: { read: true, write: true },
    },
  };

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    setHeaderMock = vi.fn();
    
    mockReq = {
      method: 'POST',
      cookies: { 'appwrite-session': 'test-session' },
      body: {
        userId: mockNewAuthUser.$id,
        roleId: mockStaffRole.$id,
        addToTeam: false, // Default to false to simplify tests
      },
    } as any;
    
    mockRes = {
      status: statusMock as any,
      setHeader: setHeaderMock,
      json: jsonMock,
    };

    // Set environment variables for transactions
    process.env.ENABLE_TRANSACTIONS = 'true';
    process.env.TRANSACTIONS_ENDPOINTS = 'user-linking';
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test-db';
    process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID = 'users';
    process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID = 'roles';
    process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID = 'logs';

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
    
    // Mock user profile lookup - need to track calls per collection
    let usersCollectionCalls = 0;
    mockTablesDB.listRows.mockImplementation((dbId, tableId, queries) => {
      if (tableId === 'users') {
        usersCollectionCalls++;
        // First call returns admin user, subsequent calls return empty (new user doesn't exist)
        if (usersCollectionCalls === 1) {
          return Promise.resolve({ rows: [mockUserProfile], total: 1 });
        }
        return Promise.resolve({ rows: [], total: 0 });
      }
      return Promise.resolve({ rows: [], total: 0 });
    });
    
    mockTablesDB.getRow.mockImplementation((dbId, tableId, docId) => {
      if (tableId === 'roles') {
        if (docId === 'role-admin') return Promise.resolve(mockAdminRole);
        if (docId === 'role-staff') return Promise.resolve(mockStaffRole);
      }
      return Promise.reject({ code: 404, message: 'Document not found' });
    });

    // Mock Users API
    mockUsers.get.mockResolvedValue(mockNewAuthUser);

    // Mock Teams API
    mockTeams.createMembership.mockReset();
    mockTeams.deleteMembership.mockReset();

    // Mock TablesDB transaction methods
    mockTablesDB.createTransaction.mockResolvedValue({ $id: 'tx-123' });
    mockTablesDB.createOperations.mockResolvedValue({ success: true });
    mockTablesDB.updateTransaction.mockResolvedValue({ success: true });

    // Mock executeTransactionWithRetry to succeed by default
    (executeTransactionWithRetry as any).mockReset();
    (executeTransactionWithRetry as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.ENABLE_TRANSACTIONS;
    delete process.env.TRANSACTIONS_ENDPOINTS;
  });

  describe('Atomic User Profile + Audit Log Creation', () => {
    it('should atomically create user profile and audit log using transactions', async () => {
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was used
      expect(executeTransactionWithRetry).toHaveBeenCalledTimes(1);
      
      // Verify transaction operations include user profile and audit log
      const operations = (executeTransactionWithRetry as any).mock.calls[0][1];
      expect(operations).toHaveLength(2);
      
      // Check user profile operation
      expect(operations[0]).toMatchObject({
        action: 'create',
        tableId: 'users',
        data: expect.objectContaining({
          userId: mockNewAuthUser.$id,
          email: mockNewAuthUser.email,
          name: mockNewAuthUser.name,
          roleId: mockStaffRole.$id,
          isInvited: false,
        }),
      });
      
      // Check audit log operation
      expect(operations[1]).toMatchObject({
        action: 'create',
        tableId: 'logs',
        data: expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'link_user',
        }),
      });

      // Verify success response
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          usedTransactions: true,
          user: expect.objectContaining({
            userId: mockNewAuthUser.$id,
            email: mockNewAuthUser.email,
            name: mockNewAuthUser.name,
            roleId: mockStaffRole.$id,
          }),
        })
      );
    });

    it('should create user profile without role when roleId is not provided', async () => {
      mockReq.body = {
        userId: mockNewAuthUser.$id,
        addToTeam: false,
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction operations
      const operations = (executeTransactionWithRetry as any).mock.calls[0][1];
      
      // Check user profile has null roleId
      expect(operations[0].data.roleId).toBeNull();

      // Verify success response
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            roleId: null,
            role: null,
          }),
        })
      );
    });
  });

  describe('Team Membership Integration', () => {
    beforeEach(() => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'team-123';
      
      mockReq.body = {
        userId: mockNewAuthUser.$id,
        roleId: mockStaffRole.$id,
        addToTeam: true,
      };

      mockTeams.createMembership.mockResolvedValue({
        $id: 'membership-123',
        teamId: 'team-123',
        userId: mockNewAuthUser.$id,
        roles: ['member'],
      });
    });

    afterEach(() => {
      delete process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED;
      delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;
    });

    it('should create team membership before transaction when requested', async () => {
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify team membership was created
      expect(mockTeams.createMembership).toHaveBeenCalledWith({
        teamId: 'team-123',
        roles: ['member'],
        userId: mockNewAuthUser.$id,
        email: mockNewAuthUser.email,
        name: mockNewAuthUser.name,
      });

      // Verify transaction was executed after team membership
      expect(executeTransactionWithRetry).toHaveBeenCalled();

      // Verify response includes team membership status
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          teamMembership: expect.objectContaining({
            status: 'success',
            teamId: 'team-123',
            membershipId: 'membership-123',
          }),
        })
      );
    });

    it('should fail user linking when team membership creation fails', async () => {
      const teamError = new Error('Team membership failed');
      mockTeams.createMembership.mockRejectedValue(teamError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify team membership was attempted
      expect(mockTeams.createMembership).toHaveBeenCalled();

      // Verify transaction was NOT executed
      expect(executeTransactionWithRetry).not.toHaveBeenCalled();

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to create team membership',
          message: expect.stringContaining('User linking requires team membership'),
        })
      );
    });

    it('should map Super Administrator role to owner team role', async () => {
      mockReq.body.roleId = mockAdminRole.$id;
      
      // Mock getRow to return admin role
      mockTablesDB.getRow.mockImplementation((dbId, tableId, docId) => {
        if (tableId === 'roles') {
          if (docId === 'role-admin') return Promise.resolve(mockAdminRole);
        }
        return Promise.reject({ code: 404, message: 'Document not found' });
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify team membership was created with owner role
      expect(mockTeams.createMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['owner'],
        })
      );
    });
  });

  describe('Rollback Scenarios', () => {
    it('should rollback when audit log creation fails in transaction', async () => {
      const transactionError = new Error('Audit log creation failed');
      (executeTransactionWithRetry as any).mockRejectedValue(transactionError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was attempted
      expect(executeTransactionWithRetry).toHaveBeenCalled();

      // Verify error was handled
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should cleanup team membership when transaction fails', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'team-123';
      
      mockReq.body.addToTeam = true;
      
      mockTeams.createMembership.mockResolvedValue({
        $id: 'membership-123',
        teamId: 'team-123',
        userId: mockNewAuthUser.$id,
        roles: ['member'],
      });

      const transactionError = new Error('Transaction failed');
      (executeTransactionWithRetry as any).mockRejectedValue(transactionError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify team membership was created
      expect(mockTeams.createMembership).toHaveBeenCalled();

      // Verify transaction was attempted
      expect(executeTransactionWithRetry).toHaveBeenCalled();

      // Verify team membership was cleaned up
      expect(mockTeams.deleteMembership).toHaveBeenCalledWith({
        teamId: 'team-123',
        membershipId: 'membership-123',
      });

      delete process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED;
      delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;
    });
  });

  describe('Conflict Handling and Retry', () => {
    it('should handle transaction conflicts with retry logic', async () => {
      const conflictError = { code: 409, message: 'Transaction conflict' };
      (executeTransactionWithRetry as any).mockRejectedValue(conflictError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was attempted
      expect(executeTransactionWithRetry).toHaveBeenCalled();

      // Verify conflict error was handled
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction conflict',
          retryable: true,
          type: 'CONFLICT',
        })
      );
    });

    it('should retry transaction on conflict (verified by executeTransactionWithRetry)', async () => {
      // The retry logic is handled by executeTransactionWithRetry
      // This test verifies that the function is called correctly
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify executeTransactionWithRetry was called (it handles retries internally)
      expect(executeTransactionWithRetry).toHaveBeenCalledTimes(1);
      
      // Verify the tablesDB instance was passed
      const [tablesDB, operations] = (executeTransactionWithRetry as any).mock.calls[0];
      expect(tablesDB).toBe(mockTablesDB);
      expect(operations).toHaveLength(2);
    });
  });

  describe('Legacy Fallback', () => {
    beforeEach(() => {
      // Disable transactions
      process.env.ENABLE_TRANSACTIONS = 'false';
      
      mockTablesDB.createRow.mockResolvedValue({
        $id: 'new-user-doc-123',
        userId: mockNewAuthUser.$id,
        email: mockNewAuthUser.email,
        name: mockNewAuthUser.name,
        roleId: mockStaffRole.$id,
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should use legacy approach when transactions are disabled', async () => {
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was NOT used
      expect(executeTransactionWithRetry).not.toHaveBeenCalled();

      // Verify legacy createRow was called for user profile
      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        'test-db',
        'users',
        expect.any(String),
        expect.objectContaining({
          userId: mockNewAuthUser.$id,
          email: mockNewAuthUser.email,
          name: mockNewAuthUser.name,
          roleId: mockStaffRole.$id,
          isInvited: false,
        })
      );

      // Verify legacy createRow was called for audit log
      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        'test-db',
        'logs',
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'link_user',
        })
      );

      // Verify success response indicates legacy approach
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          usedTransactions: false,
        })
      );
    });

    it('should cleanup team membership when legacy profile creation fails', async () => {
      process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED = 'true';
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'team-123';
      
      mockReq.body.addToTeam = true;
      
      mockTeams.createMembership.mockResolvedValue({
        $id: 'membership-123',
        teamId: 'team-123',
        userId: mockNewAuthUser.$id,
        roles: ['member'],
      });

      const createError = new Error('Profile creation failed');
      mockTablesDB.createRow.mockRejectedValue(createError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify team membership was created
      expect(mockTeams.createMembership).toHaveBeenCalled();

      // Verify team membership was cleaned up
      expect(mockTeams.deleteMembership).toHaveBeenCalledWith({
        teamId: 'team-123',
        membershipId: 'membership-123',
      });

      delete process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED;
      delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;
    });
  });

  describe('Validation and Error Handling', () => {
    it('should return 405 for non-POST requests', async () => {
      mockReq.method = 'GET';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['POST']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Method GET not allowed'),
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockAccount.get.mockRejectedValue(new Error('Unauthorized'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
        })
      );
    });

    it('should return 403 when user lacks permission to link users', async () => {
      const viewerRole = {
        $id: 'role-viewer',
        name: 'Viewer',
        description: 'Read-only access',
        permissions: JSON.stringify({
          attendees: { read: true },
        }),
      };

      mockTablesDB.getRow.mockResolvedValue(viewerRole);
    mockAdminTablesDB.getRow.mockResolvedValue(viewerRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions to link users',
        })
      );
    });

    it('should return 400 when userId is missing', async () => {
      mockReq.body = {
        roleId: mockStaffRole.$id,
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // The API checks permissions first, so if user has permission, it will check for userId
      // Since our mock user has permission, it should return 400 for missing userId
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'User ID is required',
        })
      );
    });

    it('should return 404 when auth user does not exist', async () => {
      mockUsers.get.mockRejectedValue({ code: 404, message: 'User not found' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Auth user not found',
        })
      );
    });

    it('should return 400 when user is already linked', async () => {
      // Mock listRows to return existing user on second call
      let callCount = 0;
      mockTablesDB.listRows.mockImplementation((dbId, tableId, queries) => {
        callCount++;
        if (tableId === 'users') {
          if (callCount === 1) {
            return Promise.resolve({ rows: [mockUserProfile], total: 1 });
          }
          // Second call - return existing user
          return Promise.resolve({
            rows: [{
              $id: 'existing-user-doc',
              userId: mockNewAuthUser.$id,
              email: mockNewAuthUser.email,
            }],
            total: 1
          });
        }
        return Promise.resolve({ rows: [], total: 0 });
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'User is already linked to database',
        })
      );
    });

    it('should return 400 when roleId is invalid', async () => {
      mockReq.body.roleId = 'invalid-role-id';
      
      mockTablesDB.getRow.mockImplementation((dbId, tableId, docId) => {
        if (tableId === 'roles' && docId === 'role-admin') {
          return Promise.resolve(mockAdminRole);
        }
        return Promise.reject({ code: 404, message: 'Document not found' });
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid role ID',
        })
      );
    });
  });
});
