import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import bulkEditHandler from '../bulk-edit';

// Mock dependencies
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(() => ({
    databases: {
      listDocuments: vi.fn(),
      getDocument: vi.fn(),
      updateDocument: vi.fn(),
    },
    tablesDB: {
      executeTransaction: vi.fn(),
    },
  })),
}));

vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handler: any) => handler,
}));

vi.mock('@/lib/bulkOperations', () => ({
  bulkEditWithFallback: vi.fn(),
}));

vi.mock('@/lib/transactions', () => ({
  handleTransactionError: vi.fn(),
}));

describe('Bulk Operations - Printable Field Tracking', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn().mockReturnThis();

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: vi.fn(),
      end: vi.fn(),
    };

    mockReq = {
      method: 'POST',
      user: { $id: 'user-123' },
      userProfile: {
        role: {
          permissions: {
            attendees: { bulkEdit: true },
          },
        },
      },
    } as any;
  });

  describe('Printable Field Logic', () => {
    it('should update lastSignificantUpdate when printable field changes', async () => {
      const { createSessionClient } = await import('@/lib/appwrite');
      const { bulkEditWithFallback } = await import('@/lib/bulkOperations');

      const mockDatabases = {
        listDocuments: vi.fn().mockResolvedValue({
          documents: [
            {
              $id: 'field-1',
              fieldName: 'Email',
              fieldType: 'text',
              printable: true, // This is a printable field
            },
            {
              $id: 'field-2',
              fieldName: 'Internal Notes',
              fieldType: 'text',
              printable: false, // This is NOT a printable field
            },
          ],
        }),
        getDocument: vi.fn().mockResolvedValue({
          $id: 'attendee-1',
          customFieldValues: JSON.stringify([
            { customFieldId: 'field-1', value: 'old@email.com' },
            { customFieldId: 'field-2', value: 'old notes' },
          ]),
          $createdAt: '2024-01-01T00:00:00.000Z',
        }),
      };

      (createSessionClient as any).mockReturnValue({
        databases: mockDatabases,
        tablesDB: {},
      });

      (bulkEditWithFallback as any).mockResolvedValue({
        updatedCount: 1,
        usedTransactions: true,
      });

      mockReq.body = {
        attendeeIds: ['attendee-1'],
        changes: {
          'field-1': 'new@email.com', // Changing printable field
        },
      };

      await bulkEditHandler(mockReq as any, mockRes as any);

      // Verify bulkEditWithFallback was called with lastSignificantUpdate
      expect(bulkEditWithFallback).toHaveBeenCalled();
      const callArgs = (bulkEditWithFallback as any).mock.calls[0];
      const updates = callArgs[2].updates;
      
      expect(updates).toHaveLength(1);
      expect(updates[0].data).toHaveProperty('lastSignificantUpdate');
      expect(updates[0].data.lastSignificantUpdate).toBeTruthy();
    });

    it('should NOT update lastSignificantUpdate when only non-printable field changes', async () => {
      const { createSessionClient } = await import('@/lib/appwrite');
      const { bulkEditWithFallback } = await import('@/lib/bulkOperations');

      const mockDatabases = {
        listDocuments: vi.fn().mockResolvedValue({
          documents: [
            {
              $id: 'field-1',
              fieldName: 'Email',
              fieldType: 'text',
              printable: true,
            },
            {
              $id: 'field-2',
              fieldName: 'Internal Notes',
              fieldType: 'text',
              printable: false, // NOT printable
            },
          ],
        }),
        getDocument: vi.fn().mockResolvedValue({
          $id: 'attendee-1',
          customFieldValues: JSON.stringify([
            { customFieldId: 'field-1', value: 'email@test.com' },
            { customFieldId: 'field-2', value: 'old notes' },
          ]),
          $createdAt: '2024-01-01T00:00:00.000Z',
          lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
        }),
      };

      (createSessionClient as any).mockReturnValue({
        databases: mockDatabases,
        tablesDB: {},
      });

      (bulkEditWithFallback as any).mockResolvedValue({
        updatedCount: 1,
        usedTransactions: true,
      });

      mockReq.body = {
        attendeeIds: ['attendee-1'],
        changes: {
          'field-2': 'new notes', // Changing NON-printable field only
        },
      };

      await bulkEditHandler(mockReq as any, mockRes as any);

      // Verify bulkEditWithFallback was called
      expect(bulkEditWithFallback).toHaveBeenCalled();
      const callArgs = (bulkEditWithFallback as any).mock.calls[0];
      const updates = callArgs[2].updates;
      
      expect(updates).toHaveLength(1);
      // lastSignificantUpdate should NOT be in the update data (or should be the old value)
      const updateData = updates[0].data;
      if (updateData.lastSignificantUpdate) {
        // If it exists, it should be the initialization value, not a new timestamp
        expect(updateData.lastSignificantUpdate).toBe('2024-01-01T00:00:00.000Z');
      }
    });

    it('should handle errors for individual attendees without failing entire batch', async () => {
      const { createSessionClient } = await import('@/lib/appwrite');
      const { bulkEditWithFallback } = await import('@/lib/bulkOperations');

      const mockDatabases = {
        listDocuments: vi.fn().mockResolvedValue({
          documents: [
            {
              $id: 'field-1',
              fieldName: 'Email',
              fieldType: 'text',
              printable: true,
            },
          ],
        }),
        getDocument: vi.fn()
          .mockResolvedValueOnce({
            $id: 'attendee-1',
            customFieldValues: JSON.stringify([
              { customFieldId: 'field-1', value: 'email1@test.com' },
            ]),
            $createdAt: '2024-01-01T00:00:00.000Z',
          })
          .mockRejectedValueOnce(new Error('Attendee not found'))
          .mockResolvedValueOnce({
            $id: 'attendee-3',
            customFieldValues: JSON.stringify([
              { customFieldId: 'field-1', value: 'email3@test.com' },
            ]),
            $createdAt: '2024-01-01T00:00:00.000Z',
          }),
      };

      (createSessionClient as any).mockReturnValue({
        databases: mockDatabases,
        tablesDB: {},
      });

      (bulkEditWithFallback as any).mockResolvedValue({
        updatedCount: 2,
        usedTransactions: true,
      });

      mockReq.body = {
        attendeeIds: ['attendee-1', 'attendee-2', 'attendee-3'],
        changes: {
          'field-1': 'newemail@test.com',
        },
      };

      await bulkEditHandler(mockReq as any, mockRes as any);

      // Should continue processing despite error on attendee-2
      expect(bulkEditWithFallback).toHaveBeenCalled();
      const callArgs = (bulkEditWithFallback as any).mock.calls[0];
      const updates = callArgs[2].updates;
      
      // Should have 2 updates (attendee-1 and attendee-3), skipping attendee-2
      expect(updates).toHaveLength(2);
    });
  });
});
