import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../generate-credential';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe('/api/attendees/[id]/generate-credential - Generate Credential API', () => {
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
      attendees: { print: true },
      all: true,
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

  const mockEventSettings = {
    $id: 'event-settings-123',
    eventName: 'Test Event',
    eventDate: '2024-06-01',
    eventTime: '10:00 AM',
    eventLocation: 'Convention Center',
    switchboardEnabled: true,
    switchboardApiEndpoint: 'https://api.switchboard.com/generate',
    switchboardApiKey: 'test-api-key',
    switchboardTemplateId: 'template-123',
    switchboardRequestBody: '{"template_id": "{{template_id}}", "firstName": "{{firstName}}"}',
    switchboardFieldMappings: [],
    switchboardAuthHeaderType: 'Bearer',
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
    mockDatabases.listDocuments.mockResolvedValue({
      documents: [mockUserProfile],
      total: 1,
    });
    mockDatabases.getDocument.mockResolvedValue(mockAdminRole);
    mockDatabases.createDocument.mockResolvedValue({
      $id: 'new-log-123',
      userId: mockAuthUser.$id,
      action: 'generate_credential',
      details: '{}',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
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
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
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

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [userWithoutRole],
        total: 1,
      });
      mockDatabases.getDocument.mockResolvedValueOnce(null);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No role assigned' });
    });

    it('should return 403 if user does not have print permission', async () => {
      const noPermRole = {
        ...mockAdminRole,
        permissions: JSON.stringify({ attendees: { print: false } }),
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(noPermRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });
  });

  describe('Validation', () => {
    it('should return 400 if attendee ID is missing', async () => {
      mockReq.query = {};

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee ID' });
    });

    it('should return 400 if attendee ID is not a string', async () => {
      mockReq.query = { id: ['array', 'value'] };

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument.mockResolvedValueOnce(mockAdminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee ID' });
    });

    it('should return 404 if attendee is not found', async () => {
      const error = new Error('Not found');
      (error as any).code = 404;

      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 });
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockRejectedValueOnce(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 400 if event settings not configured', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }); // No event settings

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Event settings not configured' });
    });

    it('should return 400 if Switchboard is not enabled', async () => {
      const disabledSettings = { ...mockEventSettings, switchboardEnabled: false };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [disabledSettings], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }); // Custom fields

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Switchboard Canvas integration is not enabled' });
    });

    it('should return 400 if Switchboard API endpoint is missing', async () => {
      const incompleteSettings = { ...mockEventSettings, switchboardApiEndpoint: null };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [incompleteSettings], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Switchboard Canvas is not properly configured' });
    });
  });

  describe('Credential Generation', () => {
    it('should generate credential successfully', async () => {
      const credentialUrl = 'https://example.com/credential.pdf';

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 }); // Custom fields

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl,
        credentialGeneratedAt: expect.any(String),
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: credentialUrl }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(global.fetch).toHaveBeenCalledWith(
        mockEventSettings.switchboardApiEndpoint,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockEventSettings.switchboardApiKey}`,
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
        'attendee-123',
        expect.objectContaining({
          credentialUrl,
          credentialGeneratedAt: expect.any(String),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          credentialUrl,
          generatedAt: expect.any(String),
        })
      );
    });

    it('should replace placeholders in request body', async () => {
      const credentialUrl = 'https://example.com/credential.pdf';

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl,
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: credentialUrl }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.template_id).toBe('template-123');
      expect(requestBody.firstName).toBe('John');
    });

    it('should handle Switchboard API errors', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to generate credential with Switchboard Canvas',
        })
      );
    });

    it('should handle fetch connection errors', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to connect to Switchboard Canvas API' });
    });

    it('should handle missing credential URL in response', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ someOtherField: 'value' }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'No credential URL returned from Switchboard Canvas',
        })
      );
    });

    it('should extract URL from sizes array', async () => {
      const credentialUrl = 'https://example.com/credential.pdf';

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl,
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ sizes: [{ url: credentialUrl }] }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          credentialUrl,
        })
      );
    });

    it('should create log entry for credential generation', async () => {
      const credentialUrl = 'https://example.com/credential.pdf';

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole)
        .mockResolvedValueOnce(mockAttendee);

      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl,
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: credentialUrl }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          action: 'generate_credential',
          userId: mockAuthUser.$id,
          attendeeId: 'attendee-123',
          details: expect.stringContaining('credentialUrl'),
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
      mockDatabases.listDocuments.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
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
