import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit, resetRateLimit, clearAllRateLimits } from '../rateLimit';

describe('Rate Limiter', () => {
  // Clear all rate limit entries before and after each test for complete isolation
  // This ensures no non-expired entries persist between tests
  beforeEach(() => {
    clearAllRateLimits();
  });

  afterEach(() => {
    clearAllRateLimits();
  });

  describe('Basic Functionality', () => {
    it('should allow requests under the limit', () => {
      const result1 = checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      expect(result1.limited).toBe(false);
      expect(result1.remaining).toBe(2);

      const result2 = checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      expect(result2.limited).toBe(false);
      expect(result2.remaining).toBe(1);

      const result3 = checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      expect(result3.limited).toBe(false);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests over the limit', () => {
      // Use up the limit
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });

      // This should be blocked
      const result = checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      expect(result.limited).toBe(true);
      expect(result.remaining).toBeUndefined();
    });

    it('should return resetAt timestamp', () => {
      const before = Date.now();
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      const result = checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      const after = Date.now();

      expect(result.resetAt).toBeGreaterThanOrEqual(before + 60000);
      expect(result.resetAt).toBeLessThanOrEqual(after + 60000);
    });
  });

  describe('Time Window Expiration', () => {
    it('should reset after time window expires', () => {
      vi.useFakeTimers();

      // Use up the limit
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });

      // Should be blocked
      let result = checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      expect(result.limited).toBe(true);

      // Fast forward 61 seconds
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      result = checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(2);

      vi.useRealTimers();
    });

    it('should not reset before time window expires', () => {
      vi.useFakeTimers();

      // Use up the limit
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });

      // Should be blocked
      let result = checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      expect(result.limited).toBe(true);

      // Fast forward 30 seconds (not enough)
      vi.advanceTimersByTime(30000);

      // Should still be blocked
      result = checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      expect(result.limited).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('Multiple Keys', () => {
    it('should handle different keys independently', () => {
      checkRateLimit('key1', { maxAttempts: 2, windowMs: 60000 });
      checkRateLimit('key1', { maxAttempts: 2, windowMs: 60000 });

      // key1 is at limit
      let result = checkRateLimit('key1', { maxAttempts: 2, windowMs: 60000 });
      expect(result.limited).toBe(true);

      // key2 should still be allowed
      result = checkRateLimit('key2', { maxAttempts: 2, windowMs: 60000 });
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(1);
    });

    it('should track multiple keys simultaneously', () => {
      const keys = ['user1', 'user2', 'user3'];

      keys.forEach(key => {
        const result = checkRateLimit(key, { maxAttempts: 5, windowMs: 60000 });
        expect(result.limited).toBe(false);
        expect(result.remaining).toBe(4);
      });

      // Each key should have its own count
      keys.forEach(key => {
        const result = checkRateLimit(key, { maxAttempts: 5, windowMs: 60000 });
        expect(result.limited).toBe(false);
        expect(result.remaining).toBe(3);
      });
    });
  });

  describe('Manual Reset', () => {
    it('should reset a specific key', () => {
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });

      // Should be blocked
      let result = checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      expect(result.limited).toBe(true);

      // Reset the key
      resetRateLimit('test-key');

      // Should be allowed again
      result = checkRateLimit('test-key', { maxAttempts: 3, windowMs: 60000 });
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(2);
    });

    it('should not affect other keys when resetting', () => {
      checkRateLimit('key1', { maxAttempts: 2, windowMs: 60000 });
      checkRateLimit('key1', { maxAttempts: 2, windowMs: 60000 });
      checkRateLimit('key2', { maxAttempts: 2, windowMs: 60000 });

      // Reset key1
      resetRateLimit('key1');

      // key1 should be reset
      let result = checkRateLimit('key1', { maxAttempts: 2, windowMs: 60000 });
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(1);

      // key2 should be unchanged
      result = checkRateLimit('key2', { maxAttempts: 2, windowMs: 60000 });
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('Clear All', () => {
    it('should clear all entries', () => {
      checkRateLimit('key1', { maxAttempts: 2, windowMs: 60000 });
      checkRateLimit('key1', { maxAttempts: 2, windowMs: 60000 });
      checkRateLimit('key2', { maxAttempts: 2, windowMs: 60000 });
      checkRateLimit('key2', { maxAttempts: 2, windowMs: 60000 });

      // Both keys at limit
      expect(checkRateLimit('key1', { maxAttempts: 2, windowMs: 60000 }).limited).toBe(true);
      expect(checkRateLimit('key2', { maxAttempts: 2, windowMs: 60000 }).limited).toBe(true);

      // Clear all by resetting individual keys (or use cleanupRateLimitStore after expiry)
      resetRateLimit('key1');
      resetRateLimit('key2');

      // Both keys should be reset
      expect(checkRateLimit('key1', { maxAttempts: 2, windowMs: 60000 }).limited).toBe(false);
      expect(checkRateLimit('key2', { maxAttempts: 2, windowMs: 60000 }).limited).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle limit of 1', () => {
      const result1 = checkRateLimit('test-key', { maxAttempts: 1, windowMs: 60000 });
      expect(result1.limited).toBe(false);
      expect(result1.remaining).toBe(0);

      const result2 = checkRateLimit('test-key', { maxAttempts: 1, windowMs: 60000 });
      expect(result2.limited).toBe(true);
      expect(result2.remaining).toBeUndefined();
    });

    it('should handle very short time windows', () => {
      vi.useFakeTimers();

      checkRateLimit('test-key', { maxAttempts: 2, windowMs: 1000 }); // 1 second window
      checkRateLimit('test-key', { maxAttempts: 2, windowMs: 1000 });

      // Should be blocked
      let result = checkRateLimit('test-key', { maxAttempts: 2, windowMs: 1000 });
      expect(result.limited).toBe(true);

      // Fast forward 1.1 seconds
      vi.advanceTimersByTime(1100);

      // Should be allowed again
      result = checkRateLimit('test-key', { maxAttempts: 2, windowMs: 1000 });
      expect(result.limited).toBe(false);

      vi.useRealTimers();
    });

    it('should handle very large limits', () => {
      const limit = 1000;

      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit('test-key', { maxAttempts: limit, windowMs: 60000 });
        expect(result.limited).toBe(false);
        expect(result.remaining).toBe(limit - i - 1);
      }

      // Should be blocked after limit
      const result = checkRateLimit('test-key', { maxAttempts: limit, windowMs: 60000 });
      expect(result.limited).toBe(true);
    });

    it('should handle empty key string', () => {
      const result = checkRateLimit('', { maxAttempts: 3, windowMs: 60000 });
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(2);
    });
  });

  describe('Password Reset Scenarios', () => {
    it('should enforce per-user limit (3 per hour)', () => {
      const userId = 'user123';
      const key = `password-reset:user:${userId}`;
      const config = { maxAttempts: 3, windowMs: 60 * 60 * 1000 }; // 1 hour

      // First 3 attempts should succeed
      for (let i = 0; i < config.maxAttempts; i++) {
        const result = checkRateLimit(key, config);
        expect(result.limited).toBe(false);
      }

      // 4th attempt should fail
      const result = checkRateLimit(key, config);
      expect(result.limited).toBe(true);
    });

    it('should enforce per-admin limit (20 per hour)', () => {
      const adminId = 'admin123';
      const config = { maxAttempts: 20, windowMs: 60 * 60 * 1000 }; // 1 hour

      // Admin can send to 20 different users
      for (let i = 0; i < config.maxAttempts; i++) {
        const key = `password-reset:admin:${adminId}`;
        const result = checkRateLimit(key, config);
        expect(result.limited).toBe(false);
      }

      // 21st attempt should fail
      const key = `password-reset:admin:${adminId}`;
      const result = checkRateLimit(key, config);
      expect(result.limited).toBe(true);
    });

    it('should allow different users to have independent limits', () => {
      const user1Key = 'password-reset:user:user1';
      const user2Key = 'password-reset:user:user2';
      const config = { maxAttempts: 3, windowMs: 60 * 60 * 1000 };

      // Use up user1's limit
      for (let i = 0; i < config.maxAttempts; i++) {
        checkRateLimit(user1Key, config);
      }

      // user1 should be blocked
      expect(checkRateLimit(user1Key, config).limited).toBe(true);

      // user2 should still be allowed
      expect(checkRateLimit(user2Key, config).limited).toBe(false);
    });
  });
});
