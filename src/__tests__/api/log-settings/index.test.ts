import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/log-settings/index';
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

// Mock logSettings
vi.mock('@/lib/logSettings', () => ({
  clearLogSettingsCache: vi.fn(),
}));


describe('/api/log-settings - Log Settings API', () => {
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
      logs: { configure: true },
      all: true,
    }),
  };

  const mockViewerRole = {
    $id: 'role-viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: JSON.stringify({
      logs: { configure: false },
    }),
  };

  const mockLogSettings = {
    $id: 'settings-123',
    attendeeCreate: true,
    attendeeUpdate: true,
    attendeeDelete: true,
    attendeeView: false,
    attendeeBulkDelete: true,
    attendeeImport: true,
    attendeeExport: true,
    credentialGenerate: true,
    credentialClear: true,
    userCreate: true,
    userUpdate: true,
    userDelete: true,
    userView: false,
    userInvite: true,
    roleCreate: true,
    roleUpdate: true,
    roleDelete: true,
    roleView: false,
    eventSettingsUpdate: true,
    customFieldCreate: true,
    customFieldUpdate: true,
    customFieldDelete: true,
    customFieldReorder: true,
    authLogin: true,
    authLogout: true,
    logsDelete: true,
    logsExport: true,
    logsView: false,
    systemViewEventSettings: false,
    systemViewAttendeeList: false,
    systemViewRolesList: false,
    systemViewUsersList: false,
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
  });

  describe('Authentication and Authorization', () => {
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

    it('should return 404 if user profile is not found', async () => {
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

    it('should return 403 if user does not have configure permission', async () => {
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockViewerRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });
  });

  describe('GET /api/log-settings', () => {
    it('should return existing log settings', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ rows: [mockLogSettings], total: 1 }); // Log settings

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockLogSettings);
    });

    it('should create default log settings if none exist', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 }); // No settings exist

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockTablesDB.createRow.mockResolvedValueOnce(mockLogSettings);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          attendeeCreate: true,
          attendeeUpdate: true,
          attendeeDelete: true,
          attendeeView: false,
          authLogin: true,
          authLogout: true,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockLogSettings);
    });
  });

  describe('PUT /api/log-settings', () => {
    beforeEach(() => {
      mockReq.method = 'PUT';
      mockReq.body = {
        attendeeCreate: false,
        attendeeUpdate: false,
        authLogin: false,
      };
    });

    it('should update existing log settings', async () => {
      const updatedSettings = {
        ...mockLogSettings,
        attendeeCreate: false,
        attendeeUpdate: false,
        authLogin: false,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockLogSettings], total: 1 }); // Existing settings

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockTablesDB.updateRow.mockResolvedValueOnce(updatedSettings);
      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'log-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID,
        mockLogSettings.$id,
        expect.objectContaining({
          attendeeCreate: false,
          attendeeUpdate: false,
          authLogin: false,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(updatedSettings);
    });

    it('should create new settings if none exist', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 }); // No settings exist

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockTablesDB.createRow
        .mockResolvedValueOnce(mockLogSettings)
        .mockResolvedValueOnce({ $id: 'log-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          attendeeCreate: false,
          attendeeUpdate: false,
          authLogin: false,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should only update provided fields', async () => {
      mockReq.body = {
        attendeeCreate: false,
      };

      const updatedSettings = {
        ...mockLogSettings,
        attendeeCreate: false,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockLogSettings], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockTablesDB.updateRow.mockResolvedValueOnce(updatedSettings);
      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'log-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID,
        mockLogSettings.$id,
        { attendeeCreate: false }
      );
    });

    it('should clear log settings cache after update', async () => {
      const { clearLogSettingsCache } = await import('@/lib/logSettings');

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockLogSettings], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockTablesDB.updateRow.mockResolvedValueOnce(mockLogSettings);
      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'log-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(clearLogSettingsCache).toHaveBeenCalled();
    });

    it('should create log entry for settings update', async () => {
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockLogSettings], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockTablesDB.updateRow.mockResolvedValueOnce(mockLogSettings);
      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'log-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'update',
          details: expect.stringContaining('log_settings'),
        })
      );
    });

    it('should handle all log setting fields', async () => {
      mockReq.body = {
        attendeeCreate: false,
        attendeeUpdate: false,
        attendeeDelete: false,
        attendeeView: true,
        attendeeBulkDelete: false,
        attendeeImport: false,
        attendeeExport: false,
        credentialGenerate: false,
        credentialClear: false,
        userCreate: false,
        userUpdate: false,
        userDelete: false,
        userView: true,
        userInvite: false,
        roleCreate: false,
        roleUpdate: false,
        roleDelete: false,
        roleView: true,
        eventSettingsUpdate: false,
        customFieldCreate: false,
        customFieldUpdate: false,
        customFieldDelete: false,
        customFieldReorder: false,
        authLogin: false,
        authLogout: false,
        logsDelete: false,
        logsExport: false,
        logsView: true,
        systemViewEventSettings: true,
        systemViewAttendeeList: true,
        systemViewRolesList: true,
        systemViewUsersList: true,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockLogSettings], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockTablesDB.updateRow.mockResolvedValueOnce(mockLogSettings);
      mockTablesDB.createRow.mockResolvedValueOnce({ $id: 'log-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID,
        mockLogSettings.$id,
        expect.objectContaining({
          attendeeCreate: false,
          attendeeView: true,
          logsView: true,
          systemViewEventSettings: true,
        })
      );
    });

    it('should return 403 if user does not have configure permission', async () => {
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockViewerRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'DELETE';

      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 });
      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method DELETE not allowed' });
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

    it('should handle Appwrite 409 errors', async () => {
      mockReq.method = 'PUT';
      mockReq.body = { attendeeCreate: false };

      const error = new Error('Conflict');
      (error as any).code = 409;

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [mockLogSettings], total: 1 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);
      mockTablesDB.updateRow.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Conflict - resource already exists' });
    });

    it('should handle generic errors', async () => {
      mockTablesDB.listRows.mockRejectedValue(new Error('Database error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('error'),
          code: 500,
          type: 'internal_error',
        })
      );
    });
  });
});
