import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventSettingsCache } from '../cache';

describe('EventSettingsCache', () => {
  let cache: EventSettingsCache;

  beforeEach(() => {
    cache = new EventSettingsCache();
  });

  describe('get and set', () => {
    it('should store and retrieve data', () => {
      const testData = { id: '1', name: 'Test Event' };
      cache.set('test-key', testData);
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for expired entries', () => {
      const testData = { id: '1', name: 'Test Event' };
      // Set with 100ms TTL
      cache.set('test-key', testData, 100);
      
      // Wait for expiration
      vi.useFakeTimers();
      vi.advanceTimersByTime(150);
      
      const result = cache.get('test-key');
      expect(result).toBeNull();
      
      vi.useRealTimers();
    });

    it('should use default TTL of 5 minutes', () => {
      const testData = { id: '1', name: 'Test Event' };
      cache.set('test-key', testData);
      
      // Should still be valid after 4 minutes
      vi.useFakeTimers();
      vi.advanceTimersByTime(4 * 60 * 1000);
      
      let result = cache.get('test-key');
      expect(result).toEqual(testData);
      
      // Should be expired after 6 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);
      result = cache.get('test-key');
      expect(result).toBeNull();
      
      vi.useRealTimers();
    });
  });

  describe('invalidate', () => {
    it('should remove a cache entry', () => {
      const testData = { id: '1', name: 'Test Event' };
      cache.set('test-key', testData);
      
      expect(cache.get('test-key')).toEqual(testData);
      
      cache.invalidate('test-key');
      expect(cache.get('test-key')).toBeNull();
    });

    it('should not throw error when invalidating non-existent key', () => {
      expect(() => cache.invalidate('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all cache entries', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });
      cache.set('key3', { data: 'value3' });
      
      expect(cache.get('key1')).toBeTruthy();
      expect(cache.get('key2')).toBeTruthy();
      expect(cache.get('key3')).toBeTruthy();
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });

    it('should return empty stats for empty cache', () => {
      const stats = cache.getStats();
      
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });

  describe('custom TTL', () => {
    it('should respect custom TTL values', () => {
      const testData = { id: '1', name: 'Test Event' };
      // Set with 1 second TTL
      cache.set('test-key', testData, 1000);
      
      vi.useFakeTimers();
      
      // Should be valid after 500ms
      vi.advanceTimersByTime(500);
      expect(cache.get('test-key')).toEqual(testData);
      
      // Should be expired after 1.5 seconds
      vi.advanceTimersByTime(1000);
      expect(cache.get('test-key')).toBeNull();
      
      vi.useRealTimers();
    });
  });
});
