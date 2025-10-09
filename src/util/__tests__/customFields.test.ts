import { describe, it, expect } from 'vitest';
import { parseCustomFieldValues } from '../customFields';

describe('parseCustomFieldValues', () => {
  describe('null/undefined handling', () => {
    it('should return empty array for null', () => {
      expect(parseCustomFieldValues(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(parseCustomFieldValues(undefined)).toEqual([]);
    });
  });

  describe('JSON string parsing', () => {
    it('should parse valid JSON string to array', () => {
      const jsonString = JSON.stringify([
        { customFieldId: 'field1', value: 'value1' },
        { customFieldId: 'field2', value: 'value2' }
      ]);
      expect(parseCustomFieldValues(jsonString)).toEqual([
        { customFieldId: 'field1', value: 'value1' },
        { customFieldId: 'field2', value: 'value2' }
      ]);
    });

    it('should parse JSON object string to array format', () => {
      const jsonString = JSON.stringify({ field1: 'value1', field2: 'value2' });
      expect(parseCustomFieldValues(jsonString)).toEqual([
        { customFieldId: 'field1', value: 'value1' },
        { customFieldId: 'field2', value: 'value2' }
      ]);
    });

    it('should return empty array for invalid JSON string', () => {
      expect(parseCustomFieldValues('invalid json')).toEqual([]);
    });
  });

  describe('object format conversion', () => {
    it('should convert object to array format', () => {
      const obj = { field1: 'value1', field2: 'value2' };
      expect(parseCustomFieldValues(obj)).toEqual([
        { customFieldId: 'field1', value: 'value1' },
        { customFieldId: 'field2', value: 'value2' }
      ]);
    });

    it('should convert values to strings', () => {
      const obj = { field1: 123, field2: true, field3: null };
      expect(parseCustomFieldValues(obj)).toEqual([
        { customFieldId: 'field1', value: '123' },
        { customFieldId: 'field2', value: 'true' },
        { customFieldId: 'field3', value: 'null' }
      ]);
    });
  });

  describe('array format validation', () => {
    it('should validate and return valid array', () => {
      const arr = [
        { customFieldId: 'field1', value: 'value1' },
        { customFieldId: 'field2', value: 'value2' }
      ];
      expect(parseCustomFieldValues(arr)).toEqual([
        { customFieldId: 'field1', value: 'value1' },
        { customFieldId: 'field2', value: 'value2' }
      ]);
    });

    it('should normalize numeric customFieldId to string', () => {
      const arr = [
        { customFieldId: 123, value: 'value1' },
        { customFieldId: 456, value: 'value2' }
      ];
      expect(parseCustomFieldValues(arr)).toEqual([
        { customFieldId: '123', value: 'value1' },
        { customFieldId: '456', value: 'value2' }
      ]);
    });

    it('should normalize non-string values to strings', () => {
      const arr = [
        { customFieldId: 'field1', value: 123 },
        { customFieldId: 'field2', value: true },
        { customFieldId: 'field3', value: null }
      ];
      expect(parseCustomFieldValues(arr)).toEqual([
        { customFieldId: 'field1', value: '123' },
        { customFieldId: 'field2', value: 'true' },
        { customFieldId: 'field3', value: 'null' }
      ]);
    });

    it('should throw TypeError for non-object array element', () => {
      const arr = [
        { customFieldId: 'field1', value: 'value1' },
        'invalid',
        { customFieldId: 'field2', value: 'value2' }
      ];
      expect(() => parseCustomFieldValues(arr)).toThrow(
        'Invalid custom field value at index 1: expected object, got string'
      );
    });

    it('should throw TypeError for null array element', () => {
      const arr = [
        { customFieldId: 'field1', value: 'value1' },
        null,
        { customFieldId: 'field2', value: 'value2' }
      ];
      expect(() => parseCustomFieldValues(arr)).toThrow(
        'Invalid custom field value at index 1: expected object, got object'
      );
    });

    it('should throw TypeError for missing customFieldId', () => {
      const arr = [
        { customFieldId: 'field1', value: 'value1' },
        { value: 'value2' }
      ];
      expect(() => parseCustomFieldValues(arr)).toThrow(
        "Invalid custom field value at index 1: missing required field 'customFieldId'"
      );
    });

    it('should throw TypeError for invalid customFieldId type', () => {
      const arr = [
        { customFieldId: 'field1', value: 'value1' },
        { customFieldId: true, value: 'value2' }
      ];
      expect(() => parseCustomFieldValues(arr)).toThrow(
        'Invalid custom field value at index 1: customFieldId must be string or number, got boolean'
      );
    });

    it('should throw TypeError for missing value field', () => {
      const arr = [
        { customFieldId: 'field1', value: 'value1' },
        { customFieldId: 'field2' }
      ];
      expect(() => parseCustomFieldValues(arr)).toThrow(
        "Invalid custom field value at index 1: missing required field 'value'"
      );
    });

    it('should handle empty array', () => {
      expect(parseCustomFieldValues([])).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for primitive types', () => {
      expect(parseCustomFieldValues(123)).toEqual([]);
      expect(parseCustomFieldValues(true)).toEqual([]);
    });

    it('should handle array with single element', () => {
      const arr = [{ customFieldId: 'field1', value: 'value1' }];
      expect(parseCustomFieldValues(arr)).toEqual([
        { customFieldId: 'field1', value: 'value1' }
      ]);
    });

    it('should handle mixed string and number customFieldIds', () => {
      const arr = [
        { customFieldId: 'field1', value: 'value1' },
        { customFieldId: 123, value: 'value2' },
        { customFieldId: 'field3', value: 'value3' }
      ];
      expect(parseCustomFieldValues(arr)).toEqual([
        { customFieldId: 'field1', value: 'value1' },
        { customFieldId: '123', value: 'value2' },
        { customFieldId: 'field3', value: 'value3' }
      ]);
    });
  });
});
