/**
 * Unit Tests for Mobile Sync Attendees API
 * 
 * Tests full sync, delta sync, and pagination for mobile attendee synchronization.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 6.1, 6.4
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Set environment variables before importing handler
beforeAll(() => {
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test-db';
  process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID = 'attendees';
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
import handler from '@/pages/api/mobile/sync/attendees';

describe('/api/mobile/sync/attendees - Mobile Sync Attendees API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;

  const mockAuthUser = {
    $id: 'auth-user-123',
    email: 'scanner@example.com',
    name: 'Scanner User',
  };

  const mockUserProfile = {
    $id: 'profile-123',
    userId: 'auth-user-123',
    email: 'scanner@example.com',
    name: 'Scanner User',
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

  const mockAttendees = [
    {
      $id: 'att-1',
      firstName: 'John',
      lastName: 'Doe',
      barcodeNumber: '1234567890',
      photoUrl: 'https://example.com/photo1.jpg',
      customFieldValues: JSON.stringify({ 'field-vip-status': 'Gold' }),
      $createdAt: '2024-01-01T00:00:00.000Z',
      $updatedAt: '2024-01-10T00:00:00.000Z',
    },
    {
      $id: 'att-2',
      firstName: 'Jane',
      lastName: 'Smith',
      barcodeNumber: '0987654321',
      photoUrl: null,
      customFieldValues: JSON.stringify({ 'field-vip-status': 'Silver' }),
      $createdAt: '2024-01-02T00:00:00.000Z',
      $updatedAt: '2024-01-11T00:00:00.000Z',
    },
  ];

  const mockAccessControl = [
    {
      $id: 'ac-1',
      attendeeId: 'att-1',
      accessEnabled: true,
      validFrom: '2024-01-15T08:00:00.000Z',
      validUntil: '2024-01-17T23:59:59.000Z',
    },
    {
      $id: 'ac-2',
      attendeeId: 'att-2',
      accessEnabled: false,
      validFrom: null,
      validUntil: null,
    },
  ];

  // Helper to set up auth mocks
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
      method: 'GET',
      query: {},
      cookies: { 'appwrite-session': 'test-session' },
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: setHeaderMock,
    };

    setupAuthMocks();
  });

  describe('Full Sync', () => {
    it('should return all attendees with access control data', async () => {
      // Mock call sequence:
      // 1) user profile lookup (via middleware)
      // 2) custom fields list (for field name mapping)
      // 3) attendees list
      // 4) access control list (for first batch of attendees)
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }) // custom fields
        .mockResolvedValueOnce({ documents: mockAttendees, total: 2 })
        .mockResolvedValueOnce({ documents: mockAccessControl, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            attendees: expect.arrayContaining([
              expect.objectContaining({
                id: 'att-1',
                firstName: 'John',
                lastName: 'Doe',
                barcodeNumber: '1234567890',
                accessControl: expect.objectContaining({
                  accessEnabled: true,
                  validFrom: '2024-01-15T08:00:00.000Z',
                  validUntil: '2024-01-17T23:59:59.000Z',
                }),
              }),
              expect.objectContaining({
                id: 'att-2',
                firstName: 'Jane',
                lastName: 'Smith',
                accessControl: expect.objectContaining({
                  accessEnabled: false,
                }),
              }),
            ]),
            pagination: expect.objectContaining({
              total: 2,
              limit: 1000,
              offset: 0,
              hasMore: false,
            }),
          }),
        })
      );
    });

    it('should parse custom field values correctly', async () => {
      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }) // custom fields
        .mockResolvedValueOnce({ documents: [mockAttendees[0]], total: 1 })
        .mockResolvedValueOnce({ documents: [mockAccessControl[0]], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.attendees[0].customFieldValues).toEqual({ 'field-vip-status': 'Gold' });
    });

    it('should provide default access control when none exists', async () => {
      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list
      // 4) empty access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }) // custom fields
        .mockResolvedValueOnce({ documents: [mockAttendees[0]], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }); // access control

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.attendees[0].accessControl).toEqual({
        accessEnabled: true,
        validFrom: null,
        validUntil: null,
      });
    });
  });

  describe('Delta Sync', () => {
    it('should filter attendees by since parameter', async () => {
      mockReq.query = { since: '2024-01-10T12:00:00.000Z' };

      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list (filtered)
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }) // custom fields
        .mockResolvedValueOnce({ documents: [mockAttendees[1]], total: 1 })
        .mockResolvedValueOnce({ documents: [mockAccessControl[1]], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.attendees).toHaveLength(1);
      expect(response.data.attendees[0].id).toBe('att-2');
    });

    it('should return 400 for invalid since parameter', async () => {
      mockReq.query = { since: 'invalid-date' };

      // Mock user profile lookup
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
  });

  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      mockReq.query = { limit: '1' };

      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list (limited)
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }) // custom fields
        .mockResolvedValueOnce({ documents: [mockAttendees[0]], total: 2 })
        .mockResolvedValueOnce({ documents: [mockAccessControl[0]], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.pagination).toEqual({
        total: 2,
        limit: 1,
        offset: 0,
        hasMore: true,
      });
    });

    it('should respect offset parameter', async () => {
      mockReq.query = { offset: '1' };

      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list (offset)
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }) // custom fields
        .mockResolvedValueOnce({ documents: [mockAttendees[1]], total: 2 })
        .mockResolvedValueOnce({ documents: [mockAccessControl[1]], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.pagination.offset).toBe(1);
    });

    it('should cap limit at 5000', async () => {
      mockReq.query = { limit: '10000' };

      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }) // custom fields
        .mockResolvedValueOnce({ documents: mockAttendees, total: 2 })
        .mockResolvedValueOnce({ documents: mockAccessControl, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.pagination.limit).toBe(5000);
    });

    it('should clamp negative limit to minimum of 1', async () => {
      mockReq.query = { limit: '-10' };

      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }) // custom fields
        .mockResolvedValueOnce({ documents: mockAttendees, total: 2 })
        .mockResolvedValueOnce({ documents: mockAccessControl, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.pagination.limit).toBe(1);
    });

    it('should clamp negative offset to 0', async () => {
      mockReq.query = { offset: '-5' };

      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }) // custom fields
        .mockResolvedValueOnce({ documents: mockAttendees, total: 2 })
        .mockResolvedValueOnce({ documents: mockAccessControl, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.pagination.offset).toBe(0);
    });

    it('should handle invalid limit gracefully (use default 1000)', async () => {
      mockReq.query = { limit: 'invalid' };

      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }) // custom fields
        .mockResolvedValueOnce({ documents: mockAttendees, total: 2 })
        .mockResolvedValueOnce({ documents: mockAccessControl, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.pagination.limit).toBe(1000);
    });

    it('should handle invalid offset gracefully (use default 0)', async () => {
      mockReq.query = { offset: 'invalid' };

      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }) // custom fields
        .mockResolvedValueOnce({ documents: mockAttendees, total: 2 })
        .mockResolvedValueOnce({ documents: mockAccessControl, total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.pagination.offset).toBe(0);
    });
  });

  describe('Permissions', () => {
    it('should return 403 when user lacks attendee read permission', async () => {
      const noPermRole = {
        ...mockScannerRole,
        permissions: JSON.stringify({}),
      };

      mockDatabases.getDocument.mockResolvedValue(noPermRole);
      // Mock call sequence:
      // 1) user profile lookup (with no permissions)
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [{ ...mockUserProfile, roleId: 'role-no-perm' }], total: 1 });

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

  describe('Custom Field Name Mapping', () => {
    it('should map field IDs to display names in customFieldValuesByName', async () => {
      const mockCustomFields = [
        {
          $id: 'field-vip-status',
          fieldName: 'VIP Status',
          internalFieldName: 'vipStatus',
        },
        {
          $id: 'field-department',
          fieldName: 'Department',
          internalFieldName: 'dept',
        },
      ];

      const attendeeWithFieldIds = {
        $id: 'att-1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '1234567890',
        photoUrl: 'https://example.com/photo1.jpg',
        // Custom field values stored with field IDs as keys
        customFieldValues: JSON.stringify({
          'field-vip-status': 'Gold',
          'field-department': 'Engineering',
        }),
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-10T00:00:00.000Z',
      };

      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 2 })
        .mockResolvedValueOnce({ documents: [attendeeWithFieldIds], total: 1 })
        .mockResolvedValueOnce({ documents: [mockAccessControl[0]], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      const attendee = response.data.attendees[0];

      // Should have both customFieldValues (with IDs) and customFieldValuesByName (with display names)
      expect(attendee.customFieldValues).toEqual({
        'field-vip-status': 'Gold',
        'field-department': 'Engineering',
      });

      expect(attendee.customFieldValuesByName).toEqual({
        'VIP Status': 'Gold',
        'Department': 'Engineering',
      });
    });

    it('should handle missing field definitions gracefully', async () => {
      const attendeeWithFieldIds = {
        $id: 'att-1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '1234567890',
        photoUrl: 'https://example.com/photo1.jpg',
        customFieldValues: JSON.stringify({
          'field-vip-status': 'Gold',
          'field-unknown': 'SomeValue',
        }),
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-10T00:00:00.000Z',
      };

      const mockCustomFields = [
        {
          $id: 'field-vip-status',
          fieldName: 'VIP Status',
          internalFieldName: 'vipStatus',
        },
        // field-unknown is not in the custom fields list
      ];

      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: [attendeeWithFieldIds], total: 1 })
        .mockResolvedValueOnce({ documents: [mockAccessControl[0]], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      const attendee = response.data.attendees[0];

      // Known field should be mapped to display name
      expect(attendee.customFieldValuesByName['VIP Status']).toBe('Gold');

      // Unknown field should fall back to field ID
      expect(attendee.customFieldValuesByName['field-unknown']).toBe('SomeValue');
    });

    it('should handle empty custom field values', async () => {
      const attendeeWithNoCustomFields = {
        $id: 'att-3',
        firstName: 'Bob',
        lastName: 'Johnson',
        barcodeNumber: '5555555555',
        photoUrl: 'https://example.com/photo3.jpg',
        customFieldValues: JSON.stringify({}),
        $createdAt: '2024-01-03T00:00:00.000Z',
        $updatedAt: '2024-01-12T00:00:00.000Z',
      };

      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [attendeeWithNoCustomFields], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      const attendee = response.data.attendees[0];

      expect(attendee.customFieldValues).toEqual({});
      expect(attendee.customFieldValuesByName).toEqual({});
    });

    it('should handle null customFieldValues', async () => {
      const attendeeWithNullCustomFields = {
        $id: 'att-4',
        firstName: 'Alice',
        lastName: 'Williams',
        barcodeNumber: '6666666666',
        photoUrl: 'https://example.com/photo4.jpg',
        customFieldValues: null,
        $createdAt: '2024-01-04T00:00:00.000Z',
        $updatedAt: '2024-01-13T00:00:00.000Z',
      };

      // Mock call sequence:
      // 1) user profile lookup
      // 2) custom fields list
      // 3) attendees list
      // 4) access control list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [attendeeWithNullCustomFields], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      const attendee = response.data.attendees[0];

      expect(attendee.customFieldValues).toEqual({});
      expect(attendee.customFieldValuesByName).toEqual({});
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for non-GET methods', async () => {
      mockReq.method = 'POST';

      // Mock user profile lookup
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['GET']);
      expect(statusMock).toHaveBeenCalledWith(405);
    });
  });
});
