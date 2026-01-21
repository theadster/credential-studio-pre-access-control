/**
 * Property-Based Tests for useDataFreshness Hook
 *
 * These tests verify the correctness properties defined in the design document
 * for the data refresh monitoring feature.
 *
 * @see .kiro/specs/data-refresh-monitoring/design.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateStaleness,
  formatRelativeTime,
} from '@/hooks/useDataFreshness';
import { DATA_FRESHNESS } from '@/lib/constants';

/**
 * **Feature: data-refresh-monitoring, Property 8: Staleness Calculation Independence**
 * **Validates: Requirements 3.2, 3.4**
 *
 * *For any* combination of data types with different lastUpdatedAt timestamps,
 * each data type's staleness SHALL be calculated independently based on its own
 * timestamp and the staleness threshold, such that
 * `isStale = (currentTime - lastUpdatedAt) > stalenessThreshold`.
 */
describe('Property 8: Staleness Calculation Independence', () => {
  const { STALENESS_THRESHOLD } = DATA_FRESHNESS;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-19T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates staleness correctly based on threshold', () => {
    fc.assert(
      fc.property(
        // Generate time since last update (0 to 2 minutes in ms)
        fc.integer({ min: 0, max: 120000 }),
        // Generate threshold (1 second to 1 minute)
        fc.integer({ min: 1000, max: 60000 }),
        (timeSinceUpdate, threshold) => {
          const now = Date.now();
          const lastUpdatedAt = new Date(now - timeSinceUpdate);

          const result = calculateStaleness(lastUpdatedAt, threshold);

          // Property: isStale = (now - lastUpdatedAt) > threshold
          const expectedIsStale = timeSinceUpdate > threshold;
          expect(result.isStale).toBe(expectedIsStale);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculates staleDuration correctly when stale', () => {
    fc.assert(
      fc.property(
        // Generate time since last update that exceeds threshold
        fc.integer({ min: STALENESS_THRESHOLD + 1, max: 300000 }),
        (timeSinceUpdate) => {
          const now = Date.now();
          const lastUpdatedAt = new Date(now - timeSinceUpdate);

          const result = calculateStaleness(lastUpdatedAt, STALENESS_THRESHOLD);

          // When stale, staleDuration should be (timeSinceUpdate - threshold)
          expect(result.isStale).toBe(true);
          expect(result.staleDuration).toBe(timeSinceUpdate - STALENESS_THRESHOLD);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns null staleDuration when not stale', () => {
    fc.assert(
      fc.property(
        // Generate time since last update that is within threshold
        fc.integer({ min: 0, max: STALENESS_THRESHOLD }),
        (timeSinceUpdate) => {
          const now = Date.now();
          const lastUpdatedAt = new Date(now - timeSinceUpdate);

          const result = calculateStaleness(lastUpdatedAt, STALENESS_THRESHOLD);

          // When not stale, staleDuration should be null
          expect(result.isStale).toBe(false);
          expect(result.staleDuration).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('treats null lastUpdatedAt as stale', () => {
    const result = calculateStaleness(null, STALENESS_THRESHOLD);
    expect(result.isStale).toBe(true);
    expect(result.staleDuration).toBeNull();
  });

  it('calculates staleness independently for different timestamps', () => {
    fc.assert(
      fc.property(
        // Generate two different timestamps
        fc.integer({ min: 0, max: 120000 }),
        fc.integer({ min: 0, max: 120000 }),
        (time1, time2) => {
          const now = Date.now();
          const timestamp1 = new Date(now - time1);
          const timestamp2 = new Date(now - time2);

          const result1 = calculateStaleness(timestamp1, STALENESS_THRESHOLD);
          const result2 = calculateStaleness(timestamp2, STALENESS_THRESHOLD);

          // Each calculation should be independent
          const expected1 = time1 > STALENESS_THRESHOLD;
          const expected2 = time2 > STALENESS_THRESHOLD;

          expect(result1.isStale).toBe(expected1);
          expect(result2.isStale).toBe(expected2);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Specific boundary tests
  describe('boundary conditions', () => {
    it('exactly at threshold is not stale', () => {
      const now = Date.now();
      const lastUpdatedAt = new Date(now - STALENESS_THRESHOLD);
      const result = calculateStaleness(lastUpdatedAt, STALENESS_THRESHOLD);
      expect(result.isStale).toBe(false);
    });

    it('1ms over threshold is stale', () => {
      const now = Date.now();
      const lastUpdatedAt = new Date(now - STALENESS_THRESHOLD - 1);
      const result = calculateStaleness(lastUpdatedAt, STALENESS_THRESHOLD);
      expect(result.isStale).toBe(true);
      expect(result.staleDuration).toBe(1);
    });

    it('1ms under threshold is not stale', () => {
      const now = Date.now();
      const lastUpdatedAt = new Date(now - STALENESS_THRESHOLD + 1);
      const result = calculateStaleness(lastUpdatedAt, STALENESS_THRESHOLD);
      expect(result.isStale).toBe(false);
    });
  });
});

/**
 * **Feature: data-refresh-monitoring, Property 16: Relative Time Formatting**
 * **Validates: Requirements 7.1**
 *
 * *For any* timestamp within the last hour, the getRelativeTime function SHALL
 * return a human-readable string in the format "X seconds ago" or "X minutes ago"
 * that accurately reflects the time difference.
 */
describe('Property 16: Relative Time Formatting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-19T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats seconds correctly for times < 60 seconds', () => {
    fc.assert(
      fc.property(
        // Generate seconds between 5 and 59 (below 5 is "just now")
        fc.integer({ min: 5, max: 59 }),
        (seconds) => {
          const now = Date.now();
          const lastUpdatedAt = new Date(now - seconds * 1000);

          const result = formatRelativeTime(lastUpdatedAt);

          // Should match pattern "X second(s) ago"
          const expectedSuffix = seconds === 1 ? 'second ago' : 'seconds ago';
          expect(result).toBe(`${seconds} ${expectedSuffix}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formats minutes correctly for times 1-59 minutes', () => {
    fc.assert(
      fc.property(
        // Generate minutes between 1 and 59
        fc.integer({ min: 1, max: 59 }),
        (minutes) => {
          const now = Date.now();
          const lastUpdatedAt = new Date(now - minutes * 60 * 1000);

          const result = formatRelativeTime(lastUpdatedAt);

          // Should match pattern "X minute(s) ago"
          const expectedSuffix = minutes === 1 ? 'minute ago' : 'minutes ago';
          expect(result).toBe(`${minutes} ${expectedSuffix}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formats hours correctly for times 1-23 hours', () => {
    fc.assert(
      fc.property(
        // Generate hours between 1 and 23
        fc.integer({ min: 1, max: 23 }),
        (hours) => {
          const now = Date.now();
          const lastUpdatedAt = new Date(now - hours * 60 * 60 * 1000);

          const result = formatRelativeTime(lastUpdatedAt);

          // Should match pattern "X hour(s) ago"
          const expectedSuffix = hours === 1 ? 'hour ago' : 'hours ago';
          expect(result).toBe(`${hours} ${expectedSuffix}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formats days correctly for times >= 24 hours', () => {
    fc.assert(
      fc.property(
        // Generate days between 1 and 30
        fc.integer({ min: 1, max: 30 }),
        (days) => {
          const now = Date.now();
          const lastUpdatedAt = new Date(now - days * 24 * 60 * 60 * 1000);

          const result = formatRelativeTime(lastUpdatedAt);

          // Should match pattern "X day(s) ago"
          const expectedSuffix = days === 1 ? 'day ago' : 'days ago';
          expect(result).toBe(`${days} ${expectedSuffix}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns "just now" for times < 5 seconds', () => {
    fc.assert(
      fc.property(
        // Generate milliseconds between 0 and 4999
        fc.integer({ min: 0, max: 4999 }),
        (ms) => {
          const now = Date.now();
          const lastUpdatedAt = new Date(now - ms);

          const result = formatRelativeTime(lastUpdatedAt);
          expect(result).toBe('just now');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns "never" for null timestamp', () => {
    const result = formatRelativeTime(null);
    expect(result).toBe('never');
  });

  it('handles future timestamps gracefully', () => {
    fc.assert(
      fc.property(
        // Generate future timestamps (1ms to 1 hour in the future)
        fc.integer({ min: 1, max: 3600000 }),
        (msInFuture) => {
          const now = Date.now();
          const futureTimestamp = new Date(now + msInFuture);

          const result = formatRelativeTime(futureTimestamp);
          expect(result).toBe('just now');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Specific examples to verify exact values
  describe('specific time values', () => {
    it('5 seconds ago', () => {
      const now = Date.now();
      const lastUpdatedAt = new Date(now - 5000);
      expect(formatRelativeTime(lastUpdatedAt)).toBe('5 seconds ago');
    });

    it('59 seconds ago', () => {
      const now = Date.now();
      const lastUpdatedAt = new Date(now - 59000);
      expect(formatRelativeTime(lastUpdatedAt)).toBe('59 seconds ago');
    });

    it('30 seconds ago', () => {
      const now = Date.now();
      const lastUpdatedAt = new Date(now - 30000);
      expect(formatRelativeTime(lastUpdatedAt)).toBe('30 seconds ago');
    });

    it('1 minute ago (singular)', () => {
      const now = Date.now();
      const lastUpdatedAt = new Date(now - 60000);
      expect(formatRelativeTime(lastUpdatedAt)).toBe('1 minute ago');
    });

    it('5 minutes ago', () => {
      const now = Date.now();
      const lastUpdatedAt = new Date(now - 5 * 60000);
      expect(formatRelativeTime(lastUpdatedAt)).toBe('5 minutes ago');
    });

    it('1 hour ago (singular)', () => {
      const now = Date.now();
      const lastUpdatedAt = new Date(now - 60 * 60000);
      expect(formatRelativeTime(lastUpdatedAt)).toBe('1 hour ago');
    });

    it('2 hours ago', () => {
      const now = Date.now();
      const lastUpdatedAt = new Date(now - 2 * 60 * 60000);
      expect(formatRelativeTime(lastUpdatedAt)).toBe('2 hours ago');
    });

    it('1 day ago (singular)', () => {
      const now = Date.now();
      const lastUpdatedAt = new Date(now - 24 * 60 * 60000);
      expect(formatRelativeTime(lastUpdatedAt)).toBe('1 day ago');
    });

    it('3 days ago', () => {
      const now = Date.now();
      const lastUpdatedAt = new Date(now - 3 * 24 * 60 * 60000);
      expect(formatRelativeTime(lastUpdatedAt)).toBe('3 days ago');
    });
  });
});
