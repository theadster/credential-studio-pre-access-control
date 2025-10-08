import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../complete';
import { mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createAdminClient: vi.fn(() => ({
    databases: mockDatabases,
  })),
}));

describe('/api/invitations/complete - Invitation Completion API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const mockInvitedUser = {
    $id: 'invited-user-doc-123',
    userId: 'temp-user-id',
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
    userId: 'temp-user-id',
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
      method: 'POST',
      body: {
        token: 'valid-token-uuid',
        appwriteUserId: 'real-appwrite-user-id',
      },
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };
  });

  describe('POST /api/invitations/complete', () => {
    it('should complete invitation successfully', async () => {
      const updatedUser = {
        ...mockInvitedUser,
        userId: 'real-appwrite-user-id',
        isInvited: false,
      };

      const updatedInvitation = {
        ...mockValidInvitation,
        usedAt: expect.any(String),
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 }) // Find invitation
        .mockResolvedValueOnce({ documents: [mockInvitedUser], total: 1 }); // Find user

      mockDatabases.updateDocument
        .mockResolvedValueOnce(updatedUser) // Update user
        .mockResolvedValueOnce(updatedInvitation); // Update invitation

      mockDatabases.getDocument.mockResolvedValueOnce(mockRole); // Get role

      mockDatabases.createDocument.mockResolvedValueOnce({ // Create log
        $id: 'log-123',
        userId: 'real-appwrite-user-id',
        action: 'complete_invitation',
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify user was updated
      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        'invited-user-doc-123',
        {
          userId: 'real-appwrite-user-id',
          isInvited: false,
        }
      );

      // Verify invitation was marked as used
      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID,
        'invitation-123',
        {
          usedAt: expect.any(String),
        }
      );

      // Verify log was created
      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: 'real-appwrite-user-id',
          action: 'complete_invitation',
          details: expect.stringContaining('invitation_completed'),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          userId: 'real-appwrite-user-id',
          isInvited: false,
          role: mockRole,
        }),
      });
    });

    it('should return 400 if token is missing', async () => {
      mockReq.body = { appwriteUserId: 'real-appwrite-user-id' };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Token and Appwrite user ID are required' });
      expect(mockDatabases.listDocuments).not.toHaveBeenCalled();
    });

    it('should return 400 if appwriteUserId is missing', async () => {
      mockReq.body = { token: 'valid-token-uuid' };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Token and Appwrite user ID are required' });
      expect(mockDatabases.listDocuments).not.toHaveBeenCalled();
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
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [expiredInvitation],
        total: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invitation has expired' });
      expect(mockDatabases.updateDocument).not.toHaveBeenCalled();
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
      expect(mockDatabases.updateDocument).not.toHaveBeenCalled();
    });

    it('should return 404 if user associated with invitation does not exist', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockDatabases.updateDocument).not.toHaveBeenCalled();
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
      expect(mockDatabases.updateDocument).not.toHaveBeenCalled();
    });

    it('should handle user without role', async () => {
      const userWithoutRole = {
        ...mockInvitedUser,
        roleId: null,
      };

      const updatedUser = {
        ...userWithoutRole,
        userId: 'real-appwrite-user-id',
        isInvited: false,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 })
        .mockResolvedValueOnce({ documents: [userWithoutRole], total: 1 });

      mockDatabases.updateDocument
        .mockResolvedValueOnce(updatedUser)
        .mockResolvedValueOnce({ ...mockValidInvitation, usedAt: '2024-01-05T00:00:00.000Z' });

      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          userId: 'real-appwrite-user-id',
          isInvited: false,
          role: null,
        }),
      });
      expect(mockDatabases.getDocument).not.toHaveBeenCalled();
    });

    it('should set usedAt timestamp to current time', async () => {
      const updatedUser = {
        ...mockInvitedUser,
        userId: 'real-appwrite-user-id',
        isInvited: false,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 })
        .mockResolvedValueOnce({ documents: [mockInvitedUser], total: 1 });

      mockDatabases.updateDocument
        .mockResolvedValueOnce(updatedUser)
        .mockResolvedValueOnce({ ...mockValidInvitation, usedAt: '2024-01-05T00:00:00.000Z' });

      mockDatabases.getDocument.mockResolvedValueOnce(mockRole);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      const beforeTest = new Date();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const afterTest = new Date();

      const updateInvitationCall = mockDatabases.updateDocument.mock.calls.find(
        call => call[1] === process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID
      );

      expect(updateInvitationCall).toBeDefined();
      const usedAt = new Date(updateInvitationCall![3].usedAt);
      
      expect(usedAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(usedAt.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });

    it('should include original userId in log details', async () => {
      const updatedUser = {
        ...mockInvitedUser,
        userId: 'real-appwrite-user-id',
        isInvited: false,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 })
        .mockResolvedValueOnce({ documents: [mockInvitedUser], total: 1 });

      mockDatabases.updateDocument
        .mockResolvedValueOnce(updatedUser)
        .mockResolvedValueOnce({ ...mockValidInvitation, usedAt: '2024-01-05T00:00:00.000Z' });

      mockDatabases.getDocument.mockResolvedValueOnce(mockRole);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const createLogCall = mockDatabases.createDocument.mock.calls.find(
        call => call[1] === process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID
      );

      expect(createLogCall).toBeDefined();
      const logDetails = JSON.parse(createLogCall![3].details);
      
      expect(logDetails).toEqual({
        type: 'invitation_completed',
        originalUserId: 'temp-user-id',
        email: 'invited@example.com',
      });
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for GET method', async () => {
      mockReq.method = 'GET';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method GET not allowed' });
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

    it('should handle database errors when updating user', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 })
        .mockResolvedValueOnce({ documents: [mockInvitedUser], total: 1 });

      mockDatabases.updateDocument.mockRejectedValueOnce(new Error('Database error'));

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

    it('should handle database errors when updating invitation', async () => {
      const updatedUser = {
        ...mockInvitedUser,
        userId: 'real-appwrite-user-id',
        isInvited: false,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 })
        .mockResolvedValueOnce({ documents: [mockInvitedUser], total: 1 });

      mockDatabases.updateDocument
        .mockResolvedValueOnce(updatedUser)
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
      const updatedUser = {
        ...mockInvitedUser,
        userId: 'real-appwrite-user-id',
        isInvited: false,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 })
        .mockResolvedValueOnce({ documents: [mockInvitedUser], total: 1 });

      mockDatabases.updateDocument
        .mockResolvedValueOnce(updatedUser)
        .mockResolvedValueOnce({ ...mockValidInvitation, usedAt: '2024-01-05T00:00:00.000Z' });

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

    it('should handle database errors when creating log', async () => {
      const updatedUser = {
        ...mockInvitedUser,
        userId: 'real-appwrite-user-id',
        isInvited: false,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockValidInvitation], total: 1 })
        .mockResolvedValueOnce({ documents: [mockInvitedUser], total: 1 });

      mockDatabases.updateDocument
        .mockResolvedValueOnce(updatedUser)
        .mockResolvedValueOnce({ ...mockValidInvitation, usedAt: '2024-01-05T00:00:00.000Z' });

      mockDatabases.getDocument.mockResolvedValueOnce(mockRole);
      mockDatabases.createDocument.mockRejectedValueOnce(new Error('Log creation failed'));

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
