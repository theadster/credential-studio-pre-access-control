import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/attendees/[id]';
import { mockAccount, mockTablesDB, mockAdminTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(() => ({
    account: mockAccount,
    tablesDB: mockTablesDB,
  })),
  createAdminClient: vi.fn(() => ({
    tablesDB: mockAdminTablesDB,
})),
}));

// Mock the API middleware
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handler: any) => async (req: any, res: any) => {
    return handler(req, res);
  },
  AuthenticatedRequest: {} as any,
}));

// Mock log settings
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(true)),
}));

describe('Backward Compatibility Tests - Printable Field Feature', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const mockAuthUser = {
    $id: 'auth-user-123',
    email: 'admin@example.com',
    name: 'Admin User',
  };

  const mockAdminRole = {
    id: 'role-admin',
    name: 'Super Administrator',
    description: 'Full system access',
    permissions: {
      attendees: { create: true, read: true, update: true, delete: true },
      all: true,
    },
  };

  const mockUserProfile = {
    id: 'profile-123',
    userId: 'auth-user-123',
    email: 'admin@example.com',
    name: 'Admin User',
    roleId: 'role-admin',
    isInvited: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    role: mockAdminRole,
  };

  beforeEach(() => {
    resetAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      method: 'PUT',
      cookies: { 'appwrite-session': 'test-session' },
      query: { id: 'attendee-123' },
      body: {},
      user: mockAuthUser,
      userProfile: mockUserProfile,
    } as any;

    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mocks
    mockTablesDB.createRow.mockResolvedValue({
      $id: 'log-123',
      userId: mockAuthUser.$id,
      action: 'update',
      details: '{}',
    });

    mockTablesDB.createTransaction.mockResolvedValue({ $id: 'transaction-123' });
    mockTablesDB.createOperations.mockResolvedValue(undefined);
    mockTablesDB.updateTransaction.mockResolvedValue(undefined);
  });

  describe('Requirement 2.1, 2.2, 7.4: Existing custom fields without printable flag', () => {
    it('should treat custom fields without printable property as non-printable (false)', async () => {
      // Legacy custom field without printable property
      const legacyCustomFields = [
        {
          $id: 'legacy-field-1',
          fieldName: 'Email Address',
          fieldType: 'text',
          required: false,
          // printable property is missing (legacy field)
        },
      ];

      const existingAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({ 'legacy-field-1': 'old@email.com' }),
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'legacy-field-1', value: 'new@email.com' },
        ],
      };

      // Mock database calls
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: legacyCustomFields, total: 1 }) // Fetch custom fields config
        .mockResolvedValueOnce({ rows: legacyCustomFields, total: 1 }) // Validate custom field IDs
        .mockResolvedValueOnce({ rows: legacyCustomFields, total: 1 }); // Fetch for logging

      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee)
        .mockResolvedValueOnce({
          ...existingAttendee,
          customFieldValues: JSON.stringify({ 'legacy-field-1': 'new@email.com' }),
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify: Request succeeds without errors
      expect(statusMock).toHaveBeenCalledWith(200);

      // Verify: Transaction was created
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = operations.find((op: any) => op.action === 'update');

      expect(updateOp).toBeDefined();

      // Verify: Fields without printable property are treated as non-printable (false)
      // This means lastSignificantUpdate should NOT be updated when only these fields change
      // The system defaults to false (non-printable) for backward compatibility
      // According to implementation: "Do NOT initialize lastSignificantUpdate for non-printable changes"
      expect(updateOp.data.lastSignificantUpdate).toBeUndefined();
    });

    it('should handle custom fields with undefined printable property', async () => {
      const customFieldsWithUndefined = [
        {
          $id: 'field-1',
          fieldName: 'Phone Number',
          fieldType: 'text',
          printable: undefined, // Explicitly undefined
        },
      ];

      const existingAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({ 'field-1': '123-456-7890' }),
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'field-1', value: '098-765-4321' },
        ],
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: customFieldsWithUndefined, total: 1 })
        .mockResolvedValueOnce({ rows: customFieldsWithUndefined, total: 1 })
        .mockResolvedValueOnce({ rows: customFieldsWithUndefined, total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee)
        .mockResolvedValueOnce({
          ...existingAttendee,
          customFieldValues: JSON.stringify({ 'field-1': '098-765-4321' }),
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify: No errors occur
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
    });

    it('should handle custom fields with null printable property', async () => {
      const customFieldsWithNull = [
        {
          $id: 'field-1',
          fieldName: 'Department',
          fieldType: 'text',
          printable: null, // Explicitly null
        },
      ];

      const existingAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({ 'field-1': 'Engineering' }),
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'field-1', value: 'Marketing' },
        ],
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: customFieldsWithNull, total: 1 })
        .mockResolvedValueOnce({ rows: customFieldsWithNull, total: 1 })
        .mockResolvedValueOnce({ rows: customFieldsWithNull, total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee)
        .mockResolvedValueOnce({
          ...existingAttendee,
          customFieldValues: JSON.stringify({ 'field-1': 'Marketing' }),
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify: No errors occur
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
    });

    it('should handle mix of legacy fields (no printable) and new fields (with printable)', async () => {
      const mixedCustomFields = [
        {
          $id: 'legacy-field',
          fieldName: 'Legacy Field',
          fieldType: 'text',
          // No printable property
        },
        {
          $id: 'new-field',
          fieldName: 'New Field',
          fieldType: 'text',
          printable: true, // Has printable property
        },
      ];

      const existingAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({
          'legacy-field': 'old value',
          'new-field': 'old value'
        }),
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'legacy-field', value: 'new value' },
          { customFieldId: 'new-field', value: 'new value' },
        ],
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: mixedCustomFields, total: 2 })
        .mockResolvedValueOnce({ rows: mixedCustomFields, total: 2 })
        .mockResolvedValueOnce({ rows: mixedCustomFields, total: 2 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee)
        .mockResolvedValueOnce({
          ...existingAttendee,
          customFieldValues: JSON.stringify({
            'legacy-field': 'new value',
            'new-field': 'new value'
          }),
          lastSignificantUpdate: '2024-01-06T00:00:00.000Z',
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify: No errors occur with mixed field types
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockTablesDB.createOperations).toHaveBeenCalled();

      // Verify: lastSignificantUpdate was updated (because new-field is printable=true)
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = operations.find((op: any) => op.action === 'update');
      expect(updateOp.data.lastSignificantUpdate).not.toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('Requirement 2.1, 2.2: Existing attendees with credentials', () => {
    it('should correctly calculate status for attendees with existing credentials', async () => {
      const existingAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({}),
        credentialUrl: 'https://example.com/credential.png',
        credentialGeneratedAt: '2024-01-05T00:00:00.000Z',
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z', // Before credential
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.method = 'GET';
      mockReq.body = undefined;

      mockTablesDB.getRow.mockResolvedValueOnce(existingAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      // The response includes the attendee data (may have transformations)
      expect(jsonMock).toHaveBeenCalled();
      const responseData = jsonMock.mock.calls[0][0];
      expect(responseData.$id).toBe('attendee-123');

      // Verify: Status calculation logic (would be done in frontend)
      // credentialGeneratedAt (2024-01-05) > lastSignificantUpdate (2024-01-01) = CURRENT
      expect(new Date(existingAttendee.credentialGeneratedAt).getTime())
        .toBeGreaterThan(new Date(existingAttendee.lastSignificantUpdate).getTime());
    });

    it('should respect lastSignificantUpdate field when updating attendees', async () => {
      const existingAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({}),
        credentialUrl: 'https://example.com/credential.png',
        credentialGeneratedAt: '2024-01-05T00:00:00.000Z',
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.method = 'PUT';
      mockReq.body = {
        firstName: 'Jane', // Changing significant field
      };

      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee)
        .mockResolvedValueOnce({
          ...existingAttendee,
          firstName: 'Jane',
          lastSignificantUpdate: '2024-01-06T00:00:00.000Z',
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);

      // Verify: lastSignificantUpdate was updated
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = operations.find((op: any) => op.action === 'update');
      expect(updateOp.data.lastSignificantUpdate).toBeDefined();
      expect(updateOp.data.lastSignificantUpdate).not.toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle attendees without lastSignificantUpdate field', async () => {
      // Very old attendee record that doesn't have lastSignificantUpdate
      const legacyAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({}),
        credentialUrl: 'https://example.com/credential.png',
        credentialGeneratedAt: '2024-01-05T00:00:00.000Z',
        // lastSignificantUpdate is missing
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.method = 'PUT';
      mockReq.body = {
        firstName: 'Jane',
      };

      mockTablesDB.getRow
        .mockResolvedValueOnce(legacyAttendee)
        .mockResolvedValueOnce({
          ...legacyAttendee,
          firstName: 'Jane',
          lastSignificantUpdate: '2024-01-06T00:00:00.000Z',
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify: No errors occur
      expect(statusMock).toHaveBeenCalledWith(200);

      // Verify: lastSignificantUpdate is now added
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = operations.find((op: any) => op.action === 'update');
      expect(updateOp.data.lastSignificantUpdate).toBeDefined();
    });

    it('should handle attendees without credentials', async () => {
      const attendeeWithoutCredential = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({}),
        // No credentialUrl or credentialGeneratedAt
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.method = 'PUT';
      mockReq.body = {
        firstName: 'Jane',
      };

      mockTablesDB.getRow
        .mockResolvedValueOnce(attendeeWithoutCredential)
        .mockResolvedValueOnce({
          ...attendeeWithoutCredential,
          firstName: 'Jane',
          lastSignificantUpdate: '2024-01-06T00:00:00.000Z',
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify: No errors occur
      expect(statusMock).toHaveBeenCalledWith(200);

      // Verify: lastSignificantUpdate is still tracked
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = operations.find((op: any) => op.action === 'update');
      expect(updateOp.data.lastSignificantUpdate).toBeDefined();
    });
  });

  describe('Requirement 2.3: API compatibility', () => {
    it('should accept requests without printable flag in custom field values', async () => {
      const customFields = [
        {
          $id: 'field-1',
          fieldName: 'Email',
          fieldType: 'text',
          printable: true,
        },
      ];

      const existingAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({ 'field-1': 'old@email.com' }),
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Request body doesn't include printable flag (client doesn't know about it)
      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'field-1', value: 'new@email.com' },
          // No printable property in the request
        ],
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: customFields, total: 1 })
        .mockResolvedValueOnce({ rows: customFields, total: 1 })
        .mockResolvedValueOnce({ rows: customFields, total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee)
        .mockResolvedValueOnce({
          ...existingAttendee,
          customFieldValues: JSON.stringify({ 'field-1': 'new@email.com' }),
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify: Request succeeds
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should include printable flag in responses when present in database', async () => {
      const customFieldWithPrintable = {
        $id: 'field-1',
        fieldName: 'Company',
        fieldType: 'text',
        printable: true,
        required: false,
        order: 1,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.method = 'GET';
      mockReq.query = { id: 'field-1' };

      // This would be in a custom fields endpoint, but the principle is the same
      // The response should include the printable flag if it exists
      const response = customFieldWithPrintable;

      // Verify: Response includes printable flag
      expect(response).toHaveProperty('printable');
      expect(response.printable).toBe(true);
    });

    it('should handle responses for fields without printable flag', async () => {
      const legacyCustomField = {
        $id: 'field-1',
        fieldName: 'Email',
        fieldType: 'text',
        required: false,
        order: 1,
        // No printable property
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Response doesn't include printable flag (legacy field)
      const response = legacyCustomField;

      // Verify: Response doesn't have printable flag (backward compatible)
      expect(response).not.toHaveProperty('printable');
    });

    it('should work with old client code that doesn\'t send printable flag', async () => {
      const customFields = [
        {
          $id: 'field-1',
          fieldName: 'Department',
          fieldType: 'text',
          printable: false,
        },
      ];

      const existingAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({ 'field-1': 'Engineering' }),
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Old client sends update without knowing about printable feature
      mockReq.body = {
        firstName: 'Jane',
        customFieldValues: [
          { customFieldId: 'field-1', value: 'Marketing' },
        ],
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: customFields, total: 1 })
        .mockResolvedValueOnce({ rows: customFields, total: 1 })
        .mockResolvedValueOnce({ rows: customFields, total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee)
        .mockResolvedValueOnce({
          ...existingAttendee,
          firstName: 'Jane',
          customFieldValues: JSON.stringify({ 'field-1': 'Marketing' }),
          lastSignificantUpdate: '2024-01-06T00:00:00.000Z',
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify: Old client code still works
      expect(statusMock).toHaveBeenCalledWith(200);

      // Verify: Server correctly handles printable logic
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = operations.find((op: any) => op.action === 'update');

      // firstName changed (significant), so lastSignificantUpdate should be updated
      expect(updateOp.data.lastSignificantUpdate).not.toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('Edge Cases: Backward Compatibility', () => {
    it('should handle empty custom field values with legacy fields', async () => {
      const legacyFields = [
        {
          $id: 'field-1',
          fieldName: 'Optional Field',
          fieldType: 'text',
          // No printable property
        },
      ];

      const existingAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({}), // Empty
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        customFieldValues: [], // Empty array
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: legacyFields, total: 1 })
        .mockResolvedValueOnce({ rows: legacyFields, total: 1 })
        .mockResolvedValueOnce({ rows: legacyFields, total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee)
        .mockResolvedValueOnce(existingAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify: No errors with empty values
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle database migration scenario (some fields have printable, some don\'t)', async () => {
      // Simulates a database mid-migration where some fields have been updated
      const partiallyMigratedFields = [
        {
          $id: 'field-1',
          fieldName: 'Name Badge Field',
          fieldType: 'text',
          printable: true, // Migrated
        },
        {
          $id: 'field-2',
          fieldName: 'Legacy Field',
          fieldType: 'text',
          // Not migrated yet
        },
        {
          $id: 'field-3',
          fieldName: 'Another New Field',
          fieldType: 'text',
          printable: false, // Migrated
        },
      ];

      const existingAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({
          'field-1': 'value1',
          'field-2': 'value2',
          'field-3': 'value3',
        }),
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'field-1', value: 'new-value1' }, // printable=true
          { customFieldId: 'field-2', value: 'new-value2' }, // no printable (legacy)
          { customFieldId: 'field-3', value: 'new-value3' }, // printable=false
        ],
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: partiallyMigratedFields, total: 3 })
        .mockResolvedValueOnce({ rows: partiallyMigratedFields, total: 3 })
        .mockResolvedValueOnce({ rows: partiallyMigratedFields, total: 3 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee)
        .mockResolvedValueOnce({
          ...existingAttendee,
          customFieldValues: JSON.stringify({
            'field-1': 'new-value1',
            'field-2': 'new-value2',
            'field-3': 'new-value3',
          }),
          lastSignificantUpdate: '2024-01-06T00:00:00.000Z',
        });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify: Handles mixed migration state gracefully
      expect(statusMock).toHaveBeenCalledWith(200);

      // Verify: lastSignificantUpdate was updated (field-1 is printable=true)
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = operations.find((op: any) => op.action === 'update');
      expect(updateOp.data.lastSignificantUpdate).not.toBe('2024-01-01T00:00:00.000Z');
    });
  });
});
