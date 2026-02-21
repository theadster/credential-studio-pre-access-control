/**
 * Integration Error Handling Tests
 * 
 * Tests for task 4: Add integration update error handling
 * Verifies that integration update errors are handled gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/event-settings/index';

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
  flattenEventSettings: vi.fn((settings) => ({
    ...settings,
    cloudinaryEnabled: settings.cloudinary?.enabled || false,
    switchboardEnabled: settings.switchboard?.enabled || false,
    oneSimpleApiEnabled: settings.oneSimpleApi?.enabled || false
  }))
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
    invalidate: vi.fn()
  }
}));

// Mock log settings
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(false))
}));


import { createSessionClient } from '@/lib/appwrite';
import {
  IntegrationConflictError,
  updateCloudinaryIntegration,
  updateSwitchboardIntegration,
  updateOneSimpleApiIntegration
} from '@/lib/appwrite-integrations';

describe('Integration Error Handling', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let mockTablesDB: any;
  let mockAccount: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock databases
    mockTablesDB = {
      listRows: vi.fn(),
      updateRow: vi.fn(),
      createRow: vi.fn()
    };

    // Setup mock account
    mockAccount = {
      get: vi.fn().mockResolvedValue({ $id: 'user123' })
    };

    // Mock createSessionClient
    (createSessionClient as any).mockReturnValue({
      tablesDB: mockTablesDB,
      account: mockAccount
    });

    // Setup request and response
    req = {
      method: 'PUT',
      body: {
        eventName: 'Test Event',
        eventDate: '2024-01-01',
        eventLocation: 'Test Location',
        timeZone: 'America/New_York',
        cloudinaryEnabled: true,
        cloudinaryCloudName: 'test-cloud'
      }
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };

    // Mock event settings fetch
    mockTablesDB.listRows.mockImplementation((dbId: string, tableId: string) => {
      if (tableId === process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID) {
        return Promise.resolve({
          rows: [{
            $id: 'settings123',
            eventName: 'Old Event',
            eventDate: '2023-12-31',
            eventLocation: 'Old Location',
            timeZone: 'America/New_York'
          }]
        });
      }
      if (tableId === process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID) {
        return Promise.resolve({ rows: [] });
      }
      if (tableId === process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID) {
        return Promise.resolve({ rows: [{ $id: 'user123', userId: 'user123' }] });
      }
      // Integration collections
      return Promise.resolve({ rows: [] });
    });

    // Mock update
    mockTablesDB.updateRow.mockResolvedValue({
      $id: 'settings123',
      eventName: 'Test Event',
      eventDate: '2024-01-01',
      eventLocation: 'Test Location',
      timeZone: 'America/New_York'
    });
  });

  it('should handle individual integration update failures gracefully', async () => {
    // Mock Cloudinary update to fail
    (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Network error'));
    
    // Mock other integrations to succeed
    (updateSwitchboardIntegration as any).mockResolvedValue({ success: true });
    (updateOneSimpleApiIntegration as any).mockResolvedValue({ success: true });

    await handler(req as NextApiRequest, res as NextApiResponse);

    // Should return 200 with warnings
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    
    const responseData = (res.json as any).mock.calls[0][0];
    expect(responseData.warnings).toBeDefined();
    expect(responseData.warnings.integrations).toHaveLength(1);
    expect(responseData.warnings.integrations[0].integration).toBe('cloudinary');
    expect(responseData.warnings.integrations[0].message).toBe('Network error');
  });

  it('should handle IntegrationConflictError with 409 response', async () => {
    // Mock Cloudinary update to throw conflict error
    const conflictError = new (IntegrationConflictError as any)(
      'Cloudinary',
      'settings123',
      1,
      2
    );
    (updateCloudinaryIntegration as any).mockRejectedValue(conflictError);

    await handler(req as NextApiRequest, res as NextApiResponse);

    // Should return 409 with conflict details
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalled();
    
    const responseData = (res.json as any).mock.calls[0][0];
    expect(responseData.error).toBe('Conflict');
    expect(responseData.integrationType).toBe('Cloudinary');
    expect(responseData.expectedVersion).toBe(1);
    expect(responseData.actualVersion).toBe(2);
    expect(responseData.resolution).toContain('refresh');
  });

  it('should log detailed error information for failed integrations', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock Switchboard update to fail
    (updateSwitchboardIntegration as any).mockRejectedValue(new Error('API timeout'));
    (updateCloudinaryIntegration as any).mockResolvedValue({ success: true });

    req.body = {
      ...req.body,
      switchboardEnabled: true,
      switchboardApiEndpoint: 'https://api.example.com'
    };

    await handler(req as NextApiRequest, res as NextApiResponse);

    // Should log detailed error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to update Switchboard integration:',
      expect.objectContaining({
        integration: 'Switchboard',
        eventSettingsId: 'settings123',
        fields: expect.arrayContaining(['enabled', 'apiEndpoint']),
        error: 'API timeout',
        timestamp: expect.any(String)
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle multiple integration failures', async () => {
    // Mock all integrations to fail
    (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Cloudinary error'));
    (updateSwitchboardIntegration as any).mockRejectedValue(new Error('Switchboard error'));
    (updateOneSimpleApiIntegration as any).mockRejectedValue(new Error('OneSimpleAPI error'));

    req.body = {
      ...req.body,
      switchboardEnabled: true,
      oneSimpleApiEnabled: true
    };

    await handler(req as NextApiRequest, res as NextApiResponse);

    // Should return 200 with multiple warnings
    expect(res.status).toHaveBeenCalledWith(200);
    
    const responseData = (res.json as any).mock.calls[0][0];
    expect(responseData.warnings).toBeDefined();
    expect(responseData.warnings.integrations).toHaveLength(3);
    
    const integrationNames = responseData.warnings.integrations.map((w: any) => w.integration);
    expect(integrationNames).toContain('cloudinary');
    expect(integrationNames).toContain('switchboard');
    expect(integrationNames).toContain('onesimpleapi');
  });

  it('should set X-Integration-Warnings header when there are partial failures', async () => {
    // Mock one integration to fail
    (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Network error'));

    await handler(req as NextApiRequest, res as NextApiResponse);

    // Should set warning header
    expect(res.setHeader).toHaveBeenCalledWith('X-Integration-Warnings', 'true');
  });

  it('should not set warning header when all integrations succeed', async () => {
    // Mock all integrations to succeed
    (updateCloudinaryIntegration as any).mockResolvedValue({ success: true });
    (updateSwitchboardIntegration as any).mockResolvedValue({ success: true });
    (updateOneSimpleApiIntegration as any).mockResolvedValue({ success: true });

    await handler(req as NextApiRequest, res as NextApiResponse);

    // Should not set warning header
    expect(res.setHeader).not.toHaveBeenCalledWith('X-Integration-Warnings', 'true');
    
    const responseData = (res.json as any).mock.calls[0][0];
    expect(responseData.warnings).toBeUndefined();
  });

  it('should include field information in error warnings', async () => {
    // Mock Cloudinary update to fail
    (updateCloudinaryIntegration as any).mockRejectedValue(new Error('Validation error'));

    req.body = {
      ...req.body,
      cloudinaryEnabled: true,
      cloudinaryCloudName: 'test',
      cloudinaryApiKey: 'key123',
      cloudinaryAutoOptimize: true
    };

    await handler(req as NextApiRequest, res as NextApiResponse);

    const responseData = (res.json as any).mock.calls[0][0];
    expect(responseData.warnings.integrations[0].fields).toBeDefined();
    expect(responseData.warnings.integrations[0].fields).toContain('enabled');
    expect(responseData.warnings.integrations[0].fields).toContain('cloudName');
    expect(responseData.warnings.integrations[0].fields).toContain('apiKey');
    expect(responseData.warnings.integrations[0].fields).toContain('autoOptimize');
  });
});
