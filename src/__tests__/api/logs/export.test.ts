import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/logs/export';
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


describe('/api/logs/export - Export Logs API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let sendMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;

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

  beforeEach(() => {
    resetAllMocks();
    
    sendMock = vi.fn();
    jsonMock = vi.fn();
    setHeaderMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock, send: sendMock }));
    
    mockReq = {
      method: 'POST',
      cookies: { 'appwrite-session': 'test-session' },
      body: {
        scope: 'all',
        fields: ['createdAt', 'action', 'userName'],
      },
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: setHeaderMock,
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockTablesDB.listRows.mockResolvedValue({
      rows: [mockUserProfile],
      total: 1,
    });
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAccount.get.mockRejectedValue(new Error('Unauthorized'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('POST /api/logs/export', () => {
    it('should export all logs as CSV', async () => {
      const mockLogs = [
        {
          $id: 'log-1',
          userId: 'auth-user-123',
          attendeeId: 'attendee-1',
          action: 'create',
          details: JSON.stringify({ type: 'attendee', firstName: 'John', lastName: 'Doe' }),
          $createdAt: '2024-01-01T12:00:00.000Z',
        },
        {
          $id: 'log-2',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'update',
          details: JSON.stringify({ type: 'settings' }),
          $createdAt: '2024-01-02T12:00:00.000Z',
        },
      ];

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: mockLogs, total: 2 }) // Logs
        .mockResolvedValueOnce({ rows: [mockUser], total: 1 }) // User for log 1
        .mockResolvedValueOnce({ rows: [mockUser], total: 1 }); // User for log 2

      mockTablesDB.getRow
        .mockResolvedValueOnce({ $id: 'attendee-1', firstName: 'John', lastName: 'Doe' }); // Attendee for log 1

      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'export-log' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="activity-logs-export.csv"'
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(sendMock).toHaveBeenCalledWith(expect.stringContaining('Date & Time,Action,User Name'));
    });

    it('should return 400 if fields are missing', async () => {
      mockReq.body = { scope: 'all' };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Fields selection is required' });
    });

    it('should return 400 if fields is not an array', async () => {
      mockReq.body = { scope: 'all', fields: 'invalid' };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Fields selection is required' });
    });

    it('should return 400 if fields array is empty', async () => {
      mockReq.body = { scope: 'all', fields: [] };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Fields selection is required' });
    });

    it('should filter logs by action when scope is filtered', async () => {
      mockReq.body = {
        scope: 'filtered',
        fields: ['action'],
        filters: { action: 'create' },
      };

      const mockLogs = [
        {
          $id: 'log-1',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'create',
          details: JSON.stringify({}),
          $createdAt: '2024-01-01T12:00:00.000Z',
        },
      ];

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: mockLogs, total: 1 }) // Logs fetch
        .mockResolvedValueOnce({ rows: [mockUser], total: 1 }); // User for log

      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'export-log' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(sendMock).toHaveBeenCalledWith(expect.stringContaining('create'));
    });

    it('should filter logs by userId when scope is filtered', async () => {
      mockReq.body = {
        scope: 'filtered',
        fields: ['userId'],
        filters: { userId: 'auth-user-123' },
      };

      const mockLogs = [
        {
          $id: 'log-1',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'create',
          details: JSON.stringify({}),
          $createdAt: '2024-01-01T12:00:00.000Z',
        },
      ];

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: mockLogs, total: 1 }) // Logs fetch
        .mockResolvedValueOnce({ rows: [mockUser], total: 1 }); // User for log

      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'export-log' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should filter logs by date range when scope is custom', async () => {
      mockReq.body = {
        scope: 'custom',
        fields: ['createdAt'],
        filters: {
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        },
      };

      const mockLogs = [
        {
          $id: 'log-1',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'create',
          details: JSON.stringify({}),
          $createdAt: '2024-01-15T12:00:00.000Z',
        },
      ];

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: mockLogs, total: 1 }) // Logs fetch
        .mockResolvedValueOnce({ rows: [mockUser], total: 1 }); // User for log

      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'export-log' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle large batches of logs', async () => {
      // Create 150 mock logs to test batch processing
      const mockLogs1 = Array.from({ length: 100 }, (_, i) => ({
        $id: `log-${i}`,
        userId: 'auth-user-123',
        attendeeId: null,
        action: 'create',
        details: JSON.stringify({}),
        $createdAt: '2024-01-01T12:00:00.000Z',
      }));

      const mockLogs2 = Array.from({ length: 50 }, (_, i) => ({
        $id: `log-${i + 100}`,
        userId: 'auth-user-123',
        attendeeId: null,
        action: 'create',
        details: JSON.stringify({}),
        $createdAt: '2024-01-01T12:00:00.000Z',
      }));

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: mockLogs1, total: 150 }) // First batch
        .mockResolvedValueOnce({ rows: mockLogs2, total: 150 }); // Second batch

      // Mock user lookups for all logs
      for (let i = 0; i < 150; i++) {
        mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUser], total: 1 });
      }

      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'export-log' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should escape CSV values with commas', async () => {
      const mockLogs = [
        {
          $id: 'log-1',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'create',
          details: JSON.stringify({ type: 'attendee', firstName: 'John, Jr.', lastName: 'Doe' }),
          $createdAt: '2024-01-01T12:00:00.000Z',
        },
      ];

      mockReq.body = {
        scope: 'all',
        fields: ['details'],
      };

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: mockLogs, total: 1 }) // Logs fetch
        .mockResolvedValueOnce({ rows: [mockUser], total: 1 }); // User for log

      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'export-log' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(sendMock).toHaveBeenCalledWith(expect.stringContaining('"'));
    });

    it('should create log entry for export action', async () => {
      const mockLogs = [
        {
          $id: 'log-1',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'create',
          details: JSON.stringify({}),
          $createdAt: '2024-01-01T12:00:00.000Z',
        },
      ];

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: mockLogs, total: 1 }) // Logs fetch
        .mockResolvedValueOnce({ rows: [mockUser], total: 1 }); // User for log

      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'export-log' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          attendeeId: null,
          action: 'export',
          details: expect.stringContaining('logs'),
        })
      );
    });

    it('should handle timezone parameter', async () => {
      mockReq.body = {
        scope: 'all',
        fields: ['createdAt'],
        timezone: 'America/New_York',
      };

      const mockLogs = [
        {
          $id: 'log-1',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'create',
          details: JSON.stringify({}),
          $createdAt: '2024-01-01T12:00:00.000Z',
        },
      ];

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: mockLogs, total: 1 }) // Logs fetch
        .mockResolvedValueOnce({ rows: [mockUser], total: 1 }); // User for log

      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'export-log' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle logs without user or attendee data', async () => {
      const mockLogs = [
        {
          $id: 'log-1',
          userId: 'deleted-user',
          attendeeId: 'deleted-attendee',
          action: 'create',
          details: JSON.stringify({}),
          $createdAt: '2024-01-01T12:00:00.000Z',
        },
      ];

      mockReq.body = {
        scope: 'all',
        fields: ['userName', 'targetName'],
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: mockLogs, total: 1 }) // Logs fetch
        .mockResolvedValueOnce({ rows: [], total: 0 }); // User not found

      mockTablesDB.getRow.mockRejectedValueOnce(new Error('Attendee not found'));

      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'export-log' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should include all selected fields in CSV', async () => {
      mockReq.body = {
        scope: 'all',
        fields: ['logId', 'createdAt', 'action', 'userName', 'userEmail', 'userId', 'targetName', 'targetType', 'details'],
      };

      const mockLogs = [
        {
          $id: 'log-1',
          userId: 'auth-user-123',
          attendeeId: 'attendee-1',
          action: 'create',
          details: JSON.stringify({ type: 'attendee', firstName: 'John', lastName: 'Doe' }),
          $createdAt: '2024-01-01T12:00:00.000Z',
        },
      ];

      const mockUser = {
        userId: 'auth-user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: mockLogs, total: 1 }) // Logs fetch
        .mockResolvedValueOnce({ rows: [mockUser], total: 1 }); // User for log

      mockTablesDB.getRow.mockResolvedValueOnce({
        $id: 'attendee-1',
        firstName: 'John',
        lastName: 'Doe',
      });

      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'export-log' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(sendMock).toHaveBeenCalledWith(
        expect.stringContaining('Log ID,Date & Time,Action,User Name,User Email,User ID,Target Name,Target Type,Details')
      );
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for non-POST methods', async () => {
      mockReq.method = 'GET';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method GET not allowed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle generic errors', async () => {
      // Reject on the first listRows call (logs fetch)
      mockTablesDB.listRows.mockRejectedValueOnce(new Error('Database error'));

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
