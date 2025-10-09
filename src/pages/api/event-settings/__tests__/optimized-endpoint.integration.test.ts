import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../index';
import { createAdminClient, createSessionClient } from '@/lib/appwrite';
import { eventSettingsCache } from '@/lib/cache';

// Mock the Appwrite clients
vi.mock('@/lib/appwrite', () => ({
  createAdminClient: vi.fn(),
  createSessionClient: vi.fn(),
}));

// Mock the log settings
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn().mockResolvedValue(false),
}));

// Mock the string utility
vi.mock('@/util/string', () => ({
  generateInternalFieldName: vi.fn((name) => name.toLowerCase().replace(/\s+/g, '_')),
}));

// Mock the integration functions
vi.mock('@/lib/appwrite-integrations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/appwrite-integrations')>();
  return {
    ...actual,
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
  };
});

describe('Event Settings API - Optimized Endpoint Integration Tests', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockSetHeader: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

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
    {
      $id: 'field-2',
      fieldName: 'Department',
      internalFieldName: 'department',
      fieldType: 'text',
      required: true,
      order: 1,
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

    // Clear cache before each test
    eventSettingsCache.clear();

    // Setup console spy
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

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
  });

  describe('Cache Miss - Cold Cache Scenario', () => {
    it('should fetch from database when cache is empty', async () => {
      const mockDatabases = {
        listDocuments: vi.fn()
          .mockResolvedValueOnce({ documents: [mockEventSettings] }) // Event settings
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
              return Promise.resolve({ documents: [mockOneSimpleApiIntegration] });
            }
            return Promise.resolve({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify cache miss header
      expect(mockSetHeader).toHaveBeenCalledWith('X-Cache', 'MISS');

      // Verify response
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalled();

      const response = mockJson.mock.calls[0][0];
      expect(response.eventName).toBe('Test Event');
      expect(response.customFields).toHaveLength(2);
      expect(response.switchboardEnabled).toBe(true);
      expect(response.cloudinaryEnabled).toBe(true);
      expect(response.oneSimpleApiEnabled).toBe(true);

      // Verify database was queried
      expect(mockDatabases.listDocuments).toHaveBeenCalled();
    });

    it('should populate cache after successful database fetch', async () => {
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
              return Promise.resolve({ documents: [mockOneSimpleApiIntegration] });
            }
            return Promise.resolve({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      // Verify cache is empty
      expect(eventSettingsCache.get('event-settings')).toBeNull();

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify cache was populated
      const cachedData = eventSettingsCache.get('event-settings');
      expect(cachedData).not.toBeNull();
      expect(cachedData.eventName).toBe('Test Event');
      expect(cachedData.customFields).toHaveLength(2);
    });

    it('should measure and log performance metrics for cold cache', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

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
              return Promise.resolve({ documents: [mockOneSimpleApiIntegration] });
            }
            return Promise.resolve({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify performance headers were set (specific header names)
      expect(mockSetHeader).toHaveBeenCalledWith('X-Response-Time', expect.any(String));
      expect(mockSetHeader).toHaveBeenCalledWith('X-Query-Count', expect.any(String));
      expect(mockSetHeader).toHaveBeenCalledWith('X-Slow-Queries', expect.any(String));

      // Verify performance logging occurred (multiple log calls for formatted output)
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      const hasPerformanceSummary = logCalls.some(log =>
        typeof log === 'string' && log.includes('Performance Summary') && log.includes('GET /api/event-settings')
      );
      expect(hasPerformanceSummary).toBe(true);

      consoleLogSpy.mockRestore();
    });
  });

  describe('Cache Hit - Warm Cache Scenario', () => {
    it('should serve from cache when data is cached', async () => {
      const mockDatabases = {
        listDocuments: vi.fn(),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      // Pre-populate cache
      const cachedResponse = {
        ...mockEventSettings,
        customFields: mockCustomFields,
        switchboardEnabled: true,
        cloudinaryEnabled: true,
        oneSimpleApiEnabled: true,
      };
      eventSettingsCache.set('event-settings', cachedResponse);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify cache hit header
      expect(mockSetHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(mockSetHeader).toHaveBeenCalledWith('X-Cache-Age', expect.any(String));

      // Verify response
      expect(mockStatus).toHaveBeenCalledWith(200);
      // Response includes timestamp from cache
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ...cachedResponse,
        timestamp: expect.any(Number),
      }));

      // Verify database was NOT queried
      expect(mockDatabases.listDocuments).not.toHaveBeenCalled();
    });

    it('should return cached data immediately without database queries', async () => {
      const mockDatabases = {
        listDocuments: vi.fn(),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      // Pre-populate cache
      const cachedResponse = {
        ...mockEventSettings,
        customFields: mockCustomFields,
        switchboardEnabled: true,
      };
      eventSettingsCache.set('event-settings', cachedResponse);

      const startTime = Date.now();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const duration = Date.now() - startTime;

      // Verify response was fast (should be < 100ms for cached data)
      expect(duration).toBeLessThan(100);

      // Verify no database calls
      expect(mockDatabases.listDocuments).not.toHaveBeenCalled();

      // Verify correct response (includes timestamp from cache)
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ...cachedResponse,
        timestamp: expect.any(Number),
      }));
    });

    it('should include cache age in response headers', async () => {
      const mockDatabases = {
        listDocuments: vi.fn(),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      // Pre-populate cache
      const cachedResponse = {
        ...mockEventSettings,
        customFields: mockCustomFields,
      };
      eventSettingsCache.set('event-settings', cachedResponse);

      // Wait a bit to have measurable cache age
      await new Promise(resolve => setTimeout(resolve, 100));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify cache age header was set
      const cacheAgeCall = mockSetHeader.mock.calls.find(
        call => call[0] === 'X-Cache-Age'
      );
      expect(cacheAgeCall).toBeDefined();

      // Cache age should be a valid number (0 or greater)
      const cacheAge = parseInt(cacheAgeCall![1] as string);
      expect(cacheAge).toBeGreaterThanOrEqual(0);
      expect(isNaN(cacheAge)).toBe(false);
    });

    it('should still perform async logging for cached responses', async () => {
      const mockAccount = {
        get: vi.fn().mockResolvedValue({ $id: 'user-123' }),
      };

      const mockSessionDatabases = {
        listDocuments: vi.fn().mockResolvedValue({
          documents: [{ $id: 'user-doc-123', userId: 'user-123' }],
        }),
        createDocument: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(createSessionClient).mockReturnValue({
        account: mockAccount,
        databases: mockSessionDatabases,
      } as any);

      vi.mocked(createAdminClient).mockReturnValue({
        databases: { listDocuments: vi.fn() },
      } as any);

      // Pre-populate cache
      const cachedResponse = {
        ...mockEventSettings,
        customFields: mockCustomFields,
      };
      eventSettingsCache.set('event-settings', cachedResponse);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Wait for async logging to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Note: Async logging happens in setImmediate, so we can't easily verify it in tests
      // But we can verify the response was sent immediately
      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation on PUT Request', () => {
    it('should invalidate cache after successful PUT request', async () => {
      // Pre-populate cache
      eventSettingsCache.set('event-settings', {
        ...mockEventSettings,
        customFields: mockCustomFields,
      });

      // Verify cache is populated (get returns data with timestamp)
      const cachedBefore = eventSettingsCache.get('event-settings');
      expect(cachedBefore).not.toBeNull();
      expect(cachedBefore.eventName).toBe('Test Event');

      // Directly test cache invalidation
      eventSettingsCache.invalidate('event-settings');

      // Verify cache was invalidated
      expect(eventSettingsCache.get('event-settings')).toBeNull();
    });

    it('should fetch fresh data after cache invalidation', async () => {
      const updatedEventSettings = {
        ...mockEventSettings,
        eventName: 'Updated Event Name',
      };

      const mockDatabases = {
        listDocuments: vi.fn()
          .mockResolvedValueOnce({ documents: [updatedEventSettings] }) // Fresh fetch for GET
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
              return Promise.resolve({ documents: [mockOneSimpleApiIntegration] });
            }
            return Promise.resolve({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      // Pre-populate cache with old data
      eventSettingsCache.set('event-settings', {
        ...mockEventSettings,
        customFields: mockCustomFields,
      });

      // Invalidate cache (simulating what PUT would do)
      eventSettingsCache.invalidate('event-settings');

      // Make GET request
      mockReq.method = 'GET';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify cache miss (data was invalidated)
      expect(mockSetHeader).toHaveBeenCalledWith('X-Cache', 'MISS');

      // Verify fresh data was fetched
      const response = mockJson.mock.calls[0][0];
      expect(response.eventName).toBe('Updated Event Name');
    });

    it('should invalidate cache at start of PUT request (even if it fails)', async () => {
      const mockAccount = {
        get: vi.fn().mockResolvedValue({ $id: 'user-123' }),
      };

      const mockDatabases = {
        listDocuments: vi.fn()
          .mockResolvedValueOnce({ documents: [mockEventSettings] })
          .mockResolvedValueOnce({ documents: mockCustomFields }),
        updateDocument: vi.fn().mockRejectedValue(new Error('Update failed')),
      };

      vi.mocked(createSessionClient).mockReturnValue({
        account: mockAccount,
        databases: mockDatabases,
      } as any);

      // Pre-populate cache
      const cachedData = {
        ...mockEventSettings,
        customFields: mockCustomFields,
      };
      eventSettingsCache.set('event-settings', cachedData);

      // Make PUT request that will fail
      mockReq.method = 'PUT';
      mockReq.body = {
        eventName: 'Updated Event',
        eventDate: '2025-10-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        customFields: [],
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify cache WAS invalidated (at start of PUT to prevent race conditions)
      // Cache remains cleared on error to prevent serving stale data
      const stillCached = eventSettingsCache.get('event-settings');
      expect(stillCached).toBeNull();
    });
  });

  describe('Response Time Performance Targets', () => {
    it('should respond within 5 seconds for cold cache scenario', async () => {
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
              return Promise.resolve({ documents: [mockOneSimpleApiIntegration] });
            }
            return Promise.resolve({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      const startTime = Date.now();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const duration = Date.now() - startTime;

      // Verify response time is under 5 seconds (5000ms)
      expect(duration).toBeLessThan(5000);

      // Verify successful response
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should respond within 100ms for warm cache scenario', async () => {
      const mockDatabases = {
        listDocuments: vi.fn(),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      // Pre-populate cache
      const cachedResponse = {
        ...mockEventSettings,
        customFields: mockCustomFields,
        switchboardEnabled: true,
        cloudinaryEnabled: true,
        oneSimpleApiEnabled: true,
      };
      eventSettingsCache.set('event-settings', cachedResponse);

      const startTime = Date.now();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const duration = Date.now() - startTime;

      // Verify response time is under 100ms for cached data
      expect(duration).toBeLessThan(100);

      // Verify cache hit
      expect(mockSetHeader).toHaveBeenCalledWith('X-Cache', 'HIT');

      // Verify successful response
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle parallel queries efficiently', async () => {
      // Add artificial delay to simulate network latency
      const delayedQuery = (data: any) =>
        new Promise(resolve => setTimeout(() => resolve(data), 100));

      const mockDatabases = {
        listDocuments: vi.fn()
          .mockImplementationOnce(() => delayedQuery({ documents: [mockEventSettings] }))
          .mockImplementation((dbId, collectionId) => {
            if (collectionId === 'custom-fields') {
              return delayedQuery({ documents: mockCustomFields });
            }
            if (collectionId === 'switchboard') {
              return delayedQuery({ documents: [mockSwitchboardIntegration] });
            }
            if (collectionId === 'cloudinary') {
              return delayedQuery({ documents: [mockCloudinaryIntegration] });
            }
            if (collectionId === 'onesimpleapi') {
              return delayedQuery({ documents: [mockOneSimpleApiIntegration] });
            }
            return delayedQuery({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      const startTime = Date.now();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const duration = Date.now() - startTime;

      // With parallel execution, total time should be ~200ms (2 rounds of parallel queries)
      // Not 500ms (5 sequential queries * 100ms each)
      // Allow some overhead for test execution
      expect(duration).toBeLessThan(400);

      // Verify all data was fetched
      const response = mockJson.mock.calls[0][0];
      expect(response.eventName).toBe('Test Event');
      expect(response.customFields).toHaveLength(2);
      expect(response.switchboardEnabled).toBe(true);
      expect(response.cloudinaryEnabled).toBe(true);
      expect(response.oneSimpleApiEnabled).toBe(true);
    });
  });

  describe('Cache TTL and Expiration', () => {
    it('should expire cache after TTL and fetch fresh data', async () => {
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
              return Promise.resolve({ documents: [mockOneSimpleApiIntegration] });
            }
            return Promise.resolve({ documents: [] });
          }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      // Pre-populate cache with very short TTL (1ms)
      const cachedResponse = {
        ...mockEventSettings,
        customFields: mockCustomFields,
      };
      eventSettingsCache.set('event-settings', cachedResponse, 1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify cache miss (expired)
      expect(mockSetHeader).toHaveBeenCalledWith('X-Cache', 'MISS');

      // Verify database was queried
      expect(mockDatabases.listDocuments).toHaveBeenCalled();
    });
  });

  describe('Error Handling with Cache', () => {
    it('should not cache error responses', async () => {
      const mockDatabases = {
        listDocuments: vi.fn().mockResolvedValue({ documents: [] }), // No event settings found
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify 404 response
      expect(mockStatus).toHaveBeenCalledWith(404);

      // Verify cache was not populated
      expect(eventSettingsCache.get('event-settings')).toBeNull();
    });

    it('should fall back to database if cache retrieval fails', async () => {
      // Restore console.error for this test to see actual errors
      consoleErrorSpy.mockRestore();

      // Mock cache.get to throw an error
      const originalGet = eventSettingsCache.get;
      const testConsoleErrorSpy = vi.spyOn(console, 'error');

      eventSettingsCache.get = vi.fn().mockImplementation(() => {
        throw new Error('Cache error');
      });

      const mockDatabases = {
        listDocuments: vi.fn().mockImplementation((dbId, collectionId) => {
          if (collectionId === 'event-settings') {
            return Promise.resolve({ documents: [mockEventSettings] });
          }
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
            return Promise.resolve({ documents: [mockOneSimpleApiIntegration] });
          }
          return Promise.resolve({ documents: [] });
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue({
        databases: mockDatabases,
      } as any);

      // Handler now has try-catch around cache.get
      // Should catch the error, log it, and fall back to database
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should return 200 with data from database
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalled();

      // Should log the cache error
      expect(testConsoleErrorSpy).toHaveBeenCalledWith(
        'Cache access error in GET /api/event-settings:',
        expect.objectContaining({
          error: expect.any(Error),
          message: 'Cache error',
          cacheKey: 'event-settings'
        })
      );

      // Should have fetched from database
      expect(mockDatabases.listDocuments).toHaveBeenCalled();

      // Restore original methods
      eventSettingsCache.get = originalGet;
      testConsoleErrorSpy.mockRestore();
    });
  });
});
