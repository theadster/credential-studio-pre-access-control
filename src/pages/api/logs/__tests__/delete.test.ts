import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../delete';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
}));

// Mock permissions
vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn((role, resource, action) => {
    if (!role) return false;
    return role.permissions?.[resource]?.[action] === true;
  }),
}));

describe('/api/logs/delete - Bulk Delete Logs API', () => {
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
      logs: { read: true, delete: true },
      all: true,
    }),
  };

  const mockViewerRole = {
    $id: 'role-viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: JSON.stringify({
      logs: { read: true, delete: false },
    }),
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'DELETE',
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
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAccount.get.mockRejectedValue(new Error('Unauthorized'));

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

    it('should return 403 if user does not have delete permission', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockViewerRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to delete logs',
      });
    });
  });

  describe('DELETE /api/logs/delete', () => {
    it('should delete logs before a specific date', async () => {
      const mockLogs = [
        { $id: 'log-1', action: 'create', $createdAt: '2024-01-01T00:00:00.000Z' },
        { $id: 'log-2', action: 'update', $createdAt: '2024-01-02T00:00:00.000Z' },
      ];

      mockReq.body = {
        beforeDate: '2024-01-03T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: mockLogs, total: 2 }); // Logs to delete

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.deleteDocument
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-delete-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.deleteDocument).toHaveBeenCalledTimes(2);
      expect(mockDatabases.deleteDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        'log-1'
      );
      expect(mockDatabases.deleteDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        'log-2'
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        deletedCount: 2,
        message: 'Successfully deleted 2 log entries',
        errors: undefined,
      });
    });

    it('should delete logs filtered by action', async () => {
      const mockLogs = [
        { $id: 'log-1', action: 'create', $createdAt: '2024-01-01T00:00:00.000Z' },
      ];

      mockReq.body = {
        action: 'create',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockLogs, total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.deleteDocument.mockResolvedValueOnce({});
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-delete-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.deleteDocument).toHaveBeenCalledTimes(1);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedCount: 1,
        })
      );
    });

    it('should delete logs filtered by userId', async () => {
      const mockLogs = [
        { $id: 'log-1', userId: 'user-123', action: 'create', $createdAt: '2024-01-01T00:00:00.000Z' },
      ];

      mockReq.body = {
        userId: 'user-123',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockLogs, total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.deleteDocument.mockResolvedValueOnce({});
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-delete-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.deleteDocument).toHaveBeenCalledTimes(1);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should delete logs with multiple filters', async () => {
      const mockLogs = [
        { $id: 'log-1', userId: 'user-123', action: 'create', $createdAt: '2024-01-01T00:00:00.000Z' },
      ];

      mockReq.body = {
        beforeDate: '2024-01-03T00:00:00.000Z',
        action: 'create',
        userId: 'user-123',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockLogs, total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.deleteDocument.mockResolvedValueOnce({});
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-delete-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedCount: 1,
        })
      );
    });

    it('should handle partial failures during deletion', async () => {
      const mockLogs = [
        { $id: 'log-1', action: 'create', $createdAt: '2024-01-01T00:00:00.000Z' },
        { $id: 'log-2', action: 'update', $createdAt: '2024-01-02T00:00:00.000Z' },
        { $id: 'log-3', action: 'delete', $createdAt: '2024-01-03T00:00:00.000Z' },
      ];

      mockReq.body = {
        beforeDate: '2024-01-04T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockLogs, total: 3 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.deleteDocument
        .mockResolvedValueOnce({}) // log-1 success
        .mockRejectedValueOnce(new Error('Delete failed')) // log-2 failure
        .mockResolvedValueOnce({}); // log-3 success

      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-delete-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.deleteDocument).toHaveBeenCalledTimes(3);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        deletedCount: 2,
        message: 'Successfully deleted 2 log entries',
        errors: [
          {
            id: 'log-2',
            error: 'Delete failed',
          },
        ],
      });
    });

    it('should handle large batches of logs', async () => {
      // Create 150 mock logs to test batch processing
      const mockLogs1 = Array.from({ length: 100 }, (_, i) => ({
        $id: `log-${i}`,
        action: 'create',
        $createdAt: '2024-01-01T00:00:00.000Z',
      }));

      const mockLogs2 = Array.from({ length: 50 }, (_, i) => ({
        $id: `log-${i + 100}`,
        action: 'create',
        $createdAt: '2024-01-01T00:00:00.000Z',
      }));

      mockReq.body = {
        beforeDate: '2024-01-03T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockLogs1, total: 150 }) // First batch
        .mockResolvedValueOnce({ documents: mockLogs2, total: 150 }); // Second batch

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      // Mock successful deletion for all logs
      for (let i = 0; i < 150; i++) {
        mockDatabases.deleteDocument.mockResolvedValueOnce({});
      }

      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-delete-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.deleteDocument).toHaveBeenCalledTimes(150);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedCount: 150,
        })
      );
    });

    it('should create log entry for deletion action', async () => {
      const mockLogs = [
        { $id: 'log-1', action: 'create', $createdAt: '2024-01-01T00:00:00.000Z' },
      ];

      mockReq.body = {
        beforeDate: '2024-01-03T00:00:00.000Z',
        action: 'create',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockLogs, total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.deleteDocument.mockResolvedValueOnce({});
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-delete-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          action: 'delete_logs',
          userId: mockAuthUser.$id,
          attendeeId: null,
          details: expect.stringContaining('logs'),
        })
      );
    });

    it('should handle empty result set', async () => {
      mockReq.body = {
        beforeDate: '2024-01-01T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-delete-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.deleteDocument).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        deletedCount: 0,
        message: 'Successfully deleted 0 log entries',
        errors: undefined,
      });
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for non-DELETE methods', async () => {
      mockReq.method = 'GET';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle Appwrite 401 errors', async () => {
      const error = new Error('Unauthorized');
      (error as any).code = 401;
      mockAccount.get.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle generic errors', async () => {
      mockDatabases.listDocuments.mockRejectedValueOnce(new Error('Database error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to delete logs' });
    });
  });
});
