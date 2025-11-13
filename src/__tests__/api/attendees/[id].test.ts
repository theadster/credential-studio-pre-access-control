import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../[id]';
import { mockAccount, mockDatabases, mockTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Extend NextApiRequest to include authentication properties
interface AuthenticatedRequest extends NextApiRequest {
  user?: any;
  userProfile?: any;
}

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
    tablesDB: mockTablesDB,
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

// Mock log settings
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(true)),
}));

// Mock log formatting
vi.mock('@/lib/logFormatting', () => ({
  createAttendeeLogDetails: vi.fn((action: string, attendeeData: any, extra?: any) => ({
    type: `attendee_${action}`,
    attendeeId: attendeeData.id || 'attendee-123',
    firstName: attendeeData.firstName,
    lastName: attendeeData.lastName,
    barcodeNumber: attendeeData.barcodeNumber,
    ...extra
  })),
}));

// Mock transactions module to forward to mockTablesDB
const mockExecuteTransactionWithRetry = vi.fn(async (tablesDB: any, operations: any[]) => {
  const transaction = await tablesDB.createTransaction();
  await tablesDB.createOperations({
    transactionId: transaction.$id,
    operations,
  });
  await tablesDB.updateTransaction({
    transactionId: transaction.$id,
    commit: true,
  });

  return {
    success: true,
    transactionId: transaction.$id,
    operationsCount: operations.length,
  };
});

const mockHandleTransactionError = vi.fn((error: any, res: any) => {
  res.status(500).json({ error: 'Transaction failed' });
});

vi.mock('@/lib/transactions', () => ({
  executeTransactionWithRetry: mockExecuteTransactionWithRetry,
  handleTransactionError: mockHandleTransactionError,
}));

