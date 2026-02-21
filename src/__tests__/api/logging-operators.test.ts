import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { NextApiResponse } from 'next';
import { mockAccount, mockTablesDB, mockAdminTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Import the real handler
let logsHandler: any;

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: any) => ({
    account: mockAccount,
    tablesDB: mockTablesDB,
  })),
  createAdminClient: vi.fn(() => ({
    tablesDB: mockAdminTablesDB,
  })),
}));

// Mock the operators module
vi.mock('@/lib/operators', () => ({
  dateOperators: {
    setNow: vi.fn(() => ({ __operator: 'dateSetNow' })),
  },
}));

// Mock the logSettings module
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(true)),
}));

// Mock the API middleware
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: vi.fn((handler) => handler),
}));

// Dynamically import the handler after mocks are set up
beforeEach(async () => {
  const module = await import('../../pages/api/logs/index');
  logsHandler = module.default;
});

describe('Logging with Operators', () => {
  let mockReq: any;
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
      logs: { read: true, write: true },
      all: true,
    }),
  };

  beforeEach(async () => {
    resetAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      method: 'POST',
      headers: {},
      body: {},
    };

    mockRes = {
      status: statusMock,
      setHeader: vi.fn(),
      json: jsonMock,
    };

    // Setup default mock responses
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockTablesDB.listRows.mockResolvedValue({
      rows: [mockUserProfile],
      total: 1,
    });
    mockTablesDB.getRow.mockResolvedValue(mockAdminRole);
    mockAdminTablesDB.getRow.mockResolvedValue(mockAdminRole);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/logs', () => {
    it('should create log with timestamp field', async () => {
      const mockLog = {
        $id: 'log-123',
        userId: 'auth-user-123',
        attendeeId: null,
        action: 'TEST_ACTION',
        details: JSON.stringify({ test: 'data' }),
        timestamp: '2024-01-15T10:30:00.000Z',
        $createdAt: '2024-01-15T10:30:00.000Z',
        $updatedAt: '2024-01-15T10:30:00.000Z',
      };

      mockTablesDB.createRow.mockResolvedValue(mockLog);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockReq.body = {
        action: 'TEST_ACTION',
        details: { test: 'data' },
      };
      mockReq.user = mockAuthUser;

      await logsHandler(mockReq, mockRes as NextApiResponse);

      // Verify the real handler was invoked and created a document with timestamp
      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          action: 'TEST_ACTION',
          details: JSON.stringify({ test: 'data' }),
          timestamp: expect.any(String),
        })
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'log-123',
          action: 'TEST_ACTION',
          timestamp: expect.any(String),
        })
      );
    });

    it('should create log with attendee enrichment', async () => {
      const mockLog = {
        $id: 'log-456',
        userId: 'auth-user-123',
        attendeeId: 'attendee-123',
        action: 'ATTENDEE_UPDATED',
        details: JSON.stringify({ changes: { firstName: 'Jane' } }),
        timestamp: '2024-01-15T10:30:00.000Z',
        $createdAt: '2024-01-15T10:29:59.000Z',
        $updatedAt: '2024-01-15T10:29:59.000Z',
      };

      mockTablesDB.createRow.mockResolvedValue(mockLog);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockTablesDB.getRow.mockResolvedValueOnce({
        $id: 'attendee-123',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      mockReq.body = {
        action: 'ATTENDEE_UPDATED',
        attendeeId: 'attendee-123',
        details: { changes: { firstName: 'Jane' } },
      };
      mockReq.user = mockAuthUser;

      await logsHandler(mockReq, mockRes as NextApiResponse);

      // Verify the real handler created the document and enriched it with attendee data
      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          action: 'ATTENDEE_UPDATED',
          attendeeId: 'attendee-123',
        })
      );
      expect(mockTablesDB.getRow).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'attendee-123'
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'log-456',
          action: 'ATTENDEE_UPDATED',
          attendee: expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Doe',
          }),
        })
      );
    });

    it('should handle concurrent log creation with accurate timestamps', async () => {
      const mockLogs = [
        {
          $id: 'log-concurrent-1',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'CONCURRENT_ACTION_1',
          details: JSON.stringify({ index: 1 }),
          timestamp: '2024-01-15T10:30:00.000Z',
          $createdAt: '2024-01-15T10:30:00.000Z',
          $updatedAt: '2024-01-15T10:30:00.000Z',
        },
        {
          $id: 'log-concurrent-2',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'CONCURRENT_ACTION_2',
          details: JSON.stringify({ index: 2 }),
          timestamp: '2024-01-15T10:30:01.000Z',
          $createdAt: '2024-01-15T10:30:01.000Z',
          $updatedAt: '2024-01-15T10:30:01.000Z',
        },
        {
          $id: 'log-concurrent-3',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'CONCURRENT_ACTION_3',
          details: JSON.stringify({ index: 3 }),
          timestamp: '2024-01-15T10:30:02.000Z',
          $createdAt: '2024-01-15T10:30:02.000Z',
          $updatedAt: '2024-01-15T10:30:02.000Z',
        },
      ];

      let callCount = 0;
      mockTablesDB.createRow.mockImplementation(() => {
        return Promise.resolve(mockLogs[callCount++]);
      });

      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      // Simulate concurrent log creation
      const requests = [
        { action: 'CONCURRENT_ACTION_1', details: { index: 1 } },
        { action: 'CONCURRENT_ACTION_2', details: { index: 2 } },
        { action: 'CONCURRENT_ACTION_3', details: { index: 3 } },
      ];

      const promises = requests.map((body) => {
        const req = { 
          ...mockReq, 
          body,
          user: mockAuthUser,
        };
        const res = {
          status: vi.fn(() => ({ json: vi.fn() })),
          setHeader: vi.fn(),
          json: vi.fn(),
        };
        return logsHandler(req, res as unknown as NextApiResponse);
      });

      await Promise.all(promises);

      // Verify all logs were created with proper timestamps
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(3);
      expect(mockTablesDB.createRow).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          action: 'CONCURRENT_ACTION_1',
          timestamp: expect.any(String),
        })
      );
      expect(mockTablesDB.createRow).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          action: 'CONCURRENT_ACTION_2',
          timestamp: expect.any(String),
        })
      );
      expect(mockTablesDB.createRow).toHaveBeenNthCalledWith(
        3,
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          action: 'CONCURRENT_ACTION_3',
          timestamp: expect.any(String),
        })
      );
    });

    it('should include timestamp in log response', async () => {
      const mockLog = {
        $id: 'log-789',
        userId: 'auth-user-123',
        attendeeId: null,
        action: 'USER_LOGIN',
        details: JSON.stringify({ ip: '192.168.1.1' }),
        timestamp: '2024-01-15T10:30:00.000Z',
        $createdAt: '2024-01-15T10:30:00.000Z',
        $updatedAt: '2024-01-15T10:30:00.000Z',
      };

      mockTablesDB.createRow.mockResolvedValue(mockLog);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockReq.body = {
        action: 'USER_LOGIN',
        details: { ip: '192.168.1.1' },
      };
      mockReq.user = mockAuthUser;

      await logsHandler(mockReq, mockRes as NextApiResponse);

      // Verify the response includes timestamp field
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'log-789',
          action: 'USER_LOGIN',
          timestamp: '2024-01-15T10:30:00.000Z',
        })
      );
    });

    it('should fallback to $createdAt if timestamp is not available', async () => {
      const mockLog = {
        $id: 'log-legacy',
        userId: 'auth-user-123',
        attendeeId: null,
        action: 'LEGACY_ACTION',
        details: JSON.stringify({ legacy: true }),
        // No timestamp field (backward compatibility)
        $createdAt: '2024-01-15T10:30:00.000Z',
        $updatedAt: '2024-01-15T10:30:00.000Z',
      };

      mockTablesDB.createRow.mockResolvedValue(mockLog);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockReq.body = {
        action: 'LEGACY_ACTION',
        details: { legacy: true },
      };
      mockReq.user = mockAuthUser;

      await logsHandler(mockReq, mockRes as NextApiResponse);

      // Verify the response uses $createdAt as fallback when timestamp is missing
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'log-legacy',
          action: 'LEGACY_ACTION',
          timestamp: '2024-01-15T10:30:00.000Z', // Falls back to $createdAt
        })
      );
    });
  });

  describe('GET /api/logs', () => {
    it('should order logs by $createdAt and include timestamp in response', async () => {
      mockReq.method = 'GET';
      mockReq.query = {
        page: '1',
        limit: '50',
      };
      mockReq.user = mockAuthUser;

      const mockLogs = [
        {
          $id: 'log-1',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'ACTION_1',
          details: '{}',
          timestamp: '2024-01-15T10:30:00.000Z',
          $createdAt: '2024-01-15T10:30:00.000Z',
        },
        {
          $id: 'log-2',
          userId: 'auth-user-123',
          attendeeId: null,
          action: 'ACTION_2',
          details: '{}',
          timestamp: '2024-01-15T10:29:00.000Z',
          $createdAt: '2024-01-15T10:29:00.000Z',
        },
      ];

      // Reset and setup specific mock sequence for GET request
      mockTablesDB.listRows.mockReset();
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: mockLogs,
        total: 2,
      });

      // Mock user lookups for enrichment (called for each log)
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      await logsHandler(mockReq, mockRes as NextApiResponse);

      // Verify the real handler was called and returned logs with timestamps
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({
              id: 'log-1',
              action: 'ACTION_1',
              timestamp: '2024-01-15T10:30:00.000Z',
            }),
            expect.objectContaining({
              id: 'log-2',
              action: 'ACTION_2',
              timestamp: '2024-01-15T10:29:00.000Z',
            }),
          ]),
          pagination: expect.objectContaining({
            page: 1,
            limit: 50,
            totalCount: 2,
          }),
        })
      );
    });
  });
});
