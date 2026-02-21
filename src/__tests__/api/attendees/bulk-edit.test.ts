import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/attendees/bulk-edit';
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
    mockTablesDB.listRows.mockResolvedValue({
      rows: [mockUserProfile],
      total: 1,
    });
    mockTablesDB.getRow.mockResolvedValue(mockAdminRole);
    mockAdminTablesDB.getRow.mockResolvedValue(mockAdminRole);
    mockTablesDB.createRow.mockResolvedValue({
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
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
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

    it('should return 403 if user has no role', async () => {
      const userWithoutRole = { ...mockUserProfile, roleId: null };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [userWithoutRole],
        total: 1,
      });
      mockTablesDB.getRow.mockResolvedValueOnce(null);

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

      mockTablesDB.listRows.mockReset();
      mockTablesDB.getRow.mockReset();

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [userWithRole], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(noPermRole);

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

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendeeIds' });
    });

    it('should return 400 if attendeeIds is not an array', async () => {
      mockReq.body = { attendeeIds: 'not-an-array', changes: {} };

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendeeIds' });
    });

    it('should return 400 if attendeeIds is empty array', async () => {
      mockReq.body = { attendeeIds: [], changes: {} };

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendeeIds' });
    });

    it('should return 400 if changes is missing', async () => {
      mockReq.body = { attendeeIds: ['attendee-1'] };

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid changes object' });
    });

    it('should return 400 if changes is not an object', async () => {
      mockReq.body = { attendeeIds: ['attendee-1'], changes: 'not-an-object' };

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

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

      mockTablesDB.listRows.mockReset();
      mockTablesDB.getRow.mockReset();
      mockTablesDB.updateRow.mockReset();
      mockTablesDB.createRow.mockReset();

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ rows: mockCustomFields, total: 2 }); // Custom fields

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendees[0]) // Get attendee 1
        .mockResolvedValueOnce(mockAttendees[1]); // Get attendee 2

      mockTablesDB.updateRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledTimes(2);
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

      mockTablesDB.listRows.mockReset();
      mockTablesDB.getRow.mockReset();
      mockTablesDB.updateRow.mockReset();
      mockTablesDB.createRow.mockReset();

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ rows: mockCustomFields, total: 2 }); // Custom fields

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendee); // Get attendee 1

      mockTablesDB.updateRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID,
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

      mockTablesDB.listRows.mockReset();
      mockTablesDB.getRow.mockReset();
      mockTablesDB.updateRow.mockReset();
      mockTablesDB.createRow.mockReset();

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ rows: mockCustomFields, total: 2 }); // Custom fields

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendee); // Get attendee 1

      mockTablesDB.updateRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID,
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

      mockTablesDB.listRows.mockReset();
      mockTablesDB.getRow.mockReset();
      mockTablesDB.updateRow.mockReset();
      mockTablesDB.createRow.mockReset();

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ rows: mockCustomFields, total: 2 }); // Custom fields

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendee); // Get attendee 1

      mockTablesDB.updateRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

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

      mockTablesDB.listRows.mockReset();
      mockTablesDB.getRow.mockReset();
      mockTablesDB.updateRow.mockReset();
      mockTablesDB.createRow.mockReset();

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ rows: mockCustomFields, total: 2 }); // Custom fields

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendee); // Get attendee 1

      mockTablesDB.updateRow.mockResolvedValue({ success: true });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

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

      mockTablesDB.listRows.mockReset();
      mockTablesDB.getRow.mockReset();
      mockTablesDB.updateRow.mockReset();
      mockTablesDB.createRow.mockReset();

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ rows: mockCustomFields, total: 2 }); // Custom fields

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendee); // Get attendee 1

      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).not.toHaveBeenCalled();
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

      mockTablesDB.listRows.mockReset();
      mockTablesDB.getRow.mockReset();
      mockTablesDB.updateRow.mockReset();
      mockTablesDB.createRow.mockReset();

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ rows: mockCustomFields, total: 2 }); // Custom fields

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole) // Get role
        .mockResolvedValueOnce(mockAttendees[0]) // Get attendee 1
        .mockResolvedValueOnce(mockAttendees[1]); // Get attendee 2

      mockTablesDB.updateRow
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Update failed'));

      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });

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

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: mockCustomFields, total: 2 });

      mockTablesDB.getRow
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      mockTablesDB.updateRow.mockResolvedValue({ success: true });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
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
      mockTablesDB.listRows.mockReset();

      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockTablesDB.listRows.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should handle generic errors', async () => {
      mockAccount.get.mockReset();
      mockTablesDB.listRows.mockReset();

      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockTablesDB.listRows.mockRejectedValue(new Error('Database error'));

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
