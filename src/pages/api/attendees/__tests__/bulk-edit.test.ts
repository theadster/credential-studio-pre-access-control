import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../bulk-edit';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
}));

describe('/api/attendees/bulk-edit - Bulk Edit API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;
  let endMock: ReturnType<typeof vi.fn>;

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
      attendees: { bulkEdit: true },
      all: true,
    }),
  };

  const mockCustomFields = [
    { $id: 'field-1', fieldName: 'Department', fieldType: 'text' },
    { $id: 'field-2', fieldName: 'Title', fieldType: 'uppercase' },
  ];

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    endMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock, end: endMock }));
    setHeaderMock = vi.fn();
    
    mockReq = {
      method: 'POST',
      cookies: { 'appwrite-session': 'test-session' },
      body: {
        attendeeIds: ['attendee-1', 'attendee-2'],
        changes: {
          'field-1': 'Engineering',
          'field-2': 'manager',
        },
      },
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: setHeaderMock,
      end: endMock,
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
      action: 'bulk_update',
      details: JSON.stringify({ type: 'attendees' }),
    });
  });

  describe('Method Validation', () => {
    it('should return 405 if method is not POST', async () => {
      mockReq.method = 'GET';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['POST']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(endMock).toHaveBeenCalledWith('Method GET Not Allowed');
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
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'User profile not found',
          code: 404,
          type: 'profile_not_found',
        })
      );
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
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User role not found' });
    });

    it('should return 403 if user does not have bulkEdit permission', async () => {
      const userWithRole = { ...mockUserProfile, roleId: 'role-no-perm' };
      const noPermRole = {
        $id: 'role-no-perm',
        name: 'No Permission Role',
        permissions: JSON.stringify({ attendees: { bulkEdit: false } }),
      };

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [userWithRole], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to bulk edit attendees',
      });
    });
  });

  describe('Input Validation', () => {
    it('should return 400 if attendeeIds is missing', async () => {
      mockReq.body = { changes: {} };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendeeIds' });
    });

    it('should return 400 if attendeeIds is not an array', async () => {
      mockReq.body = { attendeeIds: 'not-an-array', changes: {} };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendeeIds' });
    });

    it('should return 400 if attendeeIds is empty array', async () => {
      mockReq.body = { attendeeIds: [], changes: {} };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendeeIds' });
    });

    it('should return 400 if changes is missing', async () => {
      mockReq.body = { attendeeIds: ['attendee-1'] };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid changes object' });
    });

    it('should return 400 if changes is not an object', async () => {
      mockReq.body = { attendeeIds: ['attendee-1'], changes: 'not-an-object' };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid changes object' });
    });
  });

  describe('Bulk Edit Operation', () => {
    it('should update all attendees successfully', async () => {
      const mockAttendees = [
        {
          $id: 'attendee-1',
          firstName: 'John',
          lastName: 'Doe',
          customFieldValues: JSON.stringify({ 'field-1': 'Sales' }),
        },
        {
          $id: 'attendee-2',
          firstName: 'Jane',
          lastName: 'Smith',
          customFieldValues: JSON.stringify({ 'field-1': 'Marketing' }),
        },
      ];

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      mockDatabases.updateDocument.mockReset();
      mockDatabases.createDocument.mockReset();

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 2 }); // Custom fields

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendees[0]) // Get attendee 1
        .mockResolvedValueOnce(mockAttendees[1]); // Get attendee 2

      mockDatabases.updateDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(2);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Attendees updated successfully',
          updatedCount: 2,
          errors: [],
        })
      );
    });

    it('should apply uppercase transformation for uppercase field type', async () => {
      const mockAttendee = {
        $id: 'attendee-1',
        firstName: 'John',
        lastName: 'Doe',
        customFieldValues: JSON.stringify({ 'field-2': 'developer' }),
      };

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      mockDatabases.updateDocument.mockReset();
      mockDatabases.createDocument.mockReset();

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 2 }); // Custom fields

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendee); // Get attendee 1

      mockDatabases.updateDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
        'attendee-1',
        expect.objectContaining({
          customFieldValues: expect.stringContaining('MANAGER'),
        })
      );
    });

    it('should skip no-change values', async () => {
      mockReq.body.changes = {
        'field-1': 'no-change',
        'field-2': 'manager',
      };

      const mockAttendee = {
        $id: 'attendee-1',
        firstName: 'John',
        lastName: 'Doe',
        customFieldValues: JSON.stringify({ 'field-2': 'developer' }),
      };

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      mockDatabases.updateDocument.mockReset();
      mockDatabases.createDocument.mockReset();

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 2 }); // Custom fields

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendee); // Get attendee 1

      mockDatabases.updateDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
        'attendee-1',
        expect.objectContaining({
          customFieldValues: expect.not.stringContaining('field-1'),
        })
      );
    });

    it('should skip empty values', async () => {
      mockReq.body.changes = {
        'field-1': '',
        'field-2': 'manager',
      };

      const mockAttendee = {
        $id: 'attendee-1',
        firstName: 'John',
        lastName: 'Doe',
        customFieldValues: JSON.stringify({ 'field-2': 'developer' }),
      };

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      mockDatabases.updateDocument.mockReset();
      mockDatabases.createDocument.mockReset();

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 2 }); // Custom fields

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendee); // Get attendee 1

      mockDatabases.updateDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should skip unknown custom fields', async () => {
      mockReq.body.changes = {
        'unknown-field': 'value',
        'field-1': 'Engineering',
      };

      const mockAttendee = {
        $id: 'attendee-1',
        firstName: 'John',
        lastName: 'Doe',
        customFieldValues: JSON.stringify({ 'field-1': 'Sales' }),
      };

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      mockDatabases.updateDocument.mockReset();
      mockDatabases.createDocument.mockReset();

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 2 }); // Custom fields

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendee); // Get attendee 1

      mockDatabases.updateDocument.mockResolvedValue({ success: true });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should not update if no changes detected', async () => {
      const mockAttendee = {
        $id: 'attendee-1',
        firstName: 'John',
        lastName: 'Doe',
        customFieldValues: JSON.stringify({ 'field-1': 'Engineering', 'field-2': 'MANAGER' }),
      };

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      mockDatabases.updateDocument.mockReset();
      mockDatabases.createDocument.mockReset();

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 2 }); // Custom fields

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendee); // Get attendee 1

      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedCount: 0,
        })
      );
    });

    it('should handle partial failures gracefully', async () => {
      const mockAttendees = [
        {
          $id: 'attendee-1',
          firstName: 'John',
          lastName: 'Doe',
          customFieldValues: JSON.stringify({ 'field-1': 'Sales' }),
        },
        {
          $id: 'attendee-2',
          firstName: 'Jane',
          lastName: 'Smith',
          customFieldValues: JSON.stringify({ 'field-1': 'Marketing' }),
        },
      ];

      mockDatabases.listDocuments.mockReset();
      mockDatabases.getDocument.mockReset();
      mockDatabases.updateDocument.mockReset();
      mockDatabases.createDocument.mockReset();

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 2 }); // Custom fields

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendees[0]) // Get attendee 1
        .mockResolvedValueOnce(mockAttendees[1]); // Get attendee 2

      mockDatabases.updateDocument
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Update failed'));

      mockDatabases.createDocument.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedCount: 1,
          errors: [{ id: 'attendee-2', error: 'Update failed' }],
        })
      );
    });

    it('should create log entry for bulk edit', async () => {
      const mockAttendee = {
        $id: 'attendee-1',
        firstName: 'John',
        lastName: 'Doe',
        customFieldValues: JSON.stringify({ 'field-1': 'Sales' }),
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 2 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      mockDatabases.updateDocument.mockResolvedValue({ success: true });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'bulk_update',
          details: expect.stringContaining('attendees'),
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
      mockAccount.get.mockReset();
      mockDatabases.listDocuments.mockReset();
      
      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockDatabases.listDocuments.mockRejectedValue(new Error('Database error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
        })
      );
    });
  });
});
