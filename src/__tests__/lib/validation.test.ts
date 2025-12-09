/**
 * Tests for Validation Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateJSON,
  validateSwitchboardRequestBody,
  validateEventSettings,
  validateCustomField,
  validateFieldMapping,
  isValidURL,
  isValidEmail
} from '@/lib/validation';

describe('validateJSON', () => {
  it('should validate correct JSON', () => {
    const result = validateJSON('{"valid": true}');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject invalid JSON', () => {
    const result = validateJSON('{invalid}');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject empty string', () => {
    const result = validateJSON('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should handle arrays', () => {
    const result = validateJSON('[1, 2, 3]');
    expect(result.valid).toBe(true);
  });
});

describe('validateSwitchboardRequestBody', () => {
  it('should validate correct request body with template_id', () => {
    const body = '{"template_id": "{{template_id}}", "data": {}}';
    const result = validateSwitchboardRequestBody(body);
    expect(result.valid).toBe(true);
  });

  it('should reject body without template_id placeholder', () => {
    const body = '{"data": {}}';
    const result = validateSwitchboardRequestBody(body);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('template_id');
  });

  it('should reject invalid JSON', () => {
    const body = '{invalid}';
    const result = validateSwitchboardRequestBody(body);
    expect(result.valid).toBe(false);
  });

  it('should reject arrays', () => {
    const body = '[{"template_id": "{{template_id}}"}]';
    const result = validateSwitchboardRequestBody(body);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('object');
  });

  it('should reject primitives', () => {
    const body = '"string"';
    const result = validateSwitchboardRequestBody(body);
    expect(result.valid).toBe(false);
  });

  it('should handle malformed JSON with template_id placeholder gracefully', () => {
    // Edge case: has template_id but JSON is malformed in a way that might slip through initial validation
    const body = '{"template_id": "{{template_id}}", "data": undefined}';
    const result = validateSwitchboardRequestBody(body);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('validateEventSettings', () => {
  it('should validate complete settings', () => {
    const settings = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location'
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(true);
  });

  it('should reject missing eventName', () => {
    const settings = {
      eventDate: '2024-12-31',
      eventLocation: 'Test Location'
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('eventName');
  });

  it('should reject empty eventName', () => {
    const settings = {
      eventName: '   ',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location'
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(false);
  });

  it('should validate barcode length', () => {
    const settings = {
      eventName: 'Test',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      barcodeLength: 25
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Barcode length');
  });

  it('should accept valid barcode length', () => {
    const settings = {
      eventName: 'Test',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      barcodeLength: 8
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(true);
  });

  it('should require webhook URL when OneSimpleAPI is enabled', () => {
    const settings = {
      eventName: 'Test',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      oneSimpleApiEnabled: true
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Webhook URL is required');
  });

  it('should validate webhook URL format when OneSimpleAPI is enabled', () => {
    const settings = {
      eventName: 'Test',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      oneSimpleApiEnabled: true,
      oneSimpleApiUrl: 'not-a-valid-url'
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('valid URL');
  });

  it('should accept valid webhook URL when OneSimpleAPI is enabled', () => {
    const settings = {
      eventName: 'Test',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      oneSimpleApiEnabled: true,
      oneSimpleApiUrl: 'https://api.example.com/webhook'
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(true);
  });

  it('should not validate webhook URL when OneSimpleAPI is disabled', () => {
    const settings = {
      eventName: 'Test',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      oneSimpleApiEnabled: false,
      oneSimpleApiUrl: 'not-a-valid-url'
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(true);
  });

  it('should reject empty webhook URL when OneSimpleAPI is enabled', () => {
    const settings = {
      eventName: 'Test',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      oneSimpleApiEnabled: true,
      oneSimpleApiUrl: '   '
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Webhook URL is required');
  });

  // Tests for isUpdate parameter
  it('should allow partial updates when isUpdate=true', () => {
    const settings = {
      accessControlDefaults: {
        accessEnabled: true,
        validFromUseToday: true
      }
    };
    const result = validateEventSettings(settings, true);
    expect(result.valid).toBe(true);
  });

  it('should reject missing required fields when isUpdate=false', () => {
    const settings = {
      accessControlDefaults: {
        accessEnabled: true
      }
    };
    const result = validateEventSettings(settings, false);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('eventName');
  });

  it('should validate present required fields even in update mode', () => {
    const settings = {
      eventName: '',  // Empty string should still fail
      accessControlDefaults: {
        accessEnabled: true
      }
    };
    const result = validateEventSettings(settings, true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('eventName');
  });

  it('should allow updating only accessControlDefaults', () => {
    const settings = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      accessControlDefaults: {
        accessEnabled: false,
        validFrom: '2024-01-01',
        validUntil: '2024-12-31',
        validFromUseToday: false
      }
    };
    const result = validateEventSettings(settings, true);
    expect(result.valid).toBe(true);
  });

  // Tests for mobile settings passcode validation
  it('should accept valid 4-digit passcode', () => {
    const settings = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      mobileSettingsPasscode: '1234'
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(true);
  });

  it('should accept null passcode (no protection)', () => {
    const settings = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      mobileSettingsPasscode: null
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(true);
  });

  it('should reject passcode with less than 4 digits', () => {
    const settings = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      mobileSettingsPasscode: '123'
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('4 numerical digits');
  });

  it('should reject passcode with more than 4 digits', () => {
    const settings = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      mobileSettingsPasscode: '12345'
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('4 numerical digits');
  });

  it('should reject passcode with non-numerical characters', () => {
    const settings = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      mobileSettingsPasscode: '12a4'
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('4 numerical digits');
  });

  it('should reject passcode with special characters', () => {
    const settings = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      mobileSettingsPasscode: '12-4'
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('4 numerical digits');
  });

  it('should accept passcode with leading zeros', () => {
    const settings = {
      eventName: 'Test Event',
      eventDate: '2024-12-31',
      eventLocation: 'Test Location',
      mobileSettingsPasscode: '0123'
    };
    const result = validateEventSettings(settings);
    expect(result.valid).toBe(true);
  });

  it('should accept passcode in update mode', () => {
    const settings = {
      mobileSettingsPasscode: '5678'
    };
    const result = validateEventSettings(settings, true);
    expect(result.valid).toBe(true);
  });
});

describe('validateCustomField', () => {
  it('should validate complete field', () => {
    const field = {
      fieldName: 'Test Field',
      fieldType: 'text'
    };
    const result = validateCustomField(field);
    expect(result.valid).toBe(true);
  });

  it('should reject missing fieldName', () => {
    const field = {
      fieldType: 'text'
    };
    const result = validateCustomField(field);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Field name');
  });

  it('should reject select field without options', () => {
    const field = {
      fieldName: 'Test',
      fieldType: 'select'
    };
    const result = validateCustomField(field);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('option');
  });

  it('should reject select field with empty options', () => {
    const field = {
      fieldName: 'Test',
      fieldType: 'select',
      fieldOptions: { options: [] }
    };
    const result = validateCustomField(field);
    expect(result.valid).toBe(false);
  });

  it('should validate select field with options', () => {
    const field = {
      fieldName: 'Test',
      fieldType: 'select',
      fieldOptions: { options: ['Option 1', 'Option 2'] }
    };
    const result = validateCustomField(field);
    expect(result.valid).toBe(true);
  });
});

describe('validateFieldMapping', () => {
  it('should validate complete mapping', () => {
    const mapping = {
      fieldId: 'field123',
      jsonVariable: 'myVariable'
    };
    const result = validateFieldMapping(mapping);
    expect(result.valid).toBe(true);
  });

  it('should reject missing fieldId', () => {
    const mapping = {
      jsonVariable: 'myVariable'
    };
    const result = validateFieldMapping(mapping);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Field ID');
  });

  it('should reject invalid variable names', () => {
    const mapping = {
      fieldId: 'field123',
      jsonVariable: '123invalid'
    };
    const result = validateFieldMapping(mapping);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('identifier');
  });

  it('should accept valid variable names', () => {
    const validNames = ['myVar', '_private', '$jquery', 'camelCase', 'snake_case'];
    validNames.forEach(name => {
      const result = validateFieldMapping({
        fieldId: 'field123',
        jsonVariable: name
      });
      expect(result.valid).toBe(true);
    });
  });
});

describe('isValidURL', () => {
  it('should validate correct URLs', () => {
    expect(isValidURL('https://example.com')).toBe(true);
    expect(isValidURL('http://example.com')).toBe(true);
    expect(isValidURL('https://example.com/path')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidURL('not a url')).toBe(false);
    expect(isValidURL('example.com')).toBe(false);
    expect(isValidURL('')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('should validate correct emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@example.co.uk')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('not an email')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});
