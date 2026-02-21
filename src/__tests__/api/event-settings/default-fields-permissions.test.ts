import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/event-settings/index';
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

// Mock cache
vi.mock('@/lib/cache', () => ({
  eventSettingsCache: {
    get: vi.fn(() => null),
    set: vi.fn(),
    invalidate: vi.fn(),
  },
}));

// Mock performance tracker
vi.mock('@/lib/performance', () => ({
  PerformanceTracker: vi.fn().mockImplementation(() => ({
    trackQuery: vi.fn((name, fn) => fn()),
    logSummary: vi.fn(),
  })),
}));

// Mock log settings
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(true)),
}));

// Mock integration utilities
vi.mock('@/lib/appwrite-integrations', () => ({
  IntegrationConflictError: class extends Error {},
  updateCloudinaryIntegration: vi.fn(),
  updateSwitchboardIntegration: vi.fn(),
  updateOneSimpleApiIntegration: vi.fn(),
  flattenEventSettings: vi.fn((settings) => settings),
}));


/**
 * DEFAULT FIELDS CREATION PERMISSION TESTS
 * 
 * This test suite verifies that the automatic creation of default custom fields
 * (Credential Type and Notes) respects existing role-based permissions.
 * 
 * Test Coverage:
 * 1. Default fields are created when event settings are initialized
 * 2. Default fields creation respects customFields.create permission
 * 3. Event settings creation succeeds even if default fields fail
 * 4. Different roles have appropriate access to create event settings
 * 
 * Requirements Tested:
 * - Requirement 6.2: Users with customFields.update permission can modify visibility
 * - Requirement 6.5: Permission checks are enforced for field management
 */
