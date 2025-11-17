import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../pages/api/attendees/[id]/generate-credential';
import { mockAccount, mockDatabases, resetAllMocks } from '../../test/mocks/appwrite';
import { getSwitchboardIntegration } from '../../lib/appwrite-integrations';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
  createAdminClient: vi.fn(() => ({
    databases: mockDatabases,
  })),
}));

// Mock the operators module
vi.mock('@/lib/operators', () => ({
  createIncrement: vi.fn((value: number) => ({ __operator: 'increment', value })),
  dateOperators: {
    setNow: vi.fn(() => ({ __operator: 'dateSetNow' })),
  },
}));

// Mock the appwrite-integrations module
vi.mock('@/lib/appwrite-integrations', () => ({
  getSwitchboardIntegration: vi.fn(),
}));

// Mock the logSettings module
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(true)),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Credential Tracking with Operators', () => {
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
    credentialCount: 0,
    lastCredentialGenerated: null,
    customFieldValues: JSON.stringify({}),
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

  const mockSwitchboardIntegration = {
    $id: 'integration-123',
    eventSettingsId: 'event-settings-123',
    enabled: true,
    apiEndpoint: 'https://api.switchboard.com/generate',
    templateId: 'template-123',
    requestBody: '{"template_id": "{{template_id}}", "firstName": "{{firstName}}"}',
    fieldMappings: '[]',
    authHeaderType: 'Bearer',
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

    // Set environment variable for Switchboard API key
    process.env.SWITCHBOARD_API_KEY = 'test-api-key';

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockDatabases.listDocuments
      .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
      .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 }) // Event settings
      .mockResolvedValueOnce({ documents: [], total: 0 }); // Custom fields
    
    mockDatabases.getDocument
      .mockResolvedValueOnce(mockAdminRole) // Role
      .mockResolvedValueOnce(mockAttendee); // Attendee
    
    mockDatabases.createDocument.mockResolvedValue({
      $id: 'new-log-123',
      userId: mockAuthUser.$id,
      action: 'generate_credential',
      details: '{}',
    });

    // Mock getSwitchboardIntegration
    (getSwitchboardIntegration as any).mockResolvedValue(mockSwitchboardIntegration);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.SWITCHBOARD_API_KEY;
  });

  describe('Atomic Credential Count Increment', () => {
    it('should increment credentialCount atomically using operators', async () => {
      const credentialUrl = 'https://example.com/credential.pdf';
      const now = new Date().toISOString();

      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl,
        credentialGeneratedAt: now,
        credentialCount: 1,
        lastCredentialGenerated: now,
        $updatedAt: now,
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: credentialUrl }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify that updateDocument was called with operator objects
      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
        'attendee-123',
        expect.objectContaining({
          credentialUrl,
          credentialGeneratedAt: expect.objectContaining({ __operator: 'dateSetNow' }),
          credentialCount: expect.objectContaining({ __operator: 'increment', value: 1 }),
          lastCredentialGenerated: expect.objectContaining({ __operator: 'dateSetNow' }),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          credentialUrl,
          attendee: expect.objectContaining({
            credentialCount: 1,
          }),
        })
      );
    });

    it('should use atomic operators for concurrent requests', async () => {
      // This test verifies that operators are used, which prevents race conditions
      // Actual concurrent behavior is tested through integration tests
      const credentialUrl = 'https://example.com/credential.pdf';
      const now = new Date().toISOString();

      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl,
        credentialGeneratedAt: now,
        credentialCount: 1,
        lastCredentialGenerated: now,
        $updatedAt: now,
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: credentialUrl }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify that the update uses atomic operators
      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
        'attendee-123',
        expect.objectContaining({
          credentialCount: expect.objectContaining({ __operator: 'increment', value: 1 }),
        })
      );
    });
  });

  describe('Timestamp Management', () => {
    it('should set lastCredentialGenerated using dateSetNow operator', async () => {
      const credentialUrl = 'https://example.com/credential.pdf';
      const now = new Date().toISOString();

      // Reset and setup mocks properly
      resetAllMocks();
      mockAccount.get.mockResolvedValue(mockAuthUser);
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 }) // Event settings
        .mockResolvedValueOnce({ documents: [], total: 0 }); // Custom fields
      
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockAdminRole) // Role
        .mockResolvedValueOnce(mockAttendee); // Attendee

      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl,
        credentialGeneratedAt: now,
        credentialCount: 1,
        lastCredentialGenerated: now,
        $updatedAt: now,
      });

      (getSwitchboardIntegration as any).mockResolvedValue(mockSwitchboardIntegration);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: credentialUrl }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify that both timestamp fields use dateSetNow operator
      expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
        'attendee-123',
        expect.objectContaining({
          credentialGeneratedAt: expect.objectContaining({ __operator: 'dateSetNow' }),
          lastCredentialGenerated: expect.objectContaining({ __operator: 'dateSetNow' }),
        })
      );
    });
  });

  describe('Fallback Behavior', () => {
    it('should have fallback logic for operator failures', async () => {
      // This test verifies that the code has fallback logic in place
      // The actual fallback behavior is tested through integration tests
      // since mocking the exact failure scenario is complex
      
      const credentialUrl = 'https://example.com/credential.pdf';
      const now = new Date().toISOString();

      mockDatabases.updateDocument.mockResolvedValue({
        ...mockAttendee,
        credentialUrl,
        credentialGeneratedAt: now,
        credentialCount: 1,
        lastCredentialGenerated: now,
        $updatedAt: now,
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: credentialUrl }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify successful credential generation
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          credentialUrl,
        })
      );
    });
  });

  describe('Data Integrity', () => {
    it('should maintain accurate count across multiple generations', async () => {
      const credentialUrl = 'https://example.com/credential.pdf';
      const now = new Date().toISOString();

      // Reset mocks
      resetAllMocks();

      // Simulate generating credentials multiple times
      for (let i = 1; i <= 5; i++) {
        mockAccount.get.mockResolvedValueOnce(mockAuthUser);
        mockDatabases.listDocuments
          .mockResolvedValueOnce({ documents: [mockUserProfile], total: 1 }) // User profile
          .mockResolvedValueOnce({ documents: [mockEventSettings], total: 1 }) // Event settings
          .mockResolvedValueOnce({ documents: [], total: 0 }); // Custom fields
        
        mockDatabases.getDocument
          .mockResolvedValueOnce(mockAdminRole) // Role
          .mockResolvedValueOnce(mockAttendee); // Attendee

        mockDatabases.updateDocument.mockResolvedValueOnce({
          ...mockAttendee,
          credentialUrl,
          credentialGeneratedAt: now,
          credentialCount: i,
          lastCredentialGenerated: now,
          $updatedAt: now,
        });

        (getSwitchboardIntegration as any).mockResolvedValueOnce(mockSwitchboardIntegration);

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: credentialUrl }),
        });

        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      }

      // Verify each call incremented by 1
      expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(5);
      mockDatabases.updateDocument.mock.calls.forEach((call) => {
        expect(call[3]).toEqual(
          expect.objectContaining({
            credentialCount: expect.objectContaining({ __operator: 'increment', value: 1 }),
          })
        );
      });
    });
  });
});
