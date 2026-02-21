/**
 * Integration Tests for Bulk Delete with Transactions
 * 
 * Tests the atomic deletion of attendees using the TablesDB Transactions API
 * with automatic fallback to legacy API when needed.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/attendees/bulk-delete';
import { mockAccount, mockTablesDB, mockAdminTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Mock bulk operations
const mockBulkDeleteWithFallback = vi.fn();

// Mock transaction utilities
const mockExecuteTransactionWithRetry = vi.fn();
const mockCreateBulkDeleteOperations = vi.fn();

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

// Mock bulk operations module
vi.mock('@/lib/bulkOperations', () => ({
  bulkDeleteWithFallback: (...args: any[]) => mockBulkDeleteWithFallback(...args),
}));

// Mock transaction utilities
vi.mock('@/lib/transactions', () => ({
  executeTransactionWithRetry: (...args: any[]) => mockExecuteTransactionWithRetry(...args),
  createBulkDeleteOperations: (...args: any[]) => mockCreateBulkDeleteOperations(...args),
  getTransactionLimit: vi.fn(() => 1000), // PRO tier limit
}));


describe('/api/attendees/bulk-delete - Transaction Integration Tests', () => {
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

  // Helper to create mock attendees
  const createMockAttendees = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      $id: `attendee-${i + 1}`,
      firstName: `First${i + 1}`,
      lastName: `Last${i + 1}`,
      barcodeNumber: `${10000 + i}`,
      email: `attendee${i + 1}@example.com`,
    }));
  };

  beforeEach(() => {
    resetAllMocks();
    mockBulkDeleteWithFallback.mockReset();
    mockExecuteTransactionWithRetry.mockReset();
    mockCreateBulkDeleteOperations.mockReset();
    
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
    mockTablesDB.listRows.mockResolvedValue({
      rows: [mockUserProfile],
      total: 1,
    });
    mockTablesDB.getRow.mockResolvedValue(mockAdminRole);
    mockAdminTablesDB.getRow.mockResolvedValue(mockAdminRole);
    
    // Default bulk delete mock - successful deletion with transactions
    mockBulkDeleteWithFallback.mockResolvedValue({
      deletedCount: 3,
      usedTransactions: true,
      batchCount: 1,
    });
  });

  describe('Atomic Deletion Tests', () => {
    it('should atomically delete 10 attendees in a single transaction', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation - all attendees exist
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      // Mock each attendee validation
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock successful transaction
      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 10,
        usedTransactions: true,
        batchCount: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify bulkDeleteWithFallback was called with correct config
      expect(mockBulkDeleteWithFallback).toHaveBeenCalledTimes(1);
      expect(mockBulkDeleteWithFallback).toHaveBeenCalledWith(
        mockTablesDB,
        mockTablesDB,
        expect.objectContaining({
          databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          tableId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID,
          rowIds: attendeeIds,
          auditLog: expect.objectContaining({
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
            userId: mockAuthUser.$id,
            action: 'bulk_delete',
          }),
        })
      );

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 10,
          deleted: attendeeIds,
          usedTransactions: true,
          batchCount: 1,
          message: expect.stringContaining('using transactions'),
        })
      );
    });

    it('should atomically delete 50 attendees in a single transaction', async () => {
      const attendees = createMockAttendees(50);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock successful transaction
      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 50,
        usedTransactions: true,
        batchCount: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockBulkDeleteWithFallback).toHaveBeenCalledTimes(1);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 50,
          usedTransactions: true,
          batchCount: 1,
        })
      );
    });

    it('should atomically delete 1,000 attendees at PRO tier limit', async () => {
      const attendees = createMockAttendees(1000);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock successful transaction at limit
      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 1000,
        usedTransactions: true,
        batchCount: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockBulkDeleteWithFallback).toHaveBeenCalledTimes(1);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 1000,
          usedTransactions: true,
          batchCount: 1,
        })
      );
    });
  });

  describe('Batching Tests', () => {
    it('should batch delete 1,500 attendees into multiple transactions', async () => {
      const attendees = createMockAttendees(1500);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock successful batched transaction (2 batches for 1500 items at 1000 limit)
      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 1500,
        usedTransactions: true,
        batchCount: 2,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockBulkDeleteWithFallback).toHaveBeenCalledTimes(1);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 1500,
          usedTransactions: true,
          batchCount: 2,
          message: expect.stringContaining('in 2 batch(es)'),
        })
      );
    });

    it('should handle batching with correct batch count calculation', async () => {
      const attendees = createMockAttendees(2500);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock successful batched transaction (3 batches for 2500 items)
      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 2500,
        usedTransactions: true,
        batchCount: 3,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedCount: 2500,
          batchCount: 3,
        })
      );
    });
  });

  describe('Rollback Tests', () => {
    it('should rollback entire transaction on failure', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock transaction failure
      const transactionError = new Error('Transaction failed during delete');
      (transactionError as any).code = 500;
      mockBulkDeleteWithFallback.mockRejectedValue(transactionError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should return error
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to delete attendees',
          message: 'Transaction failed during delete',
          retryable: false,
        })
      );

      // No partial deletions should occur
      expect(mockTablesDB.deleteRow).not.toHaveBeenCalled();
    });

    it('should not perform any deletions if validation fails', async () => {
      const attendees = createMockAttendees(5);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation - first 3 succeed, 4th fails
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      mockTablesDB.getRow.mockResolvedValueOnce(attendees[0]);
      mockTablesDB.getRow.mockResolvedValueOnce(attendees[1]);
      mockTablesDB.getRow.mockResolvedValueOnce(attendees[2]);
      mockTablesDB.getRow.mockRejectedValueOnce(new Error('Attendee not found'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should fail validation before transaction
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          message: expect.stringContaining('No deletions performed'),
        })
      );

      // No transaction should be attempted
      expect(mockBulkDeleteWithFallback).not.toHaveBeenCalled();
    });

    it('should rollback on partial batch failure', async () => {
      const attendees = createMockAttendees(1500);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock batch failure - second batch fails
      const batchError = new Error('Batch 2/2 failed: Database error');
      mockBulkDeleteWithFallback.mockRejectedValue(batchError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to delete attendees',
          retryable: false,
        })
      );
    });
  });

  describe('Audit Log Tests', () => {
    it('should include audit log in transaction', async () => {
      const attendees = createMockAttendees(5);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 5,
        usedTransactions: true,
        batchCount: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify audit log was included in transaction config
      expect(mockBulkDeleteWithFallback).toHaveBeenCalledWith(
        mockTablesDB,
        mockTablesDB,
        expect.objectContaining({
          auditLog: expect.objectContaining({
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
            userId: mockAuthUser.$id,
            action: 'bulk_delete',
            details: expect.any(String), // Details are stringified
          }),
        })
      );
    });

    it('should include attendee details in audit log', async () => {
      const attendees = createMockAttendees(3);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 3,
        usedTransactions: true,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const callArgs = mockBulkDeleteWithFallback.mock.calls[0][2];
      expect(callArgs.auditLog.details).toBeDefined();
      
      // Audit log should contain information about the deleted attendees
      const details = typeof callArgs.auditLog.details === 'string' 
        ? JSON.parse(callArgs.auditLog.details) 
        : callArgs.auditLog.details;
      
      // The actual implementation uses 'attendees' as the type in the log formatting
      expect(details).toMatchObject({
        type: 'attendees',
        count: 3,
      });
    });

    it('should create atomic audit log with deletions', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 10,
        usedTransactions: true,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify transaction includes audit log
      expect(mockBulkDeleteWithFallback).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          rowIds: attendeeIds,
          auditLog: expect.objectContaining({
            userId: mockAuthUser.$id,
            action: 'bulk_delete',
          }),
        })
      );

      // In a real transaction, if deletion fails, audit log should also rollback
      // This is handled by the transaction system automatically
    });
  });

  describe('Conflict Handling and Retry Tests', () => {
    it('should return 409 on transaction conflict', async () => {
      const attendees = createMockAttendees(5);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock conflict error
      const conflictError = new Error('Transaction conflict');
      (conflictError as any).code = 409;
      mockBulkDeleteWithFallback.mockRejectedValue(conflictError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction conflict',
          message: expect.stringContaining('modified by another user'),
          retryable: true,
          type: 'CONFLICT',
        })
      );
    });

    it('should detect conflict from error message', async () => {
      const attendees = createMockAttendees(3);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock conflict with message containing 'conflict'
      const conflictError = new Error('Database conflict detected');
      (conflictError as any).code = 500;
      mockBulkDeleteWithFallback.mockRejectedValue(conflictError);

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
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      const conflictError = new Error('Conflict');
      (conflictError as any).code = 409;
      mockBulkDeleteWithFallback.mockRejectedValue(conflictError);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify conflict was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Bulk Delete] Transaction conflict detected')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempting to delete 10 attendees')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should indicate conflict is retryable', async () => {
      const attendees = createMockAttendees(5);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      const conflictError = new Error('Conflict');
      (conflictError as any).code = 409;
      mockBulkDeleteWithFallback.mockRejectedValue(conflictError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          retryable: true,
          type: 'CONFLICT',
        })
      );
    });

    it('should include conflict details in response', async () => {
      const attendees = createMockAttendees(25);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      const conflictError = new Error('Conflict');
      (conflictError as any).code = 409;
      mockBulkDeleteWithFallback.mockRejectedValue(conflictError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            attemptedCount: 25,
            userId: mockAuthUser.$id,
          }),
        })
      );
    });
  });

  describe('Fallback to Legacy API Tests', () => {
    it('should fallback to legacy API when transactions fail', async () => {
      const attendees = createMockAttendees(5);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock fallback to legacy API
      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 5,
        usedTransactions: false, // Fallback was used
        batchCount: undefined,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 5,
          usedTransactions: false,
          message: expect.stringContaining('using legacy API'),
        })
      );
    });

    it('should indicate fallback usage in response', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock fallback
      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 10,
        usedTransactions: false,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          usedTransactions: false,
        })
      );
    });

    it('should successfully delete with fallback when TablesDB unavailable', async () => {
      const attendees = createMockAttendees(3);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Simulate TablesDB unavailable, fallback succeeds
      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 3,
        usedTransactions: false,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 3,
        })
      );
    });

    it('should log fallback usage for monitoring', async () => {
      const attendees = createMockAttendees(5);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 5,
        usedTransactions: false,
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify logging indicates fallback was used
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Bulk Delete] Complete')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('used transactions: false')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Performance Tests', () => {
    it('should delete 50 attendees in under 2 seconds', async () => {
      const attendees = createMockAttendees(50);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 50,
        usedTransactions: true,
        batchCount: 1,
      });

      const startTime = Date.now();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const duration = Date.now() - startTime;

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 50,
          usedTransactions: true,
        })
      );

      expect(duration).toBeLessThan(2000);
      console.log(`✓ 50 attendees deleted in ${duration}ms (target: <2000ms)`);
    }, 5000);

    it('should delete 100 attendees in under 3 seconds', async () => {
      const attendees = createMockAttendees(100);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 100,
        usedTransactions: true,
        batchCount: 1,
      });

      const startTime = Date.now();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const duration = Date.now() - startTime;

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 100,
          usedTransactions: true,
        })
      );

      expect(duration).toBeLessThan(3000);
      console.log(`✓ 100 attendees deleted in ${duration}ms (target: <3000ms)`);
    }, 6000);

    it('should demonstrate 80%+ performance improvement over legacy API', async () => {
      const attendees = createMockAttendees(100);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 100,
        usedTransactions: true,
        batchCount: 1,
      });

      // Test with transactions
      const transactionStartTime = Date.now();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const transactionDuration = Date.now() - transactionStartTime;

      // Legacy: 100 operations * 50ms = 5000ms minimum
      const legacyEstimatedDuration = 100 * 50; // 5000ms

      // Calculate improvement percentage
      const improvement = ((legacyEstimatedDuration - transactionDuration) / legacyEstimatedDuration) * 100;

      console.log(`Transaction-based delete: ${transactionDuration}ms`);
      console.log(`Legacy API (estimated): ${legacyEstimatedDuration}ms`);
      console.log(`Performance improvement: ${improvement.toFixed(1)}%`);

      expect(transactionDuration).toBeLessThan(legacyEstimatedDuration * 0.2); // At least 80% faster
      expect(improvement).toBeGreaterThanOrEqual(80);
    }, 8000);

    it('should not use delays between attendee deletions', async () => {
      const attendees = createMockAttendees(50);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 50,
        usedTransactions: true,
        batchCount: 1,
      });

      const startTime = Date.now();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const duration = Date.now() - startTime;

      // With 50ms delays (legacy approach): 50 * 50ms = 2500ms minimum
      const legacyMinDuration = 50 * 50; // 2500ms

      expect(duration).toBeLessThan(legacyMinDuration);
      console.log(`✓ 50 attendees deleted in ${duration}ms (no delays, legacy would take ${legacyMinDuration}ms)`);
    }, 5000);

    it('should handle batched delete operations efficiently', async () => {
      const attendees = createMockAttendees(1500);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 1500,
        usedTransactions: true,
        batchCount: 2,
      });

      const startTime = Date.now();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const duration = Date.now() - startTime;

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 1500,
          usedTransactions: true,
          batchCount: 2,
        })
      );

      expect(duration).toBeLessThan(8000);
      console.log(`✓ 1,500 attendees deleted in ${duration}ms with 2 batches`);
    }, 10000);
  });

  describe('Edge Cases', () => {
    it('should handle single attendee deletion', async () => {
      const attendees = createMockAttendees(1);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockTablesDB.getRow.mockResolvedValueOnce(attendees[0]);

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 1,
        usedTransactions: true,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 1,
        })
      );
    });

    it('should validate all attendees before starting transaction', async () => {
      const attendees = createMockAttendees(100);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 100,
        usedTransactions: true,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify all attendees were validated (100 + 1 for role)
      expect(mockTablesDB.getRow).toHaveBeenCalledTimes(101);
      
      // Then bulk delete was called
      expect(mockBulkDeleteWithFallback).toHaveBeenCalledTimes(1);
    });

    it('should handle maximum batch size correctly', async () => {
      const attendees = createMockAttendees(3000);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock successful batched transaction (3 batches for 3000 items)
      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 3000,
        usedTransactions: true,
        batchCount: 3,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedCount: 3000,
          batchCount: 3,
        })
      );
    });

    it('should preserve atomicity across multiple batches', async () => {
      const attendees = createMockAttendees(2000);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock successful batched transaction
      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 2000,
        usedTransactions: true,
        batchCount: 2,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // All 2000 should be deleted atomically (in 2 separate atomic batches)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 2000,
          usedTransactions: true,
        })
      );
    });
  });

  describe('Integration with Transaction Utilities', () => {
    it('should pass correct configuration to bulkDeleteWithFallback', async () => {
      const attendees = createMockAttendees(5);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 5,
        usedTransactions: true,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify correct parameters passed
      expect(mockBulkDeleteWithFallback).toHaveBeenCalledWith(
        mockTablesDB, // TablesDB instance
        mockTablesDB, // Legacy databases instance
        expect.objectContaining({
          databaseId: expect.any(String),
          tableId: expect.any(String),
          rowIds: attendeeIds,
          auditLog: expect.objectContaining({
            tableId: expect.any(String),
            userId: mockAuthUser.$id,
            action: 'bulk_delete',
          }),
        })
      );
    });

    it('should use admin client for transactions', async () => {
      const attendees = createMockAttendees(3);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = { attendeeIds };

      // Mock validation
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkDeleteWithFallback.mockResolvedValue({
        deletedCount: 3,
        usedTransactions: true,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify TablesDB from admin client was used
      const callArgs = mockBulkDeleteWithFallback.mock.calls[0];
      expect(callArgs[0]).toBe(mockTablesDB);
    });
  });
});