describe('/api/event-settings - Default Fields Creation Permissions', () => {
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

  const mockEventSettingsData = {
    eventName: 'Test Event',
    eventDate: '2024-12-31',
    eventLocation: 'Test Location',
    timeZone: 'America/Los_Angeles',
    barcodeType: 'alphanumerical',
    barcodeLength: 8,
    barcodeUnique: true,
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'POST',
      cookies: { 'appwrite-session': 'test-session' },
      body: mockEventSettingsData,
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

  describe('Super Administrator - Default Fields Creation', () => {
    it('should create default fields when Super Admin creates event settings', async () => {
      const mockEventSettings = {
        $id: 'event-settings-123',
        ...mockEventSettingsData,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockCredentialTypeField = {
        $id: 'field-credential-type',
        eventSettingsId: 'event-settings-123',
        fieldName: 'Credential Type',
        internalFieldName: 'credential_type',
        fieldType: 'select',
        fieldOptions: JSON.stringify({ options: [] }),
        required: false,
        order: 1,
        showOnMainPage: true,
        version: 0,
      };

      const mockNotesField = {
        $id: 'field-notes',
        eventSettingsId: 'event-settings-123',
        fieldName: 'Notes',
        internalFieldName: 'notes',
        fieldType: 'textarea',
        fieldOptions: null,
        required: false,
        order: 2,
        showOnMainPage: true,
        version: 0,
      };

      // Mock sequence: user profile, role, event settings creation, 2 default fields, log
      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 }) // User profile
        .mockResolvedValueOnce({ rows: [], total: 0 }); // No existing event settings

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      mockTablesDB.createRow
        .mockResolvedValueOnce(mockEventSettings) // Event settings
        .mockResolvedValueOnce(mockCredentialTypeField) // Credential Type field
        .mockResolvedValueOnce(mockNotesField) // Notes field
        .mockResolvedValueOnce({ $id: 'log-123' }); // Log entry

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify event settings was created
      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          eventName: 'Test Event',
        })
      );

      // Verify Credential Type field was created
      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          eventSettingsId: 'event-settings-123',
          fieldName: 'Credential Type',
          internalFieldName: 'credential_type',
          fieldType: 'select',
          fieldOptions: JSON.stringify({ options: [] }),
          required: false,
          order: 1,
          showOnMainPage: true,
          version: 0,
        })
      );

      // Verify Notes field was created
      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID,
        expect.any(String),
        expect.objectContaining({
          eventSettingsId: 'event-settings-123',
          fieldName: 'Notes',
          internalFieldName: 'notes',
          fieldType: 'textarea',
          fieldOptions: null,
          required: false,
          order: 2,
          showOnMainPage: true,
          version: 0,
        })
      );

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should set showOnMainPage to true for both default fields', async () => {
      const mockEventSettings = {
        $id: 'event-settings-123',
        ...mockEventSettingsData,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      mockTablesDB.createRow
        .mockResolvedValueOnce(mockEventSettings)
        .mockResolvedValueOnce({ $id: 'field-1', showOnMainPage: true })
        .mockResolvedValueOnce({ $id: 'field-2', showOnMainPage: true })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Both default fields should have showOnMainPage: true
      const customFieldCalls = (mockTablesDB.createRow as any).mock.calls.filter(
        (call: any) => call[1] === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID
      );

      expect(customFieldCalls).toHaveLength(2);
      expect(customFieldCalls[0][3]).toMatchObject({ showOnMainPage: true });
      expect(customFieldCalls[1][3]).toMatchObject({ showOnMainPage: true });
    });
  });

  describe('Event Manager - Default Fields Creation', () => {
    const eventManagerRole = {
      $id: 'role-event-manager',
      name: 'Event Manager',
      description: 'Full event management access',
      permissions: JSON.stringify({
        attendees: { create: true, read: true, update: true, delete: true },
        customFields: { create: true, read: true, update: true, delete: true },
        eventSettings: { create: true, read: true, update: true },
      }),
    };

    it('should create default fields when Event Manager creates event settings', async () => {
      const mockEventSettings = {
        $id: 'event-settings-123',
        ...mockEventSettingsData,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(eventManagerRole);

      mockTablesDB.createRow
        .mockResolvedValueOnce(mockEventSettings)
        .mockResolvedValueOnce({ $id: 'field-1' })
        .mockResolvedValueOnce({ $id: 'field-2' })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should create event settings and both default fields
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(4); // settings + 2 fields + log
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('Registration Staff - Limited Permissions', () => {
    const registrationStaffRole = {
      $id: 'role-registration-staff',
      name: 'Registration Staff',
      description: 'Attendee management access',
      permissions: JSON.stringify({
        attendees: { create: true, read: true, update: true },
        customFields: { read: true }, // No create permission
        eventSettings: { read: true }, // No create permission
      }),
    };

    it('should deny Registration Staff from creating event settings', async () => {
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValueOnce(registrationStaffRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to create event settings',
      });
    });
  });

  describe('Viewer - Read-Only Access', () => {
    const viewerRole = {
      $id: 'role-viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissions: JSON.stringify({
        attendees: { read: true },
        customFields: { read: true },
        eventSettings: { read: true },
      }),
    };

    it('should deny Viewer from creating event settings', async () => {
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValueOnce(viewerRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.createRow).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('Error Handling - Default Fields Creation Failures', () => {
    it('should succeed event settings creation even if default fields fail', async () => {
      const mockEventSettings = {
        $id: 'event-settings-123',
        ...mockEventSettingsData,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      // Event settings succeeds, but default fields fail
      mockTablesDB.createRow
        .mockResolvedValueOnce(mockEventSettings) // Event settings succeeds
        .mockRejectedValueOnce(new Error('Database error')) // Credential Type fails
        .mockResolvedValueOnce({ $id: 'log-123' }); // Log still succeeds

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Event settings should still be created successfully
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          $id: 'event-settings-123',
        })
      );
    });

    it('should log error but continue if first default field fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockEventSettings = {
        $id: 'event-settings-123',
        ...mockEventSettingsData,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      mockTablesDB.createRow
        .mockResolvedValueOnce(mockEventSettings)
        .mockRejectedValueOnce(new Error('Field creation failed'))
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create default custom fields:',
        expect.objectContaining({
          error: 'Field creation failed',
          eventSettingsId: 'event-settings-123',
        })
      );

      // But still return success
      expect(statusMock).toHaveBeenCalledWith(201);

      consoleErrorSpy.mockRestore();
    });

    it('should continue if second default field fails', async () => {
      const mockEventSettings = {
        $id: 'event-settings-123',
        ...mockEventSettingsData,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      mockTablesDB.createRow
        .mockResolvedValueOnce(mockEventSettings)
        .mockResolvedValueOnce({ $id: 'field-1' }) // First field succeeds
        .mockRejectedValueOnce(new Error('Second field failed')) // Second field fails
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should still return success
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('Default Fields Properties Verification', () => {
    it('should create Credential Type with empty options array', async () => {
      const mockEventSettings = {
        $id: 'event-settings-123',
        ...mockEventSettingsData,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      mockTablesDB.createRow
        .mockResolvedValueOnce(mockEventSettings)
        .mockResolvedValueOnce({ $id: 'field-1' })
        .mockResolvedValueOnce({ $id: 'field-2' })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Find the Credential Type field creation call
      const credentialTypeCall = (mockTablesDB.createRow as any).mock.calls.find(
        (call: any) => call[3]?.fieldName === 'Credential Type'
      );

      expect(credentialTypeCall).toBeDefined();
      expect(credentialTypeCall[3]).toMatchObject({
        fieldType: 'select',
        fieldOptions: JSON.stringify({ options: [] }),
      });
    });

    it('should create Notes field with textarea type and null options', async () => {
      const mockEventSettings = {
        $id: 'event-settings-123',
        ...mockEventSettingsData,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      mockTablesDB.createRow
        .mockResolvedValueOnce(mockEventSettings)
        .mockResolvedValueOnce({ $id: 'field-1' })
        .mockResolvedValueOnce({ $id: 'field-2' })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Find the Notes field creation call
      const notesCall = (mockTablesDB.createRow as any).mock.calls.find(
        (call: any) => call[3]?.fieldName === 'Notes'
      );

      expect(notesCall).toBeDefined();
      expect(notesCall[3]).toMatchObject({
        fieldType: 'textarea',
        fieldOptions: null,
      });
    });

    it('should set both fields as not required', async () => {
      const mockEventSettings = {
        $id: 'event-settings-123',
        ...mockEventSettingsData,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      mockTablesDB.createRow
        .mockResolvedValueOnce(mockEventSettings)
        .mockResolvedValueOnce({ $id: 'field-1' })
        .mockResolvedValueOnce({ $id: 'field-2' })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const customFieldCalls = (mockTablesDB.createRow as any).mock.calls.filter(
        (call: any) => call[1] === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID
      );

      expect(customFieldCalls[0][3]).toMatchObject({ required: false });
      expect(customFieldCalls[1][3]).toMatchObject({ required: false });
    });

    it('should set correct order for default fields', async () => {
      const mockEventSettings = {
        $id: 'event-settings-123',
        ...mockEventSettingsData,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      mockTablesDB.createRow
        .mockResolvedValueOnce(mockEventSettings)
        .mockResolvedValueOnce({ $id: 'field-1' })
        .mockResolvedValueOnce({ $id: 'field-2' })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const customFieldCalls = (mockTablesDB.createRow as any).mock.calls.filter(
        (call: any) => call[1] === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID
      );

      // Credential Type should be order 1
      expect(customFieldCalls[0][3]).toMatchObject({ order: 1 });
      // Notes should be order 2
      expect(customFieldCalls[1][3]).toMatchObject({ order: 2 });
    });

    it('should initialize version to 0 for default fields', async () => {
      const mockEventSettings = {
        $id: 'event-settings-123',
        ...mockEventSettingsData,
      };

      mockTablesDB.listRows
        .mockResolvedValueOnce({ rows: [mockUserProfile], total: 1 })
        .mockResolvedValueOnce({ rows: [], total: 0 });

      mockTablesDB.getRow.mockResolvedValueOnce(mockAdminRole);

      mockTablesDB.createRow
        .mockResolvedValueOnce(mockEventSettings)
        .mockResolvedValueOnce({ $id: 'field-1' })
        .mockResolvedValueOnce({ $id: 'field-2' })
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const customFieldCalls = (mockTablesDB.createRow as any).mock.calls.filter(
        (call: any) => call[1] === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID
      );

      expect(customFieldCalls[0][3]).toMatchObject({ version: 0 });
      expect(customFieldCalls[1][3]).toMatchObject({ version: 0 });
    });
  });
});
