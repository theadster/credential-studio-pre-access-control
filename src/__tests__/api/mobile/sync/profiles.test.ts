/**
 * Unit Tests for Mobile Sync Profiles API
 * 
 * Tests version comparison logic for approval profile synchronization.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 4.2, 4.3
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Set environment variables before importing handler
beforeAll(() => {
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test-db';
  process.env.NEXT_PUBLIC_APPWRITE_APPROVAL_PROFILES_COLLECTION_ID = 'approval_profiles';
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
import handler from '@/pages/api/mobile/sync/profiles';

describe('/api/mobile/sync/profiles - Mobile Sync Profiles API', () => {
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
      approvalProfiles: { read: true },
    }),
  };

  const mockProfiles = [
    {
      $id: 'prof-1',
      name: 'General Admission',
      description: 'Standard entry',
      version: 3,
      rules: JSON.stringify({
        logic: 'AND',
        conditions: [
          { field: 'customFieldValues.vipStatus', operator: 'in_list', value: ['Gold', 'Silver'] }
        ]
      }),
      isDeleted: false,
      $createdAt: '2024-01-01T00:00:00.000Z',
      $updatedAt: '2024-01-10T00:00:00.000Z',
    },
    {
      $id: 'prof-2',
      name: 'VIP Access',
      description: 'VIP only',
      version: 2,
      rules: JSON.stringify({
        logic: 'AND',
        conditions: [
          { field: 'customFieldValues.vipStatus', operator: 'equals', value: 'Gold' }
        ]
      }),
      isDeleted: false,
      $createdAt: '2024-01-02T00:00:00.000Z',
      $updatedAt: '2024-01-11T00:00:00.000Z',
    },
    {
      $id: 'prof-3',
      name: 'Deleted Profile',
      description: 'Should not sync',
      version: 5,
      rules: JSON.stringify({ logic: 'AND', conditions: [] }),
      isDeleted: true,
      $createdAt: '2024-01-03T00:00:00.000Z',
      $updatedAt: '2024-01-12T00:00:00.000Z',
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

  describe('Full Sync (no versions parameter)', () => {
    it('should return all non-deleted profiles', async () => {
      // Mock: 1) user profile lookup, 2) profiles list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockProfiles.filter(p => !p.isDeleted), total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            profiles: expect.arrayContaining([
              expect.objectContaining({
                id: 'prof-1',
                name: 'General Admission',
                version: 3,
              }),
              expect.objectContaining({
                id: 'prof-2',
                name: 'VIP Access',
                version: 2,
              }),
            ]),
          }),
        })
      );
    });

    it('should parse rules from JSON string', async () => {
      // Mock: 1) user profile lookup, 2) profiles list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockProfiles[0]], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.profiles[0].rules).toEqual({
        logic: 'AND',
        conditions: [
          { field: 'customFieldValues.vipStatus', operator: 'in_list', value: ['Gold', 'Silver'] }
        ]
      });
    });
  });

  describe('Version Comparison Sync', () => {
    it('should return only profiles with server version > local version', async () => {
      // Local versions: prof-1 has v2, prof-2 has v2
      // Server versions: prof-1 has v3 (should sync), prof-2 has v2 (should NOT sync)
      mockReq.query = { versions: JSON.stringify({ 'prof-1': 2, 'prof-2': 2 }) };

      // Mock: 1) user profile lookup, 2) profiles list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockProfiles.filter(p => !p.isDeleted), total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      
      // Only prof-1 should be returned (v3 > v2)
      expect(response.data.profiles).toHaveLength(1);
      expect(response.data.profiles[0].id).toBe('prof-1');
      expect(response.data.profiles[0].version).toBe(3);
    });

    it('should return profiles that do not exist locally', async () => {
      // Local versions: only prof-1 exists
      // Server versions: prof-1 (v3), prof-2 (v2)
      // Should return prof-2 (doesn't exist locally)
      mockReq.query = { versions: JSON.stringify({ 'prof-1': 3 }) };

      // Mock: 1) user profile lookup, 2) profiles list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockProfiles.filter(p => !p.isDeleted), total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      
      // Only prof-2 should be returned (doesn't exist locally)
      expect(response.data.profiles).toHaveLength(1);
      expect(response.data.profiles[0].id).toBe('prof-2');
    });

    it('should return no profiles when all local versions are up-to-date', async () => {
      // Local versions match or exceed server versions
      mockReq.query = { versions: JSON.stringify({ 'prof-1': 3, 'prof-2': 2 }) };

      // Mock: 1) user profile lookup, 2) profiles list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockProfiles.filter(p => !p.isDeleted), total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.profiles).toHaveLength(0);
    });

    it('should return no profiles when local versions are newer', async () => {
      // Local versions exceed server versions
      mockReq.query = { versions: JSON.stringify({ 'prof-1': 5, 'prof-2': 5 }) };

      // Mock: 1) user profile lookup, 2) profiles list
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockProfiles.filter(p => !p.isDeleted), total: 2 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data.profiles).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid versions JSON', async () => {
      mockReq.query = { versions: 'invalid-json' };

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

    it('should return 400 for versions parameter that is not an object', async () => {
      mockReq.query = { versions: JSON.stringify(['array', 'not', 'object']) };

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

    it('should return 400 for versions parameter that is null', async () => {
      mockReq.query = { versions: 'null' };

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

    it('should return 400 for non-integer version values', async () => {
      mockReq.query = { versions: JSON.stringify({ 'prof-1': 'not-a-number' }) };

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

    it('should return 400 for negative version values', async () => {
      mockReq.query = { versions: JSON.stringify({ 'prof-1': -1 }) };

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

  describe('Permissions', () => {
    it('should return 403 when user lacks approval profile read permission', async () => {
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
