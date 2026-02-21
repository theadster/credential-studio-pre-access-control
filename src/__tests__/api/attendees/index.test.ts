import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/attendees/index';
import { mockAccount, mockTablesDB, mockAdminTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the transactions module
vi.mock('@/lib/transactions', () => ({
  executeTransactionWithRetry: vi.fn(async (tablesDB: any, operations: any[]) => {
    // Execute operations sequentially without actual transaction
    for (const op of operations) {
      switch (op.type || op.action) {
        case 'create':
          await mockTablesDB.createRow({
            databaseId: op.databaseId,
            tableId: op.tableId,
            rowId: op.rowId,
            data: op.data
          });
          break;
        case 'update':
          await mockTablesDB.updateRow({
            databaseId: op.databaseId,
            tableId: op.tableId,
            rowId: op.rowId,
            data: op.data
          });
          break;
        case 'delete':
          await mockTablesDB.deleteRow({
            databaseId: op.databaseId,
            tableId: op.tableId,
            rowId: op.rowId
          });
          break;
      }
    }
    return undefined;
  }),
  handleTransactionError: vi.fn((error: any) => {
    throw error;
  }),
}));

// Mock log settings to avoid createAdminClient issues
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(async () => true),
  getLogSettings: vi.fn(async () => ({
    logAttendeeCreate: true,
    logAttendeeUpdate: true,
    logAttendeeDelete: true,
  })),
}));

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    tablesDB: mockTablesDB,

  })),
  createAdminClient: vi.fn(() => ({
    tablesDB: mockAdminTablesDB,
  })),
}));

