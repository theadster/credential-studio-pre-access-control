import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../reorder';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
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
    mockDatabases.updateDocument.mockResolvedValue({
      $id: 'field-1',
      order: 1,
    });
    mockDatabases.createDocument.mockResolvedValue({
      $id: 'new-log-123',
      userId: mockAuthUser.$id,
      action: 'update',
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

  describe('PUT /api/custom-fields/reorder', () => {
    it('should reorder custom fields successfully', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.updateDocument
        .mockResolvedValueOnce({ $id: 'field-1', order: 1 })
        .mockResolvedValueOnce({ $id: 'field-2', order: 2 })
        .mockResolvedValueOnce({ $id: 'field-3', order: 3 });

      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(3);
      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        'field-1',
        { order: 1 }
      );
      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        'field-2',
        { order: 2 }
      );
      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        'field-3',
        { order: 3 }
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true });
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

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid field orders data' });
    });

    it('should return 400 if fieldOrders is not an array', async () => {
      mockReq.body = {
        fieldOrders: 'not-an-array',
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid field orders data' });
    });

    it('should handle partial success with some failures', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.updateDocument
        .mockResolvedValueOnce({ $id: 'field-1', order: 1 })
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce({ $id: 'field-3', order: 3 });

      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(207);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        partialSuccess: true,
        updated: ['field-1', 'field-3'],
        errors: [
          {
            id: 'field-2',
            error: 'Update failed',
          },
        ],
      });
    });

    it('should return 500 if all updates fail', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.updateDocument
        .mockRejectedValueOnce(new Error('Update failed 1'))
        .mockRejectedValueOnce(new Error('Update failed 2'))
        .mockRejectedValueOnce(new Error('Update failed 3'));

      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update any fields',
        errors: [
          { id: 'field-1', error: 'Update failed 1' },
          { id: 'field-2', error: 'Update failed 2' },
          { id: 'field-3', error: 'Update failed 3' },
        ],
      });
    });

    it('should create log entry for reorder action', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.updateDocument
        .mockResolvedValueOnce({ $id: 'field-1', order: 1 })
        .mockResolvedValueOnce({ $id: 'field-2', order: 2 })
        .mockResolvedValueOnce({ $id: 'field-3', order: 3 });

      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'update',
          details: expect.stringContaining('custom_fields_reorder'),
        })
      );
    });

    it('should log correct counts in log entry', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.updateDocument
        .mockResolvedValueOnce({ $id: 'field-1', order: 1 })
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce({ $id: 'field-3', order: 3 });

      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const logCall = mockDatabases.createDocument.mock.calls[0];
      const logDetails = JSON.parse(logCall[3].details);

      expect(logDetails).toMatchObject({
        type: 'custom_fields_reorder',
        fieldCount: 3,
        successCount: 2,
        errorCount: 1,
      });
    });

    it('should handle empty fieldOrders array', async () => {
      mockReq.body = {
        fieldOrders: [],
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true });
    });

    it('should handle single field reorder', async () => {
      mockReq.body = {
        fieldOrders: [{ id: 'field-1', order: 5 }],
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce({ $id: 'field-1', order: 5 });
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(1);
      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
        'field-1',
        { order: 5 }
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true });
    });

    it('should handle large batch of reorders', async () => {
      const largeFieldOrders = Array.from({ length: 20 }, (_, i) => ({
        id: `field-${i + 1}`,
        order: i + 1,
      }));

      mockReq.body = {
        fieldOrders: largeFieldOrders,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      // Mock all updates to succeed
      for (let i = 0; i < 20; i++) {
        mockDatabases.updateDocument.mockResolvedValueOnce({
          $id: `field-${i + 1}`,
          order: i + 1,
        });
      }

      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(20);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true });
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
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Resource not found' });
    });

    it('should return 500 if logging fails', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.updateDocument
        .mockResolvedValueOnce({ $id: 'field-1', order: 1 })
        .mockResolvedValueOnce({ $id: 'field-2', order: 2 })
        .mockResolvedValueOnce({ $id: 'field-3', order: 3 });

      mockDatabases.createDocument.mockRejectedValueOnce(new Error('Logging failed'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Logging failure causes the whole operation to fail
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
