/**
 * Integration Update Error Handling Tests
 * 
 * Tests for task 6.8: Test integration update error handling
 * Simulates integration update failures and verifies:
 * - Errors are logged but request doesn't fail
 * - Partial success is handled correctly
 * - Core event settings update succeeds even when integrations fail
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
vi.mock('@/lib/appwrite-integrations', async () => {
  const actual = await vi.importActual<typeof import('@/lib/appwrite-integrations')>('@/lib/appwrite-integrations');
  return {
    ...actual,
    updateCloudinaryIntegration: vi.fn(),
    updateSwitchboardIntegration: vi.fn(),
    updateOneSimpleApiIntegration: vi.fn(),
    flattenEventSettings: vi.fn()
  };
});

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

describe('Integration Update Error Handling Tests (Task 6.8)', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let mockTablesDB: any;
  let mockAccount: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

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
    generateThumbnails: false,
    disableSkipCrop: false,
    cropAspectRatio: '1',
  };

  const mockSwitchboardIntegration = {
    $id: 'switchboard-123',
    eventSettingsId: 'event-123',
    version: 1,
    enabled: true,
    apiEndpoint: 'https://api.switchboard.com',
    authHeaderType: 'Bearer',
    apiKey: 'test-switchboard-key',
    requestBody: '{"name": "{{firstName}}"}',
    templateId: 'template-123',
    fieldMappings: '[]',
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

    // Setup console spies
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

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
      method: 'PUT',
      body: {
        eventName: 'Updated Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        cloudinaryEnabled: true,
        cloudinaryCloudName: 'updated-cloud',
      }
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
      eventName: 'Updated Event'
    });

    // Mock flattenEventSettings
    (flattenEventSettings as any).mockImplementation((settings: any) => ({
      ...settings,
      cloudinaryEnabled: settings.cloudinary?.enabled || false,
      cloudinaryCloudName: settings.cloudinary?.cloudName || '',
      switchboardEnabled: settings.switchboard?.enabled || false,
      oneSimpleApiEnabled: settings.oneSimpleApi?.enabled || false,
    }));
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    eventSettingsCache.clear();
  });

  describe('Single Integration Failure', () => {
    it('should handle Cloudinary update failure without failing the request', async () => {
      // Mock Cloudinary update to fail with network error
      (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Network timeout'));

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify request succeeded with 200
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const responseData = (res.json as any).mock.calls[0][0];

      // Verify core event settings were updated
      expect(responseData.eventName).toBe('Updated Event');

      // Verify warnings are included in response
      expect(responseData.warnings).toBeDefined();
      expect(responseData.warnings.integrations).toHaveLength(1);
      expect(responseData.warnings.integrations[0].integration).toBe('cloudinary');
      expect(responseData.warnings.integrations[0].message).toBe('Network timeout');
      expect(responseData.warnings.integrations[0].fields).toContain('enabled');
      expect(responseData.warnings.integrations[0].fields).toContain('cloudName');
    });

    it('should log detailed error information for Cloudinary failure', async () => {
      (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Database connection lost'));

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify detailed error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to update Cloudinary integration:',
        expect.objectContaining({
          integration: 'Cloudinary',
          eventSettingsId: 'event-123',
          fields: expect.arrayContaining(['enabled', 'cloudName']),
          error: 'Database connection lost',
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle Switchboard update failure without failing the request', async () => {
      req.body = {
        ...req.body,
        switchboardEnabled: true,
        switchboardApiEndpoint: 'https://updated.switchboard.com',
      };

      (updateSwitchboardIntegration as any).mockRejectedValue(new Error('API rate limit exceeded'));
      (updateCloudinaryIntegration as any).mockResolvedValue(mockCloudinaryIntegration);

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify request succeeded
      expect(res.status).toHaveBeenCalledWith(200);

      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.warnings).toBeDefined();
      expect(responseData.warnings.integrations).toHaveLength(1);
      expect(responseData.warnings.integrations[0].integration).toBe('switchboard');
      expect(responseData.warnings.integrations[0].message).toBe('API rate limit exceeded');
    });

    it('should handle OneSimpleAPI update failure without failing the request', async () => {
      req.body = {
        ...req.body,
        oneSimpleApiEnabled: true,
        oneSimpleApiUrl: 'https://updated.onesimple.com',
      };

      (updateOneSimpleApiIntegration as any).mockRejectedValue(new Error('Invalid API credentials'));
      (updateCloudinaryIntegration as any).mockResolvedValue(mockCloudinaryIntegration);

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify request succeeded
      expect(res.status).toHaveBeenCalledWith(200);

      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.warnings).toBeDefined();
      expect(responseData.warnings.integrations).toHaveLength(1);
      expect(responseData.warnings.integrations[0].integration).toBe('onesimpleapi');
      expect(responseData.warnings.integrations[0].message).toBe('Invalid API credentials');
    });
  });

  describe('Multiple Integration Failures', () => {
    it('should handle multiple integration failures and return all warnings', async () => {
      req.body = {
        ...req.body,
        cloudinaryEnabled: true,
        cloudinaryCloudName: 'updated-cloud',
        switchboardEnabled: true,
        switchboardApiEndpoint: 'https://updated.switchboard.com',
        oneSimpleApiEnabled: true,
        oneSimpleApiUrl: 'https://updated.onesimple.com',
      };

      // Mock all integrations to fail
      (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Cloudinary error'));
      (updateSwitchboardIntegration as any).mockRejectedValue(new Error('Switchboard error'));
      (updateOneSimpleApiIntegration as any).mockRejectedValue(new Error('OneSimpleAPI error'));

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify request succeeded with warnings
      expect(res.status).toHaveBeenCalledWith(200);

      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.warnings).toBeDefined();
      expect(responseData.warnings.integrations).toHaveLength(3);

      const integrationNames = responseData.warnings.integrations.map((w: any) => w.integration);
      expect(integrationNames).toContain('cloudinary');
      expect(integrationNames).toContain('switchboard');
      expect(integrationNames).toContain('onesimpleapi');
    });

    it('should log summary of multiple integration failures', async () => {
      req.body = {
        ...req.body,
        cloudinaryEnabled: true,
        switchboardEnabled: true,
        oneSimpleApiEnabled: true,
      };

      (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Error 1'));
      (updateSwitchboardIntegration as any).mockRejectedValue(new Error('Error 2'));
      (updateOneSimpleApiIntegration as any).mockRejectedValue(new Error('Error 3'));

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify summary warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Integration update partial failures:',
        expect.objectContaining({
          totalUpdates: 3,
          failedCount: 3,
          failures: expect.arrayContaining([
            expect.objectContaining({ integration: 'cloudinary', message: 'Error 1' }),
            expect.objectContaining({ integration: 'switchboard', message: 'Error 2' }),
            expect.objectContaining({ integration: 'onesimpleapi', message: 'Error 3' })
          ]),
          eventSettingsId: 'event-123',
          note: 'Core event settings were updated successfully. Integration failures are non-critical.'
        })
      );
    });
  });

  describe('Partial Success Scenarios', () => {
    it('should handle partial success (some integrations succeed, some fail)', async () => {
      req.body = {
        ...req.body,
        cloudinaryEnabled: true,
        cloudinaryCloudName: 'updated-cloud',
        switchboardEnabled: true,
        switchboardApiEndpoint: 'https://updated.switchboard.com',
      };

      // Mock Cloudinary to succeed, Switchboard to fail
      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2,
        cloudName: 'updated-cloud'
      });
      (updateSwitchboardIntegration as any).mockRejectedValue(new Error('Switchboard timeout'));

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify request succeeded
      expect(res.status).toHaveBeenCalledWith(200);

      const responseData = (res.json as any).mock.calls[0][0];

      // Verify only failed integration is in warnings
      expect(responseData.warnings).toBeDefined();
      expect(responseData.warnings.integrations).toHaveLength(1);
      expect(responseData.warnings.integrations[0].integration).toBe('switchboard');

      // Verify successful integration update was called
      expect(updateCloudinaryIntegration).toHaveBeenCalled();

      // Verify Cloudinary integration was updated (check the call arguments)
      const cloudinaryCallArgs = (updateCloudinaryIntegration as any).mock.calls[0][2];
      expect(cloudinaryCallArgs).toHaveProperty('cloudName', 'updated-cloud');
    });

    it('should set X-Integration-Warnings header when there are partial failures', async () => {
      (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Network error'));

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify warning header was set
      expect(res.setHeader).toHaveBeenCalledWith('X-Integration-Warnings', 'true');
    });

    it('should not set X-Integration-Warnings header when all integrations succeed', async () => {
      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify warning header was NOT set
      expect(res.setHeader).not.toHaveBeenCalledWith('X-Integration-Warnings', 'true');

      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.warnings).toBeUndefined();
    });
  });

  describe('Core Event Settings Update', () => {
    it('should successfully update core event settings even when all integrations fail', async () => {
      req.body = {
        eventName: 'Updated Event Name',
        eventDate: '2024-02-20',
        eventLocation: 'New Location',
        timeZone: 'America/Los_Angeles',
        cloudinaryEnabled: true,
        cloudinaryCloudName: 'test',
      };

      // Mock Cloudinary to fail
      (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Complete failure'));

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify core event settings were updated
      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'event-123',
        expect.objectContaining({
          eventName: 'Updated Event Name',
          eventLocation: 'New Location',
          timeZone: 'America/Los_Angeles'
        })
      );

      // Verify request succeeded
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should invalidate cache even when integrations fail', async () => {
      (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Cache test error'));

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify cache was invalidated
      expect(eventSettingsCache.invalidate).toHaveBeenCalledWith('event-settings');
    });
  });

  describe('Error Field Information', () => {
    it('should include field information in error warnings', async () => {
      req.body = {
        ...req.body,
        cloudinaryEnabled: true,
        cloudinaryCloudName: 'test',
        cloudinaryApiKey: 'key123',
        cloudinaryAutoOptimize: true,
        cloudinaryGenerateThumbnails: false,
      };

      (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Validation error'));

      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.warnings.integrations[0].fields).toBeDefined();
      expect(responseData.warnings.integrations[0].fields).toContain('enabled');
      expect(responseData.warnings.integrations[0].fields).toContain('cloudName');
      expect(responseData.warnings.integrations[0].fields).toContain('apiKey');
      expect(responseData.warnings.integrations[0].fields).toContain('autoOptimize');
      expect(responseData.warnings.integrations[0].fields).toContain('generateThumbnails');
    });

    it('should include correct field information for Switchboard failures', async () => {
      req.body = {
        eventName: 'Test Event',
        eventDate: '2024-01-15',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        switchboardEnabled: true,
        switchboardAuthHeaderType: 'ApiKey',
        switchboardTemplateId: 'template-456',
      };

      (updateSwitchboardIntegration as any).mockRejectedValue(new Error('Field error'));

      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];

      // Find the switchboard warning (it should be the only one or the first one)
      const switchboardWarning = responseData.warnings.integrations.find((w: any) => w.integration === 'switchboard');
      expect(switchboardWarning).toBeDefined();
      expect(switchboardWarning.fields).toContain('enabled');
      expect(switchboardWarning.fields).toContain('authHeaderType');
      expect(switchboardWarning.fields).toContain('templateId');
    });
  });

  describe('Error Logging Details', () => {
    it('should log error with stack trace when available', async () => {
      const errorWithStack = new Error('Test error with stack');
      (updateCloudinaryIntegration as any).mockRejectedValue(errorWithStack);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to update Cloudinary integration:',
        expect.objectContaining({
          error: 'Test error with stack',
          stack: expect.any(String)
        })
      );
    });

    it('should log error timestamp for debugging', async () => {
      (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Timestamp test'));

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to update Cloudinary integration:',
        expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        })
      );
    });
  });
});
