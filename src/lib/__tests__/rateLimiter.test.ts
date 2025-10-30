import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import rateLimiter from '../rateLimiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    rateLimiter.clear();
  });

  afterEach(() => {
    rateLimiter.clear();
  });

  describe('Basic Functionality', () => {
    it('should allow requests under the limit', () => {
      const result1 = rateLimiter.check('test-key', 3, 60000);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = rateLimiter.check('test-key', 3, 60000);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = rateLimiter.check('test-key', 3, 60000);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests over the limit', () => {
      // Use up the limit
      rateLimiter.check('test-key', 3, 60000);
      rateLimiter.check('test-key', 3, 60000);
      rateLimiter.check('test-key', 3, 60000);

      // This should be blocked
      const result = rateLimiter.check('test-key', 3, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should return resetAt timestamp', () => {
      const before = Date.now();
      const result = rateLimiter.check('test-key', 3, 60000);
      const after = Date.now();

      expect(result.resetAt).toBeGreaterThanOrEqual(before + 60000);
      expect(result.resetAt).toBeLessThanOrEqual(after + 60000);
    });
  });

  describe('Time Window Expiration', () => {
    it('should reset after time window expires', () => {
      vi.useFakeTimers();

      // Use up the limit
      rateLimiter.check('test-key', 3, 60000);
      rateLimiter.check('test-key', 3, 60000);
      rateLimiter.check('test-key', 3, 60000);

      // Should be blocked
      let result = rateLimiter.check('test-key', 3, 60000);
      expect(result.allowed).toBe(false);

      // Fast forward 61 seconds
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      result = rateLimiter.check('test-key', 3, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);

      vi.useRealTimers();
    });

    it('should not reset before time window expires', () => {
      vi.useFakeTimers();

      // Use up the limit
      rateLimiter.check('test-key', 3, 60000);
      rateLimiter.check('test-key', 3, 60000);
      rateLimiter.check('test-key', 3, 60000);

      // Should be blocked
      let result = rateLimiter.check('test-key', 3, 60000);
      expect(result.allowed).toBe(false);

      // Fast forward 30 seconds (not enough)
      vi.advanceTimersByTime(30000);

      // Should still be blocked
      result = rateLimiter.check('test-key', 3, 60000);
      expect(result.allowed).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('Multiple Keys', () => {
    it('should handle different keys independently', () => {
      rateLimiter.check('key1', 2, 60000);
      rateLimiter.check('key1', 2, 60000);

      // key1 is at limit
      let result = rateLimiter.check('key1', 2, 60000);
      expect(result.allowed).toBe(false);

      // key2 should still be allowed
      result = rateLimiter.check('key2', 2, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should track multiple keys simultaneously', () => {
      const keys = ['user1', 'user2', 'user3'];

      keys.forEach(key => {
        const result = rateLimiter.check(key, 5, 60000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
      });

      // Each key should have its own count
      keys.forEach(key => {
        const result = rateLimiter.check(key, 5, 60000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(3);
      });
    });
  });

  describe('Manual Reset', () => {
    it('should reset a specific key', () => {
      rateLimiter.check('test-key', 3, 60000);
      rateLimiter.check('test-key', 3, 60000);
      rateLimiter.check('test-key', 3, 60000);

      // Should be blocked
      let result = rateLimiter.check('test-key', 3, 60000);
      expect(result.allowed).toBe(false);

      // Reset the key
      rateLimiter.reset('test-key');

      // Should be allowed again
      result = rateLimiter.check('test-key', 3, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should not affect other keys when resetting', () => {
      rateLimiter.check('key1', 2, 60000);
      rateLimiter.check('key1', 2, 60000);
      rateLimiter.check('key2', 2, 60000);

      // Reset key1
      rateLimiter.reset('key1');

      // key1 should be reset
      let result = rateLimiter.check('key1', 2, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);

      // key2 should be unchanged
      result = rateLimiter.check('key2', 2, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });
  });

  describe('Clear All', () => {
    it('should clear all entries', () => {
      rateLimiter.check('key1', 2, 60000);
      rateLimiter.check('key1', 2, 60000);
      rateLimiter.check('key2', 2, 60000);
      rateLimiter.check('key2', 2, 60000);

      // Both keys at limit
      expect(rateLimiter.check('key1', 2, 60000).allowed).toBe(false);
      expect(rateLimiter.check('key2', 2, 60000).allowed).toBe(false);

      // Clear all
      rateLimiter.clear();

      // Both keys should be reset
      expect(rateLimiter.check('key1', 2, 60000).allowed).toBe(true);
      expect(rateLimiter.check('key2', 2, 60000).allowed).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle limit of 1', () => {
      const result1 = rateLimiter.check('test-key', 1, 60000);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(0);

      const result2 = rateLimiter.check('test-key', 1, 60000);
      expect(result2.allowed).toBe(false);
      expect(result2.remaining).toBe(0);
    });

    it('should handle very short time windows', () => {
      vi.useFakeTimers();

      rateLimiter.check('test-key', 2, 1000); // 1 second window
      rateLimiter.check('test-key', 2, 1000);

      // Should be blocked
      let result = rateLimiter.check('test-key', 2, 1000);
      expect(result.allowed).toBe(false);

      // Fast forward 1.1 seconds
      vi.advanceTimersByTime(1100);

      // Should be allowed again
      result = rateLimiter.check('test-key', 2, 1000);
      expect(result.allowed).toBe(true);

      vi.useRealTimers();
    });

    it('should handle very large limits', () => {
      const limit = 1000;

      for (let i = 0; i < limit; i++) {
        const result = rateLimiter.check('test-key', limit, 60000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(limit - i - 1);
      }

      // Should be blocked after limit
      const result = rateLimiter.check('test-key', limit, 60000);
      expect(result.allowed).toBe(false);
    });

    it('should handle empty key string', () => {
      const result = rateLimiter.check('', 3, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });
  });

  describe('Password Reset Scenarios', () => {
    it('should enforce per-user limit (3 per hour)', () => {
      const userId = 'user123';
      const key = `password-reset:user:${userId}`;
      const limit = 3;
      const window = 60 * 60 * 1000; // 1 hour

      // First 3 attempts should succeed
      for (let i = 0; i < limit; i++) {
        const result = rateLimiter.check(key, limit, window);
        expect(result.allowed).toBe(true);
      }

      // 4th attempt should fail
      const result = rateLimiter.check(key, limit, window);
      expect(result.allowed).toBe(false);
    });

    it('should enforce per-admin limit (20 per hour)', () => {
      const adminId = 'admin123';
      const limit = 20;
      const window = 60 * 60 * 1000; // 1 hour

      // Admin can send to 20 different users
      for (let i = 0; i < limit; i++) {
        const key = `password-reset:admin:${adminId}`;
        const result = rateLimiter.check(key, limit, window);
        expect(result.allowed).toBe(true);
      }

      // 21st attempt should fail
      const key = `password-reset:admin:${adminId}`;
      const result = rateLimiter.check(key, limit, window);
      expect(result.allowed).toBe(false);
    });

    it('should allow different users to have independent limits', () => {
      const user1Key = 'password-reset:user:user1';
      const user2Key = 'password-reset:user:user2';
      const limit = 3;
      const window = 60 * 60 * 1000;

      // Use up user1's limit
      for (let i = 0; i < limit; i++) {
        rateLimiter.check(user1Key, limit, window);
      }

      // user1 should be blocked
      expect(rateLimiter.check(user1Key, limit, window).allowed).toBe(false);

      // user2 should still be allowed
      expect(rateLimiter.check(user2Key, limit, window).allowed).toBe(true);
    });
  });
});
