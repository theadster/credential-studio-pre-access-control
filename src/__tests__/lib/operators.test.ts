/**
 * Unit tests for operator utility functions
 * 
 * Tests all numeric, array, string, and date operators with valid and invalid inputs.
 * Ensures proper validation and error handling.
 */

import { describe, it, expect, vi } from 'vitest';
import { Operator } from 'appwrite';
import {
  createIncrement,
  createDecrement,
  createMultiply,
  createDivide,
  createPower,
  createModulo,
  arrayOperators,
  stringOperators,
  dateOperators,
} from '../../lib/operators';

// Mock Appwrite Operator
vi.mock('appwrite', () => ({
  Operator: {
    increment: vi.fn((value: number, max?: number) => ({ type: 'increment', value, max })),
    decrement: vi.fn((value: number, min?: number) => ({ type: 'decrement', value, min })),
    multiply: vi.fn((value: number) => ({ type: 'multiply', value })),
    divide: vi.fn((value: number) => ({ type: 'divide', value })),
    power: vi.fn((value: number) => ({ type: 'power', value })),
    modulo: vi.fn((value: number) => ({ type: 'modulo', value })),
    arrayAppend: vi.fn((values: any[]) => ({ type: 'arrayAppend', values })),
    arrayPrepend: vi.fn((values: any[]) => ({ type: 'arrayPrepend', values })),
    arrayRemove: vi.fn((value: any) => ({ type: 'arrayRemove', value })),
    arrayInsert: vi.fn((index: number, value: any) => ({ type: 'arrayInsert', index, value })),
    arrayUnique: vi.fn(() => ({ type: 'arrayUnique' })),
    arrayDiff: vi.fn((values: any[]) => ({ type: 'arrayDiff', values })),
    stringConcat: vi.fn((value: string) => ({ type: 'stringConcat', value })),
    dateSetNow: vi.fn(() => ({ type: 'dateSetNow' })),
  },
}));

