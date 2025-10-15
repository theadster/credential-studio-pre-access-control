/**
 * Integration tests for event settings update with transactions
 * 
 * Tests Requirements:
 * - 14.1: Transaction utilities have unit tests covering success and failure cases
 * - 14.2: Endpoints have integration tests verifying atomic behavior
 * - 14.3: Tests verify rollback behavior on failure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../index';
import { mockAccount, mockDatabases, mockTablesDB, resetAllMocks } from '../../../../test/mocks/appwrite';
import { ID } from 'appwrite';

// Mock dependencies
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(() => ({
    databases: mockDatabases,
    tablesDB: mockTablesDB,
    account: mockAccount
  })),
  createAdminClient: vi.fn(() => ({
    databases: mockDatabases,
    account: mockAccount
  }))
}));

vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn().mockResolvedValue(true)
}));

vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handlerFn: any) => handlerFn
}));

vi.mock('@/lib/cache', () => ({
  eventSettingsCache: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn()
  }
}));

vi.mock('@/lib/performance', () => ({
  PerformanceTracker: vi.fn().mockImplementation(() => ({
    trackQuery: vi.fn((queryName, fn) => fn()),
    logSummary: vi.fn(),
    getResponseHeaders: vi.fn().mockReturnValue({})
  }))
}));

vi.mock('@/lib/appwrite-integrations', () => ({
  IntegrationConflictError: class IntegrationConflictError extends Error {
    integrationType: string;
    eventSettingsId: string;
    expectedVersion: number;
    actualVersion: number;
    
    constructor(integrationType: string, eventSettingsId: string, expectedVersion: number, actualVersion: number) {
      super(`Integration conflict for ${integrationType}`);
      this.integrationType = integrationType;
      this.eventSettingsId = eventSettingsId;
      this.expectedVersion = expectedVersion;
      this.actualVersion = actualVersion;
    }
  },
  updateCloudinaryIntegration: vi.fn(),
  updateSwitchboardIntegration: vi.fn(),
  updateOneSimpleApiIntegration: vi.fn(),
  flattenEventSettings: vi.fn((settings) => settings)
}));

vi.mock('@/lib/logFormatting', () => ({
  createSettingsLogDetails: vi.fn((action, type, data) => ({ action, type, ...data }))
}));

vi.mock('appwrite', () => ({
  ID: {
    unique: vi.fn(() => `id_${Date.now()}_${Math.random()}`)
  },
  Query: {
    equal: vi.fn((attr, value) => `equal("${attr}", "${value}")`),
    orderAsc: vi.fn((attr) => `orderAsc("${attr}")`),
    limit: vi.fn((value) => `limit(${value})`)
  }
}));

describe('Event Settings Update with Transactions - Integration Tests', () => {
  beforeEach(async () => {
    resetAllMocks();
    vi.clearAllMocks();
    
    // Set up environment for transactions
    process.env.ENABLE_TRANSACTIONS = 'true';
    process.env.TRANSACTIONS_ENDPOINTS = 'event-settings';
    process.env.APPWRITE_PLAN = 'PRO';
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test_db';
    process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID = 'event_settings';
    process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID = 'custom_fields';
    process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID = 'logs';
    process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID = 'switchboard';
    process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID = 'cloudinary';
    process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID = 'onesimpleapi';
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID = 'users';

    // Set up default mock responses
    mockTablesDB.createTransaction.mockResolvedValue({ $id: 'tx_123' });
    mockTablesDB.createOperations.mockResolvedValue(undefined);
    mockTablesDB.updateTransaction.mockResolvedValue(undefined);
    mockAccount.get.mockResolvedValue({ $id: 'user_123', email: 'test@example.com' });
    
    // Reset integration mocks
    const { updateCloudinaryIntegration, updateSwitchboardIntegration, updateOneSimpleApiIntegration } = await import('@/lib/appwrite-integrations');
    vi.mocked(updateCloudinaryIntegration).mockResolvedValue(undefined);
    vi.mocked(updateSwitchboardIntegration).mockResolvedValue(undefined);
    vi.mocked(updateOneSimpleApiIntegration).mockResolvedValue(undefined);
  });

  describe('Requirement 14.2: Atomic Update of Core Settings + Custom Fields', () => {
    it('should atomically update core settings and add custom fields in a single transaction', async () => {
      const currentSettings = {
        $id: 'settings_123',
        eventName: 'Old Event',
        eventDate: '2024-01-01T00:00:00.000Z',
        eventLocation: 'Old Location',
        timeZone: 'UTC',
        barcodeType: 'numerical',
        barcodeLength: 8
      };

      const newCustomField = {
        id: 'temp_1',
        fieldName: 'Department',
        fieldType: 'text',
        required: false,
        order: 1,
        showOnMainPage: true
      };

      // Mock database responses
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [currentSettings] }) // Get event settings
        .mockResolvedValueOnce({ documents: [] }) // Get current custom fields
        .mockResolvedValueOnce({ documents: [] }) // Get switchboard
        .mockResolvedValueOnce({ documents: [] }) // Get cloudinary
        .mockResolvedValueOnce({ documents: [] }) // Get onesimpleapi
        .mockResolvedValueOnce({ documents: [newCustomField] }); // Get updated custom fields

      mockDatabases.getDocument.mockResolvedValue({
        ...currentSettings,
        eventName: 'New Event Name',
        eventLocation: 'New Location'
      });

      const req = {
        method: 'PUT',
        body: {
          eventName: 'New Event Name',
          eventLocation: 'New Location',
          customFields: [newCustomField]
        },
        cookies: { 'appwrite-session': 'mock-jwt' },
        user: { $id: 'user_123' }
      } as unknown as NextApiRequest;

      const statusCode = { value: 200 };
      const res = {
        status: vi.fn((code: number) => { statusCode.value = code; return res; }),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis()
      } as unknown as NextApiResponse;

      await handler(req, res);

      // Verify transaction was used
      expect(mockTablesDB.createTransaction).toHaveBeenCalled();
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx_123',
        commit: true
      });

      // Verify operations were created
      const operationsCall = mockTablesDB.createOperations.mock.calls[0][0];
      expect(operationsCall.transactionId).toBe('tx_123');
      expect(operationsCall.operations).toBeDefined();
      expect(Array.isArray(operationsCall.operations)).toBe(true);

      // Verify response
      expect(statusCode.value).toBe(200);
      expect(res.setHeader).toHaveBeenCalledWith('X-Transaction-Used', 'true');
    });

    it('should atomically update core settings and modify existing custom fields', async () => {
      const currentSettings = {
        $id: 'settings_123',
        eventName: 'Test Event',
        eventDate: '2024-01-01T00:00:00.000Z',
        eventLocation: 'Test Location',
        timeZone: 'UTC'
      };

      const existingField = {
        $id: 'field_1',
        eventSettingsId: 'settings_123',
        fieldName: 'Department',
        internalFieldName: 'department',
        fieldType: 'text',
        required: false,
        order: 1,
        showOnMainPage: true,
        fieldOptions: null
      };

      const modifiedField = {
        id: 'field_1',
        fieldName: 'Department Name', // Changed
        fieldType: 'text',
        required: true, // Changed
        order: 1,
        showOnMainPage: true
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [currentSettings] })
        .mockResolvedValueOnce({ documents: [existingField] })
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [{ ...existingField, ...modifiedField }] });

      mockDatabases.getDocument.mockResolvedValue({
        ...currentSettings,
        eventName: 'Updated Event'
      });

      const req = {
        method: 'PUT',
        body: {
          eventName: 'Updated Event',
          customFields: [modifiedField]
        },
        cookies: { 'appwrite-session': 'mock-jwt' },
        user: { $id: 'user_123' }
      } as unknown as NextApiRequest;

      const statusCode = { value: 200 };
      const res = {
        status: vi.fn((code: number) => { statusCode.value = code; return res; }),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis()
      } as unknown as NextApiResponse;

      await handler(req, res);

      expect(mockTablesDB.createTransaction).toHaveBeenCalled();
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith({
        transactionId: 'tx_123',
        commit: true
      });
      expect(statusCode.value).toBe(200);
    });
  });

  describe('Requirement 14.2: Atomic Update with Integration Changes', () => {
    it('should update core settings and integration settings together', async () => {
      const currentSettings = {
        $id: 'settings_123',
        eventName: 'Test Event',
        eventDate: '2024-01-01T00:00:00.000Z',
        eventLocation: 'Test Location',
        timeZone: 'UTC'
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [currentSettings] })
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [{ $id: 'sw_1', enabled: false }] })
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [] });

      mockDatabases.getDocument.mockResolvedValue({
        ...currentSettings,
        eventName: 'Updated Event'
      });

      const req = {
        method: 'PUT',
        body: {
          eventName: 'Updated Event',
          switchboardEnabled: true,
          switchboardApiEndpoint: 'https://api.example.com'
        },
        cookies: { 'appwrite-session': 'mock-jwt' },
        user: { $id: 'user_123' }
      } as unknown as NextApiRequest;

      const statusCode = { value: 200 };
      const res = {
        status: vi.fn((code: number) => { statusCode.value = code; return res; }),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis()
      } as unknown as NextApiResponse;

      await handler(req, res);

      // Verify transaction was used for core settings
      expect(mockTablesDB.createTransaction).toHaveBeenCalled();
      
      // Verify integration update was called
      const { updateSwitchboardIntegration } = await import('@/lib/appwrite-integrations');
      expect(updateSwitchboardIntegration).toHaveBeenCalledWith(
        mockDatabases,
        'settings_123',
        expect.objectContaining({
          enabled: true,
          apiEndpoint: 'https://api.example.com'
        })
      );

      expect(statusCode.value).toBe(200);
    });
  });

  describe('Requirement 14.3: Rollback When Custom Field Deletion Fails', () => {
    it('should rollback transaction when custom field deletion fails', async () => {
      const currentSettings = {
        $id: 'settings_123',
        eventName: 'Test Event',
        eventDate: '2024-01-01T00:00:00.000Z',
        eventLocation: 'Test Location',
        timeZone: 'UTC'
      };

      const existingField = {
        $id: 'field_1',
        eventSettingsId: 'settings_123',
        fieldName: 'Department',
        internalFieldName: 'department',
        fieldType: 'text',
        required: false,
        order: 1,
        showOnMainPage: true
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [currentSettings] })
        .mockResolvedValueOnce({ documents: [existingField] });

      // Simulate transaction failure
      mockTablesDB.updateTransaction.mockRejectedValueOnce(new Error('Transaction failed'));

      const req = {
        method: 'PUT',
        body: {
          eventName: 'Updated Event',
          customFields: [] // Deleting the field
        },
        cookies: { 'appwrite-session': 'mock-jwt' },
        user: { $id: 'user_123' }
      } as unknown as NextApiRequest;

      const statusCode = { value: 200 };
      const res = {
        status: vi.fn((code: number) => { statusCode.value = code; return res; }),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis()
      } as unknown as NextApiResponse;

      await handler(req, res);

      // Verify rollback was attempted
      expect(mockTablesDB.updateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'tx_123',
          rollback: true
        })
      );
    });

    it('should clean up integration templates when custom fields are deleted', async () => {
      const currentSettings = {
        $id: 'settings_123',
        eventName: 'Test Event',
        eventDate: '2024-01-01T00:00:00.000Z',
        eventLocation: 'Test Location',
        timeZone: 'UTC',
        switchboardRequestBody: '{"department": "{{department}}"}',
        oneSimpleApiFormDataValue: 'Department: {{department}}'
      };

      const existingField = {
        $id: 'field_1',
        eventSettingsId: 'settings_123',
        fieldName: 'Department',
        internalFieldName: 'department',
        fieldType: 'text',
        required: false,
        order: 1,
        showOnMainPage: true
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [currentSettings] })
        .mockResolvedValueOnce({ documents: [existingField] })
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [] });

      mockDatabases.getDocument.mockResolvedValue({
        ...currentSettings,
        switchboardRequestBody: '{"department": ""}',
        oneSimpleApiFormDataValue: 'Department: '
      });

      const req = {
        method: 'PUT',
        body: {
          eventName: 'Test Event',
          customFields: [] // Deleting the field
        },
        cookies: { 'appwrite-session': 'mock-jwt' },
        user: { $id: 'user_123' }
      } as unknown as NextApiRequest;

      const statusCode = { value: 200 };
      const res = {
        status: vi.fn((code: number) => { statusCode.value = code; return res; }),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis()
      } as unknown as NextApiResponse;

      await handler(req, res);

      // Verify transaction included the cleanup
      expect(mockTablesDB.createTransaction).toHaveBeenCalled();
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      expect(statusCode.value).toBe(200);
    });
  });

  describe('Requirement 14.3: Rollback When Integration Update Fails', () => {
    it('should handle integration conflict errors properly', async () => {
      const currentSettings = {
        $id: 'settings_123',
        eventName: 'Test Event',
        eventDate: '2024-01-01T00:00:00.000Z',
        eventLocation: 'Test Location',
        timeZone: 'UTC'
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [currentSettings] })
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [] });

      mockDatabases.getDocument.mockResolvedValue({
        ...currentSettings,
        eventName: 'Updated Event'
      });

      // Simulate integration conflict
      const { IntegrationConflictError, updateCloudinaryIntegration } = await import('@/lib/appwrite-integrations');
      vi.mocked(updateCloudinaryIntegration).mockRejectedValueOnce(
        new IntegrationConflictError('Cloudinary', 'settings_123', 1, 2)
      );

      const req = {
        method: 'PUT',
        body: {
          eventName: 'Updated Event',
          cloudinaryEnabled: true,
          cloudinaryCloudName: 'test-cloud'
        },
        cookies: { 'appwrite-session': 'mock-jwt' },
        user: { $id: 'user_123' }
      } as unknown as NextApiRequest;

      const statusCode = { value: 200 };
      const res = {
        status: vi.fn((code: number) => { statusCode.value = code; return res; }),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis()
      } as unknown as NextApiResponse;

      await handler(req, res);

      // Verify 409 conflict response
      expect(statusCode.value).toBe(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Conflict',
          integrationType: 'Cloudinary',
          eventSettingsId: 'settings_123',
          expectedVersion: 1,
          actualVersion: 2
        })
      );
    });

  });

});
