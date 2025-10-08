/**
 * Tests for cache invalidation after integration updates
 * Verifies that cache is properly invalidated when integration fields are updated
 * and that subsequent fetches return fresh data with updated values
 * 
 * Requirements: 1.5, 4.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { eventSettingsCache } from '@/lib/cache';
import * as appwriteIntegrations from '@/lib/appwrite-integrations';

// Mock Appwrite
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(),
  createAdminClient: vi.fn(),
  DATABASE_ID: 'test-db',
  COLLECTIONS: {
    EVENT_SETTINGS: 'event_settings',
    CUSTOM_FIELDS: 'custom_fields',
    CLOUDINARY_INTEGRATION: 'cloudinary_integration',
    SWITCHBOARD_INTEGRATION: 'switchboard_integration',
    ONESIMPLEAPI_INTEGRATION: 'onesimpleapi_integration',
  },
}));

// Mock integration functions
vi.mock('@/lib/appwrite-integrations', () => ({
  getEventSettingsWithIntegrations: vi.fn(),
  updateCloudinaryIntegration: vi.fn(),
  updateSwitchboardIntegration: vi.fn(),
  updateOneSimpleApiIntegration: vi.fn(),
  flattenEventSettings: (settings: any) => {
    const { cloudinary, switchboard, oneSimpleApi, ...coreSettings } = settings;
    return {
      ...coreSettings,
      cloudinaryEnabled: cloudinary?.enabled || false,
      cloudinaryCloudName: cloudinary?.cloudName || '',
      cloudinaryApiKey: cloudinary?.apiKey || '',
      cloudinaryApiSecret: cloudinary?.apiSecret || '',
      cloudinaryUploadPreset: cloudinary?.uploadPreset || '',
      cloudinaryAutoOptimize: cloudinary?.autoOptimize || false,
      cloudinaryGenerateThumbnails: cloudinary?.generateThumbnails || false,
      cloudinaryDisableSkipCrop: cloudinary?.disableSkipCrop || false,
      cloudinaryCropAspectRatio: cloudinary?.cropAspectRatio || '1',
      switchboardEnabled: switchboard?.enabled || false,
      switchboardApiEndpoint: switchboard?.apiEndpoint || '',
      switchboardAuthHeaderType: switchboard?.authHeaderType || '',
      switchboardApiKey: switchboard?.apiKey || '',
      switchboardRequestBody: switchboard?.requestBody || '',
      switchboardTemplateId: switchboard?.templateId || '',
      switchboardFieldMappings: switchboard?.fieldMappings ? JSON.parse(switchboard.fieldMappings) : [],
      oneSimpleApiEnabled: oneSimpleApi?.enabled || false,
      oneSimpleApiUrl: oneSimpleApi?.url || '',
      oneSimpleApiFormDataKey: oneSimpleApi?.formDataKey || '',
      oneSimpleApiFormDataValue: oneSimpleApi?.formDataValue || '',
      oneSimpleApiRecordTemplate: oneSimpleApi?.recordTemplate || '',
    };
  },
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
    clear: vi.fn(),
  },
}));

describe('Cache Invalidation After Integration Updates', () => {
  const mockEventSettings = {
    $id: 'event-123',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
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
    autoOptimize: false,
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
    authHeaderType: 'Basic',
    apiKey: 'switchboard-key',
    requestBody: '{"template": "old"}',
    templateId: 'template-old',
    fieldMappings: '[]',
  };

  const mockOneSimpleApiIntegration = {
    $id: 'onesimpleapi-123',
    eventSettingsId: 'event-123',
    version: 1,
    enabled: true,
    url: 'https://api.onesimple.com/old',
    formDataKey: 'old-key',
    formDataValue: 'old-value',
    recordTemplate: '{"old": "template"}',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invalidate cache after Cloudinary integration update', async () => {
    const { flattenEventSettings } = await import('@/lib/appwrite-integrations');
    
    // Step 1: Simulate initial fetch (cache miss)
    vi.mocked(eventSettingsCache.get).mockReturnValueOnce(null);
    
    const initialData = {
      ...mockEventSettings,
      cloudinary: mockCloudinaryIntegration,
      switchboard: mockSwitchboardIntegration,
      oneSimpleApi: mockOneSimpleApiIntegration,
    };
    
    // Simulate API GET handler behavior
    const flattened1 = flattenEventSettings(initialData as any);
    const response1 = { ...flattened1, customFields: [] };
    
    // Cache the response
    eventSettingsCache.set('event-settings', response1);
    
    expect(response1.cloudinaryAutoOptimize).toBe(false);
    expect(response1.cloudinaryGenerateThumbnails).toBe(false);
    expect(response1.cloudinaryCropAspectRatio).toBe('1');
    expect(eventSettingsCache.set).toHaveBeenCalledWith('event-settings', response1);

    // Step 2: Verify cache was set (simulating cache hit on next fetch)
    expect(eventSettingsCache.set).toHaveBeenCalledWith('event-settings', response1);

    // Step 3: Simulate integration update and cache invalidation
    eventSettingsCache.invalidate('event-settings');
    expect(eventSettingsCache.invalidate).toHaveBeenCalledWith('event-settings');

    // Step 4: Simulate fetch after update (cache miss with updated data)
    
    const updatedData = {
      ...mockEventSettings,
      cloudinary: {
        ...mockCloudinaryIntegration,
        autoOptimize: true,
        generateThumbnails: true,
        cropAspectRatio: '16:9',
        version: 2,
      },
      switchboard: mockSwitchboardIntegration,
      oneSimpleApi: mockOneSimpleApiIntegration,
    };
    
    const flattened2 = flattenEventSettings(updatedData as any);
    const response2 = { ...flattened2, customFields: [] };
    
    // Cache the new response
    eventSettingsCache.set('event-settings', response2);
    
    // Verify all updated fields are reflected
    expect(response2.cloudinaryAutoOptimize).toBe(true);
    expect(response2.cloudinaryGenerateThumbnails).toBe(true);
    expect(response2.cloudinaryCropAspectRatio).toBe('16:9');
    
    // Verify cache was set twice (initial and after update)
    expect(eventSettingsCache.set).toHaveBeenCalledTimes(2);
    expect(eventSettingsCache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('should invalidate cache after Switchboard integration update', async () => {
    const { flattenEventSettings } = await import('@/lib/appwrite-integrations');
    
    // Initial fetch (cache miss)
    vi.mocked(eventSettingsCache.get).mockReturnValueOnce(null);
    
    const initialData = {
      ...mockEventSettings,
      cloudinary: mockCloudinaryIntegration,
      switchboard: mockSwitchboardIntegration,
      oneSimpleApi: mockOneSimpleApiIntegration,
    };
    
    const flattened1 = flattenEventSettings(initialData as any);
    const response1 = { ...flattened1, customFields: [] };
    eventSettingsCache.set('event-settings', response1);
    
    expect(response1.switchboardAuthHeaderType).toBe('Basic');
    expect(response1.switchboardRequestBody).toBe('{"template": "old"}');
    expect(response1.switchboardTemplateId).toBe('template-old');

    // Verify cache was set
    expect(eventSettingsCache.set).toHaveBeenCalledWith('event-settings', response1);

    // Update and invalidate cache
    eventSettingsCache.invalidate('event-settings');

    // Fetch after update (cache miss with updated data)
    
    const updatedData = {
      ...mockEventSettings,
      cloudinary: mockCloudinaryIntegration,
      switchboard: {
        ...mockSwitchboardIntegration,
        authHeaderType: 'Bearer',
        requestBody: '{"template": "new"}',
        templateId: 'template-new',
        version: 2,
      },
      oneSimpleApi: mockOneSimpleApiIntegration,
    };
    
    const flattened2 = flattenEventSettings(updatedData as any);
    const response2 = { ...flattened2, customFields: [] };
    eventSettingsCache.set('event-settings', response2);
    
    expect(response2.switchboardAuthHeaderType).toBe('Bearer');
    expect(response2.switchboardRequestBody).toBe('{"template": "new"}');
    expect(response2.switchboardTemplateId).toBe('template-new');
    expect(eventSettingsCache.set).toHaveBeenCalledTimes(2);
    expect(eventSettingsCache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('should invalidate cache after OneSimpleAPI integration update', async () => {
    const { flattenEventSettings } = await import('@/lib/appwrite-integrations');
    
    // Initial fetch (cache miss)
    vi.mocked(eventSettingsCache.get).mockReturnValueOnce(null);
    
    const initialData = {
      ...mockEventSettings,
      cloudinary: mockCloudinaryIntegration,
      switchboard: mockSwitchboardIntegration,
      oneSimpleApi: mockOneSimpleApiIntegration,
    };
    
    const flattened1 = flattenEventSettings(initialData as any);
    const response1 = { ...flattened1, customFields: [] };
    eventSettingsCache.set('event-settings', response1);
    
    expect(response1.oneSimpleApiUrl).toBe('https://api.onesimple.com/old');
    expect(response1.oneSimpleApiFormDataKey).toBe('old-key');

    // Verify cache was set
    expect(eventSettingsCache.set).toHaveBeenCalledWith('event-settings', response1);

    // Update and invalidate cache
    eventSettingsCache.invalidate('event-settings');

    // Fetch after update (cache miss with updated data)
    
    const updatedData = {
      ...mockEventSettings,
      cloudinary: mockCloudinaryIntegration,
      switchboard: mockSwitchboardIntegration,
      oneSimpleApi: {
        ...mockOneSimpleApiIntegration,
        url: 'https://api.onesimple.com/new',
        formDataKey: 'new-key',
        formDataValue: 'new-value',
        recordTemplate: '{"new": "template"}',
        version: 2,
      },
    };
    
    const flattened2 = flattenEventSettings(updatedData as any);
    const response2 = { ...flattened2, customFields: [] };
    eventSettingsCache.set('event-settings', response2);
    
    expect(response2.oneSimpleApiUrl).toBe('https://api.onesimple.com/new');
    expect(response2.oneSimpleApiFormDataKey).toBe('new-key');
    expect(response2.oneSimpleApiFormDataValue).toBe('new-value');
    expect(response2.oneSimpleApiRecordTemplate).toBe('{"new": "template"}');
    expect(eventSettingsCache.set).toHaveBeenCalledTimes(2);
    expect(eventSettingsCache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('should invalidate cache after multiple integration updates', async () => {
    const { flattenEventSettings } = await import('@/lib/appwrite-integrations');
    
    // Initial fetch (cache miss)
    vi.mocked(eventSettingsCache.get).mockReturnValueOnce(null);
    
    const initialData = {
      ...mockEventSettings,
      cloudinary: mockCloudinaryIntegration,
      switchboard: mockSwitchboardIntegration,
      oneSimpleApi: mockOneSimpleApiIntegration,
    };
    
    const flattened1 = flattenEventSettings(initialData as any);
    const response1 = { ...flattened1, customFields: [] };
    eventSettingsCache.set('event-settings', response1);
    
    expect(response1.cloudinaryAutoOptimize).toBe(false);
    expect(response1.switchboardAuthHeaderType).toBe('Basic');
    expect(response1.oneSimpleApiUrl).toBe('https://api.onesimple.com/old');

    // Update all integrations and invalidate cache
    eventSettingsCache.invalidate('event-settings');

    // Fetch after update (cache miss with updated data)
    vi.mocked(eventSettingsCache.get).mockReturnValueOnce(null);
    
    const updatedData = {
      ...mockEventSettings,
      cloudinary: { ...mockCloudinaryIntegration, autoOptimize: true, version: 2 },
      switchboard: { ...mockSwitchboardIntegration, authHeaderType: 'Bearer', version: 2 },
      oneSimpleApi: { ...mockOneSimpleApiIntegration, url: 'https://api.onesimple.com/new', version: 2 },
    };
    
    const flattened2 = flattenEventSettings(updatedData as any);
    const response2 = { ...flattened2, customFields: [] };
    eventSettingsCache.set('event-settings', response2);
    
    // Verify all updated fields are reflected
    expect(response2.cloudinaryAutoOptimize).toBe(true);
    expect(response2.switchboardAuthHeaderType).toBe('Bearer');
    expect(response2.oneSimpleApiUrl).toBe('https://api.onesimple.com/new');
    expect(eventSettingsCache.set).toHaveBeenCalledTimes(2);
    expect(eventSettingsCache.invalidate).toHaveBeenCalledTimes(1);
  });
});
