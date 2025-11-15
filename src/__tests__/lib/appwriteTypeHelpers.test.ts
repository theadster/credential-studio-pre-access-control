import { describe, it, expect } from 'vitest';
import { hasSizeProperty, hasDefaultProperty } from '@/lib/appwriteTypeHelpers';

describe('appwriteTypeHelpers', () => {
  describe('hasSizeProperty', () => {
    it('should identify string attributes', () => {
      const attr = { type: 'string', key: 'test', size: 255, required: false };
      expect(hasSizeProperty(attr as any)).toBe(true);
    });

    it('should identify integer attributes', () => {
      const attr = { type: 'integer', key: 'test', min: 0, max: 100, required: false };
      expect(hasSizeProperty(attr as any)).toBe(true);
    });

    it('should identify double attributes', () => {
      const attr = { type: 'double', key: 'test', min: 0, max: 100, required: false };
      expect(hasSizeProperty(attr as any)).toBe(true);
    });

    it('should reject boolean attributes', () => {
      const attr = { type: 'boolean', key: 'test', required: false };
      expect(hasSizeProperty(attr as any)).toBe(false);
    });

    it('should reject email attributes', () => {
      const attr = { type: 'email', key: 'test', required: false };
      expect(hasSizeProperty(attr as any)).toBe(false);
    });

    it('should reject relationship attributes', () => {
      const attr = { type: 'relationship', key: 'test', relatedCollection: 'other' };
      expect(hasSizeProperty(attr as any)).toBe(false);
    });
  });

  describe('hasDefaultProperty', () => {
    it('should identify string attributes', () => {
      const attr = { type: 'string', key: 'test', size: 255, required: false };
      expect(hasDefaultProperty(attr as any)).toBe(true);
    });

    it('should identify integer attributes', () => {
      const attr = { type: 'integer', key: 'test', min: 0, max: 100, required: false };
      expect(hasDefaultProperty(attr as any)).toBe(true);
    });

    it('should identify double attributes', () => {
      const attr = { type: 'double', key: 'test', min: 0, max: 100, required: false };
      expect(hasDefaultProperty(attr as any)).toBe(true);
    });

    it('should identify boolean attributes', () => {
      const attr = { type: 'boolean', key: 'test', required: false };
      expect(hasDefaultProperty(attr as any)).toBe(true);
    });

    it('should identify email attributes', () => {
      const attr = { type: 'email', key: 'test', required: false };
      expect(hasDefaultProperty(attr as any)).toBe(true);
    });

    it('should identify datetime attributes', () => {
      const attr = { type: 'datetime', key: 'test', required: false };
      expect(hasDefaultProperty(attr as any)).toBe(true);
    });

    it('should reject relationship attributes', () => {
      const attr = { type: 'relationship', key: 'test', relatedCollection: 'other' };
      expect(hasDefaultProperty(attr as any)).toBe(false);
    });

    it('should reject enum attributes', () => {
      const attr = { type: 'enum', key: 'test', elements: ['a', 'b'], required: false };
      expect(hasDefaultProperty(attr as any)).toBe(false);
    });
  });

  describe('type guard usage', () => {
    it('should allow safe property access after type guard', () => {
      const attr = { type: 'string', key: 'test', size: 255, required: false };
      
      if (hasSizeProperty(attr as any)) {
        // TypeScript should allow accessing size here
        expect(typeof attr.size).toBe('number');
      }
    });

    it('should allow safe default access after type guard', () => {
      const attr = { type: 'string', key: 'test', size: 255, required: false, default: 'test' };
      
      if (hasDefaultProperty(attr as any)) {
        // TypeScript should allow accessing default here
        expect(attr.default).toBeDefined();
      }
    });
  });
});
