import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import rateLimiter from '../rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    // Clear rate limiter before each test
    rateLimiter.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    rateLimiter.destroy();
    vi.useRealTimers();
  });

  describe('check()', () => {
    it('should allow first request', () => {
      const result = rateLimiter.check('test-key', 3, 60000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should allow requests up to the limit', () => {
      const limit = 3;
      const windowMs = 60000;

      // First request
      const result1 = rateLimiter.check('test-key', limit, windowMs);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      // Second request
      const result2 = rateLimiter.check('test-key', limit, windowMs);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      // Third request
      const result3 = rateLimiter.check('test-key', limit, windowMs);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests after limit is exceeded', () => {
      const limit = 3;
      const windowMs = 60000;

      // Make 3 requests (up to limit)
      rateLimiter.check('test-key', limit, windowMs);
      rateLimiter.check('test-key', limit, windowMs);
      rateLimiter.check('test-key', limit, windowMs);

      // Fourth request should be blocked
      const result = rateLimiter.check('test-key', limit, windowMs);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after time window expires', () => {
      const limit = 3;
      const windowMs = 60000;

      // Make 3 requests (up to limit)
      rateLimiter.check('test-key', limit, windowMs);
      rateLimiter.check('test-key', limit, windowMs);
      rateLimiter.check('test-key', limit, windowMs);

      // Fourth request should be blocked
      const blocked = rateLimiter.check('test-key', limit, windowMs);
      expect(blocked.allowed).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(windowMs + 1000);

      // Should be allowed again
      const result = rateLimiter.check('test-key', limit, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should track different keys independently', () => {
      const limit = 3;
      const windowMs = 60000;

      // Make requests for key1
      rateLimiter.check('key1', limit, windowMs);
      rateLimiter.check('key1', limit, windowMs);
      rateLimiter.check('key1', limit, windowMs);

      // key1 should be blocked
      const result1 = rateLimiter.check('key1', limit, windowMs);
      expect(result1.allowed).toBe(false);

      // key2 should still be allowed
      const result2 = rateLimiter.check('key2', limit, windowMs);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(2);
    });

    it('should return correct resetAt timestamp', () => {
      const limit = 3;
      const windowMs = 60000;
      const now = Date.now();

      const result = rateLimiter.check('test-key', limit, windowMs);

      expect(result.resetAt).toBeGreaterThanOrEqual(now + windowMs);
      expect(result.resetAt).toBeLessThanOrEqual(now + windowMs + 100);
    });
  });

  describe('reset()', () => {
    it('should reset rate limit for specific key', () => {
      const limit = 3;
      const windowMs = 60000;

      // Exhaust the limit
      rateLimiter.check('test-key', limit, windowMs);
      rateLimiter.check('test-key', limit, windowMs);
      rateLimiter.check('test-key', limit, windowMs);

      // Should be blocked
      const blocked = rateLimiter.check('test-key', limit, windowMs);
      expect(blocked.allowed).toBe(false);

      // Reset the key
      rateLimiter.reset('test-key');

      // Should be allowed again
      const result = rateLimiter.check('test-key', limit, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should not affect other keys', () => {
      const limit = 3;
      const windowMs = 60000;

      // Make requests for both keys
      rateLimiter.check('key1', limit, windowMs);
      rateLimiter.check('key2', limit, windowMs);

      // Reset key1
      rateLimiter.reset('key1');

      // key1 should be reset
      const result1 = rateLimiter.check('key1', limit, windowMs);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      // key2 should still have 1 request counted
      const result2 = rateLimiter.check('key2', limit, windowMs);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should clear all rate limit entries', () => {
      const limit = 3;
      const windowMs = 60000;

      // Make requests for multiple keys
      rateLimiter.check('key1', limit, windowMs);
      rateLimiter.check('key1', limit, windowMs);
      rateLimiter.check('key2', limit, windowMs);
      rateLimiter.check('key2', limit, windowMs);

      // Clear all
      rateLimiter.clear();

      // All keys should be reset
      const result1 = rateLimiter.check('key1', limit, windowMs);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = rateLimiter.check('key2', limit, windowMs);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(2);
    });
  });

  describe('Rate limiting scenarios', () => {
    it('should enforce per-user rate limit (3 per hour)', () => {
      const userLimit = 3;
      const windowMs = 60 * 60 * 1000; // 1 hour
      const userId = 'user-123';

      // User makes 3 requests
      for (let i = 0; i < userLimit; i++) {
        const result = rateLimiter.check(`verify-email:user:${userId}`, userLimit, windowMs);
        expect(result.allowed).toBe(true);
      }

      // 4th request should be blocked
      const blocked = rateLimiter.check(`verify-email:user:${userId}`, userLimit, windowMs);
      expect(blocked.allowed).toBe(false);
    });

    it('should enforce per-admin rate limit (20 per hour)', () => {
      const adminLimit = 20;
      const windowMs = 60 * 60 * 1000; // 1 hour
      const adminId = 'admin-123';

      // Admin makes 20 requests
      for (let i = 0; i < adminLimit; i++) {
        const result = rateLimiter.check(`verify-email:admin:${adminId}`, adminLimit, windowMs);
        expect(result.allowed).toBe(true);
      }

      // 21st request should be blocked
      const blocked = rateLimiter.check(`verify-email:admin:${adminId}`, adminLimit, windowMs);
      expect(blocked.allowed).toBe(false);
    });

    it('should allow different users to have independent limits', () => {
      const userLimit = 3;
      const windowMs = 60 * 60 * 1000;

      // User 1 exhausts their limit
      rateLimiter.check('verify-email:user:user1', userLimit, windowMs);
      rateLimiter.check('verify-email:user:user1', userLimit, windowMs);
      rateLimiter.check('verify-email:user:user1', userLimit, windowMs);

      const user1Blocked = rateLimiter.check('verify-email:user:user1', userLimit, windowMs);
      expect(user1Blocked.allowed).toBe(false);

      // User 2 should still be able to make requests
      const user2Result = rateLimiter.check('verify-email:user:user2', userLimit, windowMs);
      expect(user2Result.allowed).toBe(true);
    });

    it('should allow admin to continue after user limit is reached', () => {
      const userLimit = 3;
      const adminLimit = 20;
      const windowMs = 60 * 60 * 1000;
      const userId = 'user-123';
      const adminId = 'admin-123';

      // User exhausts their limit
      rateLimiter.check(`verify-email:user:${userId}`, userLimit, windowMs);
      rateLimiter.check(`verify-email:user:${userId}`, userLimit, windowMs);
      rateLimiter.check(`verify-email:user:${userId}`, userLimit, windowMs);

      const userBlocked = rateLimiter.check(`verify-email:user:${userId}`, userLimit, windowMs);
      expect(userBlocked.allowed).toBe(false);

      // Admin should still be able to make requests
      const adminResult = rateLimiter.check(`verify-email:admin:${adminId}`, adminLimit, windowMs);
      expect(adminResult.allowed).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle limit of 1', () => {
      const result1 = rateLimiter.check('test-key', 1, 60000);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(0);

      const result2 = rateLimiter.check('test-key', 1, 60000);
      expect(result2.allowed).toBe(false);
    });

    it('should handle very short time windows', () => {
      const limit = 3;
      const windowMs = 100; // 100ms

      // Make 3 requests
      rateLimiter.check('test-key', limit, windowMs);
      rateLimiter.check('test-key', limit, windowMs);
      rateLimiter.check('test-key', limit, windowMs);

      // Should be blocked
      const blocked = rateLimiter.check('test-key', limit, windowMs);
      expect(blocked.allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(windowMs + 10);

      // Should be allowed again
      const result = rateLimiter.check('test-key', limit, windowMs);
      expect(result.allowed).toBe(true);
    });

    it('should handle concurrent requests for same key', () => {
      const limit = 3;
      const windowMs = 60000;

      // Simulate concurrent requests
      const results = [
        rateLimiter.check('test-key', limit, windowMs),
        rateLimiter.check('test-key', limit, windowMs),
        rateLimiter.check('test-key', limit, windowMs),
        rateLimiter.check('test-key', limit, windowMs)
      ];

      // First 3 should be allowed
      expect(results[0].allowed).toBe(true);
      expect(results[1].allowed).toBe(true);
      expect(results[2].allowed).toBe(true);

      // 4th should be blocked
      expect(results[3].allowed).toBe(false);
    });
  });
});
