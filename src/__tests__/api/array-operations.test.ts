/**
 * Array Operations Integration Tests
 * 
 * Tests for custom field array operations using Appwrite database operators.
 * 
 * Requirements: 2.5, 9.2, 9.4
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  isArrayField,
  parseCustomFieldValue,
  formatCustomFieldValue,
  createArrayAppendOperator,
  createArrayRemoveOperator,
  createArrayUniqueOperator,
  buildCustomFieldUpdateData,
  validateArrayFieldOperation
} from '@/lib/customFieldArrayOperators';

describe('Array Operations - Custom Field Utilities', () => {
  describe('isArrayField', () => {
    it('should identify select fields with multiple option as array fields', () => {
      const fieldOptions = { multiple: true, options: ['Option 1', 'Option 2'] };
      expect(isArrayField('select', fieldOptions)).toBe(true);
    });

    it('should identify explicitly marked array fields', () => {
      const fieldOptions = { isArray: true };
      expect(isArrayField('text', fieldOptions)).toBe(true);
    });

    it('should not identify single-select fields as array fields', () => {
      const fieldOptions = { multiple: false, options: ['Option 1', 'Option 2'] };
      expect(isArrayField('select', fieldOptions)).toBe(false);
    });

    it('should not identify regular text fields as array fields', () => {
      const fieldOptions = {};
      expect(isArrayField('text', fieldOptions)).toBe(false);
    });

    it('should handle string fieldOptions', () => {
      const fieldOptions = JSON.stringify({ multiple: true });
      expect(isArrayField('select', fieldOptions)).toBe(true);
    });
  });

  describe('parseCustomFieldValue', () => {
    it('should parse array values correctly', () => {
      const value = ['value1', 'value2', 'value3'];
      const result = parseCustomFieldValue(value, true);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('should parse comma-separated strings as arrays', () => {
      const value = 'value1, value2, value3';
      const result = parseCustomFieldValue(value, true);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('should return empty array for empty string', () => {
      const result = parseCustomFieldValue('', true);
      expect(result).toEqual([]);
    });

    it('should parse single values as strings', () => {
      const value = 'single value';
      const result = parseCustomFieldValue(value, false);
      expect(result).toBe('single value');
    });

    it('should handle null/undefined for single values', () => {
      expect(parseCustomFieldValue(null, false)).toBe('');
      expect(parseCustomFieldValue(undefined, false)).toBe('');
    });
  });

  describe('formatCustomFieldValue', () => {
    it('should format arrays correctly', () => {
      const value = ['value1', 'value2', 'value3'];
      const result = formatCustomFieldValue(value, true);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('should filter out empty values from arrays', () => {
      const value = ['value1', '', null, 'value2', undefined];
      const result = formatCustomFieldValue(value, true);
      expect(result).toEqual(['value1', 'value2']);
    });

    it('should convert comma-separated strings to arrays', () => {
      const value = 'value1, value2, value3';
      const result = formatCustomFieldValue(value, true);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('should format single values as strings', () => {
      const value = 'single value';
      const result = formatCustomFieldValue(value, false);
      expect(result).toBe('single value');
    });

    it('should handle empty values for single fields', () => {
      expect(formatCustomFieldValue('', false)).toBe('');
      expect(formatCustomFieldValue(null, false)).toBe('');
    });
  });

  describe('createArrayAppendOperator', () => {
    it('should create append operator for single value', () => {
      const result = createArrayAppendOperator('field1', 'newValue');
      expect(result.fieldId).toBe('field1');
      expect(result.operator).toBeDefined();
    });

    it('should create append operator for multiple values', () => {
      const result = createArrayAppendOperator('field1', ['value1', 'value2']);
      expect(result.fieldId).toBe('field1');
      expect(result.operator).toBeDefined();
    });

    it('should filter out empty values', () => {
      const result = createArrayAppendOperator('field1', ['value1', '', null, 'value2']);
      expect(result.fieldId).toBe('field1');
      expect(result.operator).toBeDefined();
    });

    it('should throw error for empty values', () => {
      expect(() => createArrayAppendOperator('field1', [])).toThrow('Cannot append empty values');
      expect(() => createArrayAppendOperator('field1', '')).toThrow('Cannot append empty values');
    });
  });

  describe('createArrayRemoveOperator', () => {
    it('should create remove operator for single value', () => {
      const result = createArrayRemoveOperator('field1', 'valueToRemove');
      expect(result.fieldId).toBe('field1');
      expect(result.operator).toBeDefined();
    });

    it('should create remove operator for multiple values', () => {
      const result = createArrayRemoveOperator('field1', ['value1', 'value2']);
      expect(result.fieldId).toBe('field1');
      expect(result.operator).toBeDefined();
    });

    it('should throw error for empty values', () => {
      expect(() => createArrayRemoveOperator('field1', [])).toThrow('Cannot remove empty values');
      expect(() => createArrayRemoveOperator('field1', '')).toThrow('Cannot remove empty values');
    });
  });

  describe('createArrayUniqueOperator', () => {
    it('should create unique operator', () => {
      const result = createArrayUniqueOperator('field1');
      expect(result.fieldId).toBe('field1');
      expect(result.operator).toBeDefined();
    });
  });

  describe('buildCustomFieldUpdateData', () => {
    const customFieldsMap = new Map([
      ['field1', { fieldType: 'select', fieldOptions: { multiple: true } }],
      ['field2', { fieldType: 'text', fieldOptions: {} }],
      ['field3', { fieldType: 'select', fieldOptions: { multiple: false } }]
    ]);

    it('should build update data with array operators for array fields', () => {
      const changes = {
        field1: ['value1', 'value2'],
        field2: 'text value'
      };
      const currentValues = {};
      
      const result = buildCustomFieldUpdateData(customFieldsMap, changes, currentValues, 'set');
      
      expect(result.field1).toEqual(['value1', 'value2']);
      expect(result.field2).toBe('text value');
    });

    it('should use append operation for array fields', () => {
      const changes = {
        field1: ['newValue']
      };
      const currentValues = {
        field1: ['existingValue']
      };
      
      const result = buildCustomFieldUpdateData(customFieldsMap, changes, currentValues, 'append');
      
      expect(result.field1).toBeDefined();
    });

    it('should use remove operation for array fields', () => {
      const changes = {
        field1: ['valueToRemove']
      };
      const currentValues = {
        field1: ['value1', 'valueToRemove', 'value2']
      };
      
      const result = buildCustomFieldUpdateData(customFieldsMap, changes, currentValues, 'remove');
      
      expect(result.field1).toBeDefined();
    });

    it('should skip unknown fields', () => {
      const changes = {
        unknownField: 'value'
      };
      const currentValues = {};
      
      const result = buildCustomFieldUpdateData(customFieldsMap, changes, currentValues, 'set');
      
      expect(result.unknownField).toBeUndefined();
    });

    it('should handle mixed array and single-value fields', () => {
      const changes = {
        field1: ['arrayValue1', 'arrayValue2'],
        field2: 'singleValue',
        field3: 'selectValue'
      };
      const currentValues = {};
      
      const result = buildCustomFieldUpdateData(customFieldsMap, changes, currentValues, 'set');
      
      expect(result.field1).toEqual(['arrayValue1', 'arrayValue2']);
      expect(result.field2).toBe('singleValue');
      expect(result.field3).toBe('selectValue');
    });
  });

  describe('validateArrayFieldOperation', () => {
    const arrayFieldMeta = {
      fieldType: 'select',
      fieldOptions: { multiple: true, options: ['Option 1', 'Option 2', 'Option 3'] }
    };

    const singleFieldMeta = {
      fieldType: 'text',
      fieldOptions: {}
    };

    it('should validate append operation on array field', () => {
      expect(() => {
        validateArrayFieldOperation('field1', 'append', ['Option 1'], arrayFieldMeta);
      }).not.toThrow();
    });

    it('should validate remove operation on array field', () => {
      expect(() => {
        validateArrayFieldOperation('field1', 'remove', ['Option 1'], arrayFieldMeta);
      }).not.toThrow();
    });

    it('should throw error for append on non-array field', () => {
      expect(() => {
        validateArrayFieldOperation('field1', 'append', 'value', singleFieldMeta);
      }).toThrow('Cannot perform append operation on non-array field');
    });

    it('should throw error for remove on non-array field', () => {
      expect(() => {
        validateArrayFieldOperation('field1', 'remove', 'value', singleFieldMeta);
      }).toThrow('Cannot perform remove operation on non-array field');
    });

    it('should throw error for empty values in append', () => {
      expect(() => {
        validateArrayFieldOperation('field1', 'append', [], arrayFieldMeta);
      }).toThrow('Cannot append empty values');
    });

    it('should throw error for empty values in remove', () => {
      expect(() => {
        validateArrayFieldOperation('field1', 'remove', [], arrayFieldMeta);
      }).toThrow('Cannot remove empty values');
    });

    it('should validate select field options', () => {
      expect(() => {
        validateArrayFieldOperation('field1', 'set', ['Invalid Option'], arrayFieldMeta);
      }).toThrow('Invalid option "Invalid Option" for select field');
    });

    it('should allow valid select field options', () => {
      expect(() => {
        validateArrayFieldOperation('field1', 'set', ['Option 1', 'Option 2'], arrayFieldMeta);
      }).not.toThrow();
    });

    it('should allow set operation on any field', () => {
      expect(() => {
        validateArrayFieldOperation('field1', 'set', 'value', singleFieldMeta);
      }).not.toThrow();
    });
  });
});

describe('Array Operations - Concurrent Operations', () => {
  it('should handle concurrent array append operations', async () => {
    // This test simulates concurrent operations
    // In a real scenario, Appwrite's atomic operators would handle this
    const customFieldsMap = new Map([
      ['field1', { fieldType: 'select', fieldOptions: { multiple: true } }]
    ]);

    const changes1 = { field1: ['value1'] };
    const changes2 = { field1: ['value2'] };
    const changes3 = { field1: ['value3'] };

    // Simulate concurrent operations
    const results = await Promise.all([
      Promise.resolve(buildCustomFieldUpdateData(customFieldsMap, changes1, {}, 'append')),
      Promise.resolve(buildCustomFieldUpdateData(customFieldsMap, changes2, {}, 'append')),
      Promise.resolve(buildCustomFieldUpdateData(customFieldsMap, changes3, {}, 'append'))
    ]);

    // All operations should succeed
    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.field1).toBeDefined();
    });
  });

  it('should handle concurrent array remove operations', async () => {
    const customFieldsMap = new Map([
      ['field1', { fieldType: 'select', fieldOptions: { multiple: true } }]
    ]);

    const currentValues = { field1: ['value1', 'value2', 'value3', 'value4'] };
    const changes1 = { field1: ['value1'] };
    const changes2 = { field1: ['value2'] };

    // Simulate concurrent remove operations
    const results = await Promise.all([
      Promise.resolve(buildCustomFieldUpdateData(customFieldsMap, changes1, currentValues, 'remove')),
      Promise.resolve(buildCustomFieldUpdateData(customFieldsMap, changes2, currentValues, 'remove'))
    ]);

    // All operations should succeed
    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.field1).toBeDefined();
    });
  });
});

describe('Array Operations - Data Integrity', () => {
  it('should maintain data integrity with arrayUnique', () => {
    const customFieldsMap = new Map([
      ['field1', { fieldType: 'select', fieldOptions: { multiple: true } }]
    ]);

    // Set operation with duplicate values
    const changes = { field1: ['value1', 'value2', 'value1', 'value3', 'value2'] };
    const result = buildCustomFieldUpdateData(customFieldsMap, changes, {}, 'set');

    // The formatted array should contain duplicates (unique operation is separate)
    expect(result.field1).toEqual(['value1', 'value2', 'value1', 'value3', 'value2']);

    // Unique operator can be applied separately
    const uniqueOp = createArrayUniqueOperator('field1');
    expect(uniqueOp.operator).toBeDefined();
  });

  it('should preserve order in array operations', () => {
    const customFieldsMap = new Map([
      ['field1', { fieldType: 'select', fieldOptions: { multiple: true } }]
    ]);

    const changes = { field1: ['value3', 'value1', 'value2'] };
    const result = buildCustomFieldUpdateData(customFieldsMap, changes, {}, 'set');

    // Order should be preserved
    expect(result.field1).toEqual(['value3', 'value1', 'value2']);
  });

  it('should handle empty arrays correctly', () => {
    const customFieldsMap = new Map([
      ['field1', { fieldType: 'select', fieldOptions: { multiple: true } }]
    ]);

    const changes = { field1: [] };
    const result = buildCustomFieldUpdateData(customFieldsMap, changes, {}, 'set');

    // Empty array should be preserved
    expect(result.field1).toEqual([]);
  });
});
