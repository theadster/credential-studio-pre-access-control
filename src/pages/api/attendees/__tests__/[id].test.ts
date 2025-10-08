import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../[id]';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
}));

describe('/api/attendees/[id] - Attendee Detail API', () => {
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
      attendees: { create: true, read: true, update: true, delete: true },
      all: true,
    }),
  };

  const mockViewerRole = {
    $id: 'role-viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: JSON.stringify({
      attendees: { read: true },
    }),
  };

  const mockAttendee = {
    $id: 'attendee-123',
    firstName: 'John',
    lastName: 'Doe',
    barcodeNumber: '12345',
    photoUrl: 'https://example.com/photo.jpg',
    credentialUrl: null,
    credentialGeneratedAt: null,
    customFieldValues: JSON.stringify({ 'field-1': 'value1' }),
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
      query: { id: 'attendee-123' },
      body: {},
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
      action: 'view',
      details: '{}',
    });
  });

  describe('Validation', () => {
    it('should return 400 if attendee ID is missing', async () => {
      mockReq.query = {};

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee ID' });
    });

    it('should return 400 if attendee ID is not a string', async () => {
      mockReq.query = { id: ['array', 'value'] };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee ID' });
    });
  });

  describe('GET /api/attendees/[id]', () => {
    it('should return attendee details for authorized user', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // User role
        .mockResolvedValueOnce(mockAttendee); // Attendee

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockAttendee);
    });

    it('should return 403 if user does not have read permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ attendees: { read: false } }),
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to view attendee details',
      });
    });

    it('should return 404 if attendee is not found', async () => {
      const error = new Error('Not found');
      (error as any).code = 404;

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockRejectedValueOnce(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should create log entry for viewing attendee', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          attendeeId: 'attendee-123',
          action: 'view',
          details: expect.stringContaining('attendee_detail'),
        })
      );
    });
  });

  describe('PUT /api/attendees/[id]', () => {
    beforeEach(() => {
      mockReq.method = 'PUT';
      mockReq.body = {
        firstName: 'Jane',
        lastName: 'Smith',
        barcodeNumber: '67890',
        photoUrl: 'https://example.com/new-photo.jpg',
        customFieldValues: [
          { customFieldId: 'field-1', value: 'new-value1' },
        ],
      };
    });

    it('should update attendee successfully', async () => {
      const updatedAttendee = {
        ...mockAttendee,
        firstName: 'Jane',
        lastName: 'Smith',
        barcodeNumber: '67890',
        photoUrl: 'https://example.com/new-photo.jpg',
        customFieldValues: JSON.stringify({ 'field-1': 'new-value1' }),
        $updatedAt: '2024-01-06T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: [], total: 0 }) // Check barcode uniqueness
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1', fieldName: 'Field 1', fieldType: 'text' }], total: 1 }); // Custom fields

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // User role
        .mockResolvedValueOnce(mockAttendee) // Existing attendee
        .mockResolvedValueOnce(updatedAttendee); // Final attendee after update

      mockDatabases.updateDocument.mockResolvedValue(updatedAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
        'attendee-123',
        expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
          barcodeNumber: '67890',
          photoUrl: 'https://example.com/new-photo.jpg',
          customFieldValues: JSON.stringify({ 'field-1': 'new-value1' }),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(updatedAttendee);
    });

    it('should return 403 if user does not have update permission', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockViewerRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to update attendees',
      });
    });

    it('should return 404 if attendee is not found', async () => {
      const error = new Error('Not found');
      (error as any).code = 404;

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockRejectedValueOnce(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 400 if barcode already exists for another attendee', async () => {
      const anotherAttendee = { ...mockAttendee, $id: 'another-attendee' };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [anotherAttendee], total: 1 }); // Barcode exists

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Barcode number already exists' });
    });

    it('should allow same barcode if updating same attendee', async () => {
      mockReq.body.barcodeNumber = '12345'; // Same as existing

      const updatedAttendee = {
        ...mockAttendee,
        firstName: 'Jane',
        $updatedAt: '2024-01-06T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1', fieldName: 'Field 1', fieldType: 'text' }], total: 1 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee)
        .mockResolvedValueOnce(updatedAttendee);

      mockDatabases.updateDocument.mockResolvedValue(updatedAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 if custom field IDs are invalid', async () => {
      mockReq.body.customFieldValues = [
        { customFieldId: 'invalid-field', value: 'value1' },
      ];

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1' }], total: 1 }); // Valid fields

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Some custom fields no longer exist. Please refresh the page and try again.',
        })
      );
    });

    it('should update only provided fields', async () => {
      mockReq.body = {
        firstName: 'Jane',
      };

      const updatedAttendee = {
        ...mockAttendee,
        firstName: 'Jane',
        $updatedAt: '2024-01-06T00:00:00.000Z',
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee)
        .mockResolvedValueOnce(updatedAttendee);

      mockDatabases.updateDocument.mockResolvedValue(updatedAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
        'attendee-123',
        expect.objectContaining({
          firstName: 'Jane',
          lastName: mockAttendee.lastName,
          barcodeNumber: mockAttendee.barcodeNumber,
        })
      );
    });

    it('should create log entry with change details', async () => {
      const updatedAttendee = {
        ...mockAttendee,
        firstName: 'Jane',
        $updatedAt: '2024-01-06T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1', fieldName: 'Field 1', fieldType: 'text' }], total: 1 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee)
        .mockResolvedValueOnce(updatedAttendee);

      mockDatabases.updateDocument.mockResolvedValue(updatedAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          attendeeId: 'attendee-123',
          action: 'update',
          details: expect.stringContaining('changes'),
        })
      );
    });
  });

  describe('DELETE /api/attendees/[id]', () => {
    beforeEach(() => {
      mockReq.method = 'DELETE';
    });

    it('should delete attendee successfully', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // User role
        .mockResolvedValueOnce(mockAttendee); // Attendee to delete

      mockDatabases.deleteDocument.mockResolvedValue({ success: true });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.deleteDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
        'attendee-123'
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Attendee deleted successfully' });
    });

    it('should return 403 if user does not have delete permission', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockViewerRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to delete attendees',
      });
    });

    it('should return 404 if attendee is not found', async () => {
      const error = new Error('Not found');
      (error as any).code = 404;

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockRejectedValueOnce(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should create log entry for attendee deletion', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      mockDatabases.deleteDocument.mockResolvedValue({ success: true });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'delete',
          details: expect.stringContaining('attendee'),
        })
      );
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'PATCH';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method PATCH not allowed' });
    });
  });
});
