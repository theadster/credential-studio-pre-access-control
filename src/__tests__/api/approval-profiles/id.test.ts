import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';
import { RuleGroup } from '@/types/approvalProfile';

// Set environment variables before importing handler
beforeAll(() => {
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test-database-id';
  process.env.NEXT_PUBLIC_APPWRITE_APPROVAL_PROFILES_COLLECTION_ID = 'test-approval-profiles-collection';
});

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  databases: mockDatabases,
}));

// Import handler after mocks are set up
import handler from '@/pages/api/approval-profiles/[id]';

describe('/api/approval-profiles/[id]', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'GET',
      query: { id: 'profile1' },
      body: {},
    };
    
    mockRes = {
      status: statusMock as any,
    };
  });

  describe('GET', () => {
    it('should get a single approval profile', async () => {
      const mockProfile = {
        $id: 'profile1',
        name: 'Test Profile',
        description: 'Test description',
        version: 1,
        rules: JSON.stringify({ logic: 'AND', conditions: [] }),
        isDeleted: false,
        $createdAt: '2025-01-01T00:00:00.000Z',
        $updatedAt: '2025-01-01T00:00:00.000Z',
      };

      mockDatabases.getDocument.mockResolvedValue(mockProfile as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ name: 'Test Profile' }),
        })
      );
    });

    it('should return 404 for soft-deleted profiles', async () => {
      const mockProfile = {
        $id: 'profile1',
        name: 'Deleted Profile',
        isDeleted: true,
      };

      mockDatabases.getDocument.mockResolvedValue(mockProfile as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Profile not found',
        })
      );
    });

    it('should return 404 for non-existent profiles', async () => {
      const error: any = new Error('Not found');
      error.code = 404;
      mockDatabases.getDocument.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('PUT', () => {
    beforeEach(() => {
      mockReq.method = 'PUT';
    });

    it('should update a profile and increment version', async () => {
      const currentProfile = {
        $id: 'profile1',
        name: 'Old Name',
        description: 'Old description',
        version: 1,
        rules: JSON.stringify({ logic: 'AND', conditions: [] }),
        isDeleted: false,
      };

      const updatedProfile = {
        ...currentProfile,
        name: 'New Name',
        version: 2,
      };

      mockReq.body = {
        name: 'New Name',
      };

      mockDatabases.getDocument.mockResolvedValue(currentProfile as any);
      // Mock no existing profiles with the new name
      mockDatabases.listDocuments.mockResolvedValue({
        documents: [],
        total: 0,
      } as any);
      mockDatabases.updateDocument.mockResolvedValue(updatedProfile as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            version: 2,
            name: 'New Name',
          }),
        })
      );

      // Verify version was incremented and updateDocument was called
      expect(mockDatabases.updateDocument).toHaveBeenCalled();
      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      expect(updateCall[2]).toBe('profile1'); // Profile ID
      expect(updateCall[3]).toMatchObject({
        version: 2,
        name: 'New Name',
      });
    });

    it('should reject duplicate names when updating', async () => {
      const currentProfile = {
        $id: 'profile1',
        name: 'Original Name',
        version: 1,
        isDeleted: false,
      };

      mockReq.body = {
        name: 'Duplicate Name',
      };

      mockDatabases.getDocument.mockResolvedValue(currentProfile as any);
      
      // Mock existing profile with the new name
      mockDatabases.listDocuments.mockResolvedValue({
        documents: [
          {
            $id: 'profile2',
            name: 'Duplicate Name',
            isDeleted: false,
          },
        ],
        total: 1,
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'A profile with this name already exists',
        })
      );
    });

    it('should update rules and increment version', async () => {
      const currentProfile = {
        $id: 'profile1',
        name: 'Test Profile',
        version: 1,
        rules: JSON.stringify({ logic: 'AND', conditions: [] }),
        isDeleted: false,
      };

      const newRules: RuleGroup = {
        logic: 'OR',
        conditions: [
          {
            field: 'firstName',
            operator: 'equals',
            value: 'John',
          },
        ],
      };

      const updatedProfile = {
        ...currentProfile,
        version: 2,
        rules: JSON.stringify(newRules),
      };

      mockReq.body = {
        rules: newRules,
      };

      mockDatabases.getDocument.mockResolvedValue(currentProfile as any);
      mockDatabases.updateDocument.mockResolvedValue(updatedProfile as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ version: 2 }),
        })
      );
    });

    it('should return 404 for soft-deleted profiles', async () => {
      const mockProfile = {
        $id: 'profile1',
        name: 'Deleted Profile',
        isDeleted: true,
      };

      mockReq.body = {
        name: 'New Name',
      };

      mockDatabases.getDocument.mockResolvedValue(mockProfile as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('DELETE', () => {
    beforeEach(() => {
      mockReq.method = 'DELETE';
    });

    it('should soft delete a profile', async () => {
      const currentProfile = {
        $id: 'profile1',
        name: 'Test Profile',
        version: 1,
        isDeleted: false,
      };

      const deletedProfile = {
        ...currentProfile,
        isDeleted: true,
      };

      mockDatabases.getDocument.mockResolvedValue(currentProfile as any);
      mockDatabases.updateDocument.mockResolvedValue(deletedProfile as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ isDeleted: true }),
        })
      );

      // Verify soft delete was called
      expect(mockDatabases.updateDocument).toHaveBeenCalled();
      const updateCall = mockDatabases.updateDocument.mock.calls[0];
      expect(updateCall[2]).toBe('profile1'); // Profile ID
      expect(updateCall[3]).toEqual({ isDeleted: true });
    });

    it('should return 404 for already deleted profiles', async () => {
      const mockProfile = {
        $id: 'profile1',
        name: 'Already Deleted',
        isDeleted: true,
      };

      mockDatabases.getDocument.mockResolvedValue(mockProfile as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 404 for non-existent profiles', async () => {
      const error: any = new Error('Not found');
      error.code = 404;
      mockDatabases.getDocument.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('Invalid requests', () => {
    it('should return 400 for invalid profile ID', async () => {
      mockReq.query = { id: ['array', 'of', 'ids'] };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid profile ID',
        })
      );
    });

    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'PATCH';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
    });
  });
});
