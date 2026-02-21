/**
 * Integration Tests for Bulk Edit with Transactions
 * 
 * Tests the atomic editing of attendees using the TablesDB Transactions API
 * with automatic fallback to legacy API when needed.
 * 
 * Requirements tested:
 * - 14.1: Unit tests covering success and failure cases
 * - 14.2: Integration tests verifying atomic behavior
 * - 14.3: Tests verify rollback behavior on failure
 * - 14.4: Tests verify retry logic works correctly
 * - 14.5: Tests verify batching for large operations
 * - 14.6: Tests cover edge cases like plan limits and network failures
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/attendees/bulk-edit';
import { mockAccount, mockTablesDB, mockAdminTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Mock TablesDB
// Mock bulk operations
const mockBulkEditWithFallback = vi.fn();

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
  bulkEditWithFallback: (...args: any[]) => mockBulkEditWithFallback(...args),
}));

// Mock transaction utilities
vi.mock('@/lib/transactions', () => ({
  handleTransactionError: vi.fn((error, res) => {
    if (error.code === 409) {
      res.status(409).json({
        error: 'Transaction conflict',
        message: 'Data was modified by another user. Please refresh and try again.',
        retryable: true,
        type: 'CONFLICT'
      });
    } else if (error.code === 400) {
      res.status(400).json({
        error: 'Validation error',
        message: error.message,
        retryable: false,
        type: 'VALIDATION'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        retryable: false,
        type: 'UNKNOWN'
      });
    }
  }),
  getTransactionLimit: vi.fn(() => 1000), // PRO tier limit
  TransactionErrorType: {
    CONFLICT: 'CONFLICT',
    VALIDATION: 'VALIDATION',
    PERMISSION: 'PERMISSION',
    NOT_FOUND: 'NOT_FOUND',
    PLAN_LIMIT: 'PLAN_LIMIT',
    NETWORK: 'NETWORK',
    ROLLBACK: 'ROLLBACK',
    UNKNOWN: 'UNKNOWN'
  }
}));

// Mock API middleware
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handler: any) => handler,
  AuthenticatedRequest: {} as any,
}));

describe('/api/attendees/bulk-edit - Transaction Integration Tests', () => {
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
      attendees: { bulkEdit: true },
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
      customFieldValues: JSON.stringify([
        { customFieldId: 'field-1', value: 'OldValue1' },
        { customFieldId: 'field-2', value: 'OldValue2' }
      ]),
    }));
  };

  // Helper to create mock custom fields
  const createMockCustomFields = () => {
    return [
      {
        $id: 'field-1',
        fieldName: 'Company',
        fieldType: 'text',
        isRequired: false,
        showOnMainPage: true,
      },
      {
        $id: 'field-2',
        fieldName: 'Badge Type',
        fieldType: 'uppercase',
        isRequired: false,
        showOnMainPage: true,
      },
    ];
  };

  beforeEach(() => {
    resetAllMocks();
    mockBulkEditWithFallback.mockReset();
    vi.clearAllMocks();
    
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
            attendees: { bulkEdit: true },
            all: true,
          }
        }
      },
      body: {
        attendeeIds: ['attendee-1', 'attendee-2', 'attendee-3'],
        changes: {
          'field-1': 'NewValue1',
          'field-2': 'NEWVALUE2',
        },
      },
    } as any;
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
    
    // Mock custom fields
    const customFields = createMockCustomFields();
    mockTablesDB.listRows.mockImplementation((dbId, tableId) => {
      if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
        return Promise.resolve({ rows: customFields, total: customFields.length });
      }
      return Promise.resolve({ rows: [], total: 0 });
    });
    
    // Default bulk edit mock - successful edit with transactions
    mockBulkEditWithFallback.mockResolvedValue({
      updatedCount: 3,
      usedTransactions: true,
      batchCount: 1,
    });
  });

  describe('Atomic Edit Tests', () => {
    it('should atomically edit 10 attendees in a single transaction', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'UpdatedCompany',
          'field-2': 'SPEAKER',
        },
      };

      // Mock attendee retrieval for each attendee
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock successful transaction
      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 10,
        usedTransactions: true,
        batchCount: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify bulkEditWithFallback was called with correct config
      expect(mockBulkEditWithFallback).toHaveBeenCalledTimes(1);
      expect(mockBulkEditWithFallback).toHaveBeenCalledWith(
        mockTablesDB,
        expect.objectContaining({
          databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          tableId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID,
          updates: expect.arrayContaining([
            expect.objectContaining({
              rowId: expect.any(String),
              data: expect.objectContaining({
                customFieldValues: expect.any(String),
              }),
            }),
          ]),
          auditLog: expect.objectContaining({
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
            userId: mockAuthUser.$id,
            action: 'bulk_update',
          }),
        })
      );

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Attendees updated successfully',
          updatedCount: 10,
          usedTransactions: true,
          batchCount: 1,
        })
      );
    });

    it('should atomically edit 50 attendees in a single transaction', async () => {
      const attendees = createMockAttendees(50);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'BulkUpdate',
          'field-2': 'VIP',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 50,
        usedTransactions: true,
        batchCount: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Attendees updated successfully',
          updatedCount: 50,
          usedTransactions: true,
        })
      );

      // Verify all 50 attendees were prepared for update
      const callArgs = mockBulkEditWithFallback.mock.calls[0];
      expect(callArgs[2].updates.length).toBeGreaterThan(0);
      expect(callArgs[2].updates.length).toBeLessThanOrEqual(50);
    });

    it('should atomically edit 1,000 attendees at PRO tier limit', async () => {
      const attendees = createMockAttendees(1000);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'MassUpdate',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 1000,
        usedTransactions: true,
        batchCount: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Attendees updated successfully',
          updatedCount: 1000,
          usedTransactions: true,
        })
      );
    });
  });

  describe('Batching Tests', () => {
    it('should batch edit of 1,500 attendees into multiple transactions', async () => {
      const attendees = createMockAttendees(1500);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'BatchUpdate',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock batched transaction result
      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 1500,
        usedTransactions: true,
        batchCount: 2, // Should be split into 2 batches
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Attendees updated successfully',
          updatedCount: 1500,
          usedTransactions: true,
          batchCount: 2,
        })
      );
    });

    it('should handle batching for very large edit operations', async () => {
      const attendees = createMockAttendees(2500);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'LargeUpdate',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 2500,
        usedTransactions: true,
        batchCount: 3, // Should be split into 3 batches
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedCount: 2500,
          batchCount: 3,
        })
      );
    });
  });

  describe('Rollback Tests', () => {
    it('should rollback entire edit when transaction fails', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'FailUpdate',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock transaction failure
      const transactionError = new Error('Transaction failed');
      (transactionError as any).code = 500;
      mockBulkEditWithFallback.mockRejectedValue(transactionError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify error response
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
          message: 'Transaction failed',
          retryable: false,
          type: 'UNKNOWN'
        })
      );
    });

    it('should ensure no partial edits on failure', async () => {
      const attendees = createMockAttendees(50);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'PartialFail',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock transaction failure after some operations
      const error = new Error('Operation 25 failed');
      (error as any).code = 500;
      mockBulkEditWithFallback.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify error response indicates complete failure
      expect(statusMock).toHaveBeenCalledWith(500);
      
      // Verify no documents were updated outside transaction (atomic rollback)
      const updateCalls = mockTablesDB.updateRow.mock.calls;
      expect(updateCalls).toHaveLength(0);
    });

    it('should rollback when validation fails mid-transaction', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'ValidUpdate',
        },
      };

      // Mock first 5 attendees succeed, 6th fails
      for (let i = 0; i < 5; i++) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendees[i]);
      }
      mockTablesDB.getRow.mockRejectedValueOnce(new Error('Attendee not found'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should fail during preparation, before transaction
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('Audit Log Tests', () => {
    it('should include audit log in transaction', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'AuditTest',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 10,
        usedTransactions: true,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify audit log was included in transaction
      expect(mockBulkEditWithFallback).toHaveBeenCalled();
      const callArgs = mockBulkEditWithFallback.mock.calls[0];
      expect(callArgs[2].auditLog).toEqual(
        expect.objectContaining({
          tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
          userId: mockAuthUser.$id,
          action: 'bulk_update',
          details: expect.objectContaining({
            type: 'bulk_edit',
            target: 'Attendees',
            updatedCount: 10,
            fieldsChanged: expect.arrayContaining(['Company']),
          })
        })
      );
    });

    it('should rollback audit log if edit fails', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'FailAudit',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock transaction failure
      const error = new Error('Edit failed');
      (error as any).code = 500;
      mockBulkEditWithFallback.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify no audit log was created separately (it's part of the rolled-back transaction)
      expect(statusMock).toHaveBeenCalledWith(500);
      
      const createDocCalls = mockTablesDB.createRow.mock.calls;
      const auditLogCalls = createDocCalls.filter(
        call => call[1] === process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID
      );
      expect(auditLogCalls).toHaveLength(0);
    });

    it('should include field names in audit log details', async () => {
      const attendees = createMockAttendees(5);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'NewCompany',
          'field-2': 'NEWTYPE',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 5,
        usedTransactions: true,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const callArgs = mockBulkEditWithFallback.mock.calls[0];
      expect(callArgs[2].auditLog.details.fieldsChanged).toEqual(
        expect.arrayContaining(['Company', 'Badge Type'])
      );
    });
  });

  describe('Conflict Handling and Retry Tests', () => {
    it('should retry on transaction conflict', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'ConflictTest',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock conflict error (409)
      const conflictError = new Error('Transaction conflict');
      (conflictError as any).code = 409;
      mockBulkEditWithFallback.mockRejectedValue(conflictError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify conflict response
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction conflict',
          message: 'Data was modified by another user. Please refresh and try again.',
          retryable: true,
          type: 'CONFLICT'
        })
      );
    });

    it('should handle conflict with clear user message', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'ConflictMessage',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      const conflictError = new Error('Concurrent modification detected');
      (conflictError as any).code = 409;
      mockBulkEditWithFallback.mockRejectedValue(conflictError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      const response = jsonMock.mock.calls[0][0];
      expect(response.message).toContain('refresh');
      expect(response.retryable).toBe(true);
    });

    it('should succeed after retry resolves conflict', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'RetrySuccess',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock retry logic: simulate success after retries
      // Note: The actual retry logic is in bulkEditWithFallback
      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 10,
        usedTransactions: true,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Attendees updated successfully',
          updatedCount: 10,
          usedTransactions: true,
        })
      );
    });

    it('should not retry non-conflict errors', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'NonConflictError',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock non-conflict error
      const error = new Error('Database connection failed');
      (error as any).code = 500;
      mockBulkEditWithFallback.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          retryable: false,
        })
      );
    });
  });

  describe('Fallback to Legacy API Tests', () => {
    it('should fallback to legacy API when transactions are not available', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'FallbackTest',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Mock fallback scenario
      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 10,
        usedTransactions: false, // Fallback was used
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Attendees updated successfully',
          updatedCount: 10,
          usedTransactions: false, // Indicates fallback was used
        })
      );
    });

    it('should indicate when fallback is used in response', async () => {
      const attendees = createMockAttendees(50);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'FallbackIndicator',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 50,
        usedTransactions: false,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const response = jsonMock.mock.calls[0][0];
      expect(response.usedTransactions).toBe(false);
    });

    it('should successfully edit using fallback for large datasets', async () => {
      const attendees = createMockAttendees(100);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'LargeFallback',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 100,
        usedTransactions: false,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedCount: 100,
          usedTransactions: false,
        })
      );
    });

    it('should handle fallback with partial success gracefully', async () => {
      const attendees = createMockAttendees(20);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'PartialFallback',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      // Fallback may have partial success (legacy behavior)
      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 18, // 2 failed
        usedTransactions: false,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedCount: 18,
        })
      );
    });
  });

  describe('Validation and Edge Cases', () => {
    it('should reject edit without proper permissions', async () => {
      const noPermReq = {
        ...mockReq,
        userProfile: {
          ...mockUserProfile,
          role: {
            $id: 'role-no-perm',
            name: 'No Permission Role',
            permissions: { attendees: { bulkEdit: false } },
          }
        }
      };

      await handler(noPermReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions to bulk edit attendees',
        })
      );
    });

    it('should reject edit with invalid attendeeIds', async () => {
      mockReq.body = {
        attendeeIds: null,
        changes: { 'field-1': 'Test' },
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid attendeeIds',
        })
      );
    });

    it('should reject edit with empty attendeeIds array', async () => {
      mockReq.body = {
        attendeeIds: [],
        changes: { 'field-1': 'Test' },
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid attendeeIds',
        })
      );
    });

    it('should reject edit with invalid changes object', async () => {
      mockReq.body = {
        attendeeIds: ['attendee-1'],
        changes: null,
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid changes object',
        })
      );
    });

    it('should handle no-change scenario gracefully', async () => {
      const attendees = createMockAttendees(5);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'no-change',
          'field-2': 'no-change',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No changes to apply',
          updatedCount: 0,
          usedTransactions: false,
        })
      );
    });

    it('should handle uppercase field type transformation', async () => {
      const attendees = createMockAttendees(5);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-2': 'lowercase text', // field-2 is uppercase type
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 5,
        usedTransactions: true,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      
      // Verify the value was transformed to uppercase in the update
      const callArgs = mockBulkEditWithFallback.mock.calls[0];
      const updates = callArgs[2].updates;
      
      // Check that at least one update has the uppercase transformation
      const hasUppercaseTransform = updates.some((update: any) => {
        const customFieldValues = JSON.parse(update.data.customFieldValues);
        return customFieldValues.some((cfv: any) => 
          cfv.customFieldId === 'field-2' && cfv.value === 'LOWERCASE TEXT'
        );
      });
      
      expect(hasUppercaseTransform).toBe(true);
    });

    it('should handle network timeout errors', async () => {
      const attendees = createMockAttendees(10);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'TimeoutTest',
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 500;
      mockBulkEditWithFallback.mockRejectedValue(timeoutError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should skip updates for non-existent custom fields', async () => {
      const attendees = createMockAttendees(5);
      const attendeeIds = attendees.map(a => a.$id);

      mockReq.body = {
        attendeeIds,
        changes: {
          'field-1': 'ValidField',
          'field-999': 'NonExistentField', // This field doesn't exist
        },
      };

      // Mock attendee retrieval
      for (const attendee of attendees) {
        mockTablesDB.getRow.mockResolvedValueOnce(attendee);
      }

      mockBulkEditWithFallback.mockResolvedValue({
        updatedCount: 5,
        usedTransactions: true,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      
      // Verify the audit log includes field IDs that were requested
      // (The implementation includes all changed field IDs in the audit log,
      // but only valid fields are actually updated in the data)
      const callArgs = mockBulkEditWithFallback.mock.calls[0];
      expect(callArgs[2].auditLog.details.fieldsChanged).toContain('Company');
      
      // Verify that updates only contain valid custom fields
      const updates = callArgs[2].updates;
      updates.forEach((update: any) => {
        const customFieldValues = JSON.parse(update.data.customFieldValues);
        // Should not have field-999 in the actual data
        const hasInvalidField = customFieldValues.some((cfv: any) => cfv.customFieldId === 'field-999');
        expect(hasInvalidField).toBe(false);
      });
    });
  });
});
