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

describe('Event Settings API - Performance Benchmarking Tests', () => {
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

  const createMockRequest = (): Partial<NextApiRequest> => ({
    method: 'GET',
    headers: {},
    cookies: {},
  });

  const createMockResponse = () => {
    const mockJson = vi.fn();
    const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    const mockSetHeader = vi.fn();

    return {
      status: mockStatus,
      json: mockJson,
      setHeader: mockSetHeader,
      mockJson,
      mockStatus,
      mockSetHeader,
    };
  };

  const setupMockDatabases = () => {
    const mockDatabases = {
      listDocuments: vi.fn()
        .mockResolvedValueOnce({ documents: [mockEventSettings] })
        .mockImplementation((_, collectionId) => {
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

    return mockDatabases;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    eventSettingsCache.clear();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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

  describe('Load Testing - 50 Concurrent GET Requests', () => {
    it('should handle 50 concurrent GET requests with cold cache', async () => {
      // Setup mock that works for multiple concurrent calls
      const mockDatabases = {
        listDocuments: vi.fn().mockImplementation((_, collectionId) => {
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

      const requests = Array.from({ length: 50 }, () => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        return { mockReq, mockRes };
      });

      const startTime = Date.now();
      
      // Execute all requests concurrently
      const results = await Promise.allSettled(
        requests.map(({ mockReq, mockRes }) =>
          handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
        )
      );

      const duration = Date.now() - startTime;

      // Verify all requests completed
      expect(results.length).toBe(50);
      
      // Count successful requests
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulRequests).toBe(50);

      // Verify at least most responses were successful (some may race to cache)
      const successfulResponses = requests.filter(({ mockRes }) => 
        mockRes.mockStatus.mock.calls.some(call => call[0] === 200)
      ).length;
      expect(successfulResponses).toBeGreaterThan(45); // Allow for some variance

      // Log performance metrics
      console.log(`\n📊 Load Test Results (50 concurrent requests, cold cache):`);
      console.log(`   Total Duration: ${duration}ms`);
      console.log(`   Average per request: ${(duration / 50).toFixed(2)}ms`);
      console.log(`   Successful requests: ${successfulRequests}/50`);
      console.log(`   Successful responses: ${successfulResponses}/50`);

      // Verify reasonable performance (should complete within 10 seconds for 50 concurrent)
      expect(duration).toBeLessThan(10000);
    });

    it('should handle 50 concurrent GET requests with warm cache', async () => {
      setupMockDatabases();

      // Pre-populate cache
      const cachedResponse = {
        ...mockEventSettings,
        customFields: mockCustomFields,
        switchboardEnabled: true,
        cloudinaryEnabled: true,
        oneSimpleApiEnabled: true,
      };
      eventSettingsCache.set('event-settings', cachedResponse);

      const requests = Array.from({ length: 50 }, () => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        return { mockReq, mockRes };
      });

      const startTime = Date.now();
      
      // Execute all requests concurrently
      const results = await Promise.allSettled(
        requests.map(({ mockReq, mockRes }) =>
          handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
        )
      );

      const duration = Date.now() - startTime;

      // Verify all requests completed
      expect(results.length).toBe(50);
      
      // Count successful requests
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulRequests).toBe(50);

      // Verify all responses were cache hits
      requests.forEach(({ mockRes }) => {
        expect(mockRes.mockSetHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
        expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      });

      // Log performance metrics
      console.log(`\n📊 Load Test Results (50 concurrent requests, warm cache):`);
      console.log(`   Total Duration: ${duration}ms`);
      console.log(`   Average per request: ${(duration / 50).toFixed(2)}ms`);
      console.log(`   Successful requests: ${successfulRequests}/50`);

      // Verify excellent performance with cache (should be very fast)
      expect(duration).toBeLessThan(1000); // All 50 requests in under 1 second
    });
  });

  describe('Load Testing - 100 Concurrent GET Requests', () => {
    it('should handle 100 concurrent GET requests with cold cache', async () => {
      // Setup mock that works for multiple concurrent calls
      const mockDatabases = {
        listDocuments: vi.fn().mockImplementation((_, collectionId) => {
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

      const requests = Array.from({ length: 100 }, () => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        return { mockReq, mockRes };
      });

      const startTime = Date.now();
      
      // Execute all requests concurrently
      const results = await Promise.allSettled(
        requests.map(({ mockReq, mockRes }) =>
          handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
        )
      );

      const duration = Date.now() - startTime;

      // Verify all requests completed
      expect(results.length).toBe(100);
      
      // Count successful requests
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulRequests).toBe(100);

      // Verify at least most responses were successful
      const successfulResponses = requests.filter(({ mockRes }) => 
        mockRes.mockStatus.mock.calls.some(call => call[0] === 200)
      ).length;
      expect(successfulResponses).toBeGreaterThan(90); // Allow for some variance

      // Log performance metrics
      console.log(`\n📊 Load Test Results (100 concurrent requests, cold cache):`);
      console.log(`   Total Duration: ${duration}ms`);
      console.log(`   Average per request: ${(duration / 100).toFixed(2)}ms`);
      console.log(`   Successful requests: ${successfulRequests}/100`);
      console.log(`   Successful responses: ${successfulResponses}/100`);

      // Verify reasonable performance
      expect(duration).toBeLessThan(15000); // 15 seconds for 100 concurrent
    });

    it('should handle 100 concurrent GET requests with warm cache', async () => {
      setupMockDatabases();

      // Pre-populate cache
      const cachedResponse = {
        ...mockEventSettings,
        customFields: mockCustomFields,
        switchboardEnabled: true,
        cloudinaryEnabled: true,
        oneSimpleApiEnabled: true,
      };
      eventSettingsCache.set('event-settings', cachedResponse);

      const requests = Array.from({ length: 100 }, () => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        return { mockReq, mockRes };
      });

      const startTime = Date.now();
      
      // Execute all requests concurrently
      const results = await Promise.allSettled(
        requests.map(({ mockReq, mockRes }) =>
          handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
        )
      );

      const duration = Date.now() - startTime;

      // Verify all requests completed
      expect(results.length).toBe(100);
      
      // Count successful requests
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulRequests).toBe(100);

      // Verify all responses were cache hits
      requests.forEach(({ mockRes }) => {
        expect(mockRes.mockSetHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
        expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      });

      // Log performance metrics
      console.log(`\n📊 Load Test Results (100 concurrent requests, warm cache):`);
      console.log(`   Total Duration: ${duration}ms`);
      console.log(`   Average per request: ${(duration / 100).toFixed(2)}ms`);
      console.log(`   Successful requests: ${successfulRequests}/100`);

      // Verify excellent performance with cache
      expect(duration).toBeLessThan(2000); // All 100 requests in under 2 seconds
    });
  });

  describe('Response Time Verification', () => {
    it('should verify cold cache response time is under 5 seconds', async () => {
      setupMockDatabases();

      const mockReq = createMockRequest();
      const mockRes = createMockResponse();

      const startTime = Date.now();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const duration = Date.now() - startTime;

      // Verify response time meets requirement
      expect(duration).toBeLessThan(5000);
      
      // Verify cache miss
      expect(mockRes.mockSetHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
      
      // Verify successful response
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);

      console.log(`\n⏱️  Cold Cache Response Time: ${duration}ms (target: <5000ms)`);
    });

    it('should verify warm cache response time is under 100ms', async () => {
      setupMockDatabases();

      // Pre-populate cache
      const cachedResponse = {
        ...mockEventSettings,
        customFields: mockCustomFields,
        switchboardEnabled: true,
        cloudinaryEnabled: true,
        oneSimpleApiEnabled: true,
      };
      eventSettingsCache.set('event-settings', cachedResponse);

      const mockReq = createMockRequest();
      const mockRes = createMockResponse();

      const startTime = Date.now();
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const duration = Date.now() - startTime;

      // Verify response time meets requirement
      expect(duration).toBeLessThan(100);
      
      // Verify cache hit
      expect(mockRes.mockSetHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      
      // Verify successful response
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);

      console.log(`\n⚡ Warm Cache Response Time: ${duration}ms (target: <100ms)`);
    });

    it('should measure response time distribution across multiple requests', async () => {
      setupMockDatabases();

      const responseTimes: number[] = [];
      const requestCount = 20;

      for (let i = 0; i < requestCount; i++) {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        const startTime = Date.now();
        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
        const duration = Date.now() - startTime;

        responseTimes.push(duration);
      }

      // Calculate statistics
      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const minTime = Math.min(...responseTimes);
      const maxTime = Math.max(...responseTimes);
      const sortedTimes = [...responseTimes].sort((a, b) => a - b);
      const p95Time = sortedTimes[Math.floor(sortedTimes.length * 0.95)];

      console.log(`\n📈 Response Time Distribution (${requestCount} requests):`);
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
      console.log(`   Min: ${minTime}ms`);
      console.log(`   Max: ${maxTime}ms`);
      console.log(`   95th percentile: ${p95Time}ms`);

      // Verify 95th percentile is under 5 seconds
      expect(p95Time).toBeLessThan(5000);
    });
  });

  describe('Cache Hit Rate Tracking', () => {
    it('should track cache hit rates and verify they exceed 80% after warmup', async () => {
      setupMockDatabases();

      const totalRequests = 100;
      let cacheHits = 0;
      let cacheMisses = 0;

      // First request - cache miss (warmup)
      const warmupReq = createMockRequest();
      const warmupRes = createMockResponse();
      await handler(warmupReq as NextApiRequest, warmupRes as NextApiResponse);
      
      // Check if it was a cache miss
      const warmupCacheHeader = warmupRes.mockSetHeader.mock.calls.find(
        call => call[0] === 'X-Cache'
      );
      if (warmupCacheHeader && warmupCacheHeader[1] === 'MISS') {
        cacheMisses++;
      }

      // Subsequent requests - should be cache hits
      for (let i = 1; i < totalRequests; i++) {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        
        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
        
        // Check cache status
        const cacheHeader = mockRes.mockSetHeader.mock.calls.find(
          call => call[0] === 'X-Cache'
        );
        
        if (cacheHeader) {
          if (cacheHeader[1] === 'HIT') {
            cacheHits++;
          } else if (cacheHeader[1] === 'MISS') {
            cacheMisses++;
          }
        }
      }

      const cacheHitRate = (cacheHits / totalRequests) * 100;

      console.log(`\n🎯 Cache Hit Rate Analysis (${totalRequests} requests):`);
      console.log(`   Cache Hits: ${cacheHits}`);
      console.log(`   Cache Misses: ${cacheMisses}`);
      console.log(`   Hit Rate: ${cacheHitRate.toFixed(2)}% (target: >80%)`);

      // Verify cache hit rate exceeds 80%
      expect(cacheHitRate).toBeGreaterThan(80);
    });

    it('should demonstrate cache effectiveness with mixed read/write operations', async () => {
      // Setup mock that works for multiple calls
      const mockDatabases = {
        listDocuments: vi.fn().mockImplementation((_, collectionId) => {
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

      let cacheHits = 0;
      let cacheMisses = 0;
      const operations = [];

      // Pattern: 1 write, 10 reads (simulating typical usage)
      for (let cycle = 0; cycle < 5; cycle++) {
        // Write operation (invalidates cache)
        operations.push({ type: 'write', cycle });
        
        // 10 read operations (should hit cache after first miss)
        for (let i = 0; i < 10; i++) {
          operations.push({ type: 'read', cycle, readIndex: i });
        }
      }

      for (const op of operations) {
        if (op.type === 'write') {
          // Simulate cache invalidation
          eventSettingsCache.invalidate('event-settings');
        } else {
          const mockReq = createMockRequest();
          const mockRes = createMockResponse();
          
          await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
          
          const cacheHeader = mockRes.mockSetHeader.mock.calls.find(
            call => call[0] === 'X-Cache'
          );
          
          if (cacheHeader) {
            if (cacheHeader[1] === 'HIT') {
              cacheHits++;
            } else if (cacheHeader[1] === 'MISS') {
              cacheMisses++;
            }
          }
        }
      }

      const totalReads = operations.filter(op => op.type === 'read').length;
      const cacheHitRate = (cacheHits / totalReads) * 100;

      console.log(`\n🔄 Mixed Operations Cache Analysis:`);
      console.log(`   Total Read Operations: ${totalReads}`);
      console.log(`   Cache Hits: ${cacheHits}`);
      console.log(`   Cache Misses: ${cacheMisses}`);
      console.log(`   Hit Rate: ${cacheHitRate.toFixed(2)}%`);

      // With 1 write per 10 reads, we expect ~90% hit rate
      // (first read after write is miss, next 9 are hits)
      expect(cacheHitRate).toBeGreaterThan(80);
    });

    it('should track cache performance over time', async () => {
      setupMockDatabases();

      const batches = 5;
      const requestsPerBatch = 20;
      const batchResults = [];

      for (let batch = 0; batch < batches; batch++) {
        let batchHits = 0;
        let batchMisses = 0;
        const batchStartTime = Date.now();

        for (let i = 0; i < requestsPerBatch; i++) {
          const mockReq = createMockRequest();
          const mockRes = createMockResponse();
          
          await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
          
          const cacheHeader = mockRes.mockSetHeader.mock.calls.find(
            call => call[0] === 'X-Cache'
          );
          
          if (cacheHeader) {
            if (cacheHeader[1] === 'HIT') {
              batchHits++;
            } else if (cacheHeader[1] === 'MISS') {
              batchMisses++;
            }
          }
        }

        const batchDuration = Date.now() - batchStartTime;
        const batchHitRate = (batchHits / requestsPerBatch) * 100;

        batchResults.push({
          batch: batch + 1,
          hits: batchHits,
          misses: batchMisses,
          hitRate: batchHitRate,
          duration: batchDuration,
        });
      }

      console.log(`\n📊 Cache Performance Over Time:`);
      batchResults.forEach(result => {
        console.log(`   Batch ${result.batch}: ${result.hitRate.toFixed(1)}% hit rate, ${result.duration}ms`);
      });

      // After first batch (warmup), hit rate should be very high
      const afterWarmup = batchResults.slice(1);
      const avgHitRateAfterWarmup = 
        afterWarmup.reduce((sum, r) => sum + r.hitRate, 0) / afterWarmup.length;

      console.log(`   Average hit rate after warmup: ${avgHitRateAfterWarmup.toFixed(2)}%`);

      // Verify sustained high hit rate
      expect(avgHitRateAfterWarmup).toBeGreaterThan(80);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with sustained load', async () => {
      setupMockDatabases();

      // Pre-populate cache
      const cachedResponse = {
        ...mockEventSettings,
        customFields: mockCustomFields,
        switchboardEnabled: true,
        cloudinaryEnabled: true,
        oneSimpleApiEnabled: true,
      };
      eventSettingsCache.set('event-settings', cachedResponse);

      const waves = 3;
      const requestsPerWave = 30;
      const waveResults = [];

      for (let wave = 0; wave < waves; wave++) {
        const requests = Array.from({ length: requestsPerWave }, () => {
          const mockReq = createMockRequest();
          const mockRes = createMockResponse();
          return { mockReq, mockRes };
        });

        const startTime = Date.now();
        
        await Promise.all(
          requests.map(({ mockReq, mockRes }) =>
            handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
          )
        );

        const duration = Date.now() - startTime;
        const avgResponseTime = duration / requestsPerWave;

        waveResults.push({
          wave: wave + 1,
          duration,
          avgResponseTime,
        });

        // Small delay between waves
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`\n🌊 Sustained Load Test (${waves} waves of ${requestsPerWave} requests):`);
      waveResults.forEach(result => {
        console.log(`   Wave ${result.wave}: ${result.duration}ms total, ${result.avgResponseTime.toFixed(2)}ms avg`);
      });

      // Verify consistent performance across waves
      waveResults.forEach(result => {
        expect(result.avgResponseTime).toBeLessThan(100);
      });
    });
  });
});
