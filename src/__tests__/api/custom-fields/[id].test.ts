import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../[id]';
import { mockAccount, mockDatabases, mockTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
    tablesDB: mockTablesDB,
  })),
}));

describe('/api/custom-fields/[id] - Custom Field Detail API', () => {
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

  const mockCustomField = {
    $id: 'field-123',
    eventSettingsId: 'event-settings-123',
    fieldName: 'Company Name',
    internalFieldName: 'company_name',
    fieldType: 'text',
    fieldOptions: null,
    required: true,
    order: 1,
    version: 0,
    showOnMainPage: true,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'GET',
      query: { id: 'field-123' },
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
    mockDatabases.getDocument.mockResolvedValue(mockCustomField);
    mockDatabases.createDocument.mockResolvedValue({
      $id: 'new-log-123',
      userId: mockAuthUser.$id,
      action: 'view',
      details: '{}',
    });
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

  describe('Request Validation', () => {
    it('should return 400 if id is missing', async () => {
      mockReq.query = {};

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid custom field ID' });
    });

    it('should return 400 if id is not a string', async () => {
      mockReq.query = { id: ['field-123', 'field-456'] };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid custom field ID' });
    });
  });

  describe('GET /api/custom-fields/[id]', () => {
    it('should return custom field by id', async () => {
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.getDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        'field-123'
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockCustomField);
    });

    it('should return 404 if custom field not found', async () => {
      mockDatabases.getDocument.mockRejectedValueOnce(new Error('Not found'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Custom field not found' });
    });

    it('should return custom field with fieldOptions as JSON string', async () => {
      const fieldWithOptions = {
        ...mockCustomField,
        fieldType: 'select',
        fieldOptions: JSON.stringify(['Option 1', 'Option 2', 'Option 3']),
      };

      mockDatabases.getDocument.mockResolvedValueOnce(fieldWithOptions);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldOptions: JSON.stringify(['Option 1', 'Option 2', 'Option 3']),
        })
      );
    });
  });

  describe('PUT /api/custom-fields/[id]', () => {
    beforeEach(() => {
      mockReq.method = 'PUT';
      mockReq.body = {
        fieldName: 'Updated Company Name',
        fieldType: 'text',
        required: false,
        order: 2,
        version: 0,
      };
    });

    it('should update custom field successfully', async () => {
      const updatedField = {
        ...mockCustomField,
        fieldName: 'Updated Company Name',
        required: false,
        order: 2,
        version: 1,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);
      mockDatabases.updateDocument.mockResolvedValueOnce(updatedField);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          collectionId: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
          documentId: 'field-123',
          data: expect.objectContaining({
            fieldName: 'Updated Company Name',
            fieldType: 'text',
            required: false,
            order: 2,
            showOnMainPage: true,
            version: 1,
          })
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(updatedField);
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
        error: 'Insufficient permissions to update custom fields',
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

    it('should return 400 if fieldName is missing', async () => {
      mockReq.body = {
        fieldType: 'text',
        order: 1,
        version: 0,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if fieldType is missing', async () => {
      mockReq.body = {
        fieldName: 'Updated Name',
        order: 1,
        version: 0,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should serialize fieldOptions object to JSON string', async () => {
      mockReq.body = {
        fieldName: 'Department',
        fieldType: 'select',
        fieldOptions: ['Engineering', 'Sales', 'Marketing'],
        order: 1,
        version: 0,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);
      mockDatabases.updateDocument.mockResolvedValueOnce({
        ...mockCustomField,
        fieldOptions: JSON.stringify(['Engineering', 'Sales', 'Marketing']),
        version: 1,
      });
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fieldOptions: JSON.stringify(['Engineering', 'Sales', 'Marketing']),
          })
        })
      );
    });

    it('should keep fieldOptions as string if already a string', async () => {
      mockReq.body = {
        fieldName: 'Department',
        fieldType: 'select',
        fieldOptions: '["Engineering","Sales","Marketing"]',
        order: 1,
        version: 0,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);
      mockDatabases.updateDocument.mockResolvedValueOnce({
        ...mockCustomField,
        fieldOptions: '["Engineering","Sales","Marketing"]',
        version: 1,
      });
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fieldOptions: '["Engineering","Sales","Marketing"]',
          })
        })
      );
    });

    it('should set fieldOptions to null if not provided', async () => {
      mockReq.body = {
        fieldName: 'Job Title',
        fieldType: 'text',
        order: 1,
        version: 0,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);
      mockDatabases.updateDocument.mockResolvedValueOnce({
        ...mockCustomField,
        fieldOptions: null,
        version: 1,
      });
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fieldOptions: null,
          })
        })
      );
    });

    it('should default required to false if not provided', async () => {
      mockReq.body = {
        fieldName: 'Job Title',
        fieldType: 'text',
        order: 1,
        version: 0,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);
      mockDatabases.updateDocument.mockResolvedValueOnce({
        ...mockCustomField,
        required: false,
        version: 1,
      });
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            required: false,
          })
        })
      );
    });

    it('should default order to 1 if not provided', async () => {
      mockReq.body = {
        fieldName: 'Job Title',
        fieldType: 'text',
        version: 0,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);
      mockDatabases.updateDocument.mockResolvedValueOnce({
        ...mockCustomField,
        order: 1,
        version: 1,
      });
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 1,
          })
        })
      );
    });

    it('should create log entry for custom field update', async () => {
      const updatedField = {
        ...mockCustomField,
        fieldName: 'Updated Company Name',
        version: 1,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);
      mockDatabases.updateDocument.mockResolvedValueOnce(updatedField);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          collectionId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
          documentId: expect.any(String),
          data: expect.objectContaining({
            userId: mockAuthUser.$id,
            action: 'update',
            details: expect.stringContaining('custom_field'),
          })
        })
      );
    });

    it('should update showOnMainPage to false when provided', async () => {
      mockReq.body = {
        fieldName: 'Company Name',
        fieldType: 'text',
        required: true,
        order: 1,
        version: 0,
        showOnMainPage: false,
      };

      const updatedField = {
        ...mockCustomField,
        showOnMainPage: false,
        version: 1,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);
      mockDatabases.updateDocument.mockResolvedValueOnce(updatedField);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            showOnMainPage: false,
          })
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(updatedField);
    });

    it('should update showOnMainPage to true when provided', async () => {
      mockReq.body = {
        fieldName: 'Company Name',
        fieldType: 'text',
        required: true,
        order: 1,
        version: 0,
        showOnMainPage: true,
      };

      const updatedField = {
        ...mockCustomField,
        showOnMainPage: true,
        version: 1,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);
      mockDatabases.updateDocument.mockResolvedValueOnce(updatedField);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            showOnMainPage: true,
          })
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(updatedField);
    });

    it('should default showOnMainPage to true if not provided', async () => {
      mockReq.body = {
        fieldName: 'Company Name',
        fieldType: 'text',
        required: true,
        order: 1,
        version: 0,
      };

      const updatedField = {
        ...mockCustomField,
        showOnMainPage: true,
        version: 1,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);
      mockDatabases.updateDocument.mockResolvedValueOnce(updatedField);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            showOnMainPage: true,
          })
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(updatedField);
    });

    it('should return 400 if showOnMainPage is not a boolean', async () => {
      mockReq.body = {
        fieldName: 'Company Name',
        fieldType: 'text',
        required: true,
        order: 1,
        version: 0,
        showOnMainPage: 'invalid',
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid showOnMainPage value',
        details: 'showOnMainPage must be a boolean value',
      });
    });
  });

  describe('DELETE /api/custom-fields/[id] - Transaction-Based', () => {
    beforeEach(() => {
      mockReq.method = 'DELETE';
      
      // Mock transaction flow
      mockTablesDB.createTransaction.mockResolvedValue({ $id: 'tx-123' });
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);
    });

    it('should soft delete custom field successfully using transaction', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalled();
      
      // Verify operations were created (soft delete + audit log)
      expect(mockTablesDB.createOperations).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        operations: expect.arrayContaining([
          expect.objectContaining({
            action: 'update',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
            rowId: 'field-123',
            data: expect.objectContaining({
              deletedAt: expect.any(String),
              version: 1,
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
      });

      // Verify transaction was committed
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        commit: true,
      });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Custom field deleted successfully',
          deletedAt: expect.any(String),
          note: expect.stringContaining('soft-deleted'),
        })
      );
    });

    it('should return 403 if user does not have delete permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({
          customFields: { read: true, delete: false },
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
        error: 'Insufficient permissions to delete custom fields',
      });
      
      // Verify no transaction was created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();
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
      
      // Verify no transaction was created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();
    });

    it('should return 404 if custom field not found', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockRejectedValueOnce(new Error('Not found'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Custom field not found' });
      
      // Verify no transaction was created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();
    });

    it('should return 410 if custom field is already soft-deleted', async () => {
      const deletedField = {
        ...mockCustomField,
        deletedAt: '2024-01-15T00:00:00.000Z',
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(deletedField);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(410);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Custom field already deleted',
        deletedAt: '2024-01-15T00:00:00.000Z',
      });
      
      // Verify no transaction was created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();
    });

    it('should rollback transaction on failure', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      // Simulate transaction failure
      const transactionError = new Error('Transaction failed');
      (transactionError as any).code = 500;
      mockTablesDB.createOperations.mockRejectedValueOnce(transactionError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalled();
      
      // Verify rollback was attempted
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        rollback: true,
      });

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should retry on conflict error', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      // First attempt fails with conflict
      const conflictError = new Error('Conflict');
      (conflictError as any).code = 409;
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(undefined);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction was created twice (original + retry)
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
      
      // Verify rollback was called for failed attempt
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        rollback: true,
      });
      
      // Verify commit was called for successful retry
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        commit: true,
      });

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should include audit log in transaction when logging is enabled', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify operations include both soft delete and audit log
      expect(mockTablesDB.createOperations).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        operations: expect.arrayContaining([
          expect.objectContaining({
            action: 'update',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
          }),
          expect.objectContaining({
            action: 'create',
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
            data: expect.objectContaining({
              action: 'delete',
              details: expect.stringContaining('soft_delete'),
            }),
          }),
        ]),
      });
    });

    it('should increment version number on soft delete', async () => {
      const fieldWithVersion = {
        ...mockCustomField,
        version: 5,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(fieldWithVersion);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify version was incremented
      expect(mockTablesDB.createOperations).toHaveBeenCalledWith({
        transactionId: 'tx-123',
        operations: expect.arrayContaining([
          expect.objectContaining({
            action: 'update',
            data: expect.objectContaining({
              version: 6,
            }),
          }),
        ]),
      });
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'POST';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'PUT', 'DELETE']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method POST not allowed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully for GET', async () => {
      // For GET method, errors are caught early and return 404
      mockDatabases.getDocument.mockRejectedValueOnce(new Error('Database error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Custom field not found' });
    });

    it('should handle database errors gracefully for PUT', async () => {
      mockReq.method = 'PUT';
      mockReq.body = {
        fieldName: 'Test Field',
        fieldType: 'text',
        version: 0,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);
      mockDatabases.updateDocument.mockRejectedValueOnce(new Error('Database error'));

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

    it('should handle Appwrite 401 errors for PUT', async () => {
      mockReq.method = 'PUT';
      mockReq.body = {
        fieldName: 'Test Field',
        fieldType: 'text',
        version: 0,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      const unauthorizedError = new Error('Unauthorized');
      (unauthorizedError as any).code = 401;
      mockDatabases.updateDocument.mockRejectedValueOnce(unauthorizedError);

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

    it('should handle Appwrite 404 errors for PUT', async () => {
      mockReq.method = 'PUT';
      mockReq.body = {
        fieldName: 'Test Field',
        fieldType: 'text',
        version: 0,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      const notFoundError = new Error('Not found');
      (notFoundError as any).code = 404;
      mockDatabases.updateDocument.mockRejectedValueOnce(notFoundError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Resource not found' });
    });

    it('should handle Appwrite 409 conflict errors for PUT', async () => {
      mockReq.method = 'PUT';
      mockReq.body = {
        fieldName: 'Test Field',
        fieldType: 'text',
        version: 0,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      const conflictError = new Error('Conflict');
      (conflictError as any).code = 409;
      mockDatabases.updateDocument.mockRejectedValueOnce(conflictError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Conflict - resource already exists' });
    });
  });
});
