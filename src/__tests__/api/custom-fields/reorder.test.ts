import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../reorder';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock TablesDB for transaction support
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

describe('/api/custom-fields/reorder - Custom Fields Reorder API', () => {
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
      all: true,
    }),
  };

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'PUT',
      cookies: { 'appwrite-session': 'test-session' },
      body: {
        fieldOrders: [
          { id: 'field-1', order: 1 },
          { id: 'field-2', order: 2 },
          { id: 'field-3', order: 3 },
        ],
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
    
    // Mock transaction flow
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
  });

  describe('PUT /api/custom-fields/reorder - Transaction-Based', () => {
    it('should reorder custom fields atomically using transactions', async () => {
      // Mock role first for permission check
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      
      // Mock field existence checks
      mockDatabases.getDocument
        .mockResolvedValueOnce({ $id: 'field-1', order: 5 })
        .mockResolvedValueOnce({ $id: 'field-2', order: 6 })
        .mockResolvedValueOnce({ $id: 'field-3', order: 7 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction flow
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(1);
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        commit: true
      });

      // Verify operations include all updates + audit log
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      expect(operations).toHaveLength(4); // 3 updates + 1 audit log
      
      // Verify update operations
      expect(operations[0]).toMatchObject({
        action: 'update',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        rowId: 'field-1',
        data: { order: 1 }
      });
      expect(operations[1]).toMatchObject({
        action: 'update',
        rowId: 'field-2',
        data: { order: 2 }
      });
      expect(operations[2]).toMatchObject({
        action: 'update',
        rowId: 'field-3',
        data: { order: 3 }
      });

      // Verify audit log operation
      expect(operations[3]).toMatchObject({
        action: 'create',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        data: expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'update'
        })
      });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Custom fields reordered successfully',
        fieldCount: 3
      });
    });

    it('should return 403 if user does not have update permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({
          customFields: { read: true, update: false },
        }),
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to reorder custom fields',
      });
    });

    it('should return 404 if user profile not found', async () => {
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

    it('should return 400 if fieldOrders is missing', async () => {
      mockReq.body = {};

      // Need to mock role for permission check
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid field orders data' });
    });

    it('should return 400 if fieldOrders is not an array', async () => {
      mockReq.body = {
        fieldOrders: 'not-an-array',
      };

      // Need to mock role for permission check
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid field orders data' });
    });

    it('should return 400 if fieldOrders array is empty', async () => {
      mockReq.body = {
        fieldOrders: [],
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Field orders array cannot be empty' });
    });

    it('should return 400 if field order entry has invalid id', async () => {
      mockReq.body = {
        fieldOrders: [
          { order: 1 }, // missing id
        ],
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid field order entry',
        details: 'Each entry must have a valid id string'
      });
    });

    it('should return 400 if field order entry has invalid order', async () => {
      mockReq.body = {
        fieldOrders: [
          { id: 'field-1', order: 'not-a-number' },
        ],
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid field order entry',
        details: 'Each entry must have a valid order number'
      });
    });

    it('should return 404 if a field does not exist', async () => {
      // Mock role first for permission check
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      
      // Then mock field existence checks - first two exist, third doesn't
      mockDatabases.getDocument
        .mockResolvedValueOnce({ $id: 'field-1', order: 5 })
        .mockResolvedValueOnce({ $id: 'field-2', order: 6 })
        .mockRejectedValueOnce({ code: 404, message: 'Document not found' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Custom field not found',
        fieldId: 'field-3'
      });

      // Transaction should not be started
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();
    });

    it('should rollback transaction on failure', async () => {
      // Mock role first
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      
      // Mock field existence checks
      mockDatabases.getDocument
        .mockResolvedValueOnce({ $id: 'field-1', order: 5 })
        .mockResolvedValueOnce({ $id: 'field-2', order: 6 })
        .mockResolvedValueOnce({ $id: 'field-3', order: 7 });

      // Mock transaction failure
      mockTablesDB.createOperations.mockRejectedValueOnce(new Error('Transaction failed'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify rollback was attempted
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        rollback: true
      });

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should retry on conflict errors', async () => {
      // Mock role first
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      
      // Mock field existence checks
      mockDatabases.getDocument
        .mockResolvedValueOnce({ $id: 'field-1', order: 5 })
        .mockResolvedValueOnce({ $id: 'field-2', order: 6 })
        .mockResolvedValueOnce({ $id: 'field-3', order: 7 });

      // First attempt fails with conflict, second succeeds
      mockTablesDB.createTransaction
        .mockResolvedValueOnce({ $id: 'tx-123' })
        .mockResolvedValueOnce({ $id: 'tx-456' });
      
      const conflictError = new Error('Conflict');
      (conflictError as any).code = 409;
      
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(undefined);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should have retried
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should include audit log in transaction', async () => {
      // Mock role first
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      
      // Mock field existence checks
      mockDatabases.getDocument
        .mockResolvedValueOnce({ $id: 'field-1', order: 5 })
        .mockResolvedValueOnce({ $id: 'field-2', order: 6 })
        .mockResolvedValueOnce({ $id: 'field-3', order: 7 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const auditLogOp = operations[operations.length - 1];

      expect(auditLogOp).toMatchObject({
        action: 'create',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
      });

      const logDetails = JSON.parse(auditLogOp.data.details);
      expect(logDetails).toMatchObject({
        type: 'custom_fields_reorder',
        fieldCount: 3,
        fieldOrders: [
          { id: 'field-1', order: 1 },
          { id: 'field-2', order: 2 },
          { id: 'field-3', order: 3 },
        ]
      });
    });

    it('should handle single field reorder atomically', async () => {
      mockReq.body = {
        fieldOrders: [{ id: 'field-1', order: 5 }],
      };

      // Mock role first
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      
      // Mock field existence check
      mockDatabases.getDocument.mockResolvedValueOnce({ $id: 'field-1', order: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      expect(operations).toHaveLength(2); // 1 update + 1 audit log

      expect(operations[0]).toMatchObject({
        action: 'update',
        rowId: 'field-1',
        data: { order: 5 }
      });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Custom fields reordered successfully',
        fieldCount: 1
      });
    });

    it('should handle large batch of reorders atomically', async () => {
      const largeFieldOrders = Array.from({ length: 20 }, (_, i) => ({
        id: `field-${i + 1}`,
        order: i + 1,
      }));

      mockReq.body = {
        fieldOrders: largeFieldOrders,
      };

      // Mock role first
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      
      // Mock all field existence checks
      for (let i = 0; i < 20; i++) {
        mockDatabases.getDocument.mockResolvedValueOnce({
          $id: `field-${i + 1}`,
          order: i + 10,
        });
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      expect(operations).toHaveLength(21); // 20 updates + 1 audit log

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Custom fields reordered successfully',
        fieldCount: 20
      });
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for GET method', async () => {
      mockReq.method = 'GET';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['PUT']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method GET not allowed' });
    });

    it('should return 405 for POST method', async () => {
      mockReq.method = 'POST';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['PUT']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method POST not allowed' });
    });

    it('should return 405 for DELETE method', async () => {
      mockReq.method = 'DELETE';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['PUT']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method DELETE not allowed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabases.listDocuments.mockRejectedValueOnce(new Error('Database error'));

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

    it('should handle Appwrite 401 errors', async () => {
      const unauthorizedError = new Error('Unauthorized');
      (unauthorizedError as any).code = 401;
      mockDatabases.listDocuments.mockRejectedValueOnce(unauthorizedError);

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

    it('should handle Appwrite 404 errors', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as any).code = 404;
      mockDatabases.listDocuments.mockRejectedValueOnce(notFoundError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Not found'),
          code: 404
        })
      );
    });

    it('should rollback entire transaction if any operation fails', async () => {
      // Mock role first
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      
      // Mock field existence checks
      mockDatabases.getDocument
        .mockResolvedValueOnce({ $id: 'field-1', order: 5 })
        .mockResolvedValueOnce({ $id: 'field-2', order: 6 })
        .mockResolvedValueOnce({ $id: 'field-3', order: 7 });

      // Mock transaction commit failure
      mockTablesDB.updateTransaction.mockRejectedValueOnce(new Error('Commit failed'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify rollback was attempted
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        rollback: true
      });

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});
