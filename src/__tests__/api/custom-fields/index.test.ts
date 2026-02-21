import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/custom-fields/index';
import { mockAccount, mockTablesDB, mockAdminTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

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

// Mock the string utility
vi.mock('@/util/string', () => ({
  generateInternalFieldName: vi.fn((fieldName: string) => 
    fieldName.toLowerCase().replace(/\s+/g, '_')
  ),
}));


describe('/api/custom-fields - Custom Fields Management API', () => {
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
      all: true,
    }),
  };

  const mockEventSettings = {
    $id: 'event-settings-123',
    eventName: 'Test Event',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockCustomField1 = {
    $id: 'field-1',
    eventSettingsId: 'event-settings-123',
    fieldName: 'Company Name',
    internalFieldName: 'company_name',
    fieldType: 'text',
    fieldOptions: null,
    required: true,
    order: 1,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockCustomField2 = {
    $id: 'field-2',
    eventSettingsId: 'event-settings-123',
    fieldName: 'Department',
    internalFieldName: 'department',
    fieldType: 'select',
    fieldOptions: JSON.stringify(['Engineering', 'Sales', 'Marketing']),
    required: false,
    order: 2,
    $createdAt: '2024-01-02T00:00:00.000Z',
    $updatedAt: '2024-01-02T00:00:00.000Z',
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'GET',
      cookies: { 'appwrite-session': 'test-session' },
      body: {},
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockTablesDB.listRows.mockResolvedValue({
      rows: [mockUserProfile],
      total: 1,
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
  });

  describe('GET /api/custom-fields', () => {
    it('should return list of custom fields ordered by order field', async () => {
      const mockFields = [mockCustomField1, mockCustomField2];

      // First call is for user profile lookup in middleware
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: mockFields, total: 2 });
      
      // Role lookup in middleware
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.listRows).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID,
        expect.arrayContaining([
          expect.stringContaining('orderAsc'),
          expect.stringContaining('limit'),
        ])
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockFields);
    });

    it('should generate internal field names on-the-fly for fields without them', async () => {
      const fieldWithoutInternal = {
        ...mockCustomField1,
        internalFieldName: null,
      };

      // First call is for user profile lookup in middleware
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [fieldWithoutInternal], total: 1 });
      
      // Role lookup in middleware
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should NOT call updateRow - internal field names are generated on-the-fly
      expect(mockTablesDB.updateRow).not.toHaveBeenCalled();

      expect(statusMock).toHaveBeenCalledWith(200);
      
      // Verify the response includes the generated internal field name
      expect(jsonMock).toHaveBeenCalledWith([
        expect.objectContaining({
          ...fieldWithoutInternal,
          internalFieldName: 'company_name', // Generated from 'Company Name'
        })
      ]);
    });

    it('should handle empty custom fields list', async () => {
      // First call is for user profile lookup in middleware
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });
      
      // Role lookup in middleware
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith([]);
    });

    it('should return fields with different field types', async () => {
      const textField = { ...mockCustomField1, fieldType: 'text' };
      const numberField = { ...mockCustomField2, $id: 'field-3', fieldType: 'number' };
      const dateField = { ...mockCustomField2, $id: 'field-4', fieldType: 'date' };
      const selectField = { ...mockCustomField2, $id: 'field-5', fieldType: 'select' };

      // First call is for user profile lookup in middleware
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({
          rows: [textField, numberField, dateField, selectField],
          total: 4,
        });
      
      // Role lookup in middleware
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ fieldType: 'text' }),
          expect.objectContaining({ fieldType: 'number' }),
          expect.objectContaining({ fieldType: 'date' }),
          expect.objectContaining({ fieldType: 'select' }),
        ])
      );
    });
  });

  describe('POST /api/custom-fields', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
        fieldType: 'text',
        required: true,
        order: 3,
      };
    });

    it('should create a new custom field successfully', async () => {
      const newField = {
        $id: 'new-field-123',
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
        internalFieldName: 'job_title',
        fieldType: 'text',
        fieldOptions: null,
        required: true,
        order: 3,
        showOnMainPage: true,
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      mockTablesDB.createRow
        .mockResolvedValueOnce(newField)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          eventSettingsId: 'event-settings-123',
          fieldName: 'Job Title',
          internalFieldName: 'job_title',
          fieldType: 'text',
          required: true,
          order: 3,
          showOnMainPage: true,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(newField);
    });

    it('should return 403 if user does not have create permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({
          customFields: { read: true, create: false },
        }),
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to create custom fields',
      });
    });

    it('should return 400 if eventSettingsId is missing', async () => {
      mockReq.body = {
        fieldName: 'Job Title',
        fieldType: 'text',
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if fieldName is missing', async () => {
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldType: 'text',
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if fieldType is missing', async () => {
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 404 if event settings not found', async () => {
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockRejectedValueOnce(new Error('Not found'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Event settings not found' });
    });

    it('should auto-generate order if not provided', async () => {
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
        fieldType: 'text',
      };

      const lastField = { ...mockCustomField2, order: 5 };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [lastField], total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      mockTablesDB.createRow
        .mockResolvedValueOnce({
          $id: 'new-field-123',
          order: 6,
        })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          order: 6,
        })
      );
    });

    it('should set order to 1 if no existing fields', async () => {
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
        fieldType: 'text',
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      mockTablesDB.createRow
        .mockResolvedValueOnce({
          $id: 'new-field-123',
          order: 1,
        })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          order: 1,
        })
      );
    });

    it('should handle fieldOptions as object and serialize to JSON', async () => {
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Department',
        fieldType: 'select',
        fieldOptions: ['Engineering', 'Sales', 'Marketing'],
        order: 1,
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      mockTablesDB.createRow
        .mockResolvedValueOnce({
          $id: 'new-field-123',
          fieldOptions: JSON.stringify(['Engineering', 'Sales', 'Marketing']),
        })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          fieldOptions: JSON.stringify(['Engineering', 'Sales', 'Marketing']),
        })
      );
    });

    it('should handle fieldOptions as string', async () => {
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Department',
        fieldType: 'select',
        fieldOptions: '["Engineering","Sales","Marketing"]',
        order: 1,
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      mockTablesDB.createRow
        .mockResolvedValueOnce({
          $id: 'new-field-123',
          fieldOptions: '["Engineering","Sales","Marketing"]',
        })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          fieldOptions: '["Engineering","Sales","Marketing"]',
        })
      );
    });

    it('should set fieldOptions to null if not provided', async () => {
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
        fieldType: 'text',
        order: 1,
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      mockTablesDB.createRow
        .mockResolvedValueOnce({
          $id: 'new-field-123',
          fieldOptions: null,
        })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          fieldOptions: null,
        })
      );
    });

    it('should default required to false if not provided', async () => {
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
        fieldType: 'text',
        order: 1,
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      mockTablesDB.createRow
        .mockResolvedValueOnce({
          $id: 'new-field-123',
          required: false,
        })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          required: false,
        })
      );
    });

    it('should create log entry for custom field creation', async () => {
      const newField = {
        $id: 'new-field-123',
        eventSettingsId: 'event-settings-123',
        fieldName: 'Job Title',
        internalFieldName: 'job_title',
        fieldType: 'text',
        fieldOptions: null,
        required: true,
        order: 3,
        $createdAt: '2024-01-05T00:00:00.000Z',
        $updatedAt: '2024-01-05T00:00:00.000Z',
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      mockTablesDB.createRow
        .mockResolvedValueOnce(newField)
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'create',
          details: expect.stringContaining('custom_field'),
        })
      );
    });

    it('should generate internal field name from field name', async () => {
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Company Name',
        fieldType: 'text',
        order: 1,
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      mockTablesDB.createRow
        .mockResolvedValueOnce({
          $id: 'new-field-123',
          internalFieldName: 'company_name',
        })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          internalFieldName: 'company_name',
        })
      );
    });

    it('should default showOnMainPage to true for new custom fields', async () => {
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Test Field',
        fieldType: 'text',
        order: 1,
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockEventSettings);

      mockTablesDB.createRow
        .mockResolvedValueOnce({
          $id: 'new-field-123',
          showOnMainPage: true,
        })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          showOnMainPage: true,
        })
      );
    });

    it('should return 400 if showOnMainPage is not a boolean', async () => {
      mockReq.body = {
        eventSettingsId: 'event-settings-123',
        fieldName: 'Test Field',
        fieldType: 'text',
        showOnMainPage: 'invalid', // Invalid type
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid showOnMainPage value',
        details: 'showOnMainPage must be a boolean value'
      });
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'DELETE';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method DELETE not allowed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database error');
      (dbError as any).code = 500;
      mockTablesDB.listRows.mockRejectedValueOnce(dbError);

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

    it('should handle Appwrite 404 errors', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as any).code = 404;
      mockTablesDB.listRows.mockRejectedValueOnce(notFoundError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not found',
          code: 404,
          type: 'internal_error',
        })
      );
    });

    it('should handle Appwrite 409 conflict errors', async () => {
      const conflictError = new Error('Conflict');
      (conflictError as any).code = 409;
      mockTablesDB.listRows.mockRejectedValueOnce(conflictError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Conflict',
          code: 409,
          type: 'internal_error',
        })
      );
    });
  });
});
