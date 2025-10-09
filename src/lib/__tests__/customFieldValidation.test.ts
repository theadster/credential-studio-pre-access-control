import { describe, it, expect } from 'vitest';
import { findCustomFieldDependencies } from '../customFieldValidation';
import { EventSettingsWithIntegrations } from '../appwrite-integrations';

describe('customFieldValidation type guard', () => {
  it('should correctly identify EventSettingsWithIntegrations format', () => {
    const newFormatSettings: EventSettingsWithIntegrations = {
      $id: 'event123',
      eventName: 'Test Event',
      eventDate: '2025-01-01',
      eventTime: '10:00',
      eventLocation: 'Test Location',
      timeZone: 'UTC',
      barcodeType: 'numerical',
      barcodeLength: 6,
      barcodeUnique: true,
      forceFirstNameUppercase: false,
      forceLastNameUppercase: false,
      attendeeSortField: 'lastName',
      attendeeSortDirection: 'asc',
      bannerImageUrl: '',
      signInBannerUrl: '',
      switchboard: {
        $id: 'sb123',
        eventSettingsId: 'event123',
        version: 1,
        enabled: true,
        apiEndpoint: 'https://api.example.com',
        authHeaderType: 'Bearer',
        requestBody: '{"name": "{{firstName}}"}',
        templateId: 'template123',
        fieldMappings: '[]'
      }
    };

    const dependencies = findCustomFieldDependencies(
      'field123',
      'First Name',
      'firstName',
      newFormatSettings
    );

    // Should find the dependency in switchboard.requestBody
    expect(dependencies).toHaveLength(1);
    expect(dependencies[0].type).toBe('switchboard_template');
  });

  it('should correctly identify legacy format', () => {
    const legacySettings = {
      switchboardRequestBody: '{"name": "{{firstName}}"}'
    };

    const dependencies = findCustomFieldDependencies(
      'field123',
      'First Name',
      'firstName',
      legacySettings
    );

    // Should find the dependency in legacy switchboardRequestBody
    expect(dependencies).toHaveLength(1);
    expect(dependencies[0].type).toBe('switchboard_template');
  });

  it('should not confuse legacy settings with new format', () => {
    // Legacy settings that happen to have $id but lack other properties
    const ambiguousSettings = {
      $id: 'some-id',
      switchboardRequestBody: '{"name": "{{firstName}}"}'
    };

    const dependencies = findCustomFieldDependencies(
      'field123',
      'First Name',
      'firstName',
      ambiguousSettings
    );

    // Should still work and find the dependency
    expect(dependencies).toHaveLength(1);
    expect(dependencies[0].type).toBe('switchboard_template');
  });

  it('should handle new format with oneSimpleApi integration', () => {
    const newFormatSettings: EventSettingsWithIntegrations = {
      $id: 'event123',
      eventName: 'Test Event',
      eventDate: '2025-01-01',
      eventTime: '10:00',
      eventLocation: 'Test Location',
      timeZone: 'UTC',
      barcodeType: 'numerical',
      barcodeLength: 6,
      barcodeUnique: true,
      forceFirstNameUppercase: false,
      forceLastNameUppercase: false,
      attendeeSortField: 'lastName',
      attendeeSortDirection: 'asc',
      bannerImageUrl: '',
      signInBannerUrl: '',
      oneSimpleApi: {
        $id: 'osa123',
        eventSettingsId: 'event123',
        version: 1,
        enabled: true,
        url: 'https://api.example.com',
        formDataKey: 'data',
        formDataValue: '{{firstName}}',
        recordTemplate: '{{lastName}}'
      }
    };

    const dependencies = findCustomFieldDependencies(
      'field123',
      'First Name',
      'firstName',
      newFormatSettings
    );

    // Should find the dependency in oneSimpleApi.formDataValue
    expect(dependencies).toHaveLength(1);
    expect(dependencies[0].type).toBe('onesimpleapi_template');
  });
});
