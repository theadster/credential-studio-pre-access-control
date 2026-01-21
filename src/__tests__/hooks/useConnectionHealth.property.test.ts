/**
 * Property-Based Tests for useConnectionHealth Hook
 *
 * These tests verify the correctness properties defined in the design document
 * for the data refresh monitoring feature.
 *
 * @see .kiro/specs/data-refresh-monitoring/design.md
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateBackoff } from '@/types/connectionHealth';
import { CONNECTION_HEALTH } from '@/lib/constants';

/**
 * **Feature: data-refresh-monitoring, Property 5: Exponential Backoff Calculation**
 * **Validates: Requirements 2.2**
 *
 * *For any* reconnection attempt number N (where 1 ≤ N ≤ 10), the delay before
 * that attempt SHALL equal `min(1000 * 2^(N-1), 30000)` milliseconds.
 */
describe('Property 5: Exponential Backoff Calculation', () => {
  const { INITIAL_BACKOFF, MAX_BACKOFF, MAX_RECONNECT_ATTEMPTS } = CONNECTION_HEALTH;

  it('calculates correct backoff delay for any attempt number 1-10', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_RECONNECT_ATTEMPTS }),
        (attempt) => {
          const result = calculateBackoff(attempt, INITIAL_BACKOFF, MAX_BACKOFF);

          // Expected formula: min(1000 * 2^(N-1), 30000)
          const expectedDelay = Math.min(
            INITIAL_BACKOFF * Math.pow(2, attempt - 1),
            MAX_BACKOFF
          );

          expect(result).toBe(expectedDelay);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('never exceeds maximum backoff delay', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // Test beyond max attempts
        (attempt) => {
          const result = calculateBackoff(attempt, INITIAL_BACKOFF, MAX_BACKOFF);
          expect(result).toBeLessThanOrEqual(MAX_BACKOFF);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns at least initial backoff for any valid attempt', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (attempt) => {
          const result = calculateBackoff(attempt, INITIAL_BACKOFF, MAX_BACKOFF);
          expect(result).toBeGreaterThanOrEqual(INITIAL_BACKOFF);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces monotonically increasing delays until max is reached', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_RECONNECT_ATTEMPTS - 1 }),
        (attempt) => {
          const currentDelay = calculateBackoff(attempt, INITIAL_BACKOFF, MAX_BACKOFF);
          const nextDelay = calculateBackoff(attempt + 1, INITIAL_BACKOFF, MAX_BACKOFF);

          // Next delay should be >= current delay (monotonically increasing)
          expect(nextDelay).toBeGreaterThanOrEqual(currentDelay);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles custom initial and max backoff values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 100, max: 5000 }),
        fc.integer({ min: 5000, max: 60000 }),
        (attempt, initialBackoff, maxBackoff) => {
          const result = calculateBackoff(attempt, initialBackoff, maxBackoff);

          // Result should be within bounds
          expect(result).toBeGreaterThanOrEqual(initialBackoff);
          expect(result).toBeLessThanOrEqual(maxBackoff);

          // Result should match formula
          const expectedDelay = Math.min(
            initialBackoff * Math.pow(2, attempt - 1),
            maxBackoff
          );
          expect(result).toBe(expectedDelay);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns initial backoff for attempt < 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 0 }),
        (attempt) => {
          const result = calculateBackoff(attempt, INITIAL_BACKOFF, MAX_BACKOFF);
          expect(result).toBe(INITIAL_BACKOFF);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Specific examples to verify exact values
  describe('specific backoff values', () => {
    it('attempt 1 = 1000ms', () => {
      expect(calculateBackoff(1, INITIAL_BACKOFF, MAX_BACKOFF)).toBe(1000);
    });

    it('attempt 2 = 2000ms', () => {
      expect(calculateBackoff(2, INITIAL_BACKOFF, MAX_BACKOFF)).toBe(2000);
    });

    it('attempt 3 = 4000ms', () => {
      expect(calculateBackoff(3, INITIAL_BACKOFF, MAX_BACKOFF)).toBe(4000);
    });

    it('attempt 4 = 8000ms', () => {
      expect(calculateBackoff(4, INITIAL_BACKOFF, MAX_BACKOFF)).toBe(8000);
    });

    it('attempt 5 = 16000ms', () => {
      expect(calculateBackoff(5, INITIAL_BACKOFF, MAX_BACKOFF)).toBe(16000);
    });

    it('attempt 6 = 30000ms (capped at max)', () => {
      expect(calculateBackoff(6, INITIAL_BACKOFF, MAX_BACKOFF)).toBe(30000);
    });

    it('attempt 10 = 30000ms (capped at max)', () => {
      expect(calculateBackoff(10, INITIAL_BACKOFF, MAX_BACKOFF)).toBe(30000);
    });
  });
});
