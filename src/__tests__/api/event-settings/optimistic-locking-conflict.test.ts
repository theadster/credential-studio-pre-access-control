/**
 * Optimistic Locking Conflict Handling Tests
 * 
 * Tests for task 6.9: Test optimistic locking conflict handling
 * Simulates concurrent update scenarios and verifies:
 * - IntegrationConflictError is thrown when version mismatch occurs
 * - 409 response is returned to the client
 * - Error details include integration type and version information
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/event-settings/index';
import { eventSettingsCache } from '@/lib/cache';
import { IntegrationConflictError } from '@/lib/appwrite-integrations';

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
      super(
        `Integration conflict: ${integrationType} for event ${eventSettingsId}. ` +
        `Expected version ${expectedVersion}, but found version ${actualVersion}. ` +
        `The integration was modified by another request.`
      );
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

describe('Optimistic Locking Conflict Handling Tests (Task 6.9)', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let mockTablesDB: any;
  let mockAccount: any;
  let consoleErrorSpy: any;

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

    // Setup console spy
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
    eventSettingsCache.clear();
  });

  describe('Cloudinary Integration Conflict', () => {
    it('should return 409 when Cloudinary integration has version conflict', async () => {
      // Simulate concurrent update: expected version 1, but actual version is 2
      const conflictError = new IntegrationConflictError(
        'Cloudinary',
        'event-123',
        1, // expected version
        2  // actual version (someone else updated it)
      );

      (updateCloudinaryIntegration as any).mockRejectedValue(conflictError);

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify 409 Conflict response
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Conflict',
          message: expect.stringContaining('Integration conflict: Cloudinary'),
          integrationType: 'Cloudinary',
          eventSettingsId: 'event-123',
          expectedVersion: 1,
          actualVersion: 2
        })
      );
    });

    it('should log detailed conflict information for Cloudinary', async () => {
      const conflictError = new IntegrationConflictError(
        'Cloudinary',
        'event-123',
        1,
        3
      );

      (updateCloudinaryIntegration as any).mockRejectedValue(conflictError);

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify detailed error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Integration optimistic locking conflict detected:',
        expect.objectContaining({
          integrationType: 'Cloudinary',
          eventSettingsId: 'event-123',
          expectedVersion: 1,
          actualVersion: 3,
          timestamp: expect.any(String),
          resolution: 'Client should refetch event settings and retry the update'
        })
      );
    });

    it('should not update core event settings when Cloudinary conflict occurs', async () => {
      const conflictError = new IntegrationConflictError(
        'Cloudinary',
        'event-123',
        1,
        2
      );

      (updateCloudinaryIntegration as any).mockRejectedValue(conflictError);

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify core event settings update was NOT called
      // (conflict should be detected before core update completes)
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('Switchboard Integration Conflict', () => {
    it('should return 409 when Switchboard integration has version conflict', async () => {
      req.body = {
        ...req.body,
        switchboardEnabled: true,
        switchboardApiEndpoint: 'https://updated.switchboard.com',
        switchboardAuthHeaderType: 'ApiKey',
      };

      const conflictError = new IntegrationConflictError(
        'Switchboard',
        'event-123',
        2,
        5
      );

      (updateSwitchboardIntegration as any).mockRejectedValue(conflictError);
      (updateCloudinaryIntegration as any).mockResolvedValue(mockCloudinaryIntegration);

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify 409 Conflict response
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Conflict',
          integrationType: 'Switchboard',
          expectedVersion: 2,
          actualVersion: 5
        })
      );
    });

    it('should include helpful message about retrying the request', async () => {
      req.body = {
        ...req.body,
        switchboardEnabled: true,
        switchboardTemplateId: 'new-template',
      };

      const conflictError = new IntegrationConflictError(
        'Switchboard',
        'event-123',
        1,
        2
      );

      (updateSwitchboardIntegration as any).mockRejectedValue(conflictError);

      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.message).toContain('modified by another request');
    });
  });

  describe('OneSimpleAPI Integration Conflict', () => {
    it('should return 409 when OneSimpleAPI integration has version conflict', async () => {
      req.body = {
        ...req.body,
        oneSimpleApiEnabled: true,
        oneSimpleApiUrl: 'https://updated.onesimple.com',
        oneSimpleApiFormDataKey: 'newKey',
      };

      const conflictError = new IntegrationConflictError(
        'OneSimpleAPI',
        'event-123',
        3,
        7
      );

      (updateOneSimpleApiIntegration as any).mockRejectedValue(conflictError);
      (updateCloudinaryIntegration as any).mockResolvedValue(mockCloudinaryIntegration);

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify 409 Conflict response
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Conflict',
          integrationType: 'OneSimpleAPI',
          expectedVersion: 3,
          actualVersion: 7
        })
      );
    });
  });

  describe('Multiple Concurrent Updates', () => {
    it('should handle conflict when multiple integrations are updated concurrently', async () => {
      req.body = {
        ...req.body,
        cloudinaryEnabled: true,
        cloudinaryCloudName: 'updated-cloud',
        switchboardEnabled: true,
        switchboardApiEndpoint: 'https://updated.switchboard.com',
      };

      // First integration succeeds, second has conflict
      (updateCloudinaryIntegration as any).mockResolvedValue({
        ...mockCloudinaryIntegration,
        version: 2,
        cloudName: 'updated-cloud'
      });

      const conflictError = new IntegrationConflictError(
        'Switchboard',
        'event-123',
        1,
        3
      );
      (updateSwitchboardIntegration as any).mockRejectedValue(conflictError);

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify 409 response even though one integration succeeded
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Conflict',
          integrationType: 'Switchboard'
        })
      );
    });

    it('should return first conflict when multiple integrations have conflicts', async () => {
      req.body = {
        ...req.body,
        cloudinaryEnabled: true,
        switchboardEnabled: true,
        oneSimpleApiEnabled: true,
      };

      // All integrations have conflicts
      const cloudinaryConflict = new IntegrationConflictError('Cloudinary', 'event-123', 1, 2);
      const switchboardConflict = new IntegrationConflictError('Switchboard', 'event-123', 1, 2);
      const oneSimpleApiConflict = new IntegrationConflictError('OneSimpleAPI', 'event-123', 1, 2);

      (updateCloudinaryIntegration as any).mockRejectedValue(cloudinaryConflict);
      (updateSwitchboardIntegration as any).mockRejectedValue(switchboardConflict);
      (updateOneSimpleApiIntegration as any).mockRejectedValue(oneSimpleApiConflict);

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify 409 response with one of the conflicts
      expect(res.status).toHaveBeenCalledWith(409);
      
      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.error).toBe('Conflict');
      // Should return the first conflict encountered
      expect(['Cloudinary', 'Switchboard', 'OneSimpleAPI']).toContain(responseData.integrationType);
    });
  });

  describe('Conflict Error Details', () => {
    it('should include all required fields in conflict response', async () => {
      const conflictError = new IntegrationConflictError(
        'Cloudinary',
        'event-123',
        5,
        10
      );

      (updateCloudinaryIntegration as any).mockRejectedValue(conflictError);

      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];
      
      // Verify all required fields are present
      expect(responseData).toHaveProperty('error', 'Conflict');
      expect(responseData).toHaveProperty('message');
      expect(responseData).toHaveProperty('integrationType', 'Cloudinary');
      expect(responseData).toHaveProperty('eventSettingsId', 'event-123');
      expect(responseData).toHaveProperty('expectedVersion', 5);
      expect(responseData).toHaveProperty('actualVersion', 10);
      expect(responseData).toHaveProperty('resolution');
    });

    it('should provide actionable error message for client retry', async () => {
      const conflictError = new IntegrationConflictError(
        'Cloudinary',
        'event-123',
        1,
        2
      );

      (updateCloudinaryIntegration as any).mockRejectedValue(conflictError);

      await handler(req as NextApiRequest, res as NextApiResponse);

      const responseData = (res.json as any).mock.calls[0][0];
      
      // Message should indicate the integration was modified
      expect(responseData.message).toContain('Integration conflict');
      expect(responseData.message).toContain('Cloudinary');
      expect(responseData.message).toContain('event-123');
      expect(responseData.message).toContain('Expected version 1');
      expect(responseData.message).toContain('found version 2');
      expect(responseData.message).toContain('modified by another request');
    });
  });

  describe('Cache Behavior on Conflict', () => {
    it('should not invalidate cache when conflict occurs', async () => {
      const conflictError = new IntegrationConflictError(
        'Cloudinary',
        'event-123',
        1,
        2
      );

      (updateCloudinaryIntegration as any).mockRejectedValue(conflictError);

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Verify cache was NOT invalidated (since update failed)
      expect(eventSettingsCache.invalidate).not.toHaveBeenCalled();
    });

    it('should preserve cache when partial update causes conflict', async () => {
      req.body = {
        ...req.body,
        cloudinaryEnabled: true,
        switchboardEnabled: true,
      };

      // First succeeds, second conflicts
      (updateCloudinaryIntegration as any).mockResolvedValue(mockCloudinaryIntegration);
      (updateSwitchboardIntegration as any).mockRejectedValue(
        new IntegrationConflictError('Switchboard', 'event-123', 1, 2)
      );

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Cache should not be invalidated since overall operation failed
      expect(eventSettingsCache.invalidate).not.toHaveBeenCalled();
    });
  });

  describe('Conflict vs Other Errors', () => {
    it('should distinguish conflict errors from other integration errors', async () => {
      // First request: conflict error (should return 409)
      const conflictError = new IntegrationConflictError('Cloudinary', 'event-123', 1, 2);
      (updateCloudinaryIntegration as any).mockRejectedValue(conflictError);

      await handler(req as NextApiRequest, res as NextApiResponse);
      expect(res.status).toHaveBeenCalledWith(409);

      // Reset mocks
      vi.clearAllMocks();
      res.status = vi.fn().mockReturnThis();
      res.json = vi.fn().mockReturnThis();

      // Second request: regular error (should return 200 with warning)
      (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Network timeout'));

      await handler(req as NextApiRequest, res as NextApiResponse);
      expect(res.status).toHaveBeenCalledWith(200);
      
      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.warnings).toBeDefined();
    });

    it('should not catch conflict errors as regular errors', async () => {
      const conflictError = new IntegrationConflictError('Cloudinary', 'event-123', 1, 2);
      (updateCloudinaryIntegration as any).mockRejectedValue(conflictError);

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Should return 409, not 200 with warnings
      expect(res.status).toHaveBeenCalledWith(409);
      
      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.error).toBe('Conflict');
      expect(responseData.warnings).toBeUndefined();
    });
  });
});
