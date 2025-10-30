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
} from '../validation';

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
