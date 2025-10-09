import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../index';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
}));

describe('/api/invitations - Invitation Management API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const mockAuthUser = {
    $id: 'auth-user-123',
    email: 'admin@example.com',
    name: 'Admin User',
  };

  const mockInvitedUser = {
    $id: 'invited-user-doc-123',
    userId: 'invited-user-123',
    email: 'invited@example.com',
    name: 'Invited User',
    roleId: 'role-staff',
    isInvited: true,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockInvitation = {
    $id: 'invitation-123',
    userId: 'invited-user-123',
    token: 'test-token-uuid',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    usedAt: null,
    createdBy: 'auth-user-123',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    resetAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      method: 'GET',
      cookies: { 'appwrite-session': 'test-session' },
      query: {},
      body: {},
    };

    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      const error = new Error('Unauthorized');
      (error as any).code = 401;
      mockAccount.get.mockRejectedValue(error);

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
  });

  describe('GET /api/invitations', () => {
    it('should return list of invitations ordered by creation date', async () => {
      const mockInvitations = [
        {
          $id: 'invitation-1',
          userId: 'user-1',
          token: 'token-1',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          usedAt: null,
          createdBy: 'auth-user-123',
          $createdAt: '2024-01-02T00:00:00.000Z',
          $updatedAt: '2024-01-02T00:00:00.000Z',
        },
        {
          $id: 'invitation-2',
          userId: 'user-2',
          token: 'token-2',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          usedAt: '2024-01-03T00:00:00.000Z',
          createdBy: 'auth-user-123',
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-03T00:00:00.000Z',
        },
      ];

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: mockInvitations,
        total: 2,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.listDocuments).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID,
        expect.any(Array)
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockInvitations);
    });

    it('should return empty array if no invitations exist', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith([]);
    });
  });

  describe('POST /api/invitations', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.body = {
        userId: 'invited-user-123',
      };
    });

    it('should create a new invitation successfully', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockInvitedUser],
        total: 1,
      });

      mockDatabases.createDocument
        .mockResolvedValueOnce(mockInvitation) // Create invitation
        .mockResolvedValueOnce({ // Create log
          $id: 'log-123',
          userId: 'auth-user-123',
          action: 'create',
          details: JSON.stringify({
            type: 'invitation',
            invitedUserEmail: 'invited@example.com',
            invitedUserName: 'Invited User',
          }),
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify invitation was created
      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: 'invited-user-123',
          token: expect.any(String),
          expiresAt: expect.any(String),
          createdBy: 'auth-user-123',
        })
      );

      // Verify log was created
      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: 'auth-user-123',
          action: 'create',
          details: expect.stringContaining('invitation'),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          invitation: expect.objectContaining({
            userId: 'invited-user-123',
            token: expect.any(String),
          }),
          invitationUrl: expect.stringContaining('invitation='),
        })
      );
    });

    it('should return 400 if userId is missing', async () => {
      mockReq.body = {};

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User ID is required' });
      expect(mockDatabases.createDocument).not.toHaveBeenCalled();
    });

    it('should return 404 if user does not exist', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockDatabases.createDocument).not.toHaveBeenCalled();
    });

    it('should return 400 if user is not in invited status', async () => {
      const nonInvitedUser = {
        ...mockInvitedUser,
        isInvited: false,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [nonInvitedUser],
        total: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User is not in invited status' });
      expect(mockDatabases.createDocument).not.toHaveBeenCalled();
    });

    it('should generate unique token for each invitation', async () => {
      mockDatabases.listDocuments.mockResolvedValue({
        documents: [mockInvitedUser],
        total: 1,
      });

      mockDatabases.createDocument
        .mockResolvedValueOnce(mockInvitation)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const createInvitationCall = mockDatabases.createDocument.mock.calls.find(
        call => call[1] === process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID
      );

      expect(createInvitationCall).toBeDefined();
      expect(createInvitationCall![3]).toHaveProperty('token');
      expect(typeof createInvitationCall![3].token).toBe('string');
      expect(createInvitationCall![3].token.length).toBeGreaterThan(0);
    });

    it('should set expiration date to 7 days from now', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockInvitedUser],
        total: 1,
      });

      mockDatabases.createDocument
        .mockResolvedValueOnce(mockInvitation)
        .mockResolvedValueOnce({ $id: 'log-123' });

      const beforeTest = new Date();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const afterTest = new Date();

      const createInvitationCall = mockDatabases.createDocument.mock.calls.find(
        call => call[1] === process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID
      );

      expect(createInvitationCall).toBeDefined();
      const expiresAt = new Date(createInvitationCall![3].expiresAt);

      // Should be approximately 7 days from now
      const sevenDaysFromNow = new Date(beforeTest.getTime() + 7 * 24 * 60 * 60 * 1000);
      const sevenDaysFromNowMax = new Date(afterTest.getTime() + 7 * 24 * 60 * 60 * 1000);

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(sevenDaysFromNow.getTime());
      expect(expiresAt.getTime()).toBeLessThanOrEqual(sevenDaysFromNowMax.getTime());
    });

    it('should include invitation URL in response', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockInvitedUser],
        total: 1,
      });

      mockDatabases.createDocument
        .mockResolvedValueOnce(mockInvitation)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          invitationUrl: expect.stringMatching(/\/signup\?invitation=/),
        })
      );
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'DELETE';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method DELETE not allowed' });
    });

    it('should return 405 for PUT method', async () => {
      mockReq.method = 'PUT';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method PUT not allowed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors when listing invitations', async () => {
      mockDatabases.listDocuments.mockRejectedValueOnce(new Error('Database error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('error'),
          code: 500,
          type: 'internal_error',
        })
      );
    });

    it('should handle database errors when creating invitation', async () => {
      mockReq.method = 'POST';
      mockReq.body = { userId: 'invited-user-123' };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockInvitedUser],
        total: 1,
      });

      mockDatabases.createDocument.mockRejectedValueOnce(new Error('Database error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('error'),
          code: 500,
          type: 'internal_error',
        })
      );
    });

    it('should handle errors when creating log entry', async () => {
      mockReq.method = 'POST';
      mockReq.body = { userId: 'invited-user-123' };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockInvitedUser],
        total: 1,
      });

      mockDatabases.createDocument
        .mockResolvedValueOnce(mockInvitation) // Create invitation succeeds
        .mockRejectedValueOnce(new Error('Log creation failed')); // Log creation fails

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should return 500 error when log creation fails
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('error'),
          code: 500,
          type: 'internal_error',
        })
      );
    });
  });
});
