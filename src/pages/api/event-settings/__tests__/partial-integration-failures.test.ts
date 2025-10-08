import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../index';
import { createAdminClient, createSessionClient } from '@/lib/appwrite';
import { Query } from 'appwrite';

// Mock the Appwrite clients
vi.mock('@/lib/appwrite', () => ({
  createAdminClient: vi.fn(),
  createSessionClient: vi.fn(),
}));

// Mock the log settings
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn().mockResolvedValue(false),
}));

// Mock the cache
vi.mock('@/lib/cache', () => ({
  eventSettingsCache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    invalidate: vi.fn(),
  },
}));

// Mock the performance tracker
vi.mock('@/lib/performance', () => ({
  PerformanceTracker: vi.fn().mockImplementation(() => ({
    trackQuery: vi.fn().mockImplementation((name, fn) => fn()),
    logSummary: vi.fn(),
    getResponseHeaders: vi.fn().mockReturnValue({}),
  })),
}));

// Mock the string utility
vi.mock('@/util/string', () => ({
  generateInternalFieldName: vi.fn((name) => name.toLowerCase().replace(/\s+/g, '_')),
}));

// Mock the integration functions
vi.mock('@/lib/appwrite-integrations', () => ({
  IntegrationConflictError: class IntegrationConflictError extends Error {
    constructor(
      public integrationType: string,
      public eventSettingsId: string,
      public expectedVersion: number,
      public actualVersion: number
    ) {
      super(`Integration conflict for ${integrationType}`);
      this.name = 'IntegrationConflictError';
    }
  },
  updateCloudinaryIntegration: vi.fn(),
  updateSwitchboardIntegration: vi.fn(),
  updateOneSimpleApiIntegration: vi.fn(),
}));

