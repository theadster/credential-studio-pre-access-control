import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../index';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
}));

// Mock logSettings
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn().mockResolvedValue(true),
}));

describe('/api/logs - Logs Management API', () => {
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
      logs: { read: true, create: true, delete: true },
      all: true,
    }),
  };

  const mockLog = {
    $id: 'log-123',
    userId: 'auth-user-123',
    attendeeId: 'attendee-123',
    action: 'create',
    details: JSON.stringify({ type: 'attendee', firstName: 'John', lastName: 'Doe' }),
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'GET',
      cookies: { 'appwrite-session': 'test-session' },
      query: {},
      body: {},
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
    // Note: listDocuments is not mocked by default - each test sets it up
    mockDatabases.getDocument.mockResolvedValue(mockAdminRole);
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      const error = new Error('Unauthorized');
      (error as any).code = 401;
      mockAccount.get.mockRejectedValue(error);

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

  describe('GET /api/logs', () => {
    it('should return list of logs with pagination', async () => {
      const mockLogs = [
        {
          $id: 'log-1',
          userId: 'auth-user-123',
          attendeeId: 'attendee-1',
          action: 'create',
          details: JSON.stringify({ type: 'attendee', firstName: 'John' }),
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          $id: 'log-2',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'update',
          details: JSON.stringify({ type: 'settings' }),
          $createdAt: '2024-01-02T00:00:00.000Z',
          $updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      const mockAttendee = {
        $id: 'attendee-1',
        firstName: 'John',
        lastName: 'Doe',
      };

      // First call: User profile lookup
      // Second call: Logs list
      // Third call: User for log 1
      // Fourth call: User for log 2
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockLogs, total: 2 })
        .mockResolvedValueOnce({ documents: [mockUser], total: 1 })
        .mockResolvedValueOnce({ documents: [mockUser], total: 1 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAttendee); // Attendee for log 1

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        logs: expect.arrayContaining([
          expect.objectContaining({
            id: 'log-1',
            action: 'create',
            user: expect.objectContaining({ email: 'admin@example.com' }),
            attendee: expect.objectContaining({ firstName: 'John' }),
          }),
          expect.objectContaining({
            id: 'log-2',
            action: 'update',
            attendee: null,
          }),
        ]),
        pagination: expect.objectContaining({
          page: 1,
          limit: 50,
          totalCount: 2,
        }),
      });
    });

    it('should filter logs by action', async () => {
      mockReq.query = { action: 'create' };

      const mockLogs = [mockLog];

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: mockLogs, total: 1 }) // Logs
        .mockResolvedValueOnce({ documents: [mockUser], total: 1 }); // User for log

      mockDatabases.getDocument.mockResolvedValueOnce({
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({ action: 'create' }),
          ]),
        })
      );
    });

    it('should filter logs by userId', async () => {
      mockReq.query = { userId: 'auth-user-123' };

      const mockLogs = [mockLog];

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: mockLogs, total: 1 }) // Logs
        .mockResolvedValueOnce({ documents: [mockUser], total: 1 }); // User for log

      mockDatabases.getDocument.mockResolvedValueOnce({
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({ userId: 'auth-user-123' }),
          ]),
        })
      );
    });

    it('should handle pagination parameters', async () => {
      mockReq.query = { page: '2', limit: '10' };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: [], total: 25 }); // Logs (empty page 2)

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: [],
          pagination: expect.objectContaining({
            page: 2,
            limit: 10,
            totalCount: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: true,
          }),
        })
      );
    });

    it('should parse details JSON correctly', async () => {
      const logWithDetails = {
        ...mockLog,
        details: JSON.stringify({ type: 'attendee', changes: ['firstName', 'lastName'] }),
      };

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: [logWithDetails], total: 1 }) // Logs
        .mockResolvedValueOnce({ documents: [mockUser], total: 1 }); // User for log

      mockDatabases.getDocument.mockResolvedValueOnce({
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({
              details: expect.objectContaining({
                type: 'attendee',
                changes: ['firstName', 'lastName'],
              }),
            }),
          ]),
        })
      );
    });

    it('should handle logs without related user or attendee', async () => {
      const systemLog = {
        $id: 'log-system',
        userId: 'deleted-user',
        attendeeId: null,
        action: 'system_update',
        details: JSON.stringify({ type: 'system' }),
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: [systemLog], total: 1 }) // Logs
        .mockResolvedValueOnce({ documents: [], total: 0 }); // User not found

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({
              id: 'log-system',
              user: null,
              attendee: null,
            }),
          ]),
        })
      );
    });
  });

  describe('POST /api/logs', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.body = {
        action: 'create',
        attendeeId: 'attendee-123',
        details: { type: 'attendee', firstName: 'John' },
      };
    });

    it('should create a new log entry successfully', async () => {
      const newLog = {
        $id: 'new-log-123',
        userId: 'auth-user-123',
        attendeeId: 'attendee-123',
        action: 'create',
        details: JSON.stringify({ type: 'attendee', firstName: 'John' }),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockDatabases.createDocument.mockResolvedValueOnce(newLog);

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUser], total: 1 }); // User for response

      mockDatabases.getDocument.mockResolvedValueOnce({
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: 'auth-user-123',
          attendeeId: 'attendee-123',
          action: 'create',
          details: JSON.stringify({ type: 'attendee', firstName: 'John' }),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-log-123',
          action: 'create',
          details: expect.objectContaining({ type: 'attendee' }),
        })
      );
    });

    it('should return 400 if action is missing', async () => {
      mockReq.body = { attendeeId: 'attendee-123' };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Action is required' });
    });

    it('should create log without attendeeId if not provided', async () => {
      mockReq.body = {
        action: 'update',
        details: { type: 'settings' },
      };

      const newLog = {
        $id: 'new-log-123',
        userId: 'auth-user-123',
        attendeeId: null,
        action: 'update',
        details: JSON.stringify({ type: 'settings' }),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockDatabases.createDocument.mockResolvedValueOnce(newLog);
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUser], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          attendeeId: null,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should use provided userId for authentication events', async () => {
      mockReq.body = {
        action: 'login',
        userId: 'other-user-123',
        details: { type: 'auth' },
      };

      const newLog = {
        $id: 'new-log-123',
        userId: 'other-user-123',
        attendeeId: null,
        action: 'login',
        details: JSON.stringify({ type: 'auth' }),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockDatabases.createDocument.mockResolvedValueOnce(newLog);
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [], total: 0 }); // User not found

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: 'other-user-123',
        })
      );
    });

    it('should not create log if logging is disabled for action', async () => {
      const { shouldLog } = await import('@/lib/logSettings');
      vi.mocked(shouldLog).mockResolvedValueOnce(false);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Logging disabled for this action' });
    });

    it('should handle empty details object', async () => {
      mockReq.body = {
        action: 'view',
        details: {},
      };

      const newLog = {
        $id: 'new-log-123',
        userId: 'auth-user-123',
        attendeeId: null,
        action: 'view',
        details: JSON.stringify({}),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockDatabases.createDocument.mockResolvedValueOnce(newLog);
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUser], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'DELETE';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method DELETE not allowed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle Appwrite 401 errors', async () => {
      mockReq.method = 'POST';
      mockReq.body = { action: 'test' };
      
      const error = new Error('Unauthorized');
      (error as any).code = 401;
      mockAccount.get.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle generic errors', async () => {
      // Reject on the logs fetch
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

    it('should handle errors when fetching related user data', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: [mockLog], total: 1 }) // Logs
        .mockRejectedValueOnce(new Error('User fetch error')); // User fetch fails

      mockDatabases.getDocument.mockResolvedValueOnce({
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({
              user: null,
            }),
          ]),
        })
      );
    });

    it('should handle errors when fetching related attendee data', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockLog], total: 1 })
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      mockDatabases.getDocument.mockRejectedValueOnce(new Error('Attendee fetch error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({
              attendee: null,
            }),
          ]),
        })
      );
    });

    it('should handle invalid JSON in details field', async () => {
      const logWithInvalidJSON = {
        ...mockLog,
        details: 'invalid-json{',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [logWithInvalidJSON], total: 1 })
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce({
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({
              details: {},
            }),
          ]),
        })
      );
    });
  });
});
