/**
 * Integration tests for single attendee CRUD operations with transactions
 * 
 * Tests the atomic CRUD functionality using TablesDB transactions API
 * to ensure attendee operations and audit logs are created atomically.
 * 
 * Requirements tested:
 * - 14.1: Unit tests covering success and failure cases
 * - 14.2: Integration tests verifying atomic behavior
 * - 14.3: Tests verify rollback behavior on failure
 * 
 * Task: 32. Write integration tests for single attendee operations
 * - Test atomic create with audit log
 * - Test atomic update with audit log
 * - Test atomic delete with audit log
 * - Test rollback when audit log fails
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import indexHandler from '@/pages/api/attendees/index';
import idHandler from '@/pages/api/attendees/[id]';
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

// Mock the API middleware to bypass authentication
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handler: any) => handler,
  AuthenticatedRequest: {} as any,
}));

// Mock log settings
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(true)),
}));

// Mock log formatting
vi.mock('@/lib/logFormatting', () => ({
  createAttendeeLogDetails: vi.fn((action, attendee, extra = {}) => ({
    type: 'attendee',
    action,
    attendee: {
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      barcodeNumber: attendee.barcodeNumber,
    },
    ...extra,
  })),
}));

describe('/api/attendees CRUD - Transaction Integration Tests', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let originalEnv: NodeJS.ProcessEnv;

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
      attendees: { create: true, read: true, update: true, delete: true },
      all: true,
    }),
  };

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    
    originalEnv = { ...process.env };
    
    // Enable transactions for attendee-crud
    process.env.ENABLE_TRANSACTIONS = 'true';
    process.env.TRANSACTIONS_ENDPOINTS = 'attendee-crud';
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'POST',
      cookies: { 'appwrite-session': 'test-session' },
      user: mockAuthUser,
      userProfile: { 
        ...mockUserProfile, 
        role: {
          ...mockAdminRole,
          permissions: {
            attendees: { create: true, read: true, update: true, delete: true },
            all: true,
          }
        }
      },
    } as any;
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('POST /api/attendees - Create with Transaction', () => {
    it('should create attendee atomically with audit log', async () => {
      const mockTx = { $id: 'tx-create-123' };
      const newAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: 'Test notes',
        photoUrl: null,
        customFieldValues: '{}',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock transaction flow
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock barcode uniqueness check
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      // Mock getRow to return created attendee
      mockTablesDB.getRow.mockResolvedValue(newAttendee);
      mockAdminTablesDB.getRow.mockResolvedValue(newAttendee);

      mockReq.method = 'POST';
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: 'Test notes',
        customFieldValues: [],
      };

      await indexHandler(mockReq as any, mockRes as any);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);

      // Verify operations include both attendee creation and audit log
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(1);
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      expect(operations).toHaveLength(2); // attendee + audit log

      // Verify attendee creation operation
      expect(operations[0]).toMatchObject({
        action: 'create',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID,
        data: {
          firstName: 'John',
          lastName: 'Doe',
          barcodeNumber: '123456',
          notes: 'Test notes',
        },
      });

      // Verify audit log operation
      expect(operations[1]).toMatchObject({
        action: 'create',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        data: {
          userId: mockAuthUser.$id,
          action: 'create',
        },
      });

      // Verify transaction was committed
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: mockTx.$id,
        commit: true,
      });

      // Verify success response
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          $id: 'attendee-123',
          firstName: 'John',
          lastName: 'Doe',
        })
      );
    });

    it('should rollback when audit log fails', async () => {
      const mockTx = { $id: 'tx-create-fail-123' };

      // Mock transaction creation
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      
      // Mock operations to fail (simulating audit log failure)
      mockTablesDB.createOperations.mockRejectedValue(
        new Error('Failed to create audit log')
      );
      
      // Mock rollback
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock barcode uniqueness check
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      mockReq.method = 'POST';
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: 'Test notes',
        customFieldValues: [],
      };

      await indexHandler(mockReq as any, mockRes as any);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);

      // Verify rollback was called
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: mockTx.$id,
        rollback: true,
      });

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });

    it('should use legacy API when transactions disabled', async () => {
      // Disable transactions
      process.env.ENABLE_TRANSACTIONS = 'false';

      const newAttendee = {
        $id: 'attendee-legacy-123',
        firstName: 'Jane',
        lastName: 'Smith',
        barcodeNumber: '654321',
        notes: '',
        photoUrl: null,
        customFieldValues: '{}',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock barcode uniqueness check
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      // Mock legacy createRow
      mockTablesDB.createRow.mockResolvedValue(newAttendee);

      mockReq.method = 'POST';
      mockReq.body = {
        firstName: 'Jane',
        lastName: 'Smith',
        barcodeNumber: '654321',
        customFieldValues: [],
      };

      await indexHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT used
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify legacy API was used
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(2); // attendee + audit log

      // Verify success response
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('PUT /api/attendees/[id] - Update with Transaction', () => {
    const attendeeId = 'attendee-update-123';
    const existingAttendee = {
      $id: attendeeId,
      firstName: 'John',
      lastName: 'Doe',
      barcodeNumber: '123456',
      notes: 'Original notes',
      photoUrl: null,
      customFieldValues: '{}',
      $createdAt: '2024-01-01T00:00:00.000Z',
      $updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('should update attendee atomically with audit log', async () => {
      const mockTx = { $id: 'tx-update-123' };
      const updatedAttendee = {
        ...existingAttendee,
        firstName: 'Jane',
        notes: 'Updated notes',
        $updatedAt: '2024-01-02T00:00:00.000Z',
      };

      // Mock transaction flow
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock getRow to return existing attendee first, then updated
      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee) // Initial fetch
        .mockResolvedValueOnce(updatedAttendee); // After update

      // Mock barcode uniqueness check (no duplicates)
      mockTablesDB.listRows
        .mockResolvedValueOnce({
          rows: [],
          total: 0,
        })
        // Mock custom fields fetch
        .mockResolvedValueOnce({
          rows: [],
          total: 0,
        });

      mockReq.method = 'PUT';
      mockReq.query = { id: attendeeId };
      mockReq.body = {
        firstName: 'Jane',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: 'Updated notes',
        customFieldValues: [],
      };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);

      // Verify operations include both attendee update and audit log
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(1);
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      expect(operations).toHaveLength(2); // update + audit log

      // Verify update operation
      expect(operations[0]).toMatchObject({
        action: 'update',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID,
        rowId: attendeeId,
        data: expect.objectContaining({
          firstName: 'Jane',
          notes: 'Updated notes',
        }),
      });

      // Verify audit log operation
      expect(operations[1]).toMatchObject({
        action: 'create',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        data: {
          userId: mockAuthUser.$id,
          attendeeId: attendeeId,
          action: 'update',
        },
      });

      // Verify transaction was committed
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: mockTx.$id,
        commit: true,
      });

      // Verify success response
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should rollback when audit log fails during update', async () => {
      const mockTx = { $id: 'tx-update-fail-123' };

      // Mock transaction creation
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      
      // Mock operations to fail
      mockTablesDB.createOperations.mockRejectedValue(
        new Error('Failed to create audit log')
      );
      
      // Mock rollback
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock getRow to return existing attendee
      mockTablesDB.getRow.mockResolvedValue(existingAttendee);
      mockAdminTablesDB.getRow.mockResolvedValue(existingAttendee);

      // Mock barcode uniqueness check
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      mockReq.method = 'PUT';
      mockReq.query = { id: attendeeId };
      mockReq.body = {
        firstName: 'Jane',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: 'Updated notes',
        customFieldValues: [],
      };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);

      // Verify rollback was called
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: mockTx.$id,
        rollback: true,
      });

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should use legacy API when transactions disabled for update', async () => {
      // Disable transactions
      process.env.ENABLE_TRANSACTIONS = 'false';

      const updatedAttendee = {
        ...existingAttendee,
        firstName: 'Jane',
        $updatedAt: '2024-01-02T00:00:00.000Z',
      };

      // Mock getRow to return existing attendee first, then updated
      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee)
        .mockResolvedValueOnce(updatedAttendee);

      // Mock updateRow
      mockTablesDB.updateRow.mockResolvedValue(updatedAttendee);

      // Mock barcode uniqueness check
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      mockReq.method = 'PUT';
      mockReq.query = { id: attendeeId };
      mockReq.body = {
        firstName: 'Jane',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: 'Original notes',
        customFieldValues: [],
      };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT used
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify legacy API was used
      expect(mockTablesDB.updateRow).toHaveBeenCalledTimes(1);
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(1); // audit log

      // Verify success response
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('DELETE /api/attendees/[id] - Delete with Transaction', () => {
    const attendeeId = 'attendee-delete-123';
    const existingAttendee = {
      $id: attendeeId,
      firstName: 'John',
      lastName: 'Doe',
      barcodeNumber: '123456',
      notes: 'Test notes',
      photoUrl: null,
      customFieldValues: '{}',
      $createdAt: '2024-01-01T00:00:00.000Z',
      $updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('should delete attendee atomically with audit log', async () => {
      const mockTx = { $id: 'tx-delete-123' };

      // Mock transaction flow
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock getRow to return existing attendee
      mockTablesDB.getRow.mockResolvedValue(existingAttendee);
      mockAdminTablesDB.getRow.mockResolvedValue(existingAttendee);

      mockReq.method = 'DELETE';
      mockReq.query = { id: attendeeId };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);

      // Verify operations include both attendee deletion and audit log
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(1);
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      expect(operations).toHaveLength(2); // delete + audit log

      // Verify delete operation
      expect(operations[0]).toMatchObject({
        action: 'delete',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID,
        rowId: attendeeId,
      });

      // Verify audit log operation
      expect(operations[1]).toMatchObject({
        action: 'create',
        tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        data: {
          userId: mockAuthUser.$id,
          action: 'delete',
        },
      });

      // Verify transaction was committed
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: mockTx.$id,
        commit: true,
      });

      // Verify success response
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Attendee deleted successfully',
      });
    });

    it('should rollback when audit log fails during delete', async () => {
      const mockTx = { $id: 'tx-delete-fail-123' };

      // Mock transaction creation
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      
      // Mock operations to fail
      mockTablesDB.createOperations.mockRejectedValue(
        new Error('Failed to create audit log')
      );
      
      // Mock rollback
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock getRow to return existing attendee
      mockTablesDB.getRow.mockResolvedValue(existingAttendee);
      mockAdminTablesDB.getRow.mockResolvedValue(existingAttendee);

      mockReq.method = 'DELETE';
      mockReq.query = { id: attendeeId };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was created
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(1);

      // Verify rollback was called
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: mockTx.$id,
        rollback: true,
      });

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should use legacy API when transactions disabled for delete', async () => {
      // Disable transactions
      process.env.ENABLE_TRANSACTIONS = 'false';

      // Mock getRow to return existing attendee
      mockTablesDB.getRow.mockResolvedValue(existingAttendee);
      mockAdminTablesDB.getRow.mockResolvedValue(existingAttendee);

      // Mock deleteRow
      mockTablesDB.deleteRow.mockResolvedValue(undefined);

      mockReq.method = 'DELETE';
      mockReq.query = { id: attendeeId };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT used
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify legacy API was used
      expect(mockTablesDB.deleteRow).toHaveBeenCalledTimes(1);
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(1); // audit log

      // Verify success response
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 404 when attendee not found', async () => {
      // Mock getRow to throw 404 error
      mockTablesDB.getRow.mockRejectedValue(
        Object.assign(new Error('Document not found'), { code: 404 })
      );

      mockReq.method = 'DELETE';
      mockReq.query = { id: 'non-existent-id' };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was NOT created
      expect(mockTablesDB.createTransaction).not.toHaveBeenCalled();

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Attendee not found',
        })
      );
    });
  });

  describe('Transaction Retry Logic', () => {
    it('should retry on conflict error during create', async () => {
      const mockTx = { $id: 'tx-retry-123' };
      const conflictError = Object.assign(new Error('Conflict'), { code: 409 });
      const newAttendee = {
        $id: 'attendee-retry-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: '',
        photoUrl: null,
        customFieldValues: '{}',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock transaction to fail first, then succeed
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError) // First attempt fails
        .mockResolvedValueOnce(undefined); // Second attempt succeeds
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock barcode uniqueness check
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      // Mock getRow to return created attendee
      mockTablesDB.getRow.mockResolvedValue(newAttendee);
      mockAdminTablesDB.getRow.mockResolvedValue(newAttendee);

      mockReq.method = 'POST';
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123456',
        customFieldValues: [],
      };

      await indexHandler(mockReq as any, mockRes as any);

      // Verify transaction was retried
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(2);

      // Verify success response after retry
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should retry on conflict error during update', async () => {
      const attendeeId = 'attendee-retry-update-123';
      const mockTx = { $id: 'tx-retry-update-123' };
      const conflictError = Object.assign(new Error('Conflict'), { code: 409 });
      const existingAttendee = {
        $id: attendeeId,
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: '',
        photoUrl: null,
        customFieldValues: '{}',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock transaction to fail first, then succeed
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock getRow
      mockTablesDB.getRow.mockResolvedValue(existingAttendee);
      mockAdminTablesDB.getRow.mockResolvedValue(existingAttendee);

      // Mock barcode uniqueness check
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      mockReq.method = 'PUT';
      mockReq.query = { id: attendeeId };
      mockReq.body = {
        firstName: 'Jane',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: 'Updated',
        customFieldValues: [],
      };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was retried
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(2);

      // Verify success response after retry
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should retry on conflict error during delete', async () => {
      const attendeeId = 'attendee-retry-delete-123';
      const mockTx = { $id: 'tx-retry-delete-123' };
      const conflictError = Object.assign(new Error('Conflict'), { code: 409 });
      const existingAttendee = {
        $id: attendeeId,
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: '',
        photoUrl: null,
        customFieldValues: '{}',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock transaction to fail first, then succeed
      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      // Mock getRow
      mockTablesDB.getRow.mockResolvedValue(existingAttendee);
      mockAdminTablesDB.getRow.mockResolvedValue(existingAttendee);

      mockReq.method = 'DELETE';
      mockReq.query = { id: attendeeId };

      await idHandler(mockReq as any, mockRes as any);

      // Verify transaction was retried
      expect(mockTablesDB.createTransaction).toHaveBeenCalledTimes(2);
      expect(mockTablesDB.createOperations).toHaveBeenCalledTimes(2);

      // Verify success response after retry
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Audit Log Integration', () => {
    it('should include attendee details in audit log for create', async () => {
      const mockTx = { $id: 'tx-audit-create-123' };
      const newAttendee = {
        $id: 'attendee-audit-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: '',
        photoUrl: null,
        customFieldValues: '{}',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      mockTablesDB.getRow.mockResolvedValue(newAttendee);
      mockAdminTablesDB.getRow.mockResolvedValue(newAttendee);

      mockReq.method = 'POST';
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123456',
        customFieldValues: [],
      };

      await indexHandler(mockReq as any, mockRes as any);

      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const auditLogOp = operations[1];

      // Verify audit log contains attendee details
      expect(auditLogOp.data.details).toBeDefined();
      const details = JSON.parse(auditLogOp.data.details);
      expect(details).toMatchObject({
        type: 'attendee',
        action: 'create',
        attendee: {
          firstName: 'John',
          lastName: 'Doe',
          barcodeNumber: '123456',
        },
      });
    });

    it('should include change details in audit log for update', async () => {
      const attendeeId = 'attendee-audit-update-123';
      const mockTx = { $id: 'tx-audit-update-123' };
      const existingAttendee = {
        $id: attendeeId,
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: 'Old notes',
        photoUrl: null,
        customFieldValues: '{}',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      mockTablesDB.getRow.mockResolvedValue(existingAttendee);
      mockAdminTablesDB.getRow.mockResolvedValue(existingAttendee);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      mockReq.method = 'PUT';
      mockReq.query = { id: attendeeId };
      mockReq.body = {
        firstName: 'Jane',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: 'New notes',
        customFieldValues: [],
      };

      await idHandler(mockReq as any, mockRes as any);

      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const auditLogOp = operations[1];

      // Verify audit log contains change details
      expect(auditLogOp.data.details).toBeDefined();
      const details = JSON.parse(auditLogOp.data.details);
      expect(details.changes).toBeDefined();
      expect(Array.isArray(details.changes)).toBe(true);
    });

    it('should not create audit log when logging disabled', async () => {
      const { shouldLog } = await import('@/lib/logSettings');
      vi.mocked(shouldLog).mockResolvedValue(false);

      const mockTx = { $id: 'tx-no-log-123' };
      const newAttendee = {
        $id: 'attendee-no-log-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123456',
        notes: '',
        photoUrl: null,
        customFieldValues: '{}',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockTablesDB.createTransaction.mockResolvedValue(mockTx);
      mockTablesDB.createOperations.mockResolvedValue(undefined);
      mockTablesDB.updateTransaction.mockResolvedValue(undefined);

      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      mockTablesDB.getRow.mockResolvedValue(newAttendee);
      mockAdminTablesDB.getRow.mockResolvedValue(newAttendee);

      mockReq.method = 'POST';
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123456',
        customFieldValues: [],
      };

      await indexHandler(mockReq as any, mockRes as any);

      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      
      // Verify only attendee operation, no audit log
      expect(operations).toHaveLength(1);
      expect(operations[0].action).toBe('create');
      expect(operations[0].tableId).toBe(process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID);
    });
  });
});
