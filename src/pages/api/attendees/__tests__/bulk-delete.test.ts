import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../bulk-delete';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock TablesDB
const mockTablesDB = {
  createTransaction: vi.fn(),
  createOperations: vi.fn(),
  updateTransaction: vi.fn(),
};

// Mock bulk operations
const mockBulkDeleteWithFallback = vi.fn();

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
  createAdminClient: vi.fn(() => ({
    databases: mockDatabases,
    tablesDB: mockTablesDB,
  })),
}));

// Mock bulk operations module
vi.mock('@/lib/bulkOperations', () => ({
  bulkDeleteWithFallback: (...args: any[]) => mockBulkDeleteWithFallback(...args),
}));

describe('/api/attendees/bulk-delete - Bulk Delete API', () => {
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
      attendees: { bulkDelete: true },
      all: true,
    }),
  };

  beforeEach(() => {
    resetAllMocks();
    mockBulkDeleteWithFallback.mockReset();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'DELETE',
      cookies: { 'appwrite-session': 'test-session' },
      body: {
        attendeeIds: ['attendee-1', 'attendee-2', 'attendee-3'],
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
    mockDatabases.createDocument.mockResolvedValue({
      $id: 'new-log-123',
      userId: mockAuthUser.$id,
      action: 'delete',
      details: JSON.stringify({ type: 'bulk_delete' }),
    });
    
    // Default bulk delete mock - successful deletion
    mockBulkDeleteWithFallback.mockResolvedValue({
      deletedCount: 3,
      usedTransactions: true,
      batchCount: 1,
    });
  });

  describe('Method Validation', () => {
    it('should return 405 if method is not DELETE', async () => {
      mockReq.method = 'POST';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });
  });

  describe('Authentication', () => {
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
          error: expect.any(String),
        })
      );
    });

    it('should return 403 if user has no role', async () => {
      const userWithoutRole = { ...mockUserProfile, roleId: null };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [userWithoutRole],
        total: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Access denied'),
        })
      );
    });

    it('should return 403 if user does not have bulkDelete permission', async () => {
      const userWithRole = { ...mockUserProfile, roleId: 'role-no-perm' };
      const noPermRole = {
        $id: 'role-no-perm',
        name: 'No Permission Role',
        permissions: JSON.stringify({ attendees: { bulkDelete: false } }),
      };

      // Reset the mock to clear default behavior
      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [userWithRole], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied: Insufficient permissions for bulk delete',
      });
    });
  });

  describe('Input Validation', () => {
    it('should return 400 if attendeeIds is missing', async () => {
      mockReq.body = {};

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee IDs provided' });
    });

    it('should return 400 if attendeeIds is not an array', async () => {
      mockReq.body = { attendeeIds: 'not-an-array' };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee IDs provided' });
    });

    it('should return 400 if attendeeIds is empty array', async () => {
      mockReq.body = { attendeeIds: [] };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee IDs provided' });
    });
  });

  describe('Bulk Delete Operation', () => {
    it('should delete all attendees successfully', async () => {
      const mockAttendees = [
        { $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' },
        { $id: 'attendee-2', firstName: 'Jane', lastName: 'Smith', barcodeNumber: '67890' },
        { $id: 'attendee-3', firstName: 'Bob', lastName: 'Johnson', barcodeNumber: '11111' },
      ];

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendees[0]) // Validate attendee 1
        .mockResolvedValueOnce(mockAttendees[1]) // Validate attendee 2
        .mockResolvedValueOnce(mockAttendees[2]); // Validate attendee 3

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 3,
        usedTransactions: true,
        batchCount: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockBulkDeleteWithFallback).toHaveBeenCalledTimes(1);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 3,
          deleted: ['attendee-1', 'attendee-2', 'attendee-3'],
          usedTransactions: true,
        })
      );
    });

    it('should fail validation if any attendee is not found', async () => {
      const mockAttendees = [
        { $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' },
      ];

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendees[0])
        .mockRejectedValueOnce(new Error('Attendee not found')); // Second attendee fails validation

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          message: 'One or more attendees could not be found or accessed. No deletions performed.',
        })
      );
      // No deletions should have been attempted
      expect(mockDatabases.deleteDocument).not.toHaveBeenCalled();
    });

    it('should abort operation if validation fails for any attendee', async () => {
      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      mockDatabases.createDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce({ $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' })
        .mockRejectedValueOnce(new Error('Not found')); // attendee-2 not found - validation fails

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // No deletions should be attempted since validation failed
      expect(mockDatabases.deleteDocument).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          message: 'One or more attendees could not be found or accessed. No deletions performed.',
        })
      );
    });

    it('should create log entry for bulk delete', async () => {
      const mockAttendees = [
        { $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' },
        { $id: 'attendee-2', firstName: 'Jane', lastName: 'Smith', barcodeNumber: '67890' },
      ];

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendees[0]) // Validate attendee 1
        .mockResolvedValueOnce(mockAttendees[1]); // Validate attendee 2

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 2,
        usedTransactions: true,
      });

      // Update request to only have 2 attendees
      mockReq.body = { attendeeIds: ['attendee-1', 'attendee-2'] };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify bulkDeleteWithFallback was called with audit log config
      expect(mockBulkDeleteWithFallback).toHaveBeenCalledWith(
        mockTablesDB,
        mockDatabases,
        expect.objectContaining({
          databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          tableId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
          rowIds: ['attendee-1', 'attendee-2'],
          auditLog: expect.objectContaining({
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
            userId: mockAuthUser.$id,
            action: 'bulk_delete',
          }),
        })
      );
    });

    it('should validate all attendees before attempting any deletions', async () => {
      const mockAttendees = [
        { $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' },
        { $id: 'attendee-2', firstName: 'Jane', lastName: 'Smith', barcodeNumber: '67890' },
        { $id: 'attendee-3', firstName: 'Bob', lastName: 'Johnson', barcodeNumber: '11111' },
      ];

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendees[0]) // Validate attendee 1
        .mockResolvedValueOnce(mockAttendees[1]) // Validate attendee 2
        .mockResolvedValueOnce(mockAttendees[2]); // Validate attendee 3

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 3,
        usedTransactions: true,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // All attendees should be validated (3 getDocument calls for attendees + 1 for role)
      expect(mockDatabases.getDocument).toHaveBeenCalledTimes(4);
      // Then bulk delete should be called
      expect(mockBulkDeleteWithFallback).toHaveBeenCalledTimes(1);
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Conflict Handling', () => {
    it('should return 409 on transaction conflict with error code', async () => {
      const mockAttendees = [
        { $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' },
        { $id: 'attendee-2', firstName: 'Jane', lastName: 'Smith', barcodeNumber: '67890' },
      ];

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendees[0])
        .mockResolvedValueOnce(mockAttendees[1]);

      // Simulate transaction conflict
      const conflictError = new Error('Transaction conflict');
      (conflictError as any).code = 409;
      mockBulkDeleteWithFallback.mockRejectedValue(conflictError);

      mockReq.body = { attendeeIds: ['attendee-1', 'attendee-2'] };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction conflict',
          message: expect.stringContaining('modified by another user'),
          retryable: true,
          type: 'CONFLICT',
          details: expect.objectContaining({
            attemptedCount: 2,
            userId: mockAuthUser.$id,
          }),
        })
      );
    });

    it('should return 409 on transaction conflict with conflict in message', async () => {
      const mockAttendees = [
        { $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' },
      ];

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendees[0]);

      // Simulate transaction conflict with message containing 'conflict'
      const conflictError = new Error('Database conflict detected during transaction');
      (conflictError as any).code = 500;
      mockBulkDeleteWithFallback.mockRejectedValue(conflictError);

      mockReq.body = { attendeeIds: ['attendee-1'] };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction conflict',
          retryable: true,
          type: 'CONFLICT',
        })
      );
    });

    it('should log conflict occurrence for monitoring', async () => {
      const mockAttendees = [
        { $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' },
        { $id: 'attendee-2', firstName: 'Jane', lastName: 'Smith', barcodeNumber: '67890' },
        { $id: 'attendee-3', firstName: 'Bob', lastName: 'Johnson', barcodeNumber: '11111' },
      ];

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendees[0])
        .mockResolvedValueOnce(mockAttendees[1])
        .mockResolvedValueOnce(mockAttendees[2]);

      const conflictError = new Error('Transaction conflict');
      (conflictError as any).code = 409;
      mockBulkDeleteWithFallback.mockRejectedValue(conflictError);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify conflict was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Bulk Delete] Transaction conflict detected')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempting to delete 3 attendees')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should indicate conflict is retryable in response', async () => {
      const mockAttendees = [
        { $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' },
      ];

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendees[0]);

      const conflictError = new Error('Conflict');
      (conflictError as any).code = 409;
      mockBulkDeleteWithFallback.mockRejectedValue(conflictError);

      mockReq.body = { attendeeIds: ['attendee-1'] };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          retryable: true,
        })
      );
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

    it('should handle Appwrite 404 errors', async () => {
      const error = new Error('Not found');
      (error as any).code = 404;
      
      mockAccount.get.mockReset();
      mockDatabases.listDocuments.mockReset();
      
      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockDatabases.listDocuments.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should handle generic errors with retryable false', async () => {
      // Setup successful authentication first
      const mockAttendees = [
        { $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' },
      ];

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole).mockResolvedValueOnce(mockAttendees[0]);

      // Then make bulk delete fail with a generic error
      mockBulkDeleteWithFallback.mockRejectedValue(new Error('Database error'));

      mockReq.body = { attendeeIds: ['attendee-1'] };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.any(String),
          retryable: false,
        })
      );
    });
  });
});