// Mock the API middleware to inject user and userProfile directly
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handler: any) => async (req: any, res: any) => {
    // The test will set req.user and req.userProfile before calling handler
    return handler(req, res);
  },
  AuthenticatedRequest: {} as any,
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
      // Inject authenticated user and profile (bypassing middleware)
      user: mockAuthUser,
      userProfile: {
        ...mockUserProfile,
        role: {
          id: mockAdminRole.$id,
          name: mockAdminRole.name,
          description: mockAdminRole.description,
          permissions: JSON.parse(mockAdminRole.permissions),
        },
      },
    } as any;
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockTablesDB.listRows.mockResolvedValue({
      rows: [],
      total: 0,
    });
    mockTablesDB.getRow.mockResolvedValue(mockAdminRole);
    mockAdminTablesDB.getRow.mockResolvedValue(mockAdminRole);
    mockTablesDB.createRow.mockResolvedValue({
      $id: 'new-log-123',
      userId: mockAuthUser.$id,
      action: 'view',
      details: '{}',
    });
  });

  describe('Authentication', () => {
    // These tests are for the middleware, which we're bypassing in these tests
    // The middleware is tested separately in apiMiddleware.test.ts
    it.skip('should return 401 if user is not authenticated', async () => {
      // Middleware test - skipped because we bypass middleware in handler tests
    });

    it.skip('should return 404 if user profile is not found', async () => {
      // Middleware test - skipped because we bypass middleware in handler tests
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

      // Expected response with parsed customFieldValues and id field
      const expectedResponse = {
        attendees: [
          {
            ...mockAttendees[0],
            id: 'attendee-1',
            customFieldValues: [{ customFieldId: 'field-1', value: 'value1' }],
            accessEnabled: true,
            validFrom: null,
            validUntil: null,
            accessControl: {
              accessEnabled: true,
              validFrom: null,
              validUntil: null,
            },
          },
          {
            ...mockAttendees[1],
            id: 'attendee-2',
            customFieldValues: [{ customFieldId: 'field-1', value: 'value2' }],
            accessEnabled: true,
            validFrom: null,
            validUntil: null,
            accessControl: {
              accessEnabled: true,
              validFrom: null,
              validUntil: null,
            },
          },
        ],
        total: 2,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: mockAttendees, total: 2 }) // Attendees list
        .mockResolvedValueOnce({ rows: [], total: 0 }); // Access control (empty)

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    });

    it('should return 403 if user does not have read permission', async () => {
      // Override the userProfile role with no read permission
      (mockReq as any).userProfile = {
        ...mockUserProfile,
        role: {
          id: 'role-no-perm',
          name: 'No Permission',
          description: 'No permissions',
          permissions: { attendees: { read: false } },
        },
      };

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

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockAttendee], total: 1 }) // Attendees
        .mockResolvedValueOnce({ rows: [], total: 0 }); // Access control (empty)

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const expectedResponse = {
        attendees: [{
          ...mockAttendee,
          id: mockAttendee.$id,
          customFieldValues: [{ customFieldId: 'field-1', value: 'value1' }],
          accessEnabled: true,
          validFrom: null,
          validUntil: null,
          accessControl: {
            accessEnabled: true,
            validFrom: null,
            validUntil: null,
          },
        }],
        total: 1,
      };

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    });

    it('should filter attendees by lastName', async () => {
      mockReq.query = {
        lastName: JSON.stringify({ value: 'Doe', operator: 'equals' }),
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockAttendee], total: 1 }) // Attendees
        .mockResolvedValueOnce({ rows: [], total: 0 }); // Access control (empty)

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const expectedResponse = {
        attendees: [{
          ...mockAttendee,
          id: mockAttendee.$id,
          customFieldValues: [{ customFieldId: 'field-1', value: 'value1' }],
          accessEnabled: true,
          validFrom: null,
          validUntil: null,
          accessControl: {
            accessEnabled: true,
            validFrom: null,
            validUntil: null,
          },
        }],
        total: 1,
      };

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    });

    it('should filter attendees by barcode', async () => {
      mockReq.query = {
        barcode: JSON.stringify({ value: '12345', operator: 'equals' }),
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should filter attendees with photos', async () => {
      mockReq.query = {
        photoFilter: 'with',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockAttendee], total: 1 }) // Attendees
        .mockResolvedValueOnce({ rows: [], total: 0 }); // Access control (empty)

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const expectedResponse = {
        attendees: [{
          ...mockAttendee,
          id: mockAttendee.$id,
          customFieldValues: [{ customFieldId: 'field-1', value: 'value1' }],
          accessEnabled: true,
          validFrom: null,
          validUntil: null,
          accessControl: {
            accessEnabled: true,
            validFrom: null,
            validUntil: null,
          },
        }],
        total: 1,
      };

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    });

    it('should filter attendees without photos', async () => {
      mockReq.query = {
        photoFilter: 'without',
      };

      const attendeeWithoutPhoto = { ...mockAttendee, photoUrl: null };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [attendeeWithoutPhoto], total: 1 }) // Attendees
        .mockResolvedValueOnce({ rows: [], total: 0 }); // Access control (empty)

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const expectedResponse = {
        attendees: [{
          ...attendeeWithoutPhoto,
          id: attendeeWithoutPhoto.$id,
          customFieldValues: [{ customFieldId: 'field-1', value: 'value1' }],
          accessEnabled: true,
          validFrom: null,
          validUntil: null,
          accessControl: {
            accessEnabled: true,
            validFrom: null,
            validUntil: null,
          },
        }],
        total: 1,
      };

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    });

    it('should filter attendees by custom fields', async () => {
      mockReq.query = {
        customFields: JSON.stringify({
          'field-1': { value: 'value1', operator: 'equals' },
        }),
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockAttendee], total: 1 }) // Attendees
        .mockResolvedValueOnce({ rows: [], total: 0 }); // Access control (empty)

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // The route filters in-memory after parsing customFieldValues
      // mockAttendee has customFieldValues: JSON.stringify({ 'field-1': 'value1' })
      // which matches the filter, so it should return the attendee
      expect(statusMock).toHaveBeenCalledWith(200);
      const expectedResponse = {
        attendees: [{
          ...mockAttendee,
          id: mockAttendee.$id,
          customFieldValues: [{ customFieldId: 'field-1', value: 'value1' }],
          accessEnabled: true,
          validFrom: null,
          validUntil: null,
          accessControl: {
            accessEnabled: true,
            validFrom: null,
            validUntil: null,
          },
        }],
        total: 1,
      };
      expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    });

    it.skip('should create log entry for viewing attendees list', async () => {
      // This test is currently skipped because the logging for list view is disabled in the handler
      // See comment in handler: "TODO: Attendee list view logging is currently inoperable"
    });

    // Note: Custom field visibility filtering tests removed as that feature was dead code
    // The API now returns ALL custom fields without filtering by showOnMainPage
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
        customFieldValues: [{ customFieldId: 'field-1', value: 'value1' }],
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [], total: 0 }) // Check barcode uniqueness
        .mockResolvedValueOnce({ rows: [{ $id: 'field-1', fieldName: 'Field 1' }], total: 1 }); // Custom fields

      mockTablesDB.createRow
        .mockResolvedValueOnce(newAttendee) // Create attendee (called through transaction)
        .mockResolvedValueOnce({ $id: 'log-123' }); // Create log (called through transaction)

      mockTablesDB.getRow
        .mockResolvedValueOnce(newAttendee); // Fetch created attendee

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    });

    it('should return 403 if user does not have create permission', async () => {
      // Override the userProfile role with viewer permissions (no create)
      (mockReq as any).userProfile = {
        ...mockUserProfile,
        role: {
          id: mockViewerRole.$id,
          name: mockViewerRole.name,
          description: mockViewerRole.description,
          permissions: JSON.parse(mockViewerRole.permissions),
        },
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to create attendees',
      });
    });

    it('should return 400 if firstName is missing', async () => {
      mockReq.body = { lastName: 'Doe', barcodeNumber: '12345' };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if lastName is missing', async () => {
      mockReq.body = { firstName: 'John', barcodeNumber: '12345' };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if barcodeNumber is missing', async () => {
      mockReq.body = { firstName: 'John', lastName: 'Doe' };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if barcode already exists', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockAttendee], total: 1 }); // Barcode exists

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ 
        error: 'Barcode number already exists',
        existingAttendee: {
          firstName: mockAttendee.firstName,
          lastName: mockAttendee.lastName,
          barcodeNumber: mockAttendee.barcodeNumber,
        },
      });
    });

    it('should return 400 if custom field IDs are invalid', async () => {
      mockReq.body.customFieldValues = [
        { customFieldId: 'invalid-field', value: 'value1' },
      ];

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [], total: 0 }) // Barcode check
        .mockResolvedValueOnce({ rows: [{ $id: 'field-1' }], total: 1 }); // Valid fields

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

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [], total: 0 }) // Barcode check
        .mockResolvedValueOnce({ rows: [{ $id: 'field-1' }], total: 1 }); // Custom fields

      mockTablesDB.createRow
        .mockResolvedValueOnce(newAttendee)
        .mockResolvedValueOnce({ $id: 'log-123' });

      mockTablesDB.getRow
        .mockResolvedValueOnce(newAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        photoUrl: null,
      }));
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

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [], total: 0 }) // Barcode check
        .mockResolvedValueOnce({ rows: [{ $id: 'field-1' }, { $id: 'field-2' }, { $id: 'field-3' }], total: 3 }); // Custom fields

      mockTablesDB.createRow
        .mockResolvedValueOnce(newAttendee)
        .mockResolvedValueOnce({ $id: 'log-123' });

      mockTablesDB.getRow
        .mockResolvedValueOnce(newAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(201);
      // The test verifies that empty values are filtered out by checking the response
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        customFieldValues: [{ customFieldId: 'field-1', value: 'value1' }],
      }));
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

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [], total: 0 }) // Barcode check
        .mockResolvedValueOnce({ rows: [{ $id: 'field-1' }], total: 1 }); // Custom fields

      mockTablesDB.createRow
        .mockResolvedValueOnce(newAttendee)
        .mockResolvedValueOnce({ $id: 'log-123' });

      mockTablesDB.getRow
        .mockResolvedValueOnce(newAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify that createRow was called for both attendee and log
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(2);
      
      // Verify the first call was for the attendee
      expect(mockTablesDB.createRow).toHaveBeenNthCalledWith(
        1,
        expect.any(String), // dbId
        expect.any(String), // attendeesTableId
        expect.any(String), // attendeeId
        expect.any(Object)  // attendee data
      );
      
      // Verify the second call was for the log entry
      expect(mockTablesDB.createRow).toHaveBeenNthCalledWith(
        2,
        expect.any(String), // dbId
        expect.any(String), // logsTableId
        expect.any(String), // logId
        expect.objectContaining({
          userId: expect.any(String),
          action: expect.any(String),
          details: expect.any(String),
        })
      );
      
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'PATCH';

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method PATCH not allowed' });
    });
  });

  describe('Error Handling', () => {
    // These tests are for middleware error handling, which we're bypassing in handler tests
    // The middleware error handling is tested separately in apiMiddleware.test.ts
    it.skip('should handle Appwrite 401 errors', async () => {
      // Middleware test - skipped
    });

    it.skip('should handle Appwrite 404 errors', async () => {
      // Middleware test - skipped
    });

    it.skip('should handle generic errors', async () => {
      // Middleware test - skipped
    });
  });
});
