import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../bulk-delete';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
}));

describe('/api/attendees/bulk-delete - Bulk Delete API', () => {
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
      attendees: { bulkDelete: true },
      all: true,
    }),
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'DELETE',
      cookies: { 'appwrite-session': 'test-session' },
      body: {
        attendeeIds: ['attendee-1', 'attendee-2', 'attendee-3'],
      },
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockDatabases.listDocuments.mockResolvedValue({
      documents: [mockUserProfile],
      total: 1,
    });
    mockDatabases.getDocument.mockResolvedValue(mockAdminRole);
    mockDatabases.createDocument.mockResolvedValue({
      $id: 'new-log-123',
      userId: mockAuthUser.$id,
      action: 'delete',
      details: JSON.stringify({ type: 'bulk_delete' }),
    });
  });

  describe('Method Validation', () => {
    it('should return 405 if method is not DELETE', async () => {
      mockReq.method = 'POST';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAccount.get.mockRejectedValue(new Error('Unauthorized'));

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

    it('should return 403 if user profile is not found', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Access denied: User profile not found' });
    });

    it('should return 403 if user has no role', async () => {
      const userWithoutRole = { ...mockUserProfile, roleId: null };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [userWithoutRole],
        total: 1,
      });
      mockDatabases.getDocument.mockResolvedValueOnce(null);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Access denied: No role assigned' });
    });

    it('should return 403 if user does not have bulkDelete permission', async () => {
      const userWithRole = { ...mockUserProfile, roleId: 'role-no-perm' };
      const noPermRole = {
        $id: 'role-no-perm',
        name: 'No Permission Role',
        permissions: JSON.stringify({ attendees: { bulkDelete: false } }),
      };

      // Reset the mock to clear default behavior
      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [userWithRole], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied: Insufficient permissions for bulk delete',
      });
    });
  });

  describe('Input Validation', () => {
    it('should return 400 if attendeeIds is missing', async () => {
      mockReq.body = {};

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee IDs provided' });
    });

    it('should return 400 if attendeeIds is not an array', async () => {
      mockReq.body = { attendeeIds: 'not-an-array' };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee IDs provided' });
    });

    it('should return 400 if attendeeIds is empty array', async () => {
      mockReq.body = { attendeeIds: [] };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee IDs provided' });
    });
  });

  describe('Bulk Delete Operation', () => {
    it('should delete all attendees successfully', async () => {
      const mockAttendees = [
        { $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' },
        { $id: 'attendee-2', firstName: 'Jane', lastName: 'Smith', barcodeNumber: '67890' },
        { $id: 'attendee-3', firstName: 'Bob', lastName: 'Johnson', barcodeNumber: '11111' },
      ];

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      mockDatabases.createDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendees[0]) // Get attendee 1
        .mockResolvedValueOnce(mockAttendees[1]) // Get attendee 2
        .mockResolvedValueOnce(mockAttendees[2]); // Get attendee 3

      mockDatabases.deleteDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.deleteDocument).toHaveBeenCalledTimes(3);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 3,
          deleted: ['attendee-1', 'attendee-2', 'attendee-3'],
          errors: [],
          message: 'Successfully deleted 3 attendees',
        })
      );
    });

    it('should handle partial failures gracefully', async () => {
      const mockAttendees = [
        { $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' },
        { $id: 'attendee-2', firstName: 'Jane', lastName: 'Smith', barcodeNumber: '67890' },
      ];

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendees[0])
        .mockResolvedValueOnce(mockAttendees[1]);

      mockDatabases.deleteDocument
        .mockResolvedValueOnce({ success: true }) // First delete succeeds
        .mockRejectedValueOnce(new Error('Delete failed')) // Second delete fails
        .mockResolvedValueOnce({ success: true }); // Third delete succeeds

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 2,
          deleted: ['attendee-1', 'attendee-3'],
          errors: [{ id: 'attendee-2', error: 'Delete failed' }],
        })
      );
    });

    it('should continue if attendee not found during fetch', async () => {
      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      mockDatabases.createDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce({ $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' })
        .mockRejectedValueOnce(new Error('Not found')) // attendee-2 not found
        .mockResolvedValueOnce({ $id: 'attendee-3', firstName: 'Bob', lastName: 'Johnson', barcodeNumber: '11111' });

      mockDatabases.deleteDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.deleteDocument).toHaveBeenCalledTimes(3);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should create log entry for bulk delete', async () => {
      const mockAttendees = [
        { $id: 'attendee-1', firstName: 'John', lastName: 'Doe', barcodeNumber: '12345' },
        { $id: 'attendee-2', firstName: 'Jane', lastName: 'Smith', barcodeNumber: '67890' },
      ];

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      mockDatabases.createDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendees[0]) // Get attendee 1
        .mockResolvedValueOnce(mockAttendees[1]); // Get attendee 2 (only 2 attendees in this test)

      mockDatabases.deleteDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      // Update request to only have 2 attendees
      mockReq.body = { attendeeIds: ['attendee-1', 'attendee-2'] };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          action: 'delete',
          userId: mockAuthUser.$id,
          details: expect.stringContaining('bulk_delete'),
        })
      );
    });

    it('should handle all deletions failing', async () => {
      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      mockDatabases.createDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole); // Get role

      mockDatabases.deleteDocument.mockRejectedValue(new Error('Delete failed'));
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deletedCount: 0,
          deleted: [],
          errors: expect.arrayContaining([
            { id: 'attendee-1', error: 'Delete failed' },
            { id: 'attendee-2', error: 'Delete failed' },
            { id: 'attendee-3', error: 'Delete failed' },
          ]),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Appwrite 401 errors', async () => {
      const error = new Error('Unauthorized');
      (error as any).code = 401;
      mockAccount.get.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle Appwrite 404 errors', async () => {
      const error = new Error('Not found');
      (error as any).code = 404;
      
      mockAccount.get.mockReset();
      mockDatabases.listDocuments.mockReset();
      
      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockDatabases.listDocuments.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should handle generic errors', async () => {
      mockDatabases.listDocuments.mockRejectedValue(new Error('Database error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to delete attendees' });
    });
  });
});