describe('/api/attendees/[id] - Attendee Detail API', () => {
  let mockReq: Partial<AuthenticatedRequest>;
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

    // Configure transaction mocks
    mockTablesDB.createTransaction.mockResolvedValue({ $id: 'transaction-123' });
    mockTablesDB.createOperations.mockResolvedValue(undefined);
    mockTablesDB.updateTransaction.mockResolvedValue(undefined);

    mockReq = {
      method: 'GET',
      cookies: { 'appwrite-session': 'test-session' },
      query: { id: 'attendee-123' },
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

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee ID' });
    });

    it('should return 400 if attendee ID is not a string', async () => {
      mockReq.query = { id: ['array', 'value'] };

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee ID' });
    });
  });

  describe('GET /api/attendees/[id]', () => {
    it('should return attendee details for authorized user', async () => {
      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockAttendee);
    });

    it('should return 403 if user does not have read permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ attendees: { read: false } }),
      };

      // Update the request to have a user without read permission
      mockReq.userProfile = {
        ...mockUserProfile,
        role: {
          id: noPermRole.$id,
          name: noPermRole.name,
          description: noPermRole.description,
          permissions: JSON.parse(noPermRole.permissions),
        },
      };

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to view attendee details',
      });
    });

    it('should return 404 if attendee is not found', async () => {
      const error = new Error('Not found');
      (error as any).code = 404;

      mockDatabases.getDocument.mockRejectedValueOnce(error);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should create log entry for viewing attendee', async () => {
      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

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
        .mockResolvedValueOnce({ documents: [], total: 0 }) // Check barcode uniqueness
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1', fieldName: 'Field 1', fieldType: 'text' }], total: 1 }); // Custom fields

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAttendee) // Existing attendee
        .mockResolvedValueOnce(updatedAttendee); // Final attendee after update

      mockDatabases.updateDocument.mockResolvedValue(updatedAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

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
      mockReq.userProfile = {
        ...mockUserProfile,
        role: {
          id: mockViewerRole.$id,
          name: mockViewerRole.name,
          description: mockViewerRole.description,
          permissions: JSON.parse(mockViewerRole.permissions),
        },
      };

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to update attendees',
      });
    });

    it('should return 404 if attendee is not found', async () => {
      const error = new Error('Not found');
      (error as any).code = 404;

      mockDatabases.getDocument.mockRejectedValueOnce(error);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 400 if barcode already exists for another attendee', async () => {
      const anotherAttendee = { ...mockAttendee, $id: 'another-attendee' };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [anotherAttendee], total: 1 }); // Barcode exists

      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

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
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1', fieldName: 'Field 1', fieldType: 'text' }], total: 1 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAttendee)
        .mockResolvedValueOnce(updatedAttendee);

      mockDatabases.updateDocument.mockResolvedValue(updatedAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 if custom field IDs are invalid', async () => {
      mockReq.body.customFieldValues = [
        { customFieldId: 'invalid-field', value: 'value1' },
      ];

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1' }], total: 1 }); // Valid fields

      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

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

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAttendee)
        .mockResolvedValueOnce(updatedAttendee);

      mockDatabases.updateDocument.mockResolvedValue(updatedAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

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
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [{ $id: 'field-1', fieldName: 'Field 1', fieldType: 'text' }], total: 1 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAttendee)
        .mockResolvedValueOnce(updatedAttendee);

      mockDatabases.updateDocument.mockResolvedValue(updatedAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

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
      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);
      mockDatabases.deleteDocument.mockResolvedValue({ success: true });

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      expect(mockDatabases.deleteDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
        'attendee-123'
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Attendee deleted successfully' });
    });

    it('should return 403 if user does not have delete permission', async () => {
      mockReq.userProfile = {
        ...mockUserProfile,
        role: {
          id: mockViewerRole.$id,
          name: mockViewerRole.name,
          description: mockViewerRole.description,
          permissions: JSON.parse(mockViewerRole.permissions),
        },
      };

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to delete attendees',
      });
    });

    it('should return 404 if attendee is not found', async () => {
      const error = new Error('Not found');
      (error as any).code = 404;

      mockDatabases.getDocument.mockRejectedValueOnce(error);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should create log entry for attendee deletion', async () => {
      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);
      mockDatabases.deleteDocument.mockResolvedValue({ success: true });

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

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

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method PATCH not allowed' });
    });
  });

  describe('Printable Field Change Detection', () => {
    beforeEach(() => {
      mockReq.method = 'PUT';
    });

    it('should update lastSignificantUpdate when printable field changes', async () => {
      const mockCustomFields = [
        {
          $id: 'field-1',
          fieldName: 'Email',
          fieldType: 'text',
          printable: true, // Printable field
        },
        {
          $id: 'field-2',
          fieldName: 'Internal Notes',
          fieldType: 'text',
          printable: false, // Non-printable field
        },
      ];

      const existingAttendee = {
        ...mockAttendee,
        customFieldValues: JSON.stringify({ 'field-1': 'old@email.com', 'field-2': 'old notes' }),
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'field-1', value: 'new@email.com' }, // Changing printable field
          { customFieldId: 'field-2', value: 'old notes' }, // Not changing non-printable
        ],
      };

      // Mock listDocuments to handle different collection calls properly
      mockDatabases.listDocuments.mockImplementation((dbId: string, collectionId: string, queries?: any[]) => {
        // Check if this is a barcode uniqueness check (has Query.equal for barcodeNumber)
        if (queries && queries.some((q: any) => q.toString().includes('barcodeNumber'))) {
          return Promise.resolve({ documents: [], total: 0 });
        }
        // Check if this is a custom fields collection call
        if (collectionId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID) {
          return Promise.resolve({ documents: mockCustomFields, total: mockCustomFields.length });
        }
        // Default fallback
        return Promise.resolve({ documents: [], total: 0 });
      });

      mockDatabases.getDocument.mockResolvedValue(existingAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      // Verify transaction operations were created
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const operationsCall = mockTablesDB.createOperations.mock.calls[0];
      const operations = operationsCall[0].operations;

      // Should have 2 operations: attendee update + audit log
      expect(operations).toHaveLength(2);

      // Check attendee update operation
      const updateOp = operations.find((op: any) => op.action === 'update');
      expect(updateOp).toBeDefined();
      expect(updateOp.rowId).toBe('attendee-123');
      expect(updateOp.data).toEqual(expect.objectContaining({
        customFieldValues: JSON.stringify({ 'field-1': 'new@email.com', 'field-2': 'old notes' }),
        lastSignificantUpdate: expect.any(String),
      }));

      // Check audit log operation
      const logOp = operations.find((op: any) => op.action === 'create');
      expect(logOp).toBeDefined();
      expect(logOp.tableId).toBe(process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID);
    });

    it('should NOT update lastSignificantUpdate when only non-printable field changes', async () => {
      const mockCustomFields = [
        {
          $id: 'field-1',
          fieldName: 'Email',
          fieldType: 'text',
          printable: true,
        },
        {
          $id: 'field-2',
          fieldName: 'Internal Notes',
          fieldType: 'text',
          printable: false, // Non-printable field
        },
      ];

      const existingAttendee = {
        ...mockAttendee,
        customFieldValues: JSON.stringify({ 'field-1': 'email@test.com', 'field-2': 'old notes' }),
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'field-1', value: 'email@test.com' }, // Not changing printable
          { customFieldId: 'field-2', value: 'new notes' }, // Changing NON-printable field only
        ],
      };

      // Mock listDocuments to handle different collection calls properly
      mockDatabases.listDocuments.mockImplementation((dbId: string, collectionId: string, queries?: any[]) => {
        // Check if this is a barcode uniqueness check (has Query.equal for barcodeNumber)
        if (queries && queries.some((q: any) => q.toString().includes('barcodeNumber'))) {
          return Promise.resolve({ documents: [], total: 0 });
        }
        // Check if this is a custom fields collection call
        if (collectionId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID) {
          return Promise.resolve({ documents: mockCustomFields, total: mockCustomFields.length });
        }
        // Default fallback
        return Promise.resolve({ documents: [], total: 0 });
      });

      mockDatabases.getDocument.mockResolvedValue(existingAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      // Verify transaction operations were created
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const operationsCall = mockTablesDB.createOperations.mock.calls[0];
      const operations = operationsCall[0].operations;

      // Should have 2 operations: attendee update + audit log
      expect(operations).toHaveLength(2);

      // Check attendee update operation
      const updateOp = operations.find((op: any) => op.action === 'update');
      expect(updateOp).toBeDefined();
      expect(updateOp.rowId).toBe('attendee-123');
      expect(updateOp.data).toEqual(expect.objectContaining({
        customFieldValues: JSON.stringify({ 'field-1': 'email@test.com', 'field-2': 'new notes' }),
      }));

      // Verify lastSignificantUpdate was NOT included in the update
      expect(updateOp.data.lastSignificantUpdate).toBeUndefined();

      // Check audit log operation
      const logOp = operations.find((op: any) => op.action === 'create');
      expect(logOp).toBeDefined();
      expect(logOp.tableId).toBe(process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID);
    });

    it('should update lastSignificantUpdate when both printable and non-printable fields change', async () => {
      const mockCustomFields = [
        {
          $id: 'field-1',
          fieldName: 'Email',
          fieldType: 'text',
          printable: true,
        },
        {
          $id: 'field-2',
          fieldName: 'Internal Notes',
          fieldType: 'text',
          printable: false,
        },
      ];

      const existingAttendee = {
        ...mockAttendee,
        customFieldValues: JSON.stringify({ 'field-1': 'old@email.com', 'field-2': 'old notes' }),
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'field-1', value: 'new@email.com' }, // Changing printable
          { customFieldId: 'field-2', value: 'new notes' }, // Changing non-printable
        ],
      };

      // Mock listDocuments to handle different collection calls properly
      mockDatabases.listDocuments.mockImplementation((dbId: string, collectionId: string, queries?: any[]) => {
        // Check if this is a barcode uniqueness check (has Query.equal for barcodeNumber)
        if (queries && queries.some((q: any) => q.toString().includes('barcodeNumber'))) {
          return Promise.resolve({ documents: [], total: 0 });
        }
        // Check if this is a custom fields collection call
        if (collectionId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID) {
          return Promise.resolve({ documents: mockCustomFields, total: mockCustomFields.length });
        }
        // Default fallback
        return Promise.resolve({ documents: [], total: 0 });
      });

      mockDatabases.getDocument.mockResolvedValue(existingAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      // Verify transaction operations were created
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const operationsCall = mockTablesDB.createOperations.mock.calls[0];
      const operations = operationsCall[0].operations;

      // Should have 2 operations: attendee update + audit log
      expect(operations).toHaveLength(2);

      // Check attendee update operation
      const updateOp = operations.find((op: any) => op.action === 'update');
      expect(updateOp).toBeDefined();
      expect(updateOp.rowId).toBe('attendee-123');
      expect(updateOp.data).toEqual(expect.objectContaining({
        customFieldValues: JSON.stringify({ 'field-1': 'new@email.com', 'field-2': 'new notes' }),
        lastSignificantUpdate: expect.any(String),
      }));

      // Check audit log operation
      const logOp = operations.find((op: any) => op.action === 'create');
      expect(logOp).toBeDefined();
      expect(logOp.tableId).toBe(process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID);
    });

    it('should treat missing printable flag as non-printable (default to false)', async () => {
      const mockCustomFields = [
        {
          $id: 'field-1',
          fieldName: 'Email',
          fieldType: 'text',
          // printable property is missing - should default to false
        },
        {
          $id: 'field-2',
          fieldName: 'Phone',
          fieldType: 'text',
          printable: undefined, // Explicitly undefined
        },
      ];

      const existingAttendee = {
        ...mockAttendee,
        customFieldValues: JSON.stringify({ 'field-1': 'old@email.com', 'field-2': '123-456' }),
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'field-1', value: 'new@email.com' }, // Changing field without printable flag
          { customFieldId: 'field-2', value: '789-012' }, // Changing field with undefined printable
        ],
      };

      // Mock listDocuments to handle different collection calls properly
      mockDatabases.listDocuments.mockImplementation((dbId: string, collectionId: string, queries?: any[]) => {
        // Check if this is a barcode uniqueness check (has Query.equal for barcodeNumber)
        if (queries && queries.some((q: any) => q.toString().includes('barcodeNumber'))) {
          return Promise.resolve({ documents: [], total: 0 });
        }
        // Check if this is a custom fields collection call
        if (collectionId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID) {
          return Promise.resolve({ documents: mockCustomFields, total: mockCustomFields.length });
        }
        // Default fallback
        return Promise.resolve({ documents: [], total: 0 });
      });

      mockDatabases.getDocument.mockResolvedValue(existingAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      // Verify transaction operations were created
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const operationsCall = mockTablesDB.createOperations.mock.calls[0];
      const operations = operationsCall[0].operations;

      // Should have 2 operations: attendee update + audit log
      expect(operations).toHaveLength(2);

      // Check attendee update operation
      const updateOp = operations.find((op: any) => op.action === 'update');
      expect(updateOp).toBeDefined();
      expect(updateOp.rowId).toBe('attendee-123');
      expect(updateOp.data).toEqual(expect.objectContaining({
        customFieldValues: JSON.stringify({ 'field-1': 'new@email.com', 'field-2': '789-012' }),
      }));

      // Verify lastSignificantUpdate was NOT included (fields treated as non-printable)
      expect(updateOp.data.lastSignificantUpdate).toBeUndefined();

      // Check audit log operation
      const logOp = operations.find((op: any) => op.action === 'create');
      expect(logOp).toBeDefined();
      expect(logOp.tableId).toBe(process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID);
    });

    it('should handle custom fields fetch failure gracefully by treating all changes as significant', async () => {
      const existingAttendee = {
        ...mockAttendee,
        customFieldValues: JSON.stringify({ 'field-1': 'old@email.com' }),
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'field-1', value: 'new@email.com' },
        ],
      };

      // Mock listDocuments to simulate custom fields fetch failure
      let customFieldsFetchCount = 0;
      mockDatabases.listDocuments.mockImplementation((dbId: string, collectionId: string, queries?: any[]) => {
        // Check if this is a barcode uniqueness check (has Query.equal for barcodeNumber)
        if (queries && queries.some((q: any) => q.toString().includes('barcodeNumber'))) {
          return Promise.resolve({ documents: [], total: 0 });
        }
        // Check if this is a custom fields collection call
        if (collectionId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID) {
          customFieldsFetchCount++;
          // First custom fields call (for printable mapping) should fail
          if (customFieldsFetchCount === 1) {
            return Promise.reject(new Error('Failed to fetch custom fields'));
          }
          // Subsequent calls (validation, logging) should succeed
          return Promise.resolve({
            documents: [{ $id: 'field-1', fieldName: 'Test Field', fieldType: 'text' }],
            total: 1
          });
        }
        // Default fallback
        return Promise.resolve({ documents: [], total: 0 });
      });

      mockDatabases.getDocument.mockResolvedValue(existingAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      // Verify transaction operations were created
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const operationsCall = mockTablesDB.createOperations.mock.calls[0];
      const operations = operationsCall[0].operations;

      // Should have 2 operations: attendee update + audit log
      expect(operations).toHaveLength(2);

      // Check attendee update operation
      const updateOp = operations.find((op: any) => op.action === 'update');
      expect(updateOp).toBeDefined();
      expect(updateOp.rowId).toBe('attendee-123');
      expect(updateOp.data).toEqual(expect.objectContaining({
        customFieldValues: JSON.stringify({ 'field-1': 'new@email.com' }),
        lastSignificantUpdate: expect.any(String),
      }));

      // Check audit log operation
      const logOp = operations.find((op: any) => op.action === 'create');
      expect(logOp).toBeDefined();
      expect(logOp.tableId).toBe(process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID);
    });

    it('should update lastSignificantUpdate when standard fields change (firstName, lastName, etc.)', async () => {
      const existingAttendee = {
        ...mockAttendee,
        firstName: 'John',
        lastName: 'Doe',
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        firstName: 'Jane', // Changing standard field
      };

      mockDatabases.listDocuments.mockResolvedValue({ documents: [] }); // Barcode check
      mockDatabases.getDocument.mockResolvedValue(existingAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      // Verify transaction operations were created
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const operationsCall = mockTablesDB.createOperations.mock.calls[0];
      const operations = operationsCall[0].operations;

      // Should have 2 operations: attendee update + audit log
      expect(operations).toHaveLength(2);

      // Check attendee update operation
      const updateOp = operations.find((op: any) => op.action === 'update');
      expect(updateOp).toBeDefined();
      expect(updateOp.rowId).toBe('attendee-123');
      expect(updateOp.data).toEqual(expect.objectContaining({
        firstName: 'Jane',
        lastSignificantUpdate: expect.any(String),
      }));

      // Check audit log operation
      const logOp = operations.find((op: any) => op.action === 'create');
      expect(logOp).toBeDefined();
      expect(logOp.tableId).toBe(process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID);
    });

    it('should NOT update lastSignificantUpdate when only notes field changes', async () => {
      const existingAttendee = {
        ...mockAttendee,
        notes: 'old notes',
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        notes: 'new notes', // Changing notes field only
      };

      mockDatabases.listDocuments.mockResolvedValue({ documents: [] }); // Barcode check
      mockDatabases.getDocument.mockResolvedValue(existingAttendee);

      await handler(mockReq as AuthenticatedRequest, mockRes as NextApiResponse);

      // Verify transaction operations were created
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const operationsCall = mockTablesDB.createOperations.mock.calls[0];
      const operations = operationsCall[0].operations;

      // Should have 2 operations: attendee update + audit log
      expect(operations).toHaveLength(2);

      // Check attendee update operation
      const updateOp = operations.find((op: any) => op.action === 'update');
      expect(updateOp).toBeDefined();
      expect(updateOp.rowId).toBe('attendee-123');
      expect(updateOp.data).toEqual(expect.objectContaining({
        notes: 'new notes',
      }));

      // Verify lastSignificantUpdate was NOT included in the update
      expect(updateOp.data.lastSignificantUpdate).toBeUndefined();

      // Check audit log operation
      const logOp = operations.find((op: any) => op.action === 'create');
      expect(logOp).toBeDefined();
      expect(logOp.tableId).toBe(process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID);
    });
  });
});