describe('Numeric Operators', () => {
  describe('createIncrement', () => {
    it('should create increment operator with valid number', () => {
      const result = createIncrement(5);
      expect(result).toEqual({ type: 'increment', value: 5, max: undefined });
      expect(Operator.increment).toHaveBeenCalledWith(5);
    });

    it('should create increment operator with max bound', () => {
      const result = createIncrement(5, { max: 100 });
      expect(result).toEqual({ type: 'increment', value: 5, max: 100 });
      expect(Operator.increment).toHaveBeenCalledWith(5, 100);
    });

    it('should handle negative increment values', () => {
      const result = createIncrement(-3);
      expect(result).toEqual({ type: 'increment', value: -3, max: undefined });
    });

    it('should handle zero increment', () => {
      const result = createIncrement(0);
      expect(result).toEqual({ type: 'increment', value: 0, max: undefined });
    });

    it('should throw error for non-number value', () => {
      expect(() => createIncrement('5' as any)).toThrow('Increment value must be a valid number');
      expect(() => createIncrement(null as any)).toThrow('Increment value must be a valid number');
      expect(() => createIncrement(undefined as any)).toThrow('Increment value must be a valid number');
    });

    it('should throw error for NaN', () => {
      expect(() => createIncrement(NaN)).toThrow('Increment value must be a valid number');
    });
  });

  describe('createDecrement', () => {
    it('should create decrement operator with valid number', () => {
      const result = createDecrement(3);
      expect(result).toEqual({ type: 'decrement', value: 3, min: undefined });
      expect(Operator.decrement).toHaveBeenCalledWith(3);
    });

    it('should create decrement operator with min bound', () => {
      const result = createDecrement(5, { min: 0 });
      expect(result).toEqual({ type: 'decrement', value: 5, min: 0 });
      expect(Operator.decrement).toHaveBeenCalledWith(5, 0);
    });

    it('should handle negative decrement values', () => {
      const result = createDecrement(-2);
      expect(result).toEqual({ type: 'decrement', value: -2, min: undefined });
    });

    it('should throw error for non-number value', () => {
      expect(() => createDecrement('3' as any)).toThrow('Decrement value must be a valid number');
      expect(() => createDecrement({} as any)).toThrow('Decrement value must be a valid number');
    });

    it('should throw error for NaN', () => {
      expect(() => createDecrement(NaN)).toThrow('Decrement value must be a valid number');
    });
  });

  describe('createMultiply', () => {
    it('should create multiply operator with valid number', () => {
      const result = createMultiply(2);
      expect(result).toEqual({ type: 'multiply', value: 2 });
      expect(Operator.multiply).toHaveBeenCalledWith(2);
    });

    it('should handle decimal multipliers', () => {
      const result = createMultiply(1.5);
      expect(result).toEqual({ type: 'multiply', value: 1.5 });
    });

    it('should handle negative multipliers', () => {
      const result = createMultiply(-2);
      expect(result).toEqual({ type: 'multiply', value: -2 });
    });

    it('should throw error for non-number value', () => {
      expect(() => createMultiply('2' as any)).toThrow('Multiply value must be a valid number');
    });

    it('should throw error for NaN', () => {
      expect(() => createMultiply(NaN)).toThrow('Multiply value must be a valid number');
    });
  });

  describe('createDivide', () => {
    it('should create divide operator with valid number', () => {
      const result = createDivide(4);
      expect(result).toEqual({ type: 'divide', value: 4 });
      expect(Operator.divide).toHaveBeenCalledWith(4);
    });

    it('should handle decimal divisors', () => {
      const result = createDivide(2.5);
      expect(result).toEqual({ type: 'divide', value: 2.5 });
    });

    it('should throw error for zero divisor', () => {
      expect(() => createDivide(0)).toThrow('Cannot divide by zero');
    });

    it('should throw error for non-number value', () => {
      expect(() => createDivide('4' as any)).toThrow('Divide value must be a valid number');
    });

    it('should throw error for NaN', () => {
      expect(() => createDivide(NaN)).toThrow('Divide value must be a valid number');
    });
  });

  describe('createPower', () => {
    it('should create power operator with valid number', () => {
      const result = createPower(3);
      expect(result).toEqual({ type: 'power', value: 3 });
      expect(Operator.power).toHaveBeenCalledWith(3);
    });

    it('should handle decimal exponents', () => {
      const result = createPower(0.5);
      expect(result).toEqual({ type: 'power', value: 0.5 });
    });

    it('should handle negative exponents', () => {
      const result = createPower(-2);
      expect(result).toEqual({ type: 'power', value: -2 });
    });

    it('should throw error for non-number value', () => {
      expect(() => createPower('3' as any)).toThrow('Power value must be a valid number');
    });

    it('should throw error for NaN', () => {
      expect(() => createPower(NaN)).toThrow('Power value must be a valid number');
    });
  });

  describe('createModulo', () => {
    it('should create modulo operator with valid number', () => {
      const result = createModulo(5);
      expect(result).toEqual({ type: 'modulo', value: 5 });
      expect(Operator.modulo).toHaveBeenCalledWith(5);
    });

    it('should throw error for zero divisor', () => {
      expect(() => createModulo(0)).toThrow('Modulo divisor cannot be zero');
    });

    it('should throw error for non-number value', () => {
      expect(() => createModulo('5' as any)).toThrow('Modulo value must be a valid number');
    });

    it('should throw error for NaN', () => {
      expect(() => createModulo(NaN)).toThrow('Modulo value must be a valid number');
    });
  });
});

