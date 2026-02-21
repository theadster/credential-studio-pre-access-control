/**
 * Unit Tests for Mobile Custom Fields API
 * 
 * Tests custom field definitions retrieval for mobile app rule building.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 3.3
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { mockAccount, mockTablesDB, mockAdminTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Set environment variables before importing handler
beforeAll(() => {
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test-db';
  process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID = 'custom_fields';
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
import handler from '@/pages/api/mobile/custom-fields';

describe('/api/mobile/custom-fields - Mobile Custom Fields API', () => {
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
      customFields: { read: true },
    }),
  };

  const mockCustomFields = [
    {
      $id: 'cf-1',
      fieldName: 'VIP Status',
      internalFieldName: 'vipStatus',
      fieldType: 'select',
      fieldOptions: JSON.stringify(['Gold', 'Silver', 'Bronze']),
      required: true,
      order: 1,
      deletedAt: null,
      $createdAt: '2024-01-01T00:00:00.000Z',
      $updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      $id: 'cf-2',
      fieldName: 'Company',
      internalFieldName: 'company',
      fieldType: 'text',
      fieldOptions: null,
      required: false,
      order: 2,
      deletedAt: null,
      $createdAt: '2024-01-02T00:00:00.000Z',
      $updatedAt: '2024-01-02T00:00:00.000Z',
    },
    {
      $id: 'cf-3',
      fieldName: 'Backstage Access',
      internalFieldName: 'backstageAccess',
      fieldType: 'boolean',
      fieldOptions: null,
      required: false,
      order: 3,
      deletedAt: null,
      $createdAt: '2024-01-03T00:00:00.000Z',
      $updatedAt: '2024-01-03T00:00:00.000Z',
    },
    {
      $id: 'cf-4',
      fieldName: 'Deleted Field',
      internalFieldName: 'deletedField',
      fieldType: 'text',
      fieldOptions: null,
      required: false,
      order: 4,
      deletedAt: '2024-01-10T00:00:00.000Z',
      $createdAt: '2024-01-04T00:00:00.000Z',
      $updatedAt: '2024-01-10T00:00:00.000Z',
    },
  ];

  // Helper to set up auth mocks
  const setupAuthMocks = () => {
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockTablesDB.getRow.mockResolvedValue(mockScannerRole);
    mockAdminTablesDB.getRow.mockResolvedValue(mockScannerRole);
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

  describe('GET /api/mobile/custom-fields', () => {
    it('should return all non-deleted custom fields', async () => {
      // Mock: 1) user profile lookup, 2) custom fields list
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ 
          rows: mockCustomFields.filter(f => !f.deletedAt), 
          total: 3 
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            fields: expect.arrayContaining([
              expect.objectContaining({
                id: 'cf-1',
                fieldName: 'VIP Status',
                internalFieldName: 'vipStatus',
                fieldType: 'select',
                required: true,
              }),
              expect.objectContaining({
                id: 'cf-2',
                fieldName: 'Company',
                internalFieldName: 'company',
                fieldType: 'text',
                required: false,
              }),
              expect.objectContaining({
                id: 'cf-3',
                fieldName: 'Backstage Access',
                internalFieldName: 'backstageAccess',
                fieldType: 'boolean',
                required: false,
              }),
            ]),
          }),
        })
      );
    });

    it('should parse field options from JSON string', async () => {
      // Mock: 1) user profile lookup, 2) custom fields list
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockCustomFields[0]], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.fields[0].fieldOptions).toEqual(['Gold', 'Silver', 'Bronze']);
    });

    it('should handle null field options', async () => {
      // Mock: 1) user profile lookup, 2) custom fields list
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockCustomFields[1]], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.fields[0].fieldOptions).toBeNull();
    });

    it('should return fields ordered by order attribute', async () => {
      // Mock: 1) user profile lookup, 2) custom fields list (already ordered)
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ 
          rows: mockCustomFields.filter(f => !f.deletedAt), 
          total: 3 
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      
      // Verify fields are in order
      expect(response.data.fields[0].id).toBe('cf-1');
      expect(response.data.fields[1].id).toBe('cf-2');
      expect(response.data.fields[2].id).toBe('cf-3');
    });

    it('should not include deleted fields', async () => {
      // Mock: 1) user profile lookup, 2) custom fields list (no deleted)
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ 
          rows: mockCustomFields.filter(f => !f.deletedAt), 
          total: 3 
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      
      // Verify deleted field is not included
      const deletedField = response.data.fields.find((f: any) => f.id === 'cf-4');
      expect(deletedField).toBeUndefined();
    });

    it('should return empty array when no custom fields exist', async () => {
      // Mock: 1) user profile lookup, 2) empty custom fields list
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            fields: [],
          }),
        })
      );
    });
  });

  describe('Permissions', () => {
    it('should return 403 when user lacks custom field read permission', async () => {
      const noPermRole = {
        ...mockScannerRole,
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
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for non-GET methods', async () => {
      mockReq.method = 'POST';

      // Mock user profile lookup
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['GET']);
      expect(statusMock).toHaveBeenCalledWith(405);
    });
  });
});
