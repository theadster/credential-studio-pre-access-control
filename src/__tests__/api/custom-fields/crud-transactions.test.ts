import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import createHandler from '../index';
import updateHandler from '../[id]';
import reorderHandler from '../reorder';
import { mockAccount, mockDatabases, mockTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
    tablesDB: mockTablesDB,
  })),
}));

// Mock the string utility
vi.mock('@/util/string', () => ({
  generateInternalFieldName: vi.fn((fieldName: string) => 
    fieldName.toLowerCase().replace(/\s+/g, '_')
  ),
}));

// Mock log settings
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(true)),
}));

// Mock transaction utilities
vi.mock('@/lib/transactions', async () => {
  const actual = await vi.importActual('@/lib/transactions');
  return {
    ...actual,
    executeTransactionWithRetry: vi.fn(async (tablesDB, operations, options) => {
      // Simulate successful transaction
      return Promise.resolve();
    }),
    handleTransactionError: vi.fn((error, res) => {
      if (error.code === 409) {
        return res.status(409).json({
          error: 'Transaction conflict',
          message: 'Data was modified by another user. Please refresh and try again.',
          retryable: true,
        });
      }
      return res.status(500).json({ error: 'Transaction failed' });
    }),
  };
});

describe('/api/custom-fields - Transaction Integration Tests', () => {
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

  const mockEventSettings = {
    $id: 'event-settings-123',
    eventName: 'Test Event',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'POST',
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
    mockDatabases.getDocument.mockResolvedValue(mockAdminRole);
    
    // Mock TablesDB transaction methods
    mockTablesDB.createTransaction.mockResolvedValue({ $id: 'tx-123' });
    mockTablesDB.createOperations.mockResolvedValue({ success: true });
    mockTablesDB.updateTransaction.mockResolvedValue({ success: true });
  });

  describe('POST /api/custom-fields - Create with Audit Log (Transaction)', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
        fieldType: 'text',
        required: true,
        order: 1,
      };
    });

    it('should create custom field and audit log atomically in a single transaction', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      await createHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was executed
      expect(executeTransactionWithRetry).toHaveBeenCalled();
      
      const calls = (executeTransactionWithRetry as any).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      const operations = calls[0][1];
      expect(operations).toHaveLength(2);
      
      // Verify custom field creation operation
      expect(operations[0]).toMatchObject({
        action: 'create',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        data: expect.objectContaining({
          fieldName: 'Job Title',
          fieldType: 'text',
          required: true,
        }),
      });
      
      // Verify audit log operation
      expect(operations[1]).toMatchObject({
        action: 'create',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        data: expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'create',
        }),
      });

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should include audit log details in transaction operations', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      await createHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify audit log details
      const calls = (executeTransactionWithRetry as any).mock.calls;
      const operations = calls[0][1];
      const auditLogOp = operations.find((op: any) => 
        op.tableId === process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID
      );

      expect(auditLogOp).toBeDefined();
      expect(auditLogOp.data.userId).toBe(mockAuthUser.$id);
      expect(auditLogOp.data.action).toBe('create');
      
      const details = JSON.parse(auditLogOp.data.details);
      expect(details.type).toBe('custom_field');
      expect(details.fieldName).toBe('Job Title');
      expect(details.fieldType).toBe('text');
    });

    it('should rollback custom field creation if audit log fails', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      // Simulate transaction failure
      (executeTransactionWithRetry as any).mockRejectedValueOnce(
        new Error('Transaction failed')
      );

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      await createHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction failed',
        })
      );
    });

    it('should set version to 0 for new custom fields', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      await createHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const calls = (executeTransactionWithRetry as any).mock.calls;
      const operations = calls[0][1];
      const createOp = operations.find((op: any) => 
        op.tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID
      );

      expect(createOp.data.version).toBe(0);
    });
  });

  describe('PUT /api/custom-fields/[id] - Update with Audit Log (Transaction)', () => {
    const mockCustomField = {
      $id: 'field-123',
      eventSettingsId: 'event-settings-123',
      fieldName: 'Job Title',
      internalFieldName: 'job_title',
      fieldType: 'text',
      fieldOptions: null,
      required: true,
      order: 1,
      showOnMainPage: true,
      version: 0,
      deletedAt: null,
      $createdAt: '2024-01-01T00:00:00.000Z',
      $updatedAt: '2024-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
      mockReq.method = 'PUT';
      mockReq.query = { id: 'field-123' };
      mockReq.body = {
        fieldName: 'Job Title Updated',
        fieldType: 'text',
        required: false,
        order: 1,
        version: 0,
        showOnMainPage: false,
      };
    });

    it('should update custom field and audit log atomically in a single transaction', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was executed
      expect(executeTransactionWithRetry).toHaveBeenCalledWith(
        mockTablesDB,
        expect.arrayContaining([
          expect.objectContaining({
            action: 'update',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
            rowId: 'field-123',
            data: expect.objectContaining({
              fieldName: 'Job Title Updated',
              version: 1, // Incremented
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
        expect.objectContaining({
          maxRetries: 3,
          retryDelay: 100,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should increment version number for optimistic locking', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const calls = (executeTransactionWithRetry as any).mock.calls;
      const operations = calls[0][1];
      const updateOp = operations.find((op: any) => 
        op.action === 'update' && 
        op.tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID
      );

      expect(updateOp.data.version).toBe(1); // 0 + 1
    });

    it('should track field changes in audit log', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const calls = (executeTransactionWithRetry as any).mock.calls;
      const operations = calls[0][1];
      const auditLogOp = operations.find((op: any) => 
        op.tableId === process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID
      );

      const details = JSON.parse(auditLogOp.data.details);
      expect(details.changes).toBeDefined();
      expect(details.changes.fieldName).toEqual({
        from: 'Job Title',
        to: 'Job Title Updated',
      });
      expect(details.changes.showOnMainPage).toEqual({
        from: true,
        to: false,
      });
    });

    it('should return 409 if version mismatch detected', async () => {
      mockReq.body.version = 5; // Wrong version
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField); // version is 0

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Conflict: Document has been modified by another user',
          details: expect.objectContaining({
            currentVersion: 0,
            providedVersion: 5,
          }),
        })
      );
    });

    it('should rollback update if audit log fails', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      // Simulate transaction failure
      (executeTransactionWithRetry as any).mockRejectedValueOnce(
        new Error('Audit log creation failed')
      );

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should return 410 if field is soft-deleted', async () => {
      const deletedField = {
        ...mockCustomField,
        deletedAt: '2024-01-15T00:00:00.000Z',
      };
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(deletedField);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(410);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Cannot update deleted custom field',
          deletedAt: '2024-01-15T00:00:00.000Z',
        })
      );
    });
  });

  describe('DELETE /api/custom-fields/[id] - Soft Delete with Audit Log (Transaction)', () => {
    const mockCustomField = {
      $id: 'field-123',
      eventSettingsId: 'event-settings-123',
      fieldName: 'Job Title',
      internalFieldName: 'job_title',
      fieldType: 'text',
      fieldOptions: null,
      required: true,
      order: 1,
      showOnMainPage: true,
      version: 2,
      deletedAt: null,
      $createdAt: '2024-01-01T00:00:00.000Z',
      $updatedAt: '2024-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
      mockReq.method = 'DELETE';
      mockReq.query = { id: 'field-123' };
    });

    it('should soft delete custom field and audit log atomically in a single transaction', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was executed
      expect(executeTransactionWithRetry).toHaveBeenCalledWith(
        mockTablesDB,
        expect.arrayContaining([
          expect.objectContaining({
            action: 'update',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
            rowId: 'field-123',
            data: expect.objectContaining({
              deletedAt: expect.any(String),
              version: 3, // Incremented from 2
            }),
          }),
          expect.objectContaining({
            action: 'create',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
            data: expect.objectContaining({
              userId: mockAuthUser.$id,
              action: 'delete',
            }),
          }),
        ]),
        expect.objectContaining({
          maxRetries: 3,
          retryDelay: 100,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should set deletedAt timestamp in soft delete', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const calls = (executeTransactionWithRetry as any).mock.calls;
      const operations = calls[0][1];
      const updateOp = operations.find((op: any) => 
        op.action === 'update' && 
        op.tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID
      );

      expect(updateOp.data.deletedAt).toBeDefined();
      expect(typeof updateOp.data.deletedAt).toBe('string');
      expect(new Date(updateOp.data.deletedAt).getTime()).toBeGreaterThan(0);
    });

    it('should include soft delete details in audit log', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const calls = (executeTransactionWithRetry as any).mock.calls;
      const operations = calls[0][1];
      const auditLogOp = operations.find((op: any) => 
        op.tableId === process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID
      );

      const details = JSON.parse(auditLogOp.data.details);
      expect(details.type).toBe('custom_field');
      expect(details.fieldId).toBe('field-123');
      expect(details.fieldName).toBe('Job Title');
      expect(details.deleteType).toBe('soft_delete');
      expect(details.note).toContain('Orphaned values remain');
    });

    it('should return 410 if field is already soft-deleted', async () => {
      const deletedField = {
        ...mockCustomField,
        deletedAt: '2024-01-15T00:00:00.000Z',
      };
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(deletedField);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(410);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Custom field already deleted',
          deletedAt: '2024-01-15T00:00:00.000Z',
        })
      );
    });

    it('should rollback soft delete if audit log fails', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      // Simulate transaction failure
      (executeTransactionWithRetry as any).mockRejectedValueOnce(
        new Error('Audit log creation failed')
      );

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should increment version on soft delete for consistency', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const calls = (executeTransactionWithRetry as any).mock.calls;
      const operations = calls[0][1];
      const updateOp = operations.find((op: any) => 
        op.action === 'update' && 
        op.tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID
      );

      expect(updateOp.data.version).toBe(3); // 2 + 1
    });
  });

  describe('PUT /api/custom-fields/reorder - Reorder with Audit Log (Transaction)', () => {
    const mockFields = [
      {
        $id: 'field-1',
        fieldName: 'Field 1',
        order: 1,
        $createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        $id: 'field-2',
        fieldName: 'Field 2',
        order: 2,
        $createdAt: '2024-01-02T00:00:00.000Z',
      },
      {
        $id: 'field-3',
        fieldName: 'Field 3',
        order: 3,
        $createdAt: '2024-01-03T00:00:00.000Z',
      },
    ];

    beforeEach(() => {
      mockReq.method = 'PUT';
      mockReq.body = {
        fieldOrders: [
          { id: 'field-1', order: 3 },
          { id: 'field-2', order: 1 },
          { id: 'field-3', order: 2 },
        ],
      };
    });

    it('should reorder all fields and audit log atomically in a single transaction', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      // Mock getDocument for each field verification
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockFields[0])
        .mockResolvedValueOnce(mockFields[1])
        .mockResolvedValueOnce(mockFields[2]);

      await reorderHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was executed with all updates
      expect(executeTransactionWithRetry).toHaveBeenCalledWith(
        mockTablesDB,
        expect.arrayContaining([
          expect.objectContaining({
            action: 'update',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
            rowId: 'field-1',
            data: { order: 3 },
          }),
          expect.objectContaining({
            action: 'update',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
            rowId: 'field-2',
            data: { order: 1 },
          }),
          expect.objectContaining({
            action: 'update',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
            rowId: 'field-3',
            data: { order: 2 },
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
        expect.objectContaining({
          maxRetries: 3,
          retryDelay: 100,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should include all field orders in audit log', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockFields[0])
        .mockResolvedValueOnce(mockFields[1])
        .mockResolvedValueOnce(mockFields[2]);

      await reorderHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const calls = (executeTransactionWithRetry as any).mock.calls;
      const operations = calls[0][1];
      const auditLogOp = operations.find((op: any) => 
        op.tableId === process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID
      );

      const details = JSON.parse(auditLogOp.data.details);
      expect(details.type).toBe('custom_fields_reorder');
      expect(details.fieldCount).toBe(3);
      expect(details.fieldOrders).toEqual([
        { id: 'field-1', order: 3 },
        { id: 'field-2', order: 1 },
        { id: 'field-3', order: 2 },
      ]);
    });

    it('should rollback all reorder operations if any update fails', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      // Simulate transaction failure
      (executeTransactionWithRetry as any).mockRejectedValueOnce(
        new Error('Field update failed')
      );

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockFields[0])
        .mockResolvedValueOnce(mockFields[1])
        .mockResolvedValueOnce(mockFields[2]);

      await reorderHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction failed',
        })
      );
    });

    it('should return 404 if any field does not exist', async () => {
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockFields[0])
        .mockRejectedValueOnce(new Error('Not found')); // field-2 not found

      await reorderHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Custom field not found',
          fieldId: 'field-2',
        })
      );
    });

    it('should validate all field orders before starting transaction', async () => {
      mockReq.body = {
        fieldOrders: [
          { id: 'field-1', order: 'invalid' }, // Invalid order type
        ],
      };

      await reorderHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid field order entry',
          details: 'Each entry must have a valid order number',
        })
      );
    });

    it('should handle empty field orders array', async () => {
      mockReq.body = {
        fieldOrders: [],
      };

      await reorderHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Field orders array cannot be empty',
        })
      );
    });

    it('should handle single field reorder', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockReq.body = {
        fieldOrders: [
          { id: 'field-1', order: 5 },
        ],
      };

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockFields[0]);

      await reorderHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(executeTransactionWithRetry).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Transaction Conflict Handling', () => {
    it('should retry on transaction conflict for create operation', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      // Note: The retry logic is handled inside executeTransactionWithRetry itself
      // This test verifies that the handler calls the transaction function
      // The actual retry behavior is tested in the transaction utilities tests
      
      mockReq.method = 'POST';
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
        fieldType: 'text',
        order: 1,
      };

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      await createHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction function was called
      expect(executeTransactionWithRetry).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should return 409 after max retries exceeded', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      const conflictError = { code: 409, message: 'Conflict' };
      (executeTransactionWithRetry as any).mockRejectedValueOnce(conflictError);

      mockReq.method = 'POST';
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
        fieldType: 'text',
        order: 1,
      };

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      await createHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify error response (handleTransactionError is called internally)
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction conflict',
          retryable: true,
        })
      );
    });
  });

  describe('Transaction Atomicity Guarantees', () => {
    it('should ensure no partial creates - both field and log succeed or both fail', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockReq.method = 'POST';
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
        fieldType: 'text',
        order: 1,
      };

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      await createHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify both operations are in the same transaction
      const calls = (executeTransactionWithRetry as any).mock.calls;
      const operations = calls[0][1];
      
      expect(operations).toHaveLength(2);
      expect(operations[0].tableId).toBe(process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID);
      expect(operations[1].tableId).toBe(process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID);
    });

    it('should ensure no partial updates - both field and log succeed or both fail', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      const mockField = {
        $id: 'field-123',
        fieldName: 'Old Name',
        fieldType: 'text',
        version: 0,
        deletedAt: null,
        $createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.method = 'PUT';
      mockReq.query = { id: 'field-123' };
      mockReq.body = {
        fieldName: 'New Name',
        fieldType: 'text',
        version: 0,
      };

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockField);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify both operations are in the same transaction
      const calls = (executeTransactionWithRetry as any).mock.calls;
      const operations = calls[0][1];
      
      expect(operations).toHaveLength(2);
      expect(operations[0].action).toBe('update');
      expect(operations[1].action).toBe('create');
    });

    it('should ensure no partial reorders - all fields and log succeed or all fail', async () => {
      const { executeTransactionWithRetry } = await import('@/lib/transactions');
      
      mockReq.method = 'PUT';
      mockReq.body = {
        fieldOrders: [
          { id: 'field-1', order: 3 },
          { id: 'field-2', order: 1 },
          { id: 'field-3', order: 2 },
        ],
      };

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce({ $id: 'field-1' })
        .mockResolvedValueOnce({ $id: 'field-2' })
        .mockResolvedValueOnce({ $id: 'field-3' });

      await reorderHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify all operations are in the same transaction
      const calls = (executeTransactionWithRetry as any).mock.calls;
      const operations = calls[0][1];
      
      expect(operations).toHaveLength(4); // 3 updates + 1 log
      expect(operations.filter((op: any) => op.action === 'update')).toHaveLength(3);
      expect(operations.filter((op: any) => op.action === 'create')).toHaveLength(1);
    });
  });

  describe('Permission Checks', () => {
    it('should enforce create permission for POST', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({
          customFields: { read: true, create: false },
        }),
      };

      mockReq.method = 'POST';
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
        fieldType: 'text',
      };

      mockDatabases.getDocument.mockResolvedValueOnce(noPermRole);

      await createHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to create custom fields',
      });
    });

    it('should enforce update permission for PUT', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({
          customFields: { read: true, update: false },
        }),
      };

      mockReq.method = 'PUT';
      mockReq.query = { id: 'field-123' };
      mockReq.body = {
        fieldName: 'Updated',
        fieldType: 'text',
        version: 0,
      };

      mockDatabases.getDocument.mockResolvedValueOnce(noPermRole);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to update custom fields',
      });
    });

    it('should enforce delete permission for DELETE', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({
          customFields: { read: true, delete: false },
        }),
      };

      mockReq.method = 'DELETE';
      mockReq.query = { id: 'field-123' };

      mockDatabases.getDocument.mockResolvedValueOnce(noPermRole);

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to delete custom fields',
      });
    });
  });
});
