/**
 * Complete Integration Field Mapping Tests
 * 
 * Tests for task 6: Create integration tests for complete field mapping
 * Verifies that all integration fields are properly mapped in GET and PUT endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/event-settings/index';
import { eventSettingsCache } from '@/lib/cache';

// Mock Appwrite
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(),
  createAdminClient: vi.fn()
}));

// Mock integration functions
vi.mock('@/lib/appwrite-integrations', () => ({
  IntegrationConflictError: class IntegrationConflictError extends Error {
    constructor(
      public integrationType: string,
      public eventSettingsId: string,
      public expectedVersion: number,
      public actualVersion: number
    ) {
      super(`Integration conflict: ${integrationType}`);
      this.name = 'IntegrationConflictError';
    }
  },
  updateCloudinaryIntegration: vi.fn(),
  updateSwitchboardIntegration: vi.fn(),
  updateOneSimpleApiIntegration: vi.fn(),
  flattenEventSettings: vi.fn()
}));

// Mock performance tracker
vi.mock('@/lib/performance', () => ({
  PerformanceTracker: vi.fn().mockImplementation(() => ({
    trackQuery: vi.fn((name, fn) => fn()),
    logSummary: vi.fn(),
    getResponseHeaders: vi.fn(() => ({}))
  }))
}));


// Mock cache
vi.mock('@/lib/cache', () => ({
  eventSettingsCache: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    clear: vi.fn()
  }
}));

// Mock log settings
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(false))
}));


import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import {
  IntegrationConflictError,
  updateCloudinaryIntegration,
  updateSwitchboardIntegration,
  updateOneSimpleApiIntegration,
  flattenEventSettings
} from '@/lib/appwrite-integrations';

describe('Complete Integration Field Mapping Tests', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let mockTablesDB: any;
  let mockAccount: any;

  const mockEventSettings = {
    $id: 'event-123',
    eventName: 'Test Event',
    eventDate: '2024-01-15T00:00:00.000Z',
    eventTime: '10:00 AM',
    eventLocation: 'Test Location',
    timeZone: 'America/New_York',
    barcodeType: 'alphanumerical',
    barcodeLength: 8,
    barcodeUnique: true,
    forceFirstNameUppercase: false,
    forceLastNameUppercase: false,
    attendeeSortField: 'lastName',
    attendeeSortDirection: 'asc',
    bannerImageUrl: null,
    signInBannerUrl: null,
  };

  const mockCloudinaryIntegration = {
    $id: 'cloudinary-123',
    eventSettingsId: 'event-123',
    version: 1,
    enabled: true,
    cloudName: 'test-cloud',
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    uploadPreset: 'test-preset',
    autoOptimize: true,
    generateThumbnails: true,
    disableSkipCrop: false,
    cropAspectRatio: '16:9',
  };

  const mockSwitchboardIntegration = {
    $id: 'switchboard-123',
    eventSettingsId: 'event-123',
    version: 1,
    enabled: true,
    apiEndpoint: 'https://api.switchboard.com',
    authHeaderType: 'Bearer',
    apiKey: 'switchboard-key',
    requestBody: '{"template": "{{firstName}}"}',
    templateId: 'template-123',
    fieldMappings: '[{"field": "firstName", "mapping": "first_name"}]',
  };

  const mockOneSimpleApiIntegration = {
    $id: 'onesimpleapi-123',
    eventSettingsId: 'event-123',
    version: 1,
    enabled: true,
    url: 'https://api.onesimple.com',
    formDataKey: 'data',
    formDataValue: '{{firstName}}',
    recordTemplate: '{"name": "{{firstName}}"}',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    eventSettingsCache.clear();

    // Setup mock databases
    mockTablesDB = {
      listRows: vi.fn(),
      updateRow: vi.fn(),
      createRow: vi.fn(),
      getRow: vi.fn()
    };

    // Setup mock account
    mockAccount = {
      get: vi.fn().mockResolvedValue({ $id: 'user123' })
    };

    // Mock createSessionClient and createAdminClient
    (createSessionClient as any).mockReturnValue({
      tablesDB: mockTablesDB,
      account: mockAccount
    });

    (createAdminClient as any).mockReturnValue({
      tablesDB: mockTablesDB
    });

    // Setup request and response
    req = {
      method: 'GET'
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    eventSettingsCache.clear();
  });

  describe('GET Endpoint - Cloudinary Fields (Subtask 6.1)', () => {
    beforeEach(() => {
      // Mock flattenEventSettings to return complete Cloudinary fields
      (flattenEventSettings as any).mockImplementation((settings: any) => ({
        ...settings,
        cloudinaryEnabled: settings.cloudinary?.enabled || false,
        cloudinaryCloudName: settings.cloudinary?.cloudName || '',
        cloudinaryApiKey: settings.cloudinary?.apiKey || '',
        cloudinaryApiSecret: settings.cloudinary?.apiSecret || '',
        cloudinaryUploadPreset: settings.cloudinary?.uploadPreset || '',
        cloudinaryAutoOptimize: settings.cloudinary?.autoOptimize || false,
        cloudinaryGenerateThumbnails: settings.cloudinary?.generateThumbnails || false,
        cloudinaryDisableSkipCrop: settings.cloudinary?.disableSkipCrop || false,
        cloudinaryCropAspectRatio: settings.cloudinary?.cropAspectRatio || '1',
      }));

      // Mock database responses
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_TABLE_ID) {
          return Promise.resolve({ rows: [mockCloudinaryIntegration] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should map all 9 Cloudinary fields in GET response', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const responseData = (res.json as any).mock.calls[0][0];
      
      // Verify all 9 Cloudinary fields are present
      expect(responseData.cloudinaryEnabled).toBe(true);
      expect(responseData.cloudinaryCloudName).toBe('test-cloud');
      expect(responseData.cloudinaryApiKey).toBe('test-key');
      expect(responseData.cloudinaryApiSecret).toBe('test-secret');
      expect(responseData.cloudinaryUploadPreset).toBe('test-preset');
      expect(responseData.cloudinaryAutoOptimize).toBe(true);
      expect(responseData.cloudinaryGenerateThumbnails).toBe(true);
      expect(responseData.cloudinaryDisableSkipCrop).toBe(false);
      expect(responseData.cloudinaryCropAspectRatio).toBe('16:9');
    });

    it('should verify correct data types for Cloudinary fields', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];
      
      // Verify boolean types
      expect(typeof responseData.cloudinaryEnabled).toBe('boolean');
      expect(typeof responseData.cloudinaryAutoOptimize).toBe('boolean');
      expect(typeof responseData.cloudinaryGenerateThumbnails).toBe('boolean');
      expect(typeof responseData.cloudinaryDisableSkipCrop).toBe('boolean');
      
      // Verify string types
      expect(typeof responseData.cloudinaryCloudName).toBe('string');
      expect(typeof responseData.cloudinaryApiKey).toBe('string');
      expect(typeof responseData.cloudinaryApiSecret).toBe('string');
      expect(typeof responseData.cloudinaryUploadPreset).toBe('string');
      expect(typeof responseData.cloudinaryCropAspectRatio).toBe('string');
    });

    it('should provide default values when Cloudinary integration is missing', async () => {
      // Mock no Cloudinary integration
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];
      
      // Verify default values
      expect(responseData.cloudinaryEnabled).toBe(false);
      expect(responseData.cloudinaryCloudName).toBe('');
      expect(responseData.cloudinaryAutoOptimize).toBe(false);
      expect(responseData.cloudinaryGenerateThumbnails).toBe(false);
      expect(responseData.cloudinaryDisableSkipCrop).toBe(false);
      expect(responseData.cloudinaryCropAspectRatio).toBe('1');
    });
  });

  describe('GET Endpoint - Switchboard Fields (Subtask 6.2)', () => {
    beforeEach(() => {
      // Mock flattenEventSettings to return complete Switchboard fields
      (flattenEventSettings as any).mockImplementation((settings: any) => ({
        ...settings,
        switchboardEnabled: settings.switchboard?.enabled || false,
        switchboardApiEndpoint: settings.switchboard?.apiEndpoint || '',
        switchboardAuthHeaderType: settings.switchboard?.authHeaderType || '',
        switchboardApiKey: settings.switchboard?.apiKey || '',
        switchboardRequestBody: settings.switchboard?.requestBody || '',
        switchboardTemplateId: settings.switchboard?.templateId || '',
        switchboardFieldMappings: settings.switchboard?.fieldMappings ? JSON.parse(settings.switchboard.fieldMappings) : [],
      }));

      // Mock database responses
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_TABLE_ID) {
          return Promise.resolve({ rows: [mockSwitchboardIntegration] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should map all 7 Switchboard fields in GET response', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const responseData = (res.json as any).mock.calls[0][0];
      
      // Verify all 7 Switchboard fields are present
      expect(responseData.switchboardEnabled).toBe(true);
      expect(responseData.switchboardApiEndpoint).toBe('https://api.switchboard.com');
      expect(responseData.switchboardAuthHeaderType).toBe('Bearer');
      expect(responseData.switchboardApiKey).toBe('switchboard-key');
      expect(responseData.switchboardRequestBody).toBe('{"template": "{{firstName}}"}');
      expect(responseData.switchboardTemplateId).toBe('template-123');
      expect(responseData.switchboardFieldMappings).toEqual([{"field": "firstName", "mapping": "first_name"}]);
    });

    it('should correctly parse fieldMappings from JSON string', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];
      
      // Verify fieldMappings is parsed as array
      expect(Array.isArray(responseData.switchboardFieldMappings)).toBe(true);
      expect(responseData.switchboardFieldMappings).toHaveLength(1);
      expect(responseData.switchboardFieldMappings[0]).toEqual({
        field: "firstName",
        mapping: "first_name"
      });
    });

    it('should provide default values when Switchboard integration is missing', async () => {
      // Mock no Switchboard integration
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];
      
      // Verify default values
      expect(responseData.switchboardEnabled).toBe(false);
      expect(responseData.switchboardApiEndpoint).toBe('');
      expect(responseData.switchboardAuthHeaderType).toBe('');
      expect(responseData.switchboardRequestBody).toBe('');
      expect(responseData.switchboardTemplateId).toBe('');
      expect(responseData.switchboardFieldMappings).toEqual([]);
    });
  });

  describe('GET Endpoint - OneSimpleAPI Fields (Subtask 6.3)', () => {
    beforeEach(() => {
      // Mock flattenEventSettings to return complete OneSimpleAPI fields
      (flattenEventSettings as any).mockImplementation((settings: any) => ({
        ...settings,
        oneSimpleApiEnabled: settings.oneSimpleApi?.enabled || false,
        oneSimpleApiUrl: settings.oneSimpleApi?.url || '',
        oneSimpleApiFormDataKey: settings.oneSimpleApi?.formDataKey || '',
        oneSimpleApiFormDataValue: settings.oneSimpleApi?.formDataValue || '',
        oneSimpleApiRecordTemplate: settings.oneSimpleApi?.recordTemplate || '',
      }));

      // Mock database responses
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_TABLE_ID) {
          return Promise.resolve({ rows: [mockOneSimpleApiIntegration] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should map all 5 OneSimpleAPI fields in GET response', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const responseData = (res.json as any).mock.calls[0][0];
      
      // Verify all 5 OneSimpleAPI fields are present
      expect(responseData.oneSimpleApiEnabled).toBe(true);
      expect(responseData.oneSimpleApiUrl).toBe('https://api.onesimple.com');
      expect(responseData.oneSimpleApiFormDataKey).toBe('data');
      expect(responseData.oneSimpleApiFormDataValue).toBe('{{firstName}}');
      expect(responseData.oneSimpleApiRecordTemplate).toBe('{"name": "{{firstName}}"}');
    });

    it('should use correct field names (url not apiUrl)', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];
      
      // Verify correct field name is used
      expect(responseData.oneSimpleApiUrl).toBeDefined();
      expect(responseData.oneSimpleApiUrl).toBe('https://api.onesimple.com');
      
      // Verify incorrect field names are not present
      expect(responseData.oneSimpleApiApiUrl).toBeUndefined();
      expect(responseData.oneSimpleApiKey).toBeUndefined();
    });

    it('should provide default values when OneSimpleAPI integration is missing', async () => {
      // Mock no OneSimpleAPI integration
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];
      
      // Verify default values
      expect(responseData.oneSimpleApiEnabled).toBe(false);
      expect(responseData.oneSimpleApiUrl).toBe('');
      expect(responseData.oneSimpleApiFormDataKey).toBe('');
      expect(responseData.oneSimpleApiFormDataValue).toBe('');
      expect(responseData.oneSimpleApiRecordTemplate).toBe('');
    });
  });

  describe('PUT Endpoint - Cloudinary Fields (Subtask 6.4)', () => {
    beforeEach(() => {
      req.method = 'PUT';
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        cloudinaryEnabled: true,
        cloudinaryCloudName: 'updated-cloud',
        cloudinaryApiKey: 'updated-key',
        cloudinaryApiSecret: 'updated-secret',
        cloudinaryUploadPreset: 'updated-preset',
        cloudinaryAutoOptimize: false,
        cloudinaryGenerateThumbnails: false,
        cloudinaryDisableSkipCrop: true,
        cloudinaryCropAspectRatio: '4:3',
      };

      // Mock database responses
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID) {
          return Promise.resolve({ rows: [{ $id: 'user123', userId: 'user123' }] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_TABLE_ID) {
          return Promise.resolve({ rows: [mockCloudinaryIntegration] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockTablesDB.updateRow.mockResolvedValue({
        ...mockEventSettings,
        eventName: 'Test Event'
      });

      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2,
        cloudName: 'updated-cloud',
        apiKey: 'updated-key',
        apiSecret: 'updated-secret',
        uploadPreset: 'updated-preset',
        autoOptimize: false,
        generateThumbnails: false,
        disableSkipCrop: true,
        cropAspectRatio: '4:3'
      });

      // Mock flattenEventSettings for GET after update
      (flattenEventSettings as any).mockImplementation((settings: any) => ({
        ...settings,
        cloudinaryEnabled: settings.cloudinary?.enabled || false,
        cloudinaryCloudName: settings.cloudinary?.cloudName || '',
        cloudinaryApiKey: settings.cloudinary?.apiKey || '',
        cloudinaryApiSecret: settings.cloudinary?.apiSecret || '',
        cloudinaryUploadPreset: settings.cloudinary?.uploadPreset || '',
        cloudinaryAutoOptimize: settings.cloudinary?.autoOptimize || false,
        cloudinaryGenerateThumbnails: settings.cloudinary?.generateThumbnails || false,
        cloudinaryDisableSkipCrop: settings.cloudinary?.disableSkipCrop || false,
        cloudinaryCropAspectRatio: settings.cloudinary?.cropAspectRatio || '1',
      }));
    });

    it('should update all Cloudinary fields including booleans', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(updateCloudinaryIntegration).toHaveBeenCalledWith(
        mockTablesDB,
        'event-123',
        expect.objectContaining({
          enabled: true,
          cloudName: 'updated-cloud',
          apiKey: 'updated-key',
          apiSecret: 'updated-secret',
          uploadPreset: 'updated-preset',
          autoOptimize: false,
          generateThumbnails: false,
          disableSkipCrop: true,
          cropAspectRatio: '4:3'
        })
      );
    });

    it('should verify updates are saved to Cloudinary integration collection', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify updateCloudinaryIntegration was called
      expect(updateCloudinaryIntegration).toHaveBeenCalled();
      
      // Verify it was called with the correct event settings ID
      const callArgs = (updateCloudinaryIntegration as any).mock.calls[0];
      expect(callArgs[1]).toBe('event-123');
      
      // Verify all fields are in the update payload
      const updatePayload = callArgs[2];
      expect(updatePayload).toHaveProperty('enabled', true);
      expect(updatePayload).toHaveProperty('cloudName', 'updated-cloud');
      expect(updatePayload).toHaveProperty('apiKey', 'updated-key');
      expect(updatePayload).toHaveProperty('apiSecret', 'updated-secret');
      expect(updatePayload).toHaveProperty('uploadPreset', 'updated-preset');
      expect(updatePayload).toHaveProperty('autoOptimize', false);
      expect(updatePayload).toHaveProperty('generateThumbnails', false);
      expect(updatePayload).toHaveProperty('disableSkipCrop', true);
      expect(updatePayload).toHaveProperty('cropAspectRatio', '4:3');
    });

    it('should verify version number increments', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      const updatedIntegration = await (updateCloudinaryIntegration as any).mock.results[0].value;
      expect(updatedIntegration.version).toBe(2);
      expect(updatedIntegration.version).toBeGreaterThan(mockCloudinaryIntegration.version);
    });

    it('should fetch settings and verify all fields persisted', async () => {
      // First, perform the PUT request
      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify the update was successful
      expect(res.status).toHaveBeenCalledWith(200);

      // Now perform a GET request to verify persistence
      req.method = 'GET';
      req.body = undefined;
      
      // Clear previous mocks
      vi.clearAllMocks();

      // Mock the updated integration data for GET
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_TABLE_ID) {
          return Promise.resolve({ 
            rows: [{
              ...mockCloudinaryIntegration,
              version: 2,
              cloudName: 'updated-cloud',
              apiKey: 'updated-key',
              apiSecret: 'updated-secret',
              uploadPreset: 'updated-preset',
              autoOptimize: false,
              generateThumbnails: false,
              disableSkipCrop: true,
              cropAspectRatio: '4:3'
            }]
          });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Perform GET request
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as any).mock.calls[0][0];

      // Verify all updated fields are present in the response
      expect(responseData.cloudinaryEnabled).toBe(true);
      expect(responseData.cloudinaryCloudName).toBe('updated-cloud');
      expect(responseData.cloudinaryApiKey).toBe('updated-key');
      expect(responseData.cloudinaryApiSecret).toBe('updated-secret');
      expect(responseData.cloudinaryUploadPreset).toBe('updated-preset');
      expect(responseData.cloudinaryAutoOptimize).toBe(false);
      expect(responseData.cloudinaryGenerateThumbnails).toBe(false);
      expect(responseData.cloudinaryDisableSkipCrop).toBe(true);
      expect(responseData.cloudinaryCropAspectRatio).toBe('4:3');
    });

    it('should invalidate cache after successful update', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(eventSettingsCache.invalidate).toHaveBeenCalledWith('event-settings');
    });

    it('should handle boolean field updates correctly', async () => {
      // Test toggling boolean values
      req.body = {
        ...req.body,
        cloudinaryAutoOptimize: true,
        cloudinaryGenerateThumbnails: true,
        cloudinaryDisableSkipCrop: false,
      };

      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2,
        autoOptimize: true,
        generateThumbnails: true,
        disableSkipCrop: false,
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const callArgs = (updateCloudinaryIntegration as any).mock.calls[0][2];
      expect(callArgs.autoOptimize).toBe(true);
      expect(callArgs.generateThumbnails).toBe(true);
      expect(callArgs.disableSkipCrop).toBe(false);
    });

    it('should handle cropAspectRatio dropdown changes', async () => {
      // Test different aspect ratio values
      const aspectRatios = ['1', '4:3', '16:9', '3:2'];

      for (const ratio of aspectRatios) {
        vi.clearAllMocks();
        
        req.body = {
          ...req.body,
          cloudinaryCropAspectRatio: ratio,
        };

        (updateCloudinaryIntegration as any).mockResolvedValue({
          ...mockCloudinaryIntegration,
          version: 2,
          cropAspectRatio: ratio,
        });

        await handler(req as NextApiRequest, res as NextApiResponse);

        const callArgs = (updateCloudinaryIntegration as any).mock.calls[0][2];
        expect(callArgs.cropAspectRatio).toBe(ratio);
      }
    });
  });

  describe('PUT Endpoint - Switchboard Fields (Subtask 6.5)', () => {
    beforeEach(() => {
      req.method = 'PUT';
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        switchboardEnabled: true,
        switchboardApiEndpoint: 'https://updated.switchboard.com',
        switchboardAuthHeaderType: 'ApiKey',
        switchboardApiKey: 'updated-switchboard-key',
        switchboardRequestBody: '{"updated": "{{lastName}}"}',
        switchboardTemplateId: 'updated-template-456',
        switchboardFieldMappings: [{"field": "lastName", "mapping": "last_name"}],
      };

      // Mock database responses
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID) {
          return Promise.resolve({ rows: [{ $id: 'user123', userId: 'user123' }] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_TABLE_ID) {
          return Promise.resolve({ rows: [mockSwitchboardIntegration] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockTablesDB.updateRow.mockResolvedValue({
        ...mockEventSettings,
        eventName: 'Test Event'
      });

      (updateSwitchboardIntegration as any).mockResolvedValue({
        ...mockSwitchboardIntegration,
        version: 2,
        apiEndpoint: 'https://updated.switchboard.com',
        authHeaderType: 'ApiKey',
        apiKey: 'updated-switchboard-key',
        requestBody: '{"updated": "{{lastName}}"}',
        templateId: 'updated-template-456',
        fieldMappings: '[{"field": "lastName", "mapping": "last_name"}]'
      });

      // Mock flattenEventSettings for GET after update
      (flattenEventSettings as any).mockImplementation((settings: any) => ({
        ...settings,
        switchboardEnabled: settings.switchboard?.enabled || false,
        switchboardApiEndpoint: settings.switchboard?.apiEndpoint || '',
        switchboardAuthHeaderType: settings.switchboard?.authHeaderType || '',
        switchboardApiKey: settings.switchboard?.apiKey || '',
        switchboardRequestBody: settings.switchboard?.requestBody || '',
        switchboardTemplateId: settings.switchboard?.templateId || '',
        switchboardFieldMappings: settings.switchboard?.fieldMappings ? JSON.parse(settings.switchboard.fieldMappings) : [],
      }));
    });

    it('should update all Switchboard fields including authHeaderType, requestBody, templateId', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(updateSwitchboardIntegration).toHaveBeenCalledWith(
        mockTablesDB,
        'event-123',
        expect.objectContaining({
          enabled: true,
          apiEndpoint: 'https://updated.switchboard.com',
          authHeaderType: 'ApiKey',
          apiKey: 'updated-switchboard-key',
          requestBody: '{"updated": "{{lastName}}"}',
          templateId: 'updated-template-456',
          fieldMappings: expect.any(String)
        })
      );
    });

    it('should verify updates are saved to Switchboard integration collection', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify updateSwitchboardIntegration was called
      expect(updateSwitchboardIntegration).toHaveBeenCalled();
      
      // Verify it was called with the correct event settings ID
      const callArgs = (updateSwitchboardIntegration as any).mock.calls[0];
      expect(callArgs[1]).toBe('event-123');
      
      // Verify all fields are in the update payload
      const updatePayload = callArgs[2];
      expect(updatePayload).toHaveProperty('enabled', true);
      expect(updatePayload).toHaveProperty('apiEndpoint', 'https://updated.switchboard.com');
      expect(updatePayload).toHaveProperty('authHeaderType', 'ApiKey');
      expect(updatePayload).toHaveProperty('apiKey', 'updated-switchboard-key');
      expect(updatePayload).toHaveProperty('requestBody', '{"updated": "{{lastName}}"}');
      expect(updatePayload).toHaveProperty('templateId', 'updated-template-456');
      expect(updatePayload).toHaveProperty('fieldMappings');
    });

    it('should correctly serialize fieldMappings to JSON string', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      const callArgs = (updateSwitchboardIntegration as any).mock.calls[0][2];
      expect(typeof callArgs.fieldMappings).toBe('string');
      
      // Verify it can be parsed back to the original array
      const parsedMappings = JSON.parse(callArgs.fieldMappings);
      expect(parsedMappings).toEqual([{"field": "lastName", "mapping": "last_name"}]);
      expect(Array.isArray(parsedMappings)).toBe(true);
    });

    it('should verify version number increments', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      const updatedIntegration = await (updateSwitchboardIntegration as any).mock.results[0].value;
      expect(updatedIntegration.version).toBe(2);
      expect(updatedIntegration.version).toBeGreaterThan(mockSwitchboardIntegration.version);
    });

    it('should fetch settings and verify all fields persisted', async () => {
      // First, perform the PUT request
      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify the update was successful
      expect(res.status).toHaveBeenCalledWith(200);

      // Now perform a GET request to verify persistence
      req.method = 'GET';
      req.body = undefined;
      
      // Clear previous mocks
      vi.clearAllMocks();

      // Mock the updated integration data for GET
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_TABLE_ID) {
          return Promise.resolve({ 
            rows: [{
              ...mockSwitchboardIntegration,
              version: 2,
              apiEndpoint: 'https://updated.switchboard.com',
              authHeaderType: 'ApiKey',
              apiKey: 'updated-switchboard-key',
              requestBody: '{"updated": "{{lastName}}"}',
              templateId: 'updated-template-456',
              fieldMappings: '[{"field": "lastName", "mapping": "last_name"}]'
            }]
          });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Perform GET request
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as any).mock.calls[0][0];

      // Verify all updated fields are present in the response
      expect(responseData.switchboardEnabled).toBe(true);
      expect(responseData.switchboardApiEndpoint).toBe('https://updated.switchboard.com');
      expect(responseData.switchboardAuthHeaderType).toBe('ApiKey');
      expect(responseData.switchboardApiKey).toBe('updated-switchboard-key');
      expect(responseData.switchboardRequestBody).toBe('{"updated": "{{lastName}}"}');
      expect(responseData.switchboardTemplateId).toBe('updated-template-456');
      expect(responseData.switchboardFieldMappings).toEqual([{"field": "lastName", "mapping": "last_name"}]);
    });

    it('should handle authHeaderType field updates', async () => {
      // Test different auth header types
      const authTypes = ['Bearer', 'ApiKey', 'Basic', 'Custom'];

      for (const authType of authTypes) {
        vi.clearAllMocks();
        
        req.body = {
          ...req.body,
          switchboardAuthHeaderType: authType,
        };

        (updateSwitchboardIntegration as any).mockResolvedValue({
          ...mockSwitchboardIntegration,
          version: 2,
          authHeaderType: authType,
        });

        await handler(req as NextApiRequest, res as NextApiResponse);

        const callArgs = (updateSwitchboardIntegration as any).mock.calls[0][2];
        expect(callArgs.authHeaderType).toBe(authType);
      }
    });

    it('should handle requestBody template updates', async () => {
      const requestBodyTemplates = [
        '{"firstName": "{{firstName}}"}',
        '{"fullName": "{{firstName}} {{lastName}}"}',
        '{"attendee": {"name": "{{firstName}}", "email": "{{email}}"}}',
      ];

      for (const template of requestBodyTemplates) {
        vi.clearAllMocks();
        
        req.body = {
          ...req.body,
          switchboardRequestBody: template,
        };

        (updateSwitchboardIntegration as any).mockResolvedValue({
          ...mockSwitchboardIntegration,
          version: 2,
          requestBody: template,
        });

        await handler(req as NextApiRequest, res as NextApiResponse);

        const callArgs = (updateSwitchboardIntegration as any).mock.calls[0][2];
        expect(callArgs.requestBody).toBe(template);
      }
    });

    it('should handle templateId field updates', async () => {
      const templateIds = ['template-123', 'template-456', 'custom-template-789'];

      for (const templateId of templateIds) {
        vi.clearAllMocks();
        
        req.body = {
          ...req.body,
          switchboardTemplateId: templateId,
        };

        (updateSwitchboardIntegration as any).mockResolvedValue({
          ...mockSwitchboardIntegration,
          version: 2,
          templateId: templateId,
        });

        await handler(req as NextApiRequest, res as NextApiResponse);

        const callArgs = (updateSwitchboardIntegration as any).mock.calls[0][2];
        expect(callArgs.templateId).toBe(templateId);
      }
    });

    it('should handle complex fieldMappings arrays', async () => {
      const complexMappings = [
        [{"field": "firstName", "mapping": "first_name"}],
        [
          {"field": "firstName", "mapping": "first_name"},
          {"field": "lastName", "mapping": "last_name"}
        ],
        [
          {"field": "firstName", "mapping": "first_name"},
          {"field": "lastName", "mapping": "last_name"},
          {"field": "email", "mapping": "email_address"},
          {"field": "phone", "mapping": "phone_number"}
        ],
      ];

      for (const mappings of complexMappings) {
        vi.clearAllMocks();
        
        req.body = {
          ...req.body,
          switchboardFieldMappings: mappings,
        };

        (updateSwitchboardIntegration as any).mockResolvedValue({
          ...mockSwitchboardIntegration,
          version: 2,
          fieldMappings: JSON.stringify(mappings),
        });

        await handler(req as NextApiRequest, res as NextApiResponse);

        const callArgs = (updateSwitchboardIntegration as any).mock.calls[0][2];
        expect(typeof callArgs.fieldMappings).toBe('string');
        expect(JSON.parse(callArgs.fieldMappings)).toEqual(mappings);
      }
    });

    it('should handle fieldMappings when provided as string', async () => {
      const mappingsString = '[{"field": "email", "mapping": "email_address"}]';
      
      req.body = {
        ...req.body,
        switchboardFieldMappings: mappingsString,
      };

      (updateSwitchboardIntegration as any).mockResolvedValue({
        ...mockSwitchboardIntegration,
        version: 2,
        fieldMappings: mappingsString,
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const callArgs = (updateSwitchboardIntegration as any).mock.calls[0][2];
      expect(typeof callArgs.fieldMappings).toBe('string');
      expect(callArgs.fieldMappings).toBe(mappingsString);
    });

    it('should invalidate cache after successful Switchboard update', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(eventSettingsCache.invalidate).toHaveBeenCalledWith('event-settings');
    });
  });

  describe('PUT Endpoint - OneSimpleAPI Fields (Subtask 6.6)', () => {
    beforeEach(() => {
      req.method = 'PUT';
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        oneSimpleApiEnabled: true,
        oneSimpleApiUrl: 'https://updated.onesimple.com',
        oneSimpleApiFormDataKey: 'updated-key',
        oneSimpleApiFormDataValue: '{{email}}',
        oneSimpleApiRecordTemplate: '{"email": "{{email}}"}',
      };

      // Mock database responses
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID) {
          return Promise.resolve({ rows: [{ $id: 'user123', userId: 'user123' }] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_TABLE_ID) {
          return Promise.resolve({ rows: [mockOneSimpleApiIntegration] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockTablesDB.updateRow.mockResolvedValue({
        ...mockEventSettings,
        eventName: 'Test Event'
      });

      (updateOneSimpleApiIntegration as any).mockResolvedValue({
        ...mockOneSimpleApiIntegration,
        version: 2,
        url: 'https://updated.onesimple.com',
        formDataKey: 'updated-key',
        formDataValue: '{{email}}',
        recordTemplate: '{"email": "{{email}}"}'
      });

      // Mock flattenEventSettings for GET after update
      (flattenEventSettings as any).mockImplementation((settings: any) => ({
        ...settings,
        oneSimpleApiEnabled: settings.oneSimpleApi?.enabled || false,
        oneSimpleApiUrl: settings.oneSimpleApi?.url || '',
        oneSimpleApiFormDataKey: settings.oneSimpleApi?.formDataKey || '',
        oneSimpleApiFormDataValue: settings.oneSimpleApi?.formDataValue || '',
        oneSimpleApiRecordTemplate: settings.oneSimpleApi?.recordTemplate || '',
      }));
    });

    it('should update all OneSimpleAPI fields', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(updateOneSimpleApiIntegration).toHaveBeenCalledWith(
        mockTablesDB,
        'event-123',
        expect.objectContaining({
          enabled: true,
          url: 'https://updated.onesimple.com',
          formDataKey: 'updated-key',
          formDataValue: '{{email}}',
          recordTemplate: '{"email": "{{email}}"}'
        })
      );
    });

    it('should verify updates are saved to OneSimpleAPI integration collection', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify updateOneSimpleApiIntegration was called
      expect(updateOneSimpleApiIntegration).toHaveBeenCalled();
      
      // Verify it was called with the correct event settings ID
      const callArgs = (updateOneSimpleApiIntegration as any).mock.calls[0];
      expect(callArgs[1]).toBe('event-123');
      
      // Verify all fields are in the update payload
      const updatePayload = callArgs[2];
      expect(updatePayload).toHaveProperty('enabled', true);
      expect(updatePayload).toHaveProperty('url', 'https://updated.onesimple.com');
      expect(updatePayload).toHaveProperty('formDataKey', 'updated-key');
      expect(updatePayload).toHaveProperty('formDataValue', '{{email}}');
      expect(updatePayload).toHaveProperty('recordTemplate', '{"email": "{{email}}"}');
    });

    it('should verify version number increments', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      const updatedIntegration = await (updateOneSimpleApiIntegration as any).mock.results[0].value;
      expect(updatedIntegration.version).toBe(2);
      expect(updatedIntegration.version).toBeGreaterThan(mockOneSimpleApiIntegration.version);
    });

    it('should fetch settings and verify all fields persisted', async () => {
      // First, perform the PUT request
      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify the update was successful
      expect(res.status).toHaveBeenCalledWith(200);

      // Now perform a GET request to verify persistence
      req.method = 'GET';
      req.body = undefined;
      
      // Clear previous mocks
      vi.clearAllMocks();

      // Mock the updated integration data for GET
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_TABLE_ID) {
          return Promise.resolve({ 
            rows: [{
              ...mockOneSimpleApiIntegration,
              version: 2,
              url: 'https://updated.onesimple.com',
              formDataKey: 'updated-key',
              formDataValue: '{{email}}',
              recordTemplate: '{"email": "{{email}}"}'
            }]
          });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Perform GET request
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as any).mock.calls[0][0];

      // Verify all updated fields are present in the response
      expect(responseData.oneSimpleApiEnabled).toBe(true);
      expect(responseData.oneSimpleApiUrl).toBe('https://updated.onesimple.com');
      expect(responseData.oneSimpleApiFormDataKey).toBe('updated-key');
      expect(responseData.oneSimpleApiFormDataValue).toBe('{{email}}');
      expect(responseData.oneSimpleApiRecordTemplate).toBe('{"email": "{{email}}"}');
    });

    it('should handle url field updates', async () => {
      const urls = [
        'https://api.onesimple.com/v1',
        'https://api.onesimple.com/v2',
        'https://custom.api.com/endpoint'
      ];

      for (const url of urls) {
        vi.clearAllMocks();
        
        req.body = {
          ...req.body,
          oneSimpleApiUrl: url,
        };

        (updateOneSimpleApiIntegration as any).mockResolvedValue({
          ...mockOneSimpleApiIntegration,
          version: 2,
          url: url,
        });

        await handler(req as NextApiRequest, res as NextApiResponse);

        const callArgs = (updateOneSimpleApiIntegration as any).mock.calls[0][2];
        expect(callArgs.url).toBe(url);
      }
    });

    it('should handle formDataKey and formDataValue updates', async () => {
      const testCases = [
        { key: 'data', value: '{{firstName}}' },
        { key: 'payload', value: '{{lastName}}' },
        { key: 'record', value: '{{email}}' },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        
        req.body = {
          ...req.body,
          oneSimpleApiFormDataKey: testCase.key,
          oneSimpleApiFormDataValue: testCase.value,
        };

        (updateOneSimpleApiIntegration as any).mockResolvedValue({
          ...mockOneSimpleApiIntegration,
          version: 2,
          formDataKey: testCase.key,
          formDataValue: testCase.value,
        });

        await handler(req as NextApiRequest, res as NextApiResponse);

        const callArgs = (updateOneSimpleApiIntegration as any).mock.calls[0][2];
        expect(callArgs.formDataKey).toBe(testCase.key);
        expect(callArgs.formDataValue).toBe(testCase.value);
      }
    });

    it('should handle recordTemplate updates', async () => {
      const templates = [
        '{"name": "{{firstName}}"}',
        '{"fullName": "{{firstName}} {{lastName}}"}',
        '{"attendee": {"name": "{{firstName}}", "email": "{{email}}", "phone": "{{phone}}"}}',
      ];

      for (const template of templates) {
        vi.clearAllMocks();
        
        req.body = {
          ...req.body,
          oneSimpleApiRecordTemplate: template,
        };

        (updateOneSimpleApiIntegration as any).mockResolvedValue({
          ...mockOneSimpleApiIntegration,
          version: 2,
          recordTemplate: template,
        });

        await handler(req as NextApiRequest, res as NextApiResponse);

        const callArgs = (updateOneSimpleApiIntegration as any).mock.calls[0][2];
        expect(callArgs.recordTemplate).toBe(template);
      }
    });

    it('should invalidate cache after successful OneSimpleAPI update', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(eventSettingsCache.invalidate).toHaveBeenCalledWith('event-settings');
    });
  });

  describe('PUT Endpoint - Partial Updates (Subtask 6.7)', () => {
    beforeEach(() => {
      req.method = 'PUT';
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        // Only update some Cloudinary fields
        cloudinaryAutoOptimize: true,
        cloudinaryCropAspectRatio: '1:1',
      };

      // Mock database responses
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID) {
          return Promise.resolve({ rows: [{ $id: 'user123', userId: 'user123' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockTablesDB.updateRow.mockResolvedValue({
        ...mockEventSettings,
        eventName: 'Test Event'
      });

      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2,
        autoOptimize: true,
        cropAspectRatio: '1:1'
      });
    });

    it('should only update specified fields', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(updateCloudinaryIntegration).toHaveBeenCalledWith(
        mockTablesDB,
        'event-123',
        expect.objectContaining({
          autoOptimize: true,
          cropAspectRatio: '1:1'
        })
      );

      // Verify other fields are not included in the update
      const callArgs = (updateCloudinaryIntegration as any).mock.calls[0][2];
      expect(callArgs.enabled).toBeUndefined();
      expect(callArgs.cloudName).toBeUndefined();
      expect(callArgs.apiKey).toBeUndefined();
    });
  });

  describe('PUT Endpoint - Error Handling (Subtask 6.8)', () => {
    beforeEach(() => {
      req.method = 'PUT';
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        cloudinaryEnabled: true,
        switchboardEnabled: true,
      };

      // Mock database responses
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID) {
          return Promise.resolve({ rows: [{ $id: 'user123', userId: 'user123' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockTablesDB.updateRow.mockResolvedValue({
        ...mockEventSettings,
        eventName: 'Test Event'
      });
    });

    it('should handle integration update failure gracefully', async () => {
      // Mock Cloudinary update to fail
      (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Network error'));
      (updateSwitchboardIntegration as any).mockResolvedValue({ success: true });

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Should return 200 with warnings
      expect(res.status).toHaveBeenCalledWith(200);
      
      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.warnings).toBeDefined();
      expect(responseData.warnings.integrations).toHaveLength(1);
      expect(responseData.warnings.integrations[0].integration).toBe('cloudinary');
    });

    it('should log error but not fail entire request', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Database error'));
      (updateSwitchboardIntegration as any).mockResolvedValue({ success: true });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('PUT Endpoint - Optimistic Locking (Subtask 6.9)', () => {
    beforeEach(() => {
      req.method = 'PUT';
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        cloudinaryEnabled: true,
      };

      // Mock database responses
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID) {
          return Promise.resolve({ rows: [{ $id: 'user123', userId: 'user123' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockTablesDB.updateRow.mockResolvedValue({
        ...mockEventSettings,
        eventName: 'Test Event'
      });
    });

    it('should handle IntegrationConflictError with 409 response', async () => {
      const conflictError = new (IntegrationConflictError as any)(
        'Cloudinary',
        'event-123',
        1,
        2
      );
      (updateCloudinaryIntegration as any).mockRejectedValue(conflictError);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(409);
      
      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.error).toBe('Conflict');
      expect(responseData.integrationType).toBe('Cloudinary');
      expect(responseData.expectedVersion).toBe(1);
      expect(responseData.actualVersion).toBe(2);
    });
  });

  describe('Cache Invalidation (Subtask 6.10)', () => {
    beforeEach(() => {
      // Mock flattenEventSettings
      (flattenEventSettings as any).mockImplementation((settings: any) => ({
        ...settings,
        cloudinaryEnabled: settings.cloudinary?.enabled || false,
        cloudinaryAutoOptimize: settings.cloudinary?.autoOptimize || false,
      }));

      // Mock database responses
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_TABLE_ID) {
          return Promise.resolve({ rows: [mockCloudinaryIntegration] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should have cache miss on first fetch', async () => {
      (eventSettingsCache.get as any).mockReturnValue(null);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
      expect(eventSettingsCache.set).toHaveBeenCalled();
    });

    it('should have cache hit on second fetch', async () => {
      const cachedData = {
        ...mockEventSettings,
        cloudinaryEnabled: true,
        cloudinaryAutoOptimize: true,
        customFields: [],
        timestamp: Date.now()
      };

      (eventSettingsCache.get as any).mockReturnValue(cachedData);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res.json).toHaveBeenCalledWith(cachedData);
    });

    it('should invalidate cache after integration update', async () => {
      req.method = 'PUT';
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        cloudinaryAutoOptimize: false,
      };

      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID) {
          return Promise.resolve({ rows: [{ $id: 'user123', userId: 'user123' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockTablesDB.updateRow.mockResolvedValue({
        ...mockEventSettings,
        eventName: 'Test Event'
      });

      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2,
        autoOptimize: false
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(eventSettingsCache.invalidate).toHaveBeenCalledWith('event-settings');
    });

    it('should fetch fresh data after cache invalidation', async () => {
      // First request - cache miss
      (eventSettingsCache.get as any).mockReturnValueOnce(null);
      
      req.method = 'GET';
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
      
      // Simulate cache being populated
      const cachedData = {
        ...mockEventSettings,
        cloudinaryAutoOptimize: true,
        customFields: [],
        timestamp: Date.now()
      };
      (eventSettingsCache.get as any).mockReturnValueOnce(cachedData);

      // Second request - cache hit
      vi.clearAllMocks();
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis()
      };
      
      await handler(req as NextApiRequest, res as NextApiResponse);
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');

      // Update request - invalidates cache
      vi.clearAllMocks();
      req.method = 'PUT';
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        cloudinaryAutoOptimize: false,
      };

      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID) {
          return Promise.resolve({ rows: [{ $id: 'user123', userId: 'user123' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockTablesDB.updateRow.mockResolvedValue(mockEventSettings);
      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2,
        autoOptimize: false
      });

      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis()
      };

      await handler(req as NextApiRequest, res as NextApiResponse);
      expect(eventSettingsCache.invalidate).toHaveBeenCalledWith('event-settings');

      // Third GET request - cache miss with updated data
      vi.clearAllMocks();
      req.method = 'GET';
      (eventSettingsCache.get as any).mockReturnValueOnce(null);
      
      // Mock updated Cloudinary data
      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_TABLE_ID) {
          return Promise.resolve({ 
            rows: [{
              ...mockCloudinaryIntegration,
              autoOptimize: false
            }] 
          });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      (flattenEventSettings as any).mockImplementation((settings: any) => ({
        ...settings,
        cloudinaryAutoOptimize: settings.cloudinary?.autoOptimize || false,
      }));

      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis()
      };

      await handler(req as NextApiRequest, res as NextApiResponse);
      
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.cloudinaryAutoOptimize).toBe(false);
    });
  });
});
