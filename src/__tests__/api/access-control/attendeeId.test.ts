/**
 * Unit Tests for Access Control API
 * 
 * Tests the GET and PUT operations for access control records.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 1.1, 1.6
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Set environment variables before importing handler
beforeAll(() => {
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test-db';
  process.env.NEXT_PUBLIC_APPWRITE_ACCESS_CONTROL_COLLECTION_ID = 'access_control';
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
import handler from '@/pages/api/access-control/[attendeeId]';

describe('/api/access-control/[attendeeId] - Access Control API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
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

  const mockAdminRole = {
    $id: 'role-admin',
    name: 'Super Administrator',
    description: 'Full system access',
    permissions: JSON.stringify({
      accessControl: { read: true, write: true },
      all: true,
    }),
  };

  const mockAccessControl = {
    $id: 'ac-123',
    attendeeId: 'attendee-123',
    accessEnabled: true,
    validFrom: '2024-01-15T08:00:00.000Z',
    validUntil: '2024-01-17T23:59:59.000Z',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  // Helper to set up auth mocks
  const setupAuthMocks = () => {
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockDatabases.getDocument.mockResolvedValue(mockAdminRole);
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    setHeaderMock = vi.fn();
    
    mockReq = {
      method: 'GET',
      query: { attendeeId: 'attendee-123' },
      cookies: { 'appwrite-session': 'test-session' },
      body: {},
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: setHeaderMock,
    };

    setupAuthMocks();
  });

  describe('GET /api/access-control/[attendeeId]', () => {
    it('should return access control record for an attendee', async () => {
      // Mock: 1) user profile lookup, 2) access control lookup
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockAccessControl], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          $id: 'ac-123',
          attendeeId: 'attendee-123',
          accessEnabled: true,
        })
      );
    });

    it('should return default access control when no record exists', async () => {
      // Mock: 1) user profile lookup, 2) access control lookup (empty)
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          attendeeId: 'attendee-123',
          accessEnabled: true,
          validFrom: null,
          validUntil: null,
          $id: null,
        })
      );
    });

    it('should return 400 for invalid attendee ID', async () => {
      mockReq.query = {};
      
      // Mock user profile lookup
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid attendee ID',
        })
      );
    });
  });

  describe('PUT /api/access-control/[attendeeId]', () => {
    beforeEach(() => {
      mockReq.method = 'PUT';
      // Re-setup auth mocks since they may have been consumed
      setupAuthMocks();
    });

    it('should update access control record', async () => {
      const updateData = {
        accessEnabled: false,
        validFrom: '2024-02-01T00:00:00.000Z',
        validUntil: '2024-02-28T23:59:59.000Z',
      };
      mockReq.body = updateData;

      // Mock: 1) user profile lookup, 2) existing access control lookup
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockAccessControl], total: 1 });

      // Mock update
      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAccessControl,
        ...updateData,
        $updatedAt: '2024-01-15T00:00:00.000Z',
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockDatabases.updateDocument).toHaveBeenCalled();
    });

    it('should create access control record when none exists', async () => {
      const createData = {
        accessEnabled: true,
        validFrom: '2024-02-01T00:00:00.000Z',
        validUntil: '2024-02-28T23:59:59.000Z',
      };
      mockReq.body = createData;

      // Mock: 1) user profile lookup, 2) access control lookup (empty)
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      // Mock create
      mockDatabases.createDocument.mockResolvedValue({
        $id: 'new-ac-123',
        attendeeId: 'attendee-123',
        ...createData,
        $createdAt: '2024-01-15T00:00:00.000Z',
        $updatedAt: '2024-01-15T00:00:00.000Z',
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockDatabases.createDocument).toHaveBeenCalled();
    });

    it('should return validation error when validFrom > validUntil', async () => {
      // Invalid: validFrom is after validUntil
      mockReq.body = {
        accessEnabled: true,
        validFrom: '2024-03-01T00:00:00.000Z',
        validUntil: '2024-02-01T00:00:00.000Z',
      };

      // Mock: 1) user profile lookup, 2) access control lookup (empty)
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
        })
      );
    });

    it('should validate date range against existing record when updating single date', async () => {
      // Update only validUntil to be before existing validFrom
      mockReq.body = {
        validUntil: '2024-01-10T00:00:00.000Z', // Before existing validFrom
      };

      // The existing record has validFrom set to a date AFTER the new validUntil
      const existingWithValidFrom = {
        ...mockAccessControl,
        validFrom: '2024-01-15T08:00:00.000Z',
        validUntil: null,
      };

      // Reset and set up mocks fresh for this test
      mockDatabases.listDocuments.mockReset();
      
      // Mock: 1) user profile lookup (middleware), 2) existing access control lookup (API)
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [existingWithValidFrom], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          message: 'validFrom must be before validUntil',
        })
      );
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'DELETE';

      // Mock user profile lookup
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['GET', 'PUT']);
      expect(statusMock).toHaveBeenCalledWith(405);
    });
  });
});