describe('Array Operators', () => {
  describe('arrayOperators.append', () => {
    it('should create arrayAppend operator with valid array', () => {
      const result = arrayOperators.append(['value1', 'value2']);
      expect(result).toEqual({ type: 'arrayAppend', values: ['value1', 'value2'] });
      expect(Operator.arrayAppend).toHaveBeenCalledWith(['value1', 'value2']);
    });

    it('should handle empty array', () => {
      const result = arrayOperators.append([]);
      expect(result).toEqual({ type: 'arrayAppend', values: [] });
    });

    it('should handle arrays with different data types', () => {
      const result = arrayOperators.append([1, 'string', true, null]);
      expect(result).toEqual({ type: 'arrayAppend', values: [1, 'string', true, null] });
    });

    it('should throw error for non-array value', () => {
      expect(() => arrayOperators.append('not-array' as any)).toThrow('arrayAppend requires an array');
      expect(() => arrayOperators.append(123 as any)).toThrow('arrayAppend requires an array');
      expect(() => arrayOperators.append(null as any)).toThrow('arrayAppend requires an array');
    });
  });

  describe('arrayOperators.prepend', () => {
    it('should create arrayPrepend operator with valid array', () => {
      const result = arrayOperators.prepend(['first', 'second']);
      expect(result).toEqual({ type: 'arrayPrepend', values: ['first', 'second'] });
      expect(Operator.arrayPrepend).toHaveBeenCalledWith(['first', 'second']);
    });

    it('should handle empty array', () => {
      const result = arrayOperators.prepend([]);
      expect(result).toEqual({ type: 'arrayPrepend', values: [] });
    });

    it('should throw error for non-array value', () => {
      expect(() => arrayOperators.prepend('not-array' as any)).toThrow('arrayPrepend requires an array');
    });
  });

  describe('arrayOperators.remove', () => {
    it('should create arrayRemove operator with any value', () => {
      const result = arrayOperators.remove('value-to-remove');
      expect(result).toEqual({ type: 'arrayRemove', value: 'value-to-remove' });
      expect(Operator.arrayRemove).toHaveBeenCalledWith('value-to-remove');
    });

    it('should handle numeric values', () => {
      const result = arrayOperators.remove(42);
      expect(result).toEqual({ type: 'arrayRemove', value: 42 });
    });

    it('should handle null and undefined', () => {
      const result1 = arrayOperators.remove(null);
      expect(result1).toEqual({ type: 'arrayRemove', value: null });
      
      const result2 = arrayOperators.remove(undefined);
      expect(result2).toEqual({ type: 'arrayRemove', value: undefined });
    });
  });

  describe('arrayOperators.insert', () => {
    it('should create arrayInsert operator with valid index and value', () => {
      const result = arrayOperators.insert(2, 'new-value');
      expect(result).toEqual({ type: 'arrayInsert', index: 2, value: 'new-value' });
      expect(Operator.arrayInsert).toHaveBeenCalledWith(2, 'new-value');
    });

    it('should handle index 0', () => {
      const result = arrayOperators.insert(0, 'first');
      expect(result).toEqual({ type: 'arrayInsert', index: 0, value: 'first' });
    });

    it('should throw error for negative index', () => {
      expect(() => arrayOperators.insert(-1, 'value')).toThrow('arrayInsert requires a non-negative index');
    });

    it('should throw error for non-number index', () => {
      expect(() => arrayOperators.insert('2' as any, 'value')).toThrow('arrayInsert requires a non-negative index');
    });
  });

  describe('arrayOperators.unique', () => {
    it('should create arrayUnique operator', () => {
      const result = arrayOperators.unique();
      expect(result).toEqual({ type: 'arrayUnique' });
      expect(Operator.arrayUnique).toHaveBeenCalled();
    });
  });

  describe('arrayOperators.diff', () => {
    it('should create arrayDiff operator with valid array', () => {
      const result = arrayOperators.diff(['remove1', 'remove2']);
      expect(result).toEqual({ type: 'arrayDiff', values: ['remove1', 'remove2'] });
      expect(Operator.arrayDiff).toHaveBeenCalledWith(['remove1', 'remove2']);
    });

    it('should handle empty array', () => {
      const result = arrayOperators.diff([]);
      expect(result).toEqual({ type: 'arrayDiff', values: [] });
    });

    it('should throw error for non-array value', () => {
      expect(() => arrayOperators.diff('not-array' as any)).toThrow('arrayDiff requires an array');
    });
  });
});

describe('String Operators', () => {
  describe('stringOperators.concat', () => {
    it('should create stringConcat operator with valid string', () => {
      const result = stringOperators.concat(' - appended text');
      expect(result).toEqual({ type: 'stringConcat', value: ' - appended text' });
      expect(Operator.stringConcat).toHaveBeenCalledWith(' - appended text');
    });

    it('should handle empty string', () => {
      const result = stringOperators.concat('');
      expect(result).toEqual({ type: 'stringConcat', value: '' });
    });

    it('should handle strings with special characters', () => {
      const result = stringOperators.concat('\n\t"special"');
      expect(result).toEqual({ type: 'stringConcat', value: '\n\t"special"' });
    });

    it('should throw error for non-string value', () => {
      expect(() => stringOperators.concat(123 as any)).toThrow('stringConcat requires a string value');
      expect(() => stringOperators.concat(null as any)).toThrow('stringConcat requires a string value');
      expect(() => stringOperators.concat(undefined as any)).toThrow('stringConcat requires a string value');
    });
  });
});

describe('Date Operators', () => {
  describe('dateOperators.setNow', () => {
    it('should create dateSetNow operator', () => {
      const result = dateOperators.setNow();
      expect(result).toEqual({ type: 'dateSetNow' });
      expect(Operator.dateSetNow).toHaveBeenCalled();
    });
  });
});
