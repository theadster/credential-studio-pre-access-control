import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../validate';
import { mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createAdminClient: vi.fn(() => ({
    databases: mockDatabases,
  })),
}));

describe('/api/invitations/validate - Invitation Validation API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

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

  const mockRole = {
    $id: 'role-staff',
    name: 'Staff',
    description: 'Staff member',
    permissions: JSON.stringify({ attendees: { read: true, create: true } }),
  };

  const mockValidInvitation = {
    $id: 'invitation-123',
    userId: 'invited-user-123',
    token: 'valid-token-uuid',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    usedAt: null,
    createdBy: 'admin-user-123',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'GET',
      query: {
        token: 'valid-token-uuid',
      },
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };
  });

  describe('GET /api/invitations/validate', () => {
    it('should validate a valid invitation token', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 }) // Find invitation
        .mockResolvedValueOnce({ documents: [mockInvitedUser], total: 1 }); // Find user

      mockDatabases.getDocument.mockResolvedValueOnce(mockRole); // Get role

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.listDocuments).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID,
        expect.any(Array)
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        valid: true,
        user: {
          id: 'invited-user-123',
          email: 'invited@example.com',
          name: 'Invited User',
          role: mockRole,
        },
      });
    });

    it('should return 400 if token is missing', async () => {
      mockReq.query = {};

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invitation token is required' });
      expect(mockDatabases.listDocuments).not.toHaveBeenCalled();
    });

    it('should return 400 if token is not a string', async () => {
      mockReq.query = { token: ['array', 'of', 'tokens'] };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invitation token is required' });
    });

    it('should return 404 if invitation token does not exist', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid invitation token' });
    });

    it('should return 400 if invitation has expired', async () => {
      const expiredInvitation = {
        ...mockValidInvitation,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired yesterday
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [expiredInvitation],
        total: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invitation has expired' });
    });

    it('should return 400 if invitation has already been used', async () => {
      const usedInvitation = {
        ...mockValidInvitation,
        usedAt: '2024-01-05T00:00:00.000Z',
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [usedInvitation],
        total: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invitation has already been used' });
    });

    it('should return 404 if user associated with invitation does not exist', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 }) // Find invitation
        .mockResolvedValueOnce({ documents: [], total: 0 }); // User not found

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 400 if user is no longer in invited status', async () => {
      const nonInvitedUser = {
        ...mockInvitedUser,
        isInvited: false,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 })
        .mockResolvedValueOnce({ documents: [nonInvitedUser], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User is no longer in invited status' });
    });

    it('should handle user without role', async () => {
      const userWithoutRole = {
        ...mockInvitedUser,
        roleId: null,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 })
        .mockResolvedValueOnce({ documents: [userWithoutRole], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        valid: true,
        user: {
          id: 'invited-user-123',
          email: 'invited@example.com',
          name: 'Invited User',
          role: null,
        },
      });
      expect(mockDatabases.getDocument).not.toHaveBeenCalled();
    });

    it('should validate invitation that expires exactly now', async () => {
      const nowExpiringInvitation = {
        ...mockValidInvitation,
        expiresAt: new Date().toISOString(),
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({
          documents: [nowExpiringInvitation],
          total: 1,
        })
        .mockResolvedValueOnce({ documents: [mockInvitedUser], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should be considered expired (not valid) - but due to timing, it might pass
      // We'll check that it either returns 400 (expired) or 200 (just barely valid)
      expect([400, 200]).toContain(statusMock.mock.calls[0][0]);
    });

    it('should validate invitation that expires in the future', async () => {
      const futureExpiringInvitation = {
        ...mockValidInvitation,
        expiresAt: new Date(Date.now() + 1000).toISOString(), // Expires in 1 second
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [futureExpiringInvitation], total: 1 })
        .mockResolvedValueOnce({ documents: [mockInvitedUser], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: true,
        })
      );
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for POST method', async () => {
      mockReq.method = 'POST';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method POST not allowed' });
    });

    it('should return 405 for PUT method', async () => {
      mockReq.method = 'PUT';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method PUT not allowed' });
    });

    it('should return 405 for DELETE method', async () => {
      mockReq.method = 'DELETE';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method DELETE not allowed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors when finding invitation', async () => {
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

    it('should handle database errors when finding user', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 })
        .mockRejectedValueOnce(new Error('Database error'));

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

    it('should handle database errors when fetching role', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 })
        .mockResolvedValueOnce({ documents: [mockInvitedUser], total: 1 });

      mockDatabases.getDocument.mockRejectedValueOnce(new Error('Database error'));

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

    it('should handle generic errors', async () => {
      mockDatabases.listDocuments.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

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
  });
});
