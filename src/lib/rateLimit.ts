/**
 * Rate Limiting Utility
 * 
 * Provides in-memory rate limiting for API endpoints to prevent abuse.
 * 
 * PRODUCTION NOTE: This uses in-memory storage which will reset on server restart
 * and won't work across multiple server instances. For production, consider using:
 * - Redis for distributed rate limiting
 * - Upstash Rate Limit for serverless environments
 * - Vercel KV for Vercel deployments
 */

import { RATE_LIMIT_CONSTANTS } from './constants';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  PASSWORD_RESET: {
    maxAttempts: RATE_LIMIT_CONSTANTS.PASSWORD_RESET_MAX_ATTEMPTS,
    windowMs: RATE_LIMIT_CONSTANTS.PASSWORD_RESET_WINDOW_MS,
  },
  EMAIL_VERIFICATION: {
    maxAttempts: RATE_LIMIT_CONSTANTS.EMAIL_VERIFICATION_MAX_ATTEMPTS,
    windowMs: RATE_LIMIT_CONSTANTS.EMAIL_VERIFICATION_WINDOW_MS,
  },
  LOGIN_ATTEMPTS: {
    maxAttempts: RATE_LIMIT_CONSTANTS.LOGIN_ATTEMPTS_MAX_ATTEMPTS,
    windowMs: RATE_LIMIT_CONSTANTS.LOGIN_ATTEMPTS_WINDOW_MS,
  },
} as const;

/**
 * Check if request is rate limited
 * 
 * @param key - Unique identifier for the rate limit (e.g., "password-reset:userId")
 * @param config - Rate limit configuration (maxAttempts, windowMs)
 * @returns Object with limited status, resetAt timestamp, and remaining attempts
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { limited: boolean; resetAt?: number; remaining?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No entry or expired window - allow request
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return { limited: false, remaining: config.maxAttempts - 1 };
  }

  // Within window - check count
  if (entry.count >= config.maxAttempts) {
    return { limited: true, resetAt: entry.resetAt };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return { limited: false, remaining: config.maxAttempts - entry.count };
}

/**
 * Reset rate limit for a specific key
 * Useful for testing or manual intervention
 * 
 * @param key - The rate limit key to reset
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status without incrementing
 * 
 * @param key - The rate limit key to check
 * @returns Current count and reset time, or null if no entry exists
 */
export function getRateLimitStatus(key: string): { count: number; resetAt: number } | null {
  const entry = rateLimitStore.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now > entry.resetAt) {
    rateLimitStore.delete(key);
    return null;
  }

  return { count: entry.count, resetAt: entry.resetAt };
}

/**
 * Clean up expired entries (call periodically)
 * Prevents memory leaks from old rate limit entries
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get total number of entries in the rate limit store
 * Useful for monitoring and debugging
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}

/**
 * Clear all rate limit entries unconditionally
 * 
 * WARNING: This is intended for testing only. It clears ALL entries
 * regardless of expiration status, ensuring complete test isolation.
 * Do not use in production code.
 * 
 * @internal
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

// Cleanup every 5 minutes (only on server-side)
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
