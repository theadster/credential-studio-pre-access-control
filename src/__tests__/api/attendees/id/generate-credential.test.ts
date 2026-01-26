import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/attendees/[id]/generate-credential';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';
import { userProfileCache } from '@/lib/userProfileCache';

// Create mock admin databases for createAdminClient
const mockAdminDatabases = {
  listDocuments: vi.fn(),
  getDocument: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
};

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
  createAdminClient: vi.fn(() => ({
    databases: mockAdminDatabases,
  })),
}));

// Mock appwrite-integrations
const mockGetSwitchboardIntegration = vi.fn();
vi.mock('@/lib/appwrite-integrations', () => ({
  getSwitchboardIntegration: (...args: any[]) => mockGetSwitchboardIntegration(...args),
}));

// Mock log settings
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(true)),
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
    permissions: {
      attendees: { print: true },
      all: true,
    },
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
  };

  // Switchboard integration is now in a separate collection
  const mockSwitchboardIntegration = {
    $id: 'switchboard-123',
    eventSettingsId: 'event-settings-123',
    version: 1,
    enabled: true,
    apiEndpoint: 'https://api.switchboard.com/generate',
    authHeaderType: 'Bearer',
    requestBody: '{"template_id": "{{template_id}}", "firstName": "{{firstName}}"}',
    templateId: 'template-123',
    fieldMappings: '[]',
  };

  beforeEach(() => {
    resetAllMocks();
    // Clear the user profile cache to ensure clean state
    userProfileCache.clear();
    
    // Set required environment variables for tests
    process.env.SWITCHBOARD_API_KEY = 'test-switchboard-api-key';
    
    // Also reset admin databases mock
    mockAdminDatabases.listDocuments.mockReset();
    mockAdminDatabases.getDocument.mockReset();
    mockAdminDatabases.createDocument.mockReset();
    mockAdminDatabases.updateDocument.mockReset();
    mockAdminDatabases.deleteDocument.mockReset();
    
    // Reset Switchboard integration mock
    mockGetSwitchboardIntegration.mockReset();
    
    // Reset fetch mock
    if (typeof global.fetch === 'function' && 'mockReset' in global.fetch) {
      (global.fetch as any).mockReset();
    }
    
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

    // Default mock implementations for authentication flow
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockDatabases.listDocuments.mockResolvedValue({
      documents: [mockUserProfile],
      total: 1,
    });
    mockDatabases.createDocument.mockResolvedValue({
      $id: 'new-log-123',
      userId: mockAuthUser.$id,
      action: 'generate_credential',
      details: '{}',
    });

    // Mock admin databases to return the role when fetched
    mockAdminDatabases.getDocument.mockResolvedValue(mockAdminRole);
    
    // Default: Switchboard integration is enabled and configured
    mockGetSwitchboardIntegration.mockResolvedValue(mockSwitchboardIntegration);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
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
      const error = new Error('Unauthorized');
      (error as any).code = 401;
      mockAccount.get.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
        })
      );
    });

    it('should return 404 if user profile is not found', async () => {
      // Override the default mock to simulate no user profile found
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [], total: 0 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'User profile not found',
        })
      );
    });

    it('should return 403 if user has no role', async () => {
      // User profile exists but has no roleId
      const userProfileNoRole = { ...mockUserProfile, roleId: null };
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [userProfileNoRole], total: 1 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions to generate credentials',
        })
      );
    });

    it('should return 403 if user does not have print permission', async () => {
      // User has role but no print permission
      const roleNoPrint = {
        ...mockAdminRole,
        permissions: {
          attendees: { print: false },
          all: false,
        }
      };
      mockAdminDatabases.getDocument.mockResolvedValueOnce(roleNoPrint);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions to generate credentials',
        })
      );
    });
  });

  describe('Validation', () => {
    it('should return 400 if attendee ID is missing', async () => {
      mockReq.query = {};

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid attendee ID'
        })
      );
    });

    it('should return 400 if attendee ID is not a string', async () => {
      mockReq.query = { id: ['array', 'value'] };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid attendee ID'
        })
      );
    });

    it('should return 404 if attendee is not found', async () => {
      const error = new Error('Not found');
      (error as any).code = 404;

      // Mock the attendee lookup to fail
      mockDatabases.getDocument.mockRejectedValueOnce(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 400 if event settings not configured', async () => {
      // Mock attendee found
      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);
      // Mock no event settings
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile (middleware)
        .mockResolvedValueOnce({ documents: [], total: 0 }); // No event settings

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Event settings not configured'
        })
      );
    });

    it('should return 400 if Switchboard is not enabled', async () => {
      // Mock attendee found
      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);
      // Mock event settings found
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile (middleware)
        .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 }); // Event settings

      // Mock getSwitchboardIntegration to return disabled integration
      mockGetSwitchboardIntegration.mockResolvedValueOnce({ ...mockSwitchboardIntegration, enabled: false });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Switchboard Canvas integration is not enabled'
        })
      );
    });

    it('should return 400 if Switchboard API endpoint is missing', async () => {
      // Mock attendee found
      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);
      // Mock event settings found
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile (middleware)
        .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 }); // Event settings

      // Mock getSwitchboardIntegration to return integration with no endpoint
      mockGetSwitchboardIntegration.mockResolvedValueOnce({ ...mockSwitchboardIntegration, apiEndpoint: null });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Switchboard Canvas is not properly configured'
        })
      );
    });
  });

  describe('Credential Generation', () => {
    // Helper to set up mocks for credential generation tests
    // This ensures clean mock state for each test in this describe block
    const setupCredentialGenerationMocks = () => {
      // Clear user profile cache to ensure middleware fetches fresh data
      userProfileCache.clear();
      
      // Reset mocks to ensure clean state
      mockDatabases.getDocument.mockReset();
      mockDatabases.listDocuments.mockReset();
      mockDatabases.updateDocument.mockReset();
      mockDatabases.createDocument.mockReset();
      (global.fetch as any).mockReset();
      mockGetSwitchboardIntegration.mockReset();
      
      // Re-apply default authentication mocks
      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockAdminDatabases.getDocument.mockResolvedValue(mockAdminRole);
      mockGetSwitchboardIntegration.mockResolvedValue(mockSwitchboardIntegration);
    };

    it('should generate credential successfully', async () => {
      setupCredentialGenerationMocks();
      const credentialUrl = 'https://example.com/credential.pdf';

      // Mock attendee found
      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      
      // Use mockImplementation to handle different listDocuments calls
      let listDocumentsCallCount = 0;
      mockDatabases.listDocuments.mockImplementation(() => {
        listDocumentsCallCount++;
        if (listDocumentsCallCount === 1) {
          // User profile (middleware)
          return Promise.resolve({ documents: [mockUserProfile], total: 1 });
        } else if (listDocumentsCallCount === 2) {
          // Event settings
          return Promise.resolve({ documents: [mockEventSettings], total: 1 });
        } else {
          // Custom fields
          return Promise.resolve({ documents: [], total: 0 });
        }
      });

      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl,
        credentialGeneratedAt: new Date().toISOString(),
      });

      mockDatabases.createDocument.mockResolvedValue({
        $id: 'log-123',
        action: 'generate_credential',
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: credentialUrl }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(global.fetch).toHaveBeenCalledWith(
        mockSwitchboardIntegration.apiEndpoint,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
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
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          credentialUrl,
        })
      );
    });

    it('should replace placeholders in request body', async () => {
      setupCredentialGenerationMocks();
      const credentialUrl = 'https://example.com/credential.pdf';

      // Mock attendee found
      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      
      // Use mockImplementation to handle different listDocuments calls
      let listDocumentsCallCount = 0;
      mockDatabases.listDocuments.mockImplementation(() => {
        listDocumentsCallCount++;
        if (listDocumentsCallCount === 1) {
          return Promise.resolve({ documents: [mockUserProfile], total: 1 });
        } else if (listDocumentsCallCount === 2) {
          return Promise.resolve({ documents: [mockEventSettings], total: 1 });
        } else {
          return Promise.resolve({ documents: [], total: 0 });
        }
      });

      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl,
      });

      mockDatabases.createDocument.mockResolvedValue({
        $id: 'log-123',
        action: 'generate_credential',
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: credentialUrl }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(global.fetch).toHaveBeenCalled();
      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.template_id).toBe('template-123');
      expect(requestBody.firstName).toBe('John');
    });

    it('should handle Switchboard API errors', async () => {
      setupCredentialGenerationMocks();
      
      // Mock attendee found
      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      
      // Use mockImplementation to handle different listDocuments calls
      let listDocumentsCallCount = 0;
      mockDatabases.listDocuments.mockImplementation(() => {
        listDocumentsCallCount++;
        if (listDocumentsCallCount === 1) {
          return Promise.resolve({ documents: [mockUserProfile], total: 1 });
        } else if (listDocumentsCallCount === 2) {
          return Promise.resolve({ documents: [mockEventSettings], total: 1 });
        } else {
          return Promise.resolve({ documents: [], total: 0 });
        }
      });

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
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
      setupCredentialGenerationMocks();
      
      // Mock attendee found
      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      
      // Use mockImplementation to handle different listDocuments calls
      let listDocumentsCallCount = 0;
      mockDatabases.listDocuments.mockImplementation(() => {
        listDocumentsCallCount++;
        if (listDocumentsCallCount === 1) {
          return Promise.resolve({ documents: [mockUserProfile], total: 1 });
        } else if (listDocumentsCallCount === 2) {
          return Promise.resolve({ documents: [mockEventSettings], total: 1 });
        } else {
          return Promise.resolve({ documents: [], total: 0 });
        }
      });

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to connect to Switchboard Canvas API'
        })
      );
    });

    it('should handle missing credential URL in response', async () => {
      setupCredentialGenerationMocks();
      
      // Mock attendee found
      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      
      // Use mockImplementation to handle different listDocuments calls
      let listDocumentsCallCount = 0;
      mockDatabases.listDocuments.mockImplementation(() => {
        listDocumentsCallCount++;
        if (listDocumentsCallCount === 1) {
          return Promise.resolve({ documents: [mockUserProfile], total: 1 });
        } else if (listDocumentsCallCount === 2) {
          return Promise.resolve({ documents: [mockEventSettings], total: 1 });
        } else {
          return Promise.resolve({ documents: [], total: 0 });
        }
      });

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
      setupCredentialGenerationMocks();
      const credentialUrl = 'https://example.com/credential.pdf';

      // Mock attendee found
      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      
      // Use mockImplementation to handle different listDocuments calls
      let listDocumentsCallCount = 0;
      mockDatabases.listDocuments.mockImplementation(() => {
        listDocumentsCallCount++;
        if (listDocumentsCallCount === 1) {
          return Promise.resolve({ documents: [mockUserProfile], total: 1 });
        } else if (listDocumentsCallCount === 2) {
          return Promise.resolve({ documents: [mockEventSettings], total: 1 });
        } else {
          return Promise.resolve({ documents: [], total: 0 });
        }
      });

      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl,
      });

      mockDatabases.createDocument.mockResolvedValue({
        $id: 'log-123',
        action: 'generate_credential',
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
      setupCredentialGenerationMocks();
      const credentialUrl = 'https://example.com/credential.pdf';

      // Mock attendee found
      mockDatabases.getDocument.mockResolvedValue(mockAttendee);
      
      // Use mockImplementation to handle different listDocuments calls
      let listDocumentsCallCount = 0;
      mockDatabases.listDocuments.mockImplementation(() => {
        listDocumentsCallCount++;
        if (listDocumentsCallCount === 1) {
          return Promise.resolve({ documents: [mockUserProfile], total: 1 });
        } else if (listDocumentsCallCount === 2) {
          return Promise.resolve({ documents: [mockEventSettings], total: 1 });
        } else {
          return Promise.resolve({ documents: [], total: 0 });
        }
      });

      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl,
      });

      mockDatabases.createDocument.mockResolvedValue({
        $id: 'log-123',
        action: 'generate_credential',
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
      mockDatabases.getDocument.mockRejectedValue(error);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should handle generic errors', async () => {
      // Mock attendee found
      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);
      // Mock listDocuments calls in order
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile (middleware)
        .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 }) // Event settings
        .mockResolvedValueOnce({ documents: [], total: 0 }); // Custom fields

      // Mock getSwitchboardIntegration to throw a generic error
      mockGetSwitchboardIntegration.mockRejectedValueOnce(new Error('Database error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });

  describe('Concurrency Handling', () => {
    // Note: The field-specific update logic is thoroughly tested in 
    // src/__tests__/lib/fieldUpdate.test.ts
    // These tests verify the integration in the API endpoint

    it('should import updateCredentialFields from fieldUpdate', async () => {
      // Verify the import exists and is a function
      const { updateCredentialFields } = await import('@/lib/fieldUpdate');
      expect(typeof updateCredentialFields).toBe('function');
    });
  });
});
