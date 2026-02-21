/**
 * Unit Tests for Scan Logs Viewer API
 * 
 * Tests listing, filtering, and pagination for scan logs.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 10.3
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { mockAccount, mockTablesDB, mockAdminTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Set environment variables before importing handler
beforeAll(() => {
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test-db';
  process.env.NEXT_PUBLIC_APPWRITE_SCAN_LOGS_TABLE_ID = 'scan_logs';
  process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID = 'users';
  process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID = 'roles';
});

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(() => ({
    account: mockAccount,
    tablesDB: mockTablesDB,
  })),
  createAdminClient: vi.fn(() => ({
    tablesDB: mockAdminTablesDB,
  })),
}));


// Import handler after mocks are set up
import handler from '@/pages/api/scan-logs/index';

describe('/api/scan-logs - Scan Logs Viewer API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;

  const mockAuthUser = {
    $id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
  };

  const mockUserProfile = {
    $id: 'profile-123',
    userId: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    roleId: 'role-admin',
    isInvited: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockAdminRole = {
    $id: 'role-admin',
    name: 'Administrator',
    description: 'Full access',
    permissions: JSON.stringify({
      scanLogs: { read: true, export: true },
      logs: { read: true },
    }),
  };

  const mockScanLogs = [
    {
      $id: 'log-1',
      localId: 'local-1',
      attendeeId: 'att-1',
      barcodeScanned: '1234567890',
      result: 'approved',
      denialReason: null,
      profileId: 'profile-1',
      profileVersion: 1,
      deviceId: 'device-1',
      operatorId: 'operator-1',
      scannedAt: '2024-01-15T10:30:00.000Z',
      uploadedAt: '2024-01-15T10:31:00.000Z',
      $createdAt: '2024-01-15T10:31:00.000Z',
    },
    {
      $id: 'log-2',
      localId: 'local-2',
      attendeeId: 'att-2',
      barcodeScanned: '0987654321',
      result: 'denied',
      denialReason: 'Access disabled',
      profileId: 'profile-1',
      profileVersion: 1,
      deviceId: 'device-1',
      operatorId: 'operator-1',
      scannedAt: '2024-01-15T10:35:00.000Z',
      uploadedAt: '2024-01-15T10:36:00.000Z',
      $createdAt: '2024-01-15T10:36:00.000Z',
    },
  ];

  const setupAuthMocks = () => {
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockTablesDB.getRow.mockResolvedValue(mockAdminRole);
    mockAdminTablesDB.getRow.mockResolvedValue(mockAdminRole);
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    setHeaderMock = vi.fn();
    
    mockReq = {
      method: 'GET',
      query: {},
      cookies: { 'appwrite-session': 'test-session' },
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: setHeaderMock,
      json: jsonMock, // Fallback for direct json() calls
    };

    setupAuthMocks();
  });

  describe('List Logs', () => {
    it('should return all scan logs', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: mockScanLogs, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            logs: expect.arrayContaining([
              expect.objectContaining({
                id: 'log-1',
                barcodeScanned: '1234567890',
                result: 'approved',
              }),
              expect.objectContaining({
                id: 'log-2',
                barcodeScanned: '0987654321',
                result: 'denied',
                denialReason: 'Access disabled',
              }),
            ]),
            pagination: expect.objectContaining({
              total: 2,
              limit: 50,
              offset: 0,
              hasMore: false,
            }),
          }),
        })
      );
    });
  });

  describe('Filtering', () => {
    it('should filter by deviceId', async () => {
      mockReq.query = { deviceId: 'device-1' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: mockScanLogs, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should filter by operatorId', async () => {
      mockReq.query = { operatorId: 'operator-1' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: mockScanLogs, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should filter by result', async () => {
      mockReq.query = { result: 'approved' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockScanLogs[0]], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.logs).toHaveLength(1);
    });

    it('should filter by date range', async () => {
      mockReq.query = { 
        dateFrom: '2024-01-15T00:00:00.000Z',
        dateTo: '2024-01-15T23:59:59.000Z',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: mockScanLogs, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should filter by attendeeId', async () => {
      mockReq.query = { attendeeId: 'att-1' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockScanLogs[0]], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      mockReq.query = { limit: '10' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: mockScanLogs, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.pagination.limit).toBe(10);
    });

    it('should respect offset parameter', async () => {
      mockReq.query = { offset: '1' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockScanLogs[1]], total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.pagination.offset).toBe(1);
    });

    it('should cap limit at 100', async () => {
      mockReq.query = { limit: '500' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: mockScanLogs, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.pagination.limit).toBe(100);
    });

    it('should indicate hasMore when more results exist', async () => {
      mockReq.query = { limit: '1' };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockScanLogs[0]], total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.pagination.hasMore).toBe(true);
    });
  });

  describe('Permissions', () => {
    it('should return 403 when user lacks permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({}),
      };

      mockTablesDB.getRow.mockResolvedValue(noPermRole);
    mockAdminTablesDB.getRow.mockResolvedValue(noPermRole);
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
          }),
        })
      );
    });

    it('should allow access with logs.read permission', async () => {
      const logsReadRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({
          logs: { read: true },
        }),
      };

      mockTablesDB.getRow.mockResolvedValue(logsReadRole);
    mockAdminTablesDB.getRow.mockResolvedValue(logsReadRole);
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: mockScanLogs, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for non-GET methods', async () => {
      mockReq.method = 'POST';

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['GET']);
      expect(statusMock).toHaveBeenCalledWith(405);
    });
  });
});