describe('Event Settings API - Partial Integration Failures', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockSetHeader: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  const mockEventSettings = {
    $id: 'event-123',
    eventName: 'Test Event',
    eventDate: '2025-10-15T00:00:00.000Z',
    eventLocation: 'Test Location',
    timeZone: 'America/New_York',
    barcodeType: 'alphanumerical',
    barcodeLength: 8,
    barcodeUnique: true,
  };

  const mockCustomFields = [
    {
      $id: 'field-1',
      fieldName: 'Company',
      internalFieldName: 'company',
      fieldType: 'text',
      required: false,
      order: 0,
      fieldOptions: null,
    },
  ];

  const mockSwitchboardIntegration = {
    $id: 'switchboard-1',
    enabled: true,
    apiEndpoint: 'https://api.switchboard.com',
    apiKey: 'test-key',
    fieldMappings: '[]',
  };

  const mockCloudinaryIntegration = {
    $id: 'cloudinary-1',
    enabled: true,
    cloudName: 'test-cloud',
    apiKey: 'test-key',
    uploadPreset: 'test-preset',
  };

  const mockOneSimpleApiIntegration = {
    $id: 'onesimpleapi-1',
    enabled: true,
    apiUrl: 'https://api.onesimpleapi.com',
    apiKey: 'test-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup console spies
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockSetHeader = vi.fn();

    mockReq = {
      method: 'GET',
      headers: {},
      cookies: {},
    };

    mockRes = {
      status: mockStatus,
      json: mockJson,
      setHeader: mockSetHeader,
    };

    // Set up environment variables
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test-db';
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID = 'users';
    process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID = 'roles';
    process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID = 'custom-fields';
    process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID = 'event-settings';
    process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID = 'logs';
    process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID = 'switchboard';
    process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID = 'cloudinary';
    process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID = 'onesimpleapi';
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Partial Integration Failures', () => {
    it('should return event settings with null for failed Switchboard integration', async () => {
      const mockDatabases = {
        listDocuments: vi.fn()
          .mockResolvedValueOnce({ documents: [mockEventSettings] }) // Event settings
          .mockImplementation((dbId, collectionId) => {
            if (collectionId === 'custom-fields') {
              return Promise.resolve({ documents: mockCustomFields });
            }
            if (collectionId === 'switchboard') {
              return Promise.reject(new Error('Switchboard connection failed'));
            }
            if (collectionId === 'cloudinary') {
              return Promise.resolve({ documents: [mockCloudinaryIntegration] });
            }
            if (collectionId === 'onesimpleapi') {
              return Promise.resolve({ documents: [mockOneSimpleApiIntegration] });
            }
            return Promise.resolve({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalled();
      
      const response = mockJson.mock.calls[0][0];
      expect(response.eventName).toBe('Test Event');
      expect(response.customFields).toHaveLength(1);
      
      // Switchboard should be missing (null/undefined)
      expect(response.switchboardEnabled).toBeUndefined();
      expect(response.switchboardApiEndpoint).toBeUndefined();
      
      // Other integrations should be present
      expect(response.cloudinaryEnabled).toBe(true);
      expect(response.oneSimpleApiEnabled).toBe(true);
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch Switchboard integration'),
        expect.objectContaining({
          integration: 'Switchboard',
          eventSettingsId: 'event-123',
        })
      );
    });

    it('should return event settings with null for failed Cloudinary integration', async () => {
      const mockDatabases = {
        listDocuments: vi.fn()
          .mockResolvedValueOnce({ documents: [mockEventSettings] })
          .mockImplementation((dbId, collectionId) => {
            if (collectionId === 'custom-fields') {
              return Promise.resolve({ documents: mockCustomFields });
            }
            if (collectionId === 'switchboard') {
              return Promise.resolve({ documents: [mockSwitchboardIntegration] });
            }
            if (collectionId === 'cloudinary') {
              return Promise.reject(new Error('Cloudinary API error'));
            }
            if (collectionId === 'onesimpleapi') {
              return Promise.resolve({ documents: [mockOneSimpleApiIntegration] });
            }
            return Promise.resolve({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockStatus).toHaveBeenCalledWith(200);
      
      const response = mockJson.mock.calls[0][0];
      expect(response.eventName).toBe('Test Event');
      
      // Cloudinary should be missing
      expect(response.cloudinaryEnabled).toBeUndefined();
      
      // Other integrations should be present
      expect(response.switchboardEnabled).toBe(true);
      expect(response.oneSimpleApiEnabled).toBe(true);
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch Cloudinary integration'),
        expect.objectContaining({
          integration: 'Cloudinary',
          eventSettingsId: 'event-123',
        })
      );
    });

    it('should return event settings with null for failed OneSimpleAPI integration', async () => {
      const mockDatabases = {
        listDocuments: vi.fn()
          .mockResolvedValueOnce({ documents: [mockEventSettings] })
          .mockImplementation((dbId, collectionId) => {
            if (collectionId === 'custom-fields') {
              return Promise.resolve({ documents: mockCustomFields });
            }
            if (collectionId === 'switchboard') {
              return Promise.resolve({ documents: [mockSwitchboardIntegration] });
            }
            if (collectionId === 'cloudinary') {
              return Promise.resolve({ documents: [mockCloudinaryIntegration] });
            }
            if (collectionId === 'onesimpleapi') {
              return Promise.reject(new Error('OneSimpleAPI timeout'));
            }
            return Promise.resolve({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockStatus).toHaveBeenCalledWith(200);
      
      const response = mockJson.mock.calls[0][0];
      expect(response.eventName).toBe('Test Event');
      
      // OneSimpleAPI should be missing
      expect(response.oneSimpleApiEnabled).toBeUndefined();
      
      // Other integrations should be present
      expect(response.switchboardEnabled).toBe(true);
      expect(response.cloudinaryEnabled).toBe(true);
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch OneSimpleAPI integration'),
        expect.objectContaining({
          integration: 'OneSimpleAPI',
          eventSettingsId: 'event-123',
        })
      );
    });

    it('should return event settings even when ALL integrations fail', async () => {
      const mockDatabases = {
        listDocuments: vi.fn()
          .mockResolvedValueOnce({ documents: [mockEventSettings] })
          .mockImplementation((dbId, collectionId) => {
            if (collectionId === 'custom-fields') {
              return Promise.resolve({ documents: mockCustomFields });
            }
            // All integrations fail
            return Promise.reject(new Error('Integration service unavailable'));
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockStatus).toHaveBeenCalledWith(200);
      
      const response = mockJson.mock.calls[0][0];
      
      // Main event settings should still be returned
      expect(response.eventName).toBe('Test Event');
      expect(response.eventLocation).toBe('Test Location');
      expect(response.customFields).toHaveLength(1);
      
      // All integrations should be missing
      expect(response.switchboardEnabled).toBeUndefined();
      expect(response.cloudinaryEnabled).toBeUndefined();
      expect(response.oneSimpleApiEnabled).toBeUndefined();
      
      // Verify all integration errors were logged
      expect(consoleErrorSpy).toHaveBeenCalledTimes(3); // One for each integration
      
      // Verify summary warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Integration fetch failures (3/3)'),
        expect.objectContaining({
          eventSettingsId: 'event-123',
          note: 'Event settings response will include null values for failed integrations',
        })
      );
    });

    it('should return event settings when custom fields fail but integrations succeed', async () => {
      const mockDatabases = {
        listDocuments: vi.fn()
          .mockResolvedValueOnce({ documents: [mockEventSettings] })
          .mockImplementation((dbId, collectionId) => {
            if (collectionId === 'custom-fields') {
              return Promise.reject(new Error('Custom fields query failed'));
            }
            if (collectionId === 'switchboard') {
              return Promise.resolve({ documents: [mockSwitchboardIntegration] });
            }
            if (collectionId === 'cloudinary') {
              return Promise.resolve({ documents: [mockCloudinaryIntegration] });
            }
            if (collectionId === 'onesimpleapi') {
              return Promise.resolve({ documents: [mockOneSimpleApiIntegration] });
            }
            return Promise.resolve({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockStatus).toHaveBeenCalledWith(200);
      
      const response = mockJson.mock.calls[0][0];
      
      // Main event settings should be returned
      expect(response.eventName).toBe('Test Event');
      
      // Custom fields should be empty array (not undefined)
      expect(response.customFields).toEqual([]);
      
      // Integrations should still be present
      expect(response.switchboardEnabled).toBe(true);
      expect(response.cloudinaryEnabled).toBe(true);
      expect(response.oneSimpleApiEnabled).toBe(true);
      
      // Verify custom fields error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch custom fields'),
        expect.objectContaining({
          eventSettingsId: 'event-123',
        })
      );
    });

    it('should log detailed error information for integration failures', async () => {
      const testError = new Error('Network timeout');
      testError.stack = 'Error: Network timeout\n  at test.ts:123';

      const mockDatabases = {
        listDocuments: vi.fn()
          .mockResolvedValueOnce({ documents: [mockEventSettings] })
          .mockImplementation((dbId, collectionId) => {
            if (collectionId === 'custom-fields') {
              return Promise.resolve({ documents: [] });
            }
            if (collectionId === 'switchboard') {
              return Promise.reject(testError);
            }
            return Promise.resolve({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify detailed error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch Switchboard integration'),
        expect.objectContaining({
          integration: 'Switchboard',
          error: testError,
          message: 'Network timeout',
          stack: expect.stringContaining('Error: Network timeout'),
          eventSettingsId: 'event-123',
          collectionId: 'switchboard',
        })
      );
    });

    it('should handle multiple simultaneous integration failures gracefully', async () => {
      const mockDatabases = {
        listDocuments: vi.fn()
          .mockResolvedValueOnce({ documents: [mockEventSettings] })
          .mockImplementation((dbId, collectionId) => {
            if (collectionId === 'custom-fields') {
              return Promise.resolve({ documents: mockCustomFields });
            }
            if (collectionId === 'switchboard') {
              return Promise.reject(new Error('Switchboard error'));
            }
            if (collectionId === 'cloudinary') {
              return Promise.reject(new Error('Cloudinary error'));
            }
            if (collectionId === 'onesimpleapi') {
              return Promise.resolve({ documents: [mockOneSimpleApiIntegration] });
            }
            return Promise.resolve({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockStatus).toHaveBeenCalledWith(200);
      
      const response = mockJson.mock.calls[0][0];
      
      // Main event settings should be returned
      expect(response.eventName).toBe('Test Event');
      expect(response.customFields).toHaveLength(1);
      
      // Failed integrations should be missing
      expect(response.switchboardEnabled).toBeUndefined();
      expect(response.cloudinaryEnabled).toBeUndefined();
      
      // Successful integration should be present
      expect(response.oneSimpleApiEnabled).toBe(true);
      
      // Verify both errors were logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch Switchboard integration'),
        expect.any(Object)
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch Cloudinary integration'),
        expect.any(Object)
      );
      
      // Verify summary warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Integration fetch failures (2/3)'),
        expect.objectContaining({
          failures: expect.arrayContaining([
            expect.objectContaining({ integration: 'Switchboard' }),
            expect.objectContaining({ integration: 'Cloudinary' }),
          ]),
        })
      );
    });
  });
});
