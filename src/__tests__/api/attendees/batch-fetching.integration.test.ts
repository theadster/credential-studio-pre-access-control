import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/attendees/index';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
    tablesDB: {}, // Mock tablesDB for transaction support
  })),
}));

// Mock the API middleware to inject user and userProfile directly
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handler: any) => async (req: any, res: any) => {
    // The test will set req.user and req.userProfile before calling handler
    return handler(req, res);
  },
  AuthenticatedRequest: {} as any,
}));

describe('/api/attendees - Batch Fetching Integration Tests', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let consoleWarnSpy: ReturnType<typeof vi.fn>;
  let consoleLogSpy: ReturnType<typeof vi.fn>;

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
      attendees: { create: true, read: true, update: true, delete: true },
      all: true,
    }),
  };

  const mockCustomFields = [
    {
      $id: 'field-1',
      fieldName: 'Field 1',
      showOnMainPage: true,
    },
  ];

  // Helper function to generate mock attendees
  const generateMockAttendees = (count: number, startIndex: number = 0) => {
    return Array.from({ length: count }, (_, i) => ({
      $id: `attendee-${startIndex + i + 1}`,
      id: `attendee-${startIndex + i + 1}`, // Include id for test assertions

      firstName: `First${startIndex + i + 1}`,
      lastName: `Last${startIndex + i + 1}`,
      barcodeNumber: `${String(startIndex + i + 1).padStart(5, '0')}`,
      photoUrl: i % 2 === 0 ? `https://example.com/photo${startIndex + i + 1}.jpg` : null,
      customFieldValues: JSON.stringify({ 'field-1': `value${startIndex + i + 1}` }),
      $createdAt: `2024-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
      $updatedAt: `2024-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
    }));
  };

  beforeEach(() => {
    resetAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      method: 'GET',
      cookies: { 'appwrite-session': 'test-session' },
      query: {},
      body: {},
      // Inject authenticated user and profile (bypassing middleware)
      user: mockAuthUser,
      userProfile: {
        ...mockUserProfile,
        role: {
          id: mockAdminRole.$id,
          name: mockAdminRole.name,
          description: mockAdminRole.description,
          permissions: JSON.parse(mockAdminRole.permissions),
        },
      },
    } as any;

    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Spy on console methods
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockDatabases.listDocuments.mockResolvedValue({
      documents: [],
      total: 0,
    });
    mockDatabases.createDocument.mockResolvedValue({
      $id: 'new-log-123',
      userId: mockAuthUser.$id,
      action: 'view',
      details: '{}',
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('Small Events (≤5000 attendees)', () => {
    it('should fetch all attendees in a single request for 50 attendees', async () => {
      const mockAttendees = generateMockAttendees(50);

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 }) // Custom fields for visibility
        .mockResolvedValueOnce({ documents: mockAttendees, total: 50 }); // Attendees list

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify single database request for attendees (2nd call)
      expect(mockDatabases.listDocuments).toHaveBeenCalledTimes(2);

      // Verify no console warnings for small events
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Successfully fetched all'));

      // Verify all attendees are returned
      expect(statusMock).toHaveBeenCalledWith(200);
      const result = jsonMock.mock.calls[0][0];
      expect(result).toHaveLength(50);
      expect(result[0].id).toBe('attendee-1');
      expect(result[49].id).toBe('attendee-50');
    });
  });

  describe('Large Events (>5000 attendees)', () => {
    it('should fetch all attendees in multiple batches for 5001 attendees', async () => {
      const batch1 = generateMockAttendees(5000, 0);
      const batch2 = generateMockAttendees(1, 5000);

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 }) // Custom fields for visibility
        .mockResolvedValueOnce({ documents: batch1, total: 5001 }) // First batch (total indicates more)
        .mockResolvedValueOnce({ documents: batch2, total: 5001 }); // Second batch

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify multiple database requests were made (3 total: custom fields, batch1, batch2)
      expect(mockDatabases.listDocuments).toHaveBeenCalledTimes(3);

      // Verify console warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Large event detected: 5001 attendees. Fetching in batches...'
      );

      // Verify success log was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Successfully fetched all 5001 attendees in 2 batches'
      );

      // Verify all attendees are returned in response
      expect(statusMock).toHaveBeenCalledWith(200);
      const result = jsonMock.mock.calls[0][0];
      expect(result).toHaveLength(5001);
      expect(result[0].id).toBe('attendee-1');
      expect(result[4999].id).toBe('attendee-5000');
      expect(result[5000].id).toBe('attendee-5001');
    });

    it('should fetch all attendees in multiple batches for 10000 attendees', async () => {
      const batch1 = generateMockAttendees(5000, 0);
      const batch2 = generateMockAttendees(5000, 5000);

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 }) // Custom fields for visibility
        .mockResolvedValueOnce({ documents: batch1, total: 10000 }) // First batch
        .mockResolvedValueOnce({ documents: batch2, total: 10000 }); // Second batch

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify multiple database requests were made
      expect(mockDatabases.listDocuments).toHaveBeenCalledTimes(3);

      // Verify console warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Large event detected: 10000 attendees. Fetching in batches...'
      );

      // Verify success log was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Successfully fetched all 10000 attendees in 2 batches'
      );

      // Verify all attendees are returned
      expect(statusMock).toHaveBeenCalledWith(200);
      const result = jsonMock.mock.calls[0][0];
      expect(result).toHaveLength(10000);
      expect(result[0].id).toBe('attendee-1');
      expect(result[4999].id).toBe('attendee-5000');
      expect(result[5000].id).toBe('attendee-5001');
      expect(result[9999].id).toBe('attendee-10000');
    });

    it('should fetch all attendees in multiple batches for 15000 attendees', async () => {
      const batch1 = generateMockAttendees(5000, 0);
      const batch2 = generateMockAttendees(5000, 5000);
      const batch3 = generateMockAttendees(5000, 10000);

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 }) // Custom fields for visibility
        .mockResolvedValueOnce({ documents: batch1, total: 15000 }) // First batch
        .mockResolvedValueOnce({ documents: batch2, total: 15000 }) // Second batch
        .mockResolvedValueOnce({ documents: batch3, total: 15000 }); // Third batch

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify multiple database requests were made (4 total: custom fields, 3 batches)
      expect(mockDatabases.listDocuments).toHaveBeenCalledTimes(4);

      // Verify console warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Large event detected: 15000 attendees. Fetching in batches...'
      );

      // Verify success log was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Successfully fetched all 15000 attendees in 3 batches'
      );

      // Verify all attendees are returned
      expect(statusMock).toHaveBeenCalledWith(200);
      const result = jsonMock.mock.calls[0][0];
      expect(result).toHaveLength(15000);
      expect(result[0].id).toBe('attendee-1');
      expect(result[4999].id).toBe('attendee-5000');
      expect(result[5000].id).toBe('attendee-5001');
      expect(result[9999].id).toBe('attendee-10000');
      expect(result[10000].id).toBe('attendee-10001');
      expect(result[14999].id).toBe('attendee-15000');
    });

    it('should correctly calculate offset for each batch', async () => {
      const batch1 = generateMockAttendees(5000, 0);
      const batch2 = generateMockAttendees(5000, 5000);
      const batch3 = generateMockAttendees(5000, 10000);

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: batch1, total: 15000 })
        .mockResolvedValueOnce({ documents: batch2, total: 15000 })
        .mockResolvedValueOnce({ documents: batch3, total: 15000 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      /**
       * Helper function to parse Query objects from Appwrite SDK
       * Query objects are JSON strings with structure: {"method":"limit","values":[5000]}
       * or {"method":"offset","values":[5000]}
       */
      const parseQueryObject = (query: any): { method: string; value?: number } | null => {
        try {
          // Query objects are JSON strings, parse them
          const str = String(query);
          const parsed = JSON.parse(str);

          if (parsed.method === 'limit' && Array.isArray(parsed.values) && parsed.values.length > 0) {
            return { method: 'limit', value: parsed.values[0] };
          }

          if (parsed.method === 'offset' && Array.isArray(parsed.values) && parsed.values.length > 0) {
            return { method: 'offset', value: parsed.values[0] };
          }

          return null;
        } catch {
          // If parsing fails, return null
          return null;
        }
      };

      const findQueryByMethod = (queries: any[], method: string): { method: string; value?: number } | null => {
        for (const query of queries) {
          const parsed = parseQueryObject(query);
          if (parsed && parsed.method === method) {
            return parsed;
          }
        }
        return null;
      };

      // Verify the second call (first attendees batch) has queries
      const firstBatchCall = mockDatabases.listDocuments.mock.calls[1];
      const firstBatchQueries = firstBatchCall[2] as any[];

      // First batch should have limit but no offset
      const firstBatchLimit = findQueryByMethod(firstBatchQueries, 'limit');
      const firstBatchOffset = findQueryByMethod(firstBatchQueries, 'offset');

      expect(firstBatchLimit, 'First batch should have limit query').not.toBeNull();
      expect(firstBatchLimit?.value, 'First batch limit should be 5000').toBe(5000);
      expect(firstBatchOffset, 'First batch should NOT have offset query').toBeNull();

      // Verify the third call (second batch) has both limit and offset
      const secondBatchCall = mockDatabases.listDocuments.mock.calls[2];
      const secondBatchQueries = secondBatchCall[2] as any[];

      const secondBatchLimit = findQueryByMethod(secondBatchQueries, 'limit');
      const secondBatchOffset = findQueryByMethod(secondBatchQueries, 'offset');

      expect(secondBatchLimit, 'Second batch should have limit query').not.toBeNull();
      expect(secondBatchLimit?.value, 'Second batch limit should be 5000').toBe(5000);
      expect(secondBatchOffset, 'Second batch should have offset query').not.toBeNull();
      expect(secondBatchOffset?.value, 'Second batch offset should be 5000').toBe(5000);

      // Verify the fourth call (third batch) has both limit and offset
      const thirdBatchCall = mockDatabases.listDocuments.mock.calls[3];
      const thirdBatchQueries = thirdBatchCall[2] as any[];

      const thirdBatchLimit = findQueryByMethod(thirdBatchQueries, 'limit');
      const thirdBatchOffset = findQueryByMethod(thirdBatchQueries, 'offset');

      expect(thirdBatchLimit, 'Third batch should have limit query').not.toBeNull();
      expect(thirdBatchLimit?.value, 'Third batch limit should be 5000').toBe(5000);
      expect(thirdBatchOffset, 'Third batch should have offset query').not.toBeNull();
      expect(thirdBatchOffset?.value, 'Third batch offset should be 10000').toBe(10000);
    });

    it('should preserve filters across all batches', async () => {
      mockReq.query = {
        firstName: JSON.stringify({ value: 'John', operator: 'contains' }),
      };

      const batch1 = generateMockAttendees(5000, 0);
      const batch2 = generateMockAttendees(1, 5000);

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: batch1, total: 5001 })
        .mockResolvedValueOnce({ documents: batch2, total: 5001 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify first batch has the search filter
      const firstBatchCall = mockDatabases.listDocuments.mock.calls[1];
      const firstBatchQueries = firstBatchCall[2] as any[];
      const firstBatchQueryStrings = firstBatchQueries.map(q => String(q));
      expect(firstBatchQueryStrings.some(q => q.toLowerCase().includes('search') || q.includes('John'))).toBe(true);

      // Verify second batch also has the search filter
      const secondBatchCall = mockDatabases.listDocuments.mock.calls[2];
      const secondBatchQueries = secondBatchCall[2] as any[];
      const secondBatchQueryStrings = secondBatchQueries.map(q => String(q));
      expect(secondBatchQueryStrings.some(q => q.toLowerCase().includes('search') || q.includes('John'))).toBe(true);
    });

    it('should preserve ordering across all batches', async () => {
      const batch1 = generateMockAttendees(5000, 0);
      const batch2 = generateMockAttendees(1, 5000);

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: batch1, total: 5001 })
        .mockResolvedValueOnce({ documents: batch2, total: 5001 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify first batch has orderDesc
      const firstBatchCall = mockDatabases.listDocuments.mock.calls[1];
      const firstBatchQueries = firstBatchCall[2] as any[];
      const firstBatchQueryStrings = firstBatchQueries.map(q => String(q));
      expect(firstBatchQueryStrings.some(q => q.toLowerCase().includes('order'))).toBe(true);

      // Verify second batch also has orderDesc
      const secondBatchCall = mockDatabases.listDocuments.mock.calls[2];
      const secondBatchQueries = secondBatchCall[2] as any[];
      const secondBatchQueryStrings = secondBatchQueries.map(q => String(q));
      expect(secondBatchQueryStrings.some(q => q.toLowerCase().includes('order'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly 5000 attendees without triggering batch logic', async () => {
      const mockAttendees = generateMockAttendees(5000);

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: mockAttendees, total: 5000 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify only single batch was fetched (2 calls total)
      expect(mockDatabases.listDocuments).toHaveBeenCalledTimes(2);

      // Verify no console warnings for exactly 5000
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Successfully fetched all'));

      // Verify all attendees are returned
      expect(statusMock).toHaveBeenCalledWith(200);
      const result = jsonMock.mock.calls[0][0];
      expect(result).toHaveLength(5000);
    });

    it('should return ALL custom fields including hidden ones with batch fetching', async () => {
      const mockCustomFieldsWithHidden = [
        { $id: 'field-visible', showOnMainPage: true },
        { $id: 'field-hidden', showOnMainPage: false },
      ];

      const batch1 = generateMockAttendees(5000, 0).map(attendee => ({
        ...attendee,
        customFieldValues: [
          { customFieldId: 'field-visible', value: 'visible value' },
          { customFieldId: 'field-hidden', value: 'hidden value' },
        ],
      }));
      const batch2 = generateMockAttendees(1, 5000).map(attendee => ({
        ...attendee,
        customFieldValues: [
          { customFieldId: 'field-visible', value: 'visible value' },
          { customFieldId: 'field-hidden', value: 'hidden value' },
        ],
      }));

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: mockCustomFieldsWithHidden, total: 2 })
        .mockResolvedValueOnce({ documents: batch1, total: 5001 })
        .mockResolvedValueOnce({ documents: batch2, total: 5001 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify all attendees are returned
      expect(statusMock).toHaveBeenCalledWith(200);
      const result = jsonMock.mock.calls[0][0];
      expect(result).toHaveLength(5001);

      // IMPORTANT: API returns ALL custom field values (including hidden ones)
      // This allows Advanced Filters to search on hidden fields
      expect(result[0].customFieldValues).toHaveLength(2);
      expect(result[0].customFieldValues.find((f: any) => f.customFieldId === 'field-visible')).toBeDefined();
      expect(result[0].customFieldValues.find((f: any) => f.customFieldId === 'field-hidden')).toBeDefined();
      expect(result[5000].customFieldValues).toHaveLength(2);
      expect(result[5000].customFieldValues.find((f: any) => f.customFieldId === 'field-visible')).toBeDefined();
      expect(result[5000].customFieldValues.find((f: any) => f.customFieldId === 'field-hidden')).toBeDefined();
    });

    it('should handle empty batches gracefully', async () => {
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify no batch fetching triggered
      expect(mockDatabases.listDocuments).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      // Verify empty array is returned
      expect(statusMock).toHaveBeenCalledWith(200);
      const result = jsonMock.mock.calls[0][0];
      expect(result).toHaveLength(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should make correct number of requests for various event sizes', async () => {
      const testCases = [
        { total: 1000, expectedBatches: 1, expectedCalls: 2 },
        { total: 5000, expectedBatches: 1, expectedCalls: 2 },
        { total: 5001, expectedBatches: 2, expectedCalls: 3 },
        { total: 10000, expectedBatches: 2, expectedCalls: 3 },
        { total: 15000, expectedBatches: 3, expectedCalls: 4 },
        { total: 20000, expectedBatches: 4, expectedCalls: 5 },
      ];

      for (const testCase of testCases) {
        // Reset all mocks for each test case
        resetAllMocks();
        consoleWarnSpy.mockClear();
        consoleLogSpy.mockClear();

        // Reset response mocks
        jsonMock = vi.fn();
        statusMock = vi.fn(() => ({ json: jsonMock }));
        mockRes.status = statusMock as any;

        // Re-inject user and userProfile after reset
        (mockReq as any).user = mockAuthUser;
        (mockReq as any).userProfile = {
          ...mockUserProfile,
          role: {
            id: mockAdminRole.$id,
            name: mockAdminRole.name,
            description: mockAdminRole.description,
            permissions: JSON.parse(mockAdminRole.permissions),
          },
        };

        const batches = [];
        const batchCount = Math.ceil(testCase.total / 5000);

        for (let i = 0; i < batchCount; i++) {
          const batchSize = Math.min(5000, testCase.total - i * 5000);
          batches.push(generateMockAttendees(batchSize, i * 5000));
        }

        mockAccount.get.mockResolvedValue(mockAuthUser);

        // Setup mock responses
        mockDatabases.listDocuments
          .mockResolvedValueOnce({ documents: mockCustomFields, total: 1 });

        batches.forEach(batch => {
          mockDatabases.listDocuments.mockResolvedValueOnce({
            documents: batch,
            total: testCase.total,
          });
        });

        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        // Verify correct number of database calls
        expect(mockDatabases.listDocuments).toHaveBeenCalledTimes(testCase.expectedCalls);

        // Verify console logs for large events
        if (testCase.total > 5000) {
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            `Large event detected: ${testCase.total} attendees. Fetching in batches...`
          );
          expect(consoleLogSpy).toHaveBeenCalledWith(
            `Successfully fetched all ${testCase.total} attendees in ${testCase.expectedBatches} batches`
          );
        } else {
          expect(consoleWarnSpy).not.toHaveBeenCalled();
        }

        // Verify all attendees are returned
        const result = jsonMock.mock.calls[0][0];
        expect(result).toHaveLength(testCase.total);
      }
    });
  });
});
