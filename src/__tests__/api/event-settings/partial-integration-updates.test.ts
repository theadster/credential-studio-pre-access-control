/**
 * Partial Integration Updates Tests
 * 
 * Tests for task 6.7: Test partial integration updates
 * Verifies that when only some fields are updated, unchanged fields remain the same
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
  updateCloudinaryIntegration,
  updateSwitchboardIntegration,
  updateOneSimpleApiIntegration,
  flattenEventSettings
} from '@/lib/appwrite-integrations';

describe('Partial Integration Updates Tests (Task 6.7)', () => {
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
    cloudName: 'original-cloud',
    apiKey: 'original-key',
    apiSecret: 'original-secret',
    uploadPreset: 'original-preset',
    autoOptimize: true,
    generateThumbnails: false,
    disableSkipCrop: true,
    cropAspectRatio: '16:9',
  };

  const mockSwitchboardIntegration = {
    $id: 'switchboard-123',
    eventSettingsId: 'event-123',
    version: 1,
    enabled: true,
    apiEndpoint: 'https://original.switchboard.com',
    authHeaderType: 'Bearer',
    apiKey: 'original-switchboard-key',
    requestBody: '{"original": "{{firstName}}"}',
    templateId: 'original-template-123',
    fieldMappings: '[{"field": "firstName", "mapping": "first_name"}]',
  };

  const mockOneSimpleApiIntegration = {
    $id: 'onesimpleapi-123',
    eventSettingsId: 'event-123',
    version: 1,
    enabled: true,
    url: 'https://original.onesimple.com',
    formDataKey: 'original-key',
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
      method: 'PUT'
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };

    // Default database mocks
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
      if (tableId === process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_TABLE_ID) {
        return Promise.resolve({ rows: [mockSwitchboardIntegration] });
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
  });

  afterEach(() => {
    eventSettingsCache.clear();
  });

  describe('Partial Cloudinary Updates', () => {
    it('should update only cloudName and leave other fields unchanged', async () => {
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        cloudinaryCloudName: 'updated-cloud-name',
      };

      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2,
        cloudName: 'updated-cloud-name',
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify updateCloudinaryIntegration was called
      expect(updateCloudinaryIntegration).toHaveBeenCalled();
      
      const callArgs = (updateCloudinaryIntegration as any).mock.calls[0][2];
      
      // Verify only cloudName is in the update payload
      expect(callArgs).toHaveProperty('cloudName', 'updated-cloud-name');
      
      // Verify other fields are NOT in the update payload (undefined values filtered out)
      expect(callArgs).not.toHaveProperty('apiKey');
      expect(callArgs).not.toHaveProperty('apiSecret');
      expect(callArgs).not.toHaveProperty('uploadPreset');
      expect(callArgs).not.toHaveProperty('autoOptimize');
      expect(callArgs).not.toHaveProperty('generateThumbnails');
    });

    it('should update only boolean fields and leave string fields unchanged', async () => {
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        cloudinaryAutoOptimize: false,
        cloudinaryGenerateThumbnails: true,
      };

      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2,
        autoOptimize: false,
        generateThumbnails: true,
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const callArgs = (updateCloudinaryIntegration as any).mock.calls[0][2];
      
      // Verify only boolean fields are in the update payload
      expect(callArgs).toHaveProperty('autoOptimize', false);
      expect(callArgs).toHaveProperty('generateThumbnails', true);
      
      // Verify string fields are NOT in the update payload
      expect(callArgs).not.toHaveProperty('cloudName');
      expect(callArgs).not.toHaveProperty('apiKey');
      expect(callArgs).not.toHaveProperty('uploadPreset');
    });

    it('should update only cropAspectRatio and leave other fields unchanged', async () => {
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        cloudinaryCropAspectRatio: '4:3',
      };

      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2,
        cropAspectRatio: '4:3',
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const callArgs = (updateCloudinaryIntegration as any).mock.calls[0][2];
      
      // Verify only cropAspectRatio is in the update payload
      expect(callArgs).toHaveProperty('cropAspectRatio', '4:3');
      
      // Verify other fields are NOT in the update payload
      expect(callArgs).not.toHaveProperty('cloudName');
      expect(callArgs).not.toHaveProperty('autoOptimize');
      expect(callArgs).not.toHaveProperty('generateThumbnails');
    });

    it('should verify unchanged fields remain the same after partial update', async () => {
      // First, update only cloudName
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        cloudinaryCloudName: 'updated-cloud-name',
      };

      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2,
        cloudName: 'updated-cloud-name',
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Now perform a GET to verify unchanged fields
      req.method = 'GET';
      req.body = undefined;
      vi.clearAllMocks();

      // Mock flattenEventSettings to return the updated data
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

      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_TABLE_ID) {
          return Promise.resolve({ 
            rows: [{
              ...mockCloudinaryIntegration,
              version: 2,
              cloudName: 'updated-cloud-name', // Only this changed
            }]
          });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];

      // Verify the updated field
      expect(responseData.cloudinaryCloudName).toBe('updated-cloud-name');

      // Verify unchanged fields remain the same
      expect(responseData.cloudinaryEnabled).toBe(true);
      expect(responseData.cloudinaryApiKey).toBe('original-key');
      expect(responseData.cloudinaryApiSecret).toBe('original-secret');
      expect(responseData.cloudinaryUploadPreset).toBe('original-preset');
      expect(responseData.cloudinaryAutoOptimize).toBe(true);
      expect(responseData.cloudinaryGenerateThumbnails).toBe(false);
      expect(responseData.cloudinaryDisableSkipCrop).toBe(true);
      expect(responseData.cloudinaryCropAspectRatio).toBe('16:9');
    });
  });

  describe('Partial Switchboard Updates', () => {
    it('should update only authHeaderType and leave other fields unchanged', async () => {
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        switchboardAuthHeaderType: 'ApiKey',
      };

      (updateSwitchboardIntegration as any).mockResolvedValue({
        ...mockSwitchboardIntegration,
        version: 2,
        authHeaderType: 'ApiKey',
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const callArgs = (updateSwitchboardIntegration as any).mock.calls[0][2];
      
      // Verify only authHeaderType is in the update payload
      expect(callArgs).toHaveProperty('authHeaderType', 'ApiKey');
      
      // Verify other fields are NOT in the update payload
      expect(callArgs).not.toHaveProperty('apiEndpoint');
      expect(callArgs).not.toHaveProperty('apiKey');
      expect(callArgs).not.toHaveProperty('requestBody');
      expect(callArgs).not.toHaveProperty('templateId');
    });

    it('should update only templateId and requestBody, leaving other fields unchanged', async () => {
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        switchboardTemplateId: 'new-template-456',
        switchboardRequestBody: '{"updated": "body"}',
      };

      (updateSwitchboardIntegration as any).mockResolvedValue({
        ...mockSwitchboardIntegration,
        version: 2,
        templateId: 'new-template-456',
        requestBody: '{"updated": "body"}',
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const callArgs = (updateSwitchboardIntegration as any).mock.calls[0][2];
      
      // Verify only templateId and requestBody are in the update payload
      expect(callArgs).toHaveProperty('templateId', 'new-template-456');
      expect(callArgs).toHaveProperty('requestBody', '{"updated": "body"}');
      
      // Verify other fields are NOT in the update payload
      expect(callArgs).not.toHaveProperty('apiEndpoint');
      expect(callArgs).not.toHaveProperty('authHeaderType');
      expect(callArgs).not.toHaveProperty('apiKey');
    });

    it('should update only fieldMappings and leave other fields unchanged', async () => {
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        switchboardFieldMappings: [{"field": "email", "mapping": "email_address"}],
      };

      (updateSwitchboardIntegration as any).mockResolvedValue({
        ...mockSwitchboardIntegration,
        version: 2,
        fieldMappings: '[{"field": "email", "mapping": "email_address"}]',
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const callArgs = (updateSwitchboardIntegration as any).mock.calls[0][2];
      
      // Verify only fieldMappings is in the update payload
      expect(callArgs).toHaveProperty('fieldMappings');
      expect(callArgs.fieldMappings).toBe('[{"field":"email","mapping":"email_address"}]');
      
      // Verify other fields are NOT in the update payload
      expect(callArgs).not.toHaveProperty('apiEndpoint');
      expect(callArgs).not.toHaveProperty('authHeaderType');
      expect(callArgs).not.toHaveProperty('templateId');
    });

    it('should verify unchanged fields remain the same after partial update', async () => {
      // First, update only authHeaderType
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        switchboardAuthHeaderType: 'ApiKey',
      };

      (updateSwitchboardIntegration as any).mockResolvedValue({
        ...mockSwitchboardIntegration,
        version: 2,
        authHeaderType: 'ApiKey',
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Now perform a GET to verify unchanged fields
      req.method = 'GET';
      req.body = undefined;
      vi.clearAllMocks();

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

      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_TABLE_ID) {
          return Promise.resolve({ 
            rows: [{
              ...mockSwitchboardIntegration,
              version: 2,
              authHeaderType: 'ApiKey', // Only this changed
            }]
          });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];

      // Verify the updated field
      expect(responseData.switchboardAuthHeaderType).toBe('ApiKey');

      // Verify unchanged fields remain the same
      expect(responseData.switchboardEnabled).toBe(true);
      expect(responseData.switchboardApiEndpoint).toBe('https://original.switchboard.com');
      expect(responseData.switchboardApiKey).toBe('original-switchboard-key');
      expect(responseData.switchboardRequestBody).toBe('{"original": "{{firstName}}"}');
      expect(responseData.switchboardTemplateId).toBe('original-template-123');
      expect(responseData.switchboardFieldMappings).toEqual([{"field": "firstName", "mapping": "first_name"}]);
    });
  });

  describe('Partial OneSimpleAPI Updates', () => {
    it('should update only url and leave other fields unchanged', async () => {
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        oneSimpleApiUrl: 'https://updated.onesimple.com',
      };

      (updateOneSimpleApiIntegration as any).mockResolvedValue({
        ...mockOneSimpleApiIntegration,
        version: 2,
        url: 'https://updated.onesimple.com',
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const callArgs = (updateOneSimpleApiIntegration as any).mock.calls[0][2];
      
      // Verify only url is in the update payload
      expect(callArgs).toHaveProperty('url', 'https://updated.onesimple.com');
      
      // Verify other fields are NOT in the update payload
      expect(callArgs).not.toHaveProperty('formDataKey');
      expect(callArgs).not.toHaveProperty('formDataValue');
      expect(callArgs).not.toHaveProperty('recordTemplate');
    });

    it('should update only formDataKey and formDataValue, leaving other fields unchanged', async () => {
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        oneSimpleApiFormDataKey: 'updated-key',
        oneSimpleApiFormDataValue: '{{lastName}}',
      };

      (updateOneSimpleApiIntegration as any).mockResolvedValue({
        ...mockOneSimpleApiIntegration,
        version: 2,
        formDataKey: 'updated-key',
        formDataValue: '{{lastName}}',
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const callArgs = (updateOneSimpleApiIntegration as any).mock.calls[0][2];
      
      // Verify only formDataKey and formDataValue are in the update payload
      expect(callArgs).toHaveProperty('formDataKey', 'updated-key');
      expect(callArgs).toHaveProperty('formDataValue', '{{lastName}}');
      
      // Verify other fields are NOT in the update payload
      expect(callArgs).not.toHaveProperty('url');
      expect(callArgs).not.toHaveProperty('recordTemplate');
    });

    it('should update only recordTemplate and leave other fields unchanged', async () => {
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        oneSimpleApiRecordTemplate: '{"updated": "template"}',
      };

      (updateOneSimpleApiIntegration as any).mockResolvedValue({
        ...mockOneSimpleApiIntegration,
        version: 2,
        recordTemplate: '{"updated": "template"}',
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const callArgs = (updateOneSimpleApiIntegration as any).mock.calls[0][2];
      
      // Verify only recordTemplate is in the update payload
      expect(callArgs).toHaveProperty('recordTemplate', '{"updated": "template"}');
      
      // Verify other fields are NOT in the update payload
      expect(callArgs).not.toHaveProperty('url');
      expect(callArgs).not.toHaveProperty('formDataKey');
      expect(callArgs).not.toHaveProperty('formDataValue');
    });

    it('should verify unchanged fields remain the same after partial update', async () => {
      // First, update only url
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        oneSimpleApiUrl: 'https://updated.onesimple.com',
      };

      (updateOneSimpleApiIntegration as any).mockResolvedValue({
        ...mockOneSimpleApiIntegration,
        version: 2,
        url: 'https://updated.onesimple.com',
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Now perform a GET to verify unchanged fields
      req.method = 'GET';
      req.body = undefined;
      vi.clearAllMocks();

      (flattenEventSettings as any).mockImplementation((settings: any) => ({
        ...settings,
        oneSimpleApiEnabled: settings.oneSimpleApi?.enabled || false,
        oneSimpleApiUrl: settings.oneSimpleApi?.url || '',
        oneSimpleApiFormDataKey: settings.oneSimpleApi?.formDataKey || '',
        oneSimpleApiFormDataValue: settings.oneSimpleApi?.formDataValue || '',
        oneSimpleApiRecordTemplate: settings.oneSimpleApi?.recordTemplate || '',
      }));

      mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
          return Promise.resolve({ rows: [mockEventSettings] });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_TABLE_ID) {
          return Promise.resolve({ 
            rows: [{
              ...mockOneSimpleApiIntegration,
              version: 2,
              url: 'https://updated.onesimple.com', // Only this changed
            }]
          });
        }
        if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];

      // Verify the updated field
      expect(responseData.oneSimpleApiUrl).toBe('https://updated.onesimple.com');

      // Verify unchanged fields remain the same
      expect(responseData.oneSimpleApiEnabled).toBe(true);
      expect(responseData.oneSimpleApiFormDataKey).toBe('original-key');
      expect(responseData.oneSimpleApiFormDataValue).toBe('{{firstName}}');
      expect(responseData.oneSimpleApiRecordTemplate).toBe('{"name": "{{firstName}}"}');
    });
  });

  describe('Mixed Partial Updates Across Integrations', () => {
    it('should update fields from multiple integrations while leaving others unchanged', async () => {
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        cloudinaryAutoOptimize: false,
        switchboardAuthHeaderType: 'ApiKey',
        oneSimpleApiUrl: 'https://updated.onesimple.com',
      };

      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2,
        autoOptimize: false,
      });

      (updateSwitchboardIntegration as any).mockResolvedValue({
        ...mockSwitchboardIntegration,
        version: 2,
        authHeaderType: 'ApiKey',
      });

      (updateOneSimpleApiIntegration as any).mockResolvedValue({
        ...mockOneSimpleApiIntegration,
        version: 2,
        url: 'https://updated.onesimple.com',
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify each integration was updated with only the specified fields
      const cloudinaryArgs = (updateCloudinaryIntegration as any).mock.calls[0][2];
      expect(cloudinaryArgs).toHaveProperty('autoOptimize', false);
      expect(cloudinaryArgs).not.toHaveProperty('cloudName');

      const switchboardArgs = (updateSwitchboardIntegration as any).mock.calls[0][2];
      expect(switchboardArgs).toHaveProperty('authHeaderType', 'ApiKey');
      expect(switchboardArgs).not.toHaveProperty('apiEndpoint');

      const oneSimpleApiArgs = (updateOneSimpleApiIntegration as any).mock.calls[0][2];
      expect(oneSimpleApiArgs).toHaveProperty('url', 'https://updated.onesimple.com');
      expect(oneSimpleApiArgs).not.toHaveProperty('formDataKey');
    });
  });
});
