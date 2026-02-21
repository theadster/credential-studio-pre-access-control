import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/attendees/[id]/clear-credential';
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


describe('/api/attendees/[id]/clear-credential - Clear Credential API', () => {
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
      attendees: { update: true, print: true },
      all: true,
    }),
  };

  const mockAttendee = {
    $id: 'attendee-123',
    firstName: 'John',
    lastName: 'Doe',
    barcodeNumber: '12345',
    photoUrl: 'https://example.com/photo.jpg',
    credentialUrl: 'https://example.com/credential.pdf',
    credentialGeneratedAt: '2024-01-05T00:00:00.000Z',
    customFieldValues: JSON.stringify({ 'field-1': 'value1' }),
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'POST',
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
    mockTablesDB.listRows.mockResolvedValue({
      rows: [mockUserProfile],
      total: 1,
    });
    mockTablesDB.getRow.mockResolvedValue(mockAdminRole);
    mockAdminTablesDB.getRow.mockResolvedValue(mockAdminRole);
    mockTablesDB.createRow.mockResolvedValue({
      $id: 'new-log-123',
      userId: mockAuthUser.$id,
      action: 'clear_credential',
      details: '{}',
    });
  });

  describe('Method Validation', () => {
    it('should return 405 if method is not POST', async () => {
      mockReq.method = 'GET';

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
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Access denied: User profile not found' });
    });

    it('should return 403 if user has no role', async () => {
      const userWithoutRole = { ...mockUserProfile, roleId: null };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [userWithoutRole],
        total: 1,
      });
      mockTablesDB.getRow.mockResolvedValueOnce(null);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Access denied: No role assigned' });
    });

    it('should return 403 if user does not have update or print permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ attendees: { update: false, print: false } }),
      };

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should allow user with update permission', async () => {
      const updatePermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ attendees: { update: true, print: false } }),
      };

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow
        .mockResolvedValueOnce(updatePermRole)
        .mockResolvedValueOnce(mockAttendee);

      mockTablesDB.updateRow.mockResolvedValue({
        ...mockAttendee,
        credentialUrl: null,
        credentialGeneratedAt: null,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should allow user with print permission', async () => {
      const printPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ attendees: { update: false, print: true } }),
      };

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow
        .mockResolvedValueOnce(printPermRole)
        .mockResolvedValueOnce(mockAttendee);

      mockTablesDB.updateRow.mockResolvedValue({
        ...mockAttendee,
        credentialUrl: null,
        credentialGeneratedAt: null,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Validation', () => {
    it('should return 400 if attendee ID is missing', async () => {
      mockReq.query = {};

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee ID' });
    });

    it('should return 400 if attendee ID is not a string', async () => {
      mockReq.query = { id: ['array', 'value'] };

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee ID' });
    });

    it('should return 404 if attendee is not found', async () => {
      const error = new Error('Not found');
      (error as any).code = 404;

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockRejectedValueOnce(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('Clear Credential Operation', () => {
    it('should clear credential successfully', async () => {
      const clearedAttendee = {
        ...mockAttendee,
        credentialUrl: null,
        credentialGeneratedAt: null,
      };

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      mockTablesDB.updateRow.mockResolvedValue(clearedAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID,
        'attendee-123',
        {
          credentialUrl: null,
          credentialGeneratedAt: null,
        }
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Credential cleared successfully',
          attendee: clearedAttendee,
        })
      );
    });

    it('should clear credential even if already null', async () => {
      const attendeeWithoutCredential = {
        ...mockAttendee,
        credentialUrl: null,
        credentialGeneratedAt: null,
      };

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(attendeeWithoutCredential);

      mockTablesDB.updateRow.mockResolvedValue(attendeeWithoutCredential);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should create log entry for credential clearing', async () => {
      const clearedAttendee = {
        ...mockAttendee,
        credentialUrl: null,
        credentialGeneratedAt: null,
      };

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      mockTablesDB.updateRow.mockResolvedValue(clearedAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          attendeeId: 'attendee-123',
          action: 'clear_credential',
          details: expect.stringContaining('attendee'),
        })
      );
    });

    it('should include previous credential URL in log details', async () => {
      const clearedAttendee = {
        ...mockAttendee,
        credentialUrl: null,
        credentialGeneratedAt: null,
      };

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      mockTablesDB.updateRow.mockResolvedValue(clearedAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const logCall = mockTablesDB.createRow.mock.calls.find(
        call => call[2] !== 'new-log-123'
      );

      expect(logCall).toBeDefined();
      const logDetails = JSON.parse(logCall![3].details);
      expect(logDetails.previousCredentialUrl).toBe(mockAttendee.credentialUrl);
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
      mockTablesDB.listRows.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should handle generic errors', async () => {
      mockTablesDB.listRows.mockRejectedValue(new Error('Database error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to clear credential' });
    });

    it('should handle update document errors', async () => {
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      mockTablesDB.updateRow.mockRejectedValue(new Error('Update failed'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});
