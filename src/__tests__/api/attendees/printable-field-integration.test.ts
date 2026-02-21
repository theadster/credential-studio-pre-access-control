import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import attendeeHandler from '@/pages/api/attendees/[id]';
import { mockAccount, mockAdminTablesDB, mockTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

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

describe('Printable Field Integration Tests', () => {
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

  describe('Requirement 1.1 & 4.1: End-to-end flow with printable custom field', () => {
    it('should mark credential as outdated when printable custom field is updated', async () => {
      // Setup: Custom field with printable=true
      const customFields = [
        {
          $id: 'company-field',
          fieldName: 'Company Name',
          fieldType: 'text',
          printable: true, // This field appears on credential
        },
      ];

      // Setup: Attendee with generated credential
      const existingAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({ 'company-field': 'Acme Corp' }),
        credentialUrl: 'https://example.com/credential.png',
        credentialGeneratedAt: '2024-01-05T00:00:00.000Z', // Credential was generated
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z', // Last update was before credential
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Action: Update the printable custom field
      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'company-field', value: 'New Company Inc' },
        ],
      };

      // Mock database calls
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: customFields, total: 1 }) // Fetch custom fields config
        .mockResolvedValueOnce({ rows: customFields, total: 1 }) // Validate custom field IDs
        .mockResolvedValueOnce({ rows: customFields, total: 1 }); // Fetch for logging

      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee) // Get existing attendee
        .mockResolvedValueOnce({ // Return updated attendee
          ...existingAttendee,
          customFieldValues: JSON.stringify({ 'company-field': 'New Company Inc' }),
          lastSignificantUpdate: '2024-01-06T00:00:00.000Z',
        });

      await attendeeHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify: Transaction was created with updated lastSignificantUpdate
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = operations.find((op: any) => op.action === 'update');

      expect(updateOp).toBeDefined();
      expect(updateOp.data.lastSignificantUpdate).toBeDefined();
      expect(updateOp.data.lastSignificantUpdate).not.toBe('2024-01-01T00:00:00.000Z');
      
      // Verify: Credential is now OUTDATED (lastSignificantUpdate > credentialGeneratedAt)
      // The new lastSignificantUpdate (2024-01-06) is after credentialGeneratedAt (2024-01-05)
      expect(new Date(updateOp.data.lastSignificantUpdate).getTime())
        .toBeGreaterThan(new Date(existingAttendee.credentialGeneratedAt).getTime());

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should keep credential current when non-printable custom field is updated', async () => {
      // Setup: Custom field with printable=false
      const customFields = [
        {
          $id: 'notes-field',
          fieldName: 'Internal Notes',
          fieldType: 'text',
          printable: false, // This field does NOT appear on credential
        },
      ];

      // Setup: Attendee with generated credential
      const existingAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        customFieldValues: JSON.stringify({ 'notes-field': 'Old notes' }),
        credentialUrl: 'https://example.com/credential.png',
        credentialGeneratedAt: '2024-01-05T00:00:00.000Z',
        lastSignificantUpdate: '2024-01-01T00:00:00.000Z', // Before credential generation
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Action: Update the non-printable custom field
      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'notes-field', value: 'New internal notes' },
        ],
      };

      // Mock database calls
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: customFields, total: 1 })
        .mockResolvedValueOnce({ rows: customFields, total: 1 })
        .mockResolvedValueOnce({ rows: customFields, total: 1 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(existingAttendee)
        .mockResolvedValueOnce({
          ...existingAttendee,
          customFieldValues: JSON.stringify({ 'notes-field': 'New internal notes' }),
          // lastSignificantUpdate should remain unchanged
        });

      await attendeeHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify: Transaction was created
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = operations.find((op: any) => op.action === 'update');

      expect(updateOp).toBeDefined();
      
      // Verify: lastSignificantUpdate was NOT updated (field omitted from update data)
      // According to implementation: "Do NOT initialize lastSignificantUpdate for non-printable changes"
      expect(updateOp.data.lastSignificantUpdate).toBeUndefined();

      // Verify: Credential remains CURRENT (lastSignificantUpdate < credentialGeneratedAt)
      // Since lastSignificantUpdate was not updated, use the original value
      const finalLastUpdate = existingAttendee.lastSignificantUpdate;
      expect(new Date(finalLastUpdate).getTime())
        .toBeLessThan(new Date(existingAttendee.credentialGeneratedAt).getTime());

      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Requirement 4.3: Filter functionality', () => {
    it('should correctly identify outdated credentials after printable field update', async () => {
      // This test verifies the logic that would be used by the filter
      // The filter checks: credentialGeneratedAt < lastSignificantUpdate

      const customFields = [
        {
          $id: 'email-field',
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
        customFieldValues: JSON.stringify({ 'email-field': 'old@email.com' }),
        credentialUrl: 'https://example.com/credential.png',
        credentialGeneratedAt: '2024-01-05T10:00:00.000Z',
        lastSignificantUpdate: '2024-01-05T09:00:00.000Z', // Before credential (CURRENT)
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockReq.body = {
        customFieldValues: [
          { customFieldId: 'email-field', value: 'new@email.com' },
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
          customFieldValues: JSON.stringify({ 'email-field': 'new@email.com' }),
          lastSignificantUpdate: '2024-01-06T00:00:00.000Z', // After credential (OUTDATED)
        });

      await attendeeHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const operations = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = operations.find((op: any) => op.action === 'update');

      // Verify the credential status logic
      const newLastUpdate = updateOp.data.lastSignificantUpdate;
      const credentialGenerated = existingAttendee.credentialGeneratedAt;

      // Before update: CURRENT (lastSignificantUpdate < credentialGeneratedAt)
      expect(new Date(existingAttendee.lastSignificantUpdate).getTime())
        .toBeLessThan(new Date(credentialGenerated).getTime());

      // After update: OUTDATED (lastSignificantUpdate > credentialGeneratedAt)
      expect(new Date(newLastUpdate).getTime())
        .toBeGreaterThan(new Date(credentialGenerated).getTime());

      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });
});
