/**
 * Unit Tests for Mobile Scan Logs Upload API
 * 
 * Tests log upload, deduplication, and batch processing.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 10.1, 10.2, 10.5
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Set environment variables before importing handler
beforeAll(() => {
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test-db';
  process.env.NEXT_PUBLIC_APPWRITE_SCAN_LOGS_COLLECTION_ID = 'scan_logs';
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID = 'users';
  process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID = 'roles';
});

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(() => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
  createAdminClient: vi.fn(() => ({
    databases: mockDatabases,
  })),
}));

// Import handler after mocks are set up
import handler from '@/pages/api/mobile/scan-logs';

describe('/api/mobile/scan-logs - Mobile Scan Logs Upload API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;

  const mockAuthUser = {
    $id: 'operator-123',
    email: 'scanner@example.com',
    name: 'Scanner Operator',
  };

  const mockUserProfile = {
    $id: 'profile-123',
    userId: 'operator-123',
    email: 'scanner@example.com',
    name: 'Scanner Operator',
    roleId: 'role-scanner',
    isInvited: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockScannerRole = {
    $id: 'role-scanner',
    name: 'Scanner Operator',
    description: 'Mobile scanner access',
    permissions: JSON.stringify({
      attendees: { read: true },
    }),
  };

  const validScanLog = {
    localId: 'local-uuid-123',
    attendeeId: 'att-123',
    barcodeScanned: '1234567890',
    result: 'approved',
    denialReason: null,
    profileId: 'profile-abc',
    profileVersion: 1,
    deviceId: 'device-xyz',
    scannedAt: '2024-01-15T10:30:00.000Z',
  };

  const setupAuthMocks = () => {
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockDatabases.getDocument.mockResolvedValue(mockScannerRole);
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    setHeaderMock = vi.fn();
    
    mockReq = {
      method: 'POST',
      body: { logs: [validScanLog] },
      cookies: { 'appwrite-session': 'test-session' },
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: setHeaderMock,
    };

    setupAuthMocks();
  });

  describe('Log Upload', () => {
    it('should upload a single scan log successfully', async () => {
      // Mock: 1) user profile lookup, 2) deduplication check, 3) create document
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }); // No existing logs
      mockDatabases.createDocument.mockResolvedValue({ $id: 'new-log-id' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            received: 1,
            duplicates: 0,
            errors: [],
          }),
        })
      );
    });

    it('should upload multiple scan logs in batch', async () => {
      const logs = [
        { ...validScanLog, localId: 'local-1' },
        { ...validScanLog, localId: 'local-2', result: 'denied', denialReason: 'Access disabled' },
        { ...validScanLog, localId: 'local-3' },
      ];
      mockReq.body = { logs };

      // Mock: 1) user profile lookup, 2) deduplication check, 3) create documents
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'new-log-id' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            received: 3,
            duplicates: 0,
            errors: [],
          }),
        })
      );
      expect(mockDatabases.createDocument).toHaveBeenCalledTimes(3);
    });

    it('should include operatorId from authenticated user', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'new-log-id' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        'test-db',
        'scan_logs',
        expect.any(String),
        expect.objectContaining({
          operatorId: 'operator-123',
        })
      );
    });

    it('should set uploadedAt timestamp', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'new-log-id' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        'test-db',
        'scan_logs',
        expect.any(String),
        expect.objectContaining({
          uploadedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        })
      );
    });
  });

  describe('Deduplication', () => {
    it('should skip duplicate logs based on localId', async () => {
      const logs = [
        { ...validScanLog, localId: 'existing-local-id' },
        { ...validScanLog, localId: 'new-local-id' },
      ];
      mockReq.body = { logs };

      // Mock: 1) user profile lookup, 2) deduplication check returns existing log
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ 
          documents: [{ localId: 'existing-local-id' }], 
          total: 1 
        });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'new-log-id' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            received: 1,
            duplicates: 1,
            errors: [],
          }),
        })
      );
      expect(mockDatabases.createDocument).toHaveBeenCalledTimes(1);
    });

    it('should prevent duplicates within same batch', async () => {
      const logs = [
        { ...validScanLog, localId: 'same-local-id' },
        { ...validScanLog, localId: 'same-local-id' }, // Duplicate in same batch
      ];
      mockReq.body = { logs };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'new-log-id' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // First one should be created, second should be skipped as duplicate
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            received: 1,
            duplicates: 1,
            errors: [],
          }),
        })
      );
      expect(mockDatabases.createDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validation', () => {
    it('should return 400 for empty logs array', async () => {
      mockReq.body = { logs: [] };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.body = { 
        logs: [{ 
          localId: 'test',
          // Missing required fields
        }] 
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should return 400 for invalid result value', async () => {
      mockReq.body = { 
        logs: [{ 
          ...validScanLog,
          result: 'invalid-result',
        }] 
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid scannedAt datetime', async () => {
      mockReq.body = { 
        logs: [{ 
          ...validScanLog,
          scannedAt: 'not-a-date',
        }] 
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('Permissions', () => {
    it('should return 403 when user lacks permission', async () => {
      const noPermRole = {
        ...mockScannerRole,
        permissions: JSON.stringify({}),
      };

      mockDatabases.getDocument.mockResolvedValue(noPermRole);
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

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
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for non-POST methods', async () => {
      mockReq.method = 'GET';

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['POST']);
      expect(statusMock).toHaveBeenCalledWith(405);
    });
  });
});
