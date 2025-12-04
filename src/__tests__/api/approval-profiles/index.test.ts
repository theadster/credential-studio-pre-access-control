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
import handler from '@/pages/api/approval-profiles/index';

describe('/api/approval-profiles', () => {
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
      body: {},
    };
    
    mockRes = {
      status: statusMock as any,
    };
  });

  describe('GET', () => {
    it('should list all non-deleted approval profiles', async () => {
      const mockProfiles = [
        {
          $id: 'profile1',
          name: 'General Admission',
          description: 'Standard entry',
          version: 1,
          rules: JSON.stringify({ logic: 'AND', conditions: [] }),
          isDeleted: false,
          $createdAt: '2025-01-01T00:00:00.000Z',
          $updatedAt: '2025-01-01T00:00:00.000Z',
        },
        {
          $id: 'profile2',
          name: 'VIP Access',
          description: 'VIP entry',
          version: 2,
          rules: JSON.stringify({ logic: 'OR', conditions: [] }),
          isDeleted: false,
          $createdAt: '2025-01-02T00:00:00.000Z',
          $updatedAt: '2025-01-02T00:00:00.000Z',
        },
      ];

      mockDatabases.listDocuments.mockResolvedValue({
        documents: mockProfiles,
        total: 2,
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ name: 'General Admission' }),
          ]),
        })
      );
    });

    it('should handle errors when listing profiles', async () => {
      mockDatabases.listDocuments.mockRejectedValue(
        new Error('Database error')
      );

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to list approval profiles',
        })
      );
    });
  });

  describe('POST', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
    });

    it('should create a new approval profile', async () => {
      const rules: RuleGroup = {
        logic: 'AND',
        conditions: [
          {
            field: 'customFieldValues.credentialType',
            operator: 'equals',
            value: 'VIP',
          },
        ],
      };

      const mockProfile = {
        $id: 'new-profile',
        name: 'New Profile',
        description: 'Test profile',
        version: 1,
        rules: JSON.stringify(rules),
        isDeleted: false,
        $createdAt: '2025-01-03T00:00:00.000Z',
        $updatedAt: '2025-01-03T00:00:00.000Z',
      };

      mockReq.body = {
        name: 'New Profile',
        description: 'Test profile',
        rules,
      };

      // Mock no existing profiles with same name
      mockDatabases.listDocuments.mockResolvedValue({
        documents: [],
        total: 0,
      } as any);

      mockDatabases.createDocument.mockResolvedValue(mockProfile as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: 'New Profile',
            version: 1,
          }),
        })
      );
    });

    it('should reject duplicate profile names', async () => {
      const rules: RuleGroup = {
        logic: 'AND',
        conditions: [
          {
            field: 'firstName',
            operator: 'equals',
            value: 'Test',
          },
        ],
      };

      mockReq.body = {
        name: 'Duplicate Name',
        description: 'Test',
        rules,
      };

      // Mock existing profile with same name
      mockDatabases.listDocuments.mockResolvedValue({
        documents: [
          {
            $id: 'existing',
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

    it('should validate request body', async () => {
      mockReq.body = {
        // Missing required fields
        name: '',
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
        })
      );
    });
  });

  describe('Unsupported methods', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'PATCH';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
    });
  });
});
