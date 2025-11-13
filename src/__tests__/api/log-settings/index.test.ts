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
    mockDatabases.listDocuments.mockResolvedValue({
      documents: [mockUserProfile],
      total: 1,
    });
    mockDatabases.getDocument.mockResolvedValue(mockAdminRole);
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

    it('should return 403 if user does not have configure permission', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockViewerRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });
  });

  describe('GET /api/log-settings', () => {
    it('should return existing log settings', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: [mockLogSettings], total: 1 }); // Log settings

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockLogSettings);
    });

    it('should create default log settings if none exist', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }); // No settings exist

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.createDocument.mockResolvedValueOnce(mockLogSettings);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID,
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockLogSettings], total: 1 }); // Existing settings

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce(updatedSettings);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID,
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
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }); // No settings exist

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.createDocument
        .mockResolvedValueOnce(mockLogSettings)
        .mockResolvedValueOnce({ $id: 'log-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID,
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockLogSettings], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce(updatedSettings);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID,
        mockLogSettings.$id,
        { attendeeCreate: false }
      );
    });

    it('should clear log settings cache after update', async () => {
      const { clearLogSettingsCache } = await import('@/lib/logSettings');

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockLogSettings], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce(mockLogSettings);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(clearLogSettingsCache).toHaveBeenCalled();
    });

    it('should create log entry for settings update', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockLogSettings], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce(mockLogSettings);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
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

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockLogSettings], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockResolvedValueOnce(mockLogSettings);
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'log-entry' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID,
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
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockViewerRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'DELETE';

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

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
      mockDatabases.listDocuments.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should handle Appwrite 409 errors', async () => {
      mockReq.method = 'PUT';
      mockReq.body = { attendeeCreate: false };

      const error = new Error('Conflict');
      (error as any).code = 409;

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockLogSettings], total: 1 });

      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);
      mockDatabases.updateDocument.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Conflict - resource already exists' });
    });

    it('should handle generic errors', async () => {
      mockDatabases.listDocuments.mockRejectedValue(new Error('Database error'));

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
