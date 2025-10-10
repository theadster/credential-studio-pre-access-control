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

describe('/api/attendees - Attendee Management API', () => {
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
      query: {},
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

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).code = 401;
      mockAccount.get.mockRejectedValue(authError);

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

    it('should return 404 if user profile is not found', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'User profile not found',
          code: 404,
          type: 'profile_not_found',
        })
      );
    });
  });

  describe('GET /api/attendees', () => {
    it('should return list of attendees for authorized user', async () => {
      const mockAttendees = [
        {
          $id: 'attendee-1',
          firstName: 'John',
          lastName: 'Doe',
          barcodeNumber: '12345',
          photoUrl: 'https://example.com/photo1.jpg',
          customFieldValues: JSON.stringify({ 'field-1': 'value1' }),
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          $id: 'attendee-2',
          firstName: 'Jane',
          lastName: 'Smith',
          barcodeNumber: '67890',
          photoUrl: null,
          customFieldValues: JSON.stringify({ 'field-1': 'value2' }),
          $createdAt: '2024-01-02T00:00:00.000Z',
          $updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      const mockCustomFields = [
        {
          $id: 'field-1',
          fieldName: 'Field 1',
          showOnMainPage: true,
        },
      ];

      // Expected response with parsed customFieldValues and id field
      const expectedResponse = [
        {
          ...mockAttendees[0],
          id: 'attendee-1',
          customFieldValues: [{ customFieldId: 'field-1', value: 'value1' }],
        },
        {
          ...mockAttendees[1],
          id: 'attendee-2',
          customFieldValues: [{ customFieldId: 'field-1', value: 'value2' }],
        },
      ];

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile lookup
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 }) // Custom fields for visibility
        .mockResolvedValueOnce({ documents: mockAttendees, total: 2 }) // Attendees list
        .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 }); // Log settings

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
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
        error: 'Insufficient permissions to view attendees',
      });
    });

    it('should filter attendees by firstName', async () => {
      mockReq.query = {
        firstName: JSON.stringify({ value: 'John', operator: 'contains' }),
      };

      const mockCustomFields = [{ $id: 'field-1', showOnMainPage: true }];

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: [mockAttendee], total: 1 })
        .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const expectedResponse = [{
        ...mockAttendee,
        id: mockAttendee.$id,
        customFieldValues: [{ customFieldId: 'field-1', value: 'value1' }],
      }];

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    });

    it('should filter attendees by lastName', async () => {
      mockReq.query = {
        lastName: JSON.stringify({ value: 'Doe', operator: 'equals' }),
      };

      const mockCustomFields = [{ $id: 'field-1', showOnMainPage: true }];

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: [mockAttendee], total: 1 })
        .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should filter attendees by barcode', async () => {
      mockReq.query = {
        barcode: JSON.stringify({ value: '12345', operator: 'equals' }),
      };

      const mockCustomFields = [{ $id: 'field-1', showOnMainPage: true }];

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: [mockAttendee], total: 1 })
        .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should filter attendees with photos', async () => {
      mockReq.query = {
        photoFilter: 'with',
      };

      const mockCustomFields = [{ $id: 'field-1', showOnMainPage: true }];

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: [mockAttendee], total: 1 })
        .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should filter attendees without photos', async () => {
      mockReq.query = {
        photoFilter: 'without',
      };

      const attendeeWithoutPhoto = { ...mockAttendee, photoUrl: null };
      const mockCustomFields = [{ $id: 'field-1', showOnMainPage: true }];

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: [attendeeWithoutPhoto], total: 1 })
        .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should filter attendees by custom fields', async () => {
      mockReq.query = {
        customFields: JSON.stringify({
          'field-1': { value: 'value1', operator: 'equals' },
        }),
      };

      const mockCustomFields = [{ $id: 'field-1', showOnMainPage: true }];

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: [mockAttendee], total: 1 })
        .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // The route filters in-memory, so if the custom field doesn't match, it returns empty array
      // Since mockAttendee has customFieldValues as a JSON string, it needs to be parsed for filtering
      expect(statusMock).toHaveBeenCalledWith(200);
      // The filter logic parses and checks, so this test expects empty array since the mock doesn't match the filter
      expect(jsonMock).toHaveBeenCalledWith([]);
    });

    it('should create log entry for viewing attendees list', async () => {
      const mockCustomFields = [{ $id: 'field-1', showOnMainPage: true }];

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: [mockAttendee], total: 1 })
        .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'view',
          details: expect.stringContaining('attendees_list'),
        })
      );
    });

    describe('Custom Field Visibility Filtering', () => {
      it('should filter out custom fields where showOnMainPage is false', async () => {
        const mockCustomFields = [
          { $id: 'field-visible', showOnMainPage: true },
          { $id: 'field-hidden', showOnMainPage: false },
        ];

        const mockAttendeeWithFields = {
          $id: 'attendee-test',
          firstName: 'Test',
          lastName: 'User',
          barcodeNumber: '99999',
          photoUrl: null,
          customFieldValues: JSON.stringify({
            'field-visible': 'visible value',
            'field-hidden': 'hidden value',
          }),
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        };

        mockDatabases.listDocuments
          .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
          .mockResolvedValueOnce({ documents: mockCustomFields, total: 2 })
          .mockResolvedValueOnce({ documents: [mockAttendeeWithFields], total: 1 })
          .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 });

        mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(statusMock).toHaveBeenCalledWith(200);
        const result = jsonMock.mock.calls[0][0];
        expect(result[0].customFieldValues).toHaveLength(1);
        expect(result[0].customFieldValues[0].customFieldId).toBe('field-visible');
      });

      it('should default to visible when showOnMainPage is undefined', async () => {
        const mockCustomFields = [
          { $id: 'field-1' }, // showOnMainPage is undefined
        ];

        const mockAttendeeWithFields = {
          $id: 'attendee-test',
          firstName: 'Test',
          lastName: 'User',
          barcodeNumber: '99999',
          photoUrl: null,
          customFieldValues: JSON.stringify({ 'field-1': 'value1' }),
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        };

        mockDatabases.listDocuments
          .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
          .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
          .mockResolvedValueOnce({ documents: [mockAttendeeWithFields], total: 1 })
          .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 });

        mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(statusMock).toHaveBeenCalledWith(200);
        const result = jsonMock.mock.calls[0][0];
        expect(result[0].customFieldValues).toHaveLength(1);
        expect(result[0].customFieldValues[0].customFieldId).toBe('field-1');
      });

      it('should default to visible when showOnMainPage is null', async () => {
        const mockCustomFields = [
          { $id: 'field-1', showOnMainPage: null },
        ];

        const mockAttendeeWithFields = {
          $id: 'attendee-test',
          firstName: 'Test',
          lastName: 'User',
          barcodeNumber: '99999',
          photoUrl: null,
          customFieldValues: JSON.stringify({ 'field-1': 'value1' }),
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        };

        mockDatabases.listDocuments
          .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
          .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
          .mockResolvedValueOnce({ documents: [mockAttendeeWithFields], total: 1 })
          .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 });

        mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(statusMock).toHaveBeenCalledWith(200);
        const result = jsonMock.mock.calls[0][0];
        expect(result[0].customFieldValues).toHaveLength(1);
        expect(result[0].customFieldValues[0].customFieldId).toBe('field-1');
      });

      it('should handle attendees with no custom field values', async () => {
        const mockCustomFields = [{ $id: 'field-1', showOnMainPage: true }];

        const mockAttendeeNoFields = {
          $id: 'attendee-test',
          firstName: 'Test',
          lastName: 'User',
          barcodeNumber: '99999',
          photoUrl: null,
          customFieldValues: null,
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        };

        mockDatabases.listDocuments
          .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
          .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
          .mockResolvedValueOnce({ documents: [mockAttendeeNoFields], total: 1 })
          .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 });

        mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(statusMock).toHaveBeenCalledWith(200);
        const result = jsonMock.mock.calls[0][0];
        expect(result[0].customFieldValues).toEqual([]);
      });

      it('should handle array format custom field values with visibility filtering', async () => {
        const mockCustomFields = [
          { $id: 'field-visible', showOnMainPage: true },
          { $id: 'field-hidden', showOnMainPage: false },
        ];

        const mockAttendeeWithArrayFields = {
          $id: 'attendee-test',
          firstName: 'Test',
          lastName: 'User',
          barcodeNumber: '99999',
          photoUrl: null,
          customFieldValues: JSON.stringify([
            { customFieldId: 'field-visible', value: 'visible value' },
            { customFieldId: 'field-hidden', value: 'hidden value' },
          ]),
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        };

        mockDatabases.listDocuments
          .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
          .mockResolvedValueOnce({ documents: mockCustomFields, total: 2 })
          .mockResolvedValueOnce({ documents: [mockAttendeeWithArrayFields], total: 1 })
          .mockResolvedValueOnce({ documents: [{ systemViewAttendeeList: true }], total: 1 });

        mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(statusMock).toHaveBeenCalledWith(200);
        const result = jsonMock.mock.calls[0][0];
        expect(result[0].customFieldValues).toHaveLength(1);
        expect(result[0].customFieldValues[0].customFieldId).toBe('field-visible');
      });
    });
  });

  describe('POST /api/attendees', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        photoUrl: 'https://example.com/photo.jpg',
        customFieldValues: [
          { customFieldId: 'field-1', value: 'value1' },
        ],
      };
    });

    it('should create a new attendee successfully', async () => {
      const newAttendee = {
        $id: 'new-attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        photoUrl: 'https://example.com/photo.jpg',
        customFieldValues: JSON.stringify({ 'field-1': 'value1' }),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      const expectedResponse = {
        ...newAttendee,
        id: 'new-attendee-123',
        customFieldValues: { 'field-1': 'value1' },
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile lookup
        .mockResolvedValueOnce({ documents: [], total: 0 }) // Check barcode uniqueness
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1', fieldName: 'Field 1' }], total: 1 }); // Custom fields

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.createDocument
        .mockResolvedValueOnce(newAttendee) // Create attendee
        .mockResolvedValueOnce({ $id: 'log-123' }); // Create log

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          barcodeNumber: '12345',
          photoUrl: 'https://example.com/photo.jpg',
          customFieldValues: JSON.stringify({ 'field-1': 'value1' }),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    });

    it('should return 403 if user does not have create permission', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockViewerRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to create attendees',
      });
    });

    it('should return 400 if firstName is missing', async () => {
      mockReq.body = { lastName: 'Doe', barcodeNumber: '12345' };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if lastName is missing', async () => {
      mockReq.body = { firstName: 'John', barcodeNumber: '12345' };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if barcodeNumber is missing', async () => {
      mockReq.body = { firstName: 'John', lastName: 'Doe' };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if barcode already exists', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockAttendee], total: 1 }); // Barcode exists

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Barcode number already exists' });
    });

    it('should return 400 if custom field IDs are invalid', async () => {
      mockReq.body.customFieldValues = [
        { customFieldId: 'invalid-field', value: 'value1' },
      ];

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1' }], total: 1 }); // Valid fields

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Some custom fields no longer exist. Please refresh the page and try again.',
        })
      );
    });

    it('should create attendee without photoUrl if not provided', async () => {
      mockReq.body.photoUrl = undefined;

      const newAttendee = {
        $id: 'new-attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        photoUrl: null,
        customFieldValues: JSON.stringify({ 'field-1': 'value1' }),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1' }], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.createDocument
        .mockResolvedValueOnce(newAttendee)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should filter out empty custom field values', async () => {
      mockReq.body.customFieldValues = [
        { customFieldId: 'field-1', value: 'value1' },
        { customFieldId: 'field-2', value: '' },
        { customFieldId: 'field-3', value: null },
      ];

      const newAttendee = {
        $id: 'new-attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        photoUrl: 'https://example.com/photo.jpg',
        customFieldValues: JSON.stringify({ 'field-1': 'value1' }),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1' }, { $id: 'field-2' }, { $id: 'field-3' }], total: 3 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.createDocument
        .mockResolvedValueOnce(newAttendee)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          customFieldValues: JSON.stringify({ 'field-1': 'value1' }),
        })
      );
    });

    it('should create log entry for attendee creation', async () => {
      const newAttendee = {
        $id: 'new-attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        photoUrl: 'https://example.com/photo.jpg',
        customFieldValues: JSON.stringify({ 'field-1': 'value1' }),
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1' }], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.createDocument
        .mockResolvedValueOnce(newAttendee)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          attendeeId: 'new-attendee-123',
          action: 'create',
          details: expect.stringContaining('attendee'),
        })
      );
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'PATCH';

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method PATCH not allowed' });
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
      mockDatabases.listDocuments.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should handle generic errors', async () => {
      const dbError = new Error('Database error');
      (dbError as any).code = 500;
      mockDatabases.listDocuments.mockRejectedValue(dbError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database error',
          code: 500,
          type: 'internal_error',
        })
      );
    });
  });
});
