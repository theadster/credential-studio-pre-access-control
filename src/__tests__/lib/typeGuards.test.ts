import { describe, it, expect } from 'vitest';
import { isError, hasProperty, isFulfilled, isRejected } from '@/lib/typeGuards';

describe('typeGuards', () => {
  describe('isError', () => {
    it('should identify Error instances', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError(new TypeError('test'))).toBe(true);
    });

    it('should reject non-Error values', () => {
      expect(isError('not an error')).toBe(false);
      expect(isError({ message: 'fake error' })).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
    });
  });

  describe('hasProperty', () => {
    it('should identify objects with specific properties', () => {
      expect(hasProperty({ name: 'test' }, 'name')).toBe(true);
      expect(hasProperty({ a: 1, b: 2 }, 'a')).toBe(true);
    });

    it('should reject objects without the property', () => {
      expect(hasProperty({ name: 'test' }, 'age')).toBe(false);
      expect(hasProperty({}, 'anything')).toBe(false);
    });

    it('should reject non-objects', () => {
      expect(hasProperty(null, 'prop')).toBe(false);
      expect(hasProperty(undefined, 'prop')).toBe(false);
      expect(hasProperty('string', 'prop')).toBe(false);
    });
  });

  describe('isFulfilled', () => {
    it('should identify fulfilled promises', () => {
      const fulfilled: PromiseFulfilledResult<string> = {
        status: 'fulfilled',
        value: 'test'
      };
      expect(isFulfilled(fulfilled)).toBe(true);
    });

    it('should reject rejected promises', () => {
      const rejected: PromiseRejectedResult = {
        status: 'rejected',
        reason: new Error('failed')
      };
      expect(isFulfilled(rejected)).toBe(false);
    });
  });

  describe('isRejected', () => {
    it('should identify rejected promises', () => {
      const rejected: PromiseRejectedResult = {
        status: 'rejected',
        reason: new Error('failed')
      };
      expect(isRejected(rejected)).toBe(true);
    });

    it('should reject fulfilled promises', () => {
      const fulfilled: PromiseFulfilledResult<string> = {
        status: 'fulfilled',
        value: 'test'
      };
      expect(isRejected(fulfilled)).toBe(false);
    });
  });

  describe('Promise.allSettled integration', () => {
    it('should correctly filter fulfilled results', async () => {
      const promises = [
        Promise.resolve('success1'),
        Promise.reject(new Error('error')),
        Promise.resolve('success2')
      ];

      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter(isFulfilled);
      const values = fulfilled.map(r => r.value);

      expect(fulfilled).toHaveLength(2);
      expect(values).toEqual(['success1', 'success2']);
    });

    it('should correctly filter rejected results', async () => {
      const promises = [
        Promise.resolve('success'),
        Promise.reject(new Error('error1')),
        Promise.reject(new Error('error2'))
      ];

      const results = await Promise.allSettled(promises);
      const rejected = results.filter(isRejected);
      const reasons = rejected.map(r => r.reason);

      expect(rejected).toHaveLength(2);
      expect(reasons.every(r => r instanceof Error)).toBe(true);
    });
  });
});
