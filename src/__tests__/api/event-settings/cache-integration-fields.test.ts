/**
 * Tests for cache handling with complete integration fields
 * Verifies that cached responses include all integration fields
 * and that cache invalidation works correctly after updates
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eventSettingsCache } from '@/lib/cache';
import { flattenEventSettings } from '@/lib/appwrite-integrations';

// No mocks needed - testing cache and helper functions directly

describe('Cache Handling with Integration Fields', () => {
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
    // Clear cache before each test
    eventSettingsCache.clear();
  });

  afterEach(() => {
    // Clean up cache after each test
    eventSettingsCache.clear();
  });

  describe('flattenEventSettings Helper - Complete Integration Field Mapping', () => {
    it('should map all Cloudinary integration fields correctly', () => {
      const eventSettingsWithIntegrations = {
        ...mockEventSettings,
        cloudinary: mockCloudinaryIntegration,
      };

      const flattened = flattenEventSettings(eventSettingsWithIntegrations as any);

      // Verify all 9 Cloudinary fields are mapped
      expect(flattened.cloudinaryEnabled).toBe(true);
      expect(flattened.cloudinaryCloudName).toBe('test-cloud');
      expect(flattened.cloudinaryApiKey).toBe('test-key');
      expect(flattened.cloudinaryApiSecret).toBe('test-secret');
      expect(flattened.cloudinaryUploadPreset).toBe('test-preset');
      expect(flattened.cloudinaryAutoOptimize).toBe(true);
      expect(flattened.cloudinaryGenerateThumbnails).toBe(true);
      expect(flattened.cloudinaryDisableSkipCrop).toBe(false);
      expect(flattened.cloudinaryCropAspectRatio).toBe('16:9');
    });

    it('should map all Switchboard integration fields correctly', () => {
      const eventSettingsWithIntegrations = {
        ...mockEventSettings,
        switchboard: mockSwitchboardIntegration,
      };

      const flattened = flattenEventSettings(eventSettingsWithIntegrations as any);

      // Verify all 7 Switchboard fields are mapped
      expect(flattened.switchboardEnabled).toBe(true);
      expect(flattened.switchboardApiEndpoint).toBe('https://api.switchboard.com');
      expect(flattened.switchboardAuthHeaderType).toBe('Bearer');
      expect(flattened.switchboardApiKey).toBe('switchboard-key');
      expect(flattened.switchboardRequestBody).toBe('{"template": "{{firstName}}"}');
      expect(flattened.switchboardTemplateId).toBe('template-123');
      expect(flattened.switchboardFieldMappings).toEqual([{"field": "firstName", "mapping": "first_name"}]);
    });

    it('should map all OneSimpleAPI integration fields correctly', () => {
      const eventSettingsWithIntegrations = {
        ...mockEventSettings,
        oneSimpleApi: mockOneSimpleApiIntegration,
      };

      const flattened = flattenEventSettings(eventSettingsWithIntegrations as any);

      // Verify all 5 OneSimpleAPI fields are mapped
      expect(flattened.oneSimpleApiEnabled).toBe(true);
      expect(flattened.oneSimpleApiUrl).toBe('https://api.onesimple.com');
      expect(flattened.oneSimpleApiFormDataKey).toBe('data');
      expect(flattened.oneSimpleApiFormDataValue).toBe('{{firstName}}');
      expect(flattened.oneSimpleApiRecordTemplate).toBe('{"name": "{{firstName}}"}');
    });

    it('should provide default values when integration data is missing', () => {
      const eventSettingsWithIntegrations = {
        ...mockEventSettings,
        // No integrations provided
      };

      const flattened = flattenEventSettings(eventSettingsWithIntegrations as any);

      // Verify default Cloudinary values
      expect(flattened.cloudinaryEnabled).toBe(false);
      expect(flattened.cloudinaryCloudName).toBe('');
      expect(flattened.cloudinaryAutoOptimize).toBe(false);
      expect(flattened.cloudinaryGenerateThumbnails).toBe(false);
      expect(flattened.cloudinaryDisableSkipCrop).toBe(false);
      expect(flattened.cloudinaryCropAspectRatio).toBe('1');

      // Verify default Switchboard values
      expect(flattened.switchboardEnabled).toBe(false);
      expect(flattened.switchboardAuthHeaderType).toBe('');
      expect(flattened.switchboardRequestBody).toBe('');
      expect(flattened.switchboardTemplateId).toBe('');
      expect(flattened.switchboardFieldMappings).toEqual([]);

      // Verify default OneSimpleAPI values
      expect(flattened.oneSimpleApiEnabled).toBe(false);
      expect(flattened.oneSimpleApiUrl).toBe('');
      expect(flattened.oneSimpleApiFormDataKey).toBe('');
      expect(flattened.oneSimpleApiFormDataValue).toBe('');
      expect(flattened.oneSimpleApiRecordTemplate).toBe('');
    });

    it('should map all integration fields when all integrations are present', () => {
      const eventSettingsWithIntegrations = {
        ...mockEventSettings,
        cloudinary: mockCloudinaryIntegration,
        switchboard: mockSwitchboardIntegration,
        oneSimpleApi: mockOneSimpleApiIntegration,
      };

      const flattened = flattenEventSettings(eventSettingsWithIntegrations as any);

      // Verify core fields are preserved
      expect(flattened.eventName).toBe('Test Event');
      expect(flattened.eventLocation).toBe('Test Location');

      // Verify all Cloudinary fields
      expect(flattened.cloudinaryEnabled).toBe(true);
      expect(flattened.cloudinaryAutoOptimize).toBe(true);
      expect(flattened.cloudinaryGenerateThumbnails).toBe(true);
      expect(flattened.cloudinaryDisableSkipCrop).toBe(false);
      expect(flattened.cloudinaryCropAspectRatio).toBe('16:9');

      // Verify all Switchboard fields
      expect(flattened.switchboardEnabled).toBe(true);
      expect(flattened.switchboardAuthHeaderType).toBe('Bearer');
      expect(flattened.switchboardRequestBody).toBe('{"template": "{{firstName}}"}');
      expect(flattened.switchboardTemplateId).toBe('template-123');

      // Verify all OneSimpleAPI fields
      expect(flattened.oneSimpleApiEnabled).toBe(true);
      expect(flattened.oneSimpleApiUrl).toBe('https://api.onesimple.com');
      expect(flattened.oneSimpleApiFormDataKey).toBe('data');
      expect(flattened.oneSimpleApiFormDataValue).toBe('{{firstName}}');
      expect(flattened.oneSimpleApiRecordTemplate).toBe('{"name": "{{firstName}}"}');
    });
  });

  describe('Cache Storage and Retrieval', () => {
    it('should store and retrieve complete integration data from cache', () => {
      const completeData = {
        ...mockEventSettings,
        cloudinaryEnabled: true,
        cloudinaryCloudName: 'test-cloud',
        cloudinaryApiKey: 'test-key',
        cloudinaryApiSecret: 'test-secret',
        cloudinaryUploadPreset: 'test-preset',
        cloudinaryAutoOptimize: true,
        cloudinaryGenerateThumbnails: true,
        cloudinaryDisableSkipCrop: false,
        cloudinaryCropAspectRatio: '16:9',
        switchboardEnabled: true,
        switchboardApiEndpoint: 'https://api.switchboard.com',
        switchboardAuthHeaderType: 'Bearer',
        switchboardApiKey: 'switchboard-key',
        switchboardRequestBody: '{"template": "{{firstName}}"}',
        switchboardTemplateId: 'template-123',
        switchboardFieldMappings: [{"field": "firstName", "mapping": "first_name"}],
        oneSimpleApiEnabled: true,
        oneSimpleApiUrl: 'https://api.onesimple.com',
        oneSimpleApiFormDataKey: 'data',
        oneSimpleApiFormDataValue: '{{firstName}}',
        oneSimpleApiRecordTemplate: '{"name": "{{firstName}}"}',
        customFields: [],
      };

      // Store in cache
      eventSettingsCache.set('event-settings', completeData);

      // Retrieve from cache
      const cached = eventSettingsCache.get('event-settings');

      expect(cached).not.toBeNull();
      
      // Verify all Cloudinary fields are preserved
      expect(cached.cloudinaryEnabled).toBe(true);
      expect(cached.cloudinaryAutoOptimize).toBe(true);
      expect(cached.cloudinaryGenerateThumbnails).toBe(true);
      expect(cached.cloudinaryDisableSkipCrop).toBe(false);
      expect(cached.cloudinaryCropAspectRatio).toBe('16:9');

      // Verify all Switchboard fields are preserved
      expect(cached.switchboardEnabled).toBe(true);
      expect(cached.switchboardAuthHeaderType).toBe('Bearer');
      expect(cached.switchboardRequestBody).toBe('{"template": "{{firstName}}"}');
      expect(cached.switchboardTemplateId).toBe('template-123');
      expect(cached.switchboardFieldMappings).toEqual([{"field": "firstName", "mapping": "first_name"}]);

      // Verify all OneSimpleAPI fields are preserved
      expect(cached.oneSimpleApiEnabled).toBe(true);
      expect(cached.oneSimpleApiUrl).toBe('https://api.onesimple.com');
      expect(cached.oneSimpleApiFormDataKey).toBe('data');
      expect(cached.oneSimpleApiFormDataValue).toBe('{{firstName}}');
      expect(cached.oneSimpleApiRecordTemplate).toBe('{"name": "{{firstName}}"}');
    });

    it('should return null for cache miss', () => {
      const cached = eventSettingsCache.get('event-settings');
      expect(cached).toBeNull();
    });

    it('should invalidate cached data', () => {
      const data = {
        ...mockEventSettings,
        cloudinaryAutoOptimize: true,
        customFields: [],
      };

      eventSettingsCache.set('event-settings', data);
      expect(eventSettingsCache.get('event-settings')).not.toBeNull();

      eventSettingsCache.invalidate('event-settings');
      expect(eventSettingsCache.get('event-settings')).toBeNull();
    });

    it('should handle cache TTL expiration', async () => {
      const data = {
        ...mockEventSettings,
        cloudinaryAutoOptimize: true,
        customFields: [],
      };

      // Set cache with 100ms TTL
      eventSettingsCache.set('event-settings', data, 100);

      // Immediately retrieve - should be cached
      let cached = eventSettingsCache.get('event-settings');
      expect(cached).not.toBeNull();

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Retrieve after expiration - should be null
      cached = eventSettingsCache.get('event-settings');
      expect(cached).toBeNull();
    });

    it('should include timestamp in cached data', () => {
      const data = {
        ...mockEventSettings,
        cloudinaryAutoOptimize: true,
        customFields: [],
      };

      eventSettingsCache.set('event-settings', data);
      const cached = eventSettingsCache.get('event-settings');

      expect(cached).not.toBeNull();
      expect(cached.timestamp).toBeDefined();
      expect(typeof cached.timestamp).toBe('number');
      expect(cached.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Cache Integration with flattenEventSettings', () => {
    it('should cache flattened event settings with all integration fields', () => {
      const eventSettingsWithIntegrations = {
        ...mockEventSettings,
        cloudinary: mockCloudinaryIntegration,
        switchboard: mockSwitchboardIntegration,
        oneSimpleApi: mockOneSimpleApiIntegration,
      };

      // Flatten the data (simulating what the API does)
      const flattened = flattenEventSettings(eventSettingsWithIntegrations as any);
      const dataToCache = {
        ...flattened,
        customFields: [],
      };

      // Cache the flattened data
      eventSettingsCache.set('event-settings', dataToCache);

      // Retrieve and verify
      const cached = eventSettingsCache.get('event-settings');
      expect(cached).not.toBeNull();

      // Verify all integration fields are in the cached data
      expect(cached.cloudinaryAutoOptimize).toBe(true);
      expect(cached.cloudinaryGenerateThumbnails).toBe(true);
      expect(cached.switchboardAuthHeaderType).toBe('Bearer');
      expect(cached.switchboardTemplateId).toBe('template-123');
      expect(cached.oneSimpleApiUrl).toBe('https://api.onesimple.com');
      expect(cached.oneSimpleApiFormDataKey).toBe('data');
    });

    it('should cache default values when integrations are missing', () => {
      const eventSettingsWithoutIntegrations = {
        ...mockEventSettings,
      };

      // Flatten the data with no integrations
      const flattened = flattenEventSettings(eventSettingsWithoutIntegrations as any);
      const dataToCache = {
        ...flattened,
        customFields: [],
      };

      // Cache the flattened data
      eventSettingsCache.set('event-settings', dataToCache);

      // Retrieve and verify default values are cached
      const cached = eventSettingsCache.get('event-settings');
      expect(cached).not.toBeNull();

      expect(cached.cloudinaryEnabled).toBe(false);
      expect(cached.cloudinaryAutoOptimize).toBe(false);
      expect(cached.switchboardEnabled).toBe(false);
      expect(cached.switchboardAuthHeaderType).toBe('');
      expect(cached.oneSimpleApiEnabled).toBe(false);
      expect(cached.oneSimpleApiUrl).toBe('');
    });
  });
});
