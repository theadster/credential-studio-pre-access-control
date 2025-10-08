import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../[id]';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
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
      };
    });

    it('should update custom field successfully', async () => {
      const updatedField = {
        ...mockCustomField,
        fieldName: 'Updated Company Name',
        required: false,
        order: 2,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce(updatedField);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        'field-123',
        expect.objectContaining({
          fieldName: 'Updated Company Name',
          fieldType: 'text',
          required: false,
          order: 2,
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
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce({
        ...mockCustomField,
        fieldOptions: JSON.stringify(['Engineering', 'Sales', 'Marketing']),
      });
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        'field-123',
        expect.objectContaining({
          fieldOptions: JSON.stringify(['Engineering', 'Sales', 'Marketing']),
        })
      );
    });

    it('should keep fieldOptions as string if already a string', async () => {
      mockReq.body = {
        fieldName: 'Department',
        fieldType: 'select',
        fieldOptions: '["Engineering","Sales","Marketing"]',
        order: 1,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce({
        ...mockCustomField,
        fieldOptions: '["Engineering","Sales","Marketing"]',
      });
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        'field-123',
        expect.objectContaining({
          fieldOptions: '["Engineering","Sales","Marketing"]',
        })
      );
    });

    it('should set fieldOptions to null if not provided', async () => {
      mockReq.body = {
        fieldName: 'Job Title',
        fieldType: 'text',
        order: 1,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce({
        ...mockCustomField,
        fieldOptions: null,
      });
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        'field-123',
        expect.objectContaining({
          fieldOptions: null,
        })
      );
    });

    it('should default required to false if not provided', async () => {
      mockReq.body = {
        fieldName: 'Job Title',
        fieldType: 'text',
        order: 1,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce({
        ...mockCustomField,
        required: false,
      });
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        'field-123',
        expect.objectContaining({
          required: false,
        })
      );
    });

    it('should default order to 1 if not provided', async () => {
      mockReq.body = {
        fieldName: 'Job Title',
        fieldType: 'text',
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce({
        ...mockCustomField,
        order: 1,
      });
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        'field-123',
        expect.objectContaining({
          order: 1,
        })
      );
    });

    it('should create log entry for custom field update', async () => {
      const updatedField = {
        ...mockCustomField,
        fieldName: 'Updated Company Name',
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce(updatedField);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'update',
          details: expect.stringContaining('custom_field'),
        })
      );
    });
  });

  describe('DELETE /api/custom-fields/[id]', () => {
    beforeEach(() => {
      mockReq.method = 'DELETE';
    });

    it('should delete custom field successfully', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      mockDatabases.deleteDocument.mockResolvedValueOnce(undefined);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.deleteDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        'field-123'
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Custom field deleted successfully',
      });
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
    });

    it('should create log entry for custom field deletion', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockCustomField);

      mockDatabases.deleteDocument.mockResolvedValueOnce(undefined);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'delete',
          details: expect.stringContaining('custom_field'),
        })
      );
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
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
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
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

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
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

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
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      const conflictError = new Error('Conflict');
      (conflictError as any).code = 409;
      mockDatabases.updateDocument.mockRejectedValueOnce(conflictError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Conflict - resource already exists' });
    });
  });
});
